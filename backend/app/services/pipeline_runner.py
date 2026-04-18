from __future__ import annotations

import asyncio
import json
import mimetypes
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageEnhance, ImageFilter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.asset import Asset
from app.models.job_generation import JobGeneration
from app.models.job import Job
from app.models.pricing import PipelineLog, PricingSnapshot
from app.models.user import User
from app.services.prompt_management import PromptBundle, get_effective_prompt_bundle
from app.services.storage import storage_service
from app.utils.presigned_urls import generate_url
from pipeline.orchestrator import JobContext, PipelineStageError, run_image_pipeline, run_stage_2_only
from pipeline.pricing import compute_price_report
from pipeline.stages.style_number_overlay import apply_style_number_overlay

EVENT_QUEUES: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)
settings = get_settings()

# In-process task registry for cancellation.
# Note: this only works within a single backend process.
RUNNING_PIPELINE_TASKS: dict[str, asyncio.Task[None]] = {}
RUNNING_REGENERATION_TASKS: dict[tuple[str, str], asyncio.Task[None]] = {}

TERMINAL_JOB_STATUSES = {"completed", "failed", "cancelled"}
USER_CANCELLED_MESSAGE = "User cancelled the job."
FINAL_SIZE = (2048, 2048)
SOFT_DELETED_STATUS = "deleted"
BATCH_PROGRESS_STALL_SECONDS = 180
WATCHDOG_INTERVAL_SECONDS = 30
STYLE_NUMBER_KEYS = ("style no.", "style no", "style_number", "stylenumber")


async def _resolve_effective_prompt_bundle(
    db: AsyncSession,
    *,
    user_id: str,
    workspace: Path,
    additional_input: dict[str, Any] | None = None,
    fallback_category: str | None = None,
) -> PromptBundle:
    del workspace
    user = await db.get(User, user_id)
    if user is None:
        raise RuntimeError("User not found for prompt resolution.")
    payload = additional_input if isinstance(additional_input, dict) else {}
    selected_industry = str(payload.get("industry") or user.industry or "").strip().lower() or user.industry
    selected_category = str(payload.get("prompt_category") or fallback_category or "default").strip()

    raw_selected_shots = payload.get("selected_shot_keys")
    selected_shot_keys: list[str] | None
    if isinstance(raw_selected_shots, list):
        selected_shot_keys = [str(item).strip() for item in raw_selected_shots if str(item).strip()]
    else:
        selected_shot_keys = None

    return await get_effective_prompt_bundle(
        db,
        user,
        selected_industry,
        category=selected_category,
        selected_shot_keys=selected_shot_keys,
    )


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
            if payload["status"] in TERMINAL_JOB_STATUSES:
                break
    finally:
        EVENT_QUEUES[job_id].remove(queue)


async def _create_asset(
    db: AsyncSession,
    *,
    job: Job,
    generation: JobGeneration | None = None,
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
        generation_id=generation.id if generation is not None else None,
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
    stage_1_paths: list[tuple[str, Path]] = []
    kyc_json_path = result.get("kyc_json_path")
    filtered_kyc_json_path = result.get("filtered_kyc_json_path")
    if isinstance(kyc_json_path, str) and kyc_json_path.strip():
        stage_1_paths.append(("kyc_json", Path(kyc_json_path)))
    if isinstance(filtered_kyc_json_path, str) and filtered_kyc_json_path.strip():
        stage_1_paths.append(("kyc_json", Path(filtered_kyc_json_path)))
    for asset_type, local_path in stage_1_paths:
        storage_key = f"{job.storage_prefix}/stage_1/{local_path.name}"
        await storage_service.upload_file(local_path, storage_key)
        await _create_asset(db, job=job, asset_type=asset_type, stage="stage_1", local_path=local_path, storage_key=storage_key)

    generation = await _ensure_initial_generation(db, job)
    for local_path_str in result["generated_images"]:
        local_path = Path(local_path_str)
        await _upload_generated_image(db, job, local_path, generation=generation)


def create_sharpened_final(image_path: Path, final_dir: Path) -> Path:
    final_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(image_path) as img:
        working = img.convert("RGB")
        final_img = working.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
        final_img = ImageEnhance.Sharpness(final_img).enhance(1.08)
        final_img = final_img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=150, threshold=2))
        final_path = final_dir / f"{image_path.stem}_final.png"
        final_img.save(final_path, format="PNG", optimize=True)
        return final_path


async def _upload_generated_image(
    db: AsyncSession,
    job: Job,
    local_path: Path,
    generation: JobGeneration | None = None,
) -> None:
    if generation is None:
        generation = await _ensure_initial_generation(db, job)
    upload_source = local_path
    try:
        upload_source = create_sharpened_final(local_path, local_path.parent / "final")
    except Exception:
        upload_source = local_path

    style_number = _resolve_style_number(job.additional_input_json)
    if style_number:
        try:
            apply_style_number_overlay(upload_source, style_number)
        except Exception:
            pass

    storage_key = f"{job.storage_prefix}/stage_2/round_{generation.round_number}/{upload_source.name}"
    await storage_service.upload_file(upload_source, storage_key)
    await _create_asset(
        db,
        job=job,
        generation=generation,
        asset_type="generated_image",
        stage="stage_2",
        local_path=upload_source,
        storage_key=storage_key,
    )


def _is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _resolve_style_number(additional_input: dict[str, Any] | None) -> str | None:
    if not isinstance(additional_input, dict):
        return None
    if not _is_truthy(additional_input.get("add_style_number")):
        return None
    for key in STYLE_NUMBER_KEYS:
        value = additional_input.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


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


async def _legacy_generated_images_exist(db: AsyncSession, job: Job) -> bool:
    result = await db.execute(
        select(Asset.id).where(
            Asset.job_id == job.id,
            Asset.asset_type == "generated_image",
            Asset.generation_id.is_(None),
            Asset.is_deleted.is_(False),
        )
    )
    return result.first() is not None


async def _next_generation_round(db: AsyncSession, job: Job) -> int:
    result = await db.execute(
        select(JobGeneration).where(JobGeneration.job_id == job.id).order_by(JobGeneration.round_number.desc())
    )
    latest = result.scalars().first()
    if latest is not None:
        return latest.round_number + 1
    if await _legacy_generated_images_exist(db, job):
        return 2
    return 1


async def _create_generation(
    db: AsyncSession,
    job: Job,
    *,
    additional_description: str | None,
    status: str,
) -> JobGeneration:
    generation = JobGeneration(
        job_id=job.id,
        round_number=await _next_generation_round(db, job),
        additional_description=additional_description,
        status=status,
    )
    db.add(generation)
    await db.commit()
    await db.refresh(generation)
    return generation


async def _ensure_initial_generation(db: AsyncSession, job: Job) -> JobGeneration:
    result = await db.execute(
        select(JobGeneration).where(JobGeneration.job_id == job.id, JobGeneration.round_number == 1)
    )
    generation = result.scalar_one_or_none()
    if generation is not None:
        return generation
    return await _create_generation(db, job, additional_description=None, status="completed")


async def _restore_completed_job_after_regeneration_cancel(
    db: AsyncSession,
    job: Job,
) -> None:
    job.status = "completed"
    job.current_stage = "stage_2"
    job.error_message = None
    await db.commit()


def _parse_log_line(line: str) -> dict[str, Any] | None:
    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    return payload


async def _monitor_job_log(
    job: Job,
    log_file: Path,
    stop_event: asyncio.Event,
    *,
    generation: JobGeneration | None = None,
    stage_1_enabled: bool = True,
) -> None:
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

            if stage_1_enabled and message == "Requesting Product KYC.":
                async with AsyncSessionLocal() as db:
                    await emit_for_job(job, "stage_1", "running", "Performing Product KYC", db)
            elif stage_1_enabled and message == "KYC saved.":
                async with AsyncSessionLocal() as db:
                    await emit_for_job(job, "stage_1", "running", "Product KYC complete", db)
            elif message in {
                "Requesting image generation with GPT image.",
                "Requesting image generation with REVE.",
                "Requesting image generation with KYC.",
            }:
                async with AsyncSessionLocal() as db:
                    if generation is not None:
                        generation_result = await db.execute(select(JobGeneration).where(JobGeneration.id == generation.id))
                        current_generation = generation_result.scalar_one_or_none()
                    else:
                        current_generation = None
                    if current_generation is not None and current_generation.round_number > 1:
                        await emit_for_job(job, "stage_2", "running", f"Starting regeneration {current_generation.round_number}", db)
                    else:
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
                        await _upload_generated_image(db, current_job, local_path, generation=generation)
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

    stage_1_cost = (steps.get("step_1_product_kyc") or {}).get("cost", {}).get("total")
    stage_2_cost = (steps.get("step_2_image_generation") or {}).get("cost", {}).get("total")
    stage_3_cost = (steps.get("step_3_video_prompt_generation") or {}).get("cost", {}).get("total")
    stage_4_cost = (steps.get("step_4_video_generation") or {}).get("cost", {}).get("total")

    pricing.raw_price_data = pricing_report
    pricing.total_cost_usd = totals.get("grand_total") if totals.get("grand_total") is not None else pricing.total_cost_usd
    pricing.stage_1_cost_usd = stage_1_cost if stage_1_cost is not None else pricing.stage_1_cost_usd
    pricing.stage_2_cost_usd = stage_2_cost if stage_2_cost is not None else pricing.stage_2_cost_usd
    pricing.stage_3_cost_usd = stage_3_cost if stage_3_cost is not None else pricing.stage_3_cost_usd
    pricing.stage_4_cost_usd = stage_4_cost if stage_4_cost is not None else pricing.stage_4_cost_usd
    pricing.total_input_tokens = token_usage.get("input_tokens") if token_usage.get("input_tokens") is not None else pricing.total_input_tokens
    pricing.total_output_tokens = token_usage.get("output_tokens") if token_usage.get("output_tokens") is not None else pricing.total_output_tokens
    await db.commit()


def _task_is_running(job_id: str) -> bool:
    existing = RUNNING_PIPELINE_TASKS.get(job_id)
    return existing is not None and not existing.done()


async def _requeue_if_batch_progress_stalled() -> None:
    stall_cutoff = datetime.now(timezone.utc) - timedelta(seconds=BATCH_PROGRESS_STALL_SECONDS)
    async with AsyncSessionLocal() as db:
        batch_result = await db.execute(
            select(Job.batch_id)
            .where(Job.batch_id.is_not(None), Job.status != SOFT_DELETED_STATUS)
            .distinct()
        )
        batch_ids = [row[0] for row in batch_result.fetchall() if row[0]]
        for batch_id in batch_ids:
            jobs_result = await db.execute(
                select(Job)
                .where(Job.batch_id == batch_id, Job.status != SOFT_DELETED_STATUS)
                .order_by(Job.created_at.asc())
            )
            batch_jobs = jobs_result.scalars().all()
            if not batch_jobs:
                continue

            latest_completed_idx = -1
            for idx, batch_job in enumerate(batch_jobs):
                if batch_job.status == "completed":
                    latest_completed_idx = idx

            candidate_idx = 0 if latest_completed_idx < 0 else latest_completed_idx + 1
            if candidate_idx >= len(batch_jobs):
                continue

            candidate = batch_jobs[candidate_idx]
            if candidate.status not in {"queued", "pending"}:
                continue
            if candidate.updated_at is None or candidate.updated_at > stall_cutoff:
                continue
            if _task_is_running(candidate.job_id):
                continue

            has_active_upstream = False
            for prior in batch_jobs[:candidate_idx]:
                if prior.status in {"pending_upload", "pending", "queued", "running", "cancel_requested"}:
                    has_active_upstream = True
                    break
            if has_active_upstream:
                continue

            raw_assets_result = await db.execute(
                select(Asset.id).where(
                    Asset.job_id == candidate.id,
                    Asset.asset_type == "raw_image",
                    Asset.is_deleted.is_(False),
                )
            )
            raw_asset_id = raw_assets_result.scalar_one_or_none()
            if raw_asset_id is None:
                continue

            await queue_pipeline_task(candidate.job_id)
            await emit_for_job(
                candidate,
                candidate.current_stage or "queued",
                "queued",
                "Recovered stalled queued job and resumed processing.",
                db,
            )


async def _watchdog_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            await _requeue_if_batch_progress_stalled()
        except Exception:
            pass
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=WATCHDOG_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            continue


WATCHDOG_STOP_EVENT: asyncio.Event | None = None
WATCHDOG_TASK: asyncio.Task[None] | None = None


async def start_pipeline_watchdog() -> None:
    global WATCHDOG_STOP_EVENT, WATCHDOG_TASK
    if WATCHDOG_TASK is not None and not WATCHDOG_TASK.done():
        return
    WATCHDOG_STOP_EVENT = asyncio.Event()
    WATCHDOG_TASK = asyncio.create_task(_watchdog_loop(WATCHDOG_STOP_EVENT))


async def stop_pipeline_watchdog() -> None:
    global WATCHDOG_STOP_EVENT, WATCHDOG_TASK
    if WATCHDOG_STOP_EVENT is not None:
        WATCHDOG_STOP_EVENT.set()
    if WATCHDOG_TASK is not None:
        try:
            await WATCHDOG_TASK
        except Exception:
            pass
    WATCHDOG_STOP_EVENT = None
    WATCHDOG_TASK = None


async def run_pipeline_task(job_id: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Job).where(Job.job_id == job_id))
        job = result.scalar_one_or_none()
        if job is None:
            return

        if job.status in {"cancel_requested", "cancelled"}:
            job.status = "cancelled"
            job.error_message = job.error_message or USER_CANCELLED_MESSAGE
            await db.commit()
            await emit_for_job(job, job.current_stage or "queued", "cancelled", job.error_message, db)
            return

        workspace: Path | None = None
        ctx: JobContext | None = None
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

        log_stop_event = asyncio.Event()
        log_monitor_task: asyncio.Task[None] | None = None
        try:
            workspace = _build_job_workspace(job)
            prompt_bundle = await _resolve_effective_prompt_bundle(
                db,
                user_id=job.user_id,
                workspace=workspace,
                additional_input=job.additional_input_json if isinstance(job.additional_input_json, dict) else None,
                fallback_category=job.product_category,
            )
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
                image_model=job.image_model or "reve",
                num_images=max(1, min(job.requested_image_count or 4, 4)),
                temperature=0.1,
                prompt_text=prompt_bundle.prompt_text,
                shot_prompts=prompt_bundle.shot_prompts,
                workspace_root=workspace,
            )

            image_paths: list[Path] = []
            for raw_asset in raw_assets[:5]:
                local_image = workspace / "raw" / (raw_asset.original_filename or "product.jpg")
                await storage_service.download_file(raw_asset.storage_key, local_image)
                image_paths.append(local_image)
            ctx.image_paths = image_paths

            result = await db.execute(select(Job.status, Job.current_stage).where(Job.id == job.id))
            current = result.first()
            if current and current[0] in {"cancel_requested", "cancelled"}:
                job.status = "cancelled"
                job.error_message = USER_CANCELLED_MESSAGE
                await db.commit()
                await emit_for_job(job, job.current_stage or "queued", "cancelled", job.error_message, db)
                return

            log_monitor_task = asyncio.create_task(
                _monitor_job_log(job, ctx.job_log_file, log_stop_event, stage_1_enabled=False)
            )
            job.status = "running"
            job.current_stage = "stage_2"
            await db.commit()

            result_payload = (await run_image_pipeline(ctx)).to_dict()

            log_stop_event.set()
            await log_monitor_task

            result = await db.execute(select(Job.status).where(Job.id == job.id))
            current_status = result.scalar_one_or_none()
            if current_status in {"cancel_requested", "cancelled"}:
                job.status = "cancelled"
                job.error_message = USER_CANCELLED_MESSAGE
                await db.commit()
                await emit_for_job(job, job.current_stage or "pipeline", "cancelled", job.error_message, db)
                return

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
        except asyncio.CancelledError:
            try:
                log_stop_event.set()
                if log_monitor_task is not None:
                    await log_monitor_task
            except Exception:
                pass
            job.status = "cancelled"
            job.error_message = USER_CANCELLED_MESSAGE
            await db.commit()
            await emit_for_job(job, job.current_stage or "pipeline", "cancelled", job.error_message, db)
        except Exception as exc:
            try:
                if ctx is not None:
                    log_stop_event.set()
                    if log_monitor_task is not None:
                        await log_monitor_task
            except Exception:
                pass
            job.status = "failed"
            job.error_message = str(exc)
            await db.commit()
            try:
                if ctx is not None:
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
        finally:
            RUNNING_PIPELINE_TASKS.pop(job_id, None)


async def run_regeneration_task(
    job_id: str,
    generation_id: str,
    image_model: str | None = None,
    shot_types: list[str] | None = None,
    requested_image_count: int | None = None,
) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Job).where(Job.job_id == job_id))
        job = result.scalar_one_or_none()
        if job is None:
            return

        generation_result = await db.execute(select(JobGeneration).where(JobGeneration.id == generation_id, JobGeneration.job_id == job.id))
        generation = generation_result.scalar_one_or_none()
        if generation is None:
            return

        if generation.status in {"cancel_requested", "cancelled"}:
            generation.status = "cancelled"
            await _restore_completed_job_after_regeneration_cancel(db, job)
            await emit_for_job(job, job.current_stage or "stage_2", "cancelled", USER_CANCELLED_MESSAGE, db)
            return

        if job.status in {"cancel_requested", "cancelled"}:
            generation.status = "cancelled"
            await _restore_completed_job_after_regeneration_cancel(db, job)
            await emit_for_job(job, job.current_stage or "stage_2", "cancelled", USER_CANCELLED_MESSAGE, db)
            return

        workspace: Path | None = None
        ctx: JobContext | None = None
        log_stop_event = asyncio.Event()
        log_monitor_task: asyncio.Task[None] | None = None
        try:
            workspace = _build_job_workspace(job) / f"regeneration_round_{generation.round_number}"
            workspace.mkdir(parents=True, exist_ok=True)
            prompt_bundle = await _resolve_effective_prompt_bundle(
                db,
                user_id=job.user_id,
                workspace=workspace,
                additional_input=job.additional_input_json if isinstance(job.additional_input_json, dict) else None,
                fallback_category=job.product_category,
            )

            image_paths: list[Path] = []

            regeneration_input_result = await db.execute(
                select(Asset)
                .where(
                    Asset.job_id == job.id,
                    Asset.generation_id == generation.id,
                    Asset.asset_type == "regeneration_input_image",
                    Asset.is_deleted.is_(False),
                )
                .order_by(Asset.created_at.asc())
            )
            regeneration_input_assets = regeneration_input_result.scalars().all()
            for extra_asset in regeneration_input_assets[:3]:
                local_extra = workspace / "regeneration_inputs" / (extra_asset.original_filename or "extra_input.jpg")
                await storage_service.download_file(extra_asset.storage_key, local_extra)
                image_paths.append(local_extra)

            if not image_paths:
                generation.status = "failed"
                job.status = "failed"
                job.error_message = "At least one regeneration input image is required."
                await db.commit()
                await emit_for_job(job, "stage_2", "failed", job.error_message, db)
                return

            effective_shot_types = [shot.strip().lower() for shot in (shot_types or []) if shot and shot.strip()]
            if not effective_shot_types:
                for extra_asset in regeneration_input_assets:
                    metadata = extra_asset.metadata_json if isinstance(extra_asset.metadata_json, dict) else {}
                    candidate = metadata.get("shot_types")
                    if isinstance(candidate, list):
                        effective_shot_types = [str(shot).strip().lower() for shot in candidate if str(shot).strip()]
                        if effective_shot_types:
                            break

            selected_model = image_model or job.image_model or "reve"
            effective_image_count = max(1, min(requested_image_count or 2, 2))
            ctx = JobContext(
                job_id=job.job_id,
                brand_name=job.brand_name,
                brand_website=job.brand_website,
                product_name=job.product_name,
                product_category=job.product_category,
                image_paths=image_paths,
                social_link_1=None,
                social_link_2=None,
                additional_info=None,
                image_model=selected_model,
                num_images=effective_image_count,
                temperature=0.1,
                prompt_text=prompt_bundle.prompt_text,
                shot_prompts=prompt_bundle.shot_prompts,
                additional_description=generation.additional_description,
                regeneration_only_inputs=True,
                shot_types=effective_shot_types,
                workspace_root=workspace,
            )

            generation.status = "running"
            job.status = "running"
            job.current_stage = "stage_2"
            job.error_message = None
            await db.commit()
            log_monitor_task = asyncio.create_task(
                _monitor_job_log(job, ctx.job_log_file, log_stop_event, generation=generation, stage_1_enabled=False)
            )
            await emit_for_job(job, "stage_2", "running", f"Queued regeneration {generation.round_number}.", db)

            stage_2_result = await run_stage_2_only(ctx, None)
            for local_path_str in stage_2_result.get("generated_images", []):
                local_path = Path(local_path_str)
                await _upload_generated_image(db, job, local_path, generation=generation)

            log_stop_event.set()
            await log_monitor_task

            pricing_file, pricing_report = _write_pricing_file(job, workspace)
            await _upsert_pricing_snapshot(db, job, pricing_report)
            await _upload_job_support_files(db, job, log_file=ctx.job_log_file, pricing_file=pricing_file)

            generation.status = "completed"
            job.status = "completed"
            job.current_stage = "stage_2"
            job.error_message = None
            await db.commit()
            await emit_for_job(job, "stage_2", "completed", f"Regeneration {generation.round_number} completed.", db)
        except asyncio.CancelledError:
            try:
                log_stop_event.set()
                if log_monitor_task is not None:
                    await log_monitor_task
            except Exception:
                pass
            generation.status = "cancelled"
            await _restore_completed_job_after_regeneration_cancel(db, job)
            await emit_for_job(job, "stage_2", "cancelled", USER_CANCELLED_MESSAGE, db)
        except Exception as exc:
            try:
                log_stop_event.set()
                if log_monitor_task is not None:
                    await log_monitor_task
            except Exception:
                pass
            generation.status = "failed"
            job.status = "failed"
            job.error_message = str(exc)
            await db.commit()
            try:
                if ctx is not None:
                    await _upload_job_support_files(db, job, log_file=ctx.job_log_file, pricing_file=None)
            except Exception:
                pass
            await emit_for_job(job, "stage_2", "failed", str(exc), db)
            if isinstance(exc, PipelineStageError):
                return
            raise
        finally:
            RUNNING_REGENERATION_TASKS.pop((job_id, generation_id), None)


async def queue_pipeline_task(job_id: str) -> None:
    existing = RUNNING_PIPELINE_TASKS.get(job_id)
    if existing is not None and not existing.done():
        return
    task = asyncio.create_task(run_pipeline_task(job_id))
    RUNNING_PIPELINE_TASKS[job_id] = task


async def queue_regeneration_task(
    job_id: str,
    generation_id: str,
    image_model: str | None = None,
    shot_types: list[str] | None = None,
    requested_image_count: int | None = None,
) -> None:
    key = (job_id, generation_id)
    existing = RUNNING_REGENERATION_TASKS.get(key)
    if existing is not None and not existing.done():
        return
    task = asyncio.create_task(
        run_regeneration_task(job_id, generation_id, image_model, shot_types, requested_image_count)
    )
    RUNNING_REGENERATION_TASKS[key] = task


async def cancel_pipeline_task(job_id: str) -> bool:
    task = RUNNING_PIPELINE_TASKS.get(job_id)
    if task is None or task.done():
        return False
    task.cancel()
    return True


async def cancel_regeneration_task(job_id: str, generation_id: str) -> bool:
    task = RUNNING_REGENERATION_TASKS.get((job_id, generation_id))
    if task is None or task.done():
        return False
    task.cancel()
    return True


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
                "generation_id": asset.generation_id,
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
