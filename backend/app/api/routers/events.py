from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event, EventState, Registration, RegistrationStatus
from app.models.user import User, RoleEnum, Club
from app.schemas.events import EventCreate
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/events", tags=["events"])

@router.get("")
def list_events(db: Session = Depends(get_db)):
    # Return events that students should be able to see (published and finished events)
    events = db.query(Event).filter(Event.state.in_([
        EventState.published, 
        EventState.pending_completion, 
        EventState.completed
    ])).order_by(Event.title.asc()).all()
    
    # We serialize manually for now before adding Pydantic schemas
    return [{
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "date": e.date,
        "end_date": e.end_date,
        "location": e.location,
        "capacity": e.capacity,
        # Budget is explicitly hidden from the public/student event list
        "registered_count": db.query(Registration).filter(
            Registration.event_id == e.id,
            Registration.status != RegistrationStatus.cancelled
        ).count(),
        "state": e.state.value if hasattr(e.state, 'value') else str(e.state),
        "club_name": e.club.name if e.club else "University",
    } for e in events]

@router.post("")
def create_event(
    event: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.coordinator:
        raise HTTPException(status_code=403, detail="Only coordinators can schedule programs")
        
    from datetime import datetime
    # Removed past date restriction for easier testing
    # if event.date.replace(tzinfo=None) < datetime.utcnow():
    #     raise HTTPException(status_code=400, detail="Cannot schedule an event in the past")
        
    if event.end_date and event.end_date <= event.date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    try:
        new_event = Event(
            title=event.title,
            description=event.description,
            date=event.date,
            end_date=event.end_date,
            location=event.location,
            capacity=event.capacity,
            budget=event.budget,
            accessories_req=event.accessories_req,
            guests_req=event.guests_req,
            gifts_req=event.gifts_req,
            prizes_req=event.prizes_req,
            club_id=event.club_id,
            state=EventState.pending_admin_initial  # Send straight to admin
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        return {"message": "Event created successfully", "id": new_event.id}
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"DB Error: {error_msg}")

@router.put("/{event_id}")
def update_event(
    event_id: int,
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [RoleEnum.coordinator, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Only coordinators or admins can edit programs")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Optional: you could restrict editing to only certain states if desired
    # if event.state not in [EventState.pending_mentor_initial, EventState.pending_admin_initial]:
    #     raise HTTPException(status_code=400, detail="Event cannot be edited at this stage")

    try:
        event.title = event_data.title
        event.description = event_data.description
        event.date = event_data.date
        event.end_date = event_data.end_date
        event.location = event_data.location
        event.capacity = event_data.capacity
        event.budget = event_data.budget
        event.accessories_req = event_data.accessories_req
        event.guests_req = event_data.guests_req
        event.gifts_req = event_data.gifts_req
        event.prizes_req = event_data.prizes_req
        event.club_id = event_data.club_id
        
        db.commit()
        return {"message": "Event updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Not authorized to delete events")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    from app.models.finance import Budget, Expense, Feedback
    from app.models.engagement import Ticket, Attendance, Certificate, ParticipationLedger
    
    # 1. Delete certificates and ledger
    db.query(Certificate).filter(Certificate.event_id == event_id).delete(synchronize_session=False)
    db.query(ParticipationLedger).filter(ParticipationLedger.event_id == event_id).delete(synchronize_session=False)
    
    # 2. Delete feedback
    db.query(Feedback).filter(Feedback.event_id == event_id).delete(synchronize_session=False)
    
    # 3. Delete budgets and expenses
    budgets = db.query(Budget).filter(Budget.event_id == event_id).all()
    for b in budgets:
        db.query(Expense).filter(Expense.budget_id == b.id).delete(synchronize_session=False)
        db.delete(b)
        
    # 4. Delete registrations and related tickets/attendance
    registrations = db.query(Registration).filter(Registration.event_id == event_id).all()
    for reg in registrations:
        db.query(Attendance).filter(Attendance.registration_id == reg.id).delete(synchronize_session=False)
        db.query(Ticket).filter(Ticket.registration_id == reg.id).delete(synchronize_session=False)
        db.delete(reg)
        
    # 5. Finally, delete the event
    db.delete(event)
    db.commit()
    return {"message": "Event and all related data deleted successfully"}
