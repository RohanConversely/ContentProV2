from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import DEFAULT_INDUSTRY, INDUSTRY_IDS
from app.models.industry_prompt import IndustryPrompt
from app.models.user import User
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
}


@dataclass
class PromptBundle:
    prompt_text: str
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
    await db.commit()


async def get_effective_prompt_bundle(
    db: AsyncSession,
    user: User,
    industry: str | None = None,
) -> PromptBundle:
    selected_industry = industry or user.industry or DEFAULT_INDUSTRY
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
    shot_prompts = (
        _normalize_shot_prompts(override.shot_prompts_json)
        if override is not None and override.shot_prompts_json
        else _normalize_shot_prompts(default_prompt.shot_prompts_json)
        if default_prompt is not None and default_prompt.shot_prompts_json
        else load_default_shot_prompts(selected_industry)
    )
    return PromptBundle(prompt_text=prompt_text, shot_prompts=shot_prompts)


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
