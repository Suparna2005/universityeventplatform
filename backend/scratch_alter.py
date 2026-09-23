from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN created_by_role TEXT"))
        conn.commit()
        print("Successfully added column.")
except Exception as e:
    print(f"Error: {e}")
