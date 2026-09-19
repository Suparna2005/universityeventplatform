from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.engagement import Certificate, Attendance, ParticipationLedger
from app.models.event import Event, EventState
from app.models.user import User, RoleEnum
from app.api.dependencies import get_current_user
from app.services.certificate_service import generate_certificate_pdf_bytes
import uuid

router = APIRouter(prefix="/api/certificates", tags=["certificates"])

@router.post("/events/{event_id}/generate")
def bulk_generate_certificates(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only admins can generate certificates")
        
    event = db.query(Event).filter(Event.id == event_id).first()
    if event.state != EventState.completed:
        raise HTTPException(status_code=400, detail="Event must be completed to generate certificates")

    # Find all students who checked in (have attendance) OR have a rank from the CSV
    from app.models.event import Registration
    registrations = db.query(Registration).filter(
        Registration.event_id == event_id,
        (Registration.rank != None) | (Registration.id.in_(db.query(Attendance.registration_id)))
    ).all()

    generated_count = 0
    for reg in registrations:
        student_id = reg.student_id
        # Prevent duplicate certificates
        existing = db.query(Certificate).filter(
            Certificate.event_id == event_id,
            Certificate.student_id == student_id
        ).first()
        
        if not existing:
            cert = Certificate(
                student_id=student_id,
                event_id=event_id,
                certificate_number=f"CERT-{uuid.uuid4().hex[:8].upper()}",
                rank=reg.rank or "Participation",
                is_published=1
            )
            db.add(cert)
            
            # Also give them participation hours
            ledger = db.query(ParticipationLedger).filter(
                ParticipationLedger.event_id == event_id,
                ParticipationLedger.student_id == student_id
            ).first()
            
            if not ledger:
                ledger = ParticipationLedger(
                    student_id=student_id,
                    event_id=event_id,
                    hours_earned=2.0,
                    reason=f"Attended {event.title}"
                )
                db.add(ledger)
            generated_count += 1
            
    db.commit()
    return {"message": f"Successfully generated and published {generated_count} certificates for students."}

@router.put("/events/{event_id}/publish")
def publish_certificates(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [RoleEnum.coordinator, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Only coordinators can publish certificates")
        
    certs = db.query(Certificate).filter(Certificate.event_id == event_id).all()
    count = 0
    for cert in certs:
        if cert.is_published == 0:
            cert.is_published = 1
            count += 1
            
    db.commit()
    return {"message": f"Successfully published {count} certificates to students!"}

@router.get("/{certificate_id}/download")
def download_certificate(certificate_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    if current_user.role == RoleEnum.student and cert.student_id != current_user.student_profile.id:
        raise HTTPException(status_code=403, detail="You can only download your own certificates")
        
    student = cert.student.user
    event = cert.event
    
    pdf_bytes = generate_certificate_pdf_bytes(
        student_name=student.name,
        event_title=event.title,
        date_str=event.date.strftime("%B %d, %Y"),
        cert_number=cert.certificate_number,
        rank=cert.rank
    )
    
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Certificate_{cert.certificate_number}.pdf"}
    )

@router.get("/me")
def get_my_certificates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.student or not current_user.student_profile:
        return []
        
    certs = db.query(Certificate).filter(
        Certificate.student_id == current_user.student_profile.id,
        Certificate.is_published == 1
    ).all()
    
    return [
        {
            "id": c.id,
            "event_title": c.event.title,
            "certificate_number": c.certificate_number,
            "rank": c.rank,
            "issued_at": c.issued_at
        } for c in certs
    ]
