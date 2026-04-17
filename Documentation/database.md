# Database Documentation

## Overview

ContentPro uses a relational database to store:
- User accounts and authentication
- Jobs (single and batch)
- Assets (source images, generated images, logs, pricing artifacts)
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
    USERS ||--o{ USER_PROMPT_OVERRIDES : has
    USERS ||--o{ USER_CATEGORY_PROMPT_OVERRIDES : has
    INDUSTRY_PROMPTS ||--o{ INDUSTRY_CATEGORY_PROMPTS : contains
    INDUSTRY_PROMPTS ||--o{ USER_PROMPT_OVERRIDES : applies_to
    INDUSTRY_PROMPTS ||--o{ USER_CATEGORY_PROMPT_OVERRIDES : applies_to
```

**New Tables Added (v20260413+):**
- `industry_prompts` - Industry-level default prompts
- `industry_category_prompts` - Category-specific prompts within industries
- `user_prompt_overrides` - User-specific prompt overrides
- `user_category_prompt_overrides` - User-specific category overrides

**Current Prompt Baseline (v20260416+):**
- Production prompt bootstrap is currently normalized to the `jewelry` industry
- The default category row is stored under `category_key = 'default'`
- Baseline shot prompts are stored in `shot_prompts_json` on both industry and category prompt tables

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
| role | VARCHAR(32) | NOT NULL DEFAULT 'user' | 'user' or 'superadmin' |
| industry | VARCHAR(64) | NOT NULL DEFAULT 'jewelry' | Selected industry |
| default_image_model | VARCHAR(50) | NOT NULL DEFAULT 'gpt-batch-api' | Default image model |
| default_batch_image_model | VARCHAR(50) | NOT NULL DEFAULT 'gpt-batch-api' | Default batch model |
| enable_style_number | BOOLEAN | NOT NULL DEFAULT FALSE | Style number toggle |
| plan | VARCHAR(50) | NOT NULL DEFAULT 'free' | 'free' or 'pro' |
| is_deleted | BOOLEAN | NOT NULL DEFAULT FALSE, INDEX | Soft-delete flag |
| deleted_at | DATETIME | NULLABLE, TZ | Soft-delete timestamp |
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
| requested_image_count | INTEGER | NOT NULL DEFAULT 4 | Requested output image count |
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

Stores all file assets - source images, generated images, logs, and pricing reports.

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
| stage_1_cost_usd | NUMERIC(12,6) | NULLABLE | Stage 1 cost bucket |
| stage_2_cost_usd | NUMERIC(12,6) | NULLABLE | Stage 2 cost bucket |
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

### industry_prompts

Stores default prompts for each industry.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| industry | VARCHAR(64) | PRIMARY KEY | Industry ID (e.g., "jewelry") |
| prompt_text | TEXT | NOT NULL | Default prompt for the industry |
| shot_prompts_json | JSON | NULLABLE | Shot type prompts (hero, lifestyle, etc.) |
| created_at | DATETIME | NOT NULL, TZ | Creation time |
| updated_at | DATETIME | NOT NULL, TZ | Last update time |

---

### industry_category_prompts

Stores category-specific prompts within an industry.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| industry | VARCHAR(64) | NOT NULL, INDEX | Industry ID |
| category_key | VARCHAR(128) | NOT NULL | Category identifier |
| category_label | VARCHAR(255) | NOT NULL | Display label |
| category_prompt_text | TEXT | NOT NULL | Category prompt instructions |
| shot_prompts_json | JSON | NULLABLE | Category-specific shot prompts |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Active flag |
| created_at | DATETIME | NOT NULL, TZ | Creation time |
| updated_at | DATETIME | NOT NULL, TZ | Last update time |

**Indexes:**
- `ix_industry_category_prompts_industry` on `industry`

**Unique Constraints:**
- `industry` + `category_key` (UQ_industry_category_prompt)

---

### user_prompt_overrides

Stores user-specific prompt overrides.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| user_id | VARCHAR(36) | FK → users.id, INDEX | Owner user |
| industry | VARCHAR(64) | NOT NULL, INDEX | Industry ID |
| prompt_text | TEXT | NOT NULL | Override prompt text |
| shot_prompts_json | JSON | NULLABLE | Override shot prompts |
| created_at | DATETIME | NOT NULL, TZ | Creation time |
| updated_at | DATETIME | NOT NULL, TZ | Last update time |

**Unique Constraints:**
- `user_id` + `industry` (UQ_user_prompt_override_user_industry)

---

### user_category_prompt_overrides

Stores user-specific category prompt overrides.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID |
| user_id | VARCHAR(36) | FK → users.id, INDEX | Owner user |
| industry | VARCHAR(64) | NOT NULL, INDEX | Industry ID |
| category_key | VARCHAR(128) | NOT NULL | Category identifier |
| category_label | VARCHAR(255) | NOT NULL | Display label |
| category_prompt_text | TEXT | NOT NULL | Override prompt text |
| shot_prompts_json | JSON | NULLABLE | Override shot prompts |
| created_at | DATETIME | NOT NULL, TZ | Creation time |
| updated_at | DATETIME | NOT NULL, TZ | Last update time |

**Unique Constraints:**
- `user_id` + `industry` + `category_key` (UQ_user_category_prompt_override_user_industry_category)

---

## Constraints

### Primary Keys
- All tables use UUID strings as primary keys
- Generated via `uuid.uuid4()`

### Foreign Keys
- `jobs.user_id` → `users.id`
- `assets.job_id` → `jobs.id`
- `assets.generation_id` → `job_generations.id`
- `job_generations.job_id` → `jobs.id`
- `pricing_snapshots.job_id` → `jobs.id`
- `pipeline_logs.job_id` → `jobs.id`
- `user_prompt_overrides.user_id` → `users.id`
- `user_category_prompt_overrides.user_id` → `users.id`

### Unique Constraints
- `users.email`
- `jobs.job_id`
- `assets.storage_key`
- `pricing_snapshots.job_id`
- `industry_prompts.industry`
- `industry_category_prompts.industry` + `category_key`
- `user_prompt_overrides.user_id` + `industry`
- `user_category_prompt_overrides.user_id` + `industry` + `category_key`

### Cascade Behavior
- ORM relationships are configured with SQLAlchemy cascade for job-owned records
- Database foreign keys do not currently declare explicit `ON DELETE` actions in the models

---

## Soft Delete

Implemented via status flags:

| Table | Column | Values |
|-------|--------|--------|
| jobs | status | 'deleted' |
| assets | is_deleted | TRUE/FALSE |
| users | is_deleted | TRUE/FALSE |
| users | deleted_at | Timestamp (nullable) |

Soft-deleted jobs are filtered out from normal queries using:
```python
select(Job).where(Job.status != SOFT_DELETED_STATUS)
```

Soft-deleted users are filtered out using:
```python
select(User).where(User.is_deleted == False)
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

### Migration History

| Version | Date | Description |
|---------|------|-------------|
| `20260311_0001` | 2026-03-11 | Initial schema (users, jobs, assets, pricing_snapshots, pipeline_logs) |
| `20260312_0002` | 2026-03-12 | Added job_generations table for regeneration rounds |
| `20260316_0003` | 2026-03-16 | Added image_model column to jobs table |
| `20260331_0004` | 2026-03-31 | Added user roles and industry prompts (IndustryPrompt, UserPromptOverride) |
| `20260401_0005` | 2026-04-01 | Migrated legacy superadmin email |
| `20260402_0006` | 2026-04-02 | Added user default model and job image count |
| `20260403_0007` | 2026-04-03 | Added prompt shot prompts to industry_prompts |
| `20260404_0008` | 2026-04-04 | Renamed gpt_image_model to image_model |
| `20260406_0009` | 2026-04-06 | Added user soft delete (is_deleted, deleted_at) |
| `20260406_0010` | 2026-04-06 | Added user default batch model (default_batch_image_model) |
| `20260406_0011` | 2026-04-06 | Added user enable_style_number column |
| `20260413_0012` | 2026-04-13 | Added prompt categories (IndustryCategoryPrompt, UserCategoryPromptOverride) |
| `20260416_0013` | 2026-04-16 | Reset prompt hierarchy to jewellery baseline |
| `20260416_0014` | 2026-04-16 | Enforce jewellery baseline shots |

**Current Alembic Version:** `20260416_0014`

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
