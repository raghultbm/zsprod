// ZEDSON WATCHCRAFT - Main Server File (Updated with New Routes)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Database connection
const connectDB = require('./config/database');

// Route imports - Existing
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');

// Route imports - New Phase 2 Routes
const watchRoutes = require('./routes/watches');
const saleRoutes = require('./routes/sales');
const serviceRoutes = require('./routes/services');
const expenseRoutes = require('./routes/expenses');
const invoiceRoutes = require('./routes/invoices');

// Initialize Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Log to file in production
  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API-specific rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 API requests per windowMs
  message: {
    success: false,
    message: 'Too many API requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiting (more restrictive)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 upload requests per windowMs
  message: {
    success: false,
    message: 'Too many file upload requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export rate limiting (very restrictive)
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 export requests per hour
  message: {
    success: false,
    message: 'Too many export requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limiting
app.use(globalLimiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON payload'
      });
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Serve static files for uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for different upload types
const uploadSubdirs = ['receipts', 'service-completion', 'invoices', 'temp'];
uploadSubdirs.forEach(subdir => {
  const subdirPath = path.join(uploadsDir, subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
  }
});

app.use('/uploads', express.static(uploadsDir));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Module-specific health checks
app.get('/health/auth', (req, res) => {
  res.status(200).json({
    success: true,
    module: 'auth',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/inventory', (req, res) => {
  res.status(200).json({
    success: true,
    module: 'inventory',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/sales', (req, res) => {
  res.status(200).json({
    success: true,
    module: 'sales',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/services', (req, res) => {
  res.status(200).json({
    success: true,
    module: 'services',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/expenses', (req, res) => {
  res.status(200).json({
    success: true,
    module: 'expenses',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/invoices', (req, res) => {
  res.status(200).json({
    success: true,
    module: 'invoices',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// API Routes - Apply API rate limiting to all API routes
app.use('/api', apiLimiter);

// Existing routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// New Phase 2 routes
app.use('/api/watches', watchRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/services', serviceRoutes);

// Apply upload limiting to routes with file uploads
app.use('/api/expenses', uploadLimiter, expenseRoutes);
app.use('/api/invoices', invoiceRoutes);

// Apply export limiting to export endpoints
app.use('/api/*/export', exportLimiter);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ZEDSON WATCHCRAFT API v1.0',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      customers: '/api/customers',
      inventory: '/api/watches',
      sales: '/api/sales',
      services: '/api/services',
      expenses: '/api/expenses',
      invoices: '/api/invoices'
    },
    documentation: {
      health: '/health',
      moduleHealth: [
        '/health/auth',
        '/health/inventory',
        '/health/sales',
        '/health/services',
        '/health/expenses',
        '/health/invoices'
      ]
    }
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.originalUrl}`,
    availableEndpoints: [
      '/api/auth',
      '/api/customers',
      '/api/watches',
      '/api/sales',
      '/api/services',
      '/api/expenses',
      '/api/invoices'
    ]
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    
    // Handle client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    app.get('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Frontend not found. Please build the frontend application.'
      });
    });
  }
}

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size allowed is 10MB.'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field. Please check your file upload configuration.'
    });
  }

  // CORS errors
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation. Origin not allowed.'
    });
  }

  // JWT errors
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token or authorization header.'
    });
  }

  // MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    return res.status(500).json({
      success: false,
      message: 'Database error occurred.',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      error: error 
    })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err.message);
  if (process.env.NODE_ENV === 'production') {
    // Close server & exit process
    server.close(() => {
      process.exit(1);
    });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize default admin user
    const User = require('./models/User');
    await User.createDefaultAdmin();
    
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log('🚀 =====================================');
      console.log('🎯 ZEDSON WATCHCRAFT SERVER STARTED');
      console.log('🚀 =====================================');
      console.log(`📍 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log('📋 Available endpoints:');
      console.log('   🔐 Auth: /api/auth');
      console.log('   👥 Customers: /api/customers');
      console.log('   ⌚ Inventory: /api/watches');
      console.log('   💰 Sales: /api/sales');
      console.log('   🔧 Services: /api/services');
      console.log('   💸 Expenses: /api/expenses');
      console.log('   📄 Invoices: /api/invoices');
      console.log('📊 Health checks:');
      console.log('   🏥 General: /health');
      console.log('   🏥 Modules: /health/{module}');
      console.log('📚 API Documentation: /api');
      console.log('🚀 =====================================');
      
      // Set server for graceful shutdown
      global.server = server;
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ ${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;