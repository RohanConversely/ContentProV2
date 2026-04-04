#!/usr/bin/env python3
import base64
import argparse
import logging
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont

from image_rescaler import SUPPORTED_IMAGE_EXTS

load_dotenv()

MAX_PROMPT_CHARS = 8192


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


def _build_iteration_prompt(base_prompt: str, logger: logging.Logger) -> str:
    prompt = base_prompt.strip()
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


def _load_bold_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _load_montserrat_semibold(size: int) -> ImageFont.ImageFont:
    candidates = [
        "Montserrat-SemiBold.ttf",
        "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf",
        "/usr/local/share/fonts/Montserrat-SemiBold.ttf",
        str(Path(__file__).parent / "Montserrat-SemiBold.ttf"),
        str(Path(__file__).parent / "fonts" / "Montserrat-SemiBold.ttf"),
    ]
    for font_path in candidates:
        try:
            return ImageFont.truetype(font_path, size)
        except OSError:
            continue
    return _load_bold_font(size)


def _draw_style_number(image_path: Path, style_number: str) -> None:
    with Image.open(image_path) as image:
        rendered = image.convert("RGB")
        draw = ImageDraw.Draw(rendered)
        label_text = f"STYLE NO : {style_number}"
        w, h = rendered.size

        font_size = max(22, h // 28)
        font = _load_montserrat_semibold(font_size)
        letter_spacing = max(1, int(round(font_size * 0.03)))
        fill_color = (58, 58, 58)

        x = max(20, int(w * 0.03))
        baseline_y = h - max(20, int(h * 0.035))

        cursor_x = x
        for ch in label_text:
            draw.text((cursor_x, baseline_y), ch, fill=fill_color, font=font, anchor="ls")
            ch_bbox = draw.textbbox((cursor_x, baseline_y), ch, font=font, anchor="ls")
            ch_width = max(1, ch_bbox[2] - ch_bbox[0])
            cursor_x += ch_width + letter_spacing

        rendered.save(image_path, format="PNG", optimize=True)


def _save_raw_image_png(source_image: Path, destination_path: Path) -> None:
    with Image.open(source_image) as image:
        image.convert("RGB").save(destination_path, format="PNG", optimize=True)


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

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY missing from environment")
        return
    client = OpenAI(api_key=api_key)

    total_products = len(source_images)
    logger.info("Starting generation for %d products with base prompt only", total_products)

    for product_index, source_image in enumerate(source_images, start=1):
        style_number = _style_no_for_product(product_index)
        logger.info("Product %d/%d | %s | Style %s", product_index, total_products, source_image.name, style_number)

        product_output_dir = output_dir / f"H{product_index:02d}_{source_image.stem}"
        raw_image_dir = product_output_dir / "Raw Image"
        generated_images_dir = product_output_dir / "Generated Images"
        raw_image_dir.mkdir(parents=True, exist_ok=True)
        generated_images_dir.mkdir(parents=True, exist_ok=True)

        raw_image_path = raw_image_dir / "Image_1.png"
        try:
            _save_raw_image_png(source_image, raw_image_path)
            logger.info("Saved raw image %s", raw_image_path.resolve())
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.error("Failed to save raw image for %s: %s", source_image.name, exc)

        generated_image_index = 1
        
        full_prompt = _build_iteration_prompt(base_prompt, logger)

        logger.info(
            "Product %d/%d | Sending single request with base prompt only",
            product_index,
            total_products,
        )

        try:
            response = client.images.edit(
                image=[source_image],
                model="gpt-image-1.5",
                prompt=full_prompt,
                n=1,
                size="1024x1024",
                quality="low",
                input_fidelity="high"
            )

            for img_data in response.data:
                if img_data.b64_json:
                    output_path = generated_images_dir / f"Image_{generated_image_index}.png"
                    output_path.write_bytes(base64.b64decode(img_data.b64_json))
                    try:
                        _draw_style_number(output_path, style_number)
                        logger.info("Saved %s", output_path.resolve())
                    except Exception as exc:
                        logger.error("Failed to draw style number on %s: %s", output_path.name, exc)
                    generated_image_index += 1
                else:
                    logger.error("No b64_json in response for an image in product %s", source_image.name)

        except Exception as exc:
            logger.error("Product %s API call failed: %s", source_image.name, exc)
            continue

    logger.info("Bathmats generation run completed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run REVE generation for bathmats.")
    parser.add_argument("--limit", type=int, default=None, help="Process only first N images.")
    cli_args = parser.parse_args()
    run_reve_generation(limit=cli_args.limit)
