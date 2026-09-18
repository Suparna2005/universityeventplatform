from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.models.base import Base

class EventState(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    faculty_review = "faculty_review"
    finance_review = "finance_review"
    approved = "approved"
    published = "published"
    registration_closed = "registration_closed"
    in_progress = "in_progress"
    pending_completion = "pending_completion"
    completed = "completed"
    cancelled = "cancelled"

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    location = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)
    budget = Column(Integer, default=0, nullable=False)
    state = Column(Enum(EventState), default=EventState.draft, nullable=False)
    attendance_file_url = Column(String, nullable=True)
    
    club_id = Column(Integer, ForeignKey("clubs.id"))
    club = relationship("Club", back_populates="events")

    registrations = relationship("Registration", back_populates="event")

class RegistrationStatus(str, enum.Enum):
    registered = "registered"
    waitlisted = "waitlisted"
    cancelled = "cancelled"

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    status = Column(Enum(RegistrationStatus), default=RegistrationStatus.registered)
    rank = Column(String, nullable=True) # 1st, 2nd, 3rd, or Participation
    registered_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="registrations")
    event = relationship("Event", back_populates="registrations")
