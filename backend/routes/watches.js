// ZEDSON WATCHCRAFT - Watches/Inventory Routes
const express = require('express');
const Watch = require('../models/Watch');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/watches
// @desc    Get all watches with pagination, search, and filters
// @access  Private
router.get('/', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      outlet, 
      type, 
      status, 
      brand,
      lowStock,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isDeleted: false };

    // Add search functionality
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (outlet) query.outlet = outlet;
    if (type) query.type = type;
    if (status) query.status = status;
    if (brand) query.brand = { $regex: brand, $options: 'i' };
    if (lowStock === 'true') {
      query.quantity = { $lte: 2, $gt: 0 };
      query.status = 'available';
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get watches with pagination
    const watches = await Watch.find(query)
      .populate('addedBy', 'username fullName')
      .populate('movementHistory.movedBy', 'username fullName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Watch.countDocuments(query);

    res.status(200).json({
      success: true,
      count: watches.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: watches
    });

  } catch (error) {
    console.error('Get watches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watches'
    });
  }
});

// @route   GET /api/watches/stats
// @desc    Get inventory statistics
// @access  Private
router.get('/stats', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const stats = await Watch.getInventoryStats();

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory statistics'
    });
  }
});

// @route   GET /api/watches/available
// @desc    Get available watches for sale
// @access  Private
router.get('/available', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const watches = await Watch.getAvailableForSale();

    res.status(200).json({
      success: true,
      count: watches.length,
      data: watches
    });

  } catch (error) {
    console.error('Get available watches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available watches'
    });
  }
});

// @route   GET /api/watches/low-stock
// @desc    Get low stock alerts
// @access  Private
router.get('/low-stock', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { threshold = 2 } = req.query;
    const watches = await Watch.getLowStock(parseInt(threshold));

    res.status(200).json({
      success: true,
      count: watches.length,
      data: watches
    });

  } catch (error) {
    console.error('Get low stock watches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock watches'
    });
  }
});

// @route   GET /api/watches/outlet/:outlet
// @desc    Get watches by outlet
// @access  Private
router.get('/outlet/:outlet', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { outlet } = req.params;
    const watches = await Watch.getByOutlet(outlet);

    res.status(200).json({
      success: true,
      count: watches.length,
      data: watches
    });

  } catch (error) {
    console.error('Get watches by outlet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watches by outlet'
    });
  }
});

// @route   GET /api/watches/code/:code
// @desc    Get watch by code
// @access  Private
router.get('/code/:code', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { code } = req.params;
    const watch = await Watch.getByCode(code);

    if (!watch) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found with this code'
      });
    }

    res.status(200).json({
      success: true,
      data: watch
    });

  } catch (error) {
    console.error('Get watch by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watch by code'
    });
  }
});

// @route   GET /api/watches/export
// @desc    Export watches data (CSV format)
// @access  Private
router.get('/export', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    
    // Build filter object
    const exportFilters = {};
    if (filters.outlet) exportFilters.outlet = filters.outlet;
    if (filters.type) exportFilters.type = filters.type;
    if (filters.status) exportFilters.status = filters.status;
    if (filters.brand) exportFilters.brand = { $regex: filters.brand, $options: 'i' };

    const exportData = await Watch.getExportData(exportFilters);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'Code', 'Type', 'Brand', 'Model', 'Size', 'Price', 'Quantity', 
        'Total Value', 'Outlet', 'Status', 'Description', 'Added By', 
        'Created Date', 'Updated Date', 'Movement Count', 'Last Movement'
      ].join(',');

      const csvRows = exportData.map(watch => [
        watch.id,
        watch.code,
        watch.type,
        `"${watch.brand}"`,
        `"${watch.model}"`,
        watch.size,
        watch.price,
        watch.quantity,
        watch.totalValue,
        watch.outlet,
        watch.status,
        `"${watch.description || ''}"`,
        `"${watch.addedBy}"`,
        new Date(watch.createdAt).toLocaleDateString(),
        new Date(watch.updatedAt).toLocaleDateString(),
        watch.movementCount,
        watch.lastMovement ? new Date(watch.lastMovement).toLocaleDateString() : ''
      ].join(','));

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=watches_export_${new Date().toISOString().split('T')[0]}.csv`);
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
    console.error('Export watches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting watches data'
    });
  }
});

// @route   GET /api/watches/:id
// @desc    Get single watch
// @access  Private
router.get('/:id', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const watch = await Watch.findById(req.params.id)
      .populate('addedBy', 'username fullName')
      .populate('movementHistory.movedBy', 'username fullName');

    if (!watch || watch.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found'
      });
    }

    res.status(200).json({
      success: true,
      data: watch
    });

  } catch (error) {
    console.error('Get watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watch'
    });
  }
});

// @route   POST /api/watches
// @desc    Create new watch
// @access  Private
router.post('/', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const {
      code,
      type,
      brand,
      model,
      size,
      price,
      quantity,
      outlet,
      description
    } = req.body;

    // Validation
    if (!type || !brand || !model || !price || !quantity || !outlet) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (type, brand, model, price, quantity, outlet)'
      });
    }

    // Check if code already exists (if provided)
    if (code) {
      const existingWatch = await Watch.findOne({ 
        code: code.toUpperCase(), 
        isDeleted: false 
      });

      if (existingWatch) {
        return res.status(400).json({
          success: false,
          message: 'Watch with this code already exists'
        });
      }
    }

    // Create new watch
    const watch = new Watch({
      code: code || undefined, // Let pre-save middleware generate if not provided
      type,
      brand,
      model,
      size: size || (type === 'Strap' ? undefined : '-'),
      price,
      quantity,
      outlet,
      description,
      addedBy: req.user._id
    });

    // Add initial movement record
    watch.addMovementRecord(null, outlet, 'Initial stock', req.user._id);

    await watch.save();

    // Populate for response
    await watch.populate('addedBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Watch added successfully',
      data: watch
    });

  } catch (error) {
    console.error('Create watch error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Watch with this ${field} already exists`
      });
    }

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
      message: 'Server error while creating watch'
    });
  }
});

// @route   PUT /api/watches/:id
// @desc    Update watch
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const {
      code,
      type,
      brand,
      model,
      size,
      price,
      quantity,
      outlet,
      description
    } = req.body;

    // Find watch
    const watch = await Watch.findById(req.params.id);

    if (!watch || watch.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found'
      });
    }

    // Check if code is already taken by another watch
    if (code && code.toUpperCase() !== watch.code) {
      const existingWatch = await Watch.findOne({ 
        code: code.toUpperCase(), 
        _id: { $ne: watch._id },
        isDeleted: false 
      });

      if (existingWatch) {
        return res.status(400).json({
          success: false,
          message: 'Another watch with this code already exists'
        });
      }
    }

    const originalOutlet = watch.outlet;

    // Update watch fields
    if (code) watch.code = code.toUpperCase();
    if (type) watch.type = type;
    if (brand) watch.brand = brand;
    if (model) watch.model = model;
    if (size !== undefined) watch.size = size || (type === 'Strap' ? undefined : '-');
    if (price !== undefined) watch.price = price;
    if (quantity !== undefined) {
      await watch.updateQuantity(quantity, 'Manual update via API', req.user._id);
    }
    if (description !== undefined) watch.description = description;

    // Handle outlet change
    if (outlet && outlet !== originalOutlet) {
      await watch.addMovementRecord(originalOutlet, outlet, 'Outlet transfer via API', req.user._id);
    }

    await watch.save();

    // Populate for response
    await watch.populate('addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Watch updated successfully',
      data: watch
    });

  } catch (error) {
    console.error('Update watch error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Another watch with this ${field} already exists`
      });
    }

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
      message: 'Server error while updating watch'
    });
  }
});

// @route   PATCH /api/watches/:id/quantity
// @desc    Update watch quantity
// @access  Private
router.patch('/:id/quantity', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { quantity, reason = 'Quantity adjustment' } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid quantity (0 or greater)'
      });
    }

    const watch = await Watch.findById(req.params.id);

    if (!watch || watch.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found'
      });
    }

    await watch.updateQuantity(quantity, reason, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Watch quantity updated successfully',
      data: {
        id: watch._id,
        code: watch.code,
        previousQuantity: watch.quantity,
        newQuantity: quantity,
        status: watch.status
      }
    });

  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating quantity'
    });
  }
});

// @route   PATCH /api/watches/:id/transfer
// @desc    Transfer watch to different outlet
// @access  Private (Non-staff only)
router.patch('/:id/transfer', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { toOutlet, reason = 'Stock transfer', notes = '' } = req.body;

    if (!toOutlet) {
      return res.status(400).json({
        success: false,
        message: 'Please provide destination outlet'
      });
    }

    const watch = await Watch.findById(req.params.id);

    if (!watch || watch.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found'
      });
    }

    const fromOutlet = watch.outlet;

    if (fromOutlet === toOutlet) {
      return res.status(400).json({
        success: false,
        message: 'Watch is already in the specified outlet'
      });
    }

    await watch.addMovementRecord(fromOutlet, toOutlet, reason, req.user._id, notes);

    res.status(200).json({
      success: true,
      message: `Watch transferred successfully from ${fromOutlet} to ${toOutlet}`,
      data: {
        id: watch._id,
        code: watch.code,
        fromOutlet,
        toOutlet,
        transferredAt: new Date(),
        transferredBy: req.user.username
      }
    });

  } catch (error) {
    console.error('Transfer watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while transferring watch'
    });
  }
});

// @route   DELETE /api/watches/:id
// @desc    Soft delete watch
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { reason = 'Deleted via API' } = req.body;

    const watch = await Watch.findById(req.params.id);

    if (!watch || watch.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found'
      });
    }

    // Check if watch is used in any sales (optional business logic)
    // This would require importing Sale model and checking references

    await watch.softDelete(req.user._id, reason);

    res.status(200).json({
      success: true,
      message: 'Watch deleted successfully'
    });

  } catch (error) {
    console.error('Delete watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting watch'
    });
  }
});

// @route   PATCH /api/watches/:id/restore
// @desc    Restore soft deleted watch
// @access  Private (Admin only)
router.patch('/:id/restore', auth, authorize('admin'), async (req, res) => {
  try {
    const watch = await Watch.findById(req.params.id);

    if (!watch) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found'
      });
    }

    if (!watch.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Watch is not deleted'
      });
    }

    await watch.restore(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Watch restored successfully',
      data: watch
    });

  } catch (error) {
    console.error('Restore watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while restoring watch'
    });
  }
});

module.exports = router;