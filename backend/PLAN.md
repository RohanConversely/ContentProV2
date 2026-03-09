# Backend Implementation Plan

## Table of Contents
1. [Folder Structure](#folder-structure)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Pipeline Integration Tasks](#pipeline-integration-tasks)
6. [File-by-File Build Tasks](#file-by-file-build-tasks)
7. [Storage Layout (DO Spaces)](#storage-layout-do-spaces)
8. [Environment Variables](#environment-variables)
9. [Deployment Order](#deployment-order)
10. [Open Questions / Decisions](#open-questions--decisions)

---

## Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app factory, mounts routers
│   ├── config.py                   # Pydantic Settings, reads from .env
│   ├── database.py                 # SQLAlchemy async engine + session factory
│   ├── models/
│   │   ├── __init__.py
│   │   ├── job.py                  # Job ORM model
│   │   ├── asset.py                # Asset ORM model (images, videos, audio)
│   │   └── pricing.py              # Pricing snapshot ORM model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── job.py                  # Pydantic request/response schemas for jobs
│   │   └── asset.py                # Pydantic schemas for assets
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── jobs.py                 # Job CRUD + trigger endpoints
│   │   └── assets.py               # Asset upload, list, presigned URL endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── storage.py              # DO Spaces (S3-compatible) upload/download/presign
│   │   └── pipeline_runner.py      # asyncio background tasks: calls pipeline/orchestrator.py
│   └── utils/
│       ├── __init__.py
│       └── presigned_urls.py       # Helper to generate time-limited access URLs
│
├── pipeline/                       # Cleaned copy of imageGenScript/pipeline/
│   ├── __init__.py
│   ├── orchestrator.py             # Refactored main_sora.py — no argparse, no subprocess
│   ├── logger.py                   # JsonLogger (unchanged from original)
│   ├── pricing.py                  # job_pricing.py (unchanged from original)
│   ├── stages/
│   │   ├── __init__.py
│   │   ├── product_kyc.py          # Stage 1 — GPT-4.1-mini KYC generation
│   │   ├── image_gen.py            # Stage 2 — gpt-image-1 A+ content image gen
│   │   ├── video_prompt.py         # Stage 3 (video only) — GPT-4.1-mini video prompt gen
│   │   ├── video_gen.py           # Stage 4 (video only) — Veo video generation [ACTIVE]
│   │   ├── video_gen_sora.py       # Stage 4 alt — Sora 2 video generation [INACTIVE, kept for later]
│   │   ├── video_trim_concat.py    # Stage 5 (video only) — Trim each video to 5s, concatenate all
│   │   └── video_audio_replace.py  # Stage 6 (video only) — Strip existing audio, apply user-selected audio
│   └── prompts/
│       ├── imageKYC.txt
│       ├── ImageWithKYCTesting.txt
│       └── perImagePromptGen.txt
│
├── migrations/                     # Alembic migration scripts
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│
├── .env                            # Secrets — never commit
├── .env.example                    # Template with all required keys
├── .gitignore
├── Dockerfile
├── docker-compose.yml              # Postgres + Redis + backend service
├── requirements.txt                # All Python dependencies
├── alembic.ini
└── PLAN.md                         # This file
```

---

## Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **FastAPI** | Async, auto OpenAPI docs, Pydantic v2 |
| Database | **PostgreSQL 16** (DO Managed) | JSONB for metadata, full ACID |
| ORM | **SQLAlchemy 2.x async** | Works with asyncpg driver |
| Migrations | **Alembic** | Schema versioning |
| Async tasks | **asyncio + FastAPI BackgroundTasks** | All pipeline stages are I/O-bound (OpenAI/Veo API calls); no Celery overhead needed |
| Real-time updates | **Server-Sent Events (SSE)** | Stream job status from backend to frontend via `GET /jobs/{job_id}/events` |
| File Storage | **DigitalOcean Spaces** (S3-compatible) | Images, videos, audio, KYC JSONs |
| S3 Client | **boto3** | DO Spaces is fully S3v4 compatible |
| Auth | **JWT (python-jose) + Google OAuth** | Stateless; store user_id on jobs; Google SSO for user authentication |
| Containerization | **Docker + docker-compose** | Local dev and DO App Platform |

---

## Database Schema

```mermaid
erDiagram
    USERS {
        uuid id PK
        text email UK "not null"
        text google_id "unique, nullable — for Google OAuth"
        text hashed_password "nullable — only for email/password auth"
        text display_name
        text avatar_url
        text plan "free|pro"
        timestamptz created_at
        timestamptz updated_at
    }

    JOBS {
        uuid id PK
        text job_id UK "e.g. 20260309T044859Z_1ad3bfa9"
        uuid user_id FK
        text brand_name "not null"
        text brand_website "not null"
        text product_name "not null"
        text product_category "not null"
        text job_type "image|video — determines pipeline path"
        text social_link_1
        text social_link_2
        text social_link_3
        text social_link_4
        int  video_duration_seconds "default 8"
        text status "pending|running|stage_1_done|stage_2_done|stage_3_done|stage_4_done|stage_5_done|awaiting_audio|completed|failed"
        text current_stage "stage_1|stage_2|stage_3|stage_4|stage_5|stage_6|pricing"
        text error_message
        text storage_prefix "jobs/{job_id}/ in DO Spaces"
        timestamptz created_at
        timestamptz updated_at
    }

    ASSETS {
        uuid id PK
        uuid job_id FK
        text asset_type "raw_image|kyc_json|generated_image|video_prompt|raw_video|trimmed_video|compiled_video|user_audio|final_video"
        text stage "stage_1|stage_2|stage_3|stage_4|stage_5|stage_6"
        text storage_key "full path in DO Spaces bucket"
        text original_filename
        text mime_type "image/png|video/mp4|application/json|audio/mpeg"
        bigint size_bytes
        jsonb metadata "e.g. {width, height, duration_seconds, model_used}"
        boolean is_deleted "soft delete"
        timestamptz created_at
    }

    PRICING_SNAPSHOTS {
        uuid id PK
        uuid job_id FK "unique — one per job"
        jsonb raw_price_data "full price.json output"
        numeric total_cost_usd "6 decimal places"
        numeric stage_1_cost_usd
        numeric stage_2_cost_usd
        numeric stage_3_cost_usd
        numeric stage_4_cost_usd
        integer total_input_tokens
        integer total_output_tokens
        timestamptz created_at
    }

    PIPELINE_LOGS {
        uuid id PK
        uuid job_id FK
        text level "DEBUG|INFO|WARNING|ERROR"
        text stage
        text message
        jsonb context
        timestamptz logged_at
    }

    USERS ||--o{ JOBS : "creates"
    JOBS ||--o{ ASSETS : "produces"
    JOBS ||--o| PRICING_SNAPSHOTS : "has"
    JOBS ||--o{ PIPELINE_LOGS : "generates"
```

### Index Strategy

```sql
-- Fast job lookup by user
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
-- Status polling (frontend polling job status)
CREATE INDEX idx_jobs_status ON jobs(status);
-- Asset retrieval by job + type
CREATE INDEX idx_assets_job_id ON assets(job_id);
CREATE INDEX idx_assets_job_type ON assets(job_id, asset_type);
-- Log tailing by job
CREATE INDEX idx_pipeline_logs_job_id_time ON pipeline_logs(job_id, logged_at DESC);
```

---

## API Endpoints

### Auth  `POST /auth/register`
```
Body: { email, password, display_name }
Returns: { user_id, email, access_token }
```

### Auth  `POST /auth/login`
```
Body: { email, password }
Returns: { access_token, token_type: "bearer" }
```

### Auth  `POST /auth/google`
```
Body: { id_token: string }
Action: Verify Google OAuth ID token, create user if not exists, return JWT
Returns: { user_id, email, display_name, access_token, token_type: "bearer" }
```

### Auth  `GET /auth/me`
```
Auth: Bearer token
Returns: { user_id, email, display_name, plan, member_since }
```

---

### Jobs  `POST /jobs`
```
Auth: Bearer token
Body: {
  job_type: "image" | "video",
  brand_name, brand_website, product_name, product_category,
  social_link_1?, social_link_2?, social_link_3?, social_link_4?,
  video_duration_seconds?   (video jobs only, default 8)
}
Action: Creates job row (status=pending), kicks off Stage 1 as asyncio background task.
        Pipeline flow is determined by job_type at creation and cannot be changed.
Returns: { job_id, status, job_type, created_at }
```

### Jobs  `GET /jobs`
```
Auth: Bearer token
Query: ?status=completed&page=1&page_size=20
Returns: paginated list of jobs for the authenticated user
```

### Jobs  `GET /jobs/recent`
```
Auth: Bearer token
Query: ?limit=4
Returns: [{ id, name, genre, theme, images, date, status }, ...]
```

### Jobs  `GET /jobs/{job_id}`
```
Auth: Bearer token
Returns: full job detail including assets list and pricing snapshot
```

### Jobs  `GET /jobs/{job_id}/events`
```
Auth: Bearer token
Protocol: Server-Sent Events (SSE) — keep connection open
Action: Streams real-time stage progress to the frontend.
        Each event: { event: "status", data: { stage, status, message, timestamp } }
        Terminal events: status=completed or status=failed close the stream.
Usage: Frontend subscribes immediately after POST /jobs. No polling needed.
```

### Jobs  `POST /jobs/{job_id}/apply-audio`
```
Auth: Bearer token
Body: multipart/form-data — audio_file (mp3/wav/aac)
Precondition: job must be in status=awaiting_audio (Stage 5 / compile complete)
Action: Uploads user-selected audio to DO Spaces at jobs/{job_id}/stage_6/audio.{ext}
        Creates asset row (asset_type=user_audio)
        Triggers Stage 6 (video_audio_replace) as background task
Returns: { job_id, status: "running", current_stage: "stage_6" }
```

### Jobs  `DELETE /jobs/{job_id}`
```
Auth: Bearer token
Action: Soft-deletes job; marks all assets as is_deleted=true
Returns: { ok: true }
```

### Jobs  `POST /jobs/{job_id}/assets`
```
Auth: Bearer token
Body: multipart/form-data — file (product image)
Action: Uploads raw product image to DO Spaces at jobs/{job_id}/raw/{filename}
        Creates asset row (asset_type=raw_image) in DB
Returns: { asset_id, storage_key, mime_type, url }
```

---

### Usage  `GET /usage`
```
Auth: Bearer token
Returns: { plan, credits_used, credits_total, images_this_month, videos_this_month, reset_date }
```

### Usage  `GET /benefits`
```
Auth: Bearer token
Returns: [ "Unlimited images per month", "Unlimited videos per month", ... ]
```

---

### Audio  `GET /audio/tracks`
```
Auth: Bearer token
Returns: { trending: [{ id, title, artist, duration, mood, source }], royalty_free: [...] }
```

---

### Video  `GET /video/presets`
```
Auth: Bearer token
Returns: { durations: [{ value, label, desc }], styles: [{ id, label, desc }] }
```

---

### Assets  `POST /jobs/{job_id}/assets/upload`
```
Auth: Bearer token
Body: multipart/form-data — file + asset_type + stage
Action: Uploads raw product image to DO Spaces at jobs/{job_id}/raw/{filename}
        Creates asset row in DB
Returns: { asset_id, storage_key, mime_type }
```

### Assets  `GET /jobs/{job_id}/assets`
```
Auth: Bearer token
Query: ?asset_type=generated_image
Returns: list of assets with presigned download URLs (1hr expiry)
```

### Assets  `GET /jobs/{job_id}/assets/{asset_id}/url`
```
Auth: Bearer token
Returns: { url, expires_at } — fresh presigned URL for the asset
```

---

### Pricing  `GET /jobs/{job_id}/pricing`
```
Auth: Bearer token
Returns: full pricing snapshot (raw_price_data + per-stage breakdown)
```

---

### Health  `GET /health`
```
No auth
Returns: { status: "ok", db: "ok", redis: "ok" }
```

---

## Pipeline Integration Tasks

These are the code changes needed to make the copied pipeline files work as library functions rather than CLI scripts.

### 1. Refactor each stage to a pure `run()` function
Each file in `pipeline/stages/` currently has a `main()` with `argparse`. Replace with:
```python
# Standard interface for every stage
async def run(config: StageConfig, logger: JsonLogger) -> StageResult:
    ...
```
Remove: `argparse`, `sys.exit()`, `RESULT_PREFIX` stdout hack, `if __name__ == "__main__"` block.
Replace: `sys.exit(1)` → `raise PipelineStageError("message")`.

### 2. Create a `JobContext` dataclass in `pipeline/orchestrator.py`
```python
@dataclass
class JobContext:
    job_id: str
    job_type: str          # "image" | "video"
    job_dir: Path          # per-job tempfile.mkdtemp() directory, cleaned up on completion
    brand_name: str
    brand_website: str
    product_name: str
    product_category: str
    social_link_1: str | None
    social_link_2: str | None
    social_link_3: str | None
    social_link_4: str | None
    video_duration_seconds: int    # video jobs only
    raw_image_path: Path           # downloaded from DO Spaces into job_dir
```

The orchestrator receives all these values from the API layer (populated from the DB record after `POST /jobs`). No argparse or CLI input anywhere in the pipeline.

### 3. Fully automatic pipeline — no stage gates
There are no user confirmation steps between stages. The orchestrator runs stages sequentially in the background:

**Image job flow:**
```
Stage 1 (KYC) → auto → Stage 2 (image gen) → DONE
```

**Video job flow:**
```
Stage 1 (KYC) → auto → Stage 2 (image gen) → auto → Stage 3 (video prompts) → auto →
Stage 4 (video gen via Veo) → auto → Stage 5 (trim 5s + concat) → status=awaiting_audio
     ↓ user uploads audio via POST /jobs/{job_id}/apply-audio
Stage 6 (audio replace) → DONE
```

The `confirm_stage()` function is removed entirely. SSE events are emitted at the start and end of every stage so the frontend can track progress in real time.

### 4. Replace subprocess calls with direct function calls
```python
# BEFORE (current orchestrator)
result = subprocess.run([sys.executable, "product_kyc.py", ...])

# AFTER
from pipeline.stages.product_kyc import run as run_kyc
result = await run_kyc(ctx, logger)
```

### 5. Upload all stage outputs to DO Spaces
After each stage, call `app.services.storage.upload_file()` and write an asset row to the DB.

### 6. Temp directory per job
Use `tempfile.mkdtemp()` at the start of each pipeline run to create an isolated scratch directory:
```python
import tempfile, shutil
ctx.job_dir = Path(tempfile.mkdtemp(prefix=f"contentpro_{job_id}_"))
try:
    await run_pipeline(ctx, ...)
finally:
    shutil.rmtree(ctx.job_dir, ignore_errors=True)  # always clean up
```
This avoids any shared state between concurrent jobs running on the same worker.

### 7. Video generation engine — Veo (active), Sora (standby)
Both `pipeline/stages/video_gen.py` (Veo) and `pipeline/stages/video_gen_sora.py` are present.
- **`video_gen.py`** is the active implementation using Veo, used by the orchestrator.
- **`video_gen_sora.py`** is kept as-is for future use. To switch engines, change one import line in `orchestrator.py`. No other code changes needed.

### 8. New Stage 5 — `video_trim_concat.py`
- Iterates over all raw video files output by Stage 4 (one per generated image).
- Trims each video to exactly **5 seconds** using `ffmpeg` (via `ffmpeg-python` or subprocess).
- Concatenates all trimmed clips into a single `compiled.mp4` in `job_dir/stage_5/`.
- Uploads `compiled.mp4` to DO Spaces at `jobs/{job_id}/stage_5/compiled.mp4`.
- Writes asset row (`asset_type=compiled_video`).
- On completion, sets `job.status = "awaiting_audio"`.

### 9. New Stage 6 — `video_audio_replace.py`
- Triggered by `POST /jobs/{job_id}/apply-audio` after user uploads their chosen audio.
- Downloads `compiled.mp4` (Stage 5 output) and the user audio file from DO Spaces into `job_dir/stage_6/`.
- Strips any existing audio track from `compiled.mp4`.
- Mixes in the user-provided audio (trimmed/looped to match video duration if needed).
- Outputs `final.mp4` and uploads to DO Spaces at `jobs/{job_id}/stage_6/final.mp4`.
- Writes asset row (`asset_type=final_video`).
- Sets `job.status = "completed"`.

### 6. Fix `prompts/` path resolution
Current stages use `Path(__file__).parent / "prompts"`. This still works since the prompts folder is at `pipeline/prompts/` relative to each stage. No change needed.

### 7. Fix `logger.py` global log path
`JsonLogger` defaults to `storage/logs/execution.log` — change the default to an absolute path derived from project root or pass it explicitly from the orchestrator.

---

## File-by-File Build Tasks

### `app/config.py`
- [ ] Define `Settings` class using `pydantic-settings`
- [ ] Load: `DATABASE_URL`, `REDIS_URL`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION`, `DO_SPACES_BUCKET`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`

### `app/database.py`
- [ ] Create async SQLAlchemy engine using `asyncpg`
- [ ] Define `AsyncSession` factory
- [ ] Define `Base` declarative base

### `app/models/job.py`
- [ ] Define `Job` ORM model matching schema above

### `app/models/asset.py`
- [ ] Define `Asset` ORM model

### `app/models/pricing.py`
- [ ] Define `PricingSnapshot` ORM model
- [ ] Define `PipelineLog` ORM model

### `app/schemas/job.py`
- [ ] `JobCreateRequest` — input validation
- [ ] `JobResponse` — output with nested assets
- [ ] `JobAdvanceRequest` — `{ confirm: bool }`
- [ ] `JobListResponse` — paginated wrapper

### `app/schemas/asset.py`
- [ ] `AssetResponse` — includes `presigned_url`

### `app/services/storage.py`
- [ ] Initialize `boto3` S3 client pointed at DO Spaces endpoint
- [ ] `upload_file(local_path, storage_key, mime_type) -> str`
- [ ] `upload_bytes(data: bytes, storage_key, mime_type) -> str`
- [ ] `get_presigned_url(storage_key, expires_in=3600) -> str`
- [ ] `delete_file(storage_key) -> bool`

### `app/services/pipeline_runner.py`
- [ ] Define `async def run_pipeline_task(job_id: str, db: AsyncSession)` — plain async function, no Celery
  - Loads job row from DB by `job_id`
  - Creates `JobContext` from DB fields, sets `job_dir = Path(tempfile.mkdtemp(...))`
  - Downloads raw image from Spaces into `job_dir`
  - Calls `pipeline/orchestrator.py::run_pipeline(ctx, db, sse_emitter)`
  - Orchestrator emits SSE events at each stage transition via `sse_emitter`
  - Uploads outputs to Spaces and writes asset rows after each stage
  - Writes pricing snapshot to DB on completion
  - On failure: sets `job.status = "failed"`, emits SSE error event, logs error
  - `finally`: calls `shutil.rmtree(ctx.job_dir)` to clean up temp files
- [ ] Define `async def run_audio_task(job_id: str, audio_asset_id: str, db: AsyncSession)`
  - Triggered by `POST /jobs/{job_id}/apply-audio`
  - Runs Stage 6 (`video_audio_replace`) against the compiled video and uploaded audio

### `app/utils/presigned_urls.py`
- [ ] `generate_url(asset: Asset) -> str` — thin wrapper around storage service

### `app/routers/jobs.py`
- [ ] Implement all 5 job endpoints listed above
- [ ] Use `Depends(get_db)` for DB sessions
- [ ] Use `Depends(get_current_user)` for auth

### `app/routers/assets.py`
- [ ] Implement all 3 asset endpoints listed above

### `app/main.py`
- [ ] Create FastAPI app instance
- [ ] Mount `jobs` and `assets` routers
- [ ] Add CORS middleware (allow frontend origin)
- [ ] Add `/health` endpoint

### `pipeline/orchestrator.py`
- [ ] Remove `argparse`, `main()`, `confirm_stage()`, `RESULT_PREFIX`, all `subprocess.run()` calls
- [ ] Remove `sys.exit()` — replace with `raise PipelineStageError(...)`
- [ ] Define `JobContext` dataclass (see Pipeline Integration Tasks §2)
- [ ] Define `async def run_pipeline(ctx: JobContext, db: AsyncSession, emit) -> dict`
  - `emit(stage, status, message)` is a callable passed in from `pipeline_runner.py` that pushes SSE events
  - Branching logic:
    - All jobs: Stage 1 → Stage 2
    - `job_type == "image"`: stop, mark completed
    - `job_type == "video"`: Stage 3 → Stage 4 → Stage 5 → set `awaiting_audio`, stop
- [ ] Define `async def run_audio_stage(ctx: JobContext, audio_path: Path, db: AsyncSession, emit) -> dict`
  - Runs Stage 6 independently, triggered by the audio upload endpoint

### `pipeline/stages/product_kyc.py`
- [ ] Extract `generate_image_kyc()` as the exported function
- [ ] Remove `main()`, `argparse`, `sys.exit()`, `RESULT_PREFIX`
- [ ] Return result dict instead of printing it

### `pipeline/stages/image_gen.py`
- [ ] Extract `generate_images()` as the exported function
- [ ] Same cleanup as above

### `pipeline/stages/video_prompt.py`
- [ ] Extract core prompt generation function
- [ ] Same cleanup as above

### `pipeline/stages/video_gen.py`
- [ ] Create new file adapting Veo API calls into the standard `async def run(ctx, logger) -> StageResult` interface
- Outputs one video file per generated image (Stage 2 output)
- Stores raw video files in `ctx.job_dir/stage_4/`
- Note: This file uses Veo for video generation

### `pipeline/stages/video_gen_sora.py`
- [ ] Keep file as-is (already copied)
- [ ] No active integration — standby for future use
- [ ] Add a module-level comment: `# INACTIVE — use video_gen.py (Veo). Switch import in orchestrator.py to activate.`

### `pipeline/stages/video_trim_concat.py`  _(new)_
- [ ] Create new file
- [ ] Dependency: `ffmpeg` must be installed on the worker host; use `ffmpeg-python` library
- [ ] `async def run(ctx: JobContext, logger) -> StageResult`
  - Input: list of raw `.mp4` files from `ctx.job_dir/stage_4/`
  - Trim each to 5 seconds: `ffmpeg -t 5 -i input.mp4 output_trimmed.mp4`
  - Concatenate using ffmpeg concat demuxer → `compiled.mp4`
  - Upload `compiled.mp4` to DO Spaces; write asset row
  - Return path to `compiled.mp4`

### `pipeline/stages/video_audio_replace.py`  _(new)_
- [ ] Create new file
- [ ] `async def run(ctx: JobContext, audio_path: Path, logger) -> StageResult`
  - Input: `compiled.mp4` (from Stage 5 DO Spaces), user audio file (downloaded from DO Spaces)
  - Strip audio: `ffmpeg -an -i compiled.mp4 no_audio.mp4`
  - Mix audio: `ffmpeg -i no_audio.mp4 -i user_audio.{ext} -shortest final.mp4`
  - Upload `final.mp4` to DO Spaces; write asset row (`asset_type=final_video`)
  - Set `job.status = "completed"`

### `migrations/`
- [ ] Run `alembic init migrations`
- [ ] Update `alembic.ini` and `migrations/env.py` to use `DATABASE_URL` from `.env`
- [ ] Generate initial migration: `alembic revision --autogenerate -m "initial"`
- [ ] Apply: `alembic upgrade head`

### `requirements.txt`
- [ ] Add to existing pipeline deps:
  - `fastapi>=0.115`
  - `uvicorn[standard]`
  - `sse-starlette`         ← SSE support for FastAPI
  - `sqlalchemy[asyncio]>=2.0`
  - `asyncpg`
  - `alembic`
  - `boto3`
  - `pydantic-settings`
  - `python-jose[cryptography]`
  - `passlib[bcrypt]`
  - `python-multipart`
  - `ffmpeg-python`         ← for Stage 5 and Stage 6 video processing

### `Dockerfile`
- [ ] Multi-stage build: deps layer + app layer
- [ ] Expose port 8000
- [ ] Entrypoint: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### `docker-compose.yml`
- [ ] `backend` service (this app) — uvicorn, port 8000
- [ ] `postgres` service (local dev only — prod uses DO Managed DB)
- [ ] Note: no Celery worker service needed; pipeline runs as asyncio background tasks within the FastAPI process
- [ ] Ensure `ffmpeg` is installed in the Docker image (add `RUN apt-get install -y ffmpeg` to Dockerfile)

---

## Storage Layout (DO Spaces)

All files are stored under a single private bucket. Objects are never public; access is always via presigned URLs.

```
{DO_SPACES_BUCKET}/
└── jobs/
    └── {job_id}/
        ├── raw/
        │   └── {original_filename}.{ext}       ← uploaded by user before Stage 1
        ├── stage_1/
        │   ├── {brand}_{product}_kyc.json       ← KYC output
        │   └── {brand}_{product}_kyc_filtered.json
        ├── stage_2/
        │   ├── generated_001.png                ← image jobs end here
        │   ├── generated_002.png
        │   ├── generated_003.png
        │   └── generated_004.png
        ├── stage_3/                             ← video jobs only from here
        │   └── {image_stem}_prompt.json
        ├── stage_4/
        │   ├── clip_001.mp4                     ← one raw video per generated image
        │   ├── clip_002.mp4
        │   ├── clip_003.mp4
        │   └── clip_004.mp4
        ├── stage_5/
        │   └── compiled.mp4                     ← trimmed (5s each) + concatenated
        └── stage_6/
            ├── user_audio.{ext}                 ← uploaded by user after stage 5
            └── final.mp4                        ← compiled + user audio applied
```

MIME type → `asset_type` mapping:
```
image/png, image/jpeg  → raw_image  (raw/)   or  generated_image (stage_2/)
application/json       → kyc_json   (stage_1/) or  video_prompt   (stage_3/)
video/mp4              → raw_video  (stage_4/) or  compiled_video (stage_5/) or  final_video (stage_6/)
audio/*                → user_audio (stage_6/)
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```dotenv
# ── App ──────────────────────────────────────────────────────────────
JWT_SECRET=<random 32+ char secret>
JWT_EXPIRE_MINUTES=1440

# ── Auth ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=<Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>

# ── Database ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/contentpro

# ── (Redis not required — no Celery) ─────────────────────────────────
# REDIS_URL only needed if you later add Celery or Redis caching
# REDIS_URL=redis://localhost:6379/0

# ── DigitalOcean Spaces ───────────────────────────────────────────────
DO_SPACES_KEY=<DO Spaces access key>
DO_SPACES_SECRET=<DO Spaces secret key>
DO_SPACES_REGION=blr1          # or nyc3, sfo3, etc.
DO_SPACES_BUCKET=contentpro-assets

# ── AI APIs ───────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# ── CORS ──────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-domain.com
```

---

## Deployment Order

Follow this order strictly. The app will crash on startup if DB or Spaces are not ready.

```
Step 1 ── Provision DO Managed PostgreSQL
           Note the connection string → DATABASE_URL

Step 2 ── Provision DO Managed Redis (or deploy Redis on same Droplet)
           Note the URL → REDIS_URL

Step 3 ── Create DO Spaces bucket
           Create API key pair → DO_SPACES_KEY / DO_SPACES_SECRET
           Enable CDN (optional, for faster video delivery)

Step 4 ── Set all environment variables in DO App Platform
           (or in .env if using Droplet + Docker)

Step 5 ── Run Alembic migrations against the managed DB
           alembic upgrade head

Step 6 ── Deploy backend (DO App Platform → Web Service)
           uvicorn app.main:app --host 0.0.0.0 --port 8000

Step 7 ── (No separate worker needed)
           Pipeline tasks run as asyncio background tasks inside the FastAPI process.

Step 8 ── Deploy frontend (DO App Platform → Static Site)
           Point API_BASE_URL to backend service URL

Step 9 ── Smoke test: POST /jobs with a sample product image
```

---

## Decisions Log

| Decision | Choice | Notes |
|---|---|---|
| **Auth scope** | Multi-user SaaS | Full JWT auth with `users` table; every job is scoped to a `user_id` |
| **Auth method** | JWT + Google OAuth | Email/password registration + Google SSO for easy login |
| **Stage gating** | Fully automatic | No user confirmation between stages; SSE keeps frontend informed in real time |
| **Temp local storage** | `tempfile.mkdtemp()` per job | Isolated per-job scratch dir; cleaned up in `finally` block after pipeline completes or fails |
| **Video audio generation** | Not a pipeline parameter | AI-generated audio is not used; user always supplies their own audio file via `POST /jobs/{job_id}/apply-audio` |
| **Background task runtime** | `asyncio` (FastAPI BackgroundTasks) | All stages are I/O-bound API calls; no Celery needed; simpler deployment |
| **Frontend status updates** | Server-Sent Events (SSE) | `GET /jobs/{job_id}/events` streams stage progress; no polling |
| **Video generation engine** | **Veo** (active) / Sora (standby) | Both stage files are kept; swap one import in `orchestrator.py` to switch engines |
| **Social media inputs** | 4 optional links | `social_link_1` through `social_link_4` on the `jobs` table and job creation form |
| **Pipeline modes** | `image` or `video` set at job creation | Image jobs: Stage 1→2 only. Video jobs: Stage 1→2→3→4→5→(user audio)→6 |
| **Video post-processing** | ffmpeg | Stage 5 trims clips to 5s and concatenates. Stage 6 replaces audio. `ffmpeg` must be in Docker image |
