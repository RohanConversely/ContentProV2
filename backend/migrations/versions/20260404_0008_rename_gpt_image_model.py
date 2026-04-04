"""rename gpt image model key to gpt-image-1.5

Revision ID: 20260404_0008
Revises: 20260403_0007
Create Date: 2026-04-04 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260404_0008"
down_revision: str | Sequence[str] | None = "20260403_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE users SET default_image_model = 'gpt-image-1.5' WHERE default_image_model = 'gpt-image-1'")
    op.execute("UPDATE jobs SET image_model = 'gpt-image-1.5' WHERE image_model = 'gpt-image-1'")


def downgrade() -> None:
    op.execute("UPDATE users SET default_image_model = 'gpt-image-1' WHERE default_image_model = 'gpt-image-1.5'")
    op.execute("UPDATE jobs SET image_model = 'gpt-image-1' WHERE image_model = 'gpt-image-1.5'")
