from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Institute LMS"
    ENV_STATE: Literal["dev", "prod"] = "dev"
    
    # Base URL for the environment
    DATABASE_URL: str | None = None
    
    # Specific URLs
    DEV_DATABASE_URL: str | None = None
    PROD_DATABASE_URL: str | None = None
    
    # Redis
    REDIS_URL: str | None = None
    
    # AWS/S3 (Supabase Storage) for Pre-signed URLs
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str = "us-east-1"
    AWS_BUCKET_NAME: str | None = None
    S3_ENDPOINT_URL: str | None = None

    # Daily.co Config
    DAILY_API_KEY: str | None = None

    # Supabase Auth Settings
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_JWT_SECRET: str | None = None
    SUPABASE_JWT_ALGORITHM: str = "ES256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def sync_database_url(self) -> str:
        """Returns the appropriate database URL based on the current environment state."""
        if self.DATABASE_URL:
             return self.DATABASE_URL
        if self.ENV_STATE == "prod":
            return self.PROD_DATABASE_URL or ""
        return self.DEV_DATABASE_URL or ""

settings = Settings()
