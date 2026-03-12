from __future__ import annotations

from pathlib import Path
from typing import Any

from .orchestrator import JobContext, build_job_id, run_image_pipeline


async def run_single_product_upload(
    *,
    image_paths: list[str | Path],
    brand_name: str,
    brand_website: str,
    product_name: str,
    product_category: str,
    social_link_1: str | None = None,
    social_link_2: str | None = None,
    additional_info: dict[str, Any] | None = None,
    num_images: int = 6,
    temperature: float = 0.1,
) -> dict[str, Any]:
    ctx = JobContext(
        job_id=build_job_id(),
        brand_name=brand_name,
        brand_website=brand_website,
        product_name=product_name,
        product_category=product_category,
        image_paths=[Path(image_path).resolve() for image_path in image_paths],
        social_link_1=social_link_1,
        social_link_2=social_link_2,
        additional_info=additional_info,
        num_images=num_images,
        temperature=temperature,
    )
    result = await run_image_pipeline(ctx)
    return result.to_dict()
