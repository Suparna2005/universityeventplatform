from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), unique=True, nullable=False)
    secure_token = Column(String, unique=True, index=True, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)

    registration = relationship("Registration")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), unique=True, nullable=False)
    check_in_time = Column(DateTime, default=datetime.utcnow)
    scanned_by_user_id = Column(Integer, ForeignKey("users.id"))

    registration = relationship("Registration")

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    certificate_number = Column(String, unique=True, index=True, nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)

class ParticipationLedger(Base):
    __tablename__ = "participation_ledger"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    hours_earned = Column(Float, nullable=False)
    reason = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
