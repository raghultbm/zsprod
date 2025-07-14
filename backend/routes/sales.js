// ZEDSON WATCHCRAFT - Sales Routes
const express = require('express');
const Sales = require('../models/Sales');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private
router.get('/', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, customer, status = 'completed', fromDate, toDate } = req.query;

    // Build query
    let query = { status };

    // Add search functionality
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { watchName: { $regex: search, $options: 'i' } },
        { watchCode: { $regex: search, $options: 'i' } },
        { paymentMethod: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by customer
    if (customer) {
      query.customerId = customer;
    }

    // Filter by date range
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.saleDate = { $gte: from, $lte: to };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get sales with pagination
    const sales = await Sales.find(query)
      .populate('customerId', 'name phone email')
      .populate('inventoryId', 'code brand model')
      .populate('addedBy', 'username fullName')
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
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

// @route   GET /api/sales/recent
// @desc    Get recent sales
// @access  Private
router.get('/recent', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const recentSales = await Sales.getRecentSales(parseInt(limit));

    res.status(200).json({
      success: true,
      count: recentSales.length,
      data: recentSales
    });

  } catch (error) {
    console.error('Get recent sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent sales'
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
      .populate('inventoryId', 'code brand model price')
      .populate('addedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName');

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
    const {
      customerId,
      inventoryId,
      price,
      quantity = 1,
      discountType = '',
      discountValue = 0,
      paymentMethod
    } = req.body;

    // Validation
    if (!customerId || !inventoryId || !price || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (price <= 0 || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price and quantity must be greater than zero'
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

    // Verify inventory item exists and has sufficient stock
    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    if (inventoryItem.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${inventoryItem.quantity} available`
      });
    }

    // Calculate amounts
    const subtotal = price * quantity;
    let discountAmount = 0;

    if (discountType === 'percentage') {
      discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
    } else if (discountType === 'amount') {
      discountAmount = Math.min(discountValue, subtotal);
    }

    const totalAmount = subtotal - discountAmount;

    // Create sale
    const sale = new Sales({
      customerId,
      customerName: customer.name,
      inventoryId,
      watchName: `${inventoryItem.brand} ${inventoryItem.model}`,
      watchCode: inventoryItem.code,
      price,
      quantity,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      totalAmount,
      paymentMethod,
      addedBy: req.user._id,
      saleDate: new Date()
    });

    await sale.save();

    // Update inventory quantity
    await inventoryItem.decreaseQuantity(quantity);

    // Update customer purchase count
    await customer.incrementPurchases();

    // Populate sale for response
    await sale.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'inventoryId', select: 'code brand model' },
      { path: 'addedBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });

  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating sale'
    });
  }
});

// @route   PUT /api/sales/:id
// @desc    Update sale
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const {
      customerId,
      inventoryId,
      price,
      quantity,
      discountType = '',
      discountValue = 0,
      paymentMethod
    } = req.body;

    // Find sale
    const sale = await Sales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Validation
    if (!customerId || !inventoryId || !price || !paymentMethod || quantity <= 0) {
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

    // Verify inventory item exists
    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check stock availability (considering current sale quantity)
    const availableStock = inventoryItem.quantity + sale.quantity;
    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${availableStock} available`
      });
    }

    // Restore previous inventory and customer counts
    const previousInventory = await Inventory.findById(sale.inventoryId);
    if (previousInventory) {
      await previousInventory.increaseQuantity(sale.quantity);
    }
    
    const previousCustomer = await Customer.findById(sale.customerId);
    if (previousCustomer) {
      await previousCustomer.decrementPurchases();
    }

    // Calculate new amounts
    const subtotal = price * quantity;
    let discountAmount = 0;

    if (discountType === 'percentage') {
      discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
    } else if (discountType === 'amount') {
      discountAmount = Math.min(discountValue, subtotal);
    }

    const totalAmount = subtotal - discountAmount;

    // Update sale
    sale.customerId = customerId;
    sale.customerName = customer.name;
    sale.inventoryId = inventoryId;
    sale.watchName = `${inventoryItem.brand} ${inventoryItem.model}`;
    sale.watchCode = inventoryItem.code;
    sale.price = price;
    sale.quantity = quantity;
    sale.subtotal = subtotal;
    sale.discountType = discountType;
    sale.discountValue = discountValue;
    sale.discountAmount = discountAmount;
    sale.totalAmount = totalAmount;
    sale.paymentMethod = paymentMethod;

    await sale.save();

    // Apply new inventory and customer counts
    await inventoryItem.decreaseQuantity(quantity);
    await customer.incrementPurchases();

    // Populate sale for response
    await sale.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'inventoryId', select: 'code brand model' },
      { path: 'addedBy', select: 'username fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Sale updated successfully',
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
    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Restore inventory and customer counts
    const inventoryItem = await Inventory.findById(sale.inventoryId);
    if (inventoryItem) {
      await inventoryItem.increaseQuantity(sale.quantity);
    }

    const customer = await Customer.findById(sale.customerId);
    if (customer) {
      await customer.decrementPurchases();
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

// @route   POST /api/sales/:id/notes
// @desc    Add note to sale
// @access  Private
router.post('/:id/notes', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a note'
      });
    }

    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await sale.addNote(note.trim(), req.user._id);
    await sale.populate('notes.addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: sale
    });

  } catch (error) {
    console.error('Add sale note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @route   GET /api/sales/customer/:customerId
// @desc    Get sales by customer
// @access  Private
router.get('/customer/:customerId', auth, checkPermission('sales'), async (req, res) => {
  try {
    const sales = await Sales.getSalesByCustomer(req.params.customerId);

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });

  } catch (error) {
    console.error('Get sales by customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer sales'
    });
  }
});

module.exports = router;