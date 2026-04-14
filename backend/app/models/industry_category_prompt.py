from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IndustryCategoryPrompt(Base):
    __tablename__ = "industry_category_prompts"
    __table_args__ = (UniqueConstraint("industry", "category_key", name="uq_industry_category_prompt"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    industry: Mapped[str] = mapped_column(String(64), index=True)
    category_key: Mapped[str] = mapped_column(String(128))
    category_label: Mapped[str] = mapped_column(String(255))
    category_prompt_text: Mapped[str] = mapped_column(Text)
    shot_prompts_json: Mapped[list[dict[str, str]] | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
