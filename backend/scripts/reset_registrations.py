import os
import sys

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.event import Registration
from app.models.engagement import Ticket, Attendance, Certificate, ParticipationLedger

def reset_registrations():
    print("Connecting to database...")
    db = SessionLocal()
    
    try:
        # Delete in order of dependencies (child tables first)
        print("Deleting all Certificates...")
        db.query(Certificate).delete()
        
        print("Deleting all Participation Ledgers...")
        db.query(ParticipationLedger).delete()
        
        print("Deleting all Attendance check-ins...")
        db.query(Attendance).delete()
        
        print("Deleting all QR Tickets...")
        db.query(Ticket).delete()
        
        print("Deleting all Registrations...")
        db.query(Registration).delete()
        
        db.commit()
        print("✅ Successfully cleared all registrations and tokens! Your database is clean.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_registrations()
