import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
pg_url = os.getenv("DATABASE_URL")
if not pg_url:
    print("NO DB URL")
else:
    engine = create_engine(pg_url)
    with engine.connect() as conn:
        users = conn.execute(text("SELECT id, email, hashed_password FROM users LIMIT 3")).fetchall()
        for u in users:
            print(f"ID: {u[0]}, Email: {u[1]}, Hash: {u[2][:15]}...")
        if not users:
            print("NO USERS FOUND IN POSTGRESQL!")
