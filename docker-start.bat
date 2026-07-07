@echo off
echo ==========================================
echo   MYZUBSTER - DOCKER START
echo ==========================================
echo.

echo [1/4] Creazione file .env...
copy .env.docker .env

echo [2/4] Avvio servizi...
docker-compose up -d

echo [3/4] Attesa avvio servizi...
timeout /t 5

echo [4/4] Verifica servizi...
docker-compose ps

echo.
echo ==========================================
echo   ✅ SERVIZI AVVIATI!
echo ==========================================
echo.
echo 🌐 Frontend: http://localhost:3001
echo 🔧 Backend: http://localhost:3000
echo ⛓️ Blockchain: http://localhost:8545
echo 🗄️ Database: localhost:5432
echo 📦 Redis: localhost:6379
echo.
echo Per fermare i servizi:
echo   docker-compose down
echo.
pause