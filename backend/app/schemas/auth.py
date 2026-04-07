from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1)
    industry: str = Field(pattern="^(fashion|electronics|beauty|food|home|sports|jewelry|health|pet_accessories)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)
    confirm_new_password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: EmailStr
    display_name: str
    role: str
    industry: str
    default_image_model: str
    default_batch_image_model: str
    enable_style_number: bool


class MeResponse(BaseModel):
    user_id: str
    email: EmailStr
    display_name: str
    role: str
    industry: str
    default_image_model: str
    default_batch_image_model: str
    enable_style_number: bool
    plan: str
    member_since: datetime


class UpdateMeRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1)
    industry: str | None = Field(default=None, pattern="^(fashion|electronics|beauty|food|home|sports|jewelry|health|pet_accessories)$")
