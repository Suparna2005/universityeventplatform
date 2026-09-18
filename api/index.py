import os
import sys

# Add backend to sys.path so it can find 'app'
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app
