#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from ..logger import JsonLogger, log_usage

load_dotenv()
DEFAULT_RESULT_PREFIX = "__RESULT__"


def load_prompt(prompt_file: str) -> str:
    prompts_dir = Path(__file__).parent.parent / "prompts"
    prompt_path = prompts_dir / prompt_file
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def load_kyc(kyc_file: str) -> dict[str, Any]:
    with open(kyc_file, "r", encoding="utf-8") as f:
        return json.load(f)


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


def generate_images(
    brand_name: str,
    kyc_path: str,
    image_paths: list[str] | None = None,
    image_path: str | None = None,
    num_images: int = 6,
    temperature: float = 0.1,
    output_dir: str = "generated_images",
    prompt_file: str = "ImageWithKYCTesting.txt",
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    stage_logger = logger_obj or JsonLogger()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment. Please set it in .env file.")

    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    prompt_template = load_prompt(prompt_file)

    if not kyc_path or not Path(kyc_path).exists():
        raise ValueError(f"KYC JSON file not found: {kyc_path}")

    user_message = (
        "Generate A+ content images based on the attached product image, the "
        "attached KYC JSON file, and the instructions below.\n"
        f"Brand Name: {brand_name}\n\n"
        f"{prompt_template}"
    )

    resolved_image_paths = [str(Path(path).resolve()) for path in (image_paths or ([image_path] if image_path else []))]
    if not resolved_image_paths:
        raise ValueError("At least one product image is required for image generation.")

    content = [{"type": "input_text", "text": user_message}]
    for resolved_image_path in resolved_image_paths:
        mime_type, _ = mimetypes.guess_type(resolved_image_path)
        if not mime_type:
            mime_type = "image/jpeg"

        with open(resolved_image_path, "rb") as image_file:
            image_bytes = image_file.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_data_url = f"data:{mime_type};base64,{image_b64}"
        content.append({"type": "input_image", "image_url": image_data_url})

    with open(kyc_path, "rb") as kyc_file:
        kyc_b64 = base64.b64encode(kyc_file.read()).decode("utf-8")
    kyc_data_url = f"data:application/json;base64,{kyc_b64}"

    stage_logger.info(
        "Requesting image generation with KYC.",
        with_context(
            log_context,
            {
                "model": "gpt-4.1",
                "image_paths": resolved_image_paths,
                "brand_name": brand_name,
                "kyc_path": str(Path(kyc_path).resolve()),
                "num_images": num_images,
                "temperature": temperature,
                "output_dir": str(output_path.resolve()),
                "prompt_file": prompt_file,
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
        response = client.responses.create(
            model="gpt-4.1",
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                f"{user_message}\n\n"
                                f"Generate {remaining_images} distinct A+ content image variation(s). "
                                "Each variation must be visually different while staying faithful to the product and KYC."
                            ),
                        },
                        *content[1:],
                        {
                            "type": "input_file",
                            "filename": Path(kyc_path).name,
                            "file_data": kyc_data_url,
                        },
                    ],
                }
            ],
            tools=[
                {
                    "type": "image_generation",
                    "size": "1024x1024",
                    "quality": "high",
                }
            ],
            tool_choice={"type": "image_generation"},
            temperature=temperature,
        )

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

        image_results = [
            output.result
            for output in response.output
            if output.type == "image_generation_call"
        ]
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
        "kyc_path": str(Path(kyc_path).resolve()),
    }


def run_cli(args: argparse.Namespace) -> int:
    stage_logger = build_logger(args.job_log_file)
    context = {"job_id": args.job_id, "stage": args.stage_name}

    try:
        result = generate_images(
            image_paths=[str(Path(args.image_path).resolve())],
            brand_name=args.brand_name,
            kyc_path=str(Path(args.kyc_path).resolve()),
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

    parser = argparse.ArgumentParser(description="Generate A+ images from product image + KYC.")
    parser.add_argument("--image-path", required=True, help="Path to product image")
    parser.add_argument("--brand-name", required=True, help="Brand name")
    parser.add_argument("--kyc-path", required=True, help="Path to KYC JSON file")
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
