import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings

# Create data directory safely when necessary
database_url = settings.DATABASE_URL
if database_url.startswith("sqlite:///"):
    db_path = database_url.replace("sqlite:///", "")
    # Ensure directory exists
    dir_name = os.path.dirname(db_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)

# Important: check_same_thread=False is needed for SQLite in FastAPI
# StaticPool is used to maintain a single connection for in-memory DB if used during tests
engine_args = {"check_same_thread": False}
if ":memory:" in database_url:
    engine_args["poolclass"] = StaticPool

engine = create_engine(
    database_url, connect_args=engine_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
