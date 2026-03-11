# Deployment Runbook

This project is prepared to run on one DigitalOcean droplet with Docker Compose using:

- Frontend on `http://167.71.232.255:3001`
- Backend on `http://167.71.232.255:8001`

These host ports were chosen because they were not in use on the droplet during the deployment check.

## Required Secrets

Backend env file: `backend/.env`

Required values:

```env
APP_NAME=ContentPro Backend
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/contentpro
JWT_SECRET=replace-with-32-char-secret
JWT_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://167.71.232.255:3001
FRONTEND_URL=http://167.71.232.255:3001
BACKEND_URL=http://167.71.232.255:8001
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_REGION=blr1
DO_SPACES_BUCKET=
DO_SPACES_ENDPOINT=https://blr1.digitaloceanspaces.com
```

Frontend env file: `frontend/.env.production`

```env
VITE_API_URL=http://167.71.232.255:8001
```

## Authentication For IP-Based Deployment

Google OAuth cannot be used with a raw droplet IP callback. For this deployment:

- use email/password registration and login
- keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` unset on the server
- do not configure Google OAuth redirect URIs for the live server

## Pre-Deployment

1. SSH into the droplet.
2. Install Docker and Docker Compose plugin if they are not already installed.
3. Clone the repo and switch to `app`.
4. Copy `backend/.env.production.example` to `backend/.env`.
5. Copy `frontend/.env.production.example` to `frontend/.env.production`.
6. Fill in the real secrets.
7. If using DigitalOcean Spaces, fill in the Spaces values. If not ready yet, leave them blank and the app will keep using local storage.

## Deploy

Run from the repo root:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Apply Database Migrations

The backend container runs:

```bash
alembic upgrade head
```

before starting Uvicorn.

To run it manually:

```bash
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

## Verify

Backend health:

```bash
curl http://167.71.232.255:8001/health
```

Frontend:

Open:

```text
http://167.71.232.255:3001
```

## Logs

Backend container logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

Frontend container logs:

```bash
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Updating the App

```bash
git pull origin app
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```
