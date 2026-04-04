from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IndustryPrompt(Base):
    __tablename__ = "industry_prompts"

    industry: Mapped[str] = mapped_column(String(64), primary_key=True)
    prompt_text: Mapped[str] = mapped_column(Text)
    shot_prompts_json: Mapped[list[dict[str, str]] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
