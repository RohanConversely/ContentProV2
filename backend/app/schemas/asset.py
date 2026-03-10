from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AssetResponse(BaseModel):
    id: str
    job_id: str
    asset_type: str
    stage: str
    storage_key: str
    original_filename: str | None = None
    mime_type: str
    size_bytes: int | None = None
    metadata: dict | None = None
    is_deleted: bool
    created_at: datetime
    presigned_url: str | None = None


class AssetUrlResponse(BaseModel):
    url: str
    expires_at: datetime


class RemoteAssetCreateRequest(BaseModel):
    image_url: str
