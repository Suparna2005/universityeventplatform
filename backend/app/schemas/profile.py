from pydantic import BaseModel
from typing import Optional

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    name: Optional[str] = None
