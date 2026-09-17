from sqlalchemy.orm import Session
from typing import List
from app.models.event import Event, EventState
from app.models.user import Student
from app.models.engagement import Attendance

def get_recommended_events(db: Session, student: Student, limit: int = 5) -> List[dict]:
    """
    Scores and returns recommended upcoming events for a student based on:
    - Department match
    - Previous attendance categories
    """
    # 1. Get all published upcoming events
    available_events = db.query(Event).filter(Event.state == EventState.published).all()
    
    # 2. Get student's past attended events to find their interests
    past_attendances = db.query(Attendance).join(Attendance.registration).filter(
        Attendance.registration.has(student_id=student.id)
    ).all()
    
    past_clubs = {}
    for att in past_attendances:
        club_id = att.registration.event.club_id
        past_clubs[club_id] = past_clubs.get(club_id, 0) + 1

    # 3. Score events
    scored_events = []
    for event in available_events:
        score = 0
        
        # Scoring Logic
        # a) Hosted by a club the student frequently attends
        if event.club_id in past_clubs:
            score += 20 * past_clubs[event.club_id]
            
        # b) General Popularity (Capacity filled)
        registered_count = len(event.registrations)
        if event.capacity > 0:
            fill_ratio = registered_count / event.capacity
            score += (fill_ratio * 10)
            
        scored_events.append((score, event))
        
    # Sort by score descending
    scored_events.sort(key=lambda x: x[0], reverse=True)
    
    # Return top N
    return [{"event": e, "score": s} for s, e in scored_events[:limit]]
