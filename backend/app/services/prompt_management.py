from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import DEFAULT_INDUSTRY, INDUSTRY_IDS
from app.models.industry_category_prompt import IndustryCategoryPrompt
from app.models.industry_prompt import IndustryPrompt
from app.models.user import User
from app.models.user_category_prompt_override import UserCategoryPromptOverride
from app.models.user_prompt_override import UserPromptOverride

PROMPTS_ROOT = Path(__file__).resolve().parents[2] / "pipeline" / "prompts"

DEFAULT_PROMPT_FILES = {
    "fashion": "industry_fashion.txt",
    "electronics": "industry_electronics.txt",
    "beauty": "industry_beauty.txt",
    "food": "industry_food.txt",
    "home": "industry_home.txt",
    "sports": "industry_sports.txt",
    "jewelry": "industry_jewelry.txt",
    "health": "industry_health.txt",
    "pet_accessories": "industry_pet_accessories.txt",
}

DEFAULT_SHOT_PROMPT_FILES = {
    "fashion": "industry_fashion_shots.json",
    "electronics": "industry_electronics_shots.json",
    "beauty": "industry_beauty_shots.json",
    "food": "industry_food_shots.json",
    "home": "industry_home_shots.json",
    "sports": "industry_sports_shots.json",
    "jewelry": "industry_jewelry_shots.json",
    "health": "industry_health_shots.json",
    "pet_accessories": "industry_pet_accessories_shots.json",
}


@dataclass
class PromptBundle:
    industry: str
    category_key: str
    category_label: str
    industry_prompt_text: str
    category_prompt_text: str
    prompt_text: str
    shot_prompts: list[dict[str, str]]


@dataclass
class CategoryPromptBundle:
    industry: str
    category_key: str
    category_label: str
    category_prompt_text: str
    shot_prompts: list[dict[str, str]]


def default_prompt_file_for_industry(industry: str) -> str:
    return DEFAULT_PROMPT_FILES.get(industry, DEFAULT_PROMPT_FILES[DEFAULT_INDUSTRY])


def default_shot_prompt_file_for_industry(industry: str) -> str:
    return DEFAULT_SHOT_PROMPT_FILES.get(industry, DEFAULT_SHOT_PROMPT_FILES[DEFAULT_INDUSTRY])


def load_default_prompt_text(industry: str) -> str:
    path = PROMPTS_ROOT / default_prompt_file_for_industry(industry)
    return path.read_text(encoding="utf-8").strip()


def _normalize_shot_prompts(raw_value: Any) -> list[dict[str, str]]:
    if not isinstance(raw_value, list):
        return []

    normalized: list[dict[str, str]] = []
    for index, entry in enumerate(raw_value, start=1):
        if not isinstance(entry, dict):
            continue
        key = str(entry.get("key") or f"shot_{index}").strip().lower()
        label = str(entry.get("label") or key.replace("_", " ").title()).strip()
        prompt = str(entry.get("prompt") or "").strip()
        if not prompt:
            continue
        normalized.append({"key": key, "label": label, "prompt": prompt})
    return normalized


def _normalize_category_key(value: str) -> str:
    raw = (value or "").strip().lower().replace(" ", "_").replace("-", "_")
    collapsed = "_".join(part for part in raw.split("_") if part)
    return collapsed or "default"


def _build_combined_prompt(industry_prompt_text: str, category_prompt_text: str) -> str:
    industry_part = industry_prompt_text.strip()
    category_part = category_prompt_text.strip()
    if not category_part:
        return industry_part
    return f"{industry_part}\n\nCategory instructions:\n{category_part}"


def _filter_shot_prompts(shot_prompts: list[dict[str, str]], selected_shot_keys: list[str] | None) -> list[dict[str, str]]:
    if not selected_shot_keys:
        return shot_prompts
    normalized_keys = [str(key).strip().lower() for key in selected_shot_keys if str(key).strip()]
    if not normalized_keys:
        return shot_prompts
    prompts_by_key = {str(entry.get("key", "")).strip().lower(): entry for entry in shot_prompts}
    selected: list[dict[str, str]] = []
    for key in normalized_keys:
        matched = prompts_by_key.get(key)
        if matched:
            selected.append(matched)
    return selected or shot_prompts


def load_default_shot_prompts(industry: str) -> list[dict[str, str]]:
    path = PROMPTS_ROOT / default_shot_prompt_file_for_industry(industry)
    if not path.exists():
        return []
    return _normalize_shot_prompts(json.loads(path.read_text(encoding="utf-8")))


async def ensure_default_industry_prompts(db: AsyncSession) -> None:
    for industry in INDUSTRY_IDS:
        prompt = await db.get(IndustryPrompt, industry)
        default_prompt_text = load_default_prompt_text(industry)
        default_shot_prompts = load_default_shot_prompts(industry)
        if prompt is None:
            db.add(
                IndustryPrompt(
                    industry=industry,
                    prompt_text=default_prompt_text,
                    shot_prompts_json=default_shot_prompts,
                )
            )
            continue

        updated = False
        if not prompt.prompt_text:
            prompt.prompt_text = default_prompt_text
            updated = True
        if not prompt.shot_prompts_json:
            prompt.shot_prompts_json = default_shot_prompts
            updated = True
        if updated:
            db.add(prompt)

        category_result = await db.execute(
            select(IndustryCategoryPrompt).where(
                IndustryCategoryPrompt.industry == industry,
                IndustryCategoryPrompt.category_key == "default",
            )
        )
        default_category = category_result.scalar_one_or_none()
        if default_category is None:
            db.add(
                IndustryCategoryPrompt(
                    id=str(uuid.uuid4()),
                    industry=industry,
                    category_key="default",
                    category_label="Default",
                    category_prompt_text="Use a balanced visual treatment suitable for this category while preserving product accuracy.",
                    shot_prompts_json=default_shot_prompts,
                    is_active=True,
                )
            )
    await db.commit()


async def list_default_category_prompts(db: AsyncSession, industry: str) -> list[IndustryCategoryPrompt]:
    result = await db.execute(
        select(IndustryCategoryPrompt)
        .where(IndustryCategoryPrompt.industry == industry)
        .order_by(IndustryCategoryPrompt.category_label.asc())
    )
    return list(result.scalars().all())


async def get_default_category_prompt(db: AsyncSession, industry: str, category_key: str) -> IndustryCategoryPrompt | None:
    result = await db.execute(
        select(IndustryCategoryPrompt).where(
            IndustryCategoryPrompt.industry == industry,
            IndustryCategoryPrompt.category_key == _normalize_category_key(category_key),
        )
    )
    return result.scalar_one_or_none()


async def set_default_category_prompt(
    db: AsyncSession,
    industry: str,
    category_key: str,
    category_label: str,
    category_prompt_text: str,
    shot_prompts: list[dict[str, str]] | None = None,
) -> IndustryCategoryPrompt:
    normalized_key = _normalize_category_key(category_key)
    normalized_shot_prompts = _normalize_shot_prompts(shot_prompts) if shot_prompts is not None else None
    prompt = await get_default_category_prompt(db, industry, normalized_key)
    if prompt is None:
        prompt = IndustryCategoryPrompt(
            id=str(uuid.uuid4()),
            industry=industry,
            category_key=normalized_key,
            category_label=category_label.strip() or normalized_key.replace("_", " ").title(),
            category_prompt_text=category_prompt_text,
            shot_prompts_json=normalized_shot_prompts or [],
            is_active=True,
        )
        db.add(prompt)
    else:
        prompt.category_label = category_label.strip() or prompt.category_label
        prompt.category_prompt_text = category_prompt_text
        if normalized_shot_prompts is not None:
            prompt.shot_prompts_json = normalized_shot_prompts
    await db.commit()
    await db.refresh(prompt)
    return prompt


async def delete_default_category_prompt(db: AsyncSession, industry: str, category_key: str) -> bool:
    prompt = await get_default_category_prompt(db, industry, category_key)
    if prompt is None:
        return False
    await db.delete(prompt)
    await db.commit()
    return True


async def get_user_category_override(
    db: AsyncSession,
    user_id: str,
    industry: str,
    category_key: str,
) -> UserCategoryPromptOverride | None:
    result = await db.execute(
        select(UserCategoryPromptOverride).where(
            UserCategoryPromptOverride.user_id == user_id,
            UserCategoryPromptOverride.industry == industry,
            UserCategoryPromptOverride.category_key == _normalize_category_key(category_key),
        )
    )
    return result.scalar_one_or_none()


async def list_user_category_overrides(
    db: AsyncSession,
    user_id: str,
    industry: str,
) -> list[UserCategoryPromptOverride]:
    result = await db.execute(
        select(UserCategoryPromptOverride)
        .where(
            UserCategoryPromptOverride.user_id == user_id,
            UserCategoryPromptOverride.industry == industry,
        )
        .order_by(UserCategoryPromptOverride.category_label.asc())
    )
    return list(result.scalars().all())


async def set_user_category_override(
    db: AsyncSession,
    user_id: str,
    industry: str,
    category_key: str,
    category_label: str,
    category_prompt_text: str,
    shot_prompts: list[dict[str, str]] | None = None,
) -> UserCategoryPromptOverride:
    normalized_key = _normalize_category_key(category_key)
    normalized_shot_prompts = _normalize_shot_prompts(shot_prompts) if shot_prompts is not None else None
    override = await get_user_category_override(db, user_id, industry, normalized_key)
    if override is None:
        override = UserCategoryPromptOverride(
            user_id=user_id,
            industry=industry,
            category_key=normalized_key,
            category_label=category_label.strip() or normalized_key.replace("_", " ").title(),
            category_prompt_text=category_prompt_text,
            shot_prompts_json=normalized_shot_prompts or [],
        )
        db.add(override)
    else:
        override.category_label = category_label.strip() or override.category_label
        override.category_prompt_text = category_prompt_text
        if normalized_shot_prompts is not None:
            override.shot_prompts_json = normalized_shot_prompts
    await db.commit()
    await db.refresh(override)
    return override


async def delete_user_category_override(
    db: AsyncSession,
    user_id: str,
    industry: str,
    category_key: str,
) -> bool:
    override = await get_user_category_override(db, user_id, industry, category_key)
    if override is None:
        return False
    await db.delete(override)
    await db.commit()
    return True


async def get_effective_prompt_bundle(
    db: AsyncSession,
    user: User,
    industry: str | None = None,
    category: str | None = None,
    selected_shot_keys: list[str] | None = None,
) -> PromptBundle:
    selected_industry = industry or user.industry or DEFAULT_INDUSTRY
    selected_category = _normalize_category_key(category or "default")
    override_result = await db.execute(
        select(UserPromptOverride).where(
            UserPromptOverride.user_id == user.id,
            UserPromptOverride.industry == selected_industry,
        )
    )
    override = override_result.scalar_one_or_none()
    default_prompt = await db.get(IndustryPrompt, selected_industry)

    prompt_text = (
        override.prompt_text
        if override is not None and override.prompt_text
        else default_prompt.prompt_text
        if default_prompt is not None and default_prompt.prompt_text
        else load_default_prompt_text(selected_industry)
    )
    industry_level_shot_prompts = (
        _normalize_shot_prompts(override.shot_prompts_json)
        if override is not None and override.shot_prompts_json
        else _normalize_shot_prompts(default_prompt.shot_prompts_json)
        if default_prompt is not None and default_prompt.shot_prompts_json
        else load_default_shot_prompts(selected_industry)
    )

    category_override_result = await db.execute(
        select(UserCategoryPromptOverride).where(
            UserCategoryPromptOverride.user_id == user.id,
            UserCategoryPromptOverride.industry == selected_industry,
            UserCategoryPromptOverride.category_key == selected_category,
        )
    )
    category_override = category_override_result.scalar_one_or_none()

    category_default_result = await db.execute(
        select(IndustryCategoryPrompt).where(
            IndustryCategoryPrompt.industry == selected_industry,
            IndustryCategoryPrompt.category_key == selected_category,
        )
    )
    category_default = category_default_result.scalar_one_or_none()

    if category_default is None and selected_category != "default":
        fallback_result = await db.execute(
            select(IndustryCategoryPrompt).where(
                IndustryCategoryPrompt.industry == selected_industry,
                IndustryCategoryPrompt.category_key == "default",
            )
        )
        category_default = fallback_result.scalar_one_or_none()
        selected_category = "default"

    category_label = (
        category_override.category_label
        if category_override is not None and category_override.category_label
        else category_default.category_label
        if category_default is not None and category_default.category_label
        else selected_category.replace("_", " ").title()
    )
    category_prompt_text = (
        category_override.category_prompt_text
        if category_override is not None and category_override.category_prompt_text
        else category_default.category_prompt_text
        if category_default is not None and category_default.category_prompt_text
        else "Use a balanced visual treatment suitable for this category while preserving product accuracy."
    )
    category_shot_prompts = (
        _normalize_shot_prompts(category_override.shot_prompts_json)
        if category_override is not None and category_override.shot_prompts_json
        else _normalize_shot_prompts(category_default.shot_prompts_json)
        if category_default is not None and category_default.shot_prompts_json
        else []
    )

    effective_shot_prompts = category_shot_prompts or industry_level_shot_prompts
    effective_shot_prompts = _filter_shot_prompts(effective_shot_prompts, selected_shot_keys)

    return PromptBundle(
        industry=selected_industry,
        category_key=selected_category,
        category_label=category_label,
        industry_prompt_text=prompt_text,
        category_prompt_text=category_prompt_text,
        prompt_text=_build_combined_prompt(prompt_text, category_prompt_text),
        shot_prompts=effective_shot_prompts,
    )


async def get_effective_prompt_text(db: AsyncSession, user: User, industry: str | None = None) -> str:
    return (await get_effective_prompt_bundle(db, user, industry)).prompt_text


async def list_default_prompts(db: AsyncSession) -> list[IndustryPrompt]:
    result = await db.execute(select(IndustryPrompt).order_by(IndustryPrompt.industry.asc()))
    return list(result.scalars().all())


async def set_default_prompt(
    db: AsyncSession,
    industry: str,
    prompt_text: str,
    shot_prompts: list[dict[str, str]] | None = None,
) -> IndustryPrompt:
    normalized_shot_prompts = _normalize_shot_prompts(shot_prompts) if shot_prompts is not None else None
    prompt = await db.get(IndustryPrompt, industry)
    if prompt is None:
        prompt = IndustryPrompt(
            industry=industry,
            prompt_text=prompt_text,
            shot_prompts_json=normalized_shot_prompts if normalized_shot_prompts is not None else load_default_shot_prompts(industry),
        )
        db.add(prompt)
    else:
        prompt.prompt_text = prompt_text
        if normalized_shot_prompts is not None:
            prompt.shot_prompts_json = normalized_shot_prompts
    await db.commit()
    await db.refresh(prompt)
    return prompt


async def get_user_override(db: AsyncSession, user_id: str, industry: str) -> UserPromptOverride | None:
    result = await db.execute(
        select(UserPromptOverride).where(
            UserPromptOverride.user_id == user_id,
            UserPromptOverride.industry == industry,
        )
    )
    return result.scalar_one_or_none()


async def set_user_override(
    db: AsyncSession,
    user_id: str,
    industry: str,
    prompt_text: str,
    shot_prompts: list[dict[str, str]] | None = None,
) -> UserPromptOverride:
    normalized_shot_prompts = _normalize_shot_prompts(shot_prompts) if shot_prompts is not None else None
    override = await get_user_override(db, user_id, industry)
    if override is None:
        override = UserPromptOverride(
            user_id=user_id,
            industry=industry,
            prompt_text=prompt_text,
            shot_prompts_json=normalized_shot_prompts,
        )
        db.add(override)
    else:
        override.prompt_text = prompt_text
        if normalized_shot_prompts is not None:
            override.shot_prompts_json = normalized_shot_prompts
    await db.commit()
    await db.refresh(override)
    return override


async def delete_user_override(db: AsyncSession, user_id: str, industry: str) -> bool:
    override = await get_user_override(db, user_id, industry)
    if override is None:
        return False
    await db.delete(override)
    await db.commit()
    return True
