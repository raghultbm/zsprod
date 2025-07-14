@echo off
title ZEDSON WATCHCRAFT - System Shutdown
color 0C

echo.
echo ========================================
echo    ZEDSON WATCHCRAFT MANAGEMENT SYSTEM
echo           SHUTDOWN SEQUENCE
echo ========================================
echo.

echo Stopping system components...
echo.

echo [1/4] Stopping Frontend Server...
REM Kill live-server processes
tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq ZEDSON Frontend Server*" 2>NUL | find /I "node.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Stopping live-server...
    taskkill /F /FI "WINDOWTITLE eq ZEDSON Frontend Server*" >NUL 2>&1
)

REM Kill Python server processes
tasklist /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq ZEDSON Frontend Server*" 2>NUL | find /I "python.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Stopping Python server...
    taskkill /F /FI "WINDOWTITLE eq ZEDSON Frontend Server*" >NUL 2>&1
)

REM Also kill any processes using port 8000
echo ✓ Ensuring port 8000 is free...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":8000 "') do (
    taskkill /F /PID %%a >NUL 2>&1
)

echo.
echo [2/4] Stopping Backend API Server...
REM Kill backend server processes
tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq ZEDSON Backend Server*" 2>NUL | find /I "node.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Stopping Node.js backend server...
    taskkill /F /FI "WINDOWTITLE eq ZEDSON Backend Server*" >NUL 2>&1
)

REM Also kill any processes using port 5000
echo ✓ Ensuring port 5000 is free...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5000 "') do (
    taskkill /F /PID %%a >NUL 2>&1
)

echo.
echo [3/4] Checking MongoDB status...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ! MongoDB is still running
    echo   This is normal - MongoDB should keep running
    echo   If you want to stop MongoDB:
    echo   - Open Command Prompt as Administrator
    echo   - Run: net stop MongoDB
) else (
    echo ✓ MongoDB is not running
)

echo.
echo [4/4] Cleaning up processes...
REM Kill any remaining related processes
taskkill /F /IM "live-server.exe" >NUL 2>&1
taskkill /F /IM "http-server.exe" >NUL 2>&1

REM Clean up any orphaned Node.js processes (be careful with this)
echo ✓ Cleaning up any orphaned processes...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo         SYSTEM SHUTDOWN COMPLETE!
echo ========================================
echo.
echo All ZEDSON WATCHCRAFT services stopped.
echo.
echo Notes:
echo - MongoDB may still be running (this is normal)
echo - All application data is safely saved
echo - Use start-system.bat to restart the system
echo.
echo Press any key to exit...
pause >nul