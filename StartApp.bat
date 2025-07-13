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
        echo Required dependencies: express, mongodb, cors, bcryptjs
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
echo Database: zedson_watchcraft (MongoDB)
echo ========================================
echo.

:: Start backend in a new window
start "ZEDSON Backend" cmd /k "echo Starting ZEDSON WATCHCRAFT Backend with MongoDB... && npm start"

:: Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 10

echo Step 4: Starting frontend server...
cd ..

echo.
echo ========================================
echo Frontend starting now
echo Keep this window open
echo Frontend URL: http://localhost:8000
echo Real-time MongoDB Sync: Enabled
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
echo Database: MongoDB on localhost:27017
echo.
echo Default Admin Login:
echo Username: admin | Password: admin123
echo.
echo IMPORTANT: Keep both windows open!
echo - ZEDSON Backend (Node.js + MongoDB server)
echo - ZEDSON Frontend (Web server)
echo ========================================
echo.

:: Check if backend is responding
echo Testing backend connection...
ping -n 3 127.0.0.1 > nul
curl -s http://localhost:5000/health > nul 2>&1
if errorlevel 1 (
    echo WARNING: Backend may not be responding yet
    echo Please wait a few more seconds for it to start
    echo If login shows "AUTHENTICATING..." forever:
    echo 1. Check if both windows are still open
    echo 2. Visit http://localhost:5000/health
    echo 3. If it shows error, restart the Backend window
    echo 4. Ensure MongoDB is running on localhost:27017
    echo 5. Wait 10 seconds and try login again
) else (
    echo Backend is responding successfully!
    echo MongoDB connection established
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
echo 4. Ensure MongoDB is running: mongod --dbpath C:\data\db
echo 5. Wait 10 seconds and try login again
echo.
echo If you see "Offline Mode" indicator:
echo 1. This means MongoDB backend is not connected
echo 2. Check MongoDB service is running
echo 3. Restart the backend window
echo 4. All data will sync when connection is restored
echo.
echo Connection Status:
echo - Green dot = Connected to MongoDB
echo - Red dot = Offline (data queued for sync)
echo.
echo MongoDB Database Information:
echo - Database Name: zedson_watchcraft
echo - Collections: users, customers, inventory, sales, services, expenses, invoices, logs
echo - Default Admin: username=admin, password=admin123
echo.
echo Real-time Features:
echo - All changes sync immediately with MongoDB
echo - Offline operations queued and synced when online
echo - Multi-user support with role-based permissions
echo - Automatic data backup in MongoDB
echo ========================================
echo.

echo Script completed. Check the opened windows and browser.
echo.
echo For support, contact PULSEWARE development team.
pause