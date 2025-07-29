@echo off
:: ZEDSON WATCHCRAFT - Stop Server Script
:: This script stops all running live-server instances

title ZEDSON WATCHCRAFT - Stop Server

echo.
echo ========================================
echo   ZEDSON WATCHCRAFT - Stop Server
echo ========================================
echo.

:: Check for running live-server processes
echo [INFO] Checking for running live-server processes...

:: Kill all live-server processes
tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr /I "live-server" >nul
if %errorlevel% equ 0 (
    echo [INFO] Found running live-server processes
    echo [INFO] Stopping live-server...
    
    :: Kill all node processes that contain live-server
    for /f "tokens=2 delims=," %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV ^| findstr /I "live-server"') do (
        set "pid=%%i"
        set pid=!pid:"=!
        echo [INFO] Killing process ID: !pid!
        taskkill /PID !pid! /F >nul 2>&1
    )
    
    :: Alternative method - kill by command line
    wmic process where "name='node.exe' and commandline like '%%live-server%%'" delete >nul 2>&1
    
    echo [INFO] Live-server processes stopped
) else (
    echo [INFO] No live-server processes found running
)

:: Also kill any processes using port 8080
echo [INFO] Checking for processes using port 8080...
netstat -ano | findstr :8080 >nul
if %errorlevel% equ 0 (
    echo [INFO] Found processes using port 8080
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :8080') do (
        set "pid=%%i"
        if defined pid (
            echo [INFO] Killing process using port 8080: !pid!
            taskkill /PID !pid! /F >nul 2>&1
        )
    )
) else (
    echo [INFO] No processes found using port 8080
)

:: Kill any remaining Node.js processes that might be related
echo [INFO] Cleaning up any remaining Node.js processes...
tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr /V "PID" >nul
if %errorlevel% equ 0 (
    echo [INFO] Found other Node.js processes running
    echo [INFO] Checking if they are related to this project...
    
    :: More selective killing - only kill node processes in current directory
    for /f "skip=1 tokens=2 delims=," %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV') do (
        set "pid=%%i"
        set pid=!pid:"=!
        
        :: Check if process is in current directory (optional)
        wmic process where "processid=!pid!" get commandline /format:list 2>nul | findstr /I "%CD%" >nul
        if !errorlevel! equ 0 (
            echo [INFO] Killing related Node.js process: !pid!
            taskkill /PID !pid! /F >nul 2>&1
        )
    )
)

echo.
echo ========================================
echo   All server processes stopped
echo   Port 8080 is now available
echo ========================================
echo.

:: Wait a moment to ensure processes are fully terminated
timeout /t 2 /nobreak >nul

echo [INFO] Server cleanup completed
echo [INFO] You can now restart the server using start-zedson.bat
echo.
pause