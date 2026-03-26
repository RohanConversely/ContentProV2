from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests


def _extract_drive_file_id(url: str) -> str | None:
    parsed = urlparse(url)
    if "drive.google.com" not in parsed.netloc:
        return None

    match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", parsed.path)
    if match:
        return match.group(1)

    query_id = parse_qs(parsed.query).get("id")
    if query_id:
        return query_id[0]
    return None


def _response_filename(response: requests.Response, fallback: str) -> str:
    disposition = response.headers.get("Content-Disposition", "")
    match = re.search(r'filename="?([^";]+)"?', disposition)
    if match:
        return match.group(1)
    return fallback


def download_google_drive_image(url: str, target_dir: Path, fallback_name: str) -> Path:
    file_id = _extract_drive_file_id(url)
    if not file_id:
        raise ValueError("Hero image hyperlink is not a supported Google Drive file link.")

    session = requests.Session()
    download_url = "https://drive.google.com/uc?export=download"
    response = session.get(download_url, params={"id": file_id}, timeout=60)
    response.raise_for_status()

    confirm_token = None
    for key, value in response.cookies.items():
        if key.startswith("download_warning"):
            confirm_token = value
            break

    if confirm_token:
        response = session.get(download_url, params={"id": file_id, "confirm": confirm_token}, timeout=60)
        response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")
    if "text/html" in content_type.lower():
        raise ValueError("Google Drive link did not return a downloadable image file.")

    suffix = Path(_response_filename(response, fallback_name)).suffix or ".png"
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / f"{fallback_name}{suffix}"
    target_path.write_bytes(response.content)
    return target_path

