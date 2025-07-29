@echo off
:: ZEDSON WATCHCRAFT - Initial Setup Script
:: This script sets up the development environment for ZEDSON WATCHCRAFT

title ZEDSON WATCHCRAFT - Initial Setup

echo.
echo ========================================
echo   ZEDSON WATCHCRAFT - Initial Setup
echo ========================================
echo.
echo This script will set up your development environment
echo for the ZEDSON WATCHCRAFT Management System.
echo.

:: Check if Node.js is installed
echo [STEP 1] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    echo Recommended version: Node.js 18.x or higher
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Node.js is installed
    node --version
    echo.
)

:: Check if we're in the correct directory
echo [STEP 2] Checking project files...
if not exist "index.html" (
    echo [ERROR] index.html not found!
    echo.
    echo Please make sure you are running this script from the
    echo ZEDSON WATCHCRAFT root directory that contains:
    echo - index.html
    echo - js/ folder
    echo - css/ folder
    echo - assets/ folder
    echo.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Project files found
    echo.
)

:: Check critical files
echo [STEP 3] Verifying critical files...
set "missing_files="

if not exist "css\styles.css" set "missing_files=%missing_files% css\styles.css"
if not exist "css\login.css" set "missing_files=%missing_files% css\login.css"
if not exist "js\utils.js" set "missing_files=%missing_files% js\utils.js"
if not exist "js\auth.js" set "missing_files=%missing_files% js\auth.js"
if not exist "js\inventory.js" set "missing_files=%missing_files% js\inventory.js"
if not exist "js\customers.js" set "missing_files=%missing_files% js\customers.js"

if defined missing_files (
    echo [WARNING] Some files are missing:
    echo %missing_files%
    echo.
    echo The application may not work correctly.
    echo Please ensure all files are uploaded properly.
    echo.
) else (
    echo [SUCCESS] All critical files found
    echo.
)

:: Create package.json if it doesn't exist
echo [STEP 4] Setting up package.json...
if not exist "package.json" (
    echo [INFO] Creating package.json...
    (
        echo {
        echo   "name": "zedson-watchcraft",
        echo   "version": "1.0.0",
        echo   "description": "Professional Watch Shop Management System for ZEDSON WATCHCRAFT",
        echo   "main": "index.html",
        echo   "scripts": {
        echo     "dev": "live-server --port=3000 --open=/",
        echo     "start": "live-server --port=8080 --open=/",
        echo     "build": "echo 'No build process needed for this project'",
        echo     "test": "echo 'No tests specified'"
        echo   },
        echo   "keywords": [
        echo     "watch-shop",
        echo     "management-system",
        echo     "inventory",
        echo     "sales",
        echo     "service",
        echo     "invoicing"
        echo   ],
        echo   "author": "ZEDSON WATCHCRAFT",
        echo   "license": "ISC",
        echo   "devDependencies": {
        echo     "live-server": "^1.2.2"
        echo   },
        echo   "engines": {
        echo     "node": ">=14.0.0"
        echo   }
        echo }
    ) > package.json
    echo [SUCCESS] package.json created
    echo.
) else (
    echo [SUCCESS] package.json already exists
    echo.
)

:: Install dependencies
echo [STEP 5] Installing dependencies...
echo [INFO] Installing live-server...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    echo Please check your internet connection and try again
    echo.
    pause
    exit /b 1
) else (
    echo [SUCCESS] Dependencies installed successfully
    echo.
)

:: Create additional batch files if they don't exist
echo [STEP 6] Creating utility scripts...

if not exist "start-zedson.bat" (
    echo [INFO] Creating start-zedson.bat...
    echo @echo off > start-zedson.bat
    echo npm start >> start-zedson.bat
    echo pause >> start-zedson.bat
)

if not exist "restart-zedson.bat" (
    echo [INFO] Creating restart-zedson.bat...
    (
        echo @echo off
        echo echo Stopping server...
        echo call stop-zedson.bat
        echo timeout /t 3 /nobreak ^>nul
        echo echo Starting server...
        echo call start-zedson.bat
    ) > restart-zedson.bat
)

echo [SUCCESS] Utility scripts created
echo.

:: Check if assets folder exists
echo [STEP 7] Checking assets...
if not exist "assets" (
    echo [INFO] Creating assets folder...
    mkdir assets
)

if not exist "assets\zedson-logo.png" (
    echo [INFO] Logo file not found at assets\zedson-logo.png
    echo The application will use a fallback text logo
    echo.
)

:: Final setup verification
echo [STEP 8] Final verification...
echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Your ZEDSON WATCHCRAFT system is now ready to use.
echo.
echo QUICK START:
echo   1. Run 'start-zedson.bat' to start the server
echo   2. Open http://localhost:8080 in your browser
echo   3. Login with: admin / admin123
echo   4. Run 'stop-zedson.bat' to stop the server
echo.
echo AVAILABLE SCRIPTS:
echo   - start-zedson.bat    : Start the web server
echo   - stop-zedson.bat     : Stop the web server  
echo   - restart-zedson.bat  : Restart the web server
echo   - setup-zedson.bat    : Run this setup again
echo.
echo DEFAULT LOGIN CREDENTIALS:
echo   Username: admin
echo   Password: admin123
echo.
echo IMPORTANT: Change the default password after first login!
echo.
echo PORT: The server will run on http://localhost:8080
echo.
echo For support: Check the documentation or contact support
echo.
pause