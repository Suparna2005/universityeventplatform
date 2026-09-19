import os
import sys
from sqlalchemy import create_engine, text

URL = "postgresql://neondb_owner:npg_vw8VX3DQHRmB@ep-jolly-hall-avzzghbs-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require"

try:
    engine = create_engine(URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='events'")).fetchall()
        columns = [row[0] for row in result]
        print(f"Columns in 'events' table: {columns}")
        if 'certificate_template_url' in columns:
            print("\nSUCCESS: certificate_template_url exists!")
        else:
            print("\nERROR: certificate_template_url is MISSING!")
except Exception as e:
    print(f"Connection failed: {e}")
