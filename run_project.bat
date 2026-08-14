@echo off
echo ========================================================
echo   Ziplo / GoKirana Multi-Device Local Server
echo ========================================================
echo Local PC Access:     http://localhost:5173
echo Mobile Wi-Fi Access:  http://192.168.29.36:5173
echo Backend API:          http://192.168.29.36:8000
echo ========================================================
echo.

:: Start FastAPI Backend exposed on all interfaces
echo Starting FastAPI Backend...
start cmd /k "uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

:: Start React Vite Frontend exposed on all interfaces
echo Starting React Vite Frontend...
cd frontend
npm run dev -- --host 0.0.0.0

pause

