from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.models.asset import Asset
from app.models.job import Job
from app.models.pricing import PricingSnapshot
from app.models.user import User
from app.routers.auth import get_current_user, get_current_user_from_stream
from app.schemas.asset import AssetResponse
from app.schemas.job import (
    JobCreateRequest,
    JobListResponse,
    JobResponse,
    JobSummaryResponse,
    PricingSnapshotResponse,
    RecentJobResponse,
    UsageResponse,
)
from app.services.pipeline_runner import hydrate_job_assets, subscribe

router = APIRouter(tags=["jobs"])


def _job_summary(job: Job) -> JobSummaryResponse:
    return JobSummaryResponse(
        id=job.id,
        job_id=job.job_id,
        brand_name=job.brand_name,
        product_name=job.product_name,
        job_type=job.job_type,
        status=job.status,
        current_stage=job.current_stage,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


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
        social_link_1=payload.social_link_1,
        social_link_2=payload.social_link_2,
        social_link_3=payload.social_link_3,
        social_link_4=payload.social_link_4,
        video_duration_seconds=payload.video_duration_seconds,
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
    query = select(Job).where(Job.user_id == current_user.id)
    count_query = select(func.count()).select_from(Job).where(Job.user_id == current_user.id)
    if status:
        query = query.where(Job.status == status)
        count_query = count_query.where(Job.status == status)

    query = query.order_by(Job.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    total = await db.scalar(count_query)
    return JobListResponse(items=[_job_summary(job) for job in items], page=page, page_size=page_size, total=total or 0)


@router.get("/jobs/recent", response_model=list[RecentJobResponse])
async def recent_jobs(
    limit: int = 4,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecentJobResponse]:
    result = await db.execute(select(Job).where(Job.user_id == current_user.id).order_by(Job.created_at.desc()).limit(limit))
    jobs = result.scalars().all()
    response: list[RecentJobResponse] = []
    for job in jobs:
        image_count = await db.scalar(select(func.count()).select_from(Asset).where(Asset.job_id == job.id, Asset.asset_type == "generated_image", Asset.is_deleted.is_(False)))
        response.append(
            RecentJobResponse(
                id=job.job_id,
                name=job.product_name,
                type=job.job_type,
                status=job.status,
                images=image_count or 0,
                date=job.created_at,
            )
        )
    return response


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    assets = [AssetResponse(**asset) for asset in await hydrate_job_assets(db, job)]
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
        social_link_1=job.social_link_1,
        social_link_2=job.social_link_2,
        social_link_3=job.social_link_3,
        social_link_4=job.social_link_4,
        video_duration_seconds=job.video_duration_seconds,
        status=job.status,
        current_stage=job.current_stage,
        error_message=job.error_message,
        storage_prefix=job.storage_prefix,
        created_at=job.created_at,
        updated_at=job.updated_at,
        assets=assets,
        pricing_snapshot=pricing_snapshot,
    )


@router.get("/jobs/{job_id}/events")
async def stream_job_events(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_stream),
):
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return EventSourceResponse(subscribe(job_id))


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    asset_result = await db.execute(select(Asset).where(Asset.job_id == job.id, Asset.is_deleted.is_(False)))
    for asset in asset_result.scalars().all():
        asset.is_deleted = True
    job.status = "deleted"
    await db.commit()
    return {"ok": True}


@router.get("/jobs/{job_id}/pricing", response_model=PricingSnapshotResponse)
async def get_pricing(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PricingSnapshotResponse:
    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == current_user.id))
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
