# Backend Documentation

## Overview

ContentPro backend is a FastAPI-based REST API service that handles:
- User authentication and authorization (JWT-based)
- Job creation, management, and lifecycle
- Asset ingestion (local uploads, remote URLs, Google Drive folders)
- Image generation pipeline execution
- Real-time progress via Server-Sent Events (SSE)
- Pricing tracking and logging
- Batch job grouping and management

Production runs on PostgreSQL with DigitalOcean Spaces for storage. Development uses SQLite.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | FastAPI 0.115+ |
| Server | Uvicorn (ASGI) |
| Database | SQLite (dev), PostgreSQL (prod) |
| ORM | SQLAlchemy 2.x (async) |
| Authentication | JWT (python-jose) |
| External APIs | OpenAI GPT-4.1, REVE API, Google AI (Gemini) |
| Storage | Local filesystem, DigitalOcean Spaces |
| Migrations | Alembic |
| Streaming | SSE (sse-starlette) |
| Async Tasks | asyncio.create_task |

### Python Dependencies

```
openai>=1.58.0
google-genai>=1.0.0
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
python-multipart>=0.0.9
sqlalchemy[asyncio]>=2.0.36
aiosqlite>=0.20.0
asyncpg>=0.29.0
boto3>=1.35.0
pydantic-settings>=2.6.0
python-jose[cryptography]>=3.3.0
sse-starlette>=2.1.3
email-validator>=2.2.0
alembic>=1.13.3
httpx>=0.28.1
requests>=2.32.0
Pillow>=10.0.0
```

---

## System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  FastAPI     │────▶│   PostgreSQL    │
│  (React)    │◀────│  Backend     │◀────│   Database      │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
              ┌─────▼─────┐  ┌──▼──────────┐
              │  Storage  │  │   LLM APIs │
              │  (Local/  │  │  - OpenAI  │
              │   DO S3)  │  │  - REVE    │
              └───────────┘  │  - Gemini  │
                             └────────────┘
```

### Request Flow

1. **Authentication**: JWT token validation on protected routes
2. **Job Creation**: Validates input, creates DB record, returns job_id
3. **Asset Upload**: Handles file/URL uploads, stores to local/S3
4. **Pipeline Execution**: Queues async task for image generation
5. **Progress Tracking**: SSE emits stage updates to frontend
6. **Completion**: Stores generated assets, logs, pricing snapshot

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app initialization
│   ├── config.py            # Settings (environment variables)
│   ├── database.py          # SQLAlchemy async setup
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py          # User model
│   │   ├── job.py           # Job model
│   │   ├── asset.py         # Asset model
│   │   ├── job_generation.py # Generation rounds model
│   │   ├── pricing.py       # Pricing snapshot & pipeline logs
│   │   ├── industry_prompt.py      # Industry-level prompt config
│   │   ├── industry_category_prompt.py # Category-level prompts
│   │   ├── user_prompt_override.py # User-level prompt overrides
│   │   └── user_category_prompt_override.py # User category overrides
│   ├── routers/             # API route handlers
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── jobs.py          # Job CRUD & execution
│   │   ├── assets.py        # Asset upload/download
│   │   ├── image_jobs.py    # Image-specific endpoints
│   │   ├── meta.py          # Health, usage endpoints
│   │   └── admin.py         # Admin endpoints (users, prompts)
│   ├── schemas/             # Pydantic request/response models
│   │   ├── auth.py
│   │   ├── job.py
│   │   ├── asset.py
│   │   └── generation.py
│   ├── services/            # Business logic
│   │   ├── auth.py          # Password hashing, JWT
│   │   ├── storage.py       # Storage abstraction (local/S3)
│   │   ├── image_pipeline.py # Pipeline orchestration
│   │   ├── pipeline_runner.py # Task queue & execution
│   │   └── prompt_management.py # Prompt hierarchy management
│   ├── constants.py         # App constants (industries, roles)
│   └── utils/
│       └── presigned_urls.py
├── pipeline/                # Image generation pipeline
│   ├── orchestrator.py      # Main pipeline entry
│   ├── image_single_orchestrator.py
│   ├── image_batch_orchestrator.py
│   ├── logger.py            # JSON logging
│   ├── pricing.py           # Cost calculation
│   ├── prompts/             # LLM prompts
│   │   ├── imageGen.txt
│   │   ├── imageKYC.txt
│   │   └── perImagePromptGen.txt
│   └── stages/              # Pipeline stages
│       ├── product_kyc.py   # Stage 1: KYC generation
│       ├── image_gen_with_KYC.py  # Stage 2: OpenAI image gen
│       ├── image_gen_with_flux.py # Stage 2: Flux image gen
│       ├── image_gen_with_openai_batch.py # OpenAI batch API integration
│       ├── style_number_overlay.py # Add style number to generated images
│       └── reve/             # REVE API integration
│           ├── image_gen_reve.py
│           ├── kyc_compressor.py
│           └── image_rescaler.py
├── migrations/              # Alembic migrations
├── storage/                 # Local storage root
│   ├── objects/             # Uploaded/generated files
│   └── job_runs/            # Per-job logs & pricing
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── requirements.txt
└── .env                     # Environment configuration
```

---

## API Reference

### Authentication

#### POST `/auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "display_name": "John Doe"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user_id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe"
}
```

#### POST `/auth/login`
Authenticate with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### GET `/auth/me`
Get current authenticated user.

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "plan": "free",
  "member_since": "2024-01-15"
}
```

#### POST `/auth/change-password`
Change user password.

**Request:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword",
  "confirm_new_password": "newpassword"
}
```

---

### Jobs

#### POST `/jobs`
Create a new image generation job.

**Request:**
```json
{
  "job_type": "image",
  "image_model": "reve",
  "brand_name": "Luxury Jewelry Co",
  "brand_website": "https://example.com",
  "product_name": "Gold Ring",
  "product_category": "Jewelry",
  "social_link_1": "https://instagram.com/...",
  "additional_input": {
    "dimensions": "10mm",
    "product_description": "18K gold ring with diamond"
  },
  "batch_id": "batch-uuid",
  "batch_name": "Q1 Products"
}
```

**Response:**
```json
{
  "id": "uuid",
  "job_id": "job_20240315_123456",
  "brand_name": "Luxury Jewelry Co",
  "product_name": "Gold Ring",
  "job_type": "image",
  "image_model": "reve",
  "batch_id": "batch-uuid",
  "batch_name": "Q1 Products",
  "status": "pending_upload",
  "current_stage": null,
  "created_at": "2024-03-15T12:34:56Z",
  "updated_at": "2024-03-15T12:34:56Z"
}
```

#### GET `/jobs`
List jobs with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20)
- `status`: Filter by status

**Response:**
```json
{
  "items": [...],
  "page": 1,
  "page_size": 20,
  "total": 100
}
```

#### GET `/jobs/{job_id}`
Get detailed job information including assets and generations.

#### GET `/jobs/{job_id}/events`
Server-Sent Events endpoint for real-time progress.

**Event Format:**
```json
{
  "stage": "product_kyc",
  "status": "running",
  "message": "Generating product KYC..."
}
```

#### GET `/jobs/{job_id}/logs`
Get structured pipeline logs.

**Response:**
```json
[
  {
    "level": "INFO",
    "stage": "product_kyc",
    "message": "Starting KYC generation",
    "context": {"brand_name": "..."},
    "logged_at": "2024-03-15T12:34:56Z"
  }
]
```

#### POST `/jobs/{job_id}/regenerate-images`
Regenerate images with new prompt (new generation round).

**Request (multipart/form-data):**
- `additional_description`: New prompt
- `image_model`: (optional) Override model
- `shot_types`: (optional) Array of shot types for REVE
- `input_images`: (optional) New input images

**Response:**
```json
{
  "id": "generation-uuid",
  "round_number": 2,
  "additional_description": "...",
  "status": "pending",
  "created_at": "2024-03-15T12:34:56Z"
}
```

#### POST `/jobs/{job_id}/cancel`
Cancel a running job.

**Response:**
```json
{
  "ok": true,
  "status": "cancelled",
  "signal_sent": true
}
```

#### DELETE `/jobs/{job_id}`
Soft delete a job (sets status to "deleted").

---

### Assets

#### POST `/jobs/{job_id}/assets`
Upload local image files.

**Request (multipart/form-data):**
- `files`: Image files
- `asset_type`: "raw_image"
- `stage`: "raw"

**Response:**
```json
[
  {
    "id": "asset-uuid",
    "job_id": "job_xxx",
    "asset_type": "raw_image",
    "stage": "raw",
    "storage_key": "jobs/xxx/assets/xxx.png",
    "original_filename": "product.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 123456,
    "presigned_url": "https://..."
  }
]
```

#### POST `/jobs/{job_id}/assets/remote`
Upload image from remote URL.

**Request:**
```json
{
  "image_url": "https://example.com/image.jpg"
}
```

#### POST `/jobs/{job_id}/assets/remote-folder`
Upload images from Google Drive folder.

**Request:**
```json
{
  "folder_url": "https://drive.google.com/folder/...",
  "max_images": 5
}
```

#### GET `/jobs/{job_id}/assets`
List all assets for a job.

#### GET `/jobs/{job_id}/download/images`
Download all generated images as ZIP.

#### GET `/jobs/{job_id}/download/image`
Download single generated image.

**Query Parameters:**
- `index`: Image index (0-5)
- `generation_id`: Specific generation round

---

### Batches

#### GET `/batches/{batch_id}`
Get all jobs in a batch.

#### GET `/batches/{batch_id}/download`
Download all batch jobs' images as ZIP.

#### DELETE `/batches/{batch_id}`
Delete entire batch (soft delete all jobs).

---

### Meta

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "db": "ok",
  "redis": "unused"
}
```

#### GET `/usage`
Get user usage statistics.

**Response:**
```json
{
  "plan": "pro",
  "credits_used": 150,
  "credits_total": 500,
  "images_this_month": 120,
  "videos_this_month": 0,
  "reset_date": "2024-04-01"
}
```

---

### Admin (Superadmin Only)

#### GET `/admin/users`
List all users.

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "role": "user",
    "industry": "jewelry",
    "default_image_model": "gpt-batch-api",
    "default_batch_image_model": "gpt-batch-api",
    "enable_style_number": false,
    "plan": "free",
    "created_at": "2024-01-15T00:00:00Z"
  }
]
```

#### POST `/admin/users`
Create a new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "display_name": "New User",
  "role": "user",
  "industry": "jewelry",
  "default_image_model": "gpt-batch-api",
  "default_batch_image_model": "gpt-batch-api",
  "enable_style_number": false,
  "plan": "free"
}
```

#### PUT `/admin/users/{user_id}`
Update user properties.

#### DELETE `/admin/users/{user_id}`
Soft delete a user.

#### GET `/admin/prompts/defaults`
List default industry prompts.

**Response:**
```json
[
  {
    "industry": "jewelry",
    "prompt_text": "...",
    "shot_prompts": [...]
  }
]
```

#### PUT `/admin/prompts/defaults/{industry}`
Update default industry prompt.

**Request:**
```json
{
  "prompt_text": "...",
  "shot_prompts": [...]
}
```

#### GET `/admin/prompts/defaults/{industry}/categories`
List category prompts for an industry.

#### PUT `/admin/prompts/defaults/{industry}/categories/{category_key}`
Upsert a category prompt.

#### DELETE `/admin/prompts/defaults/{industry}/categories/{category_key}`
Delete a category prompt.

#### GET `/admin/users/{user_id}/prompts/{industry}`
Get user-specific prompt override.

#### PUT `/admin/users/{user_id}/prompts/{industry}`
Set user-specific prompt override.

#### DELETE `/admin/users/{user_id}/prompts/{industry}`
Delete user-specific prompt override.

#### GET `/prompt-catalog`
Get prompt hierarchy for a user (industry + categories).

#### GET `/prompt-industries`
Get list of available industries.

---

## LLM Integration

### Image Generation Models

The backend supports multiple image generation providers:

| Model | Provider | Description |
|-------|----------|-------------|
| `reve` | REVE API | Jewelry-specific AI (primary) |
| `gpt-image-1.5` | OpenAI | GPT Image 1 model (updated from gpt-image-1) |
| `gpt-batch-api` | OpenAI Batch API | Batch processing with GPT Image 1 |
| `flux-2-pro` | Replicate/FLUX | FLUX Pro (via Replicate) |

### REVE API

**Endpoint:** `POST https://api.reve.com/v1/image/remix`

**Features:**
- Jewelry/product-specific image generation
- 6 preset shot types: hero, lifestyle, wearable, wearable_ethnic, jewellery_box, close_detail
- KYC-based prompt enhancement

**Retry Logic:**
- 3 retries with exponential backoff (2s, 4s)
- Handles 500 errors and connection issues

### OpenAI GPT-4.1

**Stage 1 (Product KYC):**
- Model: `gpt-4.1-mini`
- Input: Product metadata, images
- Output: Structured KYC JSON

**Stage 2 (Image Generation):**
- Model: `gpt-4.1` with `image_generation` tool
- Input: KYC JSON, reference images
- Output: 6 generated images
- Retries until target count reached

### Google Gemini

**Available but not in active pipeline:**
- Model: Gemini Pro Vision
- Used for video prompt generation (legacy)

---

## Pipeline Stages

### Stage 1: Product KYC (`product_kyc.py`)

Generates structured product knowledge from images and metadata.

**Input:**
- Up to 5 source product images
- Brand name, product name, category
- Optional additional description

**Output:**
- Raw KYC JSON (~800 chars)
- Filtered KYC JSON (~400-600 chars) for stage 2

**Model:** OpenAI GPT-4.1-mini

### Stage 2: Image Generation

Three possible providers:

#### REVE (`image_gen_reve.py`)
- Uses KYC + shot requirements prompt
- Generates 6 images (one per shot type)
- Retry logic for reliability

#### OpenAI (`image_gen_with_KYC.py`)
- Uses KYC JSON as context
- Generates images via GPT-4.1 `image_generation` tool
- Retries until 6 images or max attempts

#### FLUX (`image_gen_with_flux.py`)
- Alternative provider via Replicate
- Not currently active in main pipeline

---

## Authentication & Authorization

### JWT Tokens
- Algorithm: HS256
- Expiration: 1440 minutes (24 hours)
- Secret: `jwt_secret` in environment

### Protected Routes
All `/jobs/*`, `/assets/*`, `/batches/*` endpoints require valid JWT in Authorization header.

### Password Hashing
- Uses python-jose for JWT
- Password hashing implementation (bcrypt-based)

---

## Environment Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `app_name` | Application name | "ContentPro Backend" |
| `environment` | Dev/prod | "development" |
| `database_url` | DB connection string | SQLite local |
| `jwt_secret` | JWT signing key | "change-me" |
| `jwt_expire_minutes` | Token expiry | 1440 |
| `allowed_origins` | CORS origins | localhost:5173 |
| `frontend_url` | Frontend URL | localhost:8080 |
| `backend_url` | Backend URL | localhost:8000 |

### DigitalOcean Spaces

| Variable | Description |
|----------|-------------|
| `do_spaces_key` | Spaces access key |
| `do_spaces_secret` | Spaces secret key |
| `do_spaces_region` | Region (e.g., sfo3) |
| `do_spaces_bucket` | Bucket name |
| `do_spaces_endpoint` | Custom endpoint |
| `do_spaces_cdn_endpoint` | CDN URL |

### API Keys

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `REVE_API_KEY` | REVE API key |

### Google OAuth (available)

| Variable | Description |
|----------|-------------|
| `google_client_id` | OAuth client ID |
| `google_client_secret` | OAuth client secret |

---

## Database Models

### User
- `id`: UUID primary key
- `email`: Unique email
- `hashed_password`: Bcrypt hash
- `display_name`: User's name
- `role`: "user" or "superadmin"
- `industry`: Industry (e.g., "jewelry")
- `default_image_model`: Default model for single jobs (e.g., "gpt-batch-api", "reve", "gpt-image-1.5")
- `default_batch_image_model`: Default model for batch jobs
- `enable_style_number`: Whether to overlay style number on images
- `plan`: "free" or "pro"
- `is_deleted`: Soft delete flag
- `deleted_at`: Deletion timestamp
- `created_at`, `updated_at`: Timestamps

### Job
- `id`: Internal UUID
- `job_id`: Public timestamp-based ID (e.g., job_20240315_123456)
- `user_id`: FK to User
- `brand_name`, `product_name`, `product_category`: Product info
- `job_type`: "image" or "video"
- `image_model`: "reve", "gpt-image-1", "flux-2-pro"
- `batch_id`, `batch_name`: Batch grouping
- `status`: pending_upload, pending, running, completed, failed, cancelled, deleted
- `current_stage`: Pipeline stage name
- `error_message`: Error details
- `storage_prefix`: Path prefix for assets

### Asset
- `id`: UUID
- `job_id`: FK to Job
- `generation_id`: FK to JobGeneration (nullable)
- `asset_type`: raw_image, generated_image, kyc_json, filtered_kyc_json, job_log, pricing_report
- `stage`: Pipeline stage
- `storage_key`: Path in storage
- `original_filename`: Original file name
- `mime_type`, `size_bytes`: File info
- `is_deleted`: Soft delete flag

### JobGeneration
- `id`: UUID
- `job_id`: FK to Job
- `round_number`: Regeneration round (1, 2, 3...)
- `additional_description`: Custom prompt
- `status`: Generation status
- `created_at`: Timestamp

### PricingSnapshot
- `id`: UUID
- `job_id`: FK to Job
- `raw_price_data`: Full API response
- `total_cost_usd`: Total cost
- `stage_1_cost_usd` through `stage_4_cost_usd`: Per-stage costs
- `total_input_tokens`, `total_output_tokens`: Token usage

### PipelineLog
- `id`: UUID
- `job_id`: FK to Job
- `level`: INFO, WARNING, ERROR
- `stage`: Pipeline stage
- `message`: Log message
- `context`: Additional data
- `logged_at`: Timestamp

### IndustryPrompt (Industry-Level Prompt)
- `industry`: Primary key (e.g., "jewelry")
- `prompt_text`: Default prompt for the industry
- `shot_prompts_json`: Shot type prompts (hero, lifestyle, etc.)

### IndustryCategoryPrompt (Category-Level Prompts)
- `id`: UUID
- `industry`: FK to IndustryPrompt
- `category_key`: Category identifier (e.g., "default", "rings", "necklaces")
- `category_label`: Display label
- `category_prompt_text`: Category-specific prompt instructions
- `shot_prompts_json`: Category-specific shot prompts
- `is_active`: Whether the category is active

### UserPromptOverride (User-Level Prompt Override)
- `id`: UUID
- `user_id`: FK to User
- `industry`: Industry identifier
- `prompt_text`: User-specific prompt override
- `shot_prompts_json`: User-specific shot prompts

### UserCategoryPromptOverride (User-Level Category Override)
- `id`: UUID
- `user_id`: FK to User
- `industry`: Industry identifier
- `category_key`: Category identifier
- `category_label`: Display label
- `category_prompt_text`: Category-specific prompt override
- `shot_prompts_json`: Category-specific shot prompts

---

## Prompt Hierarchy System

---

## Prompt Hierarchy System

The backend implements a hierarchical prompt system that allows flexible prompt customization at multiple levels:

### Hierarchy Levels (in order of priority)

1. **User Category Override** - Highest priority
2. **Industry Category Default** - Middle priority
3. **User Industry Override** - Lower priority
4. **Industry Default Prompt** - Lowest priority (baseline)

### Pipeline Integration

When generating images, the pipeline:
1. Loads user's default industry from their profile
2. Looks for user-specific prompt overrides
3. Falls back to industry-level defaults
4. Applies category-specific prompts if specified
5. Uses shot-type prompts for specific image variations

### Style Number Overlay

Users can enable `enable_style_number` to overlay style numbers on generated images:
- Uses Montserrat-SemiBold font
- Positioned at bottom-left of image
- Format: "STYLE NO : {style_number}"

### Available Industries
- `jewelry` (default)

### Available Shot Types
- `hero` - Main product shot
- `lifestyle` - Product in lifestyle context
- `wearable` - Product being worn
- `wearable_ethnic` - Ethnic wear context
- `jewellery_box` - Product in packaging
- `close_detail` - Close-up detail shot

---

## Deployment

### Docker Compose (Development/Production)

```yaml
services:
  backend:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: contentpro
      POSTGRES_USER: contentpro
      POSTGRES_PASSWORD: contentpro
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Production Deployment

- Single DigitalOcean droplet
- Docker Compose for orchestration
- PostgreSQL for database
- DigitalOcean Spaces for storage
- Nginx reverse proxy (if needed)
- CORS configured for production domain

### Startup

```bash
# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Running Locally

### Prerequisites
- Python 3.10+
- Docker (for PostgreSQL)

### Backend Only (with SQLite)
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Full Stack with Docker Compose
```bash
# From project root
docker compose -f backend/docker-compose.yml up -d
# Backend runs on http://localhost:8000
# PostgreSQL on localhost:5432
```

### Environment Variables
Create `backend/.env`:
```env
DATABASE_URL=sqlite+aiosqlite:///./contentpro.db
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173
# Optional: OpenAI, REVE, DigitalOcean Spaces keys
```

---

---

## Job Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ pending_    │────▶│   pending   │────▶│   running   │────▶│  completed  │
│   upload    │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │                   │
                                               ▼                   ▼
                                        ┌─────────────┐     ┌─────────────┐
                                        │   failed    │     │  cancelled  │
                                        │             │     │             │
                                        └─────────────┘     └─────────────┘
```

1. **pending_upload**: Job created, waiting for asset upload
2. **pending**: Assets uploaded, in queue for processing
3. **running**: Pipeline executing (stages: kyc → image_gen)
4. **completed**: All images generated successfully
5. **failed**: Error occurred
6. **cancelled**: User cancelled

---

## Error Handling

### API Errors
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (not owner of resource)
- 404: Not Found
- 409: Conflict (e.g., user already exists)
- 500: Internal Server Error

### Pipeline Errors
- Stored in `error_message` field
- Logged to `pipeline_logs` table
- Emitted via SSE to frontend

---

## Logging

### Pipeline Logs
- JSON format to `storage/job_runs/{job_id}/logs.jsonl`
- Levels: DEBUG, INFO, WARNING, ERROR

### API Logs
- Access logs via Uvicorn
- Application logs to stdout

### SSE Events
- Real-time stage updates
- Progress messages
- Error notifications
