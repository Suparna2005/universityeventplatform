from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app.models.user import User, Department, SystemRole
from backend.app.database import engine

Session = sessionmaker(bind=engine)
db = Session()

try:
    print("Migrating unique roles and departments...")
    
    # 1. Get unique roles
    unique_roles = db.query(User.role).distinct().all()
    for (role_name,) in unique_roles:
        if role_name and role_name.strip():
            r = role_name.strip()
            exists = db.query(SystemRole).filter(SystemRole.name.ilike(r)).first()
            if not exists:
                print(f"Adding Role: {r}")
                db.add(SystemRole(name=r))
    
    # Add core roles if not exist
    core_roles = ['student', 'faculty', 'coordinator', 'club_coordinator', 'finance', 'admin', 'mentor']
    for r in core_roles:
        exists = db.query(SystemRole).filter(SystemRole.name.ilike(r)).first()
        if not exists:
            print(f"Adding Core Role: {r}")
            db.add(SystemRole(name=r))

    # 2. Get unique departments
    unique_depts = db.query(User.department).distinct().all()
    for (dept_name,) in unique_depts:
        if dept_name and dept_name.strip():
            d = dept_name.strip()
            exists = db.query(Department).filter(Department.name.ilike(d)).first()
            if not exists:
                print(f"Adding Department: {d}")
                db.add(Department(name=d))

    db.commit()
    print("Migration complete!")
except Exception as e:
    db.rollback()
    print("Error:", e)
finally:
    db.close()
