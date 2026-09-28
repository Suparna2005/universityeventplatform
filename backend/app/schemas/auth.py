from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    is_club_admin: Optional[bool] = False

class ForgotPasswordRequest(BaseModel):
    email: str
