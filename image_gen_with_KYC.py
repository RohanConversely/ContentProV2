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


def load_kyc(kyc_file: str) -> dict:
    """Load the KYC JSON file."""
    with open(kyc_file, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_images(
    image_path: str,
    brand_name: str,
    kyc_path: str,
    num_images: int = 4,
    output_dir: str = "generated_images",
) -> list[str]:
    """
    Generate A+ content images using gpt-image-1.

    Args:
        image_path: Path to the product image
        brand_name: Name of the brand
        kyc_path: Path to the KYC JSON file
        num_images: Number of images to generate (default: 4)
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

    prompt_template = load_prompt("ImageWithKYCTesting.txt")

    if not kyc_path or not Path(kyc_path).exists():
        raise ValueError(f"KYC JSON file not found: {kyc_path}")

    user_message = (
        "Generate A+ content images based on the attached product image, the "
        "attached KYC JSON file, and the instructions below.\n"
        f"Brand Name: {brand_name}\n\n"
        f"{prompt_template}"
    )

    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        mime_type = "image/jpeg"

    with open(image_path, "rb") as image_file:
        image_bytes = image_file.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{image_b64}"

    with open(kyc_path, "rb") as kyc_file:
        kyc_b64 = base64.b64encode(kyc_file.read()).decode("utf-8")
    kyc_data_url = f"data:application/json;base64,{kyc_b64}"

    logger.info(
        "Requesting image generation with KYC.",
        {
            "image_path": image_path,
            "brand_name": brand_name,
            "kyc_path": kyc_path,
            "num_images": num_images,
        },
    )

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": user_message},
                    {"type": "input_image", "image_url": image_data_url},
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
                "quality": "low",
            }
        ],
        tool_choice={"type": "image_generation"},
    )

    log_usage(logger, response, {"operation": "image_gen_with_kyc"})
    input_image_name = Path(image_path).stem
    output_format = "png"

    generated_files = []
    image_results = [
        output.result
        for output in response.output
        if output.type == "image_generation_call"
    ]
    for i, image_b64_out in enumerate(image_results, start=1):
        image_data = base64.b64decode(image_b64_out)
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
        kyc_path=f"{script_dir}/product_kycs/tatsya_tatsya_product_kyc.json",
    )


if __name__ == "__main__":
    main()
