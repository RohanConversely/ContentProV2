from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import SUPERADMIN_ROLE
from app.database import get_db
from app.models.asset import Asset
from app.models.job_generation import JobGeneration
from app.models.job import Job
from app.models.pricing import PipelineLog, PricingSnapshot
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.admin import (
    AdminCreateUserRequest,
    CategoryPromptResponse,
    CategoryPromptUpdateRequest,
    AdminUpdateUserRequest,
    AdminUserResponse,
    PromptResponse,
    PromptUpdateRequest,
)
from app.schemas.asset import AssetResponse
from app.schemas.generation import JobGenerationResponse
from app.schemas.job import JobListResponse, JobLogEntryResponse, JobResponse, JobSummaryResponse, PricingSnapshotResponse
from app.services.auth import get_user_by_email, hash_password
from app.services.pipeline_runner import hydrate_job_assets
from app.services.prompt_management import (
    delete_default_industry_prompt_bundle,
    delete_default_category_prompt,
    delete_user_category_override,
    delete_user_override,
    get_default_category_prompt,
    get_user_category_override,
    get_user_override,
    list_default_category_prompts,
    load_default_shot_prompts,
    list_default_prompts,
    set_default_category_prompt,
    set_default_prompt,
    set_user_category_override,
    set_user_override,
)

router = APIRouter(prefix="/admin", tags=["admin"])
SOFT_DELETED_STATUS = "deleted"
CANCELLED_STATUS = "cancelled"
TERMINAL_JOB_STATUSES = {"completed", "failed", CANCELLED_STATUS}


def _user_response(user: User) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        industry=user.industry,
        default_image_model=user.default_image_model or "gpt-image-1.5",
        default_batch_image_model=user.default_batch_image_model or "gpt-batch-api",
        enable_style_number=bool(user.enable_style_number),
        plan=user.plan,
        created_at=user.created_at,
    )


def _job_summary(job: Job) -> JobSummaryResponse:
    return JobSummaryResponse(
        id=job.id,
        job_id=job.job_id,
        brand_name=job.brand_name,
        product_name=job.product_name,
        job_type=job.job_type,
        image_model=job.image_model,
        requested_image_count=job.requested_image_count,
        batch_id=job.batch_id,
        batch_name=job.batch_name,
        status=job.status,
        current_stage=job.current_stage,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _category_prompt_response(
    industry: str,
    category_key: str,
    category_label: str,
    category_prompt_text: str,
    shot_prompts: list[dict[str, str]] | None,
) -> CategoryPromptResponse:
    return CategoryPromptResponse(
        industry=industry,
        category_key=category_key,
        category_label=category_label,
        category_prompt_text=category_prompt_text,
        shot_prompts=shot_prompts or [],
    )


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


async def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != SUPERADMIN_ROLE:
        raise HTTPException(status_code=403, detail="Superadmin access required.")
    return current_user


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> list[AdminUserResponse]:
    result = await db.execute(select(User).where(User.is_deleted.is_(False)).order_by(User.created_at.asc()))
    return [_user_response(user) for user in result.scalars().all()]


@router.post("/users", response_model=AdminUserResponse)
async def create_user(
    payload: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> AdminUserResponse:
    existing = await get_user_by_email(db, payload.email)
    if existing is not None:
        raise HTTPException(status_code=409, detail="User already exists.")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
        role=payload.role,
        industry=payload.industry,
        default_image_model=payload.default_image_model,
        default_batch_image_model=payload.default_batch_image_model,
        enable_style_number=payload.enable_style_number,
        plan=payload.plan,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_response(user)


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: str,
    payload: AdminUpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_superadmin),
) -> AdminUserResponse:
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if payload.email and payload.email != user.email:
        existing = await get_user_by_email(db, payload.email)
        if existing is not None and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Email already in use.")
        user.email = payload.email
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.role is not None:
        if user.id == current_admin.id and payload.role != SUPERADMIN_ROLE:
            raise HTTPException(status_code=400, detail="You cannot remove your own superadmin role.")
        user.role = payload.role
    if payload.industry is not None:
        user.industry = payload.industry
    if payload.default_image_model is not None:
        user.default_image_model = payload.default_image_model
    if payload.default_batch_image_model is not None:
        user.default_batch_image_model = payload.default_batch_image_model
    if payload.enable_style_number is not None:
        user.enable_style_number = payload.enable_style_number
    if payload.plan is not None:
        user.plan = payload.plan
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    await db.commit()
    await db.refresh(user)
    return _user_response(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_superadmin),
) -> dict[str, bool]:
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    deleted_at = datetime.now(timezone.utc)
    user.is_deleted = True
    user.deleted_at = deleted_at
    user.email = f"deleted+{user.id}@deleted.local"

    jobs_result = await db.execute(select(Job).where(Job.user_id == user.id, Job.status != SOFT_DELETED_STATUS))
    user_jobs = jobs_result.scalars().all()
    for job in user_jobs:
        job.status = SOFT_DELETED_STATUS
        asset_result = await db.execute(select(Asset).where(Asset.job_id == job.id, Asset.is_deleted.is_(False)))
        for asset in asset_result.scalars().all():
            asset.is_deleted = True

    await db.commit()
    return {"ok": True}


@router.get("/users/{user_id}/jobs", response_model=JobListResponse)
async def list_user_jobs(
    user_id: str,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> JobListResponse:
    user_result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    query = (
        select(Job)
        .where(Job.user_id == user_id, Job.status != SOFT_DELETED_STATUS)
        .order_by(Job.created_at.desc())
    )
    result = await db.execute(query)
    all_jobs = result.scalars().all()

    seen_batches: set[str] = set()
    grouped_items: list[JobSummaryResponse] = []

    for job in all_jobs:
        if job.batch_id:
            if job.batch_id in seen_batches:
                continue
            seen_batches.add(job.batch_id)

            batch_jobs = [item for item in all_jobs if item.batch_id == job.batch_id]
            total_jobs_in_batch = len(batch_jobs)
            any_failed = any(item.status == "failed" for item in batch_jobs)
            any_cancelled = any(item.status == CANCELLED_STATUS for item in batch_jobs)
            any_running = any(item.status not in TERMINAL_JOB_STATUSES for item in batch_jobs)
            batch_status = (
                "processing"
                if any_running
                else "failed"
                if any_failed
                else "cancelled"
                if any_cancelled
                else "completed"
            )

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


@router.get("/users/{user_id}/jobs/{job_id}", response_model=JobResponse)
async def get_user_job(
    user_id: str,
    job_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> JobResponse:
    user_result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == user_id, Job.status != SOFT_DELETED_STATUS))
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
        requested_image_count=job.requested_image_count,
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


@router.get("/users/{user_id}/jobs/{job_id}/logs", response_model=list[JobLogEntryResponse])
async def get_user_job_logs(
    user_id: str,
    job_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> list[JobLogEntryResponse]:
    user_result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == user_id, Job.status != SOFT_DELETED_STATUS))
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


@router.get("/prompts/defaults", response_model=list[PromptResponse])
async def get_default_prompts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> list[PromptResponse]:
    prompts = await list_default_prompts(db)
    return [
        PromptResponse(
            industry=prompt.industry,
            prompt_text=prompt.prompt_text,
            shot_prompts=prompt.shot_prompts_json or load_default_shot_prompts(prompt.industry),
        )
        for prompt in prompts
    ]


@router.get("/prompts/defaults/{industry}/categories", response_model=list[CategoryPromptResponse])
async def get_default_category_prompt_list(
    industry: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> list[CategoryPromptResponse]:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    prompts = await list_default_category_prompts(db, industry)
    return [
        _category_prompt_response(
            industry=prompt.industry,
            category_key=prompt.category_key,
            category_label=prompt.category_label,
            category_prompt_text=prompt.category_prompt_text,
            shot_prompts=prompt.shot_prompts_json,
        )
        for prompt in prompts
    ]


@router.put("/prompts/defaults/{industry}/categories/{category_key}", response_model=CategoryPromptResponse)
async def update_default_category_prompt_entry(
    industry: str,
    category_key: str,
    payload: CategoryPromptUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> CategoryPromptResponse:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    prompt = await set_default_category_prompt(
        db,
        industry,
        category_key,
        payload.category_label,
        payload.category_prompt_text,
        payload.shot_prompts,
    )
    return _category_prompt_response(
        industry=prompt.industry,
        category_key=prompt.category_key,
        category_label=prompt.category_label,
        category_prompt_text=prompt.category_prompt_text,
        shot_prompts=prompt.shot_prompts_json,
    )


@router.delete("/prompts/defaults/{industry}/categories/{category_key}")
async def remove_default_category_prompt_entry(
    industry: str,
    category_key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> dict[str, bool]:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    if category_key.strip().lower() == "default":
        raise HTTPException(status_code=400, detail="Default category cannot be deleted.")
    return {"ok": await delete_default_category_prompt(db, industry, category_key)}


@router.put("/prompts/defaults/{industry}", response_model=PromptResponse)
async def update_default_prompt(
    industry: str,
    payload: PromptUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> PromptResponse:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    prompt = await set_default_prompt(db, industry, payload.prompt_text, payload.shot_prompts)
    return PromptResponse(
        industry=prompt.industry,
        prompt_text=prompt.prompt_text,
        shot_prompts=prompt.shot_prompts_json or load_default_shot_prompts(prompt.industry),
    )


@router.delete("/prompts/defaults/{industry}")
async def remove_default_prompt_bundle(
    industry: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> dict[str, bool]:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    return {"ok": await delete_default_industry_prompt_bundle(db, industry)}


@router.get("/users/{user_id}/prompts/{industry}", response_model=PromptResponse)
async def get_prompt_override(
    user_id: str,
    industry: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> PromptResponse:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    override = await get_user_override(db, user_id, industry)
    if override is None:
        raise HTTPException(status_code=404, detail="Prompt override not found.")
    return PromptResponse(
        industry=override.industry,
        prompt_text=override.prompt_text,
        shot_prompts=override.shot_prompts_json or load_default_shot_prompts(override.industry),
    )


@router.put("/users/{user_id}/prompts/{industry}", response_model=PromptResponse)
async def update_prompt_override(
    user_id: str,
    industry: str,
    payload: PromptUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> PromptResponse:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    override = await set_user_override(db, user_id, industry, payload.prompt_text, payload.shot_prompts)
    return PromptResponse(
        industry=override.industry,
        prompt_text=override.prompt_text,
        shot_prompts=override.shot_prompts_json or load_default_shot_prompts(override.industry),
    )


@router.get("/users/{user_id}/prompts/{industry}/categories/{category_key}", response_model=CategoryPromptResponse)
async def get_user_category_prompt_override(
    user_id: str,
    industry: str,
    category_key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> CategoryPromptResponse:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    override = await get_user_category_override(db, user_id, industry, category_key)
    if override is None:
        default_prompt = await get_default_category_prompt(db, industry, category_key)
        if default_prompt is None:
            raise HTTPException(status_code=404, detail="Category prompt override not found.")
        return _category_prompt_response(
            industry=default_prompt.industry,
            category_key=default_prompt.category_key,
            category_label=default_prompt.category_label,
            category_prompt_text=default_prompt.category_prompt_text,
            shot_prompts=default_prompt.shot_prompts_json,
        )
    return _category_prompt_response(
        industry=override.industry,
        category_key=override.category_key,
        category_label=override.category_label,
        category_prompt_text=override.category_prompt_text,
        shot_prompts=override.shot_prompts_json,
    )


@router.put("/users/{user_id}/prompts/{industry}/categories/{category_key}", response_model=CategoryPromptResponse)
async def update_user_category_prompt_override(
    user_id: str,
    industry: str,
    category_key: str,
    payload: CategoryPromptUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> CategoryPromptResponse:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    override = await set_user_category_override(
        db,
        user_id,
        industry,
        category_key,
        payload.category_label,
        payload.category_prompt_text,
        payload.shot_prompts,
    )
    return _category_prompt_response(
        industry=override.industry,
        category_key=override.category_key,
        category_label=override.category_label,
        category_prompt_text=override.category_prompt_text,
        shot_prompts=override.shot_prompts_json,
    )


@router.delete("/users/{user_id}/prompts/{industry}/categories/{category_key}")
async def remove_user_category_prompt_override(
    user_id: str,
    industry: str,
    category_key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> dict[str, bool]:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    return {"ok": await delete_user_category_override(db, user_id, industry, category_key)}


@router.delete("/users/{user_id}/prompts/{industry}")
async def remove_prompt_override(
    user_id: str,
    industry: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> dict[str, bool]:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="Industry is required.")
    return {"ok": await delete_user_override(db, user_id, industry)}
