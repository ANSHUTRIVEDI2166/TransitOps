from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/transitops"
    SECRET_KEY: str = "hackathon-transitops-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:5173"

    # Bootstrap admin (created on first API start if missing)
    ADMIN_EMAIL: str = "admin@transitops.com"
    ADMIN_PASSWORD: str = "ChangeMeAdmin123!"
    ADMIN_FULL_NAME: str = "System Admin"

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USE_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: Optional[str] = None
    UPLOAD_DIR: str = "uploads"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def mail_from(self) -> str:
        return self.SMTP_FROM or self.SMTP_USER or "noreply@transitops.com"


settings = Settings()
