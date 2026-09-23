from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum, Club, ClubMembership, ClubJoinRequest, ClubMemberRole, JoinRequestStatus, ClubGallery
from app.schemas.clubs import (
    ClubCreate, ClubResponse, ClubMembershipResponse, 
    ClubJoinRequestCreate, ClubJoinRequestResponse, RoleUpdate
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
    clubs = db.query(Club).all()
    return clubs

@router.post("/", response_model=ClubResponse)
def create_club(club: ClubCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Only Admins and Coordinators can create new clubs")
        
    existing = db.query(Club).filter(Club.name == club.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Club already exists")
        
    new_club = Club(name=club.name, description=club.description, achievements=club.achievements)
    db.add(new_club)
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
        message=req.message
    )
    db.add(new_req)
    db.commit()
    return {"message": "Join request submitted"}

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

@router.post("/requests/{request_id}/approve")
def approve_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(ClubJoinRequest).filter(ClubJoinRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    is_authorized = current_user.role in [RoleEnum.admin, RoleEnum.coordinator]
    if not is_authorized:
        membership = db.query(ClubMembership).filter(ClubMembership.club_id == req.club_id, ClubMembership.user_id == current_user.id).first()
        if membership and membership.role in [ClubMemberRole.head, ClubMemberRole.president]:
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to approve requests")

    req.status = JoinRequestStatus.approved
    
    new_membership = ClubMembership(
        user_id=req.user_id,
        club_id=req.club_id,
        role=ClubMemberRole.member
    )
    db.add(new_membership)
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

@router.get("/{club_id}/members", response_model=List[ClubMembershipResponse])
def list_members(club_id: int, db: Session = Depends(get_db)):
    memberships = db.query(ClubMembership).filter(ClubMembership.club_id == club_id).all()
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
            user_email=user.email if user else "Unknown"
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
        
    db.commit()
    return {"message": "Role updated"}

@router.delete("/{club_id}/leave")
def leave_club(club_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(ClubMembership).filter(ClubMembership.club_id == club_id, ClubMembership.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=400, detail="You are not a member of this club.")
    
    db.delete(membership)
    db.commit()
    return {"message": "You have left the club."}

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
