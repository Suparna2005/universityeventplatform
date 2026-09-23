import os
import sys
import random
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.database import SessionLocal
from app.models.user import User, Club, ClubMembership, ClubMemberRole, RoleEnum

def seed_members():
    db = SessionLocal()
    
    clubs = db.query(Club).all()
    if not clubs:
        print("No clubs found. Please seed clubs first.")
        return
        
    print(f"Found {len(clubs)} clubs. Seeding members...")
    
    # Create some mock users first
    mock_users = []
    departments = ["Computer Science", "Electronics", "Mechanical", "Business", "Arts", "Science"]
    
    # Generate 30 mock students
    for i in range(1, 31):
        email = f"mockstudent{i}@university.edu"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password="mockpassword", # dummy hash
                role=RoleEnum.student,
                name=f"Mock Student {i}",
                department=random.choice(departments)
            )
            db.add(user)
            mock_users.append(user)
        else:
            mock_users.append(user)
            
    db.commit()
    
    # Fetch all students to assign
    all_students = db.query(User).filter(User.email.like("mockstudent%")).all()
    
    # Assign members to clubs
    for club in clubs:
        # Check if club already has members
        existing = db.query(ClubMembership).filter(ClubMembership.club_id == club.id).first()
        if existing:
            continue
            
        # Randomly select 5-8 students for this club
        club_students = random.sample(all_students, random.randint(5, 8))
        
        # 1 President
        president = club_students[0]
        db.add(ClubMembership(
            user_id=president.id,
            club_id=club.id,
            role=ClubMemberRole.president,
            club_department="Management"
        ))
        
        # 2 Core members
        for core_user in club_students[1:3]:
            db.add(ClubMembership(
                user_id=core_user.id,
                club_id=club.id,
                role=ClubMemberRole.core,
                club_department=random.choice(["Events", "Technical", "PR", "Design"])
            ))
            
        # Rest are members
        for member_user in club_students[3:]:
            db.add(ClubMembership(
                user_id=member_user.id,
                club_id=club.id,
                role=ClubMemberRole.member,
                club_department="General"
            ))
            
    db.commit()
    print("Successfully seeded core committees and members for all clubs!")
    db.close()

if __name__ == "__main__":
    seed_members()
