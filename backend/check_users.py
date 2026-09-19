import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()
url = os.getenv("DATABASE_URL")

try:
    engine = create_engine(url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT email, role FROM users")).fetchall()
        print(f"Total Users in Neon: {len(result)}")
        for row in result:
            print(f"- {row[0]} ({row[1]})")
except Exception as e:
    print(f"Error checking users: {e}")
