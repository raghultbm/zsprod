@echo off
setlocal enabledelayedexpansion
:: ZEDSON WATCHCRAFT - Stop Server Script (Fixed Version)
:: This script stops all running live-server instances

title ZEDSON WATCHCRAFT - Stop Server

echo.
echo ========================================
echo   ZEDSON WATCHCRAFT - Stop Server
echo ========================================
echo.

:: Function to kill processes by PID safely
:killProcess
set "processId=%1"
if defined processId (
    tasklist /FI "PID eq %processId%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [INFO] Stopping process ID: %processId%
        taskkill /PID %processId% /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo [SUCCESS] Process %processId% stopped
        ) else (
            echo [WARNING] Could not stop process %processId%
        )
    )
)
goto :eof

:: Check for running live-server processes
echo [STEP 1] Checking for live-server processes...

:: Method 1: Find node.exe processes with live-server in command line
set "found_processes=0"
for /f "skip=1 tokens=2,10 delims=," %%a in ('tasklist /FO CSV ^| findstr /I "node.exe"') do (
    set "pid=%%a"
    set "pid=!pid:"=!"
    
    :: Check if this node process is running live-server
    wmic process where "processid=!pid!" get commandline /format:list 2>nul | findstr /I "live-server" >nul
    if !errorlevel! equ 0 (
        set "found_processes=1"
        call :killProcess !pid!
    )
)

:: Method 2: Check processes using port 8080
echo [STEP 2] Checking for processes using port 8080...
for /f "tokens=5" %%i in ('netstat -ano 2^>nul ^| findstr ":8080 "') do (
    set "pid=%%i"
    if defined pid (
        if not "!pid!"=="0" (
            set "found_processes=1"
            call :killProcess !pid!
        )
    )
)

:: Method 3: More aggressive cleanup for stubborn processes
echo [STEP 3] Additional cleanup...

:: Kill by process name and command line
wmic process where "name='node.exe' and commandline like '%%live-server%%'" delete >nul 2>&1

:: Kill any remaining processes on port 8080
for /f "tokens=5" %%i in ('netstat -ano 2^>nul ^| findstr ":8080"') do (
    set "pid=%%i"
    if defined pid (
        call :killProcess !pid!
    )
)

:: Method 4: Alternative approach using PowerShell (if available)
echo [STEP 4] Final cleanup using PowerShell...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'node' -and $_.Modules.ModuleName -like '*live-server*'} | Stop-Process -Force" >nul 2>&1

:: Wait for processes to fully terminate
echo [INFO] Waiting for processes to terminate...
timeout /t 3 /nobreak >nul

:: Verify port 8080 is free
echo [STEP 5] Verifying port 8080 is free...
netstat -ano | findstr :8080 >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 8080 is still in use. Attempting final cleanup...
    
    :: Last resort - more aggressive port cleanup
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":8080"') do (
        set "pid=%%i"
        if defined pid (
            echo [INFO] Force killing remaining process: !pid!
            taskkill /PID !pid! /F /T >nul 2>&1
        )
    )
    
    timeout /t 2 /nobreak >nul
    
    :: Final check
    netstat -ano | findstr :8080 >nul 2>&1
    if !errorlevel! equ 0 (
        echo [ERROR] Unable to completely free port 8080
        echo Some processes may require manual termination or system restart
    ) else (
        echo [SUCCESS] Port 8080 is now free
    )
) else (
    echo [SUCCESS] Port 8080 is free
)

if %found_processes% equ 1 (
    echo.
    echo ========================================
    echo   SERVER PROCESSES STOPPED
    echo ========================================
    echo.
    echo [SUCCESS] ZEDSON WATCHCRAFT server processes have been stopped
    echo [INFO] Port 8080 is now available for use
    echo [INFO] You can restart the server using start-zedson.bat
) else (
    echo.
    echo ========================================
    echo   NO ACTIVE SERVERS FOUND
    echo ========================================
    echo.
    echo [INFO] No ZEDSON WATCHCRAFT server processes were running
    echo [INFO] Port 8080 was already available
)

echo.
echo [INFO] Server cleanup completed successfully
echo.
pause