from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BudgetProposal(BaseModel):
    event_id: int
    proposed_amount: float

class BudgetResponse(BaseModel):
    id: int
    event_id: int
    total_allocated: float
    proposed_amount: Optional[float] = None
    status: str
    proposed_by_id: Optional[int] = None
    approved_by_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BudgetStatusUpdate(BaseModel):
    status: str
    approved_amount: Optional[float] = None
