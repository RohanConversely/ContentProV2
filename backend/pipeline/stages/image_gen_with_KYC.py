#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from ..logger import JsonLogger, log_usage

load_dotenv()
DEFAULT_RESULT_PREFIX = "__RESULT__"


def load_prompt(prompt_file: str) -> str:
    prompt_path = Path(prompt_file)
    if not prompt_path.is_absolute():
        prompts_dir = Path(__file__).parent.parent / "prompts"
        prompt_path = prompts_dir / prompt_file
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


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


def _normalize_shot_prompts(raw_value: Any) -> list[dict[str, str]]:
    if not isinstance(raw_value, list):
        return []
    normalized: list[dict[str, str]] = []
    for index, entry in enumerate(raw_value, start=1):
        if not isinstance(entry, dict):
            continue
        key = str(entry.get("key") or f"shot_{index}").strip().lower()
        label = str(entry.get("label") or key.replace("_", " ").title()).strip()
        prompt = str(entry.get("prompt") or "").strip()
        if not prompt:
            continue
        normalized.append({"key": key, "label": label, "prompt": prompt})
    return normalized


def _selected_shot_prompts(shot_prompts: list[dict[str, str]] | None, num_images: int) -> list[dict[str, str]]:
    normalized = _normalize_shot_prompts(shot_prompts)
    if not normalized:
        return []
    selected = normalized[: max(1, num_images)]
    while len(selected) < max(1, num_images):
        selected.append(selected[-1])
    return selected


def generate_images(
    brand_name: str,
    kyc_path: str,
    image_paths: list[str] | None = None,
    image_path: str | None = None,
    num_images: int = 6,
    temperature: float = 0.1,
    output_dir: str = "generated_images",
    prompt_file: str = "ImageWithKYCTesting.txt",
    prompt_text: str | None = None,
    shot_prompts: list[dict[str, str]] | None = None,
    additional_description: str | None = None,
    regeneration_only_inputs: bool = False,
    shot_types: list[str] | None = None,
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    del shot_types
    del kyc_path
    stage_logger = logger_obj or JsonLogger()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment. Please set it in .env file.")

    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if regeneration_only_inputs:
        if not additional_description or not additional_description.strip():
            raise ValueError("additional_description is required for regeneration-only image generation.")
        user_message = additional_description.strip()
    else:
        prompt_template = prompt_text.strip() if prompt_text else load_prompt(prompt_file)
        user_message = (
            "Generate A+ content images based on the attached product image and the instructions below.\n"
            f"Brand Name: {brand_name}\n\n"
            f"{prompt_template}"
        )
        if additional_description:
            user_message += (
                "\n\nRefinement instructions for this regeneration:\n"
                f"{additional_description.strip()}"
            )

    resolved_image_paths = [str(Path(path).resolve()) for path in (image_paths or ([image_path] if image_path else []))]
    if not resolved_image_paths:
        raise ValueError("At least one product image is required for image generation.")

    reference_images = [Path(path) for path in resolved_image_paths]

    selected_shot_prompts = _selected_shot_prompts(shot_prompts, num_images)

    stage_logger.info(
        "Requesting image generation with GPT image.",
        with_context(
            log_context,
            {
                "model": "gpt-image-1.5",
                "image_paths": resolved_image_paths,
                "brand_name": brand_name,
                "num_images": num_images,
                "temperature": temperature,
                "output_dir": str(output_path.resolve()),
                "prompt_file": prompt_file,
                "shot_count": len(selected_shot_prompts),
                "additional_description": additional_description.strip() if additional_description else None,
                "regeneration_only_inputs": regeneration_only_inputs,
            },
        ),
    )

    input_image_name = Path(resolved_image_paths[0]).stem
    output_format = "png"

    generated_files: list[str] = []
    attempts = 0
    max_attempts = max(1, num_images * 2)
    while len(generated_files) < num_images and attempts < max_attempts:
        remaining_images = num_images - len(generated_files)
        remaining_shot_prompts = selected_shot_prompts[len(generated_files): len(generated_files) + remaining_images]
        if regeneration_only_inputs:
            request_text = user_message
        else:
            shot_prompt_lines = [
                f"Image {index}: {shot_prompt['label']} - {shot_prompt['prompt']}"
                for index, shot_prompt in enumerate(remaining_shot_prompts, start=len(generated_files) + 1)
            ]
            request_text = (
                f"{user_message}\n\n"
                f"Generate exactly {remaining_images} distinct image variation(s) in this single request.\n"
                "Use the following ordered shot instructions:\n"
                f"{chr(10).join(shot_prompt_lines)}"
            )

        response = client.images.edit(
            image=reference_images,
            model="gpt-image-1.5",
            prompt=request_text,
            n=remaining_images,
            size="1024x1024",
            quality="low",
            input_fidelity="high",
        )

        try:
            log_usage(
                stage_logger,
                response,
                with_context(
                    log_context,
                    {
                        "operation": "image_gen_with_kyc",
                        "attempt": attempts + 1,
                        "remaining_images": remaining_images,
                    },
                ),
            )
        except Exception:
            pass

        image_results = [item.b64_json for item in response.data if getattr(item, "b64_json", None)]
        if not image_results:
            break

        for image_b64_out in image_results:
            if len(generated_files) >= num_images:
                break
            output_index = len(generated_files) + 1
            image_data = base64.b64decode(image_b64_out)
            output_filename = f"{brand_name}_{input_image_name}_{output_index}.{output_format}"
            output_filepath = output_path / output_filename
            with open(output_filepath, "wb") as f:
                f.write(image_data)
            abs_output_file = str(output_filepath.resolve())
            generated_files.append(abs_output_file)
            stage_logger.info(
                "Image generated.",
                with_context(log_context, {"output_file": abs_output_file}),
            )

        attempts += 1

    if not generated_files:
        raise ValueError("Image generation returned no images.")

    return {
        "ok": True,
        "generated_images": generated_files,
        "count": len(generated_files),
        "image_paths": resolved_image_paths,
        "kyc_path": None,
        "additional_description": additional_description.strip() if additional_description else None,
    }


def run_cli(args: argparse.Namespace) -> int:
    stage_logger = build_logger(args.job_log_file)
    context = {"job_id": args.job_id, "stage": args.stage_name}

    try:
        result = generate_images(
            image_paths=[str(Path(args.image_path).resolve())],
            brand_name=args.brand_name,
            kyc_path=str(Path(args.kyc_path).resolve()) if args.kyc_path else "",
            num_images=args.num_images,
            temperature=args.temperature,
            output_dir=str(Path(args.output_dir).resolve()),
            prompt_file=args.prompt_file,
            logger_obj=stage_logger,
            log_context=context,
        )
        print(f"{args.result_prefix}{json.dumps(result, ensure_ascii=False)}")
        return 0
    except Exception as exc:
        stage_logger.error("Stage failed.", with_context(context, {"error": str(exc)}))
        print(f"Error: {exc}")
        return 1


def run_default() -> int:
    script_dir = __file__.rsplit("/", 1)[0]

    generate_images(
        image_path=f"{script_dir}/tatsya_product.jpg",
        brand_name="Tatsya",
        kyc_path=f"{script_dir}/product_kycs/tatsya_tatsya_product_kyc.json",
    )
    return 0


def main() -> None:
    if len(sys.argv) == 1:
        raise SystemExit(run_default())

    parser = argparse.ArgumentParser(description="Generate A+ images from product image.")
    parser.add_argument("--image-path", required=True, help="Path to product image")
    parser.add_argument("--brand-name", required=True, help="Brand name")
    parser.add_argument("--kyc-path", required=False, help="Path to KYC JSON file")
    parser.add_argument("--num-images", type=int, default=6, help="Number of images to generate")
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.1,
        help="Sampling temperature for the model",
    )
    parser.add_argument("--output-dir", default="generated_images", help="Output directory")
    parser.add_argument(
        "--prompt-file",
        default="ImageWithKYCTesting.txt",
        help="Prompt template filename inside prompts/",
    )
    parser.add_argument("--job-id", default=None, help="Pipeline job id")
    parser.add_argument("--stage-name", default="stage_2", help="Pipeline stage name")
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
