// File: backend/server.js
// ZEDSON WATCHCRAFT - Fixed Node.js Backend for MongoDB Integration
// Developed by PULSEWARE❤️

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { connectDB } = require('./config/database');
const apiRoutes = require('./routes/api');
const specialRoutes = require('./routes/special');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:8080',
        'http://localhost:5500',
        'http://localhost:8000',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:8080',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add preflight handling
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Error handling middleware for JSON parsing
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ error: 'Invalid JSON format' });
    }
    next();
});

// Connect to MongoDB
let dbConnected = false;
connectDB()
    .then(() => {
        dbConnected = true;
        console.log('✅ Database connection established');
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        dbConnected = false;
    });

// Enhanced Health Check with detailed status
app.get('/health', (req, res) => {
    const status = {
        status: 'OK',
        message: 'ZEDSON WATCHCRAFT Backend is running',
        developer: 'PULSEWARE❤️',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'Connected' : 'Disconnected',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: PORT
    };
    
    res.json(status);
});

// Database status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Test endpoint for frontend connectivity
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend connection successful',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api', (req, res, next) => {
    // Add database status to all API requests
    req.dbConnected = dbConnected;
    next();
});

app.use('/api', apiRoutes);
app.use('/api', specialRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'ZEDSON WATCHCRAFT API',
        version: '2.0.0',
        developer: 'PULSEWARE❤️',
        database: dbConnected ? 'Connected' : 'Disconnected',
        endpoints: {
            health: '/health',
            api: '/api',
            status: '/api/status',
            test: '/api/test'
        }
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl,
        message: 'ZEDSON WATCHCRAFT API - Developed by PULSEWARE❤️'
    });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        message: 'ZEDSON WATCHCRAFT API - Developed by PULSEWARE❤️'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    
    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'Something went wrong on our end',
        ...(isDevelopment && { stack: error.stack })
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ZEDSON WATCHCRAFT Backend Server Started');
    console.log(`💝 Developed by PULSEWARE with ❤️`);
    console.log(`📊 MongoDB Integration: ${dbConnected ? 'Active' : 'Inactive'}`);
    console.log(`🔗 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log('════════════════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    server.close(() => {
        console.log('🔌 HTTP server closed');
    });
    
    const { disconnectDB } = require('./config/database');
    await disconnectDB();
    
    console.log('👋 Goodbye from PULSEWARE❤️');
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

module.exports = app;