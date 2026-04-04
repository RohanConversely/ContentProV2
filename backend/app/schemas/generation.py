from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from .asset import AssetResponse


class JobGenerationResponse(BaseModel):
    id: str
    round_number: int
    additional_description: str | None = None
    status: str
    created_at: datetime
    images: list[AssetResponse] = Field(default_factory=list)


class JobRegenerateRequest(BaseModel):
    additional_description: str = Field(min_length=1, max_length=250)
    image_model: str | None = Field(default=None, pattern="^(reve|gpt-image-1.5|gpt-image-1)$")
