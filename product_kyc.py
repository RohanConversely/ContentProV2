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


def generate_image_kyc(
    image_path: str, brand_name: str, brand_website: str, output_dir: str | None = None
) -> dict:
    """
    Generate Image KYC using GPT-4.1 mini.

    Args:
        image_path: Path to the product image
        brand_name: Name of the brand
        brand_website: Brand website URL
        output_dir: Output directory (defaults to <brand_name>_kyc)

    Returns:
        The KYC JSON response from the API
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found in environment. Please set it in .env file."
        )

    client = OpenAI(api_key=api_key)

    if output_dir is None:
        output_dir = "product_kycs"

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    prompt_template = load_prompt("imageKYC.txt")

    user_message = f"""Generate the Product KYC based on the following inputs:

**Product Image:** [Attached image]
**Brand Name:** {brand_name}
**Brand Website:** {brand_website}

{prompt_template}"""

    with open(image_path, "rb") as image_file:
        image_bytes = image_file.read()

    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        raise ValueError(f"Could not determine MIME type for image: {image_path}")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{image_b64}"

    logger.info(
        "Requesting Product KYC.",
        {"image_path": image_path, "brand_name": brand_name, "brand_website": brand_website},
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

    log_usage(logger, response, {"operation": "product_kyc"})
    kyc_json = json.loads(response.output_text)

    image_name = Path(image_path).stem
    output_file = output_path / f"{brand_name}_{image_name}_kyc.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(kyc_json, f, indent=2, ensure_ascii=False)

    print(f"KYC saved to: {output_file}")
    print(f"Brand: {brand_name}")
    logger.info("KYC saved.", {"output_file": str(output_file), "brand_name": brand_name})

    return kyc_json


def main():
    generate_image_kyc(
        image_path=__file__.rsplit("/", 1)[0] + "/tatsya_product2.jpg",
        brand_name="Tatsya",
        brand_website="https://tatsya.com/",
    )


if __name__ == "__main__":
    main()
