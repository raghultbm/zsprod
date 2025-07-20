@echo off
title ZEDSON WATCHCRAFT - Dependencies Installation
color 0B

echo.
echo ========================================
echo    ZEDSON WATCHCRAFT MANAGEMENT SYSTEM
echo        DEPENDENCIES INSTALLATION
echo ========================================
echo.

echo This script will install all required dependencies
echo for the ZEDSON WATCHCRAFT system.
echo.
echo Requirements:
echo - Node.js (v14 or higher)
echo - MongoDB (running locally)
echo.

REM Check if Node.js is installed
echo [1/3] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo Choose the LTS version and restart this script after installation.
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✓ Node.js found: %NODE_VERSION%
)

REM Check if npm is available
echo.
echo [2/3] Checking npm (Node Package Manager)...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ npm is not available
    echo npm should come with Node.js installation
    echo Please reinstall Node.js from: https://nodejs.org
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✓ npm found: %NPM_VERSION%
)

echo.
echo [3/3] Installing project dependencies...
echo.

REM Navigate to backend directory and install dependencies
echo Installing backend dependencies...
echo This may take several minutes depending on your internet connection...
echo.

cd /d "%~dp0backend"
if not exist "package.json" (
    echo ✗ Backend package.json not found!
    echo Please ensure you have copied all backend files correctly.
    echo Expected location: %~dp0backend\package.json
    pause
    exit /b 1
)

echo ✓ Found package.json, installing dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo ✗ Failed to install backend dependencies
    echo.
    echo Common solutions:
    echo 1. Check your internet connection
    echo 2. Clear npm cache: npm cache clean --force
    echo 3. Delete node_modules folder and try again
    echo 4. Run as Administrator
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Backend dependencies installed successfully
)

echo.
echo Installing global tools (optional but recommended)...
echo.

REM Install live-server globally for better frontend serving
echo Installing live-server for frontend serving...
call npm install -g live-server
if errorlevel 1 (
    echo ! Could not install live-server globally
    echo   This is not critical - the system can use Python server instead
    echo   To install manually later: npm install -g live-server
) else (
    echo ✓ live-server installed globally
)

REM Install nodemon globally for development
echo.
echo Installing nodemon for development (optional)...
call npm install -g nodemon
if errorlevel 1 (
    echo ! Could not install nodemon globally
    echo   This is not critical - you can still run the server
    echo   To install manually later: npm install -g nodemon
) else (
    echo ✓ nodemon installed globally
)

REM Install morgan globally for development
echo.
echo Installing morgan for development (optional)...
call npm install morgan
if errorlevel 1 (
    echo ! Could not install morgan globally
    echo   This is not critical - you can still run the server
    echo   To install manually later: npm install -g nodemon
) else (
    echo ✓ morgan installed globally
)

REM Install morgan globally for development
echo.
echo Installing multer for development (optional)...
call npm install multer
if errorlevel 1 (
    echo ! Could not install multer globally
    echo   This is not critical - you can still run the server
    echo   To install manually later: npm install -g nodemon
) else (
    echo ✓ multer installed globally
)

echo.
echo ========================================
echo      DEPENDENCIES INSTALLATION COMPLETE!
echo ========================================
echo.
echo Installed components:
echo ✓ Backend Node.js dependencies
echo ✓ Express.js web server
echo ✓ MongoDB database driver
echo ✓ JWT authentication
echo ✓ Security middleware
echo ✓ Development tools
echo.
echo Optional global tools:
echo - live-server (for frontend serving)
echo - nodemon (for development)
echo.
echo Next steps:
echo 1. Ensure MongoDB is installed and running
echo 2. Copy all backend and frontend files
echo 3. Run start-system.bat to start the application
echo.
echo MongoDB Installation:
echo - Download from: https://www.mongodb.com/try/download/community
echo - Install and start the MongoDB service
echo - Default connection: mongodb://localhost:27017
echo.
echo Press any key to exit...
pause >nul