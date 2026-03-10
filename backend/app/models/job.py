from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    brand_name: Mapped[str] = mapped_column(String(255))
    brand_website: Mapped[str] = mapped_column(String(500))
    product_name: Mapped[str] = mapped_column(String(255))
    product_category: Mapped[str] = mapped_column(String(255))
    job_type: Mapped[str] = mapped_column(String(50), default="image")
    social_link_1: Mapped[str | None] = mapped_column(String(500), nullable=True)
    social_link_2: Mapped[str | None] = mapped_column(String(500), nullable=True)
    social_link_3: Mapped[str | None] = mapped_column(String(500), nullable=True)
    social_link_4: Mapped[str | None] = mapped_column(String(500), nullable=True)
    additional_input_json: Mapped[dict | None] = mapped_column("additional_input", JSON, nullable=True)
    video_duration_seconds: Mapped[int] = mapped_column(Integer, default=8)
    status: Mapped[str] = mapped_column(String(50), default="pending_upload", index=True)
    current_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    storage_prefix: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User")
    assets = relationship("Asset", back_populates="job", cascade="all, delete-orphan")
    pricing_snapshot = relationship("PricingSnapshot", back_populates="job", uselist=False, cascade="all, delete-orphan")
    pipeline_logs = relationship("PipelineLog", back_populates="job", cascade="all, delete-orphan")
