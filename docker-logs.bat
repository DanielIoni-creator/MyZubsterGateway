@echo off
echo ==========================================
echo   MYZUBSTER - DOCKER LOGS
echo ==========================================
echo.
echo Seleziona un servizio:
echo 1. backend
echo 2. frontend
echo 3. hardhat
echo 4. postgres
echo 5. redis
echo 6. Tutti
echo.
set /p choice="Scelta (1-6): "

if "%choice%"=="1" docker-compose logs -f backend
if "%choice%"=="2" docker-compose logs -f frontend
if "%choice%"=="3" docker-compose logs -f hardhat
if "%choice%"=="4" docker-compose logs -f postgres
if "%choice%"=="5" docker-compose logs -f redis
if "%choice%"=="6" docker-compose logs -f

pause