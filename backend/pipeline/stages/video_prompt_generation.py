#!/usr/bin/env python3
import argparse
import os
import json
import sys
import base64
import mimetypes
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from logger import JsonLogger, log_usage

load_dotenv()
DEFAULT_RESULT_PREFIX = "__RESULT__"


def load_prompt(prompt_file: str) -> str:
    """Load the prompt from the prompts folder."""
    prompts_dir = Path(__file__).parent / "prompts"
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


def get_prompt_output_path(image_path: str, output_dir: str) -> Path:
    image_name = Path(image_path).stem
    return (Path(output_dir) / f"{image_name}_prompt.json").resolve()


def get_first_generated_image(images_dir: str = "generated_images") -> str | None:
    """Get the first image from the generated_images folder."""
    images_path = Path(images_dir)
    if not images_path.exists():
        JsonLogger().error(
            "Generated images directory not found.", {"path": str(images_path)}
        )
        return None

    image_files = (
        sorted(images_path.glob("*.png"))
        + sorted(images_path.glob("*.jpg"))
        + sorted(images_path.glob("*.jpeg"))
    )

    if not image_files:
        JsonLogger().warning(
            "No images found in generated_images folder.", {"path": str(images_path)}
        )
        return None

    first_image = str(image_files[0].resolve())
    JsonLogger().info("Using first generated image.", {"image_path": first_image})
    return first_image


def generate_video_prompt(
    image_path: str,
    prompt_file: str = "perImagePromptGen.txt",
    output_dir: str = "video_frame_prompts",
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> dict:
    """
    Generate video prompt from an image using GPT-4.1 mini.

    Args:
        image_path: Path to the generated image
        prompt_file: The prompt template file to use
        output_dir: Output directory for video prompts

    Returns frame:
        The video prompt JSON response from the API
    """
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

    prompt_template = load_prompt(prompt_file)

    user_message = f"""Analyze the attached image and generate a cinematic video prompt.

{prompt_template}"""

    with open(image_path, "rb") as image_file:
        image_bytes = image_file.read()

    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        raise ValueError(f"Could not determine MIME type for image: {image_path}")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{image_b64}"

    stage_logger.info(
        "Requesting video prompt generation.",
        with_context(
            log_context,
            {
                "image_path": str(Path(image_path).resolve()),
                "prompt_file": prompt_file,
                "output_dir": str(output_path.resolve()),
            },
        ),
    )

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": user_message},
                    {
                        "type": "input_image",
                        "image_url": image_data_url,
                    },
                ],
            }
        ],
        text={"format": {"type": "json_object"}},
    )

    log_usage(
        stage_logger,
        response,
        with_context(log_context, {"operation": "video_prompt_generation"}),
    )

    try:
        video_prompt_json = json.loads(response.output_text)
    except json.JSONDecodeError as e:
        stage_logger.error(
            "Failed to parse JSON response.",
            with_context(log_context, {"error": str(e), "response": response.output_text}),
        )
        raise

    output_file = get_prompt_output_path(image_path, str(output_path))
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(video_prompt_json, f, indent=2, ensure_ascii=False)

    print(f"Video prompt saved to: {output_file}")
    stage_logger.info(
        "Video prompt saved.",
        with_context(log_context, {"output_file": str(output_file)}),
    )

    return video_prompt_json


def run_cli(args: argparse.Namespace) -> int:
    stage_logger = build_logger(args.job_log_file)
    context = {"job_id": args.job_id, "stage": args.stage_name}

    try:
        image_path = str(Path(args.image_path).resolve())
        output_dir = str(Path(args.output_dir).resolve())
        generate_video_prompt(
            image_path=image_path,
            prompt_file=args.prompt_file,
            output_dir=output_dir,
            logger_obj=stage_logger,
            log_context=context,
        )
        result = {
            "ok": True,
            "prompt_json_path": str(get_prompt_output_path(image_path, output_dir)),
            "image_path": image_path,
        }
        print(f"{args.result_prefix}{json.dumps(result, ensure_ascii=False)}")
        return 0
    except Exception as exc:
        stage_logger.error("Stage failed.", with_context(context, {"error": str(exc)}))
        print(f"Error: {exc}")
        return 1


def run_default() -> int:
    script_dir = Path(__file__).parent
    image_path = script_dir / "generated_images" / "Tatsya_tatsya_product2_3.png"

    if not image_path.exists():
        print(f"Image not found: {image_path}")
        return 1

    generate_video_prompt(image_path=str(image_path))
    return 0


def main() -> None:
    if len(sys.argv) == 1:
        raise SystemExit(run_default())

    parser = argparse.ArgumentParser(description="Generate per-image video prompt JSON.")
    parser.add_argument("--image-path", required=True, help="Path to generated image")
    parser.add_argument(
        "--prompt-file",
        default="perImagePromptGen.txt",
        help="Prompt template filename inside prompts/",
    )
    parser.add_argument("--output-dir", default="video_frame_prompts", help="Output directory")
    parser.add_argument("--job-id", default=None, help="Pipeline job id")
    parser.add_argument("--stage-name", default="stage_3", help="Pipeline stage name")
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
