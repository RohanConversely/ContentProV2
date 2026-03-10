from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PricingSnapshot(Base):
    __tablename__ = "pricing_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), unique=True)
    raw_price_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    total_cost_usd: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    stage_1_cost_usd: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    stage_2_cost_usd: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    stage_3_cost_usd: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    stage_4_cost_usd: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    total_input_tokens: Mapped[int | None] = mapped_column(nullable=True)
    total_output_tokens: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    job = relationship("Job", back_populates="pricing_snapshot")


class PipelineLog(Base):
    __tablename__ = "pipeline_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), index=True)
    level: Mapped[str] = mapped_column(String(20))
    stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    job = relationship("Job", back_populates="pipeline_logs")
