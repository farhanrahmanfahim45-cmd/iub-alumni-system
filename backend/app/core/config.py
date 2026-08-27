"""
Application configuration.

Every secret is read from the environment (.env in development, real
environment variables in deployment). Nothing is hardcoded here — see
docs/security.md §3 and §8.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    # Short-lived by design: docs/security.md §1 forbids tokens with
    # unlimited lifetime.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS — the React dev server. Tighten for deployment.
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Deployment
    # Serve the built frontend from FastAPI. Set to the path of
    # frontend/dist to run the whole system on one origin, which removes the
    # need for CORS entirely.
    SERVE_FRONTEND_DIR: str | None = None
    # Emit Strict-Transport-Security. Only turn on once TLS actually works,
    # or browsers will refuse the plain-HTTP site for a year.
    HTTPS_ENABLED: bool = False
    # Trust X-Forwarded-For. Only when a reverse proxy really sets it.
    BEHIND_PROXY: bool = False
    LOGIN_MAX_FAILURES: int = 10
    LOGIN_WINDOW_SECONDS: int = 300

    @property
    def conninfo(self) -> str:
        return (
            f"host={self.DB_HOST} port={self.DB_PORT} dbname={self.DB_NAME} "
            f"user={self.DB_USER} password={self.DB_PASSWORD}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
