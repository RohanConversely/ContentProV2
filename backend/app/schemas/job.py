from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from .asset import AssetResponse
from .generation import JobGenerationResponse


class JobCreateRequest(BaseModel):
    job_type: str = Field(default="image")
    image_model: str | None = Field(default=None, pattern="^(reve|flux-2-pro|gpt-image-1.5|gpt-image-1|gpt-batch-api)$")
    requested_image_count: int = Field(default=4, ge=1, le=4)
    brand_name: str = Field(min_length=1)
    brand_website: str
    product_name: str = Field(min_length=1)
    product_category: str = Field(min_length=1)
    social_link_1: str | None = None
    social_link_2: str | None = None
    social_link_3: str | None = None
    social_link_4: str | None = None
    additional_input: dict | None = None
    video_duration_seconds: int = Field(default=8, ge=1, le=60)
    batch_id: str | None = None
    batch_name: str | None = None


class JobSummaryResponse(BaseModel):
    id: str
    job_id: str
    brand_name: str
    product_name: str
    job_type: str
    image_model: str
    requested_image_count: int
    batch_id: str | None = None
    batch_name: str | None = None
    total_jobs: int | None = None
    status: str
    current_stage: str | None = None
    created_at: datetime
    updated_at: datetime


class PricingSnapshotResponse(BaseModel):
    raw_price_data: dict | None = None
    total_cost_usd: float | None = None
    stage_1_cost_usd: float | None = None
    stage_2_cost_usd: float | None = None
    stage_3_cost_usd: float | None = None
    stage_4_cost_usd: float | None = None
    total_input_tokens: int | None = None
    total_output_tokens: int | None = None
    created_at: datetime | None = None


class JobLogEntryResponse(BaseModel):
    level: str
    stage: str | None = None
    message: str
    context: dict | None = None
    logged_at: datetime


class JobResponse(JobSummaryResponse):
    user_id: str
    brand_website: str
    product_category: str
    social_link_1: str | None = None
    social_link_2: str | None = None
    social_link_3: str | None = None
    social_link_4: str | None = None
    additional_input: dict | None = None
    video_duration_seconds: int
    error_message: str | None = None
    storage_prefix: str
    assets: list[AssetResponse] = Field(default_factory=list)
    generations: list[JobGenerationResponse] = Field(default_factory=list)
    pricing_snapshot: PricingSnapshotResponse | None = None


class JobListResponse(BaseModel):
    items: list[JobSummaryResponse]
    page: int
    page_size: int
    total: int


class BatchSummaryResponse(BaseModel):
    batch_id: str
    batch_name: str
    job_type: str
    status: str
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    total_images: int
    created_at: datetime


class RecentJobResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    images: int
    date: datetime
    batch_id: str | None = None
    total_jobs: int | None = None


class UsageResponse(BaseModel):
    plan: str
    credits_used: int
    credits_total: int
    images_this_month: int
    videos_this_month: int
    reset_date: datetime
