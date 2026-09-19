import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import json

load_dotenv()
url = os.getenv("DATABASE_URL")

engine = create_engine(url)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
        tables = [row[0] for row in result]
        
        print("TABLES IN NEON:")
        for t in tables:
            print(f"- {t}")
            
except Exception as e:
    print(f"Error: {e}")
