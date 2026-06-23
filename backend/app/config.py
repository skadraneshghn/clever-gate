"""Application configuration via pydantic-settings."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Clever Gateway configuration loaded from environment and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core
    CG_ENV: Literal["development", "production", "test"] = "development"
    CG_HTTP_PORT: int = 8080
    CG_LOG_LEVEL: str = "INFO"

    # Master key
    CG_MASTER_KEY: str = "sk-cg-master-change-me"

    # JWT (admin auth)
    CG_JWT_SECRET: str = "change-this-jwt-secret"
    CG_JWT_ALGORITHM: str = "HS256"
    CG_JWT_ACCESS_EXPIRE_MINUTES: int = 15
    CG_JWT_REFRESH_EXPIRE_DAYS: int = 7

    # Encryption for provider keys (Fernet)
    CG_ENCRYPTION_KEY: str = ""

    # Admin seed
    CG_ADMIN_USERNAME: str = "salman"
    CG_ADMIN_PASSWORD: str = "136517"
    CG_ADMIN_EMAIL: str = "olddealers@gmail.com"
    CG_ADMIN_FIRST_NAME: str = "Salman"
    CG_ADMIN_LAST_NAME: str = "JB"

    # PostgreSQL
    DATABASE_URL: str = (
        "postgresql+asyncpg://cg:cg@localhost:5432/clever_gateway"
    )

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_HOST: str | None = None
    REDIS_PORT: int | None = None
    REDIS_PASSWORD: str | None = None

    @model_validator(mode="after")
    def construct_redis_url(self) -> Settings:
        if self.REDIS_HOST:
            port = self.REDIS_PORT or 6379
            password = self.REDIS_PASSWORD or ""
            if password:
                self.REDIS_URL = f"redis://:{password}@{self.REDIS_HOST}:{port}/0"
            else:
                self.REDIS_URL = f"redis://{self.REDIS_HOST}:{port}/0"
        return self

    # LiteLLM router defaults
    CG_ROUTING_STRATEGY: str = "simple-shuffle"
    CG_NUM_RETRIES: int = 3
    CG_TIMEOUT: int = 60
    CG_ALLOWED_FAILS: int = 3
    CG_COOLDOWN_TIME: int = 60

    # CORS
    CG_CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    @property
    def is_dev(self) -> bool:
        return self.CG_ENV == "development"

    @property
    def is_test(self) -> bool:
        return self.CG_ENV == "test"

    @property
    def is_production(self) -> bool:
        return self.CG_ENV == "production"

    @property
    def async_database_url(self) -> str:
        return self.DATABASE_URL

    @property
    def sync_database_url(self) -> str:
        """Convert async URL to sync for Alembic migrations."""
        url = self.DATABASE_URL
        if "asyncpg" in url:
            return url.replace("asyncpg", "psycopg2")
        if "+aiosqlite" in url:
            return url.replace("+aiosqlite", "")
        return url


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
