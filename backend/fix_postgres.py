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
                    conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}"))
                    print(f"Added column {col_name} to events table.")
                except Exception as e:
                    # Column might already exist
                    if "already exists" in str(e).lower():
                        print(f"Column {col_name} already exists.")
                    else:
                        print(f"Warning on {col_name}: {e}")

            # Update Enum
            # In PostgreSQL, we can use ALTER TYPE to add a new value
            try:
                # Need to run outside transaction block to ALTER TYPE (commit current open transaction)
                conn.execute(text("COMMIT"))
                conn.execute(text("ALTER TYPE eventstate ADD VALUE 'pending_coordinator_publish'"))
                print("Added 'pending_coordinator_publish' to eventstate enum.")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("Enum value 'pending_coordinator_publish' already exists.")
                else:
                    print(f"Warning adding enum value: {e}")

            print("PostgreSQL Database successfully updated!")
    except Exception as e:
        print(f"Failed to connect or update PostgreSQL: {e}")

if __name__ == "__main__":
    fix_postgres()
