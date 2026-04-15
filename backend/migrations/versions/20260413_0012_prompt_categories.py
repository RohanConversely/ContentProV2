"""add prompt category tables

Revision ID: 20260413_0012
Revises: 20260406_0011
Create Date: 2026-04-13 12:00:00.000000
"""

from collections.abc import Sequence
import json
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


revision: str = "20260413_0012"
down_revision: str | Sequence[str] | None = "20260406_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def upgrade() -> None:
    op.create_table(
        "industry_category_prompts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("industry", sa.String(length=64), nullable=False),
        sa.Column("category_key", sa.String(length=128), nullable=False),
        sa.Column("category_label", sa.String(length=255), nullable=False),
        sa.Column("category_prompt_text", sa.Text(), nullable=False),
        sa.Column("shot_prompts_json", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("industry", "category_key", name="uq_industry_category_prompt"),
    )
    op.create_index("ix_industry_category_prompts_industry", "industry_category_prompts", ["industry"], unique=False)

    op.create_table(
        "user_category_prompt_overrides",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("industry", sa.String(length=64), nullable=False),
        sa.Column("category_key", sa.String(length=128), nullable=False),
        sa.Column("category_label", sa.String(length=255), nullable=False),
        sa.Column("category_prompt_text", sa.Text(), nullable=False),
        sa.Column("shot_prompts_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "industry",
            "category_key",
            name="uq_user_category_prompt_override_user_industry_category",
        ),
    )
    op.create_index("ix_user_category_prompt_overrides_user_id", "user_category_prompt_overrides", ["user_id"], unique=False)
    op.create_index("ix_user_category_prompt_overrides_industry", "user_category_prompt_overrides", ["industry"], unique=False)

    bind = op.get_bind()
    prompt_rows = bind.execute(sa.text("SELECT industry, shot_prompts_json FROM industry_prompts")).fetchall()
    now = _utcnow()
    for row in prompt_rows:
        shot_prompts_raw = row[1]
        if isinstance(shot_prompts_raw, str):
            try:
                shot_prompts_raw = json.loads(shot_prompts_raw)
            except Exception:
                shot_prompts_raw = None
        if shot_prompts_raw is None:
            shot_prompts_value = None
        elif isinstance(shot_prompts_raw, str):
            shot_prompts_value = shot_prompts_raw
        else:
            shot_prompts_value = json.dumps(shot_prompts_raw)
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
                "industry": row[0],
                "category_key": "default",
                "category_label": "Default",
                "category_prompt_text": "Use a balanced visual treatment suitable for this category while preserving product accuracy.",
                "shot_prompts_json": shot_prompts_value,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )


def downgrade() -> None:
    op.drop_index("ix_user_category_prompt_overrides_industry", table_name="user_category_prompt_overrides")
    op.drop_index("ix_user_category_prompt_overrides_user_id", table_name="user_category_prompt_overrides")
    op.drop_table("user_category_prompt_overrides")
    op.drop_index("ix_industry_category_prompts_industry", table_name="industry_category_prompts")
    op.drop_table("industry_category_prompts")
