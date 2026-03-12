"""job generations and batch columns

Revision ID: 20260312_0002
Revises: 20260311_0001
Create Date: 2026-03-12 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260312_0002"
down_revision: str | None = "20260311_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("batch_id", sa.String(length=64), nullable=True))
    op.add_column("jobs", sa.Column("batch_name", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_jobs_batch_id"), "jobs", ["batch_id"], unique=False)

    op.create_table(
        "job_generations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("additional_description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_generations_job_id"), "job_generations", ["job_id"], unique=False)
    op.create_index(op.f("ix_job_generations_status"), "job_generations", ["status"], unique=False)

    op.add_column("assets", sa.Column("generation_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_assets_generation_id"), "assets", ["generation_id"], unique=False)
    op.create_foreign_key(
        "fk_assets_generation_id_job_generations",
        "assets",
        "job_generations",
        ["generation_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_assets_generation_id_job_generations", "assets", type_="foreignkey")
    op.drop_index(op.f("ix_assets_generation_id"), table_name="assets")
    op.drop_column("assets", "generation_id")

    op.drop_index(op.f("ix_job_generations_status"), table_name="job_generations")
    op.drop_index(op.f("ix_job_generations_job_id"), table_name="job_generations")
    op.drop_table("job_generations")

    op.drop_index(op.f("ix_jobs_batch_id"), table_name="jobs")
    op.drop_column("jobs", "batch_name")
    op.drop_column("jobs", "batch_id")
