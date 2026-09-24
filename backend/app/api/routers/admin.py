from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event, EventState
from app.models.finance import Feedback, Budget, Expense
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user
from app.models.user import ClubMembership, ClubMemberRole
from app.models.event import Registration, RegistrationStatus
from app.models.engagement import Attendance

router = APIRouter(prefix="/api/admin", tags=["admin"])

from passlib.context import CryptContext
from pydantic import BaseModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AdminUserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    department: str = ""

from fastapi import BackgroundTasks
from app.core.email import send_student_credentials_email

@router.post("/users")
def create_user(request: AdminUserCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only Admins can create credentials")
    
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
        
    new_user = User(
        email=request.email,
        hashed_password=pwd_context.hash(request.password),
        name=request.name,
        role=request.role,
        department=request.department,
        created_by_role="admin"
    )
    db.add(new_user)
    db.commit()
    
    # Send credentials email
    background_tasks.add_task(send_student_credentials_email, request.email, request.name, request.password)
    
    return {"message": "User created successfully and email queued"}

class AdminUserUpdate(BaseModel):
    name: str
    email: str
    password: str = ""
    role: str
    department: str = ""

@router.put("/users/{user_id}")
def update_user(user_id: int, request: AdminUserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    target.name = request.name
    target.email = request.email
    target.role = request.role
    target.department = request.department
    
    if request.password:
        target.hashed_password = pwd_context.hash(request.password)
        
    db.commit()
    return {"message": "User updated successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    from app.models.user import ClubMembership, ClubJoinRequest, Student
    
    # Manually delete foreign key relations
    db.query(ClubMembership).filter(ClubMembership.user_id == user_id).delete(synchronize_session=False)
    db.query(ClubJoinRequest).filter(ClubJoinRequest.user_id == user_id).delete(synchronize_session=False)
    db.query(Student).filter(Student.user_id == user_id).delete(synchronize_session=False)
    
    db.delete(target)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/users")
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    from app.models.user import ClubMembership, Club
    users = db.query(User).order_by(User.id.desc()).all()
    
    result = []
    for u in users:
        memberships = db.query(ClubMembership).filter(ClubMembership.user_id == u.id).all()
        clubs_list = []
        for m in memberships:
            club = db.query(Club).filter(Club.id == m.club_id).first()
            if club:
                clubs_list.append({"club_id": club.id, "club_name": club.name, "role": m.role.value})
        
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "department": u.department,
            "created_by_role": u.created_by_role,
            "clubs": clubs_list
        })
        
    return result

from app.models.user import ClubJoinRequest, Club
@router.get("/club-requests")
def get_pending_club_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    requests = db.query(ClubJoinRequest).filter(ClubJoinRequest.status == "pending_admin").all()
    result = []
    for req in requests:
        user = db.query(User).filter(User.id == req.user_id).first()
        club = db.query(Club).filter(Club.id == req.club_id).first()
        result.append({
            "id": req.id,
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "club_name": club.name if club else "Unknown",
            "message": req.message,
            "created_at": req.created_at
        })
    return result

@router.get("/programs")
def get_admin_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator, RoleEnum.finance]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        events = db.query(Event).order_by(Event.title.asc()).all()
        
        result = []
        for e in events:
            event_state = e.state.value if hasattr(e.state, 'value') else str(e.state)
            # Route events created under the previous admin approval flow into the new workflow.
            if event_state == EventState.pending_admin_initial.value:
                event_state = EventState.pending_finance.value
            elif event_state == EventState.pending_admin_final.value:
                event_state = EventState.pending_coordinator_publish.value
            feedbacks = db.query(Feedback).filter(Feedback.event_id == e.id).all()
            positive_count = sum(1 for f in feedbacks if f.sentiment_score == "Positive")
            registrations = db.query(Registration).filter(
                Registration.event_id == e.id,
                Registration.status == RegistrationStatus.registered
            ).count()
            attended_count = db.query(Attendance).join(
                Registration, Attendance.registration_id == Registration.id
            ).filter(
                Registration.event_id == e.id,
                Registration.status == RegistrationStatus.registered
            ).count()
            organizers = []
            if e.club_id:
                memberships = db.query(ClubMembership).filter(
                    ClubMembership.club_id == e.club_id,
                    ClubMembership.role.in_([
                        ClubMemberRole.club_coordinator,
                        ClubMemberRole.president,
                        ClubMemberRole.head,
                        ClubMemberRole.core,
                    ])
                ).all()
                organizers = [
                    {
                        "name": membership.user.name,
                        "role": membership.role.value,
                    }
                    for membership in memberships
                    if membership.user
                ]
                club_events_completed = db.query(Event).filter(
                    Event.club_id == e.club_id,
                    Event.state == EventState.completed,
                ).count()
            else:
                club_events_completed = 0
            
            result.append({
                "id": e.id,
                "title": e.title,
                "description": e.description,
                "state": event_state,
                "date": e.date,
                "end_date": e.end_date,
                "location": e.location,
                "feedback_count": len(feedbacks),
                "positive_feedback_count": positive_count,
                "capacity": e.capacity,
                "budget": e.budget,
                "club_name": e.club.name if e.club else "University",
                "department": getattr(e, "department", None) or (e.club.department if (e.club and e.club.department) else "N/A"),
                "dept_coordinator_name": db.query(User.name).filter(User.id == getattr(e, "coordinator_id", 0)).scalar() or (db.query(User.name).filter(User.role == 'coordinator', User.department == e.club.department).scalar() if (e.club and e.club.department) else None),
                "club_completed_events_count": club_events_completed,
                "organizers": organizers,
                "accessories_req": e.accessories_req,
                "guests_req": e.guests_req,
                "gifts_req": e.gifts_req,
                "prizes_req": e.prizes_req,
                "registered_count": registrations,
                "attended_count": attended_count,
                "attendance_file_url": e.attendance_file_url,
                "expenses_file_url": getattr(e, "expenses_file_url", None),
                "certificate_template_url": e.certificate_template_url,
                "rejection_reason": getattr(e, "rejection_reason", None),
                "actual_expenses": getattr(e, "actual_expenses", None)
            })
            
        return result
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Error in get_admin_events: {str(e)}\n\nTraceback: {error_details}")

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
            content_str = content.decode('utf-8-sig')
            csv_reader = csv.DictReader(StringIO(content_str))
            
            from app.models.user import Student
            for row in csv_reader:
                # Handle possible whitespace in keys/values
                student_num = row.get("Student Number", "").strip()
                rank = row.get("Rank", "Participation").strip()
                
                if student_num:
                    student = db.query(Student).filter(Student.student_number == student_num).first()
                    if student:
                        reg = db.query(Registration).filter(
                            Registration.event_id == event_id,
                            Registration.student_id == student.id
                        ).first()
                        if reg:
                            reg.rank = rank if rank else "Participation"
                            
            db.commit() # Commit inside try block so errors roll back safely
                            
        except Exception as e:
            # We save the file regardless of parsing errors, but we can log it
            print(f"Error parsing CSV: {e}")
            
    db.commit()
    return {"message": "Attendance file uploaded successfully", "url": event.attendance_file_url}

@router.post("/events/{event_id}/upload-certificate-template")
def upload_certificate_template(event_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Only admins or coordinators can upload certificate templates")
        
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
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Only admins or coordinators can generate AI templates")
        
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



@router.put("/events/{event_id}/approve-budget")
def approve_event_budget(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.finance:
        raise HTTPException(status_code=403, detail="Only Finance can approve event budgets")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state not in [EventState.pending_finance, EventState.pending_admin_initial]:
        raise HTTPException(status_code=400, detail="Event is not pending budget review")
    event.state = EventState.pending_coordinator_publish
    db.commit()
    return {"message": "Budget approved and sent to Coordinator for publication"}

@router.put("/events/{event_id}/publish")
def approve_coordinator_publish(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Only Coordinator can publish")
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state not in [EventState.pending_coordinator_publish, EventState.pending_admin_final]:
        raise HTTPException(status_code=400, detail="Event is not pending coordinator publish")
    event.state = EventState.published
    db.commit()
    return {"message": "Event published to students!"}

from pydantic import BaseModel

from typing import Optional
class ExpenseReport(BaseModel):
    actual_expenses: Optional[int] = 0

@router.put("/events/{event_id}/close")
def close_event(event_id: int, report: ExpenseReport, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Only coordinators or admins can close events")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.state not in [EventState.published, EventState.pending_completion]:
        raise HTTPException(status_code=400, detail="Only published/running events can be closed")
        
    event.actual_expenses = report.actual_expenses or 0
    event.state = EventState.finance_review
    db.commit()
    return {"message": "Event closed and expense report submitted to Finance."}

@router.put("/events/{event_id}/verify-expenses")
def verify_expenses(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.finance:
        raise HTTPException(status_code=403, detail="Only Finance can verify expenses")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.finance_review:
        raise HTTPException(status_code=400, detail="Event is not pending finance expense review")
        
    event.state = EventState.completed
    db.commit()
    return {"message": "Expenses verified, event officially marked as completed!"}
@router.post("/events/{event_id}/upload-expenses")
async def upload_expenses_csv(event_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.coordinator, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Not authorized")
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    import os
    import shutil
    import uuid
    os.makedirs("uploads/expenses", exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"uploads/expenses/{filename}"
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    event.expenses_file_url = f"/api/uploads/expenses/{filename}"
    db.commit()
    
    return {"message": "Expense CSV uploaded successfully!", "url": event.expenses_file_url}

@router.put("/events/{event_id}/approve-completion")
def approve_completion(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only admins can approve event completion")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.state != EventState.pending_completion:
        raise HTTPException(status_code=400, detail="Event is not pending completion approval")
        
    event.state = EventState.completed
    
    if event.club_id:
        from app.models.user import Club
        club = db.query(Club).filter(Club.id == event.club_id).first()
        if club:
            club.last_event_date = event.end_date or event.date
            
    db.commit()
    return {"message": "Event completion approved!"}

class RejectionReason(BaseModel):
    reason: str

@router.put("/events/{event_id}/request-changes")
def request_changes(event_id: int, payload: RejectionReason, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.finance:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event.rejection_reason = payload.reason
    event.state = EventState.draft  # Return to coordinator for changes and resubmission
    db.commit()
    return {"message": "Changes requested. Event sent back to Coordinator."}

@router.put("/events/{event_id}/reject")
def reject_event(event_id: int, payload: RejectionReason, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.finance:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event.rejection_reason = payload.reason
    event.state = EventState.rejected
    db.commit()
    return {"message": "Event permanently rejected."}

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

@router.get("/ai-recommend-requirements")
def recommend_requirements(title: str = "", description: str = "", req_type: str = ""):
    text = (title + " " + description).lower()
    recommendations = []
    
    # Heuristic AI matching algorithm based on keywords
    if req_type == "accessories":
        if any(word in text for word in ["code", "hackathon", "software", "tech", "robot", "computer"]):
            recommendations.extend(["Extension cords", "Multi-plugs", "High-speed WiFi routers", "Whiteboards & Markers"])
        if any(word in text for word in ["dance", "music", "cultural", "singing", "band"]):
            recommendations.extend(["High-bass Speakers", "Microphones", "Stage Lighting", "Smoke Machine"])
        if any(word in text for word in ["sports", "cricket", "football", "athlete"]):
            recommendations.extend(["First-aid kits", "Water dispensers", "Scoreboards", "Whistles"])
        if not recommendations:
            recommendations.extend(["Chairs & Tables", "Projector", "Sound System", "Microphone"])
            
    elif req_type == "guests":
        if any(word in text for word in ["code", "hackathon", "software", "tech"]):
            recommendations.extend(["Senior Software Engineer", "Tech Startup Founder", "Computer Science Professor"])
        if any(word in text for word in ["business", "startup", "entrepreneur", "finance"]):
            recommendations.extend(["Venture Capitalist", "CEO of local startup", "Economics Professor"])
        if not recommendations:
            recommendations.extend(["University Dean", "Local Industry Expert", "Alumni Speaker"])
            
    elif req_type == "gifts":
        if any(word in text for word in ["code", "hackathon", "software", "tech"]):
            recommendations.extend(["Mechanical Keyboards", "Tech Company Swag (T-shirts)", "1-Year Cloud Subscriptions"])
        if not recommendations:
            recommendations.extend(["University Branded Mugs", "Custom Pens", "Notebooks", "Bouquet of Flowers"])
            
    elif req_type == "prizes":
        if any(word in text for word in ["competition", "hackathon", "tournament", "contest"]):
            recommendations.extend(["1st Place: ₹5000 Cash", "2nd Place: Smartwatch", "3rd Place: Bluetooth Earbuds"])
        if not recommendations:
            recommendations.extend(["Certificates of Excellence", "Medals", "Trophies"])

    # Format output
    return {"recommendation": ", ".join(recommendations)}
