from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserCategoryPromptOverride(Base):
    __tablename__ = "user_category_prompt_overrides"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "industry",
            "category_key",
            name="uq_user_category_prompt_override_user_industry_category",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    industry: Mapped[str] = mapped_column(String(64), index=True)
    category_key: Mapped[str] = mapped_column(String(128))
    category_label: Mapped[str] = mapped_column(String(255))
    category_prompt_text: Mapped[str] = mapped_column(Text)
    shot_prompts_json: Mapped[list[dict[str, str]] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
