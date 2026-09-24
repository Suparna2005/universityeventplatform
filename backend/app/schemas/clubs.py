from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.user import ClubMemberRole, JoinRequestStatus

class ClubBase(BaseModel):
    name: str
    description: Optional[str] = ""
    achievements: Optional[str] = None
    club_type: Optional[str] = "university"
    department: Optional[str] = None

class ClubCreate(ClubBase):
    pass

class ClubResponse(ClubBase):
    id: int
    created_at: datetime
    rating: float
    last_event_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClubMembershipBase(BaseModel):
    role: ClubMemberRole
    club_department: Optional[str] = None

class ClubMembershipCreate(ClubMembershipBase):
    user_id: int

class ClubMembershipResponse(ClubMembershipBase):
    id: int
    user_id: int
    club_id: int
    joined_at: datetime
    activity_points: int
    user_name: str
    user_email: str
    user_department: Optional[str] = None
    global_role: Optional[str] = None

    class Config:
        from_attributes = True

class ClubJoinRequestCreate(BaseModel):
    message: Optional[str] = None

class ClubJoinRequestResponse(BaseModel):
    id: int
    user_id: int
    club_id: int
    status: JoinRequestStatus
    message: Optional[str]
    created_at: datetime
    user_name: str
    user_email: str

    class Config:
        from_attributes = True

class RoleUpdate(BaseModel):
    role: ClubMemberRole
    club_department: Optional[str] = None

class ClubMemberAdd(BaseModel):
    email: str
    role: ClubMemberRole
    club_department: Optional[str] = None
