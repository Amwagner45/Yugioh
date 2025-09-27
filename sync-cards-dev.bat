@echo off
REM Development script to sync cards before Docker build
REM Run this when you want to ensure your local database is fully populated

echo 🎴 Yu-Gi-Oh Card Database Development Sync
echo ==========================================
echo.

REM Check if we're in the right directory
if not exist "backend\dev_sync_cards.py" (
    echo ❌ Error: Please run this script from the project root directory
    echo    Expected to find: backend\dev_sync_cards.py
    exit /b 1
)

REM Change to backend directory
cd backend

echo 📂 Working directory: %CD%
echo.

REM Run the sync script
echo 🚀 Starting card sync...
python dev_sync_cards.py

echo.
echo ✅ Development sync completed!
echo.
echo Next steps:
echo   • Run 'docker-compose build' to build image with pre-populated database
echo   • Or run 'deploy.bat' to build and deploy
echo.
pause