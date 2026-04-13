from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..schemas.image_jobs import (
    BatchImageJobRequest,
    BatchImageJobResponse,
    SingleImageJobResponse,
)
from ..services.image_pipeline import persist_upload_file, run_batch_image_jobs, run_single_image_job

router = APIRouter(prefix="/api/image", tags=["image-pipeline"])
IMAGE_SUFFIX_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _parse_additional_info(payload: str | None) -> dict[str, Any] | None:
    if not payload:
        return None
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid additional_info JSON: {exc}") from exc
    if parsed is None:
        return None
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=422, detail="additional_info must decode to a JSON object.")
    return parsed


def _resolve_upload_image_mime(file: UploadFile) -> str | None:
    content_type = (file.content_type or "").lower()
    if content_type.startswith("image/"):
        return content_type

    suffix = Path(file.filename or "").suffix.lower()
    if suffix in IMAGE_SUFFIX_MIME_MAP and content_type in {"", "application/octet-stream"}:
        return IMAGE_SUFFIX_MIME_MAP[suffix]
    return None


@router.post("/single", response_model=SingleImageJobResponse)
async def create_single_image_job(
    image_file: UploadFile = File(...),
    brand_name: str = Form(...),
    brand_website: str = Form(...),
    product_name: str = Form(...),
    product_category: str = Form(...),
    social_link_1: str | None = Form(default=None),
    social_link_2: str | None = Form(default=None),
    additional_info: str | None = Form(default=None),
    num_images: int = Form(default=6),
    temperature: float = Form(default=0.1),
) -> dict[str, Any]:
    if _resolve_upload_image_mime(image_file) is None:
        raise HTTPException(status_code=422, detail="image_file must be an image upload.")

    image_path = await persist_upload_file(image_file)
    parsed_additional_info = _parse_additional_info(additional_info)

    try:
        return await run_single_image_job(
            image_path=image_path,
            brand_name=brand_name,
            brand_website=brand_website,
            product_name=product_name,
            product_category=product_category,
            social_link_1=social_link_1,
            social_link_2=social_link_2,
            additional_info=parsed_additional_info,
            num_images=num_images,
            temperature=temperature,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/batch", response_model=BatchImageJobResponse)
async def create_batch_image_jobs(payload: BatchImageJobRequest) -> dict[str, Any]:
    try:
        return await run_batch_image_jobs([row.model_dump(mode="json") for row in payload.rows])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
