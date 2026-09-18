import os
import sys

print("Generating migration...")
res1 = os.system(f"{sys.executable} -m alembic revision --autogenerate -m \"update_event_schema\"")
print(f"Revision result: {res1}")

print("Applying migration...")
res2 = os.system(f"{sys.executable} -m alembic upgrade head")
print(f"Upgrade result: {res2}")
