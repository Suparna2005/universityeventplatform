import secrets
import qrcode
from io import BytesIO
from PIL import Image
import os

def generate_secure_token() -> str:
    """Generates a cryptographically secure random token for tickets."""
    return secrets.token_urlsafe(32)

def generate_qr_image_bytes(data: str, profile_pic_path: str = None) -> bytes:
    """Generates a QR code PNG image containing the given string data."""
    qr = qrcode.QRCode(
        version=4, # higher version to support logo
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    
    if profile_pic_path:
        try:
            # Usually profile_pic_path is like /static/profiles/filename.png
            # We need to map it to the actual file path
            local_path = profile_pic_path.lstrip('/')
            if local_path.startswith('static/'):
                local_path = local_path.replace('static/', 'uploads/', 1)

            if os.path.exists(local_path):
                logo = Image.open(local_path)
                
                # Resize logo to be at most 30% of QR code width/height
                basewidth = int(img.size[0] * 0.3)
                wpercent = (basewidth / float(logo.size[0]))
                hsize = int((float(logo.size[1]) * float(wpercent)))
                logo = logo.resize((basewidth, hsize), Image.LANCZOS)
                
                # Calculate position to center the logo
                pos = ((img.size[0] - logo.size[0]) // 2, (img.size[1] - logo.size[1]) // 2)
                
                # Paste logo onto QR code
                img.paste(logo, pos)
        except Exception as e:
            print(f"Error embedding profile picture in QR code: {e}")
            pass
            
    # Save image to a bytes buffer
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
