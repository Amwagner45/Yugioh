@echo off
echo Starting Yu-Gi-Oh Deck Builder Development Environment...
echo.
echo Starting Backend Server...
start "Backend" cmd /k "cd backend && C:/Users/amwag/Desktop/Coding/Yugioh/.venv/Scripts/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Development servers starting...
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause > nul
