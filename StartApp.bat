@echo off
echo ========================================
echo ZEDSON WATCHCRAFT - Startup Script
echo Developed by PULSEWARE with Love
echo ========================================
echo.

:: Check if we're in the correct directory
if not exist "index.html" (
    echo ERROR: Please run this script from the root project folder
    echo where index.html is located.
    pause
    exit /b 1
)

if not exist "backend\server.js" (
    echo ERROR: Backend folder not found or server.js missing
    pause
    exit /b 1
)

echo Step 1: Starting MongoDB...
echo Please make sure MongoDB is installed and running
echo If MongoDB is not running, press Ctrl+C and start it manually
echo.
timeout /t 3

echo Step 2: Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo Step 3: Seeding database...
call npm run db:seed
if errorlevel 1 (
    echo WARNING: Database seeding failed, trying to continue...
)

echo Step 4: Starting backend server...
echo.
echo ========================================
echo Backend will start now
echo Keep this window open
echo Backend URL: http://localhost:5000
echo Health Check: http://localhost:5000/health
echo ========================================
echo.

start "ZEDSON Backend" cmd /k "npm run dev"

timeout /t 5

echo Step 5: Starting frontend server...
cd ..

echo.
echo ========================================
echo Frontend will start now
echo Keep this window open
echo Frontend URL: http://localhost:8000
echo ========================================
echo.

start "ZEDSON Frontend" cmd /k "python -m http.server 8000"

timeout /t 3

echo.
echo ========================================
echo SETUP COMPLETE!
echo.
echo Backend: http://localhost:5000/health
echo Frontend: http://localhost:8000
echo.
echo Login with: admin / admin123
echo ========================================
echo.

:: Open browser automatically
start http://localhost:8000

echo Script completed. Check the opened windows.
pause