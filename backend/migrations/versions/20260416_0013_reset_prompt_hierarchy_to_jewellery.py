"""reset prompt hierarchy to jewellery baseline

Revision ID: 20260416_0013
Revises: 20260413_0012
Create Date: 2026-04-16 00:00:00.000000
"""

from collections.abc import Sequence
import json
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


revision: str = "20260416_0013"
down_revision: str | Sequence[str] | None = "20260413_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _shot_prompts() -> str:
    payload = [
        {"key": "hero", "label": "Hero", "prompt": "-"},
        {"key": "lifestyle", "label": "Lifestyle", "prompt": "-"},
        {"key": "wearable", "label": "Wearable", "prompt": "-"},
        {"key": "wearable_ethnic", "label": "Wearable Ethnic", "prompt": "-"},
        {"key": "jewellery_box", "label": "Jewellery Box", "prompt": "-"},
        {"key": "close_detail", "label": "Close Detail", "prompt": "-"},
    ]
    return json.dumps(payload)


def upgrade() -> None:
    bind = op.get_bind()
    now = _utcnow()
    baseline_industry = "jewelry"
    baseline_shots = _shot_prompts()

    bind.execute(sa.text("UPDATE users SET industry = :industry WHERE industry IS NULL OR industry <> :industry"), {"industry": baseline_industry})

    bind.execute(sa.text("DELETE FROM user_category_prompt_overrides"))
    bind.execute(sa.text("DELETE FROM user_prompt_overrides"))

    bind.execute(sa.text("DELETE FROM industry_category_prompts WHERE industry <> :industry"), {"industry": baseline_industry})
    bind.execute(sa.text("DELETE FROM industry_prompts WHERE industry <> :industry"), {"industry": baseline_industry})

    existing_prompt = bind.execute(
        sa.text("SELECT industry FROM industry_prompts WHERE industry = :industry"),
        {"industry": baseline_industry},
    ).fetchone()
    if existing_prompt is None:
        bind.execute(
            sa.text(
                """
                INSERT INTO industry_prompts (industry, prompt_text, shot_prompts_json, created_at, updated_at)
                VALUES (:industry, :prompt_text, CAST(:shot_prompts_json AS JSON), :created_at, :updated_at)
                """
            ),
            {
                "industry": baseline_industry,
                "prompt_text": "-",
                "shot_prompts_json": baseline_shots,
                "created_at": now,
                "updated_at": now,
            },
        )
    else:
        bind.execute(
            sa.text(
                """
                UPDATE industry_prompts
                SET prompt_text = :prompt_text,
                    shot_prompts_json = CAST(:shot_prompts_json AS JSON),
                    updated_at = :updated_at
                WHERE industry = :industry
                """
            ),
            {
                "industry": baseline_industry,
                "prompt_text": "-",
                "shot_prompts_json": baseline_shots,
                "updated_at": now,
            },
        )

    bind.execute(sa.text("DELETE FROM industry_category_prompts WHERE industry = :industry"), {"industry": baseline_industry})
    bind.execute(
        sa.text(
            """
            INSERT INTO industry_category_prompts
            (id, industry, category_key, category_label, category_prompt_text, shot_prompts_json, is_active, created_at, updated_at)
            VALUES
            (:id, :industry, :category_key, :category_label, :category_prompt_text, CAST(:shot_prompts_json AS JSON), :is_active, :created_at, :updated_at)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "industry": baseline_industry,
            "category_key": "default",
            "category_label": "Default",
            "category_prompt_text": "-",
            "shot_prompts_json": baseline_shots,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
    )


def downgrade() -> None:
    pass
