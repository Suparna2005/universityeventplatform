import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.database import SessionLocal
from app.models.user import User

def check_users():
    db = SessionLocal()
    
    defaults = [
        {'email': 'admin@example.com', 'role': 'admin', 'name': 'Admin'},
        {'email': 'coordinator@test.edu', 'role': 'coordinator', 'name': 'Coordinator'},
        {'email': 'finance@test.edu', 'role': 'finance', 'name': 'Finance Dept'},
        {'email': 'mentor@test.edu', 'role': 'mentor', 'name': 'Mentor'},
        {'email': 'student001@test.edu', 'role': 'student', 'name': 'Test Student'}
    ]
    
    for u_data in defaults:
        if not db.query(User).filter(User.email == u_data['email']).first():
            print(f"Adding missing user: {u_data['email']} ({u_data['role']})")
            u = User(
                email=u_data['email'], 
                hashed_password='$2b$12$nGX1fUTvC8WGi4HrnLwjKsE1o2Fj7OxISa3PvLiGHT8d9mEmHGbVQayzsFawRHn', # password
                role=u_data['role'],
                name=u_data['name']
            )
            db.add(u)
    
    db.commit()
    print("All default users have been checked and added if missing.")
    db.close()

if __name__ == "__main__":
    check_users()
