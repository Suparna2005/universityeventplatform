from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.finance import Feedback
from app.models.event import Event, EventState
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user
from app.services.sentiment_service import analyze_sentiment

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

class FeedbackSubmit(BaseModel):
    rating: int
    comment: str

@router.post("/events/{event_id}")
def submit_feedback(event_id: int, payload: FeedbackSubmit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.student or not current_user.student_profile:
        raise HTTPException(status_code=403, detail="Only students can submit feedback")

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or event.state != EventState.completed:
        raise HTTPException(status_code=400, detail="Can only review completed events")

    # Analyze sentiment
    sentiment = analyze_sentiment(payload.comment)

    feedback = Feedback(
        event_id=event_id,
        student_id=current_user.student_profile.id,
        rating=payload.rating,
        comment=payload.comment,
        sentiment_score=sentiment
    )
    
    db.add(feedback)
    db.commit()
    
    return {"message": "Feedback submitted successfully!", "sentiment": sentiment}
