# Frontend Documentation

## Overview

The ContentPro frontend is a React + TypeScript app that lets users:
- sign in with email/password
- create single image jobs
- run batch image jobs from CSV/XLSX
- monitor live progress
- inspect projects, batches, assets, logs, and downloads

The current frontend is backend-integrated. It is not a mock-only UI.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + Shadcn UI |
| Routing | React Router v6 |
| State | React Context + local storage persistence |
| Data utilities | PapaParse, XLSX |
| Animation | Framer Motion |
| Networking | browser `fetch`, SSE |

## Key Routes

- `/dashboard`
  - main create flow
- `/batch-run`
  - current active batch-run page
  - shows in-progress queued/running rows
  - shows empty state when no batches are active
- `/projects`
  - projects list with batch cards and single-job cards
- `/project/:jobId`
  - opens a specific job detail
- `/batch/:batchId`
  - opens grouped batch detail
- `/profile`
- `/settings`
- `/login`

## Actual Navigation Behavior

- Navbar includes:
  - Create
  - Batch Run
  - Projects
- Batch child job detail back navigation returns to the batch page first
- Batch detail page back navigation returns to Projects

## Current Auth Mode

Supported and active:
- email/password

Important note:
- Google OAuth code exists in parts of the app history, but the live deployment uses email/password because production is hosted on an IP:port deployment rather than a public domain

## Project Structure

```text
frontend/src/
├── components/
│   ├── Navbar.tsx
│   ├── CreationWizard.tsx
│   ├── BatchCreationWizard.tsx
│   ├── GenerationResults.tsx
│   ├── VideoCreation.tsx
│   ├── RecentProjects.tsx
│   └── ProtectedRoute.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ProcessContext.tsx
├── lib/
│   ├── api.ts
│   ├── active-runs.ts
│   ├── mock_data.ts
│   └── utils.ts
├── pages/
│   ├── LandingPage.tsx
│   ├── Index.tsx
│   ├── BatchRunPage.tsx
│   ├── BatchDetailPage.tsx
│   ├── ProjectsPage.tsx
│   ├── ProfilePage.tsx
│   ├── SettingsPage.tsx
│   ├── AuthPage.tsx
│   └── NotFound.tsx
└── App.tsx
```

## Important Frontend Modules

### `src/lib/api.ts`

This is the real backend client.

It handles:
- register/login/current-user
- create/list/get/delete jobs
- get batch jobs
- upload local source images
- upload remote image URLs
- upload public Drive folder links
- download job ZIP and batch ZIP files
- SSE subscription and job polling helpers

### `src/lib/active-runs.ts`

This file is important for understanding current UX.

It persists:
- active single-job runs
- active batch runs

Purpose:
- if the user leaves the page and returns, active jobs can be restored
- completed batch runs are now cleared instead of being shown forever

### `src/components/CreationWizard.tsx`

Single-job creation flow:
- validates required fields
- accepts up to 5 source images
- creates the backend job
- uploads images
- shows live stage/log updates
- renders generated images progressively

### `src/components/BatchCreationWizard.tsx`

Batch setup flow:
- parses CSV/XLSX
- preserves XLSX hyperlink targets
- supports two source modes:
  - direct image links
  - public Google Drive folder links
- renders the actual spreadsheet columns and rows
- lets the user select valid rows before running

### `src/pages/BatchRunPage.tsx`

Batch execution page:
- creates one backend job per selected row up front
- shows queued/running/completed states
- survives route changes while active
- clears itself once all rows are finished

### `src/pages/ProjectsPage.tsx`

Projects page:
- shows single jobs and grouped batch cards
- supports soft delete
- shows input images, generated images, metadata, and logs
- routes batch jobs to batch detail first

## Current Input And Output Limits

- Single job source images: up to 5
- Batch Drive folder source images: first up to 5 files from the public folder
- Generated image target: 6 images per job

## Current Batch UX

There are two distinct batch-related pages:

### `/batch-run`
- operational page for an active batch
- shows queued and running rows
- disappears back to empty state when no batch is active

### `/batch/:batchId`
- historical/project view for a completed or persisted batch
- shows the jobs in that batch
- `View Details` is disabled for jobs that are still queued
- batch ZIP download is available when the batch is no longer running

## API Endpoints Used By Frontend

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
- `POST /jobs/{job_id}/assets/remote`
- `POST /jobs/{job_id}/assets/remote-folder`

## Deployment Notes

- `VITE_API_URL` points the frontend to the backend
- live deployment currently uses IP:port access, not a public domain
- because of that, production auth is email/password rather than Google OAuth
