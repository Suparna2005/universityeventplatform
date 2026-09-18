from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO

def generate_certificate_pdf_bytes(student_name: str, event_title: str, date_str: str, cert_number: str, rank: str = "Participation") -> bytes:
    """Generates a PDF certificate using ReportLab."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Draw border
    c.setLineWidth(5)
    c.rect(20, 20, width - 40, height - 40)

    # Title
    c.setFont("Helvetica-Bold", 36)
    if rank.lower() == "participation" or not rank:
        title = "Certificate of Participation"
        body = "has successfully participated in the event"
    else:
        title = f"Certificate of Achievement"
        body = f"has successfully achieved {rank} in the event"

    c.drawCentredString(width / 2.0, height - 150, title)

    # Body
    c.setFont("Helvetica", 18)
    c.drawCentredString(width / 2.0, height - 250, "This is to certify that")
    
    # Student Name
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2.0, height - 300, student_name)
    
    c.setFont("Helvetica", 18)
    c.drawCentredString(width / 2.0, height - 350, body)
    
    # Event Title
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2.0, height - 400, event_title)
    
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2.0, height - 450, f"Date: {date_str}")
    
    # Certificate Number
    c.setFont("Helvetica", 10)
    c.drawString(50, 50, f"Certificate No: {cert_number}")

    c.showPage()
    c.save()
    
    return buffer.getvalue()
