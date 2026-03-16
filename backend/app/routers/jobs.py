import io
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.models.asset import Asset
from app.models.job_generation import JobGeneration
from app.models.job import Job
from app.models.pricing import PipelineLog, PricingSnapshot
from app.models.user import User
from app.routers.auth import get_current_user, get_current_user_from_stream
from app.schemas.asset import AssetResponse
from app.schemas.job import (
    JobCreateRequest,
    JobLogEntryResponse,
    JobListResponse,
    JobResponse,
    JobSummaryResponse,
    PricingSnapshotResponse,
    RecentJobResponse,
    UsageResponse,
)
from app.schemas.generation import JobGenerationResponse, JobRegenerateRequest
from app.services.pipeline_runner import hydrate_job_assets, queue_regeneration_task, subscribe
from app.services.storage import storage_service

router = APIRouter(tags=["jobs"])
SOFT_DELETED_STATUS = "deleted"


def _job_summary(job: Job) -> JobSummaryResponse:
    return JobSummaryResponse(
        id=job.id,
        job_id=job.job_id,
        brand_name=job.brand_name,
        product_name=job.product_name,
        job_type=job.job_type,
        image_model=job.image_model,
        batch_id=job.batch_id,
        batch_name=job.batch_name,
        status=job.status,
        current_stage=job.current_stage,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _active_job_query(*conditions):
    return select(Job).where(Job.status != SOFT_DELETED_STATUS, *conditions)


def _build_generation_responses(
    assets: list[AssetResponse],
    generations: list[JobGeneration],
) -> list[JobGenerationResponse]:
    generated_assets = [asset for asset in assets if asset.asset_type == "generated_image" and not asset.is_deleted]
    assets_by_generation: dict[str, list[AssetResponse]] = {}
    legacy_assets: list[AssetResponse] = []
    for asset in generated_assets:
        if asset.generation_id:
            assets_by_generation.setdefault(asset.generation_id, []).append(asset)
        else:
            legacy_assets.append(asset)

    responses: list[JobGenerationResponse] = []
    if legacy_assets:
        responses.append(
            JobGenerationResponse(
                id="legacy-round-1",
                round_number=1,
                additional_description=None,
                status="completed",
                created_at=min(asset.created_at for asset in legacy_assets),
                images=legacy_assets,
            )
        )

    for generation in generations:
        responses.append(
            JobGenerationResponse(
                id=generation.id,
                round_number=generation.round_number,
                additional_description=generation.additional_description,
                status=generation.status,
                created_at=generation.created_at,
                images=assets_by_generation.get(generation.id, []),
            )
        )

    return sorted(responses, key=lambda item: item.round_number)


@router.post("/jobs", response_model=JobSummaryResponse)
async def create_job(
    payload: JobCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobSummaryResponse:
    from pipeline.orchestrator import build_job_id

    generated_job_id = build_job_id()
    job = Job(
        job_id=generated_job_id,
        user_id=current_user.id,
        brand_name=payload.brand_name,
        brand_website=payload.brand_website,
        product_name=payload.product_name,
        product_category=payload.product_category,
        job_type=payload.job_type,
        image_model=payload.image_model,
        social_link_1=payload.social_link_1,
        social_link_2=payload.social_link_2,
        social_link_3=payload.social_link_3,
        social_link_4=payload.social_link_4,
        additional_input_json=payload.additional_input,
        video_duration_seconds=payload.video_duration_seconds,
        batch_id=payload.batch_id,
        batch_name=payload.batch_name,
        status="pending_upload",
        current_stage="queued",
        storage_prefix=f"jobs/{generated_job_id}",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return _job_summary(job)


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobListResponse:
    # Get all jobs to perform grouping
    query = select(Job).where(Job.user_id == current_user.id, Job.status != SOFT_DELETED_STATUS).order_by(Job.created_at.desc())
    result = await db.execute(query)
    all_jobs = result.scalars().all()

    seen_batches = set()
    grouped_items = []

    for job in all_jobs:
        if job.batch_id:
            if job.batch_id in seen_batches:
                continue
            seen_batches.add(job.batch_id)

            batch_jobs = [j for j in all_jobs if j.batch_id == job.batch_id]
            total_jobs_in_batch = len(batch_jobs)
            any_failed = any(j.status == "failed" for j in batch_jobs)
            any_running = any(j.status not in ["completed", "failed"] for j in batch_jobs)
            batch_status = "processing" if any_running else "failed" if any_failed else "completed"

            # Filter by status if requested
            if status and batch_status != status:
                continue

            summary = _job_summary(job)
            summary.status = batch_status
            summary.total_jobs = total_jobs_in_batch
            summary.product_name = job.batch_name or job.product_name
            grouped_items.append(summary)
        else:
            if status and job.status != status:
                continue
            grouped_items.append(_job_summary(job))

    total = len(grouped_items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = grouped_items[start:end]

    return JobListResponse(items=paginated_items, page=page, page_size=page_size, total=total)


@router.get("/jobs/recent", response_model=list[RecentJobResponse])
async def recent_jobs(
    limit: int = 4,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecentJobResponse]:
    # We want to return unique projects (either single jobs or batches)
    # This query finds the latest job for each batch_id (or where batch_id is null)
    query = (
        select(Job)
        .where(Job.user_id == current_user.id, Job.status != SOFT_DELETED_STATUS)
        .order_by(Job.created_at.desc())
    )
    result = await db.execute(query)
    all_jobs = result.scalars().all()

    seen_batches = set()
    unique_items = []

    for job in all_jobs:
        if len(unique_items) >= limit:
            break

        if job.batch_id:
            if job.batch_id in seen_batches:
                continue
            seen_batches.add(job.batch_id)

            # Aggregate stats for the batch
            batch_jobs = [j for j in all_jobs if j.batch_id == job.batch_id]
            total_jobs = len(batch_jobs)
            all_completed = all(j.status == "completed" for j in batch_jobs)
            any_failed = any(j.status == "failed" for j in batch_jobs)
            any_running = any(j.status not in ["completed", "failed"] for j in batch_jobs)

            status = "processing" if any_running else "failed" if any_failed else "completed"

            # Image count across all jobs in batch
            batch_job_ids = [j.id for j in batch_jobs]
            image_count = await db.scalar(
                select(func.count())
                .select_from(Asset)
                .where(
                    Asset.job_id.in_(batch_job_ids),
                    Asset.asset_type == "generated_image",
                    Asset.is_deleted.is_(False)
                )
            )

            unique_items.append(
                RecentJobResponse(
                    id=job.job_id, # Link to the first job or we might need a batch-specific link later
                    name=job.batch_name or job.product_name,
                    type=job.job_type,
                    status=status,
                    images=image_count or 0,
                    date=job.created_at,
                    batch_id=job.batch_id,
                    total_jobs=total_jobs
                )
            )
        else:
            # Single job
            image_count = await db.scalar(
                select(func.count())
                .select_from(Asset)
                .where(
                    Asset.job_id == job.id,
                    Asset.asset_type == "generated_image",
                    Asset.is_deleted.is_(False)
                )
            )
            unique_items.append(
                RecentJobResponse(
                    id=job.job_id,
                    name=job.product_name,
                    type=job.job_type,
                    status=job.status,
                    images=image_count or 0,
                    date=job.created_at,
                    batch_id=None,
                    total_jobs=None
                )
            )

    return unique_items


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    result = await db.execute(_active_job_query(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    assets = [AssetResponse(**asset) for asset in await hydrate_job_assets(db, job)]
    generation_result = await db.execute(
        select(JobGeneration)
        .where(JobGeneration.job_id == job.id)
        .order_by(JobGeneration.round_number.asc())
    )
    generations = _build_generation_responses(assets, generation_result.scalars().all())
    pricing_snapshot = None
    pricing_result = await db.execute(select(PricingSnapshot).where(PricingSnapshot.job_id == job.id))
    pricing = pricing_result.scalar_one_or_none()
    if pricing:
        pricing_snapshot = PricingSnapshotResponse(
            raw_price_data=pricing.raw_price_data,
            total_cost_usd=float(pricing.total_cost_usd) if pricing.total_cost_usd is not None else None,
            stage_1_cost_usd=float(pricing.stage_1_cost_usd) if pricing.stage_1_cost_usd is not None else None,
            stage_2_cost_usd=float(pricing.stage_2_cost_usd) if pricing.stage_2_cost_usd is not None else None,
            stage_3_cost_usd=float(pricing.stage_3_cost_usd) if pricing.stage_3_cost_usd is not None else None,
            stage_4_cost_usd=float(pricing.stage_4_cost_usd) if pricing.stage_4_cost_usd is not None else None,
            total_input_tokens=pricing.total_input_tokens,
            total_output_tokens=pricing.total_output_tokens,
            created_at=pricing.created_at,
        )

    return JobResponse(
        id=job.id,
        job_id=job.job_id,
        user_id=job.user_id,
        brand_name=job.brand_name,
        brand_website=job.brand_website,
        product_name=job.product_name,
        product_category=job.product_category,
        job_type=job.job_type,
        image_model=job.image_model,
        social_link_1=job.social_link_1,
        social_link_2=job.social_link_2,
        social_link_3=job.social_link_3,
        social_link_4=job.social_link_4,
        additional_input=job.additional_input_json,
        video_duration_seconds=job.video_duration_seconds,
        status=job.status,
        current_stage=job.current_stage,
        error_message=job.error_message,
        storage_prefix=job.storage_prefix,
        created_at=job.created_at,
        updated_at=job.updated_at,
        assets=assets,
        generations=generations,
        pricing_snapshot=pricing_snapshot,
    )


@router.post("/jobs/{job_id}/regenerate-images", response_model=JobGenerationResponse)
async def regenerate_job_images(
    job_id: str,
    payload: JobRegenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobGenerationResponse:
    result = await db.execute(_active_job_query(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.job_type != "image":
        raise HTTPException(status_code=400, detail="Only image jobs can be regenerated.")
    if job.status == "running":
        raise HTTPException(status_code=409, detail="This job is already running.")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Only completed jobs can be regenerated.")

    raw_asset_result = await db.execute(
        select(Asset.id).where(
            Asset.job_id == job.id,
            Asset.asset_type == "raw_image",
            Asset.is_deleted.is_(False),
        )
    )
    if raw_asset_result.first() is None:
        raise HTTPException(status_code=400, detail="No source images available for regeneration.")

    filtered_kyc_result = await db.execute(
        select(Asset.id).where(
            Asset.job_id == job.id,
            Asset.asset_type == "kyc_json",
            Asset.is_deleted.is_(False),
            Asset.storage_key.ilike("%filtered%"),
        )
    )
    if filtered_kyc_result.first() is None:
        raise HTTPException(status_code=400, detail="No filtered KYC output available for regeneration.")

    generation_result = await db.execute(
        select(JobGeneration)
        .where(JobGeneration.job_id == job.id)
        .order_by(JobGeneration.round_number.desc())
    )
    latest_generation = generation_result.scalars().first()
    has_legacy_generation = await db.execute(
        select(Asset.id).where(
            Asset.job_id == job.id,
            Asset.asset_type == "generated_image",
            Asset.generation_id.is_(None),
            Asset.is_deleted.is_(False),
        )
    )
    next_round = 1
    if latest_generation is not None:
        next_round = latest_generation.round_number + 1
    elif has_legacy_generation.first() is not None:
        next_round = 2

    generation = JobGeneration(
        job_id=job.id,
        round_number=next_round,
        additional_description=payload.additional_description.strip(),
        status="queued",
    )
    selected_image_model = payload.image_model or job.image_model or "flux-2-pro"
    db.add(generation)
    job.image_model = selected_image_model
    job.status = "queued"
    job.current_stage = "stage_2"
    job.error_message = None
    await db.commit()
    await db.refresh(generation)

    await queue_regeneration_task(job.job_id, generation.id, selected_image_model)

    return JobGenerationResponse(
        id=generation.id,
        round_number=generation.round_number,
        additional_description=generation.additional_description,
        status=generation.status,
        created_at=generation.created_at,
        images=[],
    )


@router.get("/jobs/{job_id}/events")
async def stream_job_events(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_stream),
):
    result = await db.execute(_active_job_query(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return EventSourceResponse(subscribe(job_id))


@router.get("/jobs/{job_id}/logs", response_model=list[JobLogEntryResponse])
async def get_job_logs(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JobLogEntryResponse]:
    result = await db.execute(_active_job_query(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    logs_result = await db.execute(
        select(PipelineLog)
        .where(PipelineLog.job_id == job.id)
        .order_by(PipelineLog.logged_at.asc())
    )
    logs = logs_result.scalars().all()
    return [
        JobLogEntryResponse(
            level=log.level,
            stage=log.stage,
            message=log.message,
            context=log.context,
            logged_at=log.logged_at,
        )
        for log in logs
    ]


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    result = await db.execute(_active_job_query(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    asset_result = await db.execute(select(Asset).where(Asset.job_id == job.id, Asset.is_deleted.is_(False)))
    for asset in asset_result.scalars().all():
        asset.is_deleted = True
    job.status = SOFT_DELETED_STATUS
    await db.commit()
    return {"ok": True}


@router.get("/jobs/{job_id}/pricing", response_model=PricingSnapshotResponse)
async def get_pricing(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PricingSnapshotResponse:
    result = await db.execute(_active_job_query(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    pricing_result = await db.execute(select(PricingSnapshot).where(PricingSnapshot.job_id == job.id))
    pricing = pricing_result.scalar_one_or_none()
    if pricing is None:
        raise HTTPException(status_code=404, detail="Pricing not available.")
    return PricingSnapshotResponse(
        raw_price_data=pricing.raw_price_data,
        total_cost_usd=float(pricing.total_cost_usd) if pricing.total_cost_usd is not None else None,
        stage_1_cost_usd=float(pricing.stage_1_cost_usd) if pricing.stage_1_cost_usd is not None else None,
        stage_2_cost_usd=float(pricing.stage_2_cost_usd) if pricing.stage_2_cost_usd is not None else None,
        stage_3_cost_usd=float(pricing.stage_3_cost_usd) if pricing.stage_3_cost_usd is not None else None,
        stage_4_cost_usd=float(pricing.stage_4_cost_usd) if pricing.stage_4_cost_usd is not None else None,
        total_input_tokens=pricing.total_input_tokens,
        total_output_tokens=pricing.total_output_tokens,
        created_at=pricing.created_at,
    )


@router.get("/jobs/{job_id}/download/images")
async def download_job_images_archive(
    job_id: str,
    generation_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(_active_job_query(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    asset_query = (
        select(Asset)
        .where(
            Asset.job_id == job.id,
            Asset.asset_type == "generated_image",
            Asset.is_deleted.is_(False),
        )
        .order_by(Asset.created_at.asc())
    )
    if generation_id:
        if generation_id == "legacy-round-1":
            asset_query = asset_query.where(Asset.generation_id.is_(None))
        else:
            asset_query = asset_query.where(Asset.generation_id == generation_id)
    else:
        latest_generation_result = await db.execute(
            select(JobGeneration)
            .where(JobGeneration.job_id == job.id)
            .order_by(JobGeneration.round_number.desc())
        )
        latest_generation = latest_generation_result.scalars().first()
        if latest_generation is not None:
            asset_query = asset_query.where(Asset.generation_id == latest_generation.id)
    asset_result = await db.execute(asset_query)
    assets = asset_result.scalars().all()
    if not assets:
        raise HTTPException(status_code=404, detail="No generated images available for this job.")

    archive_bytes = io.BytesIO()
    with zipfile.ZipFile(archive_bytes, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for asset in assets:
            file_bytes = await storage_service.download_bytes(asset.storage_key)
            archive_name = asset.original_filename or Path(asset.storage_key).name
            archive.writestr(archive_name, file_bytes)

    archive_bytes.seek(0)
    archive_name = f"{job.brand_name}_{job.product_name}".replace("/", "_").replace("\\", "_")
    headers = {"Content-Disposition": f'attachment; filename="{archive_name}.zip"'}
    return StreamingResponse(archive_bytes, media_type="application/zip", headers=headers)


@router.get("/batches/{batch_id}", response_model=list[JobSummaryResponse])
async def get_batch_jobs(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JobSummaryResponse]:
    result = await db.execute(
        select(Job)
        .where(Job.batch_id == batch_id, Job.user_id == current_user.id, Job.status != SOFT_DELETED_STATUS)
        .order_by(Job.created_at.asc())
    )
    jobs = result.scalars().all()
    if not jobs:
        raise HTTPException(status_code=404, detail="Batch not found.")
    return [_job_summary(job) for job in jobs]


@router.get("/batches/{batch_id}/download")
async def download_batch_images_archive(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job)
        .where(Job.batch_id == batch_id, Job.user_id == current_user.id, Job.status != SOFT_DELETED_STATUS)
    )
    jobs = result.scalars().all()
    if not jobs:
        raise HTTPException(status_code=404, detail="Batch not found.")

    archive_bytes = io.BytesIO()
    has_images = False
    with zipfile.ZipFile(archive_bytes, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for job in jobs:
            asset_result = await db.execute(
                select(Asset)
                .where(
                    Asset.job_id == job.id,
                    Asset.asset_type == "generated_image",
                    Asset.is_deleted.is_(False),
                )
                .order_by(Asset.created_at.asc())
            )
            assets = asset_result.scalars().all()
            if not assets:
                continue
            
            has_images = True
            # Create a folder for each job in the ZIP
            job_folder = f"{job.brand_name}_{job.product_name}".replace("/", "_").replace("\\", "_")
            # If product names are same, append job_id to ensure unique folders
            job_folder = f"{job_folder}_{job.job_id}"
            
            for i, asset in enumerate(assets):
                file_bytes = await storage_service.download_bytes(asset.storage_key)
                # Ensure filename has extension
                ext = Path(asset.storage_key).suffix or ".png"
                archive_name = f"{job_folder}/image_{i+1}{ext}"
                archive.writestr(archive_name, file_bytes)

    if not has_images:
        raise HTTPException(status_code=404, detail="No generated images available for this batch.")

    archive_bytes.seek(0)
    batch_name = jobs[0].batch_name or f"batch_{batch_id}"
    safe_batch_name = batch_name.replace("/", "_").replace("\\", "_")
    headers = {"Content-Disposition": f'attachment; filename="{safe_batch_name}.zip"'}
    return StreamingResponse(archive_bytes, media_type="application/zip", headers=headers)


@router.delete("/batches/{batch_id}")
async def delete_batch(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    result = await db.execute(
        select(Job).where(Job.batch_id == batch_id, Job.user_id == current_user.id, Job.status != SOFT_DELETED_STATUS)
    )
    jobs = result.scalars().all()
    if not jobs:
        raise HTTPException(status_code=404, detail="Batch not found.")

    for job in jobs:
        asset_result = await db.execute(select(Asset).where(Asset.job_id == job.id, Asset.is_deleted.is_(False)))
        for asset in asset_result.scalars().all():
            asset.is_deleted = True
        job.status = SOFT_DELETED_STATUS
    
    await db.commit()
    return {"ok": True}


@router.get("/usage", response_model=UsageResponse)
async def get_usage(current_user: User = Depends(get_current_user)) -> UsageResponse:
    reset_date = datetime.now(timezone.utc) + timedelta(days=30)
    return UsageResponse(
        plan=current_user.plan,
        credits_used=0,
        credits_total=100,
        images_this_month=0,
        videos_this_month=0,
        reset_date=reset_date,
    )


@router.get("/benefits", response_model=list[str])
async def get_benefits(current_user: User = Depends(get_current_user)) -> list[str]:
    if current_user.plan == "pro":
        return ["Unlimited images per month", "Unlimited videos per month", "Priority support"]
    return ["10 images per month", "2 videos per month", "Standard support"]
