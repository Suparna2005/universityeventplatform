from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), unique=True, nullable=False)
    total_allocated = Column(Float, nullable=False, default=0.0)
    proposed_amount = Column(Float, nullable=True)
    status = Column(String, default="pending", nullable=False) # pending, approved, rejected
    proposed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event")
    expenses = relationship("Expense", back_populates="budget")
    proposed_by = relationship("User", foreign_keys=[proposed_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey("budgets.id"), nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    budget = relationship("Budget", back_populates="expenses")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True) # Legacy
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(String, nullable=True)
    sentiment_score = Column(String, nullable=True) # positive, negative, neutral
    created_at = Column(DateTime, default=datetime.utcnow)
