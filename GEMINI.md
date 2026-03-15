# ContentPro (imageGenScript) - Project Context

ContentPro is a full-stack AI-powered platform designed to generate professional Amazon A+ marketing content (images and video frames) from raw product photos.

## Project Overview

- **Purpose**: Transforms simple product images into high-quality marketing assets using AI.
- **Key Features**: Product KYC generation, AI-driven image generation, video prompt generation, and video frame synthesis.
- **Status**: The core pipeline is functional. The FastAPI backend is integrated with stages 1 & 2 (KYC and Image Gen). The frontend is in active development with most UI components and routing implemented.

## Tech Stack

### Backend (FastAPI)
- **Framework**: FastAPI (Async)
- **Database**: SQLAlchemy 2.0 (Async) with PostgreSQL (local SQLite for dev)
- **Migrations**: Alembic
- **Auth**: Google OAuth + JWT (python-jose)
- **Storage**: Local filesystem (`backend/storage/objects`) for dev; DigitalOcean Spaces (S3) planned for production.
- **Real-time**: Server-Sent Events (SSE) for job progress tracking.

### AI Pipeline
- **Orchestration**: Custom Python orchestrators (standalone in `pipeline/` and API-integrated in `backend/pipeline/`).
- **Models**:
  - **OpenAI GPT-4.1 mini**: Product KYC and Video Prompt generation.
  - **OpenAI gpt-image-1**: A+ Image generation.
  - **Google Veo 3.1**: Video frame generation.

### Frontend (React)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **State/Data**: React Query + React Context
- **Routing**: React Router DOM v6

## Directory Structure

- `backend/`: FastAPI application, database models, and API-specific pipeline logic.
- `frontend/`: React application source code.
- `pipeline/`: Standalone Python scripts for the 4-stage AI pipeline (original/CLI version).
- `Documentation/`: Detailed technical specifications for backend, frontend, and database.

## Key Development Commands

### Backend
- **Setup**: `cd backend && pip install -r requirements.txt`
- **Run**: `uvicorn app.main:app --reload`
- **Migrations**: `alembic upgrade head`

### Frontend
- **Setup**: `cd frontend && npm install`
- **Run**: `npm run dev`
- **Build**: `npm run build`

### Standalone Pipeline
- **Run**: `cd pipeline && python main.py <brand> <website> <product> <category> <image_path>`

## Development Conventions

- **Surgical Updates**: When modifying the backend, ensure changes align with the `backend/PLAN.md`.
- **Environment Variables**: Always use `.env` files (refer to `.env.example` in respective directories). Never commit secrets.
- **Pipeline Integration**: The backend uses its own internal `pipeline/` directory which refactors the root `pipeline/` scripts into async library functions.
- **UI Components**: Use Shadcn UI components located in `frontend/src/components/ui/`.

## Roadmap / TODOs
- Complete stage 3 (video prompts) and stage 4 (video gen) integration into the web backend.
- Implement production storage (DigitalOcean Spaces).
- Finalize Google OAuth and project management (CRUD) in the frontend.
