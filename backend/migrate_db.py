import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, text

# Load environment variables from .env file
load_dotenv()

def migrate():
    print("Starting database migration...")
    
    # 1. Connect to SQLite (Source)
    sqlite_url = "sqlite:///./data/university_events.db"
    if not os.path.exists("./data/university_events.db"):
        print("Error: Could not find the SQLite file at ./data/university_events.db")
        return
        
    sqlite_engine = create_engine(sqlite_url)
    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)

    # 2. Connect to PostgreSQL (Destination)
    pg_url = os.getenv("DATABASE_URL")
    if not pg_url or not pg_url.startswith("postgres"):
        print("Error: DATABASE_URL in .env is missing or not a PostgreSQL URL.")
        print(f"Current DATABASE_URL: {pg_url}")
        return

    try:
        pg_engine = create_engine(pg_url)
        pg_meta = MetaData()
        pg_meta.reflect(bind=pg_engine)
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return

    # Tables in exact order to respect Foreign Key constraints
    tables_to_migrate = [
        "users", "clubs", "students", "events", 
        "registrations", "certificates", "participation_ledger",
        "budgets", "feedback", "tickets", "attendance", "expenses"
    ]

    with sqlite_engine.connect() as sqlite_conn:
        with pg_engine.begin() as pg_conn:
            for table in tables_to_migrate:
                print(f"Migrating table: {table}...")
                if table not in sqlite_meta.tables or table not in pg_meta.tables:
                    print(f"  -> Skipping (table not found in one of the databases)")
                    continue
                
                sqlite_table = sqlite_meta.tables[table]
                pg_table = pg_meta.tables[table]
                
                # Fetch all rows from SQLite
                result = sqlite_conn.execute(sqlite_table.select()).fetchall()
                if not result:
                    print("  -> 0 rows to migrate.")
                    continue
                    
                # Convert rows to dictionaries
                rows = [dict(row._mapping) for row in result]
                
                # Insert rows into PostgreSQL
                pg_conn.execute(pg_table.insert(), rows)
                print(f"  -> Successfully migrated {len(rows)} rows.")
                
                # CRITICAL: Update the PostgreSQL ID sequence 
                # (Otherwise, new users will get ID=1 and cause a crash)
                try:
                    seq_query = text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM {table};")
                    pg_conn.execute(seq_query)
                except Exception as e:
                    print(f"  -> Note: Could not update sequence for {table}")

    print("\nSUCCESS! All data has been perfectly migrated to PostgreSQL.")

if __name__ == "__main__":
    migrate()
