import sqlite3
import os

db_path = os.path.join("data", "university_events.db")

def fix_db():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    columns_to_add = [
        ("accessories_req", "TEXT"),
        ("guests_req", "TEXT"),
        ("gifts_req", "TEXT"),
        ("prizes_req", "TEXT"),
    ]

    # Get existing columns
    cursor.execute("PRAGMA table_info(events)")
    existing_columns = [col[1] for col in cursor.fetchall()]

    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}")
                print(f"Added column {col_name} to events table.")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
        else:
            print(f"Column {col_name} already exists.")

    conn.commit()
    conn.close()
    print("Database fix complete!")

if __name__ == "__main__":
    fix_db()
