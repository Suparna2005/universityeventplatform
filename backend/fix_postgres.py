import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text

# Load environment variables from .env
load_dotenv()

def fix_postgres():
    database_url = os.getenv("DATABASE_URL")
    if not database_url or not database_url.startswith("postgresql"):
        print("DATABASE_URL is not set to PostgreSQL in .env!")
        return

    # Add directory to sys.path so we can import app modules
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from app.database import engine

    print(f"Connecting to PostgreSQL...")
    try:
        with engine.connect() as conn:
            # Add missing columns
            columns_to_add = [
                ("accessories_req", "TEXT"),
                ("guests_req", "TEXT"),
                ("gifts_req", "TEXT"),
                ("prizes_req", "TEXT"),
                ("certificate_template_url", "TEXT"),
            ]
            for col_name, col_type in columns_to_add:
                try:
                    conn.execute(text("COMMIT"))
                    conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}"))
                    print(f"Added column {col_name} to events table.")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        pass
                    else:
                        print(f"Warning on {col_name}: {e}")
                        
            # Add rank to registrations
            try:
                conn.execute(text("COMMIT"))
                conn.execute(text("ALTER TABLE registrations ADD COLUMN rank TEXT"))
                print("Added column rank to registrations table.")
            except Exception as e:
                pass

            # Add rank and is_published to certificates
            try:
                conn.execute(text("COMMIT"))
                conn.execute(text("ALTER TABLE certificates ADD COLUMN rank TEXT DEFAULT 'Participation'"))
                print("Added column rank to certificates table.")
            except Exception as e:
                pass
                
            try:
                conn.execute(text("COMMIT"))
                conn.execute(text("ALTER TABLE certificates ADD COLUMN is_published INTEGER DEFAULT 0"))
                print("Added column is_published to certificates table.")
            except Exception as e:
                pass

            # Update Enum
            # In PostgreSQL, we can use ALTER TYPE to add a new value
            enum_values = [
                "pending_mentor_initial",
                "pending_admin_initial",
                "pending_finance",
                "pending_admin_final",
                "pending_mentor_final",
                "pending_coordinator_publish",
                "pending_completion"
            ]
            
            for val in enum_values:
                try:
                    # Need to run outside transaction block to ALTER TYPE
                    conn.execute(text("COMMIT"))
                    conn.execute(text(f"ALTER TYPE eventstate ADD VALUE '{val}'"))
                    print(f"Added '{val}' to eventstate enum.")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        pass
                    else:
                        print(f"Warning adding enum value {val}: {e}")

            print("PostgreSQL Database successfully updated!")
    except Exception as e:
        print(f"Failed to connect or update PostgreSQL: {e}")

if __name__ == "__main__":
    fix_postgres()
