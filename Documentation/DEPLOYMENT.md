# Deployment Guide

## Overview

ContentPro is deployed on a DigitalOcean droplet behind Nginx. The application consists of:
- **Frontend**: React + TypeScript app, container exposed on port 3001 and published via `https://platform.contentpro.in`
- **Backend**: FastAPI application, container exposed on port 8001 and published via `https://api.contentpro.in`
- **Database**: PostgreSQL 16 (managed outside Docker Compose)
- **Storage**: DigitalOcean Spaces (S3-compatible)

---

## Where It's Deployed

| Service | URL | Port |
|---------|-----|------|
| Frontend | https://platform.contentpro.in | 443 → 3001 |
| Backend API | https://api.contentpro.in | 443 → 8001 |
| Backend Health | https://api.contentpro.in/health | 443 → 8001 |

**Location on server:** `/opt/ContentPro-Pipeline`

---

## Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (optional, for local PostgreSQL only)

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your local configuration

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Point frontend to local backend
export VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
# Runs on http://localhost:5173
```

### 3. Local PostgreSQL with Docker (Optional)

```bash
cd backend
docker compose up -d
```

---

## Updating the Deployed Version

### For Normal Code Changes

1. SSH into the server:
   ```bash
   ssh root@167.71.232.255
   ```

2. Navigate to the project directory:
   ```bash
   cd /opt/ContentPro-Pipeline
   ```

3. Pull the latest changes:
   ```bash
   git fetch origin
   git checkout app
   git pull origin app
   ```

4. Optional but recommended backup before deploy:
   ```bash
   PGPASSWORD='<db-password>' pg_dump -h 127.0.0.1 -U <db-user> -d contentpro > backup_contentpro_$(date +%Y%m%d_%H%M%S).sql
   ```

5. Rebuild and restart the containers:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build backend frontend
   ```

6. Verify the deployment:
   ```bash
   curl https://api.contentpro.in/health
   curl https://platform.contentpro.in
   ```

If the public domains, ports, and reverse-proxy routes are unchanged, no Nginx or Certbot changes are needed for a normal application deploy.

### For Alembic Database Migrations

The backend container automatically runs `alembic upgrade head` on startup through `backend/entrypoint.sh`, but for production deploys it is safer to run migrations explicitly before restarting the app:

```bash
# SSH into the server
ssh root@167.71.232.255
cd /opt/ContentPro-Pipeline

# Rebuild backend first so docker compose run uses the newest migration files
docker compose -f docker-compose.prod.yml build backend

# Run migrations manually
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Check current migration version
docker compose -f docker-compose.prod.yml run --rm backend alembic current
```

### Checking Migration Status

```bash
# List all migrations and their status
docker compose -f docker-compose.prod.yml run --rm backend alembic history

# Or check from local
cd backend
alembic current
alembic history
```

---

## Deploying from Scratch

### 1. Server Preparation

```bash
# SSH into the server
ssh root@167.71.232.255

# Install Docker if not already installed
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# Install Nginx and Certbot
apt update
apt install -y nginx certbot python3-certbot-nginx
```

### 2. Clone the Repository

```bash
cd /opt
git clone <repository-url> ContentPro-Pipeline
cd ContentPro-Pipeline
```

### 3. Configure Environment Variables

Create `backend/.env`:

```env
APP_NAME=ContentPro Backend
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/contentpro
JWT_SECRET=replace-with-32-char-secret
JWT_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=https://platform.contentpro.in
FRONTEND_URL=https://platform.contentpro.in
BACKEND_URL=https://api.contentpro.in

# API Keys
OPENAI_API_KEY=
REVE_API_KEY=
GEMINI_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# DigitalOcean Spaces
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_REGION=sfo3
DO_SPACES_BUCKET=
DO_SPACES_ENDPOINT=https://sfo3.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=
```

Update `docker-compose.prod.yml` frontend build args:

```yaml
frontend:
  build:
    context: ./frontend
    args:
      VITE_API_URL: https://api.contentpro.in
```

### 4. Configure Nginx

Create an Nginx site that proxies:
- `platform.contentpro.in` → `http://127.0.0.1:3001`
- `api.contentpro.in` → `http://127.0.0.1:8001`

Then enable the site and reload:

```bash
ln -sf /etc/nginx/sites-available/contentpro /etc/nginx/sites-enabled/contentpro
nginx -t
systemctl reload nginx
```

Issue SSL certificates:

```bash
certbot --nginx -d platform.contentpro.in -d api.contentpro.in
```

### 5. Build and Start

```bash
# Build backend first if migrations were added
docker compose -f docker-compose.prod.yml build backend

# Apply database migrations explicitly
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Build and start services
docker compose -f docker-compose.prod.yml up -d --build backend frontend
```

### 6. Verify Deployment

```bash
# Check backend health
curl https://api.contentpro.in/health

# Check frontend
curl https://platform.contentpro.in
```

### 7. Configure Google OAuth

Google OAuth requires the public domains above.

In Google Cloud Console:
- Authorized JavaScript origins: `https://platform.contentpro.in`
- Authorized redirect URIs: `https://api.contentpro.in/auth/google/callback`

Backend redirect behavior depends on:
- `BACKEND_URL` → builds `/auth/google/callback`
- `FRONTEND_URL` → builds `/auth/callback`

### 8. View Logs

```bash
# Backend logs
docker compose -f docker-compose.prod.yml logs -f backend

# Frontend logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

---

## Docker Compose Configuration

The production configuration (`docker-compose.prod.yml`) currently uses host ports for the app containers, while Nginx publishes the public domains:

```yaml
services:
  backend:
    build:
      context: ./backend
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/storage:/app/storage
    ports:
      - "8001:8000"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: https://api.contentpro.in
    ports:
      - "3001:80"
    depends_on:
      - backend
    restart: unless-stopped
```

---

## Troubleshooting

### Container not starting
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Rebuild if needed
docker compose -f docker-compose.prod.yml build --no-cache
```

### Database connection issues
```bash
# Check DATABASE_URL in backend/.env

# Verify the backend image can reach the database
docker compose -f docker-compose.prod.yml run --rm backend alembic current
```

### Migration issues
```bash
# Rebuild backend first if new migration files were added
docker compose -f docker-compose.prod.yml build backend

# Check current version
docker compose -f docker-compose.prod.yml run --rm backend alembic current

# Try migration again
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

### Google OAuth issues
```bash
# Verify the login endpoint redirects correctly
curl -I "https://api.contentpro.in/auth/google/login?next_path=%2Fdashboard"

# Check that backend/.env contains:
# BACKEND_URL=https://api.contentpro.in
# FRONTEND_URL=https://platform.contentpro.in
```

---

## Backup and Restore

### Database Backup (PostgreSQL)
```bash
# Create backup from the server host
PGPASSWORD='<db-password>' pg_dump -h 127.0.0.1 -U <db-user> -d contentpro > backup.sql

# Restore from backup from the server host
PGPASSWORD='<db-password>' psql -h 127.0.0.1 -U <db-user> -d contentpro < backup.sql
```

### Manual Backup
Backups are stored in the project directory:
```bash
ls -la /opt/ContentPro-Pipeline/backup_contentpro_*.sql
```
