from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants import DEFAULT_INDUSTRY, SUPERADMIN_ROLE
from app.models.job import Job
from app.models.user import User
from app.models.user_prompt_override import UserPromptOverride
from app.services.auth import get_user_by_email, hash_password, verify_password
from app.services.prompt_management import ensure_default_industry_prompts

settings = get_settings()
LEGACY_SUPERADMIN_EMAIL = "superadmin@contentpro.local"


async def _merge_legacy_superadmin(
    db: AsyncSession,
    *,
    target: User,
    legacy: User,
) -> None:
    job_result = await db.execute(select(Job).where(Job.user_id == legacy.id))
    for job in job_result.scalars().all():
        job.user_id = target.id

    override_result = await db.execute(select(UserPromptOverride).where(UserPromptOverride.user_id == legacy.id))
    for override in override_result.scalars().all():
        existing_override_result = await db.execute(
            select(UserPromptOverride).where(
                UserPromptOverride.user_id == target.id,
                UserPromptOverride.industry == override.industry,
            )
        )
        existing_override = existing_override_result.scalar_one_or_none()
        if existing_override is None:
            override.user_id = target.id
        else:
            await db.delete(override)

    await db.delete(legacy)


async def ensure_bootstrap_data(db: AsyncSession) -> None:
    await ensure_default_industry_prompts(db)
    existing = await get_user_by_email(db, settings.superadmin_email)
    legacy = await get_user_by_email(db, LEGACY_SUPERADMIN_EMAIL)
    if existing is not None and legacy is not None and legacy.id != existing.id:
        await _merge_legacy_superadmin(db, target=existing, legacy=legacy)
        await db.commit()
        legacy = None
    if existing is None and legacy is not None:
        existing = legacy
        existing.email = settings.superadmin_email
        existing.hashed_password = hash_password(settings.superadmin_password)
        existing.display_name = settings.superadmin_display_name
        existing.role = SUPERADMIN_ROLE
        existing.industry = DEFAULT_INDUSTRY
        existing.default_image_model = "reve"
        existing.plan = "pro"
        await db.commit()
        await db.refresh(existing)
        return

    if existing is None:
        db.add(
            User(
                email=settings.superadmin_email,
                hashed_password=hash_password(settings.superadmin_password),
                display_name=settings.superadmin_display_name,
                role=SUPERADMIN_ROLE,
                industry=DEFAULT_INDUSTRY,
                default_image_model="gpt-batch-api",
                default_batch_image_model="gpt-batch-api",
                plan="pro",
            )
        )
        await db.commit()
        return

    updated = False
    if existing.email != settings.superadmin_email:
        existing.email = settings.superadmin_email
        updated = True
    if not verify_password(settings.superadmin_password, existing.hashed_password):
        existing.hashed_password = hash_password(settings.superadmin_password)
        updated = True
    if existing.display_name != settings.superadmin_display_name:
        existing.display_name = settings.superadmin_display_name
        updated = True
    if existing.role != SUPERADMIN_ROLE:
        existing.role = SUPERADMIN_ROLE
        updated = True
    if not existing.industry:
        existing.industry = DEFAULT_INDUSTRY
        updated = True
    if not existing.default_image_model:
        existing.default_image_model = "reve"
        updated = True
    if not existing.plan:
        existing.plan = "pro"
        updated = True
    if updated:
        await db.commit()
