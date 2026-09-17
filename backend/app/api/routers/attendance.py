from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.engagement import Ticket, Attendance
from app.models.event import Registration, Event
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

class ScanRequest(BaseModel):
    secure_token: str

@router.post("/check-in")
def check_in(request: ScanRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only coordinators, mentors, or admins can scan tickets
    if current_user.role not in [RoleEnum.coordinator, RoleEnum.mentor, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Unauthorized to scan tickets")

    ticket = db.query(Ticket).filter(Ticket.secure_token == request.secure_token).first()
    if not ticket:
        raise HTTPException(status_code=400, detail="Invalid QR code token")

    registration = db.query(Registration).filter(Registration.id == ticket.registration_id).first()
    
    # Check duplicate attendance
    existing_attendance = db.query(Attendance).filter(Attendance.registration_id == registration.id).first()
    if existing_attendance:
        raise HTTPException(status_code=400, detail="Student has already checked in!")

    # Record attendance
    attendance = Attendance(
        registration_id=registration.id,
        scanned_by_user_id=current_user.id
    )
    db.add(attendance)
    db.commit()
    
    student = registration.student.user
    event = registration.event
    
    return {
        "message": "Check-in successful",
        "student_name": student.name,
        "event_title": event.title
    }
