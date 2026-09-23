import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()
pg_url = os.getenv("DATABASE_URL")

def update_db():
    if not pg_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to database...")
    engine = create_engine(pg_url)
    
    # Add columns to clubs
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE clubs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.execute(text("ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0.0"))
            conn.execute(text("ALTER TABLE clubs ADD COLUMN IF NOT EXISTS achievements VARCHAR"))
            conn.execute(text("ALTER TABLE clubs ADD COLUMN IF NOT EXISTS last_event_date TIMESTAMP"))
            print("Columns added to clubs table.")
    except Exception as e:
        print(f"Error adding columns to clubs: {e}")

    # Create new tables using Base.metadata.create_all
    try:
        from app.models.user import Base
        Base.metadata.create_all(bind=engine)
        print("New tables created (if they didn't exist).")
    except Exception as e:
        print(f"Error creating new tables: {e}")
        
    print("Database schema update complete.")

if __name__ == "__main__":
    update_db()
