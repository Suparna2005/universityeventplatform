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
GALLERY_DIR = "/tmp/uploads/gallery" if is_vercel else "uploads/gallery"
EXPENSES_DIR = "/tmp/uploads/expenses" if is_vercel else "uploads/expenses"
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(ATTENDANCE_DIR, exist_ok=True)
    os.makedirs(GALLERY_DIR, exist_ok=True)
    os.makedirs(EXPENSES_DIR, exist_ok=True)
except Exception:
    pass

from fastapi.responses import JSONResponse
from fastapi.requests import Request

async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    with open("backend_error.log", "w") as f:
        f.write(traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": traceback.format_exc()})


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
                try: conn.execute("ALTER TABLE users ADD COLUMN created_by_role TEXT")
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
                try: conn.execute("ALTER TABLE events ADD COLUMN certificate_template_url TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE events ADD COLUMN accessories_req TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE events ADD COLUMN guests_req TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE events ADD COLUMN gifts_req TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE events ADD COLUMN prizes_req TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE registrations ADD COLUMN rank TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE certificates ADD COLUMN rank TEXT DEFAULT 'Participation'")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE certificates ADD COLUMN is_published INTEGER DEFAULT 0")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE clubs ADD COLUMN club_type TEXT DEFAULT 'university'")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE clubs ADD COLUMN department TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE students ADD COLUMN year INTEGER")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE students ADD COLUMN section TEXT")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE feedback ADD COLUMN user_id INTEGER")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE club_leave_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'")
                except sqlite3.OperationalError: pass
                try: conn.execute("ALTER TABLE system_roles ADD COLUMN permissions JSON DEFAULT '{}'")
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

    # Patch Postgres/Supabase database missing columns
    if not settings.DATABASE_URL.startswith("sqlite:///"):
        try:
                queries = [
                    "ALTER TABLE events ADD COLUMN club_id INTEGER REFERENCES clubs(id)",
                    "ALTER TABLE events ADD COLUMN budget INTEGER NOT NULL DEFAULT 0",
                    "ALTER TABLE events ADD COLUMN attendance_file_url TEXT",
                    "ALTER TABLE events ADD COLUMN certificate_template_url TEXT",
                    "ALTER TABLE events ADD COLUMN accessories_req TEXT",
                    "ALTER TABLE events ADD COLUMN guests_req TEXT",
                    "ALTER TABLE events ADD COLUMN gifts_req TEXT",
                    "ALTER TABLE events ADD COLUMN prizes_req TEXT",
                    "ALTER TABLE events ADD COLUMN end_date TIMESTAMP",
                    "ALTER TABLE users ADD COLUMN profile_picture TEXT",
                    "ALTER TABLE users ADD COLUMN bio TEXT",
                    "ALTER TABLE users ADD COLUMN phone_number TEXT",
                    "ALTER TABLE users ADD COLUMN department TEXT",
                    "ALTER TABLE users ADD COLUMN gender TEXT",
                    "ALTER TABLE users ADD COLUMN created_by_role TEXT",
                    "ALTER TABLE budgets ADD COLUMN proposed_amount REAL",
                    "ALTER TABLE budgets ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'",
                    "ALTER TABLE budgets ADD COLUMN proposed_by_id INTEGER",
                    "ALTER TABLE budgets ADD COLUMN approved_by_id INTEGER",
                    "ALTER TABLE registrations ADD COLUMN rank TEXT",
                    "ALTER TABLE certificates ADD COLUMN rank TEXT DEFAULT 'Participation'",
                    "ALTER TABLE certificates ADD COLUMN is_published INTEGER DEFAULT 0",
                    "ALTER TABLE clubs ADD COLUMN club_type VARCHAR(50) DEFAULT 'university'",
                    "ALTER TABLE clubs ADD COLUMN department TEXT",
                    "ALTER TYPE joinrequeststatus ADD VALUE IF NOT EXISTS 'pending_admin'",
                    "ALTER TYPE leaverequeststatus ADD VALUE IF NOT EXISTS 'pending_admin'",
                    "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255) USING role::text;",
                    "CREATE TYPE accountrequeststatus AS ENUM ('pending', 'approved', 'rejected')",
                    "CREATE TABLE IF NOT EXISTS account_requests (id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, email VARCHAR NOT NULL, requested_role VARCHAR NOT NULL, department VARCHAR NOT NULL, year INTEGER, section VARCHAR, status accountrequeststatus DEFAULT 'pending' NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
                    "ALTER TABLE students ADD COLUMN year INTEGER",
                    "ALTER TABLE students ADD COLUMN section VARCHAR",
                    "ALTER TABLE feedback ADD COLUMN user_id INTEGER REFERENCES users(id)",
                    "ALTER TABLE club_leave_requests ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'",
                    "ALTER TABLE system_roles ADD COLUMN permissions JSON DEFAULT '{}'::json"
                ]
                with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                    for q in queries:
                        try:
                            conn.execute(text(q))
                        except Exception as inner_e:
                            pass
        except Exception as e:
            print(f"Postgres patch skipped: {e}")
            
    # Seed default base roles
    try:
        from app.database import SessionLocal
        from app.models.user import SystemRole
        db = SessionLocal()
        
        default_roles = {
            "admin": {
                "dashboard_type": "admin",
                "permissions": {
                    "users": {"view_directory": True, "generate_users": True, "delete_users": True, "assign_coordinators": True, "manage_club_requests": True},
                    "events": {"view_events": True, "approve_events": True, "delete_events": True, "scanner": True, "registration_list": True, "upload_attendance": True, "manage_certificates": True, "manage_events": True},
                    "clubs": {"view_clubs": True, "manage_gallery": True, "delete_clubs": True},
                    "finance": {"view_expenses": True, "verify_expenses": True},
                    "system_setup": {"manage_departments": True, "manage_roles": True},
                    "student_portal": {"view_events": True, "register_events": True, "view_recommendations": True, "view_certificates": True, "submit_feedback": True, "view_clubs": True, "join_clubs_direct": True, "join_clubs_via_coordinator": True}
                }
            },
            "coordinator": {
                "dashboard_type": "admin",
                "permissions": {
                    "users": {"view_directory": True, "generate_users": False, "delete_users": False, "assign_coordinators": False, "manage_club_requests": True},
                    "events": {"view_events": True, "approve_events": False, "delete_events": False, "scanner": True, "registration_list": True, "upload_attendance": True, "manage_certificates": True, "manage_events": True},
                    "clubs": {"view_clubs": True, "manage_gallery": True, "delete_clubs": False},
                    "finance": {"view_expenses": False, "verify_expenses": False},
                    "system_setup": {"manage_departments": False, "manage_roles": False},
                    "student_portal": {"view_events": True, "register_events": True, "view_recommendations": True, "view_certificates": True, "submit_feedback": True, "view_clubs": True, "join_clubs_direct": True, "join_clubs_via_coordinator": True}
                }
            },
            "club_coordinator": {
                "dashboard_type": "admin",
                "permissions": {
                    "users": {"view_directory": True, "generate_users": False, "delete_users": False, "assign_coordinators": False, "manage_club_requests": True},
                    "events": {"view_events": True, "approve_events": False, "delete_events": False, "scanner": True, "registration_list": True, "upload_attendance": True, "manage_certificates": True, "manage_events": True},
                    "clubs": {"view_clubs": True, "manage_gallery": True, "delete_clubs": False},
                    "finance": {"view_expenses": False, "verify_expenses": False},
                    "system_setup": {"manage_departments": False, "manage_roles": False},
                    "student_portal": {"view_events": True, "register_events": True, "view_recommendations": True, "view_certificates": True, "submit_feedback": True, "view_clubs": True, "join_clubs_direct": True, "join_clubs_via_coordinator": True}
                }
            },
            "student": {
                "dashboard_type": "student",
                "permissions": {
                    "student_portal": {"view_events": True, "register_events": True, "view_recommendations": True, "view_certificates": True, "submit_feedback": True, "view_clubs": True, "join_clubs_direct": False, "join_clubs_via_coordinator": True}
                }
            },
            "faculty": {
                "dashboard_type": "student",
                "permissions": {
                    "student_portal": {"view_events": True, "register_events": False, "view_recommendations": True, "view_certificates": False, "submit_feedback": False, "view_clubs": True, "join_clubs_direct": True, "join_clubs_via_coordinator": False}
                }
            },
            "finance": {
                "dashboard_type": "admin",
                "permissions": {
                    "finance": {"view_expenses": True, "verify_expenses": True}
                }
            }
        }
        
        for role_name, perms in default_roles.items():
            existing = db.query(SystemRole).filter(SystemRole.name == role_name).first()
            if not existing:
                db.add(SystemRole(name=role_name, permissions=perms))
            elif not existing.permissions or existing.permissions == {}:
                existing.permissions = perms
            else:
                # Force update the join club permissions since they might have been saved as false
                current_perms = dict(existing.permissions)
                student_portal = current_perms.get("student_portal", {})
                
                # Check if this role is supposed to have these true in the defaults
                default_sp = perms.get("student_portal", {})
                student_portal["join_clubs_direct"] = default_sp.get("join_clubs_direct", False)
                student_portal["join_clubs_via_coordinator"] = default_sp.get("join_clubs_via_coordinator", False)
                current_perms["student_portal"] = student_portal
                
                # Force SQLAlchemy to update the JSON column
                from sqlalchemy.orm.attributes import flag_modified
                existing.permissions = current_perms
                flag_modified(existing, "permissions")
                    
        db.commit()
        db.close()
    except Exception as e:
        print(f"Role seeding skipped: {e}")

    yield

    # Teardown actions

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)
app.add_exception_handler(Exception, global_exception_handler)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/profiles", StaticFiles(directory=UPLOAD_DIR), name="static_profiles")
app.mount("/static/attendance", StaticFiles(directory=ATTENDANCE_DIR), name="static_attendance")

CERTIFICATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "certificates")
os.makedirs(CERTIFICATE_DIR, exist_ok=True)
app.mount("/static/certificates", StaticFiles(directory=CERTIFICATE_DIR), name="static_certificates")
app.mount("/api/uploads/expenses", StaticFiles(directory=EXPENSES_DIR), name="expenses")
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

@app.get("/api/setup-database")
def setup_database():
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        if not settings.DATABASE_URL.startswith("sqlite:///"):
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_by_role TEXT"))
                except Exception as e:
                    print(f"Force add column failed: {e}")
        
        # Insert seed users if they don't exist
        from app.database import SessionLocal
        from app.models.user import User
        db = SessionLocal()
        
        if db.query(User).count() == 0:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            valid_hash = pwd_context.hash("admin123")
            seed_users = [
                User(email='admin@example.com', hashed_password=valid_hash, role='admin', name='Admin'),
                User(email='coordinator@test.edu', hashed_password=valid_hash, role='coordinator', name='Coordinator'),
                User(email='finance@test.edu', hashed_password=valid_hash, role='finance', name='Finance Dept'),
                User(email='mentor@test.edu', hashed_password=valid_hash, role='mentor', name='Mentor'),
                User(email='student001@test.edu', hashed_password=valid_hash, role='student', name='Test Student')
            ]
            db.add_all(seed_users)
            db.commit()
            db.close()
            return {"message": "Database tables created and 5 demo accounts (admin, coordinator, finance, mentor, student) inserted successfully!"}
            
        db.close()
        return {"message": "Database tables already exist and are fully populated!"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/force-patch")
def force_patch():
    try:
        from sqlalchemy import text
        from app.database import engine
        queries = [
            "ALTER TABLE users ADD COLUMN created_by_role TEXT",
            "ALTER TABLE clubs ADD COLUMN club_type VARCHAR(50) DEFAULT 'university'",
            "ALTER TABLE clubs ADD COLUMN department TEXT",
            "ALTER TYPE joinrequeststatus ADD VALUE IF NOT EXISTS 'pending_admin'",
            "ALTER TYPE leaverequeststatus ADD VALUE IF NOT EXISTS 'pending_admin'",
            "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255) USING role::text;",
            "ALTER TABLE events ADD COLUMN department VARCHAR(255)",
            "ALTER TABLE events ADD COLUMN coordinator_id INTEGER REFERENCES users(id)",
            "ALTER TABLE events ADD COLUMN expenses_file_url TEXT",
            "UPDATE events SET department = (SELECT department FROM clubs WHERE clubs.id = events.club_id) WHERE department IS NULL",
            "UPDATE events SET coordinator_id = (SELECT id FROM users WHERE users.role = 'coordinator' AND users.department = events.department LIMIT 1) WHERE coordinator_id IS NULL AND department IS NOT NULL AND department != 'University'"
        ]
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            for q in queries:
                try:
                    conn.execute(text(q))
                except Exception:
                    pass
        return {"success": True, "message": "Patches applied"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/standardize-depts")
def standardize_depts():
    try:
        from sqlalchemy import text
        from app.database import engine
        
        # Mappings
        updates = [
            # CSE
            "UPDATE users SET department = 'CSE' WHERE department ILIKE '%computer%' OR department ILIKE '%cse%'",
            "UPDATE clubs SET department = 'CSE' WHERE department ILIKE '%computer%' OR department ILIKE '%cse%'",
            
            # ME
            "UPDATE users SET department = 'ME' WHERE department ILIKE '%mech%' OR department ILIKE '%mee%'",
            "UPDATE clubs SET department = 'ME' WHERE department ILIKE '%mech%' OR department ILIKE '%mee%'",
            
            # ECE
            "UPDATE users SET department = 'ECE' WHERE department ILIKE '%electro%' OR department ILIKE '%ece%'",
            "UPDATE clubs SET department = 'ECE' WHERE department ILIKE '%electro%' OR department ILIKE '%ece%'",
            
            # EE
            "UPDATE users SET department = 'EE' WHERE department ILIKE '%electrical%' OR department = 'EE'",
            "UPDATE clubs SET department = 'EE' WHERE department ILIKE '%electrical%' OR department = 'EE'",
            
            # BBA / Arts -> BBA
            "UPDATE users SET department = 'BBA' WHERE department ILIKE '%bba%' OR department ILIKE '%arts%' OR department ILIKE '%business%' OR department ILIKE '%bca%'",
            "UPDATE clubs SET department = 'BBA' WHERE department ILIKE '%bba%' OR department ILIKE '%arts%' OR department ILIKE '%business%' OR department ILIKE '%bca%'",
        ]
        
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            for q in updates:
                conn.execute(text(q))
                
        return {"success": True, "message": "All departments standardized successfully to CSE, ECE, ME, EE, BBA!"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/reset-pass")
def reset_pass():
    try:
        from passlib.context import CryptContext
        from app.database import SessionLocal
        from app.models.user import User
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        db = SessionLocal()
        
        valid_hash = pwd_context.hash("admin123")
        users = db.query(User).all()
        for u in users:
            if u.email in ["admin@example.com", "coordinator@test.edu", "finance@test.edu", "faculty@test.edu", "student001@test.edu", "mentor@test.edu"]:
                u.hashed_password = valid_hash
                
        db.commit()
        db.close()
        return {"success": True, "message": "All default user passwords reset to 'admin123'"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/cleanup-students")
def cleanup_students():
    try:
        from app.database import SessionLocal
        from app.models.user import User, ClubMembership, RoleEnum
        db = SessionLocal()
        
        students = db.query(User).filter(User.role == RoleEnum.student).all()
        deleted_count = 0
        for student in students:
            has_membership = db.query(ClubMembership).filter(ClubMembership.user_id == student.id).first()
            if not has_membership:
                db.delete(student)
                deleted_count += 1
                
        db.commit()
        db.close()
        return {"success": True, "message": f"Successfully deleted {deleted_count} student(s) who were not part of any club."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/upgrade-db")
def upgrade_database():
    results = []
    try:
        with engine.connect() as conn:
            # 1. Add columns
            try: 
                conn.execute(text("ALTER TABLE events ADD COLUMN rejection_reason TEXT"))
                conn.commit()
                results.append("Successfully added rejection_reason column.")
            except Exception as e:
                conn.rollback()
                results.append(f"Skipped rejection_reason (already exists).")
                
            try: 
                conn.execute(text("ALTER TABLE events ADD COLUMN actual_expenses INTEGER"))
                conn.commit()
                results.append("Successfully added actual_expenses column.")
            except Exception as e:
                conn.rollback()
                results.append(f"Skipped actual_expenses (already exists).")

            try:
                conn.execute(text("ALTER TABLE club_memberships ADD COLUMN activity_points INTEGER DEFAULT 0"))
                conn.commit()
                results.append("Successfully added activity_points column to club_memberships.")
            except Exception as e:
                conn.rollback()
                results.append("Skipped activity_points (already exists).")
                
            try:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS club_gallery (
                        id SERIAL PRIMARY KEY,
                        club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
                        image_url VARCHAR NOT NULL,
                        caption VARCHAR,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.commit()
                results.append("Successfully created club_gallery table.")
            except Exception as e:
                conn.rollback()
                results.append(f"Error creating club_gallery: {str(e)}")

            # 2. Convert ENUM to VARCHAR to permanently prevent ENUM value errors
            try:
                with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as auto_conn:
                    auto_conn.execute(text("ALTER TABLE events ALTER COLUMN state TYPE VARCHAR(255) USING state::text"))
                results.append("Converted state column from ENUM to VARCHAR successfully.")
            except Exception as e:
                results.append(f"Skipped state column conversion (already converted or error).")

            try:
                with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as auto_conn:
                    auto_conn.execute(text("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255) USING role::text"))
                results.append("Converted users.role column from ENUM to VARCHAR successfully.")
            except Exception as e:
                pass

        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/seed-clubs")
def seed_clubs():
    results = []
    try:
        # First ensure new tables exist
        Base.metadata.create_all(bind=engine)
        results.append("Created tables if not exist.")
        
        # Add new columns to clubs
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE clubs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                conn.commit()
            except Exception:
                conn.rollback()
            try:
                conn.execute(text("ALTER TABLE clubs ADD COLUMN rating FLOAT DEFAULT 0.0"))
                conn.commit()
            except Exception:
                conn.rollback()
            try:
                conn.execute(text("ALTER TABLE clubs ADD COLUMN achievements VARCHAR"))
                conn.commit()
            except Exception:
                conn.rollback()
            try:
                conn.execute(text("ALTER TABLE clubs ADD COLUMN last_event_date TIMESTAMP"))
                conn.commit()
            except Exception:
                conn.rollback()
                
            try:
                conn.execute(text("ALTER TABLE club_memberships ADD COLUMN activity_points INTEGER DEFAULT 0"))
                conn.commit()
            except Exception:
                conn.rollback()

            try:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS club_gallery (
                        id SERIAL PRIMARY KEY,
                        club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
                        image_url VARCHAR NOT NULL,
                        caption VARCHAR,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.commit()
            except Exception:
                conn.rollback()

        results.append("Altered tables (ignored if exists).")
        
        # Seed 10 clubs
        from app.database import SessionLocal
        from app.models.user import Club
        with SessionLocal() as db:
            club_names = [
                "Tech Innovators Club",
                "Robotics & Automation Society",
                "Cultural & Arts Association",
                "Music & Dance Club",
                "Sports & Athletics Club",
                "Entrepreneurship Cell",
                "Literature & Debate Society",
                "Photography & Media Club",
                "Environmental & Green Club",
                "Coding & Hackathon Club"
            ]
            added_count = 0
            for name in club_names:
                if not db.query(Club).filter(Club.name == name).first():
                    db.add(Club(name=name, description=f"The official {name} of the university."))
                    added_count += 1
            db.commit()
            results.append(f"Seeded {added_count} clubs.")
            
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/debug-events")
def debug_events():
    try:
        with engine.connect() as conn:
            # Query the raw rows from events table
            result = conn.execute(text("SELECT id, title, state FROM events"))
            events = [{"id": row[0], "title": row[1], "state": row[2]} for row in result]
            
            # Query the enum values in postgres
            enum_result = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'eventstate'"))
            enum_values = [row[0] for row in enum_result]
            
        return {"events": events, "enum_values": enum_values}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/test-create-event")
def test_create_event():
    try:
        from datetime import datetime, timedelta
        from app.database import SessionLocal
        from sqlalchemy import text
        from app.models.event import Event, EventState
        
        results = {}
        with SessionLocal() as db:
            # 1. Check existing states in DB via raw SQL
            raw_rs = db.execute(text("SELECT id, title, state FROM events ORDER BY id DESC LIMIT 5"))
            results['raw_recent_events'] = [dict(row._mapping) for row in raw_rs]
            
            # 2. Attempt to create new test event
            new_event = Event(
                title="TEST SYSTEM EVENT",
                description="This is an automated test event.",
                date=datetime.utcnow() + timedelta(days=5),
                location="Main Hall",
                capacity=100,
                budget=5000,
                state=EventState.pending_finance
            )
            db.add(new_event)
            db.commit()
            db.refresh(new_event)
            
            results['new_event_id'] = new_event.id
            
            # 3. Check states again via raw SQL
            raw_rs_after = db.execute(text("SELECT id, title, state FROM events ORDER BY id DESC LIMIT 5"))
            results['raw_recent_events_after'] = [dict(row._mapping) for row in raw_rs_after]
            
            return {"status": "success", "data": results}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}

# Mount routers
from app.api.routers.events import router as events_router
from app.api.routers.clubs import router as clubs_router
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
from app.api.routers.coordinator import router as coordinator_router

app.include_router(events_router)
app.include_router(clubs_router)
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
app.include_router(coordinator_router)

# Serve static files
try:
    if not is_vercel:
        app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
except Exception:
    pass
