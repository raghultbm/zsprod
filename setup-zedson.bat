@echo off
:: ZEDSON WATCHCRAFT - Initial Setup Script (Simplified Working Version)

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
    echo Recommended version: Node.js 18.x or higher
    echo After installation, restart Command Prompt and run this script again.
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js is installed
node --version
echo.

:: Check if we're in the correct directory
echo [STEP 2] Checking project files...
if not exist "index.html" (
    echo [ERROR] index.html not found!
    echo.
    echo Current directory: %CD%
    echo.
    echo Please make sure you are running this script from the
    echo ZEDSON WATCHCRAFT root directory that contains index.html
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Found index.html - correct directory confirmed
echo.

:: Check critical files
echo [STEP 3] Verifying critical files...
set missing_files=0

if not exist "css\styles.css" (
    echo [WARNING] css\styles.css not found
    set missing_files=1
)
if not exist "css\login.css" (
    echo [WARNING] css\login.css not found
    set missing_files=1
)
if not exist "js\utils.js" (
    echo [WARNING] js\utils.js not found
    set missing_files=1
)
if not exist "js\auth.js" (
    echo [WARNING] js\auth.js not found
    set missing_files=1
)

if %missing_files% equ 1 (
    echo [WARNING] Some files are missing. The application may not work correctly.
    echo Continue with setup anyway? Press any key to continue, or Ctrl+C to abort.
    pause >nul
)

echo [SUCCESS] File verification completed
echo.

:: Create assets folder if missing
echo [STEP 4] Checking assets folder...
if not exist "assets" (
    echo [INFO] Creating assets folder...
    mkdir assets
    echo [SUCCESS] Assets folder created
) else (
    echo [SUCCESS] Assets folder found
)
echo.

:: Create or verify package.json
echo [STEP 5] Setting up package.json...
if not exist "package.json" (
    echo [INFO] Creating package.json...
    echo { > package.json
    echo   "name": "zedson-watchcraft", >> package.json
    echo   "version": "1.0.0", >> package.json
    echo   "description": "ZEDSON WATCHCRAFT Management System", >> package.json
    echo   "main": "index.html", >> package.json
    echo   "scripts": { >> package.json
    echo     "start": "live-server --port=8080 --open=/", >> package.json
    echo     "dev": "live-server --port=3000 --open=/" >> package.json
    echo   }, >> package.json
    echo   "devDependencies": { >> package.json
    echo     "live-server": "^1.2.2" >> package.json
    echo   } >> package.json
    echo } >> package.json
    echo [SUCCESS] package.json created
) else (
    echo [SUCCESS] package.json already exists
)
echo.

:: Install dependencies
echo [STEP 6] Installing dependencies...
echo [INFO] Installing live-server... This may take a moment.
echo.

call npm install live-server --save-dev
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install live-server
    echo.
    echo Troubleshooting:
    echo 1. Check your internet connection
    echo 2. Try: npm cache clean --force
    echo 3. Try: npm install -g live-server
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] live-server installed successfully
echo.

:: Create utility scripts
echo [STEP 7] Creating utility scripts...

if not exist "start-zedson.bat" (
    echo [INFO] Creating start-zedson.bat...
    echo @echo off > start-zedson.bat
    echo title ZEDSON WATCHCRAFT - Server >> start-zedson.bat
    echo echo Starting ZEDSON WATCHCRAFT Server... >> start-zedson.bat
    echo echo Server will start on: http://localhost:8080 >> start-zedson.bat
    echo echo Press Ctrl+C to stop the server >> start-zedson.bat
    echo echo. >> start-zedson.bat
    echo if exist "node_modules\.bin\live-server.cmd" ( >> start-zedson.bat
    echo     call node_modules\.bin\live-server.cmd --port=8080 --open=/ >> start-zedson.bat
    echo ^) else ( >> start-zedson.bat
    echo     live-server --port=8080 --open=/ >> start-zedson.bat
    echo ^) >> start-zedson.bat
    echo pause >> start-zedson.bat
    echo [SUCCESS] start-zedson.bat created
) else (
    echo [INFO] start-zedson.bat already exists
)

if not exist "stop-zedson.bat" (
    echo [INFO] Creating stop-zedson.bat...
    echo @echo off > stop-zedson.bat
    echo title ZEDSON WATCHCRAFT - Stop Server >> stop-zedson.bat
    echo echo Stopping ZEDSON WATCHCRAFT Server... >> stop-zedson.bat
    echo taskkill /F /IM node.exe 2^>nul >> stop-zedson.bat
    echo echo Server stopped >> stop-zedson.bat
    echo pause >> stop-zedson.bat
    echo [SUCCESS] stop-zedson.bat created
) else (
    echo [INFO] stop-zedson.bat already exists
)

echo.

:: Final verification
echo [STEP 8] Final verification...
if exist "node_modules\.bin\live-server.cmd" (
    echo [SUCCESS] live-server installation verified
) else (
    echo [WARNING] live-server may not be properly installed
    echo Try running: npm install -g live-server
)
echo.

:: Completion message
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Your ZEDSON WATCHCRAFT system is ready to use.
echo.
echo QUICK START:
echo 1. Double-click 'start-zedson.bat' to start the server
echo 2. Browser will open automatically to http://localhost:8080
echo 3. Login with: Username: admin, Password: admin123
echo 4. Use 'stop-zedson.bat' to stop the server
echo.
echo IMPORTANT: Change the default password after first login!
echo.
echo Available scripts:
echo - start-zedson.bat  : Start the web server
echo - stop-zedson.bat   : Stop the web server
echo - setup-zedson.bat  : Run this setup again
echo.
echo Setup completed successfully!
echo.
pause