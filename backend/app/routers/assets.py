from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.asset import Asset
from app.models.job import Job
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.asset import AssetResponse, AssetUrlResponse, RemoteAssetCreateRequest
from app.services.image_pipeline import download_remote_image_bytes
from app.services.pipeline_runner import queue_pipeline_task
from app.services.storage import storage_service
from app.utils.presigned_urls import generate_url

router = APIRouter(tags=["assets"])


def _asset_response(asset: Asset) -> AssetResponse:
    url = generate_url(asset)
    return AssetResponse(
        id=asset.id,
        job_id=asset.job_id,
        asset_type=asset.asset_type,
        stage=asset.stage,
        storage_key=asset.storage_key,
        original_filename=asset.original_filename,
        mime_type=asset.mime_type,
        size_bytes=asset.size_bytes,
        metadata=asset.metadata_json,
        is_deleted=asset.is_deleted,
        created_at=asset.created_at,
        presigned_url=url,
    )


@router.post("/jobs/{job_id}/assets", response_model=list[AssetResponse])
@router.post("/jobs/{job_id}/assets/upload", response_model=list[AssetResponse])
async def upload_job_asset(
    job_id: str,
    files: list[UploadFile] = File(...),
    asset_type: str = Form(default="raw_image"),
    stage: str = Form(default="raw"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AssetResponse]:
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    if not files:
        raise HTTPException(status_code=400, detail="At least one image file is required.")

    raw_asset_result = await db.execute(
        select(Asset).where(Asset.job_id == job.id, Asset.asset_type == "raw_image", Asset.is_deleted.is_(False))
    )
    existing_raw_count = len(raw_asset_result.scalars().all())
    if existing_raw_count + len(files) > 4:
        raise HTTPException(status_code=400, detail="A job can include at most 4 source images.")

    created_assets: list[Asset] = []
    for file in files:
        contents = await file.read()
        storage_key = f"{job.storage_prefix}/raw/{file.filename}"
        await storage_service.upload_bytes(contents, storage_key, file.content_type or "application/octet-stream")

        asset = Asset(
            job_id=job.id,
            asset_type=asset_type,
            stage=stage,
            storage_key=storage_key,
            original_filename=file.filename,
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=len(contents),
            metadata_json=None,
        )
        db.add(asset)
        created_assets.append(asset)

    job.status = "pending"
    job.current_stage = "queued"
    job.error_message = None
    await db.commit()
    for asset in created_assets:
        await db.refresh(asset)

    if job.job_type == "image":
        await queue_pipeline_task(job.job_id)
    return [_asset_response(asset) for asset in created_assets]


@router.post("/jobs/{job_id}/assets/remote", response_model=AssetResponse)
async def upload_remote_job_asset(
    job_id: str,
    payload: RemoteAssetCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssetResponse:
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        contents, mime_type, filename = await download_remote_image_bytes(payload.image_url)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Unable to download remote image: {exc}") from exc

    storage_key = f"{job.storage_prefix}/raw/{filename}"
    await storage_service.upload_bytes(contents, storage_key, mime_type)

    asset = Asset(
        job_id=job.id,
        asset_type="raw_image",
        stage="raw",
        storage_key=storage_key,
        original_filename=filename,
        mime_type=mime_type,
        size_bytes=len(contents),
        metadata_json={"source_image_url": payload.image_url},
    )
    db.add(asset)
    job.status = "pending"
    job.current_stage = "queued"
    job.error_message = None
    await db.commit()
    await db.refresh(asset)

    if job.job_type == "image":
        await queue_pipeline_task(job.job_id)

    return _asset_response(asset)


@router.get("/jobs/{job_id}/assets", response_model=list[AssetResponse])
async def list_job_assets(
    job_id: str,
    asset_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AssetResponse]:
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    query = select(Asset).where(Asset.job_id == job.id, Asset.is_deleted.is_(False))
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    asset_result = await db.execute(query.order_by(Asset.created_at.asc()))
    assets = asset_result.scalars().all()

    response: list[AssetResponse] = []
    for asset in assets:
        response.append(
            AssetResponse(
                id=asset.id,
                job_id=asset.job_id,
                asset_type=asset.asset_type,
                stage=asset.stage,
                storage_key=asset.storage_key,
                original_filename=asset.original_filename,
                mime_type=asset.mime_type,
                size_bytes=asset.size_bytes,
                metadata=asset.metadata_json,
                is_deleted=asset.is_deleted,
                created_at=asset.created_at,
                presigned_url=generate_url(asset),
            )
        )
    return response


@router.get("/jobs/{job_id}/assets/{asset_id}/url", response_model=AssetUrlResponse)
async def get_asset_url(
    job_id: str,
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssetUrlResponse:
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    asset_result = await db.execute(select(Asset).where(Asset.id == asset_id, Asset.job_id == job.id, Asset.is_deleted.is_(False)))
    asset = asset_result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")

    url, expires_at = storage_service.get_presigned_url(asset.storage_key)
    return AssetUrlResponse(url=url, expires_at=expires_at)
