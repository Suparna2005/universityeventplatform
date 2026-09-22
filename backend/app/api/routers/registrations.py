from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.event import Event, Registration, RegistrationStatus, EventState
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/events", tags=["registrations"])

@router.post("/{event_id}/register")
def register_for_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Only students can register for events")
    
    if not current_user.student_profile:
        raise HTTPException(status_code=400, detail="Student profile not found")
        
    student_id = current_user.student_profile.id

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.state != EventState.published:
        raise HTTPException(status_code=400, detail="Event is not open for registration")

    # Check duplicate
    existing = db.query(Registration).filter(
        Registration.student_id == student_id,
        Registration.event_id == event_id,
        Registration.status != RegistrationStatus.cancelled
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this event")

    # Check capacity
    current_count = db.query(Registration).filter(
        Registration.event_id == event_id,
        Registration.status == RegistrationStatus.registered
    ).count()

    # Determine status based on capacity
    if current_count >= event.capacity:
        raise HTTPException(status_code=400, detail="Event is at maximum capacity")
        
    reg_status = RegistrationStatus.registered

    registration = Registration(
        student_id=student_id,
        event_id=event_id,
        status=reg_status
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    
    return {"message": "Registration successful", "status": reg_status.value}

@router.get("/me/registrations")
def get_my_registrations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.student or not current_user.student_profile:
        return []
    
    registrations = db.query(Registration).filter(
        Registration.student_id == current_user.student_profile.id
    ).all()
    
    return [
        {
            "id": r.id,
            "event_id": r.event_id,
            "status": r.status.value,
            "registered_at": r.registered_at
        } for r in registrations
    ]

@router.get("/me/recommendations")
def get_my_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.student or not current_user.student_profile:
        return []
        
    from app.services.recommendation_service import get_recommended_events
    recs = get_recommended_events(db, current_user.student_profile)
    
    return [
        {
            "id": r["event"].id,
            "title": r["event"].title,
            "description": r["event"].description,
            "date": r["event"].date,
            "location": r["event"].location,
            "club_name": r["event"].club.name if r["event"].club else "University",
            "score": r["score"]
        } for r in recs
    ]
