@echo off
echo ========================================
echo ZEDSON WATCHCRAFT - FIXED Startup
echo Developed by PULSEWARE with Love
echo ========================================
echo.

:: Check if we're in the correct directory
if not exist "index.html" (
    echo ERROR: Please run this script from the root project folder
    echo where index.html is located.
    pause
    exit /b 1
)

echo Step 1: Checking MongoDB...
echo Please ensure MongoDB is installed and running on your system
echo MongoDB should be available at: mongodb://localhost:27017
echo.

:: Check if backend directory exists
if not exist "backend" (
    echo ERROR: Backend folder not found
    echo Creating backend folder...
    mkdir backend
)

:: Check if server.js exists in backend
if not exist "backend\server.js" (
    echo ERROR: server.js not found in backend folder
    echo Please ensure server.js is in the backend folder
    pause
    exit /b 1
)

:: Check if package.json exists in backend
if not exist "backend\package.json" (
    echo ERROR: package.json not found in backend folder
    echo Please ensure package.json is in the backend folder
    pause
    exit /b 1
)

echo Step 2: Installing backend dependencies...
cd backend

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies for the first time...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo Please ensure Node.js and npm are installed
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed, checking for updates...
    call npm install --production
)

echo Step 3: Starting backend server...
echo.
echo ========================================
echo Backend starting now
echo Keep this window open
echo Backend URL: http://localhost:5000
echo Health Check: http://localhost:5000/health
echo API Endpoint: http://localhost:5000/api
echo ========================================
echo.

:: Start backend in a new window
start "ZEDSON Backend" cmd /k "echo Starting ZEDSON WATCHCRAFT Backend... && npm run dev"

:: Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 8

echo Step 4: Starting frontend server...
cd ..

echo.
echo ========================================
echo Frontend starting now
echo Keep this window open
echo Frontend URL: http://localhost:8000
echo ========================================
echo.

:: Start frontend in a new window
start "ZEDSON Frontend" cmd /k "echo Starting ZEDSON WATCHCRAFT Frontend... && python -m http.server 8000"

:: Wait for frontend to start
timeout /t 5

echo.
echo ========================================
echo SETUP COMPLETE!
echo.
echo Frontend: http://localhost:8000
echo Backend: http://localhost:5000/health
echo.
echo Default Login Credentials:
echo Username: admin | Password: admin123
echo Username: owner | Password: owner123
echo Username: staff | Password: staff123
echo.
echo IMPORTANT: Keep both windows open!
echo - ZEDSON Backend (MongoDB server)
echo - ZEDSON Frontend (Web server)
echo ========================================
echo.

:: Check if backend is responding
echo Testing backend connection...
curl -s http://localhost:5000/health > nul
if errorlevel 1 (
    echo WARNING: Backend may not be responding yet
    echo Please wait a few more seconds for it to start
) else (
    echo Backend is responding successfully!
)

echo.
echo Opening application in browser...
timeout /t 3

:: Open browser automatically
start http://localhost:8000

echo.
echo ========================================
echo TROUBLESHOOTING:
echo.
echo If login shows "AUTHENTICATING..." forever:
echo 1. Check if both windows are still open
echo 2. Visit http://localhost:5000/health
echo 3. If it shows error, restart the Backend window
echo 4. Wait 10 seconds and try login again
echo.
echo If you see "Offline Mode" in the app:
echo 1. This is normal if MongoDB is not running
echo 2. The app will work with demo data
echo 3. All features will still function
echo ========================================
echo.

echo Script completed. Check the opened windows and browser.
pause