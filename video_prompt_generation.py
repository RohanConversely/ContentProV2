#!/usr/bin/env python3
import os
import json
import base64
import mimetypes
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from logger import JsonLogger, log_usage

load_dotenv()
logger = JsonLogger()


def load_prompt(prompt_file: str) -> str:
    """Load the prompt from the prompts folder."""
    prompts_dir = Path(__file__).parent / "prompts"
    prompt_path = prompts_dir / prompt_file
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def get_first_generated_image(images_dir: str = "generated_images") -> str | None:
    """Get the first image from the generated_images folder."""
    images_path = Path(images_dir)
    if not images_path.exists():
        logger.error(
            "Generated images directory not found.", {"path": str(images_path)}
        )
        return None

    image_files = (
        sorted(images_path.glob("*.png"))
        + sorted(images_path.glob("*.jpg"))
        + sorted(images_path.glob("*.jpeg"))
    )

    if not image_files:
        logger.warning(
            "No images found in generated_images folder.", {"path": str(images_path)}
        )
        return None

    first_image = str(image_files[0])
    logger.info("Using first generated image.", {"image_path": first_image})
    return first_image


def generate_video_prompt(
    image_path: str,
    prompt_file: str = "perImagePromptGen.txt",
    output_dir: str = "video_frame_prompts",
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
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found in environment. Please set it in .env file."
        )

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

    logger.info(
        "Requesting video prompt generation.",
        {"image_path": image_path, "prompt_file": prompt_file},
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

    log_usage(logger, response, {"operation": "video_prompt_generation"})

    try:
        video_prompt_json = json.loads(response.output_text)
    except json.JSONDecodeError as e:
        logger.error(
            "Failed to parse JSON response.",
            {"error": str(e), "response": response.output_text},
        )
        raise

    image_name = Path(image_path).stem
    output_file = output_path / f"{image_name}_prompt.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(video_prompt_json, f, indent=2, ensure_ascii=False)

    print(f"Video prompt saved to: {output_file}")
    logger.info("Video prompt saved.", {"output_file": str(output_file)})

    return video_prompt_json


def main():
    script_dir = Path(__file__).parent
    image_path = script_dir / "generated_images" / "Tatsya_tatsya_product2_3.png"

    if not image_path.exists():
        print(f"Image not found: {image_path}")
        return

    generate_video_prompt(image_path=str(image_path))


if __name__ == "__main__":
    main()
