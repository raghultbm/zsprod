// ================================
// EXPENSE ROUTES - backend/routes/expenses.js
// ================================
const express = require('express');
const Expense = require('../models/Expense');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private
router.get('/', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category, fromDate, toDate } = req.query;

    let query = {};
    
    // Category filter
    if (category) {
      query.category = category;
    }

    // Date range filter
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { paymentMethod: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const expenses = await Expense.find(query)
      .populate('createdBy', 'username fullName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: expenses
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expenses'
    });
  }
});

// @route   GET /api/expenses/stats
// @desc    Get expense statistics
// @access  Private
router.get('/stats', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const stats = await Expense.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expense statistics'
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'username fullName');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expense'
    });
  }
});

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Private
router.post('/', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { date, description, amount, category, paymentMethod, notes } = req.body;

    // Validation
    if (!date || !description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date, description, and amount'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Create expense
    const expense = new Expense({
      date: new Date(date),
      description: description.trim(),
      amount: parseFloat(amount),
      category: category || 'Other',
      paymentMethod: paymentMethod || 'Cash',
      notes: notes ? notes.trim() : '',
      createdBy: req.user._id
    });

    await expense.save();
    await expense.populate('createdBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating expense'
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { date, description, amount, category, paymentMethod, notes } = req.body;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Update expense
    if (date) expense.date = new Date(date);
    if (description) expense.description = description.trim();
    if (amount !== undefined) {
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0'
        });
      }
      expense.amount = parseFloat(amount);
    }
    if (category) expense.category = category;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (notes !== undefined) expense.notes = notes.trim();

    await expense.save();
    await expense.populate('createdBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating expense'
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting expense'
    });
  }
});

module.exports = router;

// ================================
// INVOICE ROUTES - backend/routes/invoices.js
// ================================
const express = require('express');
const Invoice = require('../models/Invoice');
const Sales = require('../models/Sales');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/invoices
// @desc    Get all invoices
// @access  Private
router.get('/', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type, status } = req.query;

    let query = {};
    
    // Type filter
    if (type) {
      query.type = type;
    }

    // Status filter
    if (status) {
      query.status = status;
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
        { invoiceNo: { $regex: search, $options: 'i' } },
        { customerId: { $in: customerIds } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name phone email')
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Invoice.countDocuments(query);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: invoices
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching invoices'
    });
  }
});

// @route   GET /api/invoices/stats
// @desc    Get invoice statistics
// @access  Private
router.get('/stats', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const stats = await Invoice.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching invoice statistics'
    });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'name phone email address')
      .populate('createdBy', 'username fullName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching invoice'
    });
  }
});

// @route   POST /api/invoices/generate-sales
// @desc    Generate sales invoice
// @access  Private
router.post('/generate-sales', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { saleId } = req.body;

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'Sale ID is required'
      });
    }

    // Get sale data
    const sale = await Sales.findById(saleId)
      .populate('customerId', 'name phone email address')
      .populate('itemId', 'code brand model');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ 
      relatedId: saleId, 
      relatedType: 'sale',
      type: 'Sales'
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already exists for this sale'
      });
    }

    // Generate invoice number
    const invoiceNo = Invoice.generateInvoiceNumber('Sales');

    // Prepare invoice data
    const invoiceData = {
      customerName: sale.customerId.name,
      customerPhone: sale.customerId.phone,
      customerEmail: sale.customerId.email,
      customerAddress: sale.customerId.address || '',
      watchName: `${sale.itemId.brand} ${sale.itemId.model}`,
      watchCode: sale.itemId.code,
      quantity: sale.quantity,
      price: sale.price,
      paymentMethod: sale.paymentMethod,
      discountAmount: sale.discountAmount || 0,
      amount: sale.totalAmount,
      date: new Date().toLocaleDateString('en-IN')
    };

    // Create invoice
    const invoice = new Invoice({
      invoiceNo,
      type: 'Sales',
      customerId: sale.customerId._id,
      relatedId: saleId,
      relatedType: 'sale',
      amount: sale.totalAmount,
      invoiceData,
      createdBy: req.user._id
    });

    await invoice.save();
    await invoice.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Sales invoice generated successfully',
      data: invoice
    });

  } catch (error) {
    console.error('Generate sales invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating sales invoice'
    });
  }
});

// @route   POST /api/invoices/generate-service
// @desc    Generate service invoice
// @access  Private
router.post('/generate-service', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { serviceId, type } = req.body;

    if (!serviceId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and type are required'
      });
    }

    if (!['Service Acknowledgement', 'Service Completion'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice type'
      });
    }

    // Get service data
    const service = await Service.findById(serviceId)
      .populate('customerId', 'name phone email address');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ 
      relatedId: serviceId, 
      relatedType: 'service',
      type: type
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: `${type} already exists for this service`
      });
    }

    // For completion invoice, service must be completed
    if (type === 'Service Completion' && service.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Service must be completed to generate completion invoice'
      });
    }

    // Generate invoice number
    const invoiceNo = Invoice.generateInvoiceNumber(type);

    // Prepare invoice data
    const invoiceData = {
      customerName: service.customerId.name,
      customerPhone: service.customerId.phone,
      customerEmail: service.customerId.email,
      customerAddress: service.customerId.address || '',
      watchName: `${service.brand} ${service.model}`,
      brand: service.brand,
      model: service.model,
      dialColor: service.dialColor,
      movementNo: service.movementNo,
      gender: service.gender,
      caseType: service.caseType,
      strapType: service.strapType,
      issue: service.issue,
      amount: type === 'Service Acknowledgement' ? 0 : service.cost,
      estimatedCost: service.cost,
      date: new Date().toLocaleDateString('en-IN')
    };

    // Additional data for completion invoice
    if (type === 'Service Completion') {
      invoiceData.workPerformed = service.completionDescription || '';
      invoiceData.warrantyPeriod = service.warrantyPeriod || 0;
      invoiceData.completionDate = service.actualDelivery ? 
        new Date(service.actualDelivery).toLocaleDateString('en-IN') : 
        new Date().toLocaleDateString('en-IN');
    }

    // Create invoice
    const invoice = new Invoice({
      invoiceNo,
      type,
      customerId: service.customerId._id,
      relatedId: serviceId,
      relatedType: 'service',
      amount: invoiceData.amount,
      invoiceData,
      createdBy: req.user._id
    });

    await invoice.save();
    await invoice.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: `${type} generated successfully`,
      data: invoice
    });

  } catch (error) {
    console.error('Generate service invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating service invoice'
    });
  }
});

// @route   GET /api/invoices/by-transaction/:relatedId/:relatedType
// @desc    Get invoices for a specific transaction
// @access  Private
router.get('/by-transaction/:relatedId/:relatedType', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { relatedId, relatedType } = req.params;

    const invoices = await Invoice.find({ 
      relatedId, 
      relatedType 
    })
    .populate('customerId', 'name phone email')
    .populate('createdBy', 'username fullName')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: invoices
    });

  } catch (error) {
    console.error('Get invoices by transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching invoices'
    });
  }
});

// @route   PATCH /api/invoices/:id/status
// @desc    Update invoice status
// @access  Private (Non-staff only)
router.patch('/:id/status', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = status;
    await invoice.save();

    await invoice.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Invoice status updated successfully',
      data: invoice
    });

  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating invoice status'
    });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting invoice'
    });
  }
});

module.exports = router;