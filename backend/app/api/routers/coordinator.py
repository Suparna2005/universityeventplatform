from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user
from app.core.email import send_student_credentials_email

router = APIRouter(prefix="/api/coordinator", tags=["coordinator"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class CoordinatorStudentCreate(BaseModel):
    name: str
    email: str
    password: str

@router.post("/students")
def create_student(request: CoordinatorStudentCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Only Coordinators can create students via this endpoint")
        
    if not current_user.department:
        raise HTTPException(status_code=400, detail="Coordinator does not have a department assigned")

    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
        
    # Create the student, forcing their department to match the coordinator's department
    new_student = User(
        email=request.email,
        hashed_password=pwd_context.hash(request.password),
        name=request.name,
        role=RoleEnum.student,
        department=current_user.department,
        created_by_role="coordinator"
    )
    db.add(new_student)
    db.commit()
    
    # Send email
    background_tasks.add_task(send_student_credentials_email, request.email, request.name, request.password)
    
    return {"message": f"Student created successfully in the {current_user.department} department and email queued"}

@router.get("/students")
def get_department_students(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    students = db.query(User).filter(
        User.role == RoleEnum.student,
        User.department == current_user.department
    ).order_by(User.id.desc()).all()
    
    return [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "department": u.department
    } for u in students]

class CoordinatorStudentUpdate(BaseModel):
    name: str
    email: str
    password: str = ""

@router.put("/students/{student_id}")
def update_student(student_id: int, request: CoordinatorStudentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    student = db.query(User).filter(User.id == student_id, User.role == RoleEnum.student, User.department == current_user.department).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in your department")
        
    student.name = request.name
    student.email = request.email
    if request.password:
        student.hashed_password = pwd_context.hash(request.password)
        
    db.commit()
    return {"message": "Student updated successfully"}

from app.models.user import ClubJoinRequest, JoinRequestStatus, ClubMembership, ClubMemberRole, Club

@router.get("/student-club-requests")
def list_student_club_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    reqs = db.query(ClubJoinRequest).join(User).filter(
        ClubJoinRequest.status == JoinRequestStatus.pending,
        User.role == RoleEnum.student,
        User.department == current_user.department
    ).all()
    
    result = []
    for r in reqs:
        club = db.query(Club).filter(Club.id == r.club_id).first()
        result.append({
            "id": r.id,
            "user_name": r.user.name if r.user else "Unknown",
            "club_name": club.name if club else "Unknown",
            "message": r.message
        })
    return result

@router.post("/student-club-requests/{req_id}/forward")
def forward_student_club_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    req.status = JoinRequestStatus.pending_admin
        
    db.commit()
    return {"message": "Request forwarded to Admin for final approval"}

@router.post("/student-club-requests/{req_id}/reject")
def reject_student_club_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = JoinRequestStatus.rejected
    db.commit()
    return {"message": "Request rejected"}

from app.models.user import ClubLeaveRequest

@router.get("/student-leave-requests")
def list_student_leave_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    reqs = db.query(ClubLeaveRequest).join(User).filter(
        ClubLeaveRequest.status == "pending",
        User.role == RoleEnum.student,
        User.department == current_user.department
    ).all()
    
    result = []
    for r in reqs:
        club = db.query(Club).filter(Club.id == r.club_id).first()
        result.append({
            "id": r.id,
            "user_name": r.user.name if r.user else "Unknown",
            "club_name": club.name if club else "Unknown",
            "message": r.reason
        })
    return result

@router.post("/student-leave-requests/{req_id}/forward")
def forward_student_leave_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    req = db.query(ClubLeaveRequest).filter(ClubLeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    req.status = "pending_admin"
        
    db.commit()
    return {"message": "Leave request forwarded to Admin for final approval"}

@router.post("/student-leave-requests/{req_id}/reject")
def reject_student_leave_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
    req = db.query(ClubLeaveRequest).filter(ClubLeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "rejected"
    db.commit()
    return {"message": "Leave request rejected"}


@router.delete("/students/{student_id}")
def delete_student(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    student = db.query(User).filter(User.id == student_id, User.role == RoleEnum.student, User.department == current_user.department).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in your department")
        
    from app.models.user import ClubMembership, ClubJoinRequest, Student
    
    db.query(ClubMembership).filter(ClubMembership.user_id == student_id).delete(synchronize_session=False)
    db.query(ClubJoinRequest).filter(ClubJoinRequest.user_id == student_id).delete(synchronize_session=False)
    db.query(Student).filter(Student.user_id == student_id).delete(synchronize_session=False)
    
    db.delete(student)
    db.commit()
    return {"message": "Student deleted successfully"}

import csv
import io
import secrets
from fastapi import File, UploadFile

from fastapi.responses import StreamingResponse

@router.get("/students/csv/template")
def get_students_csv_template():
    content = "name,email,password,year,section\nAlice Brown,alice@example.com,secret123,1,A\nBob Smith,bob@example.com,,2,B"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_template.csv"}
    )

@router.post("/students/csv")
async def upload_students_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    contents = await file.read()
    decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created_count = 0
    for row in reader:
        email = row.get('email', '').strip()
        name = row.get('name', '').strip()
        
        if not email or not name:
            continue
            
        # Generate an 8-character random password if not provided in the CSV
        plain_password = row.get('password', '').strip()
        if not plain_password:
            plain_password = secrets.token_urlsafe(6) # Generates ~8 chars
            
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            new_student = User(
                name=name,
                email=email,
                hashed_password=pwd_context.hash(plain_password),
                role=RoleEnum.student,
                department=current_user.department,
                created_by_role='coordinator'
            )
            db.add(new_student)
            created_count += 1
            
            # Queue the welcome email in the background so the API doesn't hang
            background_tasks.add_task(send_student_credentials_email, email, name, plain_password)
            
    db.commit()
    return {"message": f"Successfully imported {created_count} student(s) from CSV. An email has been queued for each containing their login credentials."}
