import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.profile import ProfileUpdate
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

UPLOAD_DIR = "uploads/profiles"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.phone_number is not None:
        current_user.phone_number = profile_data.phone_number
    if profile_data.department is not None:
        current_user.department = profile_data.department
    if profile_data.gender is not None:
        current_user.gender = profile_data.gender
    if profile_data.name is not None:
        current_user.name = profile_data.name
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/upload-picture", response_model=UserResponse)
def upload_profile_picture(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image")
    
    file_extension = file.filename.split(".")[-1]
    file_name = f"{current_user.id}_{current_user.name.replace(' ', '_')}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.profile_picture = f"/static/profiles/{file_name}"
    db.commit()
    db.refresh(current_user)
    
    return current_user
