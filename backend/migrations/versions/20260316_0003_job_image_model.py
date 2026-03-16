"""job image model

Revision ID: 20260316_0003
Revises: 20260312_0002
Create Date: 2026-03-16 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260316_0003"
down_revision: str | None = "20260312_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("image_model", sa.String(length=50), nullable=False, server_default="flux-2-pro"),
    )
    op.execute("UPDATE jobs SET image_model='flux-2-pro' WHERE image_model IS NULL")
    op.alter_column("jobs", "image_model", server_default=None)


def downgrade() -> None:
    op.drop_column("jobs", "image_model")
