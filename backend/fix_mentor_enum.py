import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text

def add_mentor_to_enum():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url or not database_url.startswith("postgresql"):
        print("Not using PostgreSQL, skipping enum update.")
        return

    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from app.database import engine

    try:
        with engine.connect() as conn:
            conn.execute(text("COMMIT"))
            conn.execute(text("ALTER TYPE roleenum ADD VALUE 'mentor'"))
            print("Successfully added 'mentor' to roleenum!")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("'mentor' already exists in roleenum.")
        else:
            print(f"Error adding 'mentor' to roleenum: {e}")

if __name__ == "__main__":
    add_mentor_to_enum()
