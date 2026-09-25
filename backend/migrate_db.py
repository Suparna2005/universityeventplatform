import sqlite3
import json

db_path = "C:\\Users\\supar\\Downloads\\universityevemng\\university-event-platform\\backend\\data\\university_events.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("ALTER TABLE system_roles ADD COLUMN permissions JSON DEFAULT '{}'")
    conn.commit()
    print("Column added successfully!")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column already exists.")
    else:
        print(f"Error: {e}")
finally:
    conn.close()
