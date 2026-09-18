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

engine_args = {}
if database_url.startswith("sqlite"):
    engine_args["check_same_thread"] = False
    if ":memory:" in database_url:
        engine_args["poolclass"] = StaticPool
    engine = create_engine(database_url, connect_args=engine_args)
else:
    # PostgreSQL / Supabase connection pooling configuration for serverless compatibility
    engine = create_engine(
        database_url,
        pool_pre_ping=True,  # Automatically check & reconnect dead connections
        pool_size=5,         # Suitable for serverless functions
        max_overflow=10,
        pool_recycle=300     # Recycle connections every 5 minutes
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
