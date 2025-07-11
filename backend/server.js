// File: backend/server.js
// ZEDSON WATCHCRAFT - Node.js Backend for MongoDB Integration
// Developed by PULSEWARE❤️

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/database');
const apiRoutes = require('./routes/api');
const specialRoutes = require('./routes/special');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:8080',
        'http://localhost:5500',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ZEDSON WATCHCRAFT Backend is running',
        developer: 'PULSEWARE❤️',
        timestamp: new Date().toISOString(),
        database: 'MongoDB',
        version: '2.0.0'
    });
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api', specialRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        message: 'ZEDSON WATCHCRAFT API - Developed by PULSEWARE❤️'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong on our end'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ZEDSON WATCHCRAFT Backend running on port ${PORT}`);
    console.log(`💝 Developed by PULSEWARE with ❤️`);
    console.log(`📊 MongoDB Integration Active`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    const { disconnectDB } = require('./config/database');
    await disconnectDB();
    console.log('👋 Goodbye from PULSEWARE❤️');
    process.exit(0);
});

module.exports = app;