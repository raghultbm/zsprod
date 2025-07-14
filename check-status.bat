@echo off
title ZEDSON WATCHCRAFT - System Status Check
color 0E

echo.
echo ========================================
echo    ZEDSON WATCHCRAFT MANAGEMENT SYSTEM
echo            STATUS CHECK
echo ========================================
echo.

echo Checking system status...
echo.

REM Check MongoDB status
echo [1/5] MongoDB Status:
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ MongoDB is running
    
    REM Try to connect to MongoDB
    echo   Testing MongoDB connection...
    mongo --eval "db.runCommand('ping').ok" --quiet zedson_watchcraft 2>nul
    if errorlevel 1 (
        echo   ! MongoDB connection test failed
    ) else (
        echo   ✓ MongoDB connection successful
    )
) else (
    echo ✗ MongoDB is not running
    echo   Please start MongoDB service or run mongod.exe
)

echo.

REM Check Backend Server status
echo [2/5] Backend API Server Status:
tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq ZEDSON Backend Server*" 2>NUL | find /I "node.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Backend server process is running
    
    REM Check if port 5000 is in use
    netstat -an | find ":5000 " | find "LISTENING" >NUL
    if "%ERRORLEVEL%"=="0" (
        echo ✓ Backend server is listening on port 5000
        
        REM Test API health endpoint
        echo   Testing API health endpoint...
        powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '   ✓ API health check passed' } else { Write-Host '   ! API returned status: ' $response.StatusCode } } catch { Write-Host '   ✗ API health check failed' }"
    ) else (
        echo ! Backend server process running but not listening on port 5000
    )
) else (
    echo ✗ Backend server is not running
    echo   Use start-system.bat to start the backend server
)

echo.

REM Check Frontend Server status
echo [3/5] Frontend Server Status:
set frontend_running=0

REM Check for live-server
tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq ZEDSON Frontend Server*" 2>NUL | find /I "node.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Frontend server (live-server) is running
    set frontend_running=1
) else (
    REM Check for Python server
    tasklist /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq ZEDSON Frontend Server*" 2>NUL | find /I "python.exe" >NUL
    if "%ERRORLEVEL%"=="0" (
        echo ✓ Frontend server (Python) is running
        set frontend_running=1
    )
)

if %frontend_running%==1 (
    REM Check if port 8000 is in use
    netstat -an | find ":8000 " | find "LISTENING" >NUL
    if "%ERRORLEVEL%"=="0" (
        echo ✓ Frontend server is listening on port 8000
        
        REM Test frontend accessibility
        echo   Testing frontend accessibility...
        powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '   ✓ Frontend is accessible' } else { Write-Host '   ! Frontend returned status: ' $response.StatusCode } } catch { Write-Host '   ✗ Frontend accessibility test failed' }"
    ) else (
        echo ! Frontend server process running but not listening on port 8000
    )
) else (
    echo ✗ Frontend server is not running
    echo   Use start-system.bat to start the frontend server
)

echo.

REM Check Node.js and dependencies
echo [4/5] Dependencies Status:
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo ✓ Node.js: %%i
) else (
    echo ✗ Node.js not found
)

where npm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo ✓ npm: %%i
) else (
    echo ✗ npm not found
)

cd /d "%~dp0backend"
if exist "node_modules" (
    echo ✓ Backend dependencies installed
) else (
    echo ✗ Backend dependencies not installed
    echo   Run install-dependencies.bat to install
)

where live-server >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ live-server available globally
) else (
    echo ! live-server not available globally (optional)
)

echo.

REM Check database contents
echo [5/5] Database Status:
if "%ERRORLEVEL%"=="0" (
    echo Checking database contents...
    
    REM Check if users collection exists and has data
    mongo --quiet --eval "db.users.count()" zedson_watchcraft 2>nul > temp_count.txt
    if exist temp_count.txt (
        set /p user_count=<temp_count.txt
        del temp_count.txt
        if "!user_count!" neq "0" (
            echo ✓ Users collection: !user_count! users found
        ) else (
            echo ! Users collection is empty
            echo   Run the application to create default admin user
        )
    )
    
    REM Check if customers collection exists and has data
    mongo --quiet --eval "db.customers.count()" zedson_watchcraft 2>nul > temp_count.txt
    if exist temp_count.txt (
        set /p customer_count=<temp_count.txt
        del temp_count.txt
        echo ✓ Customers collection: !customer_count! customers found
    )
    
    if exist temp_count.txt del temp_count.txt
)

echo.
echo ========================================
echo            STATUS SUMMARY
echo ========================================
echo.

REM Overall system status
echo System URLs:
echo Frontend:    http://localhost:8000
echo Backend API: http://localhost:5000
echo Health Check: http://localhost:5000/api/health
echo.

echo Quick Actions:
echo - Start System:  start-system.bat
echo - Stop System:   stop-system.bat
echo - Install Deps:  install-dependencies.bat
echo.

echo Default Login:
echo Username: admin
echo Password: admin123
echo.

echo Press any key to exit...
pause >nul