@echo off
title ZEDSON WATCHCRAFT - System Startup
color 0A

echo.
echo ========================================
echo    ZEDSON WATCHCRAFT MANAGEMENT SYSTEM
echo ========================================
echo.
echo Starting system components...
echo.

REM Check if MongoDB is running
echo [1/4] Checking MongoDB status...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ MongoDB is already running
) else (
    echo ! MongoDB not detected, attempting to start...
    echo   Please ensure MongoDB is installed and configured
    echo   Trying to start MongoDB service...
    net start MongoDB 2>nul
    if errorlevel 1 (
        echo ! Could not start MongoDB service automatically
        echo ! Please start MongoDB manually:
        echo   - Open Command Prompt as Administrator
        echo   - Run: net start MongoDB
        echo   - Or start mongod.exe manually
        echo.
        pause
    ) else (
        echo ✓ MongoDB service started successfully
    )
)

echo.
echo [2/4] Starting Backend API Server...
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo ! Node modules not found, installing dependencies...
    echo   This may take a few minutes...
    call npm install
    if errorlevel 1 (
        echo ✗ Failed to install dependencies
        echo Please run 'npm install' manually in the backend folder
        pause
        exit /b 1
    )
)

echo ✓ Starting Node.js server on port 5000...
start "ZEDSON Backend Server" cmd /k "echo Backend Server Started - Do NOT close this window && echo. && node server.js"

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

echo.
echo [3/4] Checking Backend Health...
REM Try to ping the health endpoint
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -TimeoutSec 10; if ($response.StatusCode -eq 200) { Write-Host '✓ Backend server is responding' } else { Write-Host '! Backend server returned status: ' $response.StatusCode } } catch { Write-Host '! Could not connect to backend server' }"

echo.
echo [4/4] Starting Frontend Server...
cd /d "%~dp0"

REM Check if live-server is available globally
where live-server >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Starting frontend with live-server on port 8000...
    start "ZEDSON Frontend Server" cmd /k "echo Frontend Server Started - Do NOT close this window && echo Access the application at: http://localhost:8000 && echo. && live-server --port=8000 --open=/"
) else (
    REM Check if Python is available
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ Starting frontend with Python server on port 8000...
        start "ZEDSON Frontend Server" cmd /k "echo Frontend Server Started - Do NOT close this window && echo Access the application at: http://localhost:8000 && echo. && python -m http.server 8000"
    ) else (
        echo ! Neither live-server nor Python found
        echo Please install one of the following:
        echo   - Node.js live-server: npm install -g live-server
        echo   - Python 3: https://python.org
        echo.
        echo Alternative: Open index.html directly in your browser
        pause
        exit /b 1
    )
)

REM Wait for servers to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo           SYSTEM STARTED!
echo ========================================
echo.
echo Backend API:  http://localhost:5000
echo Frontend App: http://localhost:8000
echo Health Check: http://localhost:5000/api/health
echo.
echo Default Admin Login:
echo Username: admin
echo Password: admin123
echo.
echo IMPORTANT:
echo - Keep both server windows open
echo - Use stop-system.bat to properly shutdown
echo - Check logs in server windows for any errors
echo.

REM Try to open the application in default browser
echo Opening application in browser...
timeout /t 2 /nobreak >nul
start http://localhost:8000

echo.
echo System startup complete!
echo Press any key to exit this window...
pause >nul