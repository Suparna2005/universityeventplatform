from sqlalchemy import Column, Integer, String, ForeignKey, Table, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.models.base import Base

class RoleEnum(str, enum.Enum):
    student = "student"
    coordinator = "coordinator"
    mentor = "mentor"
    finance = "finance"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.student, nullable=False)
    name = Column(String, nullable=False)
    
    # Profile fields for all users
    profile_picture = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    gender = Column(String, nullable=True) # e.g. male, female, other

    # If the user is a student, link them to student details
    student_profile = relationship("Student", back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    student_number = Column(String, unique=True, index=True, nullable=False)
    department = Column(String)
    semester = Column(Integer)

    user = relationship("User", back_populates="student_profile")
    registrations = relationship("Registration", back_populates="student")


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)

    events = relationship("Event", back_populates="club")
