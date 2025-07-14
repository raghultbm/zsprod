// ZEDSON WATCHCRAFT - Service Routes
const express = require('express');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/service
// @desc    Get all service requests
// @access  Private
router.get('/', auth, checkPermission('service'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, customer, status, fromDate, toDate } = req.query;

    // Build query
    let query = {};

    // Add search functionality
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { watchName: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { issue: { $regex: search, $options: 'i' } },
        { movementNo: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by customer
    if (customer) {
      query.customerId = customer;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.serviceDate = { $gte: from, $lte: to };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get services with pagination
    const services = await Service.find(query)
      .populate('customerId', 'name phone email')
      .populate('addedBy', 'username fullName')
      .sort({ serviceDate: -1 })
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

// @route   GET /api/service/stats
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

// @route   GET /api/service/incomplete
// @desc    Get incomplete services
// @access  Private
router.get('/incomplete', auth, checkPermission('service'), async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const incompleteServices = await Service.getIncompleteServices(parseInt(limit));

    res.status(200).json({
      success: true,
      count: incompleteServices.length,
      data: incompleteServices
    });

  } catch (error) {
    console.error('Get incomplete services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching incomplete services'
    });
  }
});

// @route   GET /api/service/status/:status
// @desc    Get services by status
// @access  Private
router.get('/status/:status', auth, checkPermission('service'), async (req, res) => {
  try {
    const services = await Service.getServicesByStatus(req.params.status);

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

// @route   GET /api/service/:id
// @desc    Get single service request
// @access  Private
router.get('/:id', auth, checkPermission('service'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('customerId', 'name phone email address')
      .populate('addedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
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

// @route   POST /api/service
// @desc    Create new service request
// @access  Private
router.post('/', auth, checkPermission('service'), async (req, res) => {
  try {
    const {
      customerId,
      brand,
      model,
      dialColor,
      movementNo,
      gender,
      caseType,
      strapType,
      issue,
      cost
    } = req.body;

    // Validation
    if (!customerId || !brand || !model || !dialColor || !movementNo || 
        !gender || !caseType || !strapType || !issue || cost < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
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

    // Create service request
    const service = new Service({
      customerId,
      customerName: customer.name,
      watchName: `${brand} ${model}`,
      brand,
      model,
      dialColor,
      movementNo,
      gender,
      caseType,
      strapType,
      issue,
      cost,
      addedBy: req.user._id,
      serviceDate: new Date()
    });

    await service.save();

    // Update customer service count
    await customer.incrementServices();

    // Populate service for response
    await service.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'addedBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: service
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating service request'
    });
  }
});

// @route   PUT /api/service/:id
// @desc    Update service request
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const {
      customerId,
      brand,
      model,
      dialColor,
      movementNo,
      gender,
      caseType,
      strapType,
      issue,
      cost
    } = req.body;

    // Find service
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Validation
    if (!customerId || !brand || !model || !dialColor || !movementNo || 
        !gender || !caseType || !strapType || !issue || cost < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields correctly'
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

    // Update customer service count if customer changed
    if (service.customerId.toString() !== customerId) {
      const previousCustomer = await Customer.findById(service.customerId);
      if (previousCustomer) {
        await previousCustomer.decrementServices();
      }
      await customer.incrementServices();
    }

    // Update service
    service.customerId = customerId;
    service.customerName = customer.name;
    service.brand = brand;
    service.model = model;
    service.watchName = `${brand} ${model}`;
    service.dialColor = dialColor;
    service.movementNo = movementNo;
    service.gender = gender;
    service.caseType = caseType;
    service.strapType = strapType;
    service.issue = issue;
    service.cost = cost;

    await service.save();

    // Populate service for response
    await service.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'addedBy', select: 'username fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Service request updated successfully',
      data: service
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service request'
    });
  }
});

// @route   PATCH /api/service/:id/status
// @desc    Update service status
// @access  Private
router.patch('/:id/status', auth, checkPermission('service'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'in-progress', 'on-hold', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Complete the service
    await service.completeService({
      description,
      finalCost,
      warrantyPeriod,
      image,
      actualDelivery: actualDelivery ? new Date(actualDelivery) : new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Service completed successfully',
      data: service
    });

  } catch (error) {
    console.error('Complete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing service'
    });
  }
});

// @route   DELETE /api/service/:id
// @desc    Delete service request
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Decrease customer service count
    const customer = await Customer.findById(service.customerId);
    if (customer) {
      await customer.decrementServices();
    }

    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service request deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting service request'
    });
  }
});

// @route   POST /api/service/:id/notes
// @desc    Add note to service request
// @access  Private
router.post('/:id/notes', auth, checkPermission('service'), async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a note'
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    await service.addNote(note.trim(), req.user._id);
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

// @route   GET /api/service/customer/:customerId
// @desc    Get services by customer
// @access  Private
router.get('/customer/:customerId', auth, checkPermission('service'), async (req, res) => {
  try {
    const services = await Service.getServicesByCustomer(req.params.customerId);

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

module.exports = router;service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    await service.updateStatus(status, req.user._id);

    res.status(200).json({
      success: true,
      message: `Service status updated to ${status}`,
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

// @route   PATCH /api/service/:id/complete
// @desc    Complete service request
// @access  Private
router.patch('/:id/complete', auth, checkPermission('service'), async (req, res) => {
  try {
    const {
      description,
      finalCost,
      warrantyPeriod = 0,
      image = null,
      actualDelivery = null
    } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide work description'
      });
    }

    if (finalCost < 0) {
      return res.status(400).json({
        success: false,
        message: 'Final cost cannot be negative'
      });
    }

    if (warrantyPeriod < 0 || warrantyPeriod > 60) {
      return res.status(400).json({
        success: false,
        message: 'Warranty period must be between 0 and 60 months'
      });
    }

    const service = await Service.findById(req.params.id);

    if (!