@echo off
setlocal enabledelayedexpansion
:: ZEDSON WATCHCRAFT - Start Server Script (Fixed Version)
:: This script starts the web server for ZEDSON WATCHCRAFT Management System

title ZEDSON WATCHCRAFT - Web Server

echo.
echo ========================================
echo   ZEDSON WATCHCRAFT Management System
echo ========================================
echo.

:: Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo After installation, restart your command prompt and try again.
    echo.
    pause
    exit /b 1
)

:: Display Node.js version
echo [SUCCESS] Node.js is installed:
node --version
echo.

:: Check if we're in the correct directory
if not exist "index.html" (
    echo [ERROR] index.html not found!
    echo Current directory: %CD%
    echo Please make sure you're running this script from the ZEDSON WATCHCRAFT root directory
    echo The directory should contain: index.html, css/, js/, and assets/ folders
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Found index.html - correct directory confirmed
echo.

:: Create package.json if it doesn't exist
if not exist "package.json" (
    echo [INFO] Creating package.json...
    (
        echo {
        echo   "name": "zedson-watchcraft",
        echo   "version": "1.0.0",
        echo   "description": "ZEDSON WATCHCRAFT Management System",
        echo   "main": "index.html",
        echo   "scripts": {
        echo     "start": "live-server --port=8080 --open=/ --no-css-inject",
        echo     "dev": "live-server --port=3000 --open=/ --no-css-inject"
        echo   },
        echo   "devDependencies": {
        echo     "live-server": "^1.2.2"
        echo   },
        echo   "engines": {
        echo     "node": "^>=14.0.0"
        echo   }
        echo }
    ) > package.json
    echo [SUCCESS] package.json created
    echo.
)

:: Install live-server if not present
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo This may take a few moments...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install dependencies
        echo Please check your internet connection and try again
        echo You can also try: npm install live-server --save-dev
        echo.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed
    echo.
) else (
    echo [INFO] node_modules found
    :: Check if live-server is installed
    if not exist "node_modules\.bin\live-server.cmd" (
        if not exist "node_modules\.bin\live-server" (
            echo [INFO] live-server not found, installing...
            call npm install live-server --save-dev
            if !errorlevel! neq 0 (
                echo [ERROR] Failed to install live-server
                echo.
                pause
                exit /b 1
            )
        )
    )
    echo [SUCCESS] live-server is available
    echo.
)

:: Check if port 8080 is already in use
echo [INFO] Checking if port 8080 is available...
netstat -ano | findstr :8080 >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 8080 is already in use!
    echo [INFO] Attempting to free port 8080...
    
    :: Try to kill processes using port 8080
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
        set "pid=%%i"
        if defined pid (
            echo [INFO] Killing process on port 8080: !pid!
            taskkill /PID !pid! /F >nul 2>&1
        )
    )
    
    :: Wait a moment and check again
    timeout /t 2 /nobreak >nul
    netstat -ano | findstr :8080 >nul 2>&1
    if !errorlevel! equ 0 (
        echo [ERROR] Could not free port 8080. Please close any applications using this port.
        echo Common applications that use port 8080: Other web servers, development tools
        echo.
        pause
        exit /b 1
    )
)

echo [SUCCESS] Port 8080 is available
echo.

:: Start the server
echo [INFO] Starting ZEDSON WATCHCRAFT Web Server...
echo [INFO] Server URL: http://localhost:8080
echo [INFO] The browser will open automatically
echo [INFO] Press Ctrl+C to stop the server
echo.
echo ========================================
echo   SERVER STARTING...
echo ========================================
echo.

:: Try different methods to start live-server
if exist "node_modules\.bin\live-server.cmd" (
    echo [INFO] Starting with local live-server (Windows)
    call node_modules\.bin\live-server.cmd --port=8080 --open=/ --no-css-inject --ignore=node_modules
) else if exist "node_modules\.bin\live-server" (
    echo [INFO] Starting with local live-server (Unix-style)
    call node_modules\.bin\live-server --port=8080 --open=/ --no-css-inject --ignore=node_modules
) else (
    echo [INFO] Trying to start with global live-server
    live-server --version >nul 2>&1
    if !errorlevel! equ 0 (
        live-server --port=8080 --open=/ --no-css-inject --ignore=node_modules
    ) else (
        echo [ERROR] live-server not found!
        echo Please install live-server globally: npm install -g live-server
        echo Or make sure local installation completed successfully
        echo.
        pause
        exit /b 1
    )
)

:: This line is reached when server stops
echo.
echo ========================================
echo   SERVER STOPPED
echo ========================================
echo.
echo [INFO] ZEDSON WATCHCRAFT server has been stopped
echo [INFO] All ports have been released
echo.
pause