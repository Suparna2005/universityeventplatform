import os
import subprocess
import sys

def main():
    print("Fixing dependencies...")
    
    # Check if python-multipart is installed
    try:
        import multipart
        print("python-multipart is already installed!")
    except ImportError:
        print("python-multipart is missing! Installing now...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "python-multipart"])
        print("Successfully installed python-multipart!")
        
    print("\nAll dependencies are installed! You can now start the server with:")
    print("uvicorn app.main:app --reload")

if __name__ == "__main__":
    main()
