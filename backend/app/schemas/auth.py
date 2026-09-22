from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    student_number: str
    department: str
    semester: int

class Token(BaseModel):
    access_token: str
    token_type: str

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
