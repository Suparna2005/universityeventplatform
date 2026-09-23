from sqlalchemy import Column, Integer, String, ForeignKey, Table, Enum, DateTime, Float
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.models.base import Base

class RoleEnum(str, enum.Enum):
    admin = "admin"
    coordinator = "coordinator"
    club_coordinator = "club_coordinator"
    student = "student"
    finance = "finance"
    mentor = "mentor"
    faculty = "faculty"

class ClubMemberRole(str, enum.Enum):
    member = "member"
    core = "core"
    head = "head"
    president = "president"
    club_coordinator = "club_coordinator"

class JoinRequestStatus(str, enum.Enum):
    pending = "pending" # pending coordinator
    pending_admin = "pending_admin" # forwarded to admin
    approved = "approved"
    rejected = "rejected"

class LeaveRequestStatus(str, enum.Enum):
    pending = "pending" # pending coordinator
    pending_admin = "pending_admin" # forwarded to admin
    approved = "approved"
    rejected = "rejected"

class ClubType(str, enum.Enum):
    departmental = "departmental"
    university = "university"

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
    created_by_role = Column(String, nullable=True) # e.g. 'admin' or 'coordinator'

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
    club_type = Column(String, default="university")
    department = Column(String, nullable=True) # Only if club_type == departmental
    created_at = Column(DateTime, default=datetime.utcnow)
    rating = Column(Float, default=0.0)
    achievements = Column(String, nullable=True)
    last_event_date = Column(DateTime, nullable=True)

    events = relationship("Event", back_populates="club")
    memberships = relationship("ClubMembership", back_populates="club")
    join_requests = relationship("ClubJoinRequest", back_populates="club")


class ClubMembership(Base):
    __tablename__ = "club_memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    role = Column(Enum(ClubMemberRole), default=ClubMemberRole.member, nullable=False)
    club_department = Column(String, nullable=True) # e.g. Design, Technical
    joined_at = Column(DateTime, default=datetime.utcnow)
    activity_points = Column(Integer, default=0)

    user = relationship("User")
    club = relationship("Club", back_populates="memberships")


class ClubGallery(Base):
    __tablename__ = "club_gallery"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    image_url = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    club = relationship("Club")


class ClubJoinRequest(Base):
    __tablename__ = "club_join_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    status = Column(Enum(JoinRequestStatus), default=JoinRequestStatus.pending, nullable=False)
    message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    club = relationship("Club", back_populates="join_requests")

class ClubLeaveRequest(Base):
    __tablename__ = "club_leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    status = Column(String, default="pending", nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    club = relationship("Club")
