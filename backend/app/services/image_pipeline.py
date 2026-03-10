from __future__ import annotations

import asyncio
import mimetypes
import re
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from fastapi import UploadFile

from pipeline.image_batch_orchestrator import BatchRowInput, run_batch_product_upload
from pipeline.image_single_orchestrator import run_single_product_upload

RUNTIME_ROOT = Path(__file__).resolve().parents[2] / "runtime"
UPLOAD_ROOT = RUNTIME_ROOT / "uploads"
DOWNLOAD_ROOT = RUNTIME_ROOT / "downloads"


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _safe_filename(candidate: str, fallback: str) -> str:
    cleaned = Path(candidate).name.strip()
    return cleaned or fallback


def _normalize_remote_image_url(image_url: str) -> str:
    parsed = urllib.parse.urlparse(image_url)
    if "drive.google.com" not in parsed.netloc:
        return image_url

    file_match = re.search(r"/file/d/([^/]+)", parsed.path)
    if file_match:
        file_id = file_match.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"

    query = urllib.parse.parse_qs(parsed.query)
    if "id" in query and query["id"]:
        return f"https://drive.google.com/uc?export=download&id={query['id'][0]}"

    return image_url


def _build_remote_request(image_url: str) -> urllib.request.Request:
    return urllib.request.Request(
        _normalize_remote_image_url(image_url),
        headers={
            "User-Agent": "Mozilla/5.0 ContentPro/1.0",
            "Accept": "image/*,application/octet-stream;q=0.9,*/*;q=0.1",
        },
    )


def _extract_filename(image_url: str, response: Any) -> str:
    content_disposition = response.headers.get("Content-Disposition")
    if content_disposition:
        match = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^\";]+)"?', content_disposition)
        if match:
            return _safe_filename(urllib.parse.unquote(match.group(1)), "remote_image.jpg")

    parsed = urllib.parse.urlparse(image_url)
    suffix = Path(parsed.path).suffix or ".jpg"
    filename = _safe_filename(Path(parsed.path).name, f"remote_image{suffix}")
    if "." not in filename:
        return f"{filename}{suffix}"
    return filename


def _download_remote_image_payload(image_url: str) -> tuple[bytes, str, str]:
    request = _build_remote_request(image_url)
    with urllib.request.urlopen(request, timeout=30) as response:
        content = response.read()
        mime_type = response.headers.get_content_type() or "application/octet-stream"
        filename = _extract_filename(image_url, response)

    if mime_type.startswith("text/html"):
        raise ValueError("Remote image URL returned HTML instead of an image file.")

    extension = mimetypes.guess_extension(mime_type) or ".jpg"
    if "." not in filename:
        filename = f"{filename}{extension}"

    return content, mime_type, filename


async def persist_upload_file(file: UploadFile) -> Path:
    suffix = Path(file.filename or "").suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=_prepare_root(UPLOAD_ROOT)) as handle:
        content = await file.read()
        handle.write(content)
        return Path(handle.name).resolve()


def _prepare_root(root: Path) -> str:
    root.mkdir(parents=True, exist_ok=True)
    return str(root)


def _download_remote_image(image_url: str, download_root: Path) -> Path:
    content, _mime_type, filename = _download_remote_image_payload(image_url)
    target_path = download_root / filename
    _ensure_parent(target_path)
    with open(target_path, "wb") as f:
        f.write(content)
    return target_path.resolve()


async def download_remote_image(image_url: str) -> Path:
    download_root = Path(tempfile.mkdtemp(prefix="contentpro_batch_", dir=_prepare_root(DOWNLOAD_ROOT)))
    return await asyncio.to_thread(_download_remote_image, image_url, download_root)


async def download_remote_image_bytes(image_url: str) -> tuple[bytes, str, str]:
    return await asyncio.to_thread(_download_remote_image_payload, image_url)


async def run_single_image_job(
    *,
    image_path: Path,
    brand_name: str,
    brand_website: str,
    product_name: str,
    product_category: str,
    social_link_1: str | None = None,
    social_link_2: str | None = None,
    additional_info: dict[str, Any] | None = None,
    num_images: int = 4,
    temperature: float = 0.1,
) -> dict[str, Any]:
    return await run_single_product_upload(
        image_path=image_path,
        brand_name=brand_name,
        brand_website=brand_website,
        product_name=product_name,
        product_category=product_category,
        social_link_1=social_link_1,
        social_link_2=social_link_2,
        additional_info=additional_info,
        num_images=num_images,
        temperature=temperature,
    )


async def run_batch_image_jobs(rows: list[dict[str, Any]]) -> dict[str, Any]:
    batch_rows: list[BatchRowInput] = []
    for row in rows:
        image_path = await download_remote_image(row["image_url"])
        batch_rows.append(
            BatchRowInput(
                image_path=image_path,
                brand_name=row["brand_name"],
                brand_website=row["brand_website"],
                product_name=row["product_name"],
                product_category=row["product_category"],
                social_link_1=row.get("social_link_1"),
                social_link_2=row.get("social_link_2"),
                additional_info=row.get("additional_info"),
                num_images=row.get("num_images", 4),
                temperature=row.get("temperature", 0.1),
                source_image_url=row["image_url"],
                source_row_id=row.get("row_id"),
            )
        )
    return await run_batch_product_upload(batch_rows)
