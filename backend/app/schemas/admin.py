from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminUserResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    role: str
    industry: str
    default_image_model: str
    default_batch_image_model: str
    plan: str
    created_at: datetime


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1)
    role: str = Field(pattern="^(user|superadmin)$", default="user")
    industry: str = Field(pattern="^(fashion|electronics|beauty|food|home|sports|jewelry|health)$")
    default_image_model: str = Field(default="gpt-image-1.5", pattern="^(reve|gpt-image-1.5|gpt-image-1|gpt-batch-api)$")
    default_batch_image_model: str = Field(default="gpt-batch-api", pattern="^(reve|gpt-image-1.5|gpt-image-1|gpt-batch-api)$")
    plan: str = Field(default="free")


class AdminUpdateUserRequest(BaseModel):
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, min_length=1)
    role: str | None = Field(default=None, pattern="^(user|superadmin)$")
    industry: str | None = Field(default=None, pattern="^(fashion|electronics|beauty|food|home|sports|jewelry|health)$")
    default_image_model: str | None = Field(default=None, pattern="^(reve|gpt-image-1.5|gpt-image-1|gpt-batch-api)$")
    default_batch_image_model: str | None = Field(default=None, pattern="^(reve|gpt-image-1.5|gpt-image-1|gpt-batch-api)$")
    plan: str | None = None
    password: str | None = Field(default=None, min_length=8)


class PromptResponse(BaseModel):
    industry: str
    prompt_text: str
    shot_prompts: list[dict[str, str]] = Field(default_factory=list)


class PromptUpdateRequest(BaseModel):
    prompt_text: str = Field(min_length=1)
    shot_prompts: list[dict[str, str]] | None = None
