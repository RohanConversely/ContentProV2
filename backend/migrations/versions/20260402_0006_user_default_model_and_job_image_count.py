"""add user default image model and job requested image count

Revision ID: 20260402_0006
Revises: 20260401_0005
Create Date: 2026-04-02 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260402_0006"
down_revision: str | Sequence[str] | None = "20260401_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("default_image_model", sa.String(length=50), nullable=True))
    op.execute("UPDATE users SET default_image_model = 'reve' WHERE default_image_model IS NULL")
    op.alter_column("users", "default_image_model", nullable=False)

    op.add_column("jobs", sa.Column("requested_image_count", sa.Integer(), nullable=True))
    op.execute("UPDATE jobs SET requested_image_count = 4 WHERE requested_image_count IS NULL")
    op.alter_column("jobs", "requested_image_count", nullable=False)


def downgrade() -> None:
    op.drop_column("jobs", "requested_image_count")
    op.drop_column("users", "default_image_model")
