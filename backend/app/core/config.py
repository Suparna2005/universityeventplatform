import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "University Event Management Platform"
    _db_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/university_events.db")
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL: str = _db_url

settings = Settings()
