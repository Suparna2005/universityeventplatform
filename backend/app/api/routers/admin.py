from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event, EventState
from app.models.finance import Feedback, Budget, Expense
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/events")
def get_admin_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator, RoleEnum.finance, RoleEnum.mentor]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    events = db.query(Event).all()
    
    result = []
    for e in events:
        feedbacks = db.query(Feedback).filter(Feedback.event_id == e.id).all()
        positive_count = sum(1 for f in feedbacks if f.sentiment_score == "Positive")
        
        result.append({
            "id": e.id,
            "title": e.title,
            "state": e.state.value,
            "date": e.date,
            "end_date": e.end_date,
            "feedback_count": len(feedbacks),
            "positive_feedback_count": positive_count,
            "capacity": e.capacity,
            "budget": e.budget,
            "registered_count": len(e.registrations),
            "attendance_file_url": e.attendance_file_url
        })
        
    return result

import csv
import os
import shutil
import uuid
from io import StringIO
from fastapi.responses import StreamingResponse
from app.models.event import Registration

@router.post("/events/{event_id}/upload-attendance")
def upload_attendance_file(event_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    ext = file.filename.split('.')[-1]
    filename = f"attendance_{event_id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join("uploads", "attendance", filename)
    
    # Read the file content first
    content = file.file.read()
    
    # Save the file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    event.attendance_file_url = f"/static/attendance/{filename}"
    
    # Parse CSV for Student Number and Rank
    if ext.lower() == 'csv':
        try:
            content_str = content.decode('utf-8')
            csv_reader = csv.DictReader(StringIO(content_str))
            
            from app.models.user import Student
            for row in csv_reader:
                student_num = row.get("Student Number", "").strip()
                rank = row.get("Rank", "Participation").strip()
                
                if student_num:
                    # Find student
                    student = db.query(Student).filter(Student.student_number == student_num).first()
                    if student:
                        # Find their registration
                        reg = db.query(Registration).filter(
                            Registration.event_id == event_id,
                            Registration.student_id == student.id
                        ).first()
                        if reg:
                            reg.rank = rank if rank else "Participation"
                            
        except Exception as e:
            # We save the file regardless of parsing errors, but we can log it
            print(f"Error parsing CSV: {e}")
            
    db.commit()
    return {"message": "Attendance file uploaded successfully", "url": event.attendance_file_url}

@router.put("/events/{event_id}/approve")
def approve_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.mentor]:
        raise HTTPException(status_code=403, detail="Only mentors and admins can approve events")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.state != EventState.faculty_review and event.state != EventState.submitted:
        raise HTTPException(status_code=400, detail="Event is not pending mentor approval")
        
    event.state = EventState.published
    db.commit()
    return {"message": "Event approved and published successfully"}

@router.put("/events/{event_id}/approve-budget")
def approve_event_budget(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.finance]:
        raise HTTPException(status_code=403, detail="Only finance officers can approve budgets")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.state != EventState.finance_review:
        raise HTTPException(status_code=400, detail="Event is not pending budget review")
        
    event.state = EventState.faculty_review
    db.commit()
    return {"message": "Budget approved successfully! Event sent to Mentor."}

@router.put("/events/{event_id}/close")
def close_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Only coordinators can close events")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.state != EventState.published:
        raise HTTPException(status_code=400, detail="Only published/running events can be closed")
        
    event.state = EventState.pending_completion
    db.commit()
    return {"message": "Event closed successfully. Sent to Mentor for final approval."}

@router.put("/events/{event_id}/approve-completion")
def approve_completion(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.mentor]:
        raise HTTPException(status_code=403, detail="Only mentors can approve event completion")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.state != EventState.pending_completion:
        raise HTTPException(status_code=400, detail="Event is not pending completion approval")
        
    event.state = EventState.completed
    db.commit()
    return {"message": "Event completion approved!"}

@router.get("/events/{event_id}/export")
def export_registrations(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    registrations = db.query(Registration).filter(Registration.event_id == event_id).all()
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Email", "Student Number", "Department", "Gender", "Status"])
    
    for reg in registrations:
        student = reg.student
        user = student.user
        writer.writerow([
            user.name,
            user.email,
            student.student_number,
            user.department or "Unknown",
            user.gender or "Unknown",
            reg.status.value
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=registrations_{event_id}.csv"}
    )
