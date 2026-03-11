from __future__ import annotations

import asyncio
import http.cookiejar
import mimetypes
import re
import tempfile
import urllib.parse
import urllib.request
from html import unescape
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


def _extract_drive_file_id(image_url: str) -> str | None:
    parsed = urllib.parse.urlparse(image_url)
    file_match = re.search(r"/file/d/([^/]+)", parsed.path)
    if file_match:
        return file_match.group(1)

    query = urllib.parse.parse_qs(parsed.query)
    if "id" in query and query["id"]:
        return query["id"][0]
    return None


def _extract_drive_folder_parts(folder_url: str) -> tuple[str | None, str | None]:
    parsed = urllib.parse.urlparse(folder_url)
    if "drive.google.com" not in parsed.netloc:
        return None, None

    match = re.search(r"/drive/folders/([^/?#]+)", parsed.path)
    if not match:
        query = urllib.parse.parse_qs(parsed.query)
        folder_id = query.get("id", [None])[0]
    else:
        folder_id = match.group(1)

    resource_key = urllib.parse.parse_qs(parsed.query).get("resourcekey", [None])[0]
    return folder_id, resource_key


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


def _open_remote_url(opener: urllib.request.OpenerDirector, image_url: str) -> tuple[bytes, str, str, str]:
    request = _build_remote_request(image_url)
    with opener.open(request, timeout=30) as response:
        content = response.read()
        mime_type = response.headers.get_content_type() or "application/octet-stream"
        final_url = response.geturl()
        filename = _extract_filename(final_url, response)
    return content, mime_type, filename, final_url


def _extract_drive_confirm_url(
    *,
    image_url: str,
    html: str,
    opener: urllib.request.OpenerDirector,
    final_url: str,
) -> str | None:
    file_id = _extract_drive_file_id(image_url) or _extract_drive_file_id(final_url)

    cookie_jar = next(
        (handler.cookiejar for handler in opener.handlers if isinstance(handler, urllib.request.HTTPCookieProcessor)),
        None,
    )
    if cookie_jar and file_id:
        for cookie in cookie_jar:
            if cookie.name.startswith("download_warning") and cookie.value:
                token = urllib.parse.quote(cookie.value, safe="")
                return f"https://drive.google.com/uc?export=download&confirm={token}&id={file_id}"

    form_match = re.search(r'<form[^>]+id="download-form"[^>]+action="([^"]+)"', html)
    if form_match:
        return urllib.parse.urljoin(final_url, form_match.group(1).replace("&amp;", "&"))

    href_match = re.search(r'href="([^"]*confirm=[^"]+)"', html)
    if href_match:
        return urllib.parse.urljoin(final_url, href_match.group(1).replace("&amp;", "&"))

    if file_id:
        confirm_match = re.search(r'confirm=([0-9A-Za-z_]+)', html)
        if confirm_match:
            token = urllib.parse.quote(confirm_match.group(1), safe="")
            return f"https://drive.google.com/uc?export=download&confirm={token}&id={file_id}"

    return None


def _download_remote_image_payload(image_url: str) -> tuple[bytes, str, str]:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    content, mime_type, filename, final_url = _open_remote_url(opener, image_url)

    if mime_type.startswith("text/html"):
        parsed = urllib.parse.urlparse(final_url)
        if "drive.google.com" in parsed.netloc:
            html = content.decode("utf-8", errors="ignore")
            confirm_url = _extract_drive_confirm_url(
                image_url=image_url,
                html=html,
                opener=opener,
                final_url=final_url,
            )
            if confirm_url:
                content, mime_type, filename, _final_url = _open_remote_url(opener, confirm_url)
            if mime_type.startswith("text/html"):
                raise ValueError("Google Drive link did not return a directly downloadable image. Ensure the file is public.")
        else:
            raise ValueError("Remote image URL returned HTML instead of an image file.")

    extension = mimetypes.guess_extension(mime_type) or ".jpg"
    if "." not in filename:
        filename = f"{filename}{extension}"

    return content, mime_type, filename


def _build_drive_embedded_folder_url(folder_url: str) -> str:
    folder_id, resource_key = _extract_drive_folder_parts(folder_url)
    if not folder_id:
        raise ValueError("Invalid Google Drive folder URL.")

    query = {"id": folder_id}
    if resource_key:
        query["resourcekey"] = resource_key
    return f"https://drive.google.com/embeddedfolderview?{urllib.parse.urlencode(query)}#list"


def _extract_drive_folder_candidate_urls(folder_html: str) -> list[str]:
    candidates: list[str] = []
    seen: set[str] = set()

    for match in re.finditer(r'href="([^"]*?/file/d/[^"]+)"', folder_html):
        href = unescape(match.group(1))
        if href.startswith("//"):
            href = f"https:{href}"
        elif href.startswith("/"):
            href = urllib.parse.urljoin("https://drive.google.com", href)
        if href not in seen:
            seen.add(href)
            candidates.append(href)

    if candidates:
        return candidates

    for match in re.finditer(r"/file/d/([A-Za-z0-9_-]{10,})", folder_html):
        href = f"https://drive.google.com/file/d/{match.group(1)}/view"
        if href not in seen:
            seen.add(href)
            candidates.append(href)

    return candidates


def _download_drive_folder_image_payloads(folder_url: str, max_images: int = 3) -> list[tuple[bytes, str, str, str]]:
    folder_id, _resource_key = _extract_drive_folder_parts(folder_url)
    if not folder_id:
        raise ValueError("Invalid Google Drive folder URL.")

    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    folder_request = urllib.request.Request(
        _build_drive_embedded_folder_url(folder_url),
        headers={
            "User-Agent": "Mozilla/5.0 ContentPro/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )

    with opener.open(folder_request, timeout=30) as response:
        html = response.read().decode("utf-8", errors="ignore")

    candidate_urls = _extract_drive_folder_candidate_urls(html)
    if not candidate_urls:
        raise ValueError("No downloadable files were found in the public Google Drive folder.")

    downloaded: list[tuple[bytes, str, str, str]] = []
    failures: list[str] = []
    for candidate_url in candidate_urls:
        try:
            content, mime_type, filename = _download_remote_image_payload(candidate_url)
        except Exception as exc:
            failures.append(str(exc))
            continue
        if not mime_type.startswith("image/"):
            continue
        downloaded.append((content, mime_type, filename, candidate_url))
        if len(downloaded) >= max(1, min(max_images, 3)):
            break

    if downloaded:
        return downloaded

    detail = failures[0] if failures else "Folder did not contain downloadable public images."
    raise ValueError(detail)


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


async def download_drive_folder_image_bytes(folder_url: str, max_images: int = 3) -> list[tuple[bytes, str, str, str]]:
    return await asyncio.to_thread(_download_drive_folder_image_payloads, folder_url, max_images)


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
        image_paths=[image_path],
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
