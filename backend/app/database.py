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
    table_names = inspector.get_table_names()
    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "role" not in user_columns:
            sync_conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'user'"))
        if "industry" not in user_columns:
            sync_conn.execute(text("ALTER TABLE users ADD COLUMN industry VARCHAR(64) DEFAULT 'jewelry'"))
        if "default_image_model" not in user_columns:
            sync_conn.execute(text("ALTER TABLE users ADD COLUMN default_image_model VARCHAR(50) DEFAULT 'reve'"))
        sync_conn.execute(text("UPDATE users SET role = 'user' WHERE role IS NULL OR TRIM(role) = ''"))
        sync_conn.execute(text("UPDATE users SET industry = 'jewelry' WHERE industry IS NULL OR TRIM(industry) = ''"))
        sync_conn.execute(text("UPDATE users SET default_image_model = 'reve' WHERE default_image_model IS NULL OR TRIM(default_image_model) = ''"))
        sync_conn.execute(text("UPDATE users SET default_image_model = 'gpt-image-1.5' WHERE default_image_model = 'gpt-image-1'"))
        sync_conn.execute(text("UPDATE users SET plan = 'free' WHERE plan IS NULL OR TRIM(plan) = ''"))
    if "industry_prompts" not in table_names:
        sync_conn.execute(
            text(
                """
                CREATE TABLE industry_prompts (
                    industry VARCHAR(64) PRIMARY KEY,
                    prompt_text TEXT NOT NULL,
                    shot_prompts_json JSON,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
        )
    else:
        industry_prompt_columns = {column["name"] for column in inspector.get_columns("industry_prompts")}
        if "shot_prompts_json" not in industry_prompt_columns:
            sync_conn.execute(text("ALTER TABLE industry_prompts ADD COLUMN shot_prompts_json JSON"))
    if "user_prompt_overrides" not in table_names:
        sync_conn.execute(
            text(
                """
                CREATE TABLE user_prompt_overrides (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    industry VARCHAR(64) NOT NULL,
                    prompt_text TEXT NOT NULL,
                    shot_prompts_json JSON,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    CONSTRAINT uq_user_prompt_override_user_industry UNIQUE (user_id, industry),
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
        )
        sync_conn.execute(text("CREATE INDEX ix_user_prompt_overrides_user_id ON user_prompt_overrides (user_id)"))
    else:
        user_prompt_override_columns = {column["name"] for column in inspector.get_columns("user_prompt_overrides")}
        if "shot_prompts_json" not in user_prompt_override_columns:
            sync_conn.execute(text("ALTER TABLE user_prompt_overrides ADD COLUMN shot_prompts_json JSON"))

    if "industry_category_prompts" not in table_names:
        sync_conn.execute(
            text(
                """
                CREATE TABLE industry_category_prompts (
                    id VARCHAR(36) PRIMARY KEY,
                    industry VARCHAR(64) NOT NULL,
                    category_key VARCHAR(128) NOT NULL,
                    category_label VARCHAR(255) NOT NULL,
                    category_prompt_text TEXT NOT NULL,
                    shot_prompts_json JSON,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    CONSTRAINT uq_industry_category_prompt UNIQUE (industry, category_key)
                )
                """
            )
        )
        sync_conn.execute(text("CREATE INDEX ix_industry_category_prompts_industry ON industry_category_prompts (industry)"))

    if "user_category_prompt_overrides" not in table_names:
        sync_conn.execute(
            text(
                """
                CREATE TABLE user_category_prompt_overrides (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    industry VARCHAR(64) NOT NULL,
                    category_key VARCHAR(128) NOT NULL,
                    category_label VARCHAR(255) NOT NULL,
                    category_prompt_text TEXT NOT NULL,
                    shot_prompts_json JSON,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    CONSTRAINT uq_user_category_prompt_override_user_industry_category
                        UNIQUE (user_id, industry, category_key),
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
        )
        sync_conn.execute(text("CREATE INDEX ix_user_category_prompt_overrides_user_id ON user_category_prompt_overrides (user_id)"))
        sync_conn.execute(text("CREATE INDEX ix_user_category_prompt_overrides_industry ON user_category_prompt_overrides (industry)"))

    if "jobs" not in table_names:
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
    if "requested_image_count" not in job_columns:
        sync_conn.execute(text("ALTER TABLE jobs ADD COLUMN requested_image_count INTEGER DEFAULT 4"))
    sync_conn.execute(text("UPDATE jobs SET image_model = 'reve' WHERE image_model IS NULL OR TRIM(image_model) = ''"))
    sync_conn.execute(text("UPDATE jobs SET image_model = 'gpt-image-1.5' WHERE image_model = 'gpt-image-1'"))
    sync_conn.execute(text("UPDATE jobs SET requested_image_count = 4 WHERE requested_image_count IS NULL OR requested_image_count < 1"))

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
