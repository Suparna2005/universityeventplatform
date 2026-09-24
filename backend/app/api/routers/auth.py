from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User, Student, RoleEnum
from app.schemas.auth import LoginRequest, Token, UserResponse, RegisterRequest, ChangePasswordRequest
from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/change-password")
def change_password(request: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not pwd_context.verify(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = pwd_context.hash(request.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

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

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    res = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "department": current_user.department,
        "is_club_admin": False
    }
    
    from app.models.user import ClubMembership
    club_admin = db.query(ClubMembership).filter(
        ClubMembership.user_id == current_user.id,
        ClubMembership.role.in_(['club_coordinator', 'president', 'core', 'head'])
    ).first()
    if club_admin:
        res["is_club_admin"] = True
    
    if current_user.role == 'student':
        from app.models.user import Student
        stu = db.query(Student).filter(Student.user_id == current_user.id).first()
        if stu:
            res["year"] = getattr(stu, "year", None)
            res["section"] = getattr(stu, "section", None)
            
    return res

from app.models.user import AccountRequest
from app.schemas.auth import AccountRequestCreate, ForgotPasswordRequest
from fastapi import BackgroundTasks
import secrets

@router.post("/request-account")
def request_account(req: AccountRequestCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Check if request already pending
    existing_req = db.query(AccountRequest).filter(AccountRequest.email == req.email, AccountRequest.status == 'pending').first()
    if existing_req:
        raise HTTPException(status_code=400, detail="Account request already pending for this email")

    new_req = AccountRequest(
        name=req.name,
        email=req.email,
        requested_role=req.requested_role,
        department=req.department,
        year=req.year,
        section=req.section
    )
    db.add(new_req)
    db.commit()
    return {"message": "Account request submitted successfully"}

from app.api.routers.coordinator import send_student_credentials_email

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    temp_password = secrets.token_urlsafe(6)
    user.hashed_password = pwd_context.hash(temp_password)
    db.commit()
    
    background_tasks.add_task(send_student_credentials_email, user.email, user.name, temp_password)
    return {"message": "A new temporary password has been sent to your email"}
