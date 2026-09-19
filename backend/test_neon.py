from sqlalchemy import create_engine
from sqlalchemy.sql import text
import sys

URL = "postgresql://neondb_owner:npg_vw8VX3DQHRmB@ep-jolly-hall-avzzghbs-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require"

try:
    engine = create_engine(URL, connect_args={"sslmode": "require"})
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, email, role FROM users")).fetchall()
        print(f"Connection successful! Found {len(result)} users.")
        for row in result:
            print(f"- {row.email} ({row.role})")
except Exception as e:
    print(f"Connection failed: {e}")
