from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.engagement import Attendance
from app.models.event import Registration
from app.models.user import User, Student
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/participation")
def get_participation_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch all attendances joined with User
    attendances = db.query(Attendance, User).join(
        Registration, Attendance.registration_id == Registration.id
    ).join(
        Student, Registration.student_id == Student.id
    ).join(
        User, Student.user_id == User.id
    ).all()
    
    # Process data in memory for simplicity (or use complex group_by queries)
    gender_stats = {"male": 0, "female": 0, "other": 0, "unknown": 0}
    dept_stats = {}
    time_stats = {"daily": {}, "monthly": {}, "yearly": {}}
    
    for att, user in attendances:
        # Gender
        gender = (user.gender or "unknown").lower()
        if gender in gender_stats:
            gender_stats[gender] += 1
        else:
            gender_stats["unknown"] += 1
            
        # Department
        dept = user.department or "Unknown"
        dept_stats[dept] = dept_stats.get(dept, 0) + 1
        
        # Time
        if att.check_in_time:
            daily_key = att.check_in_time.strftime("%Y-%m-%d")
            monthly_key = att.check_in_time.strftime("%Y-%m")
            yearly_key = att.check_in_time.strftime("%Y")
            
            time_stats["daily"][daily_key] = time_stats["daily"].get(daily_key, 0) + 1
            time_stats["monthly"][monthly_key] = time_stats["monthly"].get(monthly_key, 0) + 1
            time_stats["yearly"][yearly_key] = time_stats["yearly"].get(yearly_key, 0) + 1
            
    # Format for charting libraries (like recharts)
    formatted_gender = [{"name": k.capitalize(), "value": v} for k, v in gender_stats.items() if v > 0]
    formatted_dept = [{"name": k, "value": v} for k, v in dept_stats.items()]
    
    formatted_daily = [{"date": k, "participants": v} for k, v in sorted(time_stats["daily"].items())]
    formatted_monthly = [{"date": k, "participants": v} for k, v in sorted(time_stats["monthly"].items())]
    formatted_yearly = [{"date": k, "participants": v} for k, v in sorted(time_stats["yearly"].items())]

    return {
        "gender": formatted_gender,
        "department": formatted_dept,
        "time": {
            "daily": formatted_daily,
            "monthly": formatted_monthly,
            "yearly": formatted_yearly
        }
    }
