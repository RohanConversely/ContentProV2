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


def get_kyc_output_path(image_path: str, brand_name: str, output_dir: str) -> Path:
    image_name = Path(image_path).stem
    return (Path(output_dir) / f"{brand_name}_{image_name}_kyc.json").resolve()


def generate_image_kyc(
    image_path: str,
    brand_name: str,
    brand_website: str,
    product_name: str,
    product_category: str,
    social_link_1: str | None = None,
    social_link_2: str | None = None,
    additional_info: dict[str, Any] | None = None,
    output_dir: str | None = None,
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    stage_logger = logger_obj or JsonLogger()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment. Please set it in .env file.")

    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    output_dir = output_dir or "product_kycs"
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    prompt_template = load_prompt("imageKYC.txt")
    social_links = [link for link in (social_link_1, social_link_2) if link]
    social_links_text = "\n".join(f"- {link}" for link in social_links) if social_links else "None provided"

    additional_info_text = ""
    if additional_info:
        additional_info_text = "\n**Additional Product Information:**\n"
        for key, value in additional_info.items():
            if value:
                additional_info_text += f"- {key}: {value}\n"

    user_message = f"""Generate the Product KYC based on the following inputs:

**Product Image:** [Attached image]
**Brand Name:** {brand_name}
**Brand Website:** {brand_website}
**Product Name:** {product_name}
**Product Category:** {product_category}
**Social Media Links:**
{social_links_text}
{additional_info_text}

{prompt_template}"""

    with open(image_path, "rb") as image_file:
        image_bytes = image_file.read()

    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        raise ValueError(f"Could not determine MIME type for image: {image_path}")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{image_b64}"

    stage_logger.info(
        "Requesting Product KYC.",
        with_context(
            log_context,
            {
                "image_path": str(Path(image_path).resolve()),
                "brand_name": brand_name,
                "brand_website": brand_website,
                "product_name": product_name,
                "product_category": product_category,
                "social_link_1": social_link_1,
                "social_link_2": social_link_2,
                "additional_info": additional_info,
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
                    {"type": "input_image", "image_url": image_data_url},
                ],
            }
        ],
        text={"format": {"type": "json_object"}},
    )

    log_usage(stage_logger, response, with_context(log_context, {"operation": "product_kyc"}))
    kyc_json = json.loads(response.output_text)

    output_file = get_kyc_output_path(image_path, brand_name, str(output_path))
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(kyc_json, f, indent=2, ensure_ascii=False)

    stage_logger.info(
        "KYC saved.",
        with_context(
            log_context,
            {"output_file": str(output_file), "brand_name": brand_name},
        ),
    )

    return {
        "ok": True,
        "kyc_json": kyc_json,
        "kyc_json_path": str(output_file),
        "brand_name": brand_name,
        "product_name": product_name,
        "product_category": product_category,
        "image_path": str(Path(image_path).resolve()),
    }


def run_cli(args: argparse.Namespace) -> int:
    stage_logger = build_logger(args.job_log_file)
    context = {"job_id": args.job_id, "stage": args.stage_name}

    try:
        image_path = str(Path(args.image_path).resolve())
        output_dir = str(Path(args.output_dir).resolve())

        additional_info = None
        if args.additional_info:
            try:
                additional_info = json.loads(args.additional_info)
            except json.JSONDecodeError:
                stage_logger.warning("Failed to decode additional-info JSON", context)

        result = generate_image_kyc(
            image_path=image_path,
            brand_name=args.brand_name,
            brand_website=args.brand_website,
            product_name=args.product_name,
            product_category=args.product_category,
            social_link_1=args.social_link_1,
            social_link_2=args.social_link_2,
            additional_info=additional_info,
            output_dir=output_dir,
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
    generate_image_kyc(
        image_path=__file__.rsplit("/", 1)[0] + "/tatsya_product2.jpg",
        brand_name="Tatsya",
        brand_website="https://tatsya.com/",
        product_name="Tatsya Marble Jewelry & Key Holder Stand",
        product_category="Home & Kitchen > Home Decor > Decorative Organizers",
    )
    return 0


def main() -> None:
    if len(sys.argv) == 1:
        raise SystemExit(run_default())

    parser = argparse.ArgumentParser(description="Generate product KYC JSON from an image.")
    parser.add_argument("--image-path", required=True, help="Path to product image")
    parser.add_argument("--brand-name", required=True, help="Brand name")
    parser.add_argument("--brand-website", required=True, help="Brand website URL")
    parser.add_argument("--product-name", required=True, help="Product name")
    parser.add_argument("--product-category", required=True, help="Product category")
    parser.add_argument("--social-link-1", default=None, help="Optional social media link 1")
    parser.add_argument("--social-link-2", default=None, help="Optional social media link 2")
    parser.add_argument("--additional-info", default=None, help="JSON string of additional product info")
    parser.add_argument("--output-dir", default="product_kycs", help="Output directory")
    parser.add_argument("--job-id", default=None, help="Pipeline job id")
    parser.add_argument("--stage-name", default="stage_1", help="Pipeline stage name")
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
