from __future__ import annotations

import asyncio
import mimetypes
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3

from app.config import get_settings

settings = get_settings()


class StorageService:
    def __init__(self) -> None:
        self.local_root = settings.storage_root / "objects"
        self.local_root.mkdir(parents=True, exist_ok=True)
        self._client = None
        if settings.spaces_enabled:
            self._client = boto3.client(
                "s3",
                region_name=settings.do_spaces_region,
                endpoint_url=settings.resolved_spaces_endpoint,
                aws_access_key_id=settings.do_spaces_key,
                aws_secret_access_key=settings.do_spaces_secret,
            )

    @property
    def is_remote(self) -> bool:
        return self._client is not None

    def _full_local_path(self, storage_key: str) -> Path:
        return self.local_root / storage_key

    async def upload_file(
        self, local_path: str | Path, storage_key: str, mime_type: str | None = None
    ) -> str:
        local_path = Path(local_path).resolve()
        mime_type = (
            mime_type
            or mimetypes.guess_type(str(local_path))[0]
            or "application/octet-stream"
        )
        if self._client:
            extra_args = {"ContentType": mime_type}
            if mime_type.startswith("image/"):
                extra_args["ACL"] = "public-read"
                extra_args["CacheControl"] = "public, max-age=31536000, immutable"
            await asyncio.to_thread(
                self._client.upload_file,
                str(local_path),
                settings.do_spaces_bucket,
                storage_key,
                ExtraArgs=extra_args,
            )
            return storage_key
        destination = self._full_local_path(storage_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(shutil.copyfile, local_path, destination)
        return storage_key

    async def upload_bytes(
        self, data: bytes, storage_key: str, mime_type: str = "application/octet-stream"
    ) -> str:
        if self._client:
            put_kwargs = {
                "Bucket": settings.do_spaces_bucket,
                "Key": storage_key,
                "Body": data,
                "ContentType": mime_type,
            }
            if mime_type.startswith("image/"):
                put_kwargs["ACL"] = "public-read"
                put_kwargs["CacheControl"] = "public, max-age=31536000, immutable"
            await asyncio.to_thread(
                self._client.put_object,
                **put_kwargs,
            )
            return storage_key
        destination = self._full_local_path(storage_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(destination.write_bytes, data)
        return storage_key

    async def download_file(
        self, storage_key: str, destination_path: str | Path
    ) -> Path:
        destination_path = Path(destination_path).resolve()
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        if self._client:
            await asyncio.to_thread(
                self._client.download_file,
                settings.do_spaces_bucket,
                storage_key,
                str(destination_path),
            )
            return destination_path
        source = self._full_local_path(storage_key)
        await asyncio.to_thread(shutil.copyfile, source, destination_path)
        return destination_path

    async def download_bytes(self, storage_key: str) -> bytes:
        if self._client:
            response = await asyncio.to_thread(
                self._client.get_object,
                Bucket=settings.do_spaces_bucket,
                Key=storage_key,
            )
            return await asyncio.to_thread(response["Body"].read)
        source = self._full_local_path(storage_key)
        return await asyncio.to_thread(source.read_bytes)

    async def delete_file(self, storage_key: str) -> bool:
        if self._client:
            await asyncio.to_thread(
                self._client.delete_object,
                Bucket=settings.do_spaces_bucket,
                Key=storage_key,
            )
            return True
        path = self._full_local_path(storage_key)
        if path.exists():
            await asyncio.to_thread(path.unlink)
        return True

    def get_presigned_url(
        self, storage_key: str, expires_in: int = 3600
    ) -> tuple[str, datetime]:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        if self._client:
            image_extensions = {
                ".png",
                ".jpg",
                ".jpeg",
                ".webp",
                ".gif",
                ".bmp",
                ".svg",
                ".avif",
            }
            if (
                settings.spaces_cdn_enabled
                and Path(storage_key).suffix.lower() in image_extensions
            ):
                cdn_base = (settings.do_spaces_cdn_endpoint or "").rstrip("/")
                bucket_name = settings.do_spaces_bucket or ""
                return f"{cdn_base}/{bucket_name}/{storage_key}", expires_at
            url = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.do_spaces_bucket, "Key": storage_key},
                ExpiresIn=expires_in,
            )
            return url, expires_at
        return (
            f"{settings.backend_url.rstrip('/')}/local-storage/{storage_key}",
            expires_at,
        )


storage_service = StorageService()
