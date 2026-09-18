import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "University Event Management Platform"
    
    @property
    def DATABASE_URL(self) -> str:
        # Support DATABASE_URL, POSTGRES_URL, or fallback to SQLite
        raw_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "sqlite:///./data/university_events.db"
        raw_url = raw_url.strip()
        if raw_url.startswith("postgres://"):
            raw_url = raw_url.replace("postgres://", "postgresql://", 1)
        return raw_url

settings = Settings()

