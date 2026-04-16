"""enforce jewellery baseline default shots

Revision ID: 20260416_0014
Revises: 20260416_0013
Create Date: 2026-04-16 00:20:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260416_0014"
down_revision: str | Sequence[str] | None = "20260416_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


BASELINE_INDUSTRY = "jewelry"
BASELINE_SHOTS = [
    {"key": "hero", "label": "Hero", "prompt": "-"},
    {"key": "lifestyle", "label": "Lifestyle", "prompt": "-"},
    {"key": "wearable", "label": "Wearable", "prompt": "-"},
    {"key": "wearable_ethnic", "label": "Wearable Ethnic", "prompt": "-"},
    {"key": "jewellery_box", "label": "Jewellery Box", "prompt": "-"},
    {"key": "close_detail", "label": "Close Detail", "prompt": "-"},
]


def upgrade() -> None:
    bind = op.get_bind()

    industry_prompts = sa.table(
        "industry_prompts",
        sa.column("industry", sa.String(length=64)),
        sa.column("prompt_text", sa.Text()),
        sa.column("shot_prompts_json", sa.JSON()),
    )

    industry_category_prompts = sa.table(
        "industry_category_prompts",
        sa.column("industry", sa.String(length=64)),
        sa.column("category_key", sa.String(length=128)),
        sa.column("category_label", sa.String(length=255)),
        sa.column("category_prompt_text", sa.Text()),
        sa.column("shot_prompts_json", sa.JSON()),
    )

    bind.execute(
        sa.update(industry_prompts)
        .where(industry_prompts.c.industry == BASELINE_INDUSTRY)
        .values(prompt_text="-", shot_prompts_json=BASELINE_SHOTS)
    )

    bind.execute(
        sa.update(industry_category_prompts)
        .where(
            industry_category_prompts.c.industry == BASELINE_INDUSTRY,
            industry_category_prompts.c.category_key == "default",
        )
        .values(
            category_label="Default",
            category_prompt_text="-",
            shot_prompts_json=BASELINE_SHOTS,
        )
    )


def downgrade() -> None:
    pass
