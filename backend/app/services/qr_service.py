import secrets
import qrcode
from io import BytesIO

def generate_secure_token() -> str:
    """Generates a cryptographically secure random token for tickets."""
    return secrets.token_urlsafe(32)

def generate_qr_image_bytes(data: str) -> bytes:
    """Generates a QR code PNG image containing the given string data."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save image to a bytes buffer
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
