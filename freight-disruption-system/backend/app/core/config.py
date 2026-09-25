"""
Application Configuration
Loads environment variables and provides type-safe settings
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional

class Settings(BaseSettings):
    # ============= DATABASE =============
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/freight_db"

    # ============= JWT SECURITY =============
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ============= EXTERNAL API KEYS =============
    AISSTREAM_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""
    PORT_API_KEY: str = ""

    # ============= CURRENCY EXCHANGE API =============
    EXCHANGE_RATE_API_KEY: Optional[str] = None  # Optional - works without it
    EXCHANGE_RATE_API_URL: str = "https://api.exchangerate.host/latest"
    DEFAULT_CURRENCY: str = "USD"
    CACHE_CURRENCY_HOURS: int = 24
    FALLBACK_USD_INR_RATE: float = 83.25  # Static fallback if API fails

    # ============= REDIS (OPTIONAL) =============
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_ENABLED: bool = True  # Set to False if Redis is not available

    # ============= CORS =============
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ============= SERVER =============
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    DEBUG: bool = True

    # ============= PYDANTIC CONFIG =============
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # Ignore extra environment variables
    }

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into a list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def redis_url(self) -> str:
        """Construct Redis URL"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


# Global settings instance
settings = Settings()

# Print loaded configuration (for debugging)
if settings.DEBUG:
    print("\n" + "="*60)
    print("CONFIGURATION LOADED")
    print("="*60)
    print(f"Database URL: {settings.DATABASE_URL[:30]}...")
    print(f"Currency API URL: {settings.EXCHANGE_RATE_API_URL}")
    print(f"Currency API Key: {'Set' if settings.EXCHANGE_RATE_API_KEY else 'Not Set (using free tier)'}")
    print(f"Redis Enabled: {settings.REDIS_ENABLED}")
    print(f"Redis URL: {settings.redis_url}")
    print(f"Fallback USD/INR Rate: {settings.FALLBACK_USD_INR_RATE}")
    print(f"CORS Origins: {settings.allowed_origins_list}")
    print("="*60 + "\n")