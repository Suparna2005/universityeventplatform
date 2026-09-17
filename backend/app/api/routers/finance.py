from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.finance import Budget
from app.models.user import User, RoleEnum
from app.schemas.finance import BudgetProposal, BudgetResponse, BudgetStatusUpdate
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/finance", tags=["finance"])

@router.post("/budgets", response_model=BudgetResponse)
def propose_budget(proposal: BudgetProposal, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.coordinator, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Only coordinators can propose budgets")
    
    # Check if a budget already exists for this event
    existing_budget = db.query(Budget).filter(Budget.event_id == proposal.event_id).first()
    if existing_budget:
        existing_budget.proposed_amount = proposal.proposed_amount
        existing_budget.status = "pending"
        existing_budget.proposed_by_id = current_user.id
        db.commit()
        db.refresh(existing_budget)
        return existing_budget
    
    new_budget = Budget(
        event_id=proposal.event_id,
        total_allocated=0.0,
        proposed_amount=proposal.proposed_amount,
        status="pending",
        proposed_by_id=current_user.id
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return new_budget

@router.get("/budgets", response_model=List[BudgetResponse])
def get_budgets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == RoleEnum.finance or current_user.role == RoleEnum.admin:
        # Finance officers and admins see all budgets
        return db.query(Budget).all()
    elif current_user.role == RoleEnum.coordinator:
        # Coordinators see budgets they proposed
        return db.query(Budget).filter(Budget.proposed_by_id == current_user.id).all()
    else:
        raise HTTPException(status_code=403, detail="Not authorized to view budgets")

@router.put("/budgets/{budget_id}/status", response_model=BudgetResponse)
def update_budget_status(budget_id: int, status_update: BudgetStatusUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.finance, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Only finance officers can approve budgets")
    
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    if status_update.status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    budget.status = status_update.status
    if status_update.status == "approved":
        budget.approved_by_id = current_user.id
        budget.total_allocated = status_update.approved_amount if status_update.approved_amount is not None else budget.proposed_amount
        
    db.commit()
    db.refresh(budget)
    return budget
