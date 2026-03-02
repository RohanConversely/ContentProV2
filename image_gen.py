#!/usr/bin/env python3
import os
import base64
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


def generate_images(
    image_path: str,
    brand_name: str,
    num_images: int = 3,
    output_dir: str = "generated_images",
) -> list[str]:
    """
    Generate A+ content images using gpt-image-1.

    Args:
        image_path: Path to the product image
        brand_name: Name of the brand
        num_images: Number of images to generate (default: 3)
        output_dir: Output directory for generated images

    Returns:
        List of paths to generated images
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found in environment. Please set it in .env file."
        )

    client = OpenAI(api_key=api_key)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    prompt_template = load_prompt("visual_instructions_with_constraints.json")
    user_message = (
        "Generate A+ content images based on the attached product image and the instructions below.\n"
        f"Brand Name: {brand_name}\n\n"
        f"{prompt_template}"
    )
    logger.info(
        "Requesting image generation.",
        {"image_path": image_path, "brand_name": brand_name, "num_images": num_images},
    )

    with open(image_path, "rb") as image_file:
        response = client.images.edit(
            model="gpt-image-1",
            prompt=user_message,
            image=image_file,
            n=num_images,
            size="1024x1024",
        )

    log_usage(logger, response, {"operation": "image_gen"})
    input_image_name = Path(image_path).stem
    output_format = "png"

    generated_files = []
    for i, img in enumerate(response.data, start=1):
        image_data = base64.b64decode(img.b64_json)
        output_filename = f"{brand_name}_{input_image_name}_{i}.{output_format}"
        output_filepath = output_path / output_filename
        with open(output_filepath, "wb") as f:
            f.write(image_data)
        generated_files.append(str(output_filepath))
        print(f"Generated: {output_filepath}")
        logger.info("Image generated.", {"output_file": str(output_filepath)})

    print(f"\nTotal images generated: {len(generated_files)}")
    print(f"Output directory: {output_path}")

    return generated_files


def main():
    script_dir = __file__.rsplit("/", 1)[0]

    generate_images(
        image_path=f"{script_dir}/tatsya_product.jpg",
        brand_name="Tatsya",
    )


if __name__ == "__main__":
    main()
