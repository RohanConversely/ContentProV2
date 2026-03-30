# Database Documentation

## Overview

ContentPro uses a relational database to store:
- User accounts and authentication
- Jobs (single and batch)
- Assets (source images, generated images, KYC files)
- Generation rounds (regeneration history)
- Pricing snapshots (cost tracking)
- Pipeline execution logs

**Database Engines:**
- Development: SQLite (`sqlite+aiosqlite`)
- Production: PostgreSQL (`asyncpg`)

**ORM:** SQLAlchemy 2.x (async)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL 16 (prod), SQLite (dev) |
| ORM | SQLAlchemy 2.x async |
| Async Driver | asyncpg (PostgreSQL), aiosqlite (SQLite) |
| Migrations | Alembic |
| Connection Pool | SQLAlchemy async session |

---

## Relational Schema

```mermaid
erDiagram
    USERS ||--o{ JOBS : owns
    JOBS ||--o{ ASSETS : has
    JOBS ||--o| JOB_GENERATIONS : has
    JOBS ||--o| PRICING_SNAPSHOT : has
    JOBS ||--o{ PIPELINE_LOGS : emits
    JOB_GENERATIONS ||--o{ ASSETS : contains
    ASSETS }o--|| JOBS : references
    ASSETS }o--|| JOB_GENERATIONS : references
```

---

## Table Definitions

### users

Stores user accounts and authentication information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | User email |
| hashed_password | VARCHAR(255) | NOT NULL | Bcrypt hash |
| display_name | VARCHAR(255) | NOT NULL | Display name |
| plan | VARCHAR(50) | NOT NULL DEFAULT 'free' | 'free' or 'pro' |
| created_at | DATETIME | NOT NULL, TZ | Account creation time |
| updated_at | DATETIME | NOT NULL, TZ | Last update time |

**Indexes:**
- `ix_users_email` on `email`

---

### jobs

Stores job records - one row per single job or per batch row.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Internal UUID |
| job_id | VARCHAR(64) | UNIQUE, NOT NULL, INDEX | Public ID (e.g., job_20240315_123456) |
| user_id | VARCHAR(36) | FK → users.id, INDEX | Owner |
| brand_name | VARCHAR(255) | NOT NULL | Brand/company name |
| brand_website | VARCHAR(500) | NOT NULL | Brand website URL |
| product_name | VARCHAR(255) | NOT NULL | Product name |
| product_category | VARCHAR(255) | NOT NULL | Product category |
| job_type | VARCHAR(50) | NOT NULL DEFAULT 'image' | 'image' or 'video' |
| social_link_1 | VARCHAR(500) | NULLABLE | Social media link |
| social_link_2 | VARCHAR(500) | NULLABLE | Social media link |
| social_link_3 | VARCHAR(500) | NULLABLE | Social media link |
| social_link_4 | VARCHAR(500) | NULLABLE | Social media link |
| additional_input | JSON | NULLABLE | Extra input data |
| image_model | VARCHAR(50) | NOT NULL DEFAULT 'reve' | Image generation model |
| video_duration_seconds | INTEGER | NOT NULL DEFAULT 8 | Video duration (legacy) |
| batch_id | VARCHAR(64) | NULLABLE, INDEX | Batch grouping ID |
| batch_name | VARCHAR(255) | NULLABLE | Batch display name |
| status | VARCHAR(50) | NOT NULL, INDEX | Job status |
| current_stage | VARCHAR(50) | NULLABLE | Current pipeline stage |
| error_message | TEXT | NULLABLE | Error details |
| storage_prefix | VARCHAR(255) | NOT NULL | Path prefix for assets |
| created_at | DATETIME | NOT NULL, TZ | Creation time |
| updated_at | DATETIME | NOT NULL, TZ | Last update time |

**Indexes:**
- `ix_jobs_job_id` on `job_id`
- `ix_jobs_user_id` on `user_id`
- `ix_jobs_status` on `status`
- `ix_jobs_batch_id` on `batch_id`

**Status Values:**
| Status | Description |
|--------|-------------|
| pending_upload | Waiting for asset upload |
| pending | Assets ready, queued for processing |
| running | Pipeline executing |
| completed | Successfully completed |
| failed | Error occurred |
| cancelled | User cancelled |
| deleted | Soft deleted |

**Relationships:**
- `user`: Many-to-One with `users`
- `assets`: One-to-Many with `assets`
- `generations`: One-to-Many with `job_generations`
- `pricing_snapshot`: One-to-One with `pricing_snapshots`
- `pipeline_logs`: One-to-Many with `pipeline_logs`

---

### assets

Stores all file assets - source images, generated images, KYC files, logs, pricing reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| job_id | VARCHAR(36) | FK → jobs.id, INDEX | Owner job |
| generation_id | VARCHAR(36) | FK → job_generations.id, NULLABLE, INDEX | Generation round |
| asset_type | VARCHAR(50) | NOT NULL, INDEX | Asset type |
| stage | VARCHAR(50) | NOT NULL | Pipeline stage |
| storage_key | VARCHAR(500) | UNIQUE, NOT NULL | Path in storage |
| original_filename | VARCHAR(255) | NULLABLE | Original file name |
| mime_type | VARCHAR(100) | NOT NULL | MIME type |
| size_bytes | INTEGER | NULLABLE | File size |
| metadata | JSON | NULLABLE | Additional metadata |
| is_deleted | BOOLEAN | NOT NULL DEFAULT FALSE | Soft delete |
| created_at | DATETIME | NOT NULL, TZ | Upload time |

**Indexes:**
- `ix_assets_job_id` on `job_id`
- `ix_assets_generation_id` on `generation_id`
- `ix_assets_asset_type` on `asset_type`

**Asset Types:**
| Type | Description |
|------|-------------|
| raw_image | Source product images |
| generated_image | AI-generated images |
| kyc_json | Full KYC output |
| filtered_kyc_json | Filtered KYC for stage 2 |
| job_log | Execution log file |
| pricing_report | Pricing JSON file |

**Relationships:**
- `job`: Many-to-One with `jobs`
- `generation`: Many-to-One with `job_generations` (nullable)

---

### job_generations

Stores regeneration rounds - allows multiple image generation attempts per job.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| job_id | VARCHAR(36) | FK → jobs.id, INDEX | Owner job |
| round_number | INTEGER | NOT NULL | Round number (1, 2, 3...) |
| additional_description | TEXT | NULLABLE | Custom prompt for this round |
| status | VARCHAR(50) | NOT NULL, INDEX | Generation status |
| created_at | DATETIME | NOT NULL, TZ | Creation time |

**Indexes:**
- `ix_job_generations_job_id` on `job_id`
- `ix_job_generations_status` on `status`

**Status Values:**
| Status | Description |
|--------|-------------|
| pending | Queued for generation |
| running | Currently generating |
| completed | Successfully generated |
| failed | Generation failed |

**Relationships:**
- `job`: Many-to-One with `jobs`
- `assets`: One-to-Many with `assets`

---

### pricing_snapshots

Stores cost and token usage for each job.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| job_id | VARCHAR(36) | FK → jobs.id, UNIQUE | Owner job |
| raw_price_data | JSON | NULLABLE | Full API response |
| total_cost_usd | NUMERIC(12,6) | NULLABLE | Total cost in USD |
| stage_1_cost_usd | NUMERIC(12,6) | NULLABLE | Stage 1 (KYC) cost |
| stage_2_cost_usd | NUMERIC(12,6) | NULLABLE | Stage 2 (Image Gen) cost |
| stage_3_cost_usd | NUMERIC(12,6) | NULLABLE | Stage 3 cost (legacy) |
| stage_4_cost_usd | NUMERIC(12,6) | NULLABLE | Stage 4 cost (legacy) |
| total_input_tokens | INTEGER | NULLABLE | Total input tokens |
| total_output_tokens | INTEGER | NULLABLE | Total output tokens |
| created_at | DATETIME | NOT NULL, TZ | Snapshot time |

**Relationships:**
- `job`: One-to-One with `jobs`

---

### pipeline_logs

Structured execution logs for debugging and UI display.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| job_id | VARCHAR(36) | FK → jobs.id, INDEX | Owner job |
| level | VARCHAR(20) | NOT NULL | Log level |
| stage | VARCHAR(50) | NULLABLE | Pipeline stage |
| message | TEXT | NOT NULL | Log message |
| context | JSON | NULLABLE | Additional context data |
| logged_at | DATETIME | NOT NULL, TZ | Log timestamp |

**Indexes:**
- `ix_pipeline_logs_job_id` on `job_id`

**Log Levels:**
| Level | Description |
|-------|-------------|
| DEBUG | Detailed debug info |
| INFO | General information |
| WARNING | Warning messages |
| ERROR | Error messages |

**Relationships:**
- `job`: Many-to-One with `jobs`

---

## Constraints

### Primary Keys
- All tables use UUID strings as primary keys
- Generated via `uuid.uuid4()`

### Foreign Keys
- `jobs.user_id` → `users.id` (ON DELETE CASCADE)
- `assets.job_id` → `jobs.id` (ON DELETE CASCADE)
- `assets.generation_id` → `job_generations.id` (ON DELETE SET NULL)
- `job_generations.job_id` → `jobs.id` (ON DELETE CASCADE)
- `pricing_snapshots.job_id` → `jobs.id` (ON DELETE CASCADE)
- `pipeline_logs.job_id` → `jobs.id` (ON DELETE CASCADE)

### Unique Constraints
- `users.email`
- `jobs.job_id`
- `assets.storage_key`
- `pricing_snapshots.job_id`

### Cascade Behavior
- Deleting a job cascades to: assets, generations, pricing snapshot, pipeline logs
- Deleting a generation sets `assets.generation_id` to NULL (preserves assets)

---

## Soft Delete

Implemented via status flags:

| Table | Column | Values |
|-------|--------|--------|
| jobs | status | 'deleted' |
| assets | is_deleted | TRUE/FALSE |

Soft-deleted jobs are filtered out from normal queries using:
```python
select(Job).where(Job.status != SOFT_DELETED_STATUS)
```

---

## Batch Data Model

Batches are not stored as a separate table. Instead:

1. Each batch row is a normal `jobs` row
2. Related rows share:
   - `batch_id`: UUID for grouping
   - `batch_name`: Display name

**This enables:**
- Grouped batch cards on Projects page
- Batch detail pages showing all jobs
- Batch ZIP downloads aggregating all job assets
- Per-batch delete operations

---

## Migrations

### Alembic Setup

```ini
# alembic.ini
sqlalchemy.url = sqlite+aiosqlite:///./contentpro.db
```

### Migration Commands

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# Check current version
alembic current
```

### Known Issues

**Production Migration Gap:**
- `jobs.batch_id` and `jobs.batch_name` columns were added manually on production
- Initial migrations don't include these columns
- New migration should be created to sync schema

**Current Alembic Version (production):** `20260311_0002`

---

## Query Patterns

### Get User's Jobs (Paginated)
```python
select(Job)
    .where(Job.user_id == user_id)
    .where(Job.status != 'deleted')
    .order_by(Job.created_at.desc())
    .limit(page_size)
    .offset((page - 1) * page_size)
```

### Get Job with Assets
```python
select(Job)
    .options(selectinload(Job.assets))
    .where(Job.job_id == job_id)
```

### Get Batch Jobs
```python
select(Job)
    .where(Job.batch_id == batch_id)
    .order_by(Job.created_at)
```

### Get Job Pricing
```python
select(PricingSnapshot).where(PricingSnapshot.job_id == job_id)
```

### Get Pipeline Logs
```python
select(PipelineLog)
    .where(PipelineLog.job_id == job_id)
    .order_by(PipelineLog.logged_at)
```

---

## Storage

### Local Storage Structure

```
backend/storage/
├── objects/              # All assets
│   └── jobs/
│       └── {job_id}/
│           └── assets/
│               └── {asset_id}.{ext}
└── job_runs/            # Per-job data
    └── {job_id}/
        ├── logs.jsonl
        └── pricing.json
```

### DigitalOcean Spaces

When `spaces_enabled = True`:
- Assets stored in S3-compatible Spaces
- `storage_key` becomes the S3 object key
- Presigned URLs generated for download

---

## Performance Considerations

### Indexes
- `jobs.status` for filtering
- `jobs.user_id` for user-scoped queries
- `jobs.batch_id` for batch queries
- `assets.job_id` for asset lookups
- `pipeline_logs.job_id` for log queries

### Async Sessions
- All database operations are async
- Connection pooling via SQLAlchemy
- Use `await` for all queries

### Eager Loading
- Use `selectinload()` for relationships
- Avoid N+1 queries when loading job + assets

---

## Environment-Specific Configurations

### Development
```python
database_url = "sqlite+aiosqlite:///./contentpro.db"
```

### Production
```python
database_url = "postgresql+asyncpg://user:pass@host:5432/contentpro"
```

---

## Backup & Recovery

### PostgreSQL (Production)
- Daily automated backups via DigitalOcean
- Point-in-time recovery available
- Backup retention: 7 days

### SQLite (Development)
- Manual backup of `contentpro.db`
- No automated backup

---

## Security

- Passwords hashed with bcrypt
- JWT tokens with HS256
- No sensitive data in logs
- CORS configured for allowed origins
- SQL injection prevented via ORM
