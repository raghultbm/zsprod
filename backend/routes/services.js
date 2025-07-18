// ZEDSON WATCHCRAFT - Services Routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/service-completion');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `service-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @route   GET /api/services
// @desc    Get all services with pagination, search, and filters
// @access  Private
router.get('/', auth, checkPermission('service'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      customerId,
      status,
      priority,
      category,
      dateFrom,
      dateTo,
      overdue,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isDeleted: false };

    // Add search functionality
    if (search) {
      query.$or = [
        { serviceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { 'watchDetails.brand': { $regex: search, $options: 'i' } },
        { 'watchDetails.model': { $regex: search, $options: 'i' } },
        { issue: { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    // Date range filter
    if (dateFrom || dateTo) {
      query.serviceDate = {};
      if (dateFrom) query.serviceDate.$gte = new Date(dateFrom);
      if (dateTo) query.serviceDate.$lte = new Date(dateTo);
    }

    // Overdue filter
    if (overdue === 'true') {
      query.estimatedDelivery = { $lt: new Date() };
      query.status = { $in: ['pending', 'in-progress', 'on-hold'] };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get services with pagination
    const services = await Service.find(query)
      .populate('customerId', 'name email phone address')
      .populate('createdBy', 'username fullName')
      .populate('statusHistory.changedBy', 'username fullName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
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
    const { dateFrom, dateTo } = req.query;
    
    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.serviceDate = {};
      if (dateFrom) dateFilter.serviceDate.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.serviceDate.$lte = new Date(dateTo);
    }

    const stats = await Service.getServiceStats(dateFilter);

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

// @route   GET /api/services/overdue
// @desc    Get overdue services
// @access  Private
router.get('/overdue', auth, checkPermission('service'), async (req, res) => {
  try {
    const overdueServices = await Service.getOverdueServices();

    res.status(200).json({
      success: true,
      count: overdueServices.length,
      data: overdueServices
    });

  } catch (error) {
    console.error('Get overdue services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overdue services'
    });
  }
});

// @route   GET /api/services/status/:status
// @desc    Get services by status
// @access  Private
router.get('/status/:status', auth, checkPermission('service'), async (req, res) => {
  try {
    const { status } = req.params;
    const services = await Service.getServicesByStatus(status);

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });

  } catch (error) {
    console.error('Get services by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services by status'
    });
  }
});

// @route   GET /api/services/customer/:customerId
// @desc    Get services by customer
// @access  Private
router.get('/customer/:customerId', auth, checkPermission('service'), async (req, res) => {
  try {
    const { customerId } = req.params;
    const services = await Service.getServicesByCustomer(customerId);

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });

  } catch (error) {
    console.error('Get services by customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer services'
    });
  }
});

// @route   GET /api/services/export
// @desc    Export services data (CSV format)
// @access  Private
router.get('/export', auth, checkPermission('service'), async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    
    // Build filter object
    const exportFilters = {};
    if (filters.customerId) exportFilters.customerId = filters.customerId;
    if (filters.status) exportFilters.status = filters.status;
    if (filters.priority) exportFilters.priority = filters.priority;
    if (filters.category) exportFilters.category = filters.category;
    if (filters.dateFrom || filters.dateTo) {
      exportFilters.serviceDate = {};
      if (filters.dateFrom) exportFilters.serviceDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) exportFilters.serviceDate.$lte = new Date(filters.dateTo);
    }

    const exportData = await Service.getExportData(exportFilters);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'Service Number', 'Service Date', 'Customer Name', 'Customer Phone', 'Customer Email',
        'Watch Brand', 'Watch Model', 'Watch Name', 'Dial Color', 'Movement No', 'Gender',
        'Case Type', 'Strap Type', 'Issue', 'Priority', 'Category', 'Estimated Cost',
        'Actual Cost', 'Advance Paid', 'Balance Amount', 'Status', 'Started At',
        'Completed At', 'Estimated Delivery', 'Actual Delivery', 'Service Duration',
        'Work Performed', 'Warranty Period', 'Rating', 'Feedback', 'Acknowledgement Generated',
        'Completion Invoice Generated', 'Created By', 'Created Date', 'Notes'
      ].join(',');

      const csvRows = exportData.map(service => [
        service.id,
        service.serviceNumber,
        new Date(service.serviceDate).toLocaleDateString(),
        `"${service.customerName}"`,
        service.customerPhone,
        service.customerEmail,
        `"${service.watchBrand}"`,
        `"${service.watchModel}"`,
        `"${service.watchName}"`,
        `"${service.dialColor}"`,
        `"${service.movementNo}"`,
        service.gender,
        service.caseType,
        service.strapType,
        `"${service.issue}"`,
        service.priority,
        service.category,
        service.estimatedCost,
        service.actualCost,
        service.advancePaid,
        service.balanceAmount,
        service.status,
        service.startedAt ? new Date(service.startedAt).toLocaleDateString() : '',
        service.completedAt ? new Date(service.completedAt).toLocaleDateString() : '',
        service.estimatedDelivery ? new Date(service.estimatedDelivery).toLocaleDateString() : '',
        service.actualDelivery ? new Date(service.actualDelivery).toLocaleDateString() : '',
        service.serviceDuration || '',
        `"${service.workPerformed}"`,
        service.warrantyPeriod,
        service.rating || '',
        `"${service.feedback}"`,
        service.acknowledgementGenerated ? 'Yes' : 'No',
        service.completionInvoiceGenerated ? 'Yes' : 'No',
        `"${service.createdBy}"`,
        new Date(service.createdAt).toLocaleDateString(),
        `"${service.notes}"`
      ].join(','));

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=services_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      // JSON format
      res.status(200).json({
        success: true,
        count: exportData.length,
        data: exportData,
        exportedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Export services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting services data'
    });
  }
});

// @route   GET /api/services/:id
// @desc    Get single service
// @access  Private
router.get('/:id', auth, checkPermission('service'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('customerId', 'name email phone address')
      .populate('createdBy', 'username fullName')
      .populate('statusHistory.changedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName');

    if (!service || service.isDeleted) {
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
// @desc    Create new service request
// @access  Private
router.post('/', auth, checkPermission('service'), async (req, res) => {
  try {
    const {
      customerId,
      watchDetails,
      issue,
      priority = 'normal',
      category = 'repair',
      estimatedCost,
      estimatedDelivery,
      advancePaid = 0,
      notes = []
    } = req.body;

    // Validation
    if (!customerId || !watchDetails || !issue || !estimatedCost) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer, watch details, issue, and estimated cost'
      });
    }

    // Verify customer exists
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
      customerName: customer.name,
      watchDetails,
      watchName: `${watchDetails.brand} ${watchDetails.model}`,
      issue,
      priority,
      category,
      estimatedCost,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      advancePaid,
      balanceAmount: Math.max(0, estimatedCost - advancePaid),
      createdBy: req.user._id
    });