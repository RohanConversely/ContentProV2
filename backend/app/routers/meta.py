from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import INDUSTRY_IDS
from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.prompt_management import list_default_category_prompts, list_user_category_overrides

router = APIRouter(tags=["meta"])


@router.get("/audio/tracks")
async def get_audio_tracks() -> dict:
    return {
        "trending": [],
        "royalty_free": [],
    }


@router.get("/video/presets")
async def get_video_presets() -> dict:
    return {
        "durations": [
            {"value": 8, "label": "8 seconds", "desc": "Default video duration"},
        ],
        "styles": [],
    }


@router.get("/prompt-catalog")
async def get_prompt_catalog(
    industry: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    selected_industry = (industry or current_user.industry or "").strip().lower() or current_user.industry
    if selected_industry not in INDUSTRY_IDS:
        selected_industry = current_user.industry

    defaults = await list_default_category_prompts(db, selected_industry)
    overrides = await list_user_category_overrides(db, current_user.id, selected_industry)
    override_map = {override.category_key: override for override in overrides}

    categories = []
    for default in defaults:
        override = override_map.get(default.category_key)
        categories.append(
            {
                "category_key": default.category_key,
                "category_label": override.category_label if override is not None else default.category_label,
                "category_prompt_text": (
                    override.category_prompt_text if override is not None else default.category_prompt_text
                ),
                "shot_prompts": (
                    override.shot_prompts_json
                    if override is not None and override.shot_prompts_json is not None
                    else default.shot_prompts_json
                )
                or [],
            }
        )

    for override in overrides:
        if override.category_key in {item["category_key"] for item in categories}:
            continue
        categories.append(
            {
                "category_key": override.category_key,
                "category_label": override.category_label,
                "category_prompt_text": override.category_prompt_text,
                "shot_prompts": override.shot_prompts_json or [],
            }
        )

    categories.sort(key=lambda item: str(item.get("category_label") or item.get("category_key") or ""))
    return {
        "industry": selected_industry,
        "categories": categories,
    }
