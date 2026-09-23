import sys
try:
    import app.main
    print("SUCCESS: Backend imported properly.")
except Exception as e:
    import traceback
    traceback.print_exc()
