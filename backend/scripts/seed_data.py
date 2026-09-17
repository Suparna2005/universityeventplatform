import os
import sys
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User, RoleEnum, Student, Club
from app.models.event import Event, EventState
from passlib.context import CryptContext
from faker import Faker

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
fake = Faker()

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if data already exists to make script safe to rerun
    if db.query(User).first():
        print("Database already seeded. Skipping...")
        db.close()
        return

    print("Seeding database...")
    
    # 1. Create Core Users
    admin = User(name="System Admin", email="admin@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.admin)
    coord = User(name="Club Coordinator", email="coord@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.coordinator)
    mentor = User(name="Faculty Mentor", email="mentor@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.mentor)
    finance = User(name="Finance Officer", email="finance@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.finance)
    
    db.add_all([admin, coord, mentor, finance])
    db.commit()

    # 2. Create Synthetic Clubs
    club1 = Club(name="Computer Science Society", description="For all things tech and coding.")
    club2 = Club(name="Photography Club", description="Capturing moments around the campus.")
    db.add_all([club1, club2])
    db.commit()

    # 3. Create 50 Synthetic Students
    print("Generating 50 synthetic students...")
    students = []
    for i in range(1, 51):
        user = User(
            name=f"Test Student {i:03d}",
            email=f"student{i:03d}@test.edu",
            hashed_password=get_password_hash("password"),
            role=RoleEnum.student
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        student = Student(
            user_id=user.id,
            student_number=f"STU-{2026000 + i}",
            department=fake.random_element(["Computer Science", "Engineering", "Arts", "Business"]),
            semester=fake.random_int(min=1, max=8)
        )
        students.append(student)
        db.add(student)
    db.commit()

    # 4. Create Events
    print("Generating events...")
    now = datetime.utcnow()
    
    # Random normal events
    for i in range(5):
        event = Event(
            title=f"Workshop: {fake.catch_phrase()}",
            description=fake.paragraph(),
            date=now + timedelta(days=fake.random_int(min=2, max=30)),
            location=fake.address().replace("\n", ", "),
            capacity=fake.random_int(min=20, max=100),
            state=EventState.published,
            club_id=club1.id if i % 2 == 0 else club2.id
        )
        db.add(event)

    # Main acceptance test event (Capacity 50)
    acceptance_event = Event(
        title="Annual Tech Hackathon 2026",
        description="The main acceptance test event for 50 students.",
        date=now + timedelta(days=10),
        location="Main Auditorium",
        capacity=50,
        state=EventState.published,
        club_id=club1.id
    )
    db.add(acceptance_event)
    db.commit()

    print("✅ Synthetic database seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed()
