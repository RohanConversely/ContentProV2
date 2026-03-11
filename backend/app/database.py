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
