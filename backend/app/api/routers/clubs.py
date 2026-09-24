from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum, Club, ClubMembership, ClubJoinRequest, ClubMemberRole, JoinRequestStatus, ClubGallery
from app.schemas.clubs import (
    ClubCreate, ClubResponse, ClubMembershipResponse, 
    ClubJoinRequestCreate, ClubJoinRequestResponse, RoleUpdate, ClubMemberAdd
)
from app.api.dependencies import get_current_user
from typing import List
import os
import shutil
import uuid
import csv
import io

router = APIRouter(prefix="/api/clubs", tags=["clubs"])

@router.get("/list", response_model=List[ClubResponse])
def list_clubs(db: Session = Depends(get_db)):
    clubs = db.query(Club).order_by(Club.name.asc()).all()
    return clubs

from fastapi import BackgroundTasks
from app.api.routers.coordinator import send_student_credentials_email
import secrets
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/", response_model=ClubResponse)
def create_club(club: ClubCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only Admins can create new clubs")
        
    existing = db.query(Club).filter(Club.name == club.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Club already exists")
        
    new_club = Club(name=club.name, description=club.description, achievements=club.achievements, club_type=club.club_type, department=club.department)
    db.add(new_club)
    db.flush() # get id
    
    if club.coordinator_email:
        email = club.coordinator_email.strip().lower()
        target_user = db.query(User).filter(User.email == email).first()
        
        if not target_user:
            plain_password = secrets.token_urlsafe(6)
            target_user = User(
                name="Club Coordinator",
                email=email,
                hashed_password=pwd_context.hash(plain_password),
                role=RoleEnum.club_coordinator,
                department=club.department or "",
                created_by_role='admin'
            )
            db.add(target_user)
            db.flush()
            background_tasks.add_task(send_student_credentials_email, email, "Club Coordinator", plain_password)
        else:
            # Upgrade their global role to club_coordinator if they are just a student or faculty
            if target_user.role in [RoleEnum.student, RoleEnum.faculty]:
                target_user.role = RoleEnum.club_coordinator
                
        # Add them to the club
        membership = ClubMembership(
            user_id=target_user.id,
            club_id=new_club.id,
            role=ClubMemberRole.club_coordinator,
            club_department=club.department or ""
        )
        db.add(membership)

    db.commit()
    db.refresh(new_club)
    return new_club

@router.put("/{club_id}", response_model=ClubResponse)
def update_club(club_id: int, club: ClubCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    existing_club = db.query(Club).filter(Club.id == club_id).first()
    if not existing_club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    existing_club.name = club.name
    existing_club.description = club.description
    existing_club.achievements = club.achievements
    db.commit()
    db.refresh(existing_club)
    return existing_club

@router.delete("/{club_id}")
def delete_club(club_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    existing_club = db.query(Club).filter(Club.id == club_id).first()
    if not existing_club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    from app.models.event import Event
    if db.query(Event).filter(Event.club_id == club_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete club that has associated events.")
        
    # Also delete memberships and join requests
    db.query(ClubMembership).filter(ClubMembership.club_id == club_id).delete(synchronize_session=False)
    db.query(ClubJoinRequest).filter(ClubJoinRequest.club_id == club_id).delete(synchronize_session=False)

    db.delete(existing_club)
    db.commit()
    return {"message": "Club deleted successfully"}

# Membership routes
@router.post("/{club_id}/join")
def join_club(club_id: int, req: ClubJoinRequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    existing_membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
    if existing_membership:
        raise HTTPException(status_code=400, detail="Already a member")

    existing_req = db.query(ClubJoinRequest).filter(ClubJoinRequest.club_id == club_id, ClubJoinRequest.user_id == current_user.id, ClubJoinRequest.status == JoinRequestStatus.pending).first()
    if existing_req:
        raise HTTPException(status_code=400, detail="Join request already pending")

    new_req = ClubJoinRequest(
        user_id=current_user.id,
        club_id=club_id,
        message=req.message,
        status=JoinRequestStatus.pending
    )
    db.add(new_req)
    db.commit()
    return {"message": "Join request submitted"}

@router.put("/join-requests/{req_id}")
def update_join_request(req_id: int, message: str = Body(..., embed=True), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == req_id, ClubJoinRequest.user_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != JoinRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Cannot edit a request that is already processed")
        
    req.message = message
    db.commit()
    return {"message": "Request updated"}

@router.delete("/join-requests/{req_id}")
def delete_join_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == req_id, ClubJoinRequest.user_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status not in [JoinRequestStatus.pending, JoinRequestStatus.pending_admin]:
        raise HTTPException(status_code=400, detail="Cannot delete a request that is already processed")
        
    db.delete(req)
    db.commit()
    return {"message": "Request withdrawn"}

@router.put("/leave-requests/{req_id}")
def update_leave_request(req_id: int, reason: str = Body(..., embed=True), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(ClubLeaveRequest).filter(ClubLeaveRequest.id == req_id, ClubLeaveRequest.user_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status not in ["pending", "pending_admin"]:
        raise HTTPException(status_code=400, detail="Cannot edit a request that is already processed")
        
    req.reason = reason
    db.commit()
    return {"message": "Leave request updated"}

@router.delete("/leave-requests/{req_id}")
def delete_leave_request(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(ClubLeaveRequest).filter(ClubLeaveRequest.id == req_id, ClubLeaveRequest.user_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status not in ["pending", "pending_admin"]:
        raise HTTPException(status_code=400, detail="Cannot delete a request that is already processed")
        
    db.delete(req)
    db.commit()
    return {"message": "Leave request withdrawn"}


@router.get("/{club_id}/requests", response_model=List[ClubJoinRequestResponse])
def list_join_requests(club_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check permissions (admin/coordinator or club head/president)
    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if not is_authorized:
        membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
        if membership and membership.role in [ClubMemberRole.head, ClubMemberRole.president]:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to view requests for this club")

    requests = db.query(ClubJoinRequest).filter(ClubJoinRequest.club_id == club_id, ClubJoinRequest.status == JoinRequestStatus.pending).all()
    # Populate user data
    result = []
    for req in requests:
        user = db.query(User).filter(User.id == req.user_id).first()
        result.append(ClubJoinRequestResponse(
            id=req.id,
            user_id=req.user_id,
            club_id=req.club_id,
            status=req.status,
            message=req.message,
            created_at=req.created_at,
            user_name=user.name if user else "Unknown",
            user_email=user.email if user else "Unknown"
        ))
    return result

@router.put("/requests/{request_id}/forward")
def forward_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if not is_authorized:
        membership = db.query(ClubMembership).filter(ClubMembership.club_id == req.club_id, ClubMembership.user_id == current_user.id).first()
        if membership and membership.role in [ClubMemberRole.head, ClubMemberRole.president]:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized")

    req.status = JoinRequestStatus.pending_admin
    db.commit()
    return {"message": "Request forwarded to Admin for final approval"}

@router.post("/requests/{request_id}/approve")
def approve_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only Admin can give final approval for club memberships")

    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != JoinRequestStatus.pending_admin:
        raise HTTPException(status_code=400, detail="Request has not been forwarded to admin yet")

    req.status = JoinRequestStatus.approved
    
    # Check if already a member
    existing = db.query(ClubMembership).filter(ClubMembership.club_id == req.club_id, ClubMembership.user_id == req.user_id).first()
    if not existing:
        new_member = ClubMembership(
            club_id=req.club_id,
            user_id=req.user_id,
            role=ClubMemberRole.member
        )
        db.add(new_member)
    
    db.commit()
    return {"message": "Request approved"}

@router.post("/requests/{request_id}/reject")
def reject_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if not is_authorized:
        membership = db.query(ClubMembership).filter(ClubMembership.club_id == req.club_id, ClubMembership.user_id == current_user.id).first()
        if membership and membership.role in [ClubMemberRole.head, ClubMemberRole.president]:
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to reject requests")

    req.status = JoinRequestStatus.rejected
    db.commit()
    return {"message": "Request rejected"}

@router.get("/my-memberships")
def get_my_memberships(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(ClubMembership).filter(ClubMembership.user_id == current_user.id).all()
    return [{"club_id": m.club_id, "role": m.role} for m in memberships]

@router.get("/my-requests")
def get_my_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    join_reqs = db.query(ClubJoinRequest).filter(ClubJoinRequest.user_id == current_user.id).all()
    leave_reqs = db.query(ClubLeaveRequest).filter(ClubLeaveRequest.user_id == current_user.id).all()
    
    return {
        "join_requests": [
            {
                "id": r.id, "club_id": r.club_id, "status": r.status, "message": r.message, 
                "club_name": db.query(Club).filter(Club.id == r.club_id).first().name if db.query(Club).filter(Club.id == r.club_id).first() else "Unknown"
            } for r in join_reqs
        ],
        "leave_requests": [
            {
                "id": r.id, "club_id": r.club_id, "status": r.status, "reason": r.reason,
                "club_name": db.query(Club).filter(Club.id == r.club_id).first().name if db.query(Club).filter(Club.id == r.club_id).first() else "Unknown"
            } for r in leave_reqs
        ]
    }

@router.get("/{club_id}/members", response_model=List[ClubMembershipResponse])
def list_members(club_id: int, db: Session = Depends(get_db)):
    memberships = db.query(ClubMembership).filter(ClubMembership.club_id == club_id).order_by(ClubMembership.joined_at.asc()).all()
    result = []
    for mem in memberships:
        user = db.query(User).filter(User.id == mem.user_id).first()
        result.append(ClubMembershipResponse(
            id=mem.id,
            user_id=mem.user_id,
            club_id=mem.club_id,
            role=mem.role,
            club_department=mem.club_department,
            joined_at=mem.joined_at,
            activity_points=mem.activity_points,
            user_name=user.name if user else "Unknown",
            user_email=user.email if user else "Unknown",
            user_department=user.department if user else None,
            global_role=user.role if user else None
        ))
    return result

@router.put("/{club_id}/members/{user_id}/role")
def update_member_role(club_id: int, user_id: int, role_update: RoleUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if not is_authorized:
        my_membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
        if my_membership and my_membership.role == ClubMemberRole.president:
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Only admins or club president can update roles")

    target_membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == user_id).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    target_membership.role = role_update.role
    if role_update.club_department is not None:
        target_membership.club_department = role_update.club_department

    target_user = db.query(User).filter(User.id == user_id).first()
    if target_user:
        if role_update.role == ClubMemberRole.club_coordinator and target_user.role in [RoleEnum.student, RoleEnum.faculty]:
            target_user.role = RoleEnum.club_coordinator
        elif role_update.role != ClubMemberRole.club_coordinator and target_user.role == RoleEnum.club_coordinator:
            # Check if they are club_coordinator in ANY OTHER club before demoting
            other = db.query(ClubMembership).filter(ClubMembership.user_id == user_id, ClubMembership.role == ClubMemberRole.club_coordinator, ClubMembership.club_id != club_id).first()
            if not other:
                # We revert them to student by default, as we don't know their original role perfectly.
                # Since they were a student or faculty, 'student' is safest unless we track it.
                target_user.role = RoleEnum.student
                
    db.commit()
    return {"message": "Role updated"}

@router.delete("/{club_id}/members/{user_id}")
def remove_member(club_id: int, user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if not is_authorized:
        my_membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
        if my_membership and my_membership.role == ClubMemberRole.president:
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Only admins or club president can remove members")

    target_membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == user_id).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    db.delete(target_membership)
    db.commit()
    return {"message": "Member removed"}

@router.get("/lookup-user")
def lookup_user(email: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator, RoleEnum.club_coordinator]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"exists": False}
    return {
        "exists": True,
        "name": user.name,
        "role": user.role,
        "department": user.department
    }

@router.post("/{club_id}/members/add")
def add_member_manually(club_id: int, member_add: ClubMemberAdd, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only Admins can manually add members")

    target_user = db.query(User).filter(User.email == member_add.email).first()
    if not target_user:
        if not member_add.name:
            raise HTTPException(status_code=400, detail="User not found. Please provide Name to create a new user.")
        
        plain_password = secrets.token_urlsafe(6)
        target_user = User(
            name=member_add.name,
            email=member_add.email,
            hashed_password=pwd_context.hash(plain_password),
            role=RoleEnum[member_add.system_role] if member_add.system_role in RoleEnum.__members__ else RoleEnum.student,
            department=member_add.department or "",
            created_by_role='admin'
        )
        db.add(target_user)
        db.flush()
        background_tasks.add_task(send_student_credentials_email, member_add.email, member_add.name, plain_password)
        
        if target_user.role == RoleEnum.student:
            from app.models.user import Student
            student_num = f"STU-{target_user.id:04d}"
            stu = Student(user_id=target_user.id, student_number=student_num, year=1, section='A')
            db.add(stu)

    existing = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == target_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    # Auto-detect role: if they are a system club_coordinator, they must be the club's coordinator
    final_role = member_add.role
    if target_user.role in [RoleEnum.club_coordinator, RoleEnum.coordinator]:
        final_role = ClubMemberRole.club_coordinator
        
    # Conversely, if Admin explicitly adds them as 'club_coordinator', upgrade their global role!
    if final_role == ClubMemberRole.club_coordinator and target_user.role in [RoleEnum.student, RoleEnum.faculty]:
        target_user.role = RoleEnum.club_coordinator

    new_membership = ClubMembership(
        user_id=target_user.id,
        club_id=club_id,
        role=final_role,
        club_department=member_add.club_department
    )
    db.add(new_membership)
    
    # Auto-approve any pending join requests they might have had
    pending_req = db.query(ClubJoinRequest).filter(
        ClubJoinRequest.club_id == club_id, 
        ClubJoinRequest.user_id == target_user.id,
        ClubJoinRequest.status == JoinRequestStatus.pending
    ).first()
    if pending_req:
        pending_req.status = JoinRequestStatus.approved
        
    db.commit()
    return {"message": "Member added successfully"}

import csv
import io
import secrets
from fastapi import BackgroundTasks, UploadFile, File
from app.api.routers.coordinator import send_student_credentials_email

@router.get("/{club_id}/members/csv/template")
def get_club_members_csv_template():
    content = "Name,Email,Type,Department,Year,Section,Club Role\nJohn Doe,john@example.com,student,Computer Science,2,A,member\nJane Smith,jane@example.com,faculty,Computer Science,,,core"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=club_members_template.csv"}
    )

@router.post("/{club_id}/members/csv")
async def add_members_csv(club_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        my_membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
        if not my_membership or my_membership.role != ClubMemberRole.president:
            raise HTTPException(status_code=403, detail="Not authorized to bulk add members")

    contents = await file.read()
    try:
        decoded = contents.decode('utf-8-sig') # Handle BOM
    except:
        decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created_count = 0
    added_to_club_count = 0
    
    for row in reader:
        # Normalize headers (lowercase, strip whitespace)
        row_normalized = {k.lower().strip() if k else '': v for k, v in row.items()}
        
        email = row_normalized.get('email', '').strip()
        name = row_normalized.get('name', '').strip()
        user_type = row_normalized.get('type', 'student').strip().lower()
        dept = row_normalized.get('department', '').strip()
        club_role_str = row_normalized.get('club role', 'member').strip().lower()
        
        if not email or not name:
            continue
            
        plain_password = secrets.token_urlsafe(6)
        
        target_user = db.query(User).filter(User.email == email).first()
        if not target_user:
            # Create user
            target_user = User(
                name=name,
                email=email,
                hashed_password=pwd_context.hash(plain_password),
                role=RoleEnum.faculty if user_type == 'faculty' else RoleEnum.student,
                department=dept,
                created_by_role='admin'
            )
            db.add(target_user)
            db.flush() # get ID
            created_count += 1
            background_tasks.add_task(send_student_credentials_email, email, name, plain_password)
            
            # If student, create student profile
            if target_user.role == RoleEnum.student:
                from app.models.user import Student
                student_num = f"STU-{target_user.id:04d}"
                year = row_normalized.get('year', '1').strip()
                section = row_normalized.get('section', 'A').strip()
                try: year_int = int(year)
                except: year_int = 1
                stu = Student(user_id=target_user.id, student_number=student_num, year=year_int, section=section)
                db.add(stu)
                
        # Add to club
        existing = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == target_user.id).first()
        if not existing:
            final_role = ClubMemberRole.member
            if club_role_str in ['core', 'head', 'president', 'club_coordinator']:
                final_role = ClubMemberRole[club_role_str]
                
            if final_role == ClubMemberRole.club_coordinator and target_user.role in [RoleEnum.student, RoleEnum.faculty]:
                target_user.role = RoleEnum.club_coordinator
            new_membership = ClubMembership(
                user_id=target_user.id,
                club_id=club_id,
                role=final_role,
                club_department=dept
            )
            db.add(new_membership)
            added_to_club_count += 1
            
            pending_req = db.query(ClubJoinRequest).filter(
                ClubJoinRequest.club_id == club_id, 
                ClubJoinRequest.user_id == target_user.id,
                ClubJoinRequest.status == JoinRequestStatus.pending
            ).first()
            if pending_req:
                pending_req.status = JoinRequestStatus.approved
                
    db.commit()
    return {"message": f"Processed CSV. Created {created_count} new accounts and added {added_to_club_count} users to the club."}


from app.models.user import ClubLeaveRequest

@router.post("/{club_id}/leave")
def request_leave_club(club_id: int, reason: str = Body(..., embed=True), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=400, detail="You are not a member of this club.")
        
    existing_req = db.query(ClubLeaveRequest).filter(ClubLeaveRequest.club_id == club_id, ClubLeaveRequest.user_id == current_user.id, ClubLeaveRequest.status.in_(["pending", "pending_admin"])).first()
    if existing_req:
        raise HTTPException(status_code=400, detail="Leave request already pending")

    status = "pending" if current_user.role == RoleEnum.student else "pending_admin"
    leave_req = ClubLeaveRequest(
        user_id=current_user.id,
        club_id=club_id,
        status=status,
        reason=reason
    )
    db.add(leave_req)
    db.commit()
    return {"message": "Leave request submitted successfully."}

@router.get("/{club_id}/members/export")
def export_club_members(club_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if membership and membership.role in [ClubMemberRole.head, ClubMemberRole.president]:
        is_authorized = True
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to export members.")
        
    members = db.query(ClubMembership).filter(ClubMembership.club_id == club_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name', 'Email', 'Role', 'Department', 'Points', 'Joined At'])
    
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        writer.writerow([
            user.name if user else 'Unknown',
            user.email if user else 'Unknown',
            m.role.value,
            m.club_department or '',
            m.activity_points or 0,
            m.joined_at.strftime('%Y-%m-%d') if m.joined_at else ''
        ])
        
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type='text/csv')
    response.headers['Content-Disposition'] = f'attachment; filename=club_{club_id}_members.csv'
    return response

@router.put("/{club_id}/members/{user_id}/points")
def update_member_points(club_id: int, user_id: int, points_data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    points = points_data.get('activity_points')
    if points is None:
        raise HTTPException(status_code=400, detail="activity_points required.")
        
    membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if membership and membership.role in [ClubMemberRole.head, ClubMemberRole.president]:
        is_authorized = True
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to award points.")
        
    target_membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == user_id).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found in this club.")
        
    target_membership.activity_points = points
    db.commit()
    return {"message": "Points updated successfully."}

@router.post("/{club_id}/gallery")
def upload_club_gallery(club_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if membership and membership.role in [ClubMemberRole.head, ClubMemberRole.president, ClubMemberRole.core]:
        is_authorized = True
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to upload gallery images.")
        
    is_vercel = bool(os.getenv("VERCEL"))
    GALLERY_DIR = "/tmp/uploads/gallery" if is_vercel else "uploads/gallery"
    os.makedirs(GALLERY_DIR, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(GALLERY_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    img_url = f"/uploads/gallery/{filename}"
    
    gallery_item = ClubGallery(club_id=club_id, image_url=img_url)
    db.add(gallery_item)
    db.commit()
    db.refresh(gallery_item)
    
    return {"id": gallery_item.id, "image_url": gallery_item.image_url}

@router.get("/{club_id}/gallery")
def get_club_gallery(club_id: int, db: Session = Depends(get_db)):
    items = db.query(ClubGallery).filter(ClubGallery.club_id == club_id).order_by(ClubGallery.created_at.desc()).all()
    return [{"id": i.id, "image_url": i.image_url, "caption": i.caption, "created_at": i.created_at} for i in items]
