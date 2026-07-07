@echo off
echo ==========================================
echo   MYZUBSTER - DOCKER STOP
echo ==========================================
echo.

echo Fermo tutti i servizi...
docker-compose down

echo.
echo ✅ Servizi fermati!
pause