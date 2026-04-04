from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import INDUSTRY_IDS, SUPERADMIN_ROLE
from app.database import get_db
from app.models.job import Job
from app.models.user import User
from app.models.user_prompt_override import UserPromptOverride
from app.routers.auth import get_current_user
from app.schemas.admin import (
    AdminCreateUserRequest,
    AdminUpdateUserRequest,
    AdminUserResponse,
    PromptResponse,
    PromptUpdateRequest,
)
from app.services.auth import get_user_by_email, hash_password
from app.services.prompt_management import (
    delete_user_override,
    get_user_override,
    load_default_shot_prompts,
    list_default_prompts,
    set_default_prompt,
    set_user_override,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_response(user: User) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        industry=user.industry,
        default_image_model=user.default_image_model or "reve",
        plan=user.plan,
        created_at=user.created_at,
    )


async def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != SUPERADMIN_ROLE:
        raise HTTPException(status_code=403, detail="Superadmin access required.")
    return current_user


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> list[AdminUserResponse]:
    result = await db.execute(select(User).order_by(User.created_at.asc()))
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
    user = await db.get(User, user_id)
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
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    job_count = await db.scalar(select(func.count()).select_from(Job).where(Job.user_id == user.id))
    if job_count:
        raise HTTPException(status_code=400, detail="Cannot delete a user who already has jobs.")
    override_result = await db.execute(select(UserPromptOverride).where(UserPromptOverride.user_id == user.id))
    for override in override_result.scalars().all():
        await db.delete(override)
    await db.delete(user)
    await db.commit()
    return {"ok": True}


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


@router.put("/prompts/defaults/{industry}", response_model=PromptResponse)
async def update_default_prompt(
    industry: str,
    payload: PromptUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> PromptResponse:
    if industry not in INDUSTRY_IDS:
        raise HTTPException(status_code=404, detail="Industry not found.")
    prompt = await set_default_prompt(db, industry, payload.prompt_text, payload.shot_prompts)
    return PromptResponse(
        industry=prompt.industry,
        prompt_text=prompt.prompt_text,
        shot_prompts=prompt.shot_prompts_json or load_default_shot_prompts(prompt.industry),
    )


@router.get("/users/{user_id}/prompts/{industry}", response_model=PromptResponse)
async def get_prompt_override(
    user_id: str,
    industry: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> PromptResponse:
    if industry not in INDUSTRY_IDS:
        raise HTTPException(status_code=404, detail="Industry not found.")
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
    if industry not in INDUSTRY_IDS:
        raise HTTPException(status_code=404, detail="Industry not found.")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    override = await set_user_override(db, user_id, industry, payload.prompt_text, payload.shot_prompts)
    return PromptResponse(
        industry=override.industry,
        prompt_text=override.prompt_text,
        shot_prompts=override.shot_prompts_json or load_default_shot_prompts(override.industry),
    )


@router.delete("/users/{user_id}/prompts/{industry}")
async def remove_prompt_override(
    user_id: str,
    industry: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
) -> dict[str, bool]:
    if industry not in INDUSTRY_IDS:
        raise HTTPException(status_code=404, detail="Industry not found.")
    return {"ok": await delete_user_override(db, user_id, industry)}
