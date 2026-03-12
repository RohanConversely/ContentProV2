from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .orchestrator import JobContext, PipelineStageError, build_job_id, run_image_pipeline


@dataclass
class BatchRowInput:
    image_path: Path
    brand_name: str
    brand_website: str
    product_name: str
    product_category: str
    social_link_1: str | None = None
    social_link_2: str | None = None
    additional_info: dict[str, Any] | None = None
    num_images: int = 6
    temperature: float = 0.1
    source_image_url: str | None = None
    source_row_id: str | None = None


async def run_batch_product_upload(rows: list[BatchRowInput]) -> dict[str, Any]:
    results: list[dict[str, Any]] = []

    for index, row in enumerate(rows, start=1):
        ctx = JobContext(
            job_id=build_job_id(),
            brand_name=row.brand_name,
            brand_website=row.brand_website,
            product_name=row.product_name,
            product_category=row.product_category,
            image_path=row.image_path.resolve(),
            social_link_1=row.social_link_1,
            social_link_2=row.social_link_2,
            additional_info=row.additional_info,
            num_images=row.num_images,
            temperature=row.temperature,
        )
        try:
            result = await run_image_pipeline(ctx)
            payload = result.to_dict()
            payload["batch_index"] = index
            payload["source_row_id"] = row.source_row_id
            payload["source_image_url"] = row.source_image_url
            results.append(payload)
        except Exception as exc:
            status = "failed"
            if not isinstance(exc, PipelineStageError):
                status = "failed"
            results.append(
                {
                    "batch_index": index,
                    "source_row_id": row.source_row_id,
                    "source_image_url": row.source_image_url,
                    "job_id": ctx.job_id,
                    "status": status,
                    "error": str(exc),
                }
            )

    succeeded = sum(1 for item in results if item.get("status") == "completed")
    failed = len(results) - succeeded
    return {
        "status": "completed" if failed == 0 else "partial_success",
        "total_rows": len(rows),
        "successful_rows": succeeded,
        "failed_rows": failed,
        "results": results,
    }
