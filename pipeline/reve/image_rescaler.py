#!/usr/bin/env python3
import base64
import io
import logging
from pathlib import Path

from PIL import Image, UnidentifiedImageError

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


def prepare_reference_images(image_folder: Path, logger: logging.Logger, max_images: int = 6) -> list[str]:
    logger.info("Scanning reference images from %s", image_folder)
    if not image_folder.exists():
        logger.error("Reference image folder not found: %s", image_folder)
        return []

    reference_images = [
        image_path
        for image_path in sorted(image_folder.iterdir())
        if image_path.suffix.lower() in SUPPORTED_IMAGE_EXTS
    ]

    if not reference_images:
        logger.error("No reference images found in %s", image_folder)
        return []

    for image_path in reference_images:
        logger.info("Found reference image: %s", image_path.name)

    if len(reference_images) > max_images:
        logger.info("Limiting to first %d reference images supported by the API.", max_images)
        reference_images = reference_images[:max_images]

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
        logger.error("No valid reference images were readable")
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
