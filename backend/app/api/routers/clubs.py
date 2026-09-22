from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum, Club
from app.api.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/clubs", tags=["clubs"])

class ClubCreate(BaseModel):
    name: str
    description: str = ""

@router.get("/list")
def list_clubs(db: Session = Depends(get_db)):
    clubs = db.query(Club).all()
    return [{"id": c.id, "name": c.name, "description": c.description} for c in clubs]

@router.post("/")
def create_club(club: ClubCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Only Admins and Coordinators can create new clubs")
        
    existing = db.query(Club).filter(Club.name == club.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Club already exists")
        
    new_club = Club(name=club.name, description=club.description)
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    return {"message": "Club created successfully", "id": new_club.id, "name": new_club.name, "description": new_club.description}

@router.put("/{club_id}")
def update_club(club_id: int, club: ClubCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.coordinator]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    existing_club = db.query(Club).filter(Club.id == club_id).first()
    if not existing_club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    existing_club.name = club.name
    existing_club.description = club.description
    db.commit()
    return {"message": "Club updated successfully"}

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
        
    db.delete(existing_club)
    db.commit()
    return {"message": "Club deleted successfully"}
