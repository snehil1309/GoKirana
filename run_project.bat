@echo off
echo Starting GoKirana Project Servers...

:: Start FastAPI Backend in a new window
echo Starting FastAPI Backend on http://localhost:8000
start cmd /k "uvicorn backend.main:app --reload --port 8000"

:: Start React Frontend
echo Starting React Vite Frontend...
cd frontend
npm run dev

pause
