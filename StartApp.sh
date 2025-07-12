#!/bin/bash

# ZEDSON WATCHCRAFT - Cross-Platform Startup Script
# Developed by PULSEWARE❤️
# Works on Windows (Git Bash), macOS, and Linux

echo "=========================================="
echo "🏪 ZEDSON WATCHCRAFT - System Startup"
echo "💝 Developed by PULSEWARE"
echo "=========================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if command_exists netstat; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 1  # Port is in use
        fi
    elif command_exists lsof; then
        if lsof -i:$port >/dev/null 2>&1; then
            return 1  # Port is in use
        fi
    fi
    return 0  # Port is available
}

# Function to start MongoDB service
start_mongodb() {
    echo "🔍 Checking MongoDB service..."
    
    # Check if MongoDB is already running
    if command_exists mongosh; then
        if mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            echo "✅ MongoDB is already running"
            return 0
        fi
    elif command_exists mongo; then
        if mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            echo "✅ MongoDB is already running"
            return 0
        fi
    fi
    
    echo "🚀 Starting MongoDB service..."
    
    # Try different MongoDB start methods based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew services start mongodb-community >/dev/null 2>&1 || \
            brew services start mongodb >/dev/null 2>&1 || \
            mongod --config /usr/local/etc/mongod.conf --fork >/dev/null 2>&1
        else
            mongod --fork >/dev/null 2>&1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo systemctl start mongod >/dev/null 2>&1 || \
        sudo service mongod start >/dev/null 2>&1 || \
        mongod --fork >/dev/null 2>&1
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows (Git Bash/Cygwin)
        net start MongoDB >/dev/null 2>&1 || \
        mongod --install >/dev/null 2>&1 && net start MongoDB >/dev/null 2>&1 || \
        mongod --fork >/dev/null 2>&1
    fi
    
    # Wait a moment for MongoDB to start
    sleep 3
    
    # Verify MongoDB is running
    if command_exists mongosh; then
        if mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            echo "✅ MongoDB started successfully"
            return 0
        fi
    elif command_exists mongo; then
        if mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            echo "✅ MongoDB started successfully"
            return 0
        fi
    fi
    
    echo "⚠️  Could not verify MongoDB is running"
    echo "   Please ensure MongoDB is installed and accessible"
    echo "   Manual start: mongod"
    return 1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ required. Current version: $(node --version)"
    exit 1
fi
echo "✅ Node.js $(node --version) found"

# Check npm
if ! command_exists npm; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi
echo "✅ npm $(npm --version) found"

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Please run this script from the root project folder where index.html is located"
    exit 1
fi

if [ ! -d "backend" ]; then
    echo "❌ Backend folder not found. Please ensure the backend is set up properly"
    exit 1
fi

if [ ! -f "backend/server.js" ]; then
    echo "❌ Backend server.js not found"
    exit 1
fi

echo "✅ Project structure verified"

# Check MongoDB
echo ""
if ! command_exists mongod && ! command_exists mongo && ! command_exists mongosh; then
    echo "⚠️  MongoDB not found in PATH"
    echo "   Please ensure MongoDB is installed and accessible"
    echo "   Visit: https://docs.mongodb.com/manual/installation/"
else
    echo "✅ MongoDB found"
    start_mongodb
fi

# Check ports
echo ""
echo "🔍 Checking ports..."

if ! check_port 5000; then
    echo "⚠️  Port 5000 is in use. Backend may already be running or port is occupied"
else
    echo "✅ Port 5000 is available"
fi

if ! check_port 8000; then
    echo "⚠️  Port 8000 is in use. You may need to use a different port for frontend"
else
    echo "✅ Port 8000 is available"
fi

# Start backend
echo ""
echo "🔧 Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
fi

echo "🚀 Starting backend server..."
echo "   Backend URL: http://localhost:5000"
echo "   Health Check: http://localhost:5000/health"
echo ""

# Start backend in background
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows - use start command
    cmd //c "start \"ZEDSON Backend\" cmd /k \"npm run dev\""
else
    # Unix-like systems
    npm run dev &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
fi

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend connection
BACKEND_READY=false
for i in {1..10}; do
    if curl -s http://localhost:5000/health >/dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    echo "   Attempt $i/10..."
    sleep 2
done

if [ "$BACKEND_READY" = true ]; then
    echo "✅ Backend is responding"
else
    echo "⚠️  Backend may not be fully ready yet"
fi

# Return to project root
cd ..

# Start frontend
echo ""
echo "🌐 Starting frontend..."
echo "   Frontend URL: http://localhost:8000"
echo ""

# Try different methods to start frontend server
if command_exists python3; then
    echo "🐍 Using Python 3 HTTP server..."
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        cmd //c "start \"ZEDSON Frontend\" cmd /k \"python -m http.server 8000\""
    else
        python3 -m http.server 8000 &
        FRONTEND_PID=$!
        echo "Frontend started with PID: $FRONTEND_PID"
    fi
elif command_exists python; then
    echo "🐍 Using Python HTTP server..."
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        cmd //c "start \"ZEDSON Frontend\" cmd /k \"python -m http.server 8000\""
    else
        python -m http.server 8000 &
        FRONTEND_PID=$!
        echo "Frontend started with PID: $FRONTEND_PID"
    fi
elif command_exists npx; then
    echo "📦 Using npx http-server..."
    npx http-server -p 8000 &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
else
    echo "⚠️  No suitable HTTP server found"
    echo "   Please install Python or Node.js http-server"
    echo "   Or open index.html directly in your browser"
fi

# Wait a moment for frontend to start
sleep 3

# Open browser
echo ""
echo "🌐 Opening browser..."
if command_exists xdg-open; then
    xdg-open http://localhost:8000 >/dev/null 2>&1
elif command_exists open; then
    open http://localhost:8000 >/dev/null 2>&1
elif command_exists start; then
    start http://localhost:8000 >/dev/null 2>&1
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    cmd //c "start http://localhost:8000" >/dev/null 2>&1
fi

# Final information
echo ""
echo "=========================================="
echo "🎉 ZEDSON WATCHCRAFT STARTED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "🔗 URLs:"
echo "   Frontend: http://localhost:8000"
echo "   Backend:  http://localhost:5000"
echo "   Health:   http://localhost:5000/health"
echo ""
echo "🔐 Demo Login Credentials:"
echo "   Admin:    admin / admin123"
echo "   Owner:    owner / owner123"  
echo "   Staff:    staff / staff123"
echo ""
echo "📱 Features Available:"
echo "   ✅ Customer Management"
echo "   ✅ Inventory Tracking"
echo "   ✅ Sales Processing"
echo "   ✅ Service Management"
echo "   ✅ Expense Tracking"
echo "   ✅ Invoice Generation"
echo "   ✅ Dashboard Analytics"
echo ""
echo "🛑 To stop the application:"
echo "   Press Ctrl+C or close terminal windows"
echo ""
echo "=========================================="

# Keep script running on Unix-like systems
if [[ ! "$OSTYPE" == "msys" ]] && [[ ! "$OSTYPE" == "cygwin" ]]; then
    echo ""
    echo "Press Ctrl+C to stop all services..."
    
    # Function to cleanup on exit
    cleanup() {
        echo ""
        echo "🛑 Stopping services..."
        if [ ! -z "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null
            echo "   Backend stopped"
        fi
        if [ ! -z "$FRONTEND_PID" ]; then
            kill $FRONTEND_PID 2>/dev/null
            echo "   Frontend stopped"
        fi
        echo "👋 Thanks for using ZEDSON WATCHCRAFT!"
        echo "💝 Developed by PULSEWARE"
        exit 0
    }
    
    # Set trap for cleanup
    trap cleanup SIGINT SIGTERM
    
    # Wait indefinitely
    while true; do
        sleep 1
    done
fi