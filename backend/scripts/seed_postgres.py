import os
import sys
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Optional CLI parameter for custom DATABASE_URL
if len(sys.argv) > 1 and sys.argv[1].startswith(("postgresql://", "postgres://", "sqlite:///")):
    os.environ["DATABASE_URL"] = sys.argv[1]

from app.core.config import settings
from app.database import SessionLocal, engine
from app.models.base import Base
import app.models  # Register all models with Base
from app.models.user import User, RoleEnum, Student, Club
from app.models.event import Event, EventState
from passlib.context import CryptContext
from faker import Faker

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
fake = Faker()

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed():
    print(f"📡 Connecting to Database target: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    
    try:
        # Create all tables on target PostgreSQL database
        print("🔨 Creating/verifying database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables successfully created!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        sys.exit(1)

    db = SessionLocal()

    # Check if data already exists
    if db.query(User).first():
        print("ℹ️ Database already contains data. Skipping seed step.")
        db.close()
        return

    print("🌱 Seeding initial core users & sample data...")
    
    try:
        # 1. Core Administrative Users
        admin = User(name="System Admin", email="admin@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.admin)
        coord = User(name="Club Coordinator", email="coord@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.coordinator)
        mentor = User(name="Faculty Mentor", email="mentor@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.mentor)
        finance = User(name="Finance Officer", email="finance@test.edu", hashed_password=get_password_hash("password"), role=RoleEnum.finance)
        
        db.add_all([admin, coord, mentor, finance])
        db.commit()

        # 2. Clubs
        club1 = Club(name="Computer Science Society", description="For all things tech and coding.")
        club2 = Club(name="Photography Club", description="Capturing moments around the campus.")
        db.add_all([club1, club2])
        db.commit()

        # 3. Sample Students
        print("  - Generating initial student accounts...")
        students = []
        for i in range(1, 11):
            user = User(
                name=f"Test Student {i:02d}",
                email=f"student{i:02d}@test.edu",
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

        # 4. Events
        print("  - Generating sample campus events...")
        now = datetime.utcnow()
        for i in range(3):
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

        hackathon = Event(
            title="Annual Tech Hackathon 2026",
            description="The flagship hackathon event for engineering students.",
            date=now + timedelta(days=10),
            location="Main Auditorium",
            capacity=50,
            state=EventState.published,
            club_id=club1.id
        )
        db.add(hackathon)
        db.commit()

        print("🎉 PostgreSQL Database fully initialized and seeded successfully!")
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
