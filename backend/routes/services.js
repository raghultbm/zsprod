// ================================
// SERVICE ROUTES - backend/routes/services.js
// ================================
const express = require('express');
const Service = require('../models/inventory'); // Service model is in inventory.js file
const Customer = require('../models/Customer');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all services
// @access  Private
router.get('/', auth, checkPermission('service'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, fromDate, toDate } = req.query;

    let query = {};
    
    if (status) {
      query.status = status;
    }

    // Date range filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Search functionality
    if (search) {
      const customers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const customerIds = customers.map(c => c._id);
      
      query.$or = [
        { customerId: { $in: customerIds } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { issue: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const services = await Service.find(query)
      .populate('customerId', 'name phone email')
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      count: services.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: services
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services'
    });
  }
});

// @route   GET /api/services/stats
// @desc    Get service statistics
// @access  Private
router.get('/stats', auth, checkPermission('service'), async (req, res) => {
  try {
    const stats = await Service.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service statistics'
    });
  }
});

// @route   GET /api/services/:id
// @desc    Get single service
// @access  Private
router.get('/:id', auth, checkPermission('service'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('customerId', 'name phone email address')
      .populate('createdBy', 'username fullName')
      .populate('statusHistory.changedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service'
    });
  }
});

// @route   POST /api/services
// @desc    Create new service
// @access  Private
router.post('/', auth, checkPermission('service'), async (req, res) => {
  try {
    const { 
      customerId, brand, model, dialColor, movementNo, 
      gender, caseType, strapType, issue, cost, estimatedDelivery 
    } = req.body;

    // Validation
    if (!customerId || !brand || !model || !dialColor || !movementNo || 
        !gender || !caseType || !strapType || !issue || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Create service
    const service = new Service({
      customerId,
      brand: brand.trim(),
      model: model.trim(),
      dialColor: dialColor.trim(),
      movementNo: movementNo.trim(),
      gender,
      caseType,
      strapType,
      issue: issue.trim(),
      cost: parseFloat(cost),
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      createdBy: req.user._id
    });

    await service.save();

    // Update customer service count
    await customer.incrementServices();

    await service.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating service'
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Update service
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update fields
    const updateFields = [
      'brand', 'model', 'dialColor', 'movementNo', 
      'gender', 'caseType', 'strapType', 'issue', 'cost', 'estimatedDelivery'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'cost') {
          service[field] = parseFloat(req.body[field]);
        } else if (field === 'estimatedDelivery') {
          service[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          service[field] = req.body[field];
        }
      }
    });

    await service.save();
    await service.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service'
    });
  }
});

// @route   PATCH /api/services/:id/status
// @desc    Update service status
// @access  Private
router.patch('/:id/status', auth, checkPermission('service'), async (req, res) => {
  try {
    const { status, completionData } = req.body;

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update status with completion data if provided
    if (status === 'completed' && completionData) {
      service.status = status;
      service.actualDelivery = new Date();
      service.completionDescription = completionData.description;
      service.warrantyPeriod = completionData.warrantyPeriod || 0;
      service.completionImage = completionData.image;
      
      if (completionData.finalCost !== undefined) {
        service.cost = parseFloat(completionData.finalCost);
      }
    } else {
      service.status = status;
    }

    // Update status using the model method
    await service.updateStatus(status, req.user._id);

    await service.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Service status updated successfully',
      data: service
    });

  } catch (error) {
    console.error('Update service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service status'
    });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete service
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('customerId');
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update customer service count
    if (service.customerId) {
      await service.customerId.decrementServices();
    }

    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting service'
    });
  }
});

module.exports = router;

// ================================
// UPDATED SERVER.JS - Complete with all routes
// ================================

// ZEDSON WATCHCRAFT - Updated Backend API Server with All Routes
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const serviceRoutes = require('./routes/services');
const expenseRoutes = require('./routes/expenses');
const invoiceRoutes = require('./routes/invoices');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ZEDSON WATCHCRAFT API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    modules: {
      auth: 'Active',
      customers: 'Active',
      inventory: 'Active',
      sales: 'Active',
      services: 'Active',
      expenses: 'Active',
      invoices: 'Active'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 ZEDSON WATCHCRAFT API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
  console.log('📋 Available endpoints:');
  console.log('   - /api/auth (Authentication & User Management)');
  console.log('   - /api/customers (Customer Management)');
  console.log('   - /api/inventory (Inventory Management)');
  console.log('   - /api/sales (Sales Management)');
  console.log('   - /api/services (Service Management)');
  console.log('   - /api/expenses (Expense Management)');
  console.log('   - /api/invoices (Invoice Management)');
});