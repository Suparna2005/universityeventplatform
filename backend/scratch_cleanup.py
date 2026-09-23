from app.database import SessionLocal
from app.models.user import User, ClubMembership, RoleEnum

db = SessionLocal()

# Find all students
students = db.query(User).filter(User.role == RoleEnum.student).all()

deleted_count = 0
for student in students:
    # Check if they have any memberships
    has_membership = db.query(ClubMembership).filter(ClubMembership.user_id == student.id).first()
    if not has_membership:
        db.delete(student)
        deleted_count += 1

db.commit()
db.close()

print(f"Successfully deleted {deleted_count} student(s) who were not part of any club.")
