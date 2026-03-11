from __future__ import annotations

import asyncio
import json
import mimetypes
from collections import defaultdict
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.asset import Asset
from app.models.job import Job
from app.models.pricing import PipelineLog, PricingSnapshot
from app.services.storage import storage_service
from app.utils.presigned_urls import generate_url
from pipeline.orchestrator import JobContext, PipelineStageError, run_image_pipeline
from pipeline.pricing import compute_price_report

EVENT_QUEUES: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)
settings = get_settings()


async def emit(job_id: str, stage: str, status: str, message: str, db: AsyncSession | None = None) -> None:
    payload = {
        "stage": stage,
        "status": status,
        "message": message,
    }
    event = {
        "event": "status",
        "data": json.dumps(payload),
    }
    for queue in EVENT_QUEUES[job_id]:
        await queue.put(event)
    if db is not None:
        db_job_id = payload.get("db_job_id")
        if db_job_id:
            payload = {key: value for key, value in payload.items() if key != "db_job_id"}
            try:
                db.add(PipelineLog(job_id=db_job_id, level=status.upper(), stage=stage, message=message, context=payload))
                await db.commit()
            except Exception:
                await db.rollback()


async def emit_for_job(job: Job, stage: str, status: str, message: str, db: AsyncSession | None = None) -> None:
    await emit(
        job.job_id,
        stage,
        status,
        message,
        db=None if db is None else db,
    )
    if db is not None:
        try:
            db.add(
                PipelineLog(
                    job_id=job.id,
                    level=status.upper(),
                    stage=stage,
                    message=message,
                    context={"stage": stage, "status": status, "message": message},
                )
            )
            await db.commit()
        except Exception:
            await db.rollback()


async def subscribe(job_id: str):
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    EVENT_QUEUES[job_id].append(queue)
    try:
        while True:
            item = await queue.get()
            yield item
            payload = json.loads(item["data"])
            if payload["status"] in {"completed", "failed"}:
                break
    finally:
        EVENT_QUEUES[job_id].remove(queue)


async def _create_asset(
    db: AsyncSession,
    *,
    job: Job,
    asset_type: str,
    stage: str,
    local_path: Path,
    storage_key: str,
    original_filename: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Asset:
    existing_result = await db.execute(
        select(Asset).where(
            Asset.job_id == job.id,
            Asset.storage_key == storage_key,
            Asset.is_deleted.is_(False),
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        return existing

    mime_type = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"
    size_bytes = local_path.stat().st_size if local_path.exists() else None
    asset = Asset(
        job_id=job.id,
        asset_type=asset_type,
        stage=stage,
        storage_key=storage_key,
        original_filename=original_filename or local_path.name,
        mime_type=mime_type,
        size_bytes=size_bytes,
        metadata_json=metadata,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


async def _upload_stage_outputs(db: AsyncSession, job: Job, result: dict[str, Any]) -> None:
    stage_1_paths = [
        ("kyc_json", Path(result["kyc_json_path"])),
        ("kyc_json", Path(result["filtered_kyc_json_path"])),
    ]
    for asset_type, local_path in stage_1_paths:
        storage_key = f"{job.storage_prefix}/stage_1/{local_path.name}"
        await storage_service.upload_file(local_path, storage_key)
        await _create_asset(db, job=job, asset_type=asset_type, stage="stage_1", local_path=local_path, storage_key=storage_key)

    for local_path_str in result["generated_images"]:
        local_path = Path(local_path_str)
        storage_key = f"{job.storage_prefix}/stage_2/{local_path.name}"
        await storage_service.upload_file(local_path, storage_key)
        await _create_asset(db, job=job, asset_type="generated_image", stage="stage_2", local_path=local_path, storage_key=storage_key)


async def _upload_generated_image(db: AsyncSession, job: Job, local_path: Path) -> None:
    storage_key = f"{job.storage_prefix}/stage_2/{local_path.name}"
    await storage_service.upload_file(local_path, storage_key)
    await _create_asset(
        db,
        job=job,
        asset_type="generated_image",
        stage="stage_2",
        local_path=local_path,
        storage_key=storage_key,
    )


async def _upload_job_support_files(
    db: AsyncSession,
    job: Job,
    *,
    log_file: Path,
    pricing_file: Path | None,
) -> None:
    if log_file.exists():
        storage_key = f"{job.storage_prefix}/job.log"
        await storage_service.upload_file(log_file, storage_key, "application/jsonl")
        await _create_asset(
            db,
            job=job,
            asset_type="job_log",
            stage="pipeline",
            local_path=log_file,
            storage_key=storage_key,
        )

    if pricing_file is not None and pricing_file.exists():
        storage_key = f"{job.storage_prefix}/pricing.json"
        await storage_service.upload_file(pricing_file, storage_key, "application/json")
        await _create_asset(
            db,
            job=job,
            asset_type="pricing_json",
            stage="pipeline",
            local_path=pricing_file,
            storage_key=storage_key,
        )


def _build_job_workspace(job: Job) -> Path:
    workspace = (settings.storage_root / "job_runs" / job.job_id).resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace


def _parse_log_line(line: str) -> dict[str, Any] | None:
    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    return payload


async def _monitor_job_log(job: Job, log_file: Path, stop_event: asyncio.Event) -> None:
    image_counter = 0
    uploaded_paths: set[str] = set()
    position = 0

    while not stop_event.is_set() or log_file.exists():
        if not log_file.exists():
            await asyncio.sleep(0.25)
            continue

        with log_file.open("r", encoding="utf-8") as handle:
            handle.seek(position)
            lines = handle.readlines()
            position = handle.tell()

        for line in lines:
            payload = _parse_log_line(line)
            if payload is None:
                continue
            message = payload.get("message")
            context = payload.get("context") if isinstance(payload.get("context"), dict) else {}

            if message == "Requesting Product KYC.":
                async with AsyncSessionLocal() as db:
                    await emit_for_job(job, "stage_1", "running", "Performing Product KYC", db)
            elif message == "KYC saved.":
                async with AsyncSessionLocal() as db:
                    await emit_for_job(job, "stage_1", "running", "Product KYC complete", db)
            elif message == "Requesting image generation with KYC.":
                async with AsyncSessionLocal() as db:
                    await emit_for_job(job, "stage_2", "running", "Starting image generation", db)
            elif message == "Image generated.":
                output_file = context.get("output_file")
                if not isinstance(output_file, str) or output_file in uploaded_paths:
                    continue
                image_counter += 1
                local_path = Path(output_file).resolve()
                if local_path.exists():
                    async with AsyncSessionLocal() as db:
                        result = await db.execute(select(Job).where(Job.id == job.id))
                        current_job = result.scalar_one_or_none()
                        if current_job is None:
                            continue
                        await _upload_generated_image(db, current_job, local_path)
                        await emit_for_job(current_job, "stage_2", "running", f"Generating image {image_counter}", db)
                    uploaded_paths.add(output_file)

        if stop_event.is_set():
            break
        await asyncio.sleep(0.25)


def _write_pricing_file(job: Job, workspace: Path) -> tuple[Path, dict[str, Any]]:
    job_log_file = workspace / "job.log"
    pricing_file = workspace / "pricing.json"
    report = compute_price_report(job_dir=workspace, job_log_file=job_log_file, currency="USD")
    pricing_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return pricing_file, report


async def _upsert_pricing_snapshot(db: AsyncSession, job: Job, pricing_report: dict[str, Any]) -> None:
    steps = {entry.get("step"): entry for entry in pricing_report.get("steps", []) if isinstance(entry, dict)}
    totals = pricing_report.get("totals", {})
    token_usage = totals.get("token_usage", {}) if isinstance(totals, dict) else {}

    pricing_result = await db.execute(select(PricingSnapshot).where(PricingSnapshot.job_id == job.id))
    pricing = pricing_result.scalar_one_or_none()
    if pricing is None:
        pricing = PricingSnapshot(job_id=job.id)
        db.add(pricing)

    pricing.raw_price_data = pricing_report
    pricing.total_cost_usd = totals.get("grand_total")
    pricing.stage_1_cost_usd = (steps.get("step_1_product_kyc") or {}).get("cost", {}).get("total")
    pricing.stage_2_cost_usd = (steps.get("step_2_image_generation") or {}).get("cost", {}).get("total")
    pricing.stage_3_cost_usd = (steps.get("step_3_video_prompt_generation") or {}).get("cost", {}).get("total")
    pricing.stage_4_cost_usd = (steps.get("step_4_video_generation") or {}).get("cost", {}).get("total")
    pricing.total_input_tokens = token_usage.get("input_tokens")
    pricing.total_output_tokens = token_usage.get("output_tokens")
    await db.commit()


async def run_pipeline_task(job_id: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Job).where(Job.job_id == job_id))
        job = result.scalar_one_or_none()
        if job is None:
            return

        workspace = _build_job_workspace(job)

        ctx = JobContext(
            job_id=job.job_id,
            brand_name=job.brand_name,
            brand_website=job.brand_website,
            product_name=job.product_name,
            product_category=job.product_category,
            image_paths=[],
            social_link_1=job.social_link_1,
            social_link_2=job.social_link_2,
            additional_info=job.additional_input_json,
            num_images=4,
            temperature=0.1,
            workspace_root=workspace,
        )
        raw_asset_result = await db.execute(
            select(Asset)
            .where(Asset.job_id == job.id, Asset.asset_type == "raw_image", Asset.is_deleted.is_(False))
            .order_by(Asset.created_at.asc())
        )
        raw_assets = raw_asset_result.scalars().all()
        if not raw_assets:
            job.status = "failed"
            job.error_message = "No raw image uploaded for job."
            await db.commit()
            await emit_for_job(job, "pipeline", "failed", job.error_message, db)
            return

        image_paths: list[Path] = []
        for raw_asset in raw_assets[:4]:
            local_image = workspace / "raw" / (raw_asset.original_filename or "product.jpg")
            await storage_service.download_file(raw_asset.storage_key, local_image)
            image_paths.append(local_image)
        ctx.image_paths = image_paths

        log_stop_event = asyncio.Event()
        log_monitor_task: asyncio.Task[None] | None = None
        try:
            log_monitor_task = asyncio.create_task(_monitor_job_log(job, ctx.job_log_file, log_stop_event))
            job.status = "running"
            job.current_stage = "stage_1"
            await db.commit()
            await emit_for_job(job, "stage_1", "running", "Generating product KYC.", db)

            result_payload = (await run_image_pipeline(ctx)).to_dict()

            log_stop_event.set()
            await log_monitor_task

            job.current_stage = "stage_2"
            job.status = "running"
            await db.commit()
            await emit_for_job(job, "stage_2", "running", "Uploading generated outputs.", db)

            await _upload_stage_outputs(db, job, result_payload)

            pricing_file, pricing_report = _write_pricing_file(job, workspace)
            await _upsert_pricing_snapshot(db, job, pricing_report)
            await _upload_job_support_files(
                db,
                job,
                log_file=ctx.job_log_file,
                pricing_file=pricing_file,
            )

            job.status = "completed"
            job.current_stage = "stage_2"
            job.error_message = None
            await db.commit()
            await emit_for_job(job, "stage_2", "completed", "Image pipeline completed.", db)
        except Exception as exc:
            try:
                log_stop_event.set()
                if log_monitor_task is not None:
                    await log_monitor_task
            except Exception:
                pass
            job.status = "failed"
            job.error_message = str(exc)
            await db.commit()
            try:
                await _upload_job_support_files(
                    db,
                    job,
                    log_file=ctx.job_log_file,
                    pricing_file=None,
                )
            except Exception:
                pass
            await emit_for_job(job, job.current_stage or "pipeline", "failed", str(exc), db)
            if isinstance(exc, PipelineStageError):
                return
            raise


async def queue_pipeline_task(job_id: str) -> None:
    asyncio.create_task(run_pipeline_task(job_id))


async def hydrate_job_assets(db: AsyncSession, job: Job) -> list[dict[str, Any]]:
    asset_result = await db.execute(
        select(Asset).where(Asset.job_id == job.id, Asset.is_deleted.is_(False)).order_by(Asset.created_at.asc())
    )
    assets = asset_result.scalars().all()
    response_assets = []
    for asset in assets:
        response_assets.append(
            {
                "id": asset.id,
                "job_id": asset.job_id,
                "asset_type": asset.asset_type,
                "stage": asset.stage,
                "storage_key": asset.storage_key,
                "original_filename": asset.original_filename,
                "mime_type": asset.mime_type,
                "size_bytes": asset.size_bytes,
                "metadata": asset.metadata_json,
                "is_deleted": asset.is_deleted,
                "created_at": asset.created_at,
                "presigned_url": generate_url(asset),
            }
        )
    return response_assets
