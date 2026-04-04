"""user roles, industries, and prompt overrides

Revision ID: 20260331_0004
Revises: 20260316_0003
Create Date: 2026-03-31 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260331_0004"
down_revision: str | None = "20260316_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(length=32), nullable=False, server_default="user"))
    op.add_column("users", sa.Column("industry", sa.String(length=64), nullable=False, server_default="jewelry"))

    op.create_table(
        "industry_prompts",
        sa.Column("industry", sa.String(length=64), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("industry"),
    )

    op.create_table(
        "user_prompt_overrides",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("industry", sa.String(length=64), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "industry", name="uq_user_prompt_override_user_industry"),
    )
    op.create_index("ix_user_prompt_overrides_user_id", "user_prompt_overrides", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_prompt_overrides_user_id", table_name="user_prompt_overrides")
    op.drop_table("user_prompt_overrides")
    op.drop_table("industry_prompts")
    op.drop_column("users", "industry")
    op.drop_column("users", "role")
