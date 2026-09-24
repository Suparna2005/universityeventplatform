import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_student_credentials_email(to_email: str, student_name: str, plain_password: str):
    """
    Sends an email to the student with their generated login credentials.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"Email not sent to {to_email}: SMTP credentials are not configured in .env")
        return False

    msg = MIMEMultipart()
    msg['From'] = f"University Event Management <{settings.SMTP_FROM_EMAIL}>"
    msg['To'] = to_email
    msg['Subject'] = "Welcome to Brainware University Events - Your Login Credentials"

    body = f"""
    Hello {student_name},

    Welcome to the Brainware University Event Management Portal!
    An account has been created for you by your Department Coordinator.

    You can log in to the portal using the following credentials:
    
    Email: {to_email}
    Password: {plain_password}

    Please log in and change your password as soon as possible.
    
    Best regards,
    University Event Management Team
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Successfully sent credentials email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
