from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.event import EventState

class EventCreate(BaseModel):
    title: str
    description: str
    date: datetime
    end_date: Optional[datetime] = None
    location: str
    capacity: int
    budget: int = 0
    accessories_req: Optional[str] = None
    guests_req: Optional[str] = None
    gifts_req: Optional[str] = None
    prizes_req: Optional[str] = None
    club_id: Optional[int] = None
