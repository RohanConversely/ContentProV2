#!/usr/bin/env python3
import base64
import argparse
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

from image_rescaler import SUPPORTED_IMAGE_EXTS, prepare_reference_images

load_dotenv()

MAX_PROMPT_CHARS = 2560

SHOT_REQUIREMENTS = {
    1: "Shot 1 - LIFESTYLE BATHROOM: Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Place the mat flat on a clean light-toned bathroom floor in front of a freestanding bathtub or bath area. Include minimal, tasteful bathroom props such as a wicker basket with rolled white towels, a small potted plant, and a pair of neutral slippers placed beside the mat — do not let any prop overlap or obscure the mat. Use warm natural window lighting. Maintain premium editorial home décor photography quality.",
    2: "Shot 2 - FLAT LAY STYLED: Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Create a top-down flat lay shot of the mat laid on a light-toned wooden or hexagonal tile floor. Surround the mat with minimal complementary lifestyle props such as a folded white towel, a small soap dish, and a green trailing plant — all placed around the mat without overlapping it. Use soft even lighting with no harsh shadows. Maintain clean, premium home décor editorial photography quality.",
}


def _setup_logger(pipeline_dir: Path) -> logging.Logger:
    storage_dir = pipeline_dir / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)

    log_file = storage_dir / f"reve_bathmats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("reve_bathmats")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    console_handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False
    logger.info("Logging initialized. Log file: %s", log_file.resolve())
    return logger


def _extract_base64_images(response_data: dict) -> list[str]:
    raw_results = (
        response_data.get("result")
        or response_data.get("results")
        or response_data.get("data")
        or response_data
    )

    if isinstance(raw_results, dict):
        raw_results = [raw_results]
    elif not isinstance(raw_results, list):
        raw_results = []

    decoded_images = []
    for entry in raw_results:
        if isinstance(entry, (str, bytes)):
            decoded_images.append(entry.decode("utf-8") if isinstance(entry, bytes) else entry)
            continue

        if not isinstance(entry, dict):
            continue

        image_base64 = (
            entry.get("image")
            or entry.get("image_base64")
            or entry.get("b64_json")
            or entry.get("base64")
        )
        if image_base64:
            decoded_images.append(image_base64)

    return decoded_images


def _build_iteration_prompt(base_prompt: str, shot_instruction: str, logger: logging.Logger) -> str:
    prompt = f"{base_prompt}\n\n{shot_instruction}".strip()
    if len(prompt) > MAX_PROMPT_CHARS:
        logger.warning(
            "Composed prompt exceeded %d chars (%d). Truncating.",
            MAX_PROMPT_CHARS,
            len(prompt),
        )
        prompt = prompt[:MAX_PROMPT_CHARS]
    return prompt


def _style_no_for_product(product_index: int) -> str:
    return f"KSC- 26-H{product_index}"


def _draw_style_number(image_path: Path, style_number: str) -> None:
    with Image.open(image_path) as image:
        original = image.convert("RGB")
        strip_height = max(72, int(original.height * 0.12))
        canvas = Image.new("RGB", (original.width, original.height + strip_height), (255, 255, 255))
        canvas.paste(original, (0, 0))
        draw = ImageDraw.Draw(canvas)
        text = f"STYLE NO : {style_number}"

        font_size = max(19, (strip_height // 3) - 1)
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()

        x = max(16, int(canvas.width * 0.04))
        y = original.height + (strip_height // 2) + max(2, font_size // 8)
        draw.text((x, y), text, fill=(35, 35, 35), font=font, anchor="ls")
        canvas.save(image_path, format="PNG", optimize=True)


def _prepare_single_reference_image(image_path: Path, temp_root: Path, logger: logging.Logger) -> list[str]:
    if image_path.suffix.lower() not in SUPPORTED_IMAGE_EXTS:
        return []

    temp_product_dir = temp_root / image_path.stem
    temp_product_dir.mkdir(parents=True, exist_ok=True)
    temp_image_path = temp_product_dir / image_path.name
    shutil.copy2(image_path, temp_image_path)
    return prepare_reference_images(temp_product_dir, logger, max_images=1)


def run_reve_generation(limit: int | None = None) -> None:
    pipeline_dir = Path(__file__).parent
    logger = _setup_logger(pipeline_dir)

    prompt_file = pipeline_dir / "bathmats_prompt.txt"
    image_folder = pipeline_dir / "sample_bathmats"
    run_stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = pipeline_dir / "generated_images_reve" / f"bathmats_run_{run_stamp}"
    temp_ref_root = pipeline_dir / "storage" / f"bathmats_refs_{run_stamp}"
    output_dir.mkdir(parents=True, exist_ok=True)
    temp_ref_root.mkdir(parents=True, exist_ok=True)
    logger.info("Output directory: %s", output_dir.resolve())

    if not prompt_file.exists():
        logger.error("Prompt file not found at %s", prompt_file)
        return

    with prompt_file.open("r", encoding="utf-8") as handle:
        base_prompt = handle.read().strip()
    logger.info("Base prompt loaded from %s (%d chars)", prompt_file, len(base_prompt))

    if not image_folder.exists():
        logger.error("Input image folder not found: %s", image_folder)
        return

    source_images = sorted(
        p for p in image_folder.iterdir() if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    if not source_images:
        logger.error("No supported images found in %s", image_folder)
        return
    if limit is not None:
        source_images = source_images[: max(0, limit)]
        if not source_images:
            logger.error("No images selected after applying limit=%s", limit)
            return

    api_key = os.getenv("REVE_API_KEY")
    if not api_key:
        logger.error("REVE_API_KEY missing from environment")
        return

    url = "https://api.reve.com/v1/image/remix"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    total_products = len(source_images)
    logger.info("Starting generation for %d products and %d shots each", total_products, len(SHOT_REQUIREMENTS))

    for product_index, source_image in enumerate(source_images, start=1):
        style_number = _style_no_for_product(product_index)
        logger.info("Product %d/%d | %s | Style %s", product_index, total_products, source_image.name, style_number)

        encoded_images = _prepare_single_reference_image(source_image, temp_ref_root, logger)
        if not encoded_images:
            logger.error("Skipping %s: failed to prepare reference image", source_image.name)
            continue

        product_output_dir = output_dir / f"H{product_index:02d}_{source_image.stem}"
        product_output_dir.mkdir(parents=True, exist_ok=True)

        for shot_index, shot_instruction in SHOT_REQUIREMENTS.items():
            full_prompt = _build_iteration_prompt(base_prompt, shot_instruction, logger)
            payload = {
                "prompt": full_prompt,
                "reference_images": encoded_images,
                "aspect_ratio": "1:1",
                "version": "latest",
                "postprocessing": [{"process": "upscale", "upscale_factor": 2}],
            }

            logger.info(
                "Product %d/%d | Shot %d/%d | Sending request",
                product_index,
                total_products,
                shot_index,
                len(SHOT_REQUIREMENTS),
            )

            try:
                response = requests.post(url, headers=headers, json=payload, timeout=120)
                response.raise_for_status()
            except requests.RequestException as exc:
                body = ""
                if getattr(exc, "response", None) is not None:
                    body = exc.response.text
                logger.error("Product %s shot %d failed: %s", source_image.name, shot_index, exc)
                if body:
                    logger.error("Product %s shot %d response body: %s", source_image.name, shot_index, body)
                continue

            try:
                response_data = response.json()
            except ValueError:
                logger.error("Product %s shot %d: invalid JSON response", source_image.name, shot_index)
                continue

            decoded_images = _extract_base64_images(response_data)
            if not decoded_images or not decoded_images[0]:
                logger.error("Product %s shot %d: no image payload", source_image.name, shot_index)
                continue

            output_path = product_output_dir / f"reve_output_shot_{shot_index}.png"
            try:
                output_path.write_bytes(base64.b64decode(decoded_images[0]))
                _draw_style_number(output_path, style_number)
                logger.info("Saved %s", output_path.resolve())
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.error("Product %s shot %d: save/post-process failed: %s", source_image.name, shot_index, exc)

    logger.info("Bathmats generation run completed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run REVE generation for bathmats.")
    parser.add_argument("--limit", type=int, default=None, help="Process only first N images.")
    cli_args = parser.parse_args()
    run_reve_generation(limit=cli_args.limit)
