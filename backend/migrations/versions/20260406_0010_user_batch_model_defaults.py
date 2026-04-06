"""add default batch model for users

Revision ID: 20260406_0010
Revises: 20260406_0009
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260406_0010"
down_revision = "20260406_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "default_batch_image_model" not in user_columns:
        op.add_column("users", sa.Column("default_batch_image_model", sa.String(length=50), nullable=True))
    op.execute("UPDATE users SET default_image_model = 'gpt-image-1.5' WHERE default_image_model IS NULL OR default_image_model = 'reve'")
    op.execute("UPDATE users SET default_batch_image_model = 'gpt-batch-api' WHERE default_batch_image_model IS NULL")
    if bind.dialect.name != "sqlite":
        op.alter_column("users", "default_batch_image_model", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "default_batch_image_model")
