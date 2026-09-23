from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/coordinator", tags=["coordinator"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class CoordinatorStudentCreate(BaseModel):
    name: str
    email: str
    password: str

@router.post("/students")
def create_student(request: CoordinatorStudentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
    
    return {"message": f"Student created successfully in the {current_user.department} department"}

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
