// ZEDSON WATCHCRAFT - Services Routes (Complete)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Service = require('../models/service');
const Customer = require('../models/customer');
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

    // Add notes if provided
    if (notes.length > 0) {
      notes.forEach(note => {
        service.addNote(note, req.user._id);
      });
    }

    await service.save();

    // Update customer service count
    await customer.incrementServices();

    // Populate for response
    await service.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: service
    });

  } catch (error) {
    console.error('Create service error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({
        success: false,
        message: message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating service request'
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Update service details
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const {
      customerId,
      watchDetails,
      issue,
      priority,
      category,
      estimatedCost,
      estimatedDelivery,
      advancePaid
    } = req.body;

    // Find service
    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // If customer is being changed
    if (customerId && customerId !== service.customerId.toString()) {
      const newCustomer = await Customer.findById(customerId);
      if (!newCustomer) {
        return res.status(404).json({
          success: false,
          message: 'New customer not found'
        });
      }

      // Update customer counts
      const oldCustomer = await Customer.findById(service.customerId);
      if (oldCustomer) {
        await oldCustomer.decrementServices();
      }

      await newCustomer.incrementServices();

      service.customerId = customerId;
      service.customerName = newCustomer.name;
    }

    // Update other fields
    if (watchDetails) {
      service.watchDetails = watchDetails;
      service.watchName = `${watchDetails.brand} ${watchDetails.model}`;
    }
    if (issue) service.issue = issue;
    if (priority) service.priority = priority;
    if (category) service.category = category;
    if (estimatedCost !== undefined) service.estimatedCost = estimatedCost;
    if (estimatedDelivery) service.estimatedDelivery = new Date(estimatedDelivery);
    if (advancePaid !== undefined) service.advancePaid = advancePaid;

    service.updatedBy = req.user._id;

    await service.save();

    // Populate for response
    await service.populate([
      { path: 'customerId', select: 'name email phone' },
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

// @route   DELETE /api/services/:id
// @desc    Soft delete service
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { reason = 'Service deleted via API' } = req.body;

    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update customer service count
    const customer = await Customer.findById(service.customerId);
    if (customer) {
      await customer.decrementServices();
    }

    // Soft delete service
    await service.softDelete(req.user._id, reason);

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

// @route   PATCH /api/services/:id/status
// @desc    Update service status with history tracking
// @access  Private
router.patch('/:id/status', auth, checkPermission('service'), async (req, res) => {
  try {
    const { status, reason = '', notes = '' } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a status'
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await service.updateStatus(status, req.user._id, reason, notes);

    res.status(200).json({
      success: true,
      message: 'Service status updated successfully',
      data: {
        id: service._id,
        serviceNumber: service.serviceNumber,
        status: service.status,
        updatedAt: service.updatedAt
      }
    });

  } catch (error) {
    console.error('Update service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service status'
    });
  }
});

// @route   POST /api/services/:id/complete
// @desc    Complete service with image upload, final cost, and warranty
// @access  Private
router.post('/:id/complete', auth, checkPermission('service'), upload.single('completionImage'), async (req, res) => {
  try {
    const {
      workPerformed,
      actualCost,
      warrantyPeriod = 0,
      partsReplaced,
      qualityNotes,
      completionNotes
    } = req.body;

    if (!workPerformed || !actualCost) {
      return res.status(400).json({
        success: false,
        message: 'Please provide work description and actual cost'
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (service.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Service is already completed'
      });
    }

    // Parse parts replaced if provided as JSON string
    let parsedPartsReplaced = [];
    if (partsReplaced) {
      try {
        parsedPartsReplaced = JSON.parse(partsReplaced);
      } catch (error) {
        parsedPartsReplaced = [];
      }
    }

    const completionData = {
      workPerformed,
      actualCost: parseFloat(actualCost),
      warrantyPeriod: parseInt(warrantyPeriod),
      partsReplaced: parsedPartsReplaced,
      qualityNotes: qualityNotes || '',
      completionImage: req.file ? req.file.path : null,
      completionNotes: completionNotes || ''
    };

    await service.completeService(completionData, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Service completed successfully',
      data: {
        id: service._id,
        serviceNumber: service.serviceNumber,
        status: service.status,
        actualCost: service.actualCost,
        completedAt: service.completedAt,
        warrantyPeriod: service.completionDetails?.warrantyPeriod
      }
    });

  } catch (error) {
    console.error('Complete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing service'
    });
  }
});

// @route   POST /api/services/:id/notes
// @desc    Add note to service
// @access  Private
router.post('/:id/notes', auth, checkPermission('service'), async (req, res) => {
  try {
    const { note, isInternal = false } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a note'
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await service.addNote(note.trim(), req.user._id, isInternal);
    await service.populate('notes.addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: service
    });

  } catch (error) {
    console.error('Add service note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @route   POST /api/services/:id/rating
// @desc    Add customer rating and feedback
// @access  Private
router.post('/:id/rating', auth, checkPermission('service'), async (req, res) => {
  try {
    const { rating, feedback = '' } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating between 1 and 5'
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (service.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot rate incomplete service'
      });
    }

    await service.setRating(rating, feedback);

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        id: service._id,
        serviceNumber: service.serviceNumber,
        rating: service.rating,
        feedback: service.feedback
      }
    });

  } catch (error) {
    console.error('Add service rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding rating'
    });
  }
});

// @route   POST /api/services/:id/acknowledgement
// @desc    Generate service acknowledgement
// @access  Private
router.post('/:id/acknowledgement', auth, checkPermission('service'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('customerId', 'name email phone address');

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (service.acknowledgementGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Acknowledgement already generated for this service'
      });
    }

    // Here you would integrate with Invoice model to generate acknowledgement
    // For now, just mark as generated
    service.acknowledgementGenerated = true;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service acknowledgement generated successfully',
      data: {
        id: service._id,
        serviceNumber: service.serviceNumber,
        acknowledgementGenerated: service.acknowledgementGenerated
      }
    });

  } catch (error) {
    console.error('Generate acknowledgement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating acknowledgement'
    });
  }
});

// @route   POST /api/services/:id/completion-invoice
// @desc    Generate service completion invoice
// @access  Private
router.post('/:id/completion-invoice', auth, checkPermission('service'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('customerId', 'name email phone address');

    if (!service || service.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (service.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate invoice for incomplete service'
      });
    }

    if (service.completionInvoiceGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Completion invoice already generated for this service'
      });
    }

    // Here you would integrate with Invoice model to generate completion invoice
    // For now, just mark as generated
    service.completionInvoiceGenerated = true;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service completion invoice generated successfully',
      data: {
        id: service._id,
        serviceNumber: service.serviceNumber,
        completionInvoiceGenerated: service.completionInvoiceGenerated
      }
    });

  } catch (error) {
    console.error('Generate completion invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating completion invoice'
    });
  }
});

module.exports = router;