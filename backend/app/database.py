from collections.abc import AsyncIterator

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, future=True, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    import app.models  # noqa: F401

    if settings.environment.lower() == "production":
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_schema_patches)


def _run_schema_patches(sync_conn) -> None:
    inspector = inspect(sync_conn)
    if "jobs" not in inspector.get_table_names():
        return

    job_columns = {column["name"] for column in inspector.get_columns("jobs")}
    if "additional_input" not in job_columns:
        sync_conn.execute(text("ALTER TABLE jobs ADD COLUMN additional_input JSON"))
    if "batch_id" not in job_columns:
        sync_conn.execute(text("ALTER TABLE jobs ADD COLUMN batch_id VARCHAR(64)"))
    if "batch_name" not in job_columns:
        sync_conn.execute(text("ALTER TABLE jobs ADD COLUMN batch_name VARCHAR(255)"))
    if "image_model" not in job_columns:
        sync_conn.execute(text("ALTER TABLE jobs ADD COLUMN image_model VARCHAR(50) DEFAULT 'flux-2-pro'"))

    asset_columns = {column["name"] for column in inspector.get_columns("assets")}
    if "generation_id" not in asset_columns:
        sync_conn.execute(text("ALTER TABLE assets ADD COLUMN generation_id VARCHAR(36)"))

    if "job_generations" not in inspector.get_table_names():
        sync_conn.execute(
            text(
                """
                CREATE TABLE job_generations (
                    id VARCHAR(36) PRIMARY KEY,
                    job_id VARCHAR(36) NOT NULL,
                    round_number INTEGER NOT NULL,
                    additional_description TEXT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'completed',
                    created_at DATETIME NOT NULL
                )
                """
            )
        )
