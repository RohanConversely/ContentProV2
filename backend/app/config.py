from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ContentPro Backend"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./contentpro.db"
    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 1440
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080"
    frontend_url: str = "http://localhost:8080"
    backend_url: str = "http://127.0.0.1:8000"

    do_spaces_key: str | None = None
    do_spaces_secret: str | None = None
    do_spaces_region: str = "sfo3"
    do_spaces_bucket: str | None = None
    do_spaces_endpoint: str | None = None
    do_spaces_cdn_endpoint: str | None = None

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")

    google_client_id: str | None = None
    google_client_secret: str | None = None
    superadmin_email: str = "admin@edxso.com"
    superadmin_password: str = "admin@1234"
    superadmin_display_name: str = "ContentPro Superadmin"

    @property
    def google_callback_url(self) -> str:
        return f"{self.backend_url.rstrip('/')}/auth/google/callback"

    @property
    def google_frontend_callback_url(self) -> str:
        return f"{self.frontend_url.rstrip('/')}/auth/callback"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]

    @property
    def storage_root(self) -> Path:
        return Path(__file__).resolve().parents[1] / "storage"

    @property
    def spaces_enabled(self) -> bool:
        return bool(
            self.do_spaces_key and self.do_spaces_secret and self.do_spaces_bucket
        )

    @property
    def spaces_cdn_enabled(self) -> bool:
        return bool(self.spaces_enabled and self.do_spaces_cdn_endpoint)

    @property
    def resolved_spaces_endpoint(self) -> str:
        if self.do_spaces_endpoint:
            return self.do_spaces_endpoint
        return f"https://{self.do_spaces_region}.digitaloceanspaces.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
