from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class SingleImageJobResponse(BaseModel):
    job_id: str
    status: str
    kyc_json_path: str
    filtered_kyc_json_path: str
    generated_images: list[str]
    artifacts: list[dict[str, str]]
    workspace: str
    log_file: str


class BatchImageJobRowRequest(BaseModel):
    image_url: HttpUrl
    brand_name: str = Field(min_length=1)
    brand_website: HttpUrl
    product_name: str = Field(min_length=1)
    product_category: str = Field(min_length=1)
    social_link_1: HttpUrl | None = None
    social_link_2: HttpUrl | None = None
    additional_info: dict[str, Any] | None = None
    num_images: int = Field(default=6, ge=1, le=10)
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    row_id: str | None = None


class BatchImageJobRequest(BaseModel):
    rows: list[BatchImageJobRowRequest] = Field(min_length=1)


class BatchImageJobRowResponse(BaseModel):
    batch_index: int
    source_row_id: str | None = None
    source_image_url: str | None = None
    job_id: str
    status: str
    error: str | None = None
    kyc_json_path: str | None = None
    filtered_kyc_json_path: str | None = None
    generated_images: list[str] = Field(default_factory=list)
    artifacts: list[dict[str, str]] = Field(default_factory=list)
    workspace: str | None = None
    log_file: str | None = None


class BatchImageJobResponse(BaseModel):
    status: str
    total_rows: int
    successful_rows: int
    failed_rows: int
    results: list[BatchImageJobRowResponse]
