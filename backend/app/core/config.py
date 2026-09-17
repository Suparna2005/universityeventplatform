import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "University Event Management Platform"
    # Fallback to local sqlite if not set
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/university_events.db")

settings = Settings()
