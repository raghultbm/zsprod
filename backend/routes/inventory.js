// ================================
// INVENTORY ROUTES - backend/routes/inventory.js
// ================================
const express = require('express');
const Inventory = require('../models/inventory');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private
router.get('/', auth, checkPermission('inventory'), async (req, res) => {
  try {
    const { page = 1, limit = 100, search, outlet, status = 'available' } = req.query;

    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (outlet) {
      query.outlet = outlet;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get inventory items with pagination
    const items = await Inventory.find(query)
      .populate('addedBy', 'username fullName')
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
    const items = await Inventory.find({ 
      status: 'available', 
      quantity: { $gt: 0 } 
    })
    .populate('addedBy', 'username fullName')
    .sort({ brand: 1, model: 1 });

    res.status(200).json({
      success: true,
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
        message: 'Item code already exists'
      });
    }

    // Create inventory item
    const item = new Inventory({
      code: code.trim().toUpperCase(),
      type,
      brand: brand.trim(),
      model: model.trim(),
      size: size ? size.trim() : '-',
      price: parseFloat(price),
      quantity: parseInt(quantity),
      outlet,
      description: description ? description.trim() : '',
      addedBy: req.user._id
    });

    await item.save();
    await item.populate('addedBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: item
    });

  } catch (error) {
    console.error('Create inventory item error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Item code already exists'
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
          message: 'Item code already exists'
        });
      }
    }

    // Track outlet change for movement history
    const oldOutlet = item.outlet;
    
    // Update item
    if (code) item.code = code.trim().toUpperCase();
    if (type) item.type = type;
    if (brand) item.brand = brand.trim();
    if (model) item.model = model.trim();
    if (size !== undefined) item.size = size ? size.trim() : '-';
    if (price !== undefined) item.price = parseFloat(price);
    if (quantity !== undefined) {
      item.quantity = parseInt(quantity);
      item.status = item.quantity > 0 ? 'available' : 'sold';
    }
    if (outlet && outlet !== oldOutlet) {
      item.outlet = outlet;
      // Add movement history
      item.movementHistory.push({
        fromOutlet: oldOutlet,
        toOutlet: outlet,
        reason: 'Manual Update',
        movedBy: req.user._id
      });
    }
    if (description !== undefined) item.description = description.trim();

    await item.save();
    await item.populate('addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });

  } catch (error) {
    console.error('Update inventory item error:', error);
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

// @route   PATCH /api/inventory/:id/quantity
// @desc    Update inventory quantity
// @access  Private
router.patch('/:id/quantity', auth, async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    let newQuantity;
    if (operation === 'add') {
      newQuantity = item.quantity + parseInt(quantity);
    } else if (operation === 'subtract') {
      newQuantity = Math.max(0, item.quantity - parseInt(quantity));
    } else {
      newQuantity = parseInt(quantity);
    }

    await item.updateQuantity(newQuantity);

    res.status(200).json({
      success: true,
      message: 'Quantity updated successfully',
      data: item
    });

  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating quantity'
    });
  }
});

module.exports = router;

// ================================
// SALES ROUTES - backend/routes/sales.js
// ================================
const express = require('express');
const Sales = require('../models/inventory'); // Sales model is in inventory.js file
const Inventory = require('../models/inventory');
const Customer = require('../models/Customer');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private
router.get('/', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, fromDate, toDate } = req.query;

    let query = { status: 'completed' };
    
    // Date range filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sales = await Sales.find(query)
      .populate('customerId', 'name phone email')
      .populate('itemId', 'code brand model type')
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Sales.countDocuments(query);

    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: sales
    });

  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sales'
    });
  }
});

// @route   GET /api/sales/stats
// @desc    Get sales statistics
// @access  Private
router.get('/stats', auth, checkPermission('sales'), async (req, res) => {
  try {
    const stats = await Sales.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sales statistics'
    });
  }
});

// @route   GET /api/sales/:id
// @desc    Get single sale
// @access  Private
router.get('/:id', auth, checkPermission('sales'), async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate('customerId', 'name phone email address')
      .populate('itemId', 'code brand model type price')
      .populate('createdBy', 'username fullName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sale
    });

  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sale'
    });
  }
});

// @route   POST /api/sales
// @desc    Create new sale
// @access  Private
router.post('/', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { customerId, itemId, quantity, price, discountType, discountValue, paymentMethod } = req.body;

    // Validation
    if (!customerId || !itemId || !quantity || !price || !paymentMethod) {
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

    // Check if item exists and has sufficient quantity
    const item = await Inventory.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (item.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    // Calculate amounts
    const subtotal = price * quantity;
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      discountAmount = Math.min((subtotal * (discountValue || 0)) / 100, subtotal);
    } else if (discountType === 'amount') {
      discountAmount = Math.min(discountValue || 0, subtotal);
    }
    
    const totalAmount = subtotal - discountAmount;

    // Create sale
    const sale = new Sales({
      customerId,
      itemId,
      quantity: parseInt(quantity),
      price: parseFloat(price),
      subtotal,
      discountType: discountType || '',
      discountValue: discountValue || 0,
      discountAmount,
      totalAmount,
      paymentMethod,
      createdBy: req.user._id
    });

    await sale.save();

    // Update inventory quantity
    await item.updateQuantity(item.quantity - quantity);

    // Update customer purchase count and net value
    await customer.incrementPurchases();
    
    // Populate the response
    await sale.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'itemId', select: 'code brand model type' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: sale
    });

  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording sale'
    });
  }
});

// @route   PUT /api/sales/:id
// @desc    Update sale
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Implementation for updating sale
    // This would involve complex logic to handle inventory adjustments
    
    res.status(200).json({
      success: true,
      message: 'Sale update functionality - to be implemented',
      data: sale
    });

  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating sale'
    });
  }
});

// @route   DELETE /api/sales/:id
// @desc    Delete sale
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate('itemId')
      .populate('customerId');
      
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Restore inventory quantity
    if (sale.itemId) {
      await sale.itemId.updateQuantity(sale.itemId.quantity + sale.quantity);
    }

    // Update customer purchase count
    if (sale.customerId) {
      await sale.customerId.decrementPurchases();
    }

    await Sales.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Sale deleted successfully'
    });

  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting sale'
    });
  }
});

module.exports = router;