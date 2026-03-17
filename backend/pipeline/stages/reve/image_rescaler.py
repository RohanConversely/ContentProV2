#!/usr/bin/env python3
import base64
import io
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

from ...logger import JsonLogger

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_TOTAL_REFERENCE_PIXELS = 33_554_432


def with_context(base: dict[str, Any] | None, extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base or {})
    merged.update(extra)
    return merged


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


def prepare_reference_images(
    image_paths: list[str] | list[Path],
    logger: JsonLogger,
    max_images: int = 6,
    log_context: dict[str, Any] | None = None,
) -> list[str]:
    reference_images = [Path(path).resolve() for path in image_paths]
    logger.info(
        "Preparing reference images.",
        with_context(
            log_context,
            {
                "input_count": len(reference_images),
                "max_images": max_images,
            },
        ),
    )

    if not reference_images:
        logger.error("No reference images provided.", log_context)
        return []

    valid_extensions = []
    for image_path in reference_images:
        if image_path.suffix.lower() in SUPPORTED_IMAGE_EXTS:
            valid_extensions.append(image_path)
        else:
            logger.warning(
                "Skipping unsupported image extension.",
                with_context(
                    log_context,
                    {
                        "path": str(image_path),
                        "suffix": image_path.suffix,
                    },
                ),
            )
    reference_images = valid_extensions

    if not reference_images:
        logger.error("No supported reference images after filtering.", log_context)
        return []

    if len(reference_images) > max_images:
        logger.info(
            "Limiting reference image count to API maximum.",
            with_context(
                log_context,
                {
                    "requested_count": len(reference_images),
                    "effective_count": max_images,
                },
            ),
        )
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
            logger.error(
                "Failed to open reference image.",
                with_context(
                    log_context,
                    {
                        "path": str(image_path),
                        "error": str(exc),
                    },
                ),
            )

    if not image_dimensions:
        logger.error("No valid reference images were readable.", log_context)
        return []

    logger.info(
        "Reference image pixel total computed.",
        with_context(
            log_context,
            {
                "total_pixels": total_pixels,
                "pixel_limit": MAX_TOTAL_REFERENCE_PIXELS,
            },
        ),
    )

    scale_factor = 1.0
    if total_pixels > MAX_TOTAL_REFERENCE_PIXELS:
        scale_factor = (MAX_TOTAL_REFERENCE_PIXELS / total_pixels) ** 0.5
        logger.warning(
            "Reference images exceed pixel limit. Applying global downscale.",
            with_context(
                log_context,
                {
                    "scale_factor": round(scale_factor, 6),
                },
            ),
        )

    encoded_images = []
    scaled_total_pixels = 0
    for image_path, width, height, _ in image_dimensions:
        encoded, scaled_pixels, original_size, target_size = _encode_image_bytes(image_path, scale_factor)
        encoded_images.append(encoded)
        scaled_total_pixels += scaled_pixels
        if target_size != original_size:
            logger.info(
                "Reference image resized.",
                with_context(
                    log_context,
                    {
                        "path": str(image_path),
                        "original_size": f"{original_size[0]}x{original_size[1]}",
                        "target_size": f"{target_size[0]}x{target_size[1]}",
                    },
                ),
            )
        else:
            logger.info(
                "Reference image kept at original size.",
                with_context(
                    log_context,
                    {
                        "path": str(image_path),
                        "size": f"{width}x{height}",
                    },
                ),
            )

    logger.info(
        "Reference images prepared for REVE.",
        with_context(
            log_context,
            {
                "prepared_count": len(encoded_images),
                "scaled_total_pixels": scaled_total_pixels,
            },
        ),
    )
    return encoded_images
