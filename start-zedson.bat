@echo off
:: ZEDSON WATCHCRAFT - Simple Start Script
:: start-zedson-simple.bat

title ZEDSON WATCHCRAFT - Web Server

echo.
echo =======================================
echo   ZEDSON WATCHCRAFT Management System
echo =======================================
echo.
echo Starting web server...
echo Server will be available at: http://localhost:8080
echo Press Ctrl+C to stop the server
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if live-server is installed globally
live-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing live-server...
    npm install -g live-server
    if %errorlevel% neq 0 (
        echo Failed to install live-server globally
        echo Trying local installation...
        npm install live-server
    )
)

:: Start the server
if exist "node_modules\.bin\live-server.cmd" (
    echo Using local live-server...
    node_modules\.bin\live-server --port=8080 --open=/ --no-css-inject
) else (
    echo Using global live-server...
    live-server --port=8080 --open=/ --no-css-inject
)

pause