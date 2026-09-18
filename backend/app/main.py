from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database import get_db, engine
from app.models.base import Base

# Import all models to ensure they are registered with Base
import app.models 

# Serve static files for profile pictures
from fastapi.staticfiles import StaticFiles
import os

is_vercel = bool(os.getenv("VERCEL"))
UPLOAD_DIR = "/tmp/uploads/profiles" if is_vercel else "uploads/profiles"
ATTENDANCE_DIR = "/tmp/uploads/attendance" if is_vercel else "uploads/attendance"
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(ATTENDANCE_DIR, exist_ok=True)
except Exception:
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-patch SQLite database if running locally on SQLite
    if settings.DATABASE_URL.startswith("sqlite:///"):
        import sqlite3
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                try: conn.execute("ALTER TABLE events ADD COLUMN budget INTEGER NOT NULL DEFAULT 0")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE events ADD COLUMN attendance_file_url TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE users ADD COLUMN profile_picture TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE users ADD COLUMN bio TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE users ADD COLUMN phone_number TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE users ADD COLUMN department TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE users ADD COLUMN gender TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE budgets ADD COLUMN proposed_amount REAL")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE budgets ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE budgets ADD COLUMN proposed_by_id INTEGER")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE budgets ADD COLUMN approved_by_id INTEGER")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE events ADD COLUMN end_date DATETIME")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE registrations ADD COLUMN rank TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE certificates ADD COLUMN rank TEXT DEFAULT 'Participation'")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE certificates ADD COLUMN is_published INTEGER DEFAULT 0")
                except sqlite3.OperationalError: pass
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"SQLite patch skipped: {e}")

    # Automatically create tables for PostgreSQL / Supabase or SQLite
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Table creation warning: {e}")
        
    yield

    # Teardown actions

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Typically restricted to frontend URL in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/profiles", StaticFiles(directory=UPLOAD_DIR), name="static_profiles")
app.mount("/static/attendance", StaticFiles(directory=ATTENDANCE_DIR), name="static_attendance")

@app.on_event("startup")
def dump_db_state():
    try:
        from app.database import SessionLocal
        from app.models.event import Event
        import json
        db = SessionLocal()
        events = db.query(Event).all()
        dump = []
        for e in events:
            dump.append({
                "id": e.id,
                "title": e.title,
                "state": str(e.state)
            })
        with open("debug_dump.json", "w") as f:
            json.dump(dump, f)
        db.close()
    except Exception as e:
        with open("debug_dump.json", "w") as f:
            f.write(str(e))

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "unhealthy"
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy",
        "api": "online",
        "database": db_status
    }

# Mount routers
from app.api.routers.events import router as events_router
from app.api.routers.auth import router as auth_router
from app.api.routers.registrations import router as registrations_router
from app.api.routers.tickets import router as tickets_router
from app.api.routers.attendance import router as attendance_router
from app.api.routers.certificates import router as certificates_router
from app.api.routers.feedback import router as feedback_router
from app.api.routers.admin import router as admin_router
from app.api.routers.profile import router as profile_router
from app.api.routers.finance import router as finance_router
from app.api.routers.analytics import router as analytics_router

app.include_router(events_router)
app.include_router(auth_router)
app.include_router(registrations_router)
app.include_router(tickets_router)
app.include_router(attendance_router)
app.include_router(certificates_router)
app.include_router(feedback_router)
app.include_router(admin_router)
app.include_router(profile_router)
app.include_router(finance_router)
app.include_router(analytics_router)
