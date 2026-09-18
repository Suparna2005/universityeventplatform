import sqlite3
import os

db_path = os.path.join("data", "university_events.db")

def fix_enum():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Disable foreign keys temporarily
        cursor.execute("PRAGMA foreign_keys=off;")
        
        # Check if events_old exists, if so drop it
        cursor.execute("DROP TABLE IF EXISTS events_old")
        
        # Rename events to events_old
        cursor.execute("ALTER TABLE events RENAME TO events_old")
        
        # Get the new table schema using SQLAlchemy (by importing the app's Base)
        import sys
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        from app.database import engine
        from app.models.base import Base
        from app.models.event import Event # Ensure models are imported
        
        # This will create the new 'events' table with the updated Enum CHECK constraint!
        Base.metadata.create_all(bind=engine)
        
        # Now copy the data back
        # Find intersection of columns
        cursor.execute("PRAGMA table_info(events_old)")
        old_cols = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(events)")
        new_cols = [col[1] for col in cursor.fetchall()]
        
        common_cols = [c for c in old_cols if c in new_cols]
        cols_str = ", ".join(common_cols)
        
        # Insert data mapping old states to new states where necessary
        # We'll just copy them over. If a state doesn't match the new enum, we can default to 'published'
        
        cursor.execute(f"SELECT {cols_str} FROM events_old")
        rows = cursor.fetchall()
        
        for row in rows:
            row_dict = dict(zip(common_cols, row))
            # Fix state if it's an old one
            old_state = row_dict.get('state', '')
            valid_new_states = [
                'pending_mentor_initial', 'pending_admin_initial', 'pending_finance',
                'pending_admin_final', 'pending_mentor_final', 'pending_coordinator_publish', 'published',
                'registration_closed', 'in_progress', 'pending_completion', 'completed', 'cancelled'
            ]
            if old_state not in valid_new_states:
                row_dict['state'] = 'published'
                
            placeholders = ", ".join(["?"] * len(common_cols))
            values = tuple(row_dict[col] for col in common_cols)
            
            cursor.execute(f"INSERT INTO events ({cols_str}) VALUES ({placeholders})", values)
            
        cursor.execute("DROP TABLE events_old")
        cursor.execute("PRAGMA foreign_keys=on;")
        
        conn.commit()
        print("Successfully rebuilt the events table to fix the Enum constraints!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_enum()
