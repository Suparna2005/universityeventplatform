from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.engagement import Ticket
from app.models.event import Registration
from app.models.user import User
from app.api.dependencies import get_current_user
from app.services.qr_service import generate_qr_image_bytes

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

@router.get("/{registration_id}/qr")
def get_qr_ticket(registration_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify the registration belongs to the user
    if not current_user.student_profile:
        raise HTTPException(status_code=403, detail="Only students have tickets")
        
    registration = db.query(Registration).filter(
        Registration.id == registration_id,
        Registration.student_id == current_user.student_profile.id
    ).first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Get or create ticket
    ticket = db.query(Ticket).filter(Ticket.registration_id == registration.id).first()
    if not ticket:
        from app.services.qr_service import generate_secure_token
        ticket = Ticket(
            registration_id=registration.id,
            secure_token=generate_secure_token()
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

    # Generate the actual PNG image bytes
    qr_bytes = generate_qr_image_bytes(ticket.secure_token, current_user.profile_picture)
    
    # Return as an image
    return Response(content=qr_bytes, media_type="image/png")

import jwt
from datetime import datetime, timedelta
from app.core.security import SECRET_KEY, ALGORITHM

@router.get("/{registration_id}/qr/live")
def get_live_qr_ticket(registration_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify the registration belongs to the user
    if not current_user.student_profile:
        raise HTTPException(status_code=403, detail="Only students have tickets")
        
    registration = db.query(Registration).filter(
        Registration.id == registration_id,
        Registration.student_id == current_user.student_profile.id
    ).first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Get or create ticket
    ticket = db.query(Ticket).filter(Ticket.registration_id == registration.id).first()
    if not ticket:
        from app.services.qr_service import generate_secure_token
        ticket = Ticket(
            registration_id=registration.id,
            secure_token=generate_secure_token()
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

    # Generate a time-sensitive JWT wrapping the secure_token
    # Expires in exactly 10 seconds to prevent screenshots
    expire = datetime.utcnow() + timedelta(seconds=10)
    payload = {
        "sub": ticket.secure_token,
        "exp": expire,
        "type": "live_qr"
    }
    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # Generate the actual PNG image bytes
    qr_bytes = generate_qr_image_bytes(encoded_jwt, current_user.profile_picture)
    
    # Return as an image
    return Response(content=qr_bytes, media_type="image/png")
