import json
import os
import shutil
from datetime import UTC, datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import prepare_openai_batch

load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(title="ContentPro Batch Service", version="2.0.0")

frontend_url = os.getenv("FRONTEND_URL")
origins = [
    "https://content-pro-v2.vercel.app",
    "http://localhost:5173",
]
if frontend_url and frontend_url != "*" and frontend_url not in origins:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_DIR = Path(__file__).resolve().parent
WEB_UPLOADS_DIR = PROJECT_DIR / "web_uploads"
MAX_PRODUCTS_PER_SUB_BATCH = 7


# ── Supabase helpers ─────────────────────────────────────────────────────────

def _get_supabase_client():
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            return None
        return create_client(url, key)
    except Exception:
        return None


async def upload_png_to_supabase(local_path: Path, storage_path: str) -> str | None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        return None

    bucket = "contentpro-images"
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "image/png",
        "x-upsert": "true",
    }
    image_bytes = local_path.read_bytes()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(upload_url, content=image_bytes, headers=headers)
        if resp.status_code not in (200, 201):
            return None

    public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{storage_path}"
    return public_url


async def sync_results_to_supabase(
    result: dict,
    job_id: str,
) -> list[dict]:
    """Upload PNGs from download result to Supabase and insert batch_item_results rows."""
    client = _get_supabase_client()
    records = result.get("records", [])
    inserted: list[dict] = []

    for record in records:
        custom_id: str = record.get("custom_id", "")
        # custom_id format: {product_id}__{shot_variant}
        if "__" in custom_id:
            product_id, style_key = custom_id.rsplit("__", 1)
        else:
            product_id = custom_id
            style_key = "default"

        item_id = product_id
        images: list[str] = record.get("images", [])

        for idx, local_path_str in enumerate(images):
            local_path = Path(local_path_str)
            if not local_path.exists():
                continue

            storage_path = f"batch-results/{job_id}/{item_id}/{style_key}.png"
            if idx > 0:
                storage_path = f"batch-results/{job_id}/{item_id}/{style_key}_{idx + 1}.png"

            public_url = await upload_png_to_supabase(local_path, storage_path)
            if not public_url:
                continue

            if client:
                try:
                    client.table("batch_item_results").insert({
                        "batch_item_id": item_id,
                        "style_key": style_key,
                        "image_url": public_url,
                    }).execute()
                except Exception:
                    pass

            inserted.append({"item_id": item_id, "style_key": style_key, "url": public_url})

    return inserted


def update_job_status_in_supabase(job_id: str, status: str) -> None:
    client = _get_supabase_client()
    if not client or not job_id:
        return
    try:
        client.table("batch_jobs").update({
            "status": status,
            "updated_at": datetime.now(UTC).isoformat(),
        }).eq("id", job_id).execute()
    except Exception:
        pass


# ── Utility helpers ──────────────────────────────────────────────────────────

def sanitize_filename(name: str) -> str:
    return Path(name).name.replace(" ", "_")


def sanitize_relative_upload_path(name: str) -> Path:
    parts = [part for part in Path(name).parts if part not in {"", ".", ".."}]
    if not parts:
        raise ValueError("Invalid uploaded path.")
    cleaned = [part.replace("\\", "/").strip("/") for part in parts]
    relative = Path(*cleaned)
    if relative.is_absolute():
        raise ValueError("Absolute paths are not allowed.")
    return relative


def is_ignored_upload_relative_path(path: Path) -> bool:
    ignored_names = {".ds_store", "thumbs.db"}
    for part in path.parts:
        lowered = part.lower()
        if lowered in ignored_names:
            return True
        if lowered.startswith("._"):
            return True
    return False


def format_ui_error(exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    lowered = message.lower()
    if "openai" in lowered or "api key" in lowered:
        return f"OpenAI error: {message}"
    return message


def delete_local_batch_raw_inputs(run_dir: Path, upload_root: Path | None = None) -> None:
    processed_inputs_dir = run_dir / "processed_inputs"
    if processed_inputs_dir.exists():
        shutil.rmtree(processed_inputs_dir, ignore_errors=True)
    for nested in run_dir.rglob("processed_inputs"):
        shutil.rmtree(nested, ignore_errors=True)
    if upload_root is not None and upload_root.exists():
        shutil.rmtree(upload_root, ignore_errors=True)


def combine_cost_summaries(
    preparation_summary: dict | None,
    batch_summary: dict | None,
) -> dict | None:
    if not preparation_summary and not batch_summary:
        return None
    prep_cost = float(((preparation_summary or {}).get("preparation") or {}).get("actual_cost_usd") or 0.0)
    batch_cost = float((batch_summary or {}).get("actual_cost_usd") or 0.0)
    return {
        "pricing_basis_date": (batch_summary or preparation_summary or {}).get("pricing_basis_date"),
        "preparation_actual_cost_usd": round(prep_cost, 6),
        "batch_execution_actual_cost_usd": round(batch_cost, 6),
        "whole_process_actual_cost_usd": round(prep_cost + batch_cost, 6),
    }


def combine_preparation_summaries(summaries: list[dict | None]) -> dict | None:
    valid = [s for s in summaries if s]
    if not valid:
        return None
    pricing_basis_date = None
    total_cost = 0.0
    cache_hits = 0
    cache_misses = 0
    prep_records: list = []
    for summary in valid:
        if pricing_basis_date is None:
            pricing_basis_date = summary.get("pricing_basis_date")
        preparation = (summary or {}).get("preparation") or {}
        total_cost += float(preparation.get("actual_cost_usd") or 0.0)
        cache_hits += int(preparation.get("cache_hits") or 0)
        cache_misses += int(preparation.get("cache_misses") or 0)
        prep_records.extend(preparation.get("records") or [])
    return {
        "pricing_basis_date": pricing_basis_date,
        "preparation": {
            "actual_cost_usd": round(total_cost, 6),
            "records": prep_records,
            "cache_hits": cache_hits,
            "cache_misses": cache_misses,
        },
    }


def chunk_rows(rows: list[dict], chunk_size: int) -> list[list[dict]]:
    safe = max(1, int(chunk_size))
    return [rows[i: i + safe] for i in range(0, len(rows), safe)]


def submit_chunked_batch_rows(
    *,
    rows: list[dict],
    run_dir: Path,
    completion_window: str,
    input_fidelity: str,
    image_count: int,
    chunk_size: int = MAX_PRODUCTS_PER_SUB_BATCH,
) -> dict:
    if not rows:
        raise ValueError("No rows available to submit.")

    chunks = chunk_rows(rows, chunk_size)
    batch_records: list[dict] = []
    preparation_summaries: list[dict | None] = []

    for index, chunk in enumerate(chunks, start=1):
        chunk_dir = run_dir / f"chunk_{index:03d}"
        chunk_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = prepare_openai_batch.write_manifest(chunk, chunk_dir / "auto_manifest.csv")
        prepared = prepare_openai_batch.prepare_batch_with_options(
            manifest_path,
            chunk_dir,
            input_fidelity=input_fidelity,
            image_count=image_count,
        )
        submitted = prepare_openai_batch.submit_batch(
            Path(prepared["requests_jsonl"]),
            completion_window,
        )
        submission_payload = {
            "batch_id": submitted["batch_id"],
            "input_file_id": submitted["input_file_id"],
            "submitted_at_utc": datetime.now(UTC).isoformat(),
            "chunk_index": index,
            "chunk_size": len(chunk),
            "product_ids": [row.get("product_id", "") for row in chunk],
        }
        prepare_openai_batch.write_json(chunk_dir / "submission.json", submission_payload)
        preparation_summaries.append(prepared.get("cost_summary"))
        batch_records.append({
            "label": f"Batch {index}/{len(chunks)}",
            "chunk_index": index,
            "chunk_size": len(chunk),
            "product_ids": [row.get("product_id", "") for row in chunk],
            "batch_id": submitted["batch_id"],
            "input_file_id": submitted["input_file_id"],
            "status": submitted["status"],
            "completion_window": completion_window,
            "cost_summary": combine_cost_summaries(prepared.get("cost_summary"), None),
        })

    combined_prep = combine_preparation_summaries(preparation_summaries)
    return {
        "message": "Batches submitted successfully." if len(batch_records) > 1 else "Batch submitted successfully.",
        "output_run_dir": str(run_dir),
        "row_count": len(rows),
        "sub_batch_count": len(batch_records),
        "chunk_size": chunk_size,
        "batch_ids": [str(r["batch_id"]) for r in batch_records],
        "batches": batch_records,
        "cost_summary": combine_cost_summaries(combined_prep, None),
    }


def find_batch_run_dir(batch_id: str) -> Path | None:
    runs_root = PROJECT_DIR / "output" / "openai_batch"
    if not runs_root.exists():
        return None
    for submission_path in sorted(runs_root.rglob("submission.json"), reverse=True):
        try:
            payload = json.loads(submission_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if payload.get("batch_id") == batch_id:
            return submission_path.parent
    return None


def load_json_if_exists(path: Path) -> dict | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


# ── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup() -> None:
    WEB_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    (PROJECT_DIR / "output" / "openai_batch").mkdir(parents=True, exist_ok=True)
    (PROJECT_DIR / "output" / "openai_batch_downloads").mkdir(parents=True, exist_ok=True)
    (PROJECT_DIR / "kyc_cache").mkdir(parents=True, exist_ok=True)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}


@app.post("/batch/folder-upload")
async def submit_batch_folder_upload(
    files: list[UploadFile] = File(...),
    scene_brief: str = Form("Create a premium ecommerce product image with a clean premium background."),
    product_category: str = Form("pets_accessories"),
    completion_window: str = Form("24h"),
    input_fidelity: str = Form("low"),
    image_count: int = Form(1),
    job_id: str = Form(""),
) -> JSONResponse:
    if not files:
        raise HTTPException(status_code=400, detail="Please provide at least one product image.")

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    upload_root = WEB_UPLOADS_DIR / timestamp
    upload_root.mkdir(parents=True, exist_ok=True)

    saved_files: list[str] = []
    try:
        for upload in files:
            relative_path = sanitize_relative_upload_path(upload.filename or "")
            if is_ignored_upload_relative_path(relative_path):
                continue
            suffix = relative_path.suffix.lower()
            if suffix and suffix not in prepare_openai_batch.SUPPORTED_IMAGE_EXTS and relative_path.name.lower() not in {"kyc.txt", "kyc.md"}:
                continue
            target = upload_root / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(await upload.read())
            saved_files.append(str(target))

        run_dir = PROJECT_DIR / "output" / "openai_batch" / timestamp
        run_dir.mkdir(parents=True, exist_ok=True)

        rows = prepare_openai_batch.build_manifest_rows_from_input_root(upload_root, scene_brief, product_category)
        prepare_openai_batch.write_manifest(rows, run_dir / "auto_manifest.csv")
        result = submit_chunked_batch_rows(
            rows=rows,
            run_dir=run_dir,
            completion_window=completion_window,
            input_fidelity=input_fidelity,
            image_count=image_count,
        )
        delete_local_batch_raw_inputs(run_dir, upload_root)

        return JSONResponse({
            "uploaded_file_count": len(saved_files),
            "job_id": job_id,
            **result,
        })
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=format_ui_error(exc)) from exc


@app.get("/batch/{batch_id}")
async def get_batch_status(batch_id: str) -> JSONResponse:
    try:
        batch = prepare_openai_batch.get_batch_status(batch_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=format_ui_error(exc)) from exc

    return JSONResponse({
        "batch_id": batch["batch_id"],
        "status": batch["status"],
        "input_file_id": batch["input_file_id"],
        "output_file_id": batch["output_file_id"],
        "error_file_id": batch["error_file_id"],
        "created_at": batch["created_at"],
        "in_progress_at": batch["in_progress_at"],
        "completed_at": batch["completed_at"],
        "failed_at": batch["failed_at"],
        "request_counts": batch["request_counts"],
        "errors": batch.get("errors"),
    })


@app.post("/batch/{batch_id}/download")
async def download_batch(batch_id: str, payload: dict = None) -> JSONResponse:
    if payload is None:
        payload = {}
    job_id: str = payload.get("job_id", "")

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_dir = PROJECT_DIR / "output" / "openai_batch_downloads" / f"{timestamp}_{batch_id}"
    run_dir.mkdir(parents=True, exist_ok=True)

    try:
        result = prepare_openai_batch.download_batch_results(batch_id, run_dir)

        original_run_dir = find_batch_run_dir(batch_id)
        preparation_cost = None
        if original_run_dir is not None:
            preparation_cost = load_json_if_exists(original_run_dir / "cost_summary.json")
        combined_cost = combine_cost_summaries(
            preparation_cost,
            result.get("cost_summary") if isinstance(result, dict) else None,
        )

        # Upload results to Supabase and insert DB rows
        supabase_records = await sync_results_to_supabase(result, job_id or batch_id)
        final_status = "completed" if result.get("saved_count", 0) > 0 else "failed"
        if job_id:
            update_job_status_in_supabase(job_id, final_status)

    except ValueError as exc:
        if job_id:
            update_job_status_in_supabase(job_id, "failed")
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        if job_id:
            update_job_status_in_supabase(job_id, "failed")
        raise HTTPException(status_code=500, detail=format_ui_error(exc)) from exc

    return JSONResponse({
        "message": "Batch results downloaded successfully.",
        "batch_id": batch_id,
        "job_id": job_id,
        "download_dir": str(run_dir),
        "cost_summary": combined_cost,
        "supabase_uploads": len(supabase_records),
        "result": result,
    })


@app.post("/batch/csv")
async def submit_batch_csv(
    manifest_csv: UploadFile = File(...),
    completion_window: str = Form("24h"),
    input_fidelity: str = Form("low"),
    image_count: int = Form(1),
    product_category: str = Form("pets_accessories"),
    job_id: str = Form(""),
) -> JSONResponse:
    suffix = Path(manifest_csv.filename or "").suffix.lower()
    if suffix != ".csv":
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_dir = PROJECT_DIR / "output" / "openai_batch" / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = run_dir / sanitize_filename(manifest_csv.filename or "manifest.csv")
    manifest_path.write_bytes(await manifest_csv.read())

    try:
        rows = prepare_openai_batch.load_manifest(manifest_path)
        result = submit_chunked_batch_rows(
            rows=rows,
            run_dir=run_dir,
            completion_window=completion_window,
            input_fidelity=input_fidelity,
            image_count=image_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=format_ui_error(exc)) from exc

    return JSONResponse({"manifest": str(manifest_path), "job_id": job_id, **result})
