# backend/app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:Ss%4020052607@localhost:5432/freight_db"

    # JWT Security
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # API Keys
    AISSTREAM_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""
    PORT_API_KEY: str = ""

    # CORS — stored as a comma-separated string in .env, parsed into a list here
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    # Pydantic-settings v2 config
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        # Silently ignore any extra keys in .env (e.g. POSTGRES_USER, POSTGRES_DB)
        # that are not declared as fields — prevents ValidationError on startup.
        "extra": "ignore",
    }

    @property
    def allowed_origins_list(self) -> List[str]:
        """Return ALLOWED_ORIGINS parsed as a list (use this in main.py for CORS)."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()