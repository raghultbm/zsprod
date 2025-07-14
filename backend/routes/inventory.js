// ZEDSON WATCHCRAFT - Inventory Routes
const express = require('express');
const Inventory = require('../models/Inventory');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private
router.get('/', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, outlet, type, status = 'available' } = req.query;

    // Build query
    let query = {};

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
    if (status !== 'all') query.status = status;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get items with pagination
    const items = await Inventory.find(query)
      .populate('addedBy', 'username fullName')
      .populate('movementHistory.movedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Inventory.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: items
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory'
    });
  }
});

// @route   GET /api/inventory/stats
// @desc    Get inventory statistics
// @access  Private
router.get('/stats', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const stats = await Inventory.getStats();

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

// @route   GET /api/inventory/available
// @desc    Get available items for sales
// @access  Private
router.get('/available', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { outlet } = req.query;
    const items = await Inventory.getAvailableItems(outlet);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });

  } catch (error) {
    console.error('Get available items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available items'
    });
  }
});

// @route   GET /api/inventory/low-stock
// @desc    Get low stock alerts
// @access  Private
router.get('/low-stock', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const items = await Inventory.getLowStockAlerts();

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });

  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock alerts'
    });
  }
});

// @route   GET /api/inventory/search
// @desc    Search inventory items
// @access  Private
router.get('/search', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { q: searchTerm, outlet, type, status } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const filters = {};
    if (outlet) filters.outlet = outlet;
    if (type) filters.type = type;
    if (status) filters.status = status;

    const items = await Inventory.searchItems(searchTerm, filters);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });

  } catch (error) {
    console.error('Search inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching inventory'
    });
  }
});

// @route   GET /api/inventory/:id
// @desc    Get single inventory item
// @access  Private
router.get('/:id', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('addedBy', 'username fullName')
      .populate('movementHistory.movedBy', 'username fullName');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory item'
    });
  }
});

// @route   POST /api/inventory
// @desc    Create new inventory item
// @access  Private
router.post('/', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { code, type, brand, model, size, price, quantity, outlet, description } = req.body;

    // Validation
    if (!code || !type || !brand || !model || !price || !quantity || !outlet) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if code already exists
    const existingItem = await Inventory.findOne({ code: code.trim().toUpperCase() });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Item with this code already exists'
      });
    }

    // Create inventory item
    const item = new Inventory({
      code: code.trim().toUpperCase(),
      type,
      brand: brand.trim(),
      model: model.trim(),
      size: size ? size.trim() : '-',
      price,
      quantity,
      outlet,
      description: description ? description.trim() : '',
      addedBy: req.user._id
    });

    // Add initial movement history
    item.movementHistory.push({
      date: new Date(),
      fromOutlet: null,
      toOutlet: outlet,
      reason: 'Initial stock',
      movedBy: req.user._id
    });

    await item.save();

    // Populate addedBy field for response
    await item.populate('addedBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: item
    });

  } catch (error) {
    console.error('Create inventory item error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Item with this code already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating inventory item'
    });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update inventory item
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { code, type, brand, model, size, price, quantity, outlet, description } = req.body;

    // Find item
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if code is already taken by another item
    if (code && code.trim().toUpperCase() !== item.code) {
      const existingItem = await Inventory.findOne({
        code: code.trim().toUpperCase(),
        _id: { $ne: item._id }
      });
      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'Another item with this code already exists'
        });
      }
    }

    const originalOutlet = item.outlet;

    // Update item fields
    if (code) item.code = code.trim().toUpperCase();
    if (type) item.type = type;
    if (brand) item.brand = brand.trim();
    if (model) item.model = model.trim();
    if (size !== undefined) item.size = size ? size.trim() : '-';
    if (price !== undefined) item.price = price;
    if (quantity !== undefined) item.quantity = quantity;
    if (description !== undefined) item.description = description.trim();

    // Handle outlet change
    if (outlet && outlet !== originalOutlet) {
      await item.moveToOutlet(outlet, 'Stock Transfer', req.user._id);
    } else if (outlet) {
      item.outlet = outlet;
    }

    await item.save();

    // Populate fields for response
    await item.populate('addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });

  } catch (error) {
    console.error('Update inventory item error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating inventory item'
    });
  }
});

// @route   DELETE /api/inventory/:id
// @desc    Delete inventory item
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if item has sales history (optional business logic)
    if (item.totalSold > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete item with sales history. Consider marking as inactive instead.'
      });
    }

    await Inventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting inventory item'
    });
  }
});

// @route   PATCH /api/inventory/:id/decrease-quantity
// @desc    Decrease item quantity (for sales)
// @access  Private (Internal use by sales module)
router.patch('/:id/decrease-quantity', auth, async (req, res) => {
  try {
    const { amount = 1 } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.decreaseQuantity(amount, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Quantity decreased successfully',
      data: item
    });

  } catch (error) {
    console.error('Decrease quantity error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Server error while decreasing quantity'
    });
  }
});

// @route   PATCH /api/inventory/:id/increase-quantity
// @desc    Increase item quantity (for returns/restocking)
// @access  Private (Internal use)
router.patch('/:id/increase-quantity', auth, async (req, res) => {
  try {
    const { amount = 1 } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.increaseQuantity(amount);

    res.status(200).json({
      success: true,
      message: 'Quantity increased successfully',
      data: item
    });

  } catch (error) {
    console.error('Increase quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while increasing quantity'
    });
  }
});

// @route   PATCH /api/inventory/:id/move-outlet
// @desc    Move item to different outlet
// @access  Private (Non-staff only)
router.patch('/:id/move-outlet', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { outlet, reason = 'Stock Transfer' } = req.body;

    if (!outlet) {
      return res.status(400).json({
        success: false,
        message: 'Target outlet is required'
      });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.moveToOutlet(outlet, reason, req.user._id);

    res.status(200).json({
      success: true,
      message: `Item moved to ${outlet} successfully`,
      data: item
    });

  } catch (error) {
    console.error('Move outlet error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Server error while moving item'
    });
  }
});

// @route   GET /api/inventory/:id/movement-history
// @desc    Get movement history for an item
// @access  Private
router.get('/:id/movement-history', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('movementHistory.movedBy', 'username fullName')
      .select('movementHistory code brand model');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        itemInfo: {
          code: item.code,
          name: `${item.brand} ${item.model}`
        },
        movementHistory: item.movementHistory.sort((a, b) => new Date(b.date) - new Date(a.date))
      }
    });

  } catch (error) {
    console.error('Get movement history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching movement history'
    });
  }
});

module.exports = router;