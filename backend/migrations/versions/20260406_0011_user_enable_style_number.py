"""add user style number entitlement

Revision ID: 20260406_0011
Revises: 20260406_0010
Create Date: 2026-04-06 19:20:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260406_0011"
down_revision = "20260406_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    if "enable_style_number" not in existing_columns:
        op.add_column(
            "users",
            sa.Column(
                "enable_style_number",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    if "enable_style_number" in existing_columns:
        op.drop_column("users", "enable_style_number")
