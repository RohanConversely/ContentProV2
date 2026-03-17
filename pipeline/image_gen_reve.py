#!/usr/bin/env python3
import base64
import io
import logging
import os
from pathlib import Path
from datetime import datetime

import requests
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError

load_dotenv()


SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_TOTAL_REFERENCE_PIXELS = 33_554_432


def _encode_image_bytes(path: Path, scale_factor: float) -> tuple[str, int, tuple[int, int], tuple[int, int]]:
    with Image.open(path) as image:
        original_size = image.size
        target_width = max(1, int(image.width * scale_factor))
        target_height = max(1, int(image.height * scale_factor))
        target_size = (target_width, target_height)

        if target_size != original_size:
            image = image.resize(target_size, Image.Resampling.LANCZOS)

        image_format = image.format or path.suffix.replace(".", "").upper()
        if image_format == "JPG":
            image_format = "JPEG"

        if image_format in {"JPEG", "WEBP"} and image.mode in {"RGBA", "LA", "P"}:
            image = image.convert("RGB")

        buffer = io.BytesIO()
        save_kwargs = {}
        if image_format == "JPEG":
            save_kwargs = {"quality": 92, "optimize": True}
        elif image_format == "WEBP":
            save_kwargs = {"quality": 92}

        image.save(buffer, format=image_format, **save_kwargs)
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return encoded, target_width * target_height, original_size, target_size


def _prepare_reference_images(reference_images: list[Path], logger: logging.Logger) -> list[str]:
    image_dimensions = []
    total_pixels = 0

    for image_path in reference_images:
        try:
            with Image.open(image_path) as image:
                pixels = image.width * image.height
                image_dimensions.append((image_path, image.width, image.height, pixels))
                total_pixels += pixels
        except (UnidentifiedImageError, OSError) as exc:
            logger.error("Failed to open reference image %s: %s", image_path.name, exc)

    if not image_dimensions:
        return []

    logger.info(
        "Reference image pixel total: %d (limit: %d)",
        total_pixels,
        MAX_TOTAL_REFERENCE_PIXELS,
    )

    scale_factor = 1.0
    if total_pixels > MAX_TOTAL_REFERENCE_PIXELS:
        scale_factor = (MAX_TOTAL_REFERENCE_PIXELS / total_pixels) ** 0.5
        logger.warning(
            "Reference images exceed pixel limit. Applying scale factor %.4f to all reference images.",
            scale_factor,
        )

    encoded_images = []
    scaled_total_pixels = 0
    for image_path, width, height, _ in image_dimensions:
        encoded, scaled_pixels, original_size, target_size = _encode_image_bytes(image_path, scale_factor)
        encoded_images.append(encoded)
        scaled_total_pixels += scaled_pixels
        if target_size != original_size:
            logger.info(
                "Resized %s from %sx%s to %sx%s",
                image_path.name,
                original_size[0],
                original_size[1],
                target_size[0],
                target_size[1],
            )
        else:
            logger.info("Using original size for %s (%sx%s)", image_path.name, width, height)

    logger.info(
        "Prepared %d reference images with total %d pixels",
        len(encoded_images),
        scaled_total_pixels,
    )
    return encoded_images


def _setup_logger(pipeline_dir: Path) -> logging.Logger:
    storage_dir = pipeline_dir / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)

    log_file = storage_dir / f"reve_generation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("reve_generation")
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


def run_reve_generation() -> None:
    pipeline_dir = Path(__file__).parent
    logger = _setup_logger(pipeline_dir)

    prompt_file = pipeline_dir / "prompts" / "imageGen.txt"
    image_folder = pipeline_dir / "Raw_images"
    output_dir = pipeline_dir / "generated_images_reve"
    output_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Output directory: %s", output_dir.resolve())

    if not prompt_file.exists():
        logger.error("Prompt file not found at %s", prompt_file)
        return

    logger.info("Reading prompt from %s", prompt_file)
    with prompt_file.open("r", encoding="utf-8") as f:
        full_prompt = f.read().strip()
    logger.info("Prompt loaded (%d characters)", len(full_prompt))

    reference_images = []
    logger.info("Scanning reference images from %s", image_folder)
    if image_folder.exists():
        for image_path in sorted(image_folder.iterdir()):
            if image_path.suffix.lower() in SUPPORTED_IMAGE_EXTS:
                logger.info("Loading reference image: %s", image_path.name)
                reference_images.append(image_path)

    if not reference_images:
        logger.error("No reference images found in %s", image_folder)
        return

    if len(reference_images) > 6:
        logger.info("Limiting to first 6 reference images supported by the API.")
        reference_images = reference_images[:6]

    encoded_images = _prepare_reference_images(reference_images, logger)
    if not encoded_images:
        logger.error("No valid reference images could be prepared")
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
    logger.info("Starting generation loop for 4 iterations")

    for iteration in range(1, 5):
        payload = {
            "prompt": full_prompt,
            "reference_images": encoded_images,
            "aspect_ratio": "1:1",
            "version": "latest",
        }
        logger.info("Iteration %d/4: Sending request to REVE", iteration)

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
        except requests.RequestException as exc:
            body = ""
            if getattr(exc, "response", None) is not None:
                body = exc.response.text
            logger.error("Iteration %d failed: %s", iteration, exc)
            if body:
                logger.error("Iteration %d response body: %s", iteration, body)
            continue

        try:
            response_data = response.json()
        except ValueError:
            logger.error("Iteration %d: Response did not contain valid JSON", iteration)
            continue

        decoded_images = _extract_base64_images(response_data)
        if not decoded_images:
            logger.error("Iteration %d: No image data found in response", iteration)
            logger.error("Iteration %d response payload: %s", iteration, response_data)
            continue

        first_image = decoded_images[0]
        if not first_image:
            logger.error("Iteration %d: Empty image payload", iteration)
            continue

        try:
            output_path = output_dir / f"reve_output_{iteration}.png"
            output_path.write_bytes(base64.b64decode(first_image))
            logger.info("Iteration %d: Saved %s", iteration, output_path.resolve())
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.error("Iteration %d: Failed to save image: %s", iteration, exc)

    logger.info("Generation run completed")


if __name__ == "__main__":
    run_reve_generation()
