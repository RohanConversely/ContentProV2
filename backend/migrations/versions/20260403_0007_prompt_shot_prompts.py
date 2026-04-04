"""add prompt shot prompt json columns

Revision ID: 20260403_0007
Revises: 20260402_0006
Create Date: 2026-04-03 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260403_0007"
down_revision: str | Sequence[str] | None = "20260402_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("industry_prompts", sa.Column("shot_prompts_json", sa.JSON(), nullable=True))
    op.add_column("user_prompt_overrides", sa.Column("shot_prompts_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_prompt_overrides", "shot_prompts_json")
    op.drop_column("industry_prompts", "shot_prompts_json")
