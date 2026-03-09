#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from logger import JsonLogger

load_dotenv()

DEFAULT_RESULT_PREFIX = "__RESULT__"
# Portrait resolution for Sora 2 (width x height)
SORA_SIZE = "720x1280"
SORA_DURATION_SECONDS = 8


def build_logger(job_log_file: str | None) -> JsonLogger:
    if job_log_file:
        return JsonLogger(
            job_log_file=job_log_file,
            include_global_when_job_active=False,
        )
    return JsonLogger()


def with_context(base: dict[str, Any] | None, extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base or {})
    merged.update(extra)
    return merged


def _load_image_b64(image_path: str) -> str:
    """Read an image file and return a base64-encoded data URI string."""
    suffix = Path(image_path).suffix.lower().lstrip(".")
    mime = "image/jpeg" if suffix in ("jpg", "jpeg") else f"image/{suffix or 'png'}"
    with open(image_path, "rb") as fh:
        data = base64.b64encode(fh.read()).decode()
    return f"data:{mime};base64,{data}"


def _poll_video_job(client, job_id: str, max_wait_seconds: int, logger_obj: JsonLogger, log_context: dict[str, Any] | None):
    """Poll an OpenAI video generation job until it is completed, failed, or timed out."""
    start_time = time.time()
    while True:
        if time.time() - start_time > max_wait_seconds:
            logger_obj.error(
                "Video generation timed out.",
                with_context(log_context, {"job_id": job_id, "max_wait_seconds": max_wait_seconds}),
            )
            return None

        try:
            job = client.videos.jobs.retrieve(job_id)
        except Exception as poll_err:
            logger_obj.error(
                "Failed to poll video job status.",
                with_context(log_context, {"job_id": job_id, "error": str(poll_err)}),
            )
            return None

        status = getattr(job, "status", None)
        logger_obj.info(
            "Polling video job.",
            with_context(log_context, {"job_id": job_id, "status": status}),
        )

        if status == "completed":
            return job
        if status in ("failed", "cancelled"):
            error_msg = getattr(job, "error", None) or status
            logger_obj.error(
                "Video generation job ended without success.",
                with_context(log_context, {"job_id": job_id, "status": status, "error": str(error_msg)}),
            )
            return None

        time.sleep(5)


def generate_video_frame(
    image_path: str,
    kyc_path: str,
    output_dir: str = "video_frames",
    duration_seconds: int = SORA_DURATION_SECONDS,
    max_wait_seconds: int = 600,
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> str | None:
    stage_logger = logger_obj or JsonLogger()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found in environment. Please set it in .env file."
        )

    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    with open(kyc_path, "r", encoding="utf-8") as f:
        prompt_json = json.load(f)

    prompt_lines = [
        "Analyse the attached image and follow the instructions to generate a high fidelity cinematic video.",
        f"Video duration: {duration_seconds} seconds.",
        "Generate a silent video with no audio track.",
    ]

    prompt_text = (
        "\n".join(prompt_lines)
        + "\n\n"
        + json.dumps(prompt_json, indent=2, ensure_ascii=False)
    )

    image_data_uri = _load_image_b64(image_path)

    stage_logger.info(
        "Requesting video generation with Sora 2.",
        with_context(
            log_context,
            {
                "image_path": str(Path(image_path).resolve()),
                "kyc_path": str(Path(kyc_path).resolve()),
                "output_dir": str(output_path.resolve()),
                "duration_seconds": duration_seconds,
                "size": SORA_SIZE,
                "model": "sora-2",
                "max_wait_seconds": max_wait_seconds,
            },
        ),
    )

    try:
        response = client.videos.generate(
            model="sora-2",
            prompt=prompt_text,
            size=SORA_SIZE,
            duration=duration_seconds,
            n=1,
            input_image=image_data_uri,
        )
    except Exception as api_err:
        stage_logger.error(
            "Video generation API call failed.",
            with_context(log_context, {"error": str(api_err)}),
        )
        print(f"Error: {api_err}")
        return None

    # --- Resolve the final job/response object ---
    # OpenAI may return the completed response directly or an async job.
    # Handle both patterns transparently.
    job_id = getattr(response, "id", None)
    status = getattr(response, "status", None)

    if status is not None and status != "completed":
        # Async job – poll until done
        stage_logger.info(
            "Video generation job created; polling for completion.",
            with_context(log_context, {"job_id": job_id, "status": status}),
        )
        try:
            response = _poll_video_job(client, job_id, max_wait_seconds, stage_logger, log_context)
        except KeyboardInterrupt:
            stage_logger.warning(
                "Interrupted by user while polling video job.",
                with_context(log_context, {"job_id": job_id}),
            )
            return None

        if response is None:
            return None

    # --- Extract video data from (possibly already-complete) response ---
    data = getattr(response, "data", None) or []
    if not data:
        stage_logger.error(
            "No video data in response.",
            with_context(log_context, {"response": str(response)}),
        )
        print("Error: No video data returned by Sora 2.")
        return None

    video_item = data[0]
    video_bytes: bytes | None = None

    # Try inline base64 video first
    b64_video = getattr(video_item, "b64_json", None) or getattr(video_item, "b64", None)
    if b64_video:
        video_bytes = base64.b64decode(b64_video)

    # Fall back to URL download
    if not video_bytes:
        video_url = getattr(video_item, "url", None)
        if video_url:
            stage_logger.info(
                "Video returned as URL; downloading.",
                with_context(log_context, {"url": video_url}),
            )
            try:
                req = urllib.request.Request(
                    video_url,
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                with urllib.request.urlopen(req) as stream:
                    video_bytes = stream.read()
            except Exception as dl_err:
                stage_logger.error(
                    "Failed to download video from URL.",
                    with_context(log_context, {"url": video_url, "error": str(dl_err)}),
                )
                print("Error: Failed to download video from URL.")
                return None

    if not video_bytes:
        stage_logger.error(
            "No video bytes could be retrieved.",
            with_context(log_context, {"video_item": str(video_item)}),
        )
        print("Error: No video bytes found in Sora 2 response.")
        return None

    image_name = Path(image_path).stem
    output_file = (output_path / f"{image_name}_sora_video.mp4").resolve()

    with open(output_file, "wb") as fh:
        fh.write(video_bytes)

    print(f"Video saved to: {output_file}")
    stage_logger.info(
        "Video generated.",
        with_context(
            log_context,
            {
                "output_file": str(output_file),
                "duration_seconds": duration_seconds,
                "size": SORA_SIZE,
                "model": "sora-2",
            },
        ),
    )

    return str(output_file)


def run_cli(args: argparse.Namespace) -> int:
    stage_logger = build_logger(args.job_log_file)
    context = {"job_id": args.job_id, "stage": args.stage_name}

    try:
        image_path = str(Path(args.image_path).resolve())
        kyc_path = str(Path(args.kyc_path).resolve())
        output_dir = str(Path(args.output_dir).resolve())

        video_path = generate_video_frame(
            image_path=image_path,
            kyc_path=kyc_path,
            output_dir=output_dir,
            duration_seconds=args.duration_seconds,
            max_wait_seconds=args.max_wait_seconds,
            logger_obj=stage_logger,
            log_context=context,
        )
        if not video_path:
            raise RuntimeError("Video generation returned no output path.")

        result = {
            "ok": True,
            "video_path": str(Path(video_path).resolve()),
            "image_path": image_path,
            "prompt_path": kyc_path,
            "duration_seconds": args.duration_seconds,
            "size": SORA_SIZE,
            "model": "sora-2",
        }
        print(f"{args.result_prefix}{json.dumps(result, ensure_ascii=False)}")
        return 0
    except Exception as exc:
        stage_logger.error("Stage failed.", with_context(context, {"error": str(exc)}))
        print(f"Error: {exc}")
        return 1


def run_default() -> int:
    script_dir = Path(__file__).parent
    image_path = script_dir / "generated_images" / "Tatsya_trinket_plate_1.png"
    kyc_path = script_dir / "video_frame_prompts" / "Tatsya_trinket_plate_1_prompt.json"

    if not image_path.exists():
        print(f"Image not found: {image_path}")
        return 1

    if not kyc_path.exists():
        print(f"KYC file not found: {kyc_path}")
        return 1

    generate_video_frame(
        image_path=str(image_path),
        kyc_path=str(kyc_path),
        duration_seconds=SORA_DURATION_SECONDS,
    )
    return 0


def main() -> None:
    if len(sys.argv) == 1:
        raise SystemExit(run_default())

    parser = argparse.ArgumentParser(
        description="Generate video from image + prompt JSON using OpenAI Sora 2."
    )
    parser.add_argument("--image-path", required=True, help="Path to generated image")
    parser.add_argument("--kyc-path", required=True, help="Path to video prompt JSON")
    parser.add_argument("--output-dir", default="video_frames", help="Output directory")
    parser.add_argument(
        "--duration-seconds",
        type=int,
        default=SORA_DURATION_SECONDS,
        help="Requested video duration in seconds (default: 8)",
    )
    parser.add_argument(
        "--max-wait-seconds",
        type=int,
        default=600,
        help="Max wait time for async video job completion (default: 600)",
    )
    parser.add_argument("--job-id", default=None, help="Pipeline job id")
    parser.add_argument("--stage-name", default="stage_4_sora", help="Pipeline stage name")
    parser.add_argument("--job-log-file", default=None, help="Shared job log file path")
    parser.add_argument(
        "--result-prefix",
        default=DEFAULT_RESULT_PREFIX,
        help="Machine-readable result prefix for stdout",
    )
    args = parser.parse_args()
    raise SystemExit(run_cli(args))


if __name__ == "__main__":
    main()
