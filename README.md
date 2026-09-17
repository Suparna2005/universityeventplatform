# University Event Management and Engagement Platform

A responsive and secure university platform for event management, ticketing, certificates, and more.

## Setup Instructions (Windows PowerShell)

### Backend Setup

1. **Navigate to the backend directory:**
   ```powershell
   cd university-event-platform\backend
   ```

2. **Create a Python virtual environment:**
   ```powershell
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   *(If you encounter an execution policy error, run: `Set-ExecutionPolicy Unrestricted -Scope CurrentUser`)*

4. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

5. **Set up Environment Variables:**
   Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

6. **Run Database Migrations (after models are created):**
   ```powershell
   alembic upgrade head
   ```

7. **Start the FastAPI server:**
   ```powershell
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://127.0.0.1:8000`.

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```powershell
   cd university-event-platform\frontend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Set up Environment Variables:**
   Copy `.env.example` (if exists) or create a `.env` file containing:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

4. **Start the frontend development server:**
   ```powershell
   npm run dev
   ```
   The React app will be available at the URL shown in the console (usually `http://localhost:5173`).
