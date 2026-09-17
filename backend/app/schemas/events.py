from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.event import EventState

class EventCreate(BaseModel):
    title: str
    description: str
    date: datetime
    location: str
    capacity: int
    budget: int = 0
    club_id: Optional[int] = None
