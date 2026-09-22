from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User, Student, RoleEnum
from app.schemas.auth import LoginRequest, Token, UserResponse, RegisterRequest
from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=Token)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Check if student number exists
    if db.query(Student).filter(Student.student_number == request.student_number).first():
        raise HTTPException(status_code=400, detail="Student number already registered")

    # Create User
    new_user = User(
        email=request.email,
        hashed_password=pwd_context.hash(request.password),
        name=request.name,
        role=RoleEnum.student,
        department=request.department
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Student Profile
    student_profile = Student(
        user_id=new_user.id,
        student_number=request.student_number,
        department=request.department,
        semester=request.semester
    )
    db.add(student_profile)
    db.commit()

    # Automatically log them in
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value
    }
