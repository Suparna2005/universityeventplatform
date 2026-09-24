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
    # Any user (student, coordinator, faculty) can submit feedback
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or event.state != EventState.completed:
        raise HTTPException(status_code=400, detail="Can only review completed events")

    # Analyze sentiment
    sentiment = analyze_sentiment(payload.comment)

    feedback = Feedback(
        event_id=event_id,
        user_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
        sentiment_score=sentiment
    )
    
    db.add(feedback)
    
    # Update average rating for the club
    if event.club_id:
        from app.models.user import Club
        club = db.query(Club).filter(Club.id == event.club_id).first()
        if club:
            # We flush so the new feedback is queryable
            db.flush()
            all_club_events = db.query(Event.id).filter(Event.club_id == club.id).all()
            event_ids = [e[0] for e in all_club_events]
            feedbacks = db.query(Feedback).filter(Feedback.event_id.in_(event_ids)).all()
            
            if feedbacks:
                total_ratings = sum([f.rating for f in feedbacks])
                club.rating = round(total_ratings / len(feedbacks), 1)

    db.commit()
    
    return {"message": "Feedback submitted successfully!", "sentiment": sentiment}
