@echo off
echo =======================================================
echo Starting University Event Platform
echo =======================================================

echo Starting Backend API...
start cmd /k "cd C:\Users\supar\Downloads\universityevemng\university-event-platform\backend && .\venv\Scripts\activate && uvicorn app.main:app --reload"

echo Starting Frontend...
start cmd /k "cd C:\Users\supar\Downloads\universityevemng\university-event-platform\frontend && npm run dev"

echo =======================================================
echo Please wait about 10 seconds for servers to start.
echo Then, open your browser and go to:
echo http://localhost:5173
echo =======================================================
pause
