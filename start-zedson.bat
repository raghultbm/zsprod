@echo off
:: ZEDSON WATCHCRAFT - Start Server Script
:: This script starts the web server for ZEDSON WATCHCRAFT Management System

title ZEDSON WATCHCRAFT - Web Server

echo.
echo ========================================
echo   ZEDSON WATCHCRAFT Management System
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Display Node.js version
echo [INFO] Node.js version:
node --version
echo.

:: Check if we're in the correct directory
if not exist "index.html" (
    echo [ERROR] index.html not found!
    echo Please make sure you're running this script from the ZEDSON WATCHCRAFT root directory
    echo.
    pause
    exit /b 1
)

:: Check if package.json exists
if not exist "package.json" (
    echo [INFO] package.json not found. Creating basic package.json...
    echo {                                                          > package.json
    echo   "name": "zedson-watchcraft",                           >> package.json
    echo   "version": "1.0.0",                                    >> package.json
    echo   "description": "ZEDSON WATCHCRAFT Management System", >> package.json
    echo   "main": "index.html",                                  >> package.json
    echo   "scripts": {                                           >> package.json
    echo     "start": "live-server --port=8080 --open=/"         >> package.json
    echo   },                                                     >> package.json
    echo   "devDependencies": {                                   >> package.json
    echo     "live-server": "^1.2.2"                             >> package.json
    echo   }                                                      >> package.json
    echo }                                                        >> package.json
    echo [INFO] package.json created successfully
    echo.
)

:: Check if node_modules exists and live-server is installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

:: Check if live-server is available globally or locally
live-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] live-server not found globally, checking local installation...
    if not exist "node_modules\.bin\live-server.cmd" (
        echo [INFO] Installing live-server locally...
        call npm install live-server --save-dev
        echo.
    )
)

:: Save the process ID for stopping later
echo [INFO] Starting ZEDSON WATCHCRAFT Web Server...
echo.

:: Try to start with local live-server first, then global
if exist "node_modules\.bin\live-server.cmd" (
    echo [INFO] Using local live-server installation
    echo [INFO] Server will start on: http://localhost:8080
    echo [INFO] Press Ctrl+C to stop the server
    echo.
    echo ========================================
    echo   Server is starting...
    echo   Opening browser automatically...
    echo ========================================
    echo.
    
    :: Start live-server with local installation
    node_modules\.bin\live-server --port=8080 --open=/ --no-css-inject --ignore=node_modules
) else (
    echo [INFO] Using global live-server installation
    echo [INFO] Server will start on: http://localhost:8080
    echo [INFO] Press Ctrl+C to stop the server
    echo.
    echo ========================================
    echo   Server is starting...
    echo   Opening browser automatically...
    echo ========================================
    echo.
    
    :: Start live-server with global installation
    live-server --port=8080 --open=/ --no-css-inject --ignore=node_modules
)

:: This line will be reached when the server is stopped
echo.
echo ========================================
echo   Server stopped
echo ========================================
echo.
pause