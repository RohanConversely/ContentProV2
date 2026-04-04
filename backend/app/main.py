from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import AsyncSessionLocal, init_db
from app.routers import admin_router, assets_router, auth_router, image_jobs_router, jobs_router, meta_router
from app.services.bootstrap import ensure_bootstrap_data
from app.services.pipeline_runner import start_pipeline_watchdog, stop_pipeline_watchdog

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(jobs_router)
app.include_router(assets_router)
app.include_router(meta_router)
app.include_router(image_jobs_router)

storage_root = settings.storage_root / "objects"
storage_root.mkdir(parents=True, exist_ok=True)
app.mount("/local-storage", StaticFiles(directory=str(storage_root)), name="local-storage")


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()
    async with AsyncSessionLocal() as session:
        await ensure_bootstrap_data(session)
    await start_pipeline_watchdog()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await stop_pipeline_watchdog()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "db": "ok", "redis": "unused"}
