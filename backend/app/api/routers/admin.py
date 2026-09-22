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
            "state": e.state.value if hasattr(e.state, 'value') else str(e.state),
            "date": e.date,
            "end_date": e.end_date,
            "feedback_count": len(feedbacks),
            "positive_feedback_count": positive_count,
            "capacity": e.capacity,
            "budget": e.budget,
            "accessories_req": e.accessories_req,
            "guests_req": e.guests_req,
            "gifts_req": e.gifts_req,
            "prizes_req": e.prizes_req,
            "registered_count": len(e.registrations),
            "attendance_file_url": e.attendance_file_url,
            "certificate_template_url": e.certificate_template_url
        })
        
    return result

@router.get("/events/{event_id}/feedback")
def get_event_feedback(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator, RoleEnum.mentor]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    feedbacks = db.query(Feedback).filter(Feedback.event_id == event_id).order_by(Feedback.created_at.desc()).all()
    
    return [
        {
            "id": f.id,
            "rating": f.rating,
            "comment": f.comment,
            "sentiment": f.sentiment_score,
            "created_at": f.created_at
        } for f in feedbacks
    ]

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
    upload_dir = os.path.join("uploads", "attendance")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    
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

@router.post("/events/{event_id}/upload-certificate-template")
def upload_certificate_template(event_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only admins can upload certificate templates")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    ext = file.filename.split('.')[-1]
    filename = f"template_{event_id}_{uuid.uuid4().hex[:8]}.{ext}"
    
    # Ensure directory exists
    upload_dir = os.path.join("uploads", "certificates")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)
        
    event.certificate_template_url = f"/static/certificates/{filename}"
    db.commit()
    
    return {"message": "Certificate template uploaded successfully", "url": event.certificate_template_url}

import requests
import urllib.parse
from pydantic import BaseModel

class AIPromptRequest(BaseModel):
    prompt: str

@router.post("/events/{event_id}/generate-ai-template")
def generate_ai_template(event_id: int, request: AIPromptRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only admins can generate AI templates")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # We explicitly force the AI to leave it completely blank in the middle
    full_prompt = f"A completely blank modern university certificate template background, landscape orientation. Elegant {request.prompt} borders around the edges. The entire center of the image MUST be completely empty, blank white paper with absolutely NO text, NO words, and NO lines. Highly detailed, professional, official award certificate layout, clean design."
    encoded_prompt = urllib.parse.quote(full_prompt)
    
    # Using Pollinations AI (100% Free, No API Key Required)
    API_URL = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1920&height=1080&nologo=true"
    
    try:
        response = requests.get(API_URL)
        if response.status_code != 200:
            raise Exception(f"Pollinations AI returned {response.status_code}")
            
        image_bytes = response.content
        
        filename = f"template_ai_{event_id}_{uuid.uuid4().hex[:8]}.jpg"
        upload_dir = os.path.join("uploads", "certificates")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(image_bytes)
            
        event.certificate_template_url = f"/static/certificates/{filename}"
        db.commit()
        
        return {"message": "AI template generated successfully using Pollinations", "url": event.certificate_template_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Pollinations AI: {str(e)}")

@router.put("/events/{event_id}/approve-mentor-initial")
def approve_mentor_initial(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.mentor]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.pending_mentor_initial:
        raise HTTPException(status_code=400, detail="Event is not pending initial mentor approval")
    event.state = EventState.pending_admin_initial
    db.commit()
    return {"message": "Sent to Admin Panel"}

@router.put("/events/{event_id}/approve-admin-initial")
def approve_admin_initial(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.pending_admin_initial:
        raise HTTPException(status_code=400, detail="Event is not pending initial admin approval")
    event.state = EventState.pending_finance
    db.commit()
    return {"message": "Sent to Finance"}

@router.put("/events/{event_id}/approve-budget")
def approve_event_budget(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.finance]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.pending_finance:
        raise HTTPException(status_code=400, detail="Event is not pending budget review")
    event.state = EventState.pending_admin_final
    db.commit()
    return {"message": "Budget approved, sent back to Admin"}

@router.put("/events/{event_id}/approve-admin-final")
def approve_admin_final(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.pending_admin_final:
        raise HTTPException(status_code=400, detail="Event is not pending final admin approval")
    event.state = EventState.pending_mentor_final
    db.commit()
    return {"message": "Final admin approval given, sent to Mentor"}

@router.put("/events/{event_id}/approve-mentor-final")
def approve_mentor_final(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.mentor]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.pending_mentor_final:
        raise HTTPException(status_code=400, detail="Event is not pending final mentor approval")
    event.state = EventState.pending_coordinator_publish
    db.commit()
    return {"message": "Approval sent to Coordinator"}

@router.put("/events/{event_id}/publish")
def approve_coordinator_publish(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Only Coordinator can publish")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.pending_coordinator_publish:
        raise HTTPException(status_code=400, detail="Event is not pending coordinator publish")
    event.state = EventState.published
    db.commit()
    return {"message": "Event published to students!"}

@router.put("/events/{event_id}/close")
def close_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Only coordinators or admins can close events")
        
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
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Only Coordinator can download attendance")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    registrations = db.query(Registration).filter(Registration.event_id == event_id).all()
    from app.models.engagement import Attendance
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Email", "Student Number", "Department", "Gender", "Registration Status", "Check-in Status", "Check-in Time", "Rank"])
    
    for reg in registrations:
        student = reg.student
        user = student.user
        attendance = db.query(Attendance).filter(Attendance.registration_id == reg.id).first()
        
        check_in_status = "Present" if attendance else "Absent"
        check_in_time = attendance.check_in_time.strftime("%Y-%m-%d %H:%M:%S") if attendance else "N/A"
        
        writer.writerow([
            user.name,
            user.email,
            student.student_number,
            user.department or "Unknown",
            user.gender or "Unknown",
            reg.status.value,
            check_in_status,
            check_in_time,
            reg.rank or "Participation"
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=attendance_report_{event_id}.csv"}
    )
