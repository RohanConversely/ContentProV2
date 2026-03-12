# Backend Documentation

## Overview

The ContentPro backend is a FastAPI service that handles:
- email/password authentication
- persisted job creation and project history
- source asset ingestion from direct uploads, remote image URLs, and public Google Drive folders
- the approved image pipeline only: Stage 1 Product KYC and Stage 2 image generation
- pricing snapshots, job logs, SSE progress events, and ZIP downloads

Production currently runs on PostgreSQL. Local development commonly uses SQLite.

## Current Scope

Implemented and active:
- image generation pipeline
- single-product upload
- batch upload from spreadsheet rows
- batch grouping via `batch_id` and `batch_name`
- project soft delete via `status = 'deleted'`
- per-job logs and pricing snapshots
- local storage or DigitalOcean Spaces through the storage abstraction

Present in the repo but not approved for active execution:
- video stages and Sora/Veo-related files

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | FastAPI |
| Server | Uvicorn |
| Database | SQLite (dev), PostgreSQL (prod) |
| ORM | SQLAlchemy 2.x async |
| Authentication | JWT + email/password |
| External APIs | OpenAI GPT-4.1 mini, OpenAI GPT-4.1 with `image_generation` tool |
| Storage | Local filesystem, DigitalOcean Spaces |
| Migration | Alembic |
| Background execution | `asyncio.create_task` |
| Streaming | SSE (`sse-starlette`) |

## Actual Pipeline Behavior

### Stage 1
- File: [product_kyc.py](/home/anhad/edxso/contentpro/imageGenScript/backend/pipeline/stages/product_kyc.py)
- Model: OpenAI GPT-4.1 mini
- Inputs:
  - product metadata
  - up to 5 source product images
  - optional additional info from single form or batch spreadsheet
- Output:
  - raw KYC JSON
  - filtered KYC JSON for stage 2

### Stage 2
- File: [image_gen_with_KYC.py](/home/anhad/edxso/contentpro/imageGenScript/backend/pipeline/stages/image_gen_with_KYC.py)
- Model: OpenAI GPT-4.1 using the `image_generation` tool
- Inputs:
  - filtered KYC JSON
  - up to 5 source product images
- Output target:
  - 6 generated images

Important implementation detail:
- the backend now retries stage-2 generation until it reaches the target count or the retry cap
- this improves reliability but can increase API usage versus the old single-call behavior

## Input Limits

- Single-product jobs: up to 5 input source images
- Batch rows with direct image links: 1 remote source image per row
- Batch rows with Google Drive folder links: first up to 5 images from the folder
- Generated output target: 6 images per job

## Project Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── asset.py
│   │   └── pricing.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── jobs.py
│   │   ├── assets.py
│   │   ├── image_jobs.py
│   │   └── meta.py
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── job.py
│   │   ├── asset.py
│   │   └── image_jobs.py
│   ├── services/
│   │   ├── auth.py
│   │   ├── storage.py
│   │   ├── image_pipeline.py
│   │   └── pipeline_runner.py
│   └── utils/
│       └── presigned_urls.py
├── pipeline/
│   ├── orchestrator.py
│   ├── image_single_orchestrator.py
│   ├── image_batch_orchestrator.py
│   ├── logger.py
│   ├── pricing.py
│   ├── prompts/
│   └── stages/
├── migrations/
├── storage/
├── runtime/
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
└── entrypoint.sh
```

## Key Backend Flows

### Single Product Flow
1. Frontend creates a job via `POST /jobs`
2. Frontend uploads up to 5 files via `POST /jobs/{job_id}/assets`
3. Backend queues the image pipeline
4. Frontend listens to `GET /jobs/{job_id}/events`
5. Backend writes generated assets, logs, and pricing
6. Frontend reads final assets from `GET /jobs/{job_id}`

### Batch Flow
1. Frontend parses CSV/XLSX
2. Frontend creates one backend job per selected row
3. Frontend uploads:
   - one remote image URL, or
   - a Drive folder URL resolved to first up to 5 images
4. Each row runs independently through the same pipeline
5. Projects page groups batch rows by `batch_id`

## Authentication

Current practical auth mode:
- email/password

Important note:
- Google OAuth code exists in the backend, but IP-based production deployment does not currently rely on it
- for the live droplet deployment, email/password is the supported auth path

## Main Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/change-password`

### Jobs
- `POST /jobs`
- `GET /jobs`
- `GET /jobs/recent`
- `GET /jobs/{job_id}`
- `GET /jobs/{job_id}/events`
- `GET /jobs/{job_id}/logs`
- `GET /jobs/{job_id}/pricing`
- `GET /jobs/{job_id}/download/images`
- `DELETE /jobs/{job_id}`

### Batch
- `GET /batches/{batch_id}`
- `GET /batches/{batch_id}/download`
- `DELETE /batches/{batch_id}`

### Assets
- `POST /jobs/{job_id}/assets`
- `POST /jobs/{job_id}/assets/upload`
- `POST /jobs/{job_id}/assets/remote`
- `POST /jobs/{job_id}/assets/remote-folder`
- `GET /jobs/{job_id}/assets`

## Job Logs And Pricing

Each completed or failed job writes:
- `job.log`
- `pricing.json`

Typical local paths:
- [backend/storage/job_runs](/home/anhad/edxso/contentpro/imageGenScript/backend/storage/job_runs)
- [backend/storage/objects](/home/anhad/edxso/contentpro/imageGenScript/backend/storage/objects)

The same information is also represented in:
- `pipeline_logs`
- `pricing_snapshots`

## Production Notes

Current live production facts:
- frontend and backend run on one droplet with Docker Compose
- PostgreSQL is used in production
- batch columns `jobs.batch_id` and `jobs.batch_name` exist on the live DB

Important caveat:
- those batch columns were added manually on the live DB after the initial migration
- Alembic currently reports only the initial migration
- a new migration should be created so a fresh production DB matches the live schema without manual SQL
