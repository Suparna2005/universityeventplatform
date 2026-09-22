import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.event import Event
from app.models.finance import Feedback
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    events = db.query(Event).all()
    print(f"Loaded {len(events)} events.")
    
    result = []
    for e in events:
        feedbacks = db.query(Feedback).filter(Feedback.event_id == e.id).all()
        positive_count = sum(1 for f in feedbacks if f.sentiment_score == "Positive")
        
        result.append({
            "id": e.id,
            "title": e.title,
            "state": e.state.value if hasattr(e.state, 'value') else str(e.state),
            "date": e.date,
            "club_name": e.club.name if e.club else "University",
            "registered_count": len(e.registrations),
        })
    print("Success!")
    print(result)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
