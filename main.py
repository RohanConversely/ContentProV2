#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from logger import JsonLogger

RESULT_PREFIX = "__RESULT__"


def build_job_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{ts}_{uuid.uuid4().hex[:8]}"


def confirm_stage(prompt: str) -> bool:
    while True:
        answer = input(f"{prompt} (Y/N): ").strip().lower()
        if answer in {"y", "yes"}:
            return True
        if answer in {"n", "no"}:
            return False
        print("Please enter Y or N.")


def extract_result_json(stdout: str) -> Any:
    for line in reversed(stdout.splitlines()):
        if line.startswith(RESULT_PREFIX):
            payload = line[len(RESULT_PREFIX) :].strip()
            return json.loads(payload)
    raise ValueError("Result marker not found in subprocess output.")


def run_stage_subprocess(
    script_name: str,
    stage_name: str,
    script_args: list[str],
    job_id: str,
    job_log_file: Path,
    logger: JsonLogger,
) -> tuple[int, str, str]:
    script_path = Path(__file__).parent / script_name
    command = [
        sys.executable,
        str(script_path),
        *script_args,
        "--job-id",
        job_id,
        "--stage-name",
        stage_name,
        "--job-log-file",
        str(job_log_file.resolve()),
        "--result-prefix",
        RESULT_PREFIX,
    ]
    logger.info("Starting stage.", {"job_id": job_id, "stage": stage_name, "script": script_name})
    print(f"[{stage_name}] Running {script_name} ...")

    result = subprocess.run(command, capture_output=True, text=True)
    stdout = result.stdout.strip()
    stderr = result.stderr.strip()

    if stdout:
        logger.info(
            "Stage stdout captured.",
            {"job_id": job_id, "stage": stage_name, "stdout": stdout[-4000:]},
        )
    if stderr:
        logger.warning(
            "Stage stderr captured.",
            {"job_id": job_id, "stage": stage_name, "stderr": stderr[-4000:]},
        )

    if result.returncode != 0:
        logger.error(
            "Stage failed.",
            {"job_id": job_id, "stage": stage_name, "return_code": result.returncode},
        )
    else:
        logger.info("Stage completed.", {"job_id": job_id, "stage": stage_name})

    return result.returncode, stdout, stderr


def filter_kyc_for_stage2(source_path: Path, target_path: Path) -> Path:
    with open(source_path, "r", encoding="utf-8") as f:
        kyc_data = json.load(f)

    comp = kyc_data.get("competitor_analysis")
    if isinstance(comp, dict):
        for key in (
            "competitor_approaches",
            "common_themes",
            "gaps_weaknesses",
            "overused_approaches",
        ):
            comp.pop(key, None)

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(kyc_data, f, indent=2, ensure_ascii=False)
    return target_path.resolve()


def ensure_result_path(path_str: str, stage_name: str, label: str) -> Path:
    resolved = Path(path_str).resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"{stage_name}: {label} path not found: {resolved}")
    return resolved


def main() -> None:
    parser = argparse.ArgumentParser(description="Orchestrate the 4-stage image-to-video pipeline.")
    parser.add_argument("brand_name", help="Brand name")
    parser.add_argument("brand_website", help="Brand website URL")
    parser.add_argument("product_name", help="Product name")
    parser.add_argument("product_category", help="Product category")
    parser.add_argument("product_image_path", help="Path to raw product image")
    parser.add_argument("--social-link-1", default=None, help="Optional social media link 1")
    parser.add_argument("--social-link-2", default=None, help="Optional social media link 2")
    args = parser.parse_args()

    image_path = Path(args.product_image_path).resolve()
    if not image_path.exists():
        print(f"Error: Product image not found at {image_path}")
        sys.exit(1)

    job_id = build_job_id()
    job_dir = (Path("jobs") / job_id).resolve()
    kyc_dir = job_dir / "product_kycs"
    generated_images_dir = job_dir / "generated_images"
    video_prompts_dir = job_dir / "video_frame_prompts"
    video_frames_dir = job_dir / "video_frames"
    job_log_file = job_dir / "job.log"

    for directory in (job_dir, kyc_dir, generated_images_dir, video_prompts_dir, video_frames_dir):
        directory.mkdir(parents=True, exist_ok=True)

    logger = JsonLogger(job_log_file=str(job_log_file), include_global_when_job_active=False)
    logger.info(
        "Job initialized.",
        {
            "job_id": job_id,
            "stage": "orchestrator",
            "brand_name": args.brand_name,
            "brand_website": args.brand_website,
            "product_name": args.product_name,
            "product_category": args.product_category,
            "social_link_1": args.social_link_1,
            "social_link_2": args.social_link_2,
            "image_path": str(image_path),
            "job_dir": str(job_dir),
            "output_dir": str(job_dir),
        },
    )

    print(f"Job ID: {job_id}")
    print(f"Workspace: {job_dir}")
    print(f"Job log: {job_log_file}")

    try:
        stage1_args = [
            "--image-path",
            str(image_path),
            "--brand-name",
            args.brand_name,
            "--brand-website",
            args.brand_website,
            "--product-name",
            args.product_name,
            "--product-category",
            args.product_category,
            "--output-dir",
            str(kyc_dir),
        ]
        if args.social_link_1:
            stage1_args.extend(["--social-link-1", args.social_link_1])
        if args.social_link_2:
            stage1_args.extend(["--social-link-2", args.social_link_2])

        rc1, stdout1, _ = run_stage_subprocess(
            script_name="product_kyc.py",
            stage_name="stage_1_product_kyc",
            script_args=stage1_args,
            job_id=job_id,
            job_log_file=job_log_file,
            logger=logger,
        )
        if rc1 != 0:
            print("Pipeline stopped: Stage 1 failed.")
            sys.exit(1)

        stage1_result = extract_result_json(stdout1)
        if not isinstance(stage1_result, dict) or not stage1_result.get("ok"):
            raise ValueError("Stage 1 produced invalid result payload.")

        stage1_kyc_path = ensure_result_path(
            stage1_result["kyc_json_path"], "stage_1_product_kyc", "kyc_json_path"
        )
        logger.info(
            "Stage 1 output resolved.",
            {"job_id": job_id, "stage": "orchestrator", "kyc_path": str(stage1_kyc_path)},
        )
        print(f"[Stage 1] KYC JSON: {stage1_kyc_path}")

        filtered_kyc_path = filter_kyc_for_stage2(
            stage1_kyc_path, job_dir / f"{stage1_kyc_path.stem}_filtered.json"
        )
        logger.info(
            "Prepared filtered KYC for Stage 2.",
            {"job_id": job_id, "stage": "orchestrator", "kyc_path": str(filtered_kyc_path)},
        )

        if not confirm_stage("Proceed to Stage 2 (image generation with KYC)?"):
            logger.warning("Pipeline stopped by user before Stage 2.", {"job_id": job_id, "stage": "orchestrator"})
            print("Pipeline stopped by user.")
            sys.exit(0)

        rc2, stdout2, _ = run_stage_subprocess(
            script_name="image_gen_with_KYC.py",
            stage_name="stage_2_image_gen_with_kyc",
            script_args=[
                "--image-path",
                str(image_path),
                "--brand-name",
                args.brand_name,
                "--kyc-path",
                str(filtered_kyc_path),
                "--output-dir",
                str(generated_images_dir),
            ],
            job_id=job_id,
            job_log_file=job_log_file,
            logger=logger,
        )
        if rc2 != 0:
            print("Pipeline stopped: Stage 2 failed.")
            sys.exit(1)

        stage2_result = extract_result_json(stdout2)
        generated_images = (
            stage2_result.get("generated_images")
            if isinstance(stage2_result, dict)
            else None
        )
        if not isinstance(generated_images, list) or not generated_images:
            logger.error(
                "Stage 2 produced no images.",
                {"job_id": job_id, "stage": "orchestrator", "stage2_result": stage2_result},
            )
            print("Pipeline stopped: Stage 2 produced no images.")
            sys.exit(1)

        image_files = [
            ensure_result_path(path, "stage_2_image_gen_with_kyc", "generated_image")
            for path in generated_images
            if str(path).lower().endswith(".png")
        ]
        if not image_files:
            logger.error(
                "No PNG images available for Stage 3/4.",
                {"job_id": job_id, "stage": "orchestrator", "stage2_result": stage2_result},
            )
            print("Pipeline stopped: No PNG images available for video generation.")
            sys.exit(1)

        print(f"[Stage 2] Generated PNG images: {len(image_files)}")
        logger.info(
            "Stage 2 completed with PNGs.",
            {"job_id": job_id, "stage": "orchestrator", "count": len(image_files)},
        )

        if not confirm_stage("Proceed to Stage 3/4 video loop?"):
            logger.warning("Pipeline stopped by user before Stage 3/4 loop.", {"job_id": job_id, "stage": "orchestrator"})
            print("Pipeline stopped by user.")
            sys.exit(0)

        for idx, png_path in enumerate(image_files, start=1):
            print(f"[Loop {idx}/{len(image_files)}] Processing {png_path.name}")
            logger.info(
                "Loop iteration started.",
                {
                    "job_id": job_id,
                    "stage": "orchestrator",
                    "index": idx,
                    "image_path": str(png_path),
                },
            )

            rc3, stdout3, _ = run_stage_subprocess(
                script_name="video_prompt_generation.py",
                stage_name="stage_3_video_prompt_generation",
                script_args=[
                    "--image-path",
                    str(png_path),
                    "--output-dir",
                    str(video_prompts_dir),
                ],
                job_id=job_id,
                job_log_file=job_log_file,
                logger=logger,
            )
            if rc3 != 0:
                print("Pipeline stopped: Stage 3 failed.")
                sys.exit(1)

            stage3_result = extract_result_json(stdout3)
            if not isinstance(stage3_result, dict) or not stage3_result.get("ok"):
                raise ValueError("Stage 3 produced invalid result payload.")
            prompt_json_path = ensure_result_path(
                stage3_result["prompt_json_path"],
                "stage_3_video_prompt_generation",
                "prompt_json_path",
            )

            rc4, stdout4, _ = run_stage_subprocess(
                script_name="video_gen.py",
                stage_name="stage_4_video_gen",
                script_args=[
                    "--image-path",
                    str(png_path),
                    "--kyc-path",
                    str(prompt_json_path),
                    "--output-dir",
                    str(video_frames_dir),
                ],
                job_id=job_id,
                job_log_file=job_log_file,
                logger=logger,
            )
            if rc4 != 0:
                print("Pipeline stopped: Stage 4 failed.")
                sys.exit(1)

            stage4_result = extract_result_json(stdout4)
            if not isinstance(stage4_result, dict) or not stage4_result.get("ok"):
                raise ValueError("Stage 4 produced invalid result payload.")
            video_path = ensure_result_path(
                stage4_result["video_path"], "stage_4_video_gen", "video_path"
            )

            logger.info(
                "Video generated successfully for image.",
                {
                    "job_id": job_id,
                    "stage": "orchestrator",
                    "image_path": str(png_path),
                    "output_file": str(video_path),
                },
            )
            print(f"[Loop {idx}/{len(image_files)}] Video generated: {video_path}")

        logger.info("Pipeline completed successfully.", {"job_id": job_id, "stage": "orchestrator"})
        print("Pipeline completed successfully.")

    except Exception as exc:
        logger.error(
            "Unhandled pipeline exception.",
            {"job_id": job_id, "stage": "orchestrator", "error": str(exc)},
        )
        print(f"Pipeline stopped due to unexpected error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
