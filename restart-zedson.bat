@echo off
:: ZEDSON WATCHCRAFT - Restart Server Script
:: This script stops and restarts the web server

title ZEDSON WATCHCRAFT - Restart Server

echo.
echo ========================================
echo   ZEDSON WATCHCRAFT - Restart Server
echo ========================================
echo.

echo [INFO] Restarting ZEDSON WATCHCRAFT Web Server...
echo.

:: Step 1: Stop the server
echo [STEP 1] Stopping current server...
call stop-zedson.bat

:: Wait a moment for processes to fully terminate
echo [INFO] Waiting for processes to terminate...
timeout /t 3 /nobreak >nul

:: Step 2: Start the server
echo.
echo [STEP 2] Starting server...
call start-zedson.bat

:: This line will be reached when the server is stopped again
echo.
echo ========================================
echo   Server restart completed
echo ========================================
echo.
pause