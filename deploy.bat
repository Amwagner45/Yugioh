@echo off
REM Docker deployment script for Yu-Gi-Oh Deck Builder (Windows)

echo 🚀 Building and deploying Yu-Gi-Oh Deck Builder...

REM Create data directories if they don't exist
echo 📁 Creating data directories...
if not exist "docker-data\app-data" mkdir "docker-data\app-data"
if not exist "docker-data\cache" mkdir "docker-data\cache"

REM Build the Docker image
echo 🏗️  Building Docker image...
docker-compose build

REM Start the services
echo 🚀 Starting services...
docker-compose up -d

REM Wait for health check
echo ⏳ Waiting for application to be healthy...
set /a timeout=60
set /a counter=0

:healthcheck
if %counter% geq %timeout% goto timeout_reached

REM Check if the service is healthy
docker-compose exec yugioh-deck-builder curl -f http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Application is healthy!
    goto healthy
)

echo Waiting... (%counter%s)
timeout /t 5 /nobreak >nul
set /a counter+=5
goto healthcheck

:timeout_reached
echo ❌ Application failed to become healthy within %timeout%s
echo 📋 Checking logs...
docker-compose logs yugioh-deck-builder
exit /b 1

:healthy
echo.
echo 🎉 Yu-Gi-Oh Deck Builder deployed successfully!
echo.
echo 📍 Application URL: http://localhost:8000
echo 📋 API Documentation: http://localhost:8000/docs
echo 📊 Health Check: http://localhost:8000/api/health
echo.
echo 💾 Data is persisted in:
echo    - App data: .\docker-data\app-data
echo    - Cache: .\docker-data\cache
echo.
echo 📖 Useful commands:
echo    - View logs: docker-compose logs -f yugioh-deck-builder
echo    - Stop: docker-compose down
echo    - Restart: docker-compose restart
echo    - Update: deploy.bat (run this script again)
echo.
pause