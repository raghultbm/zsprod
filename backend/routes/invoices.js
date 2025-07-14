// ZEDSON WATCHCRAFT - Invoice Routes
const express = require('express');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Sales = require('../models/Sales');
const Service = require('../models/Service');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/invoices
// @desc    Get all invoices (excluding acknowledgements)
// @access  Private
router.get('/', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type, status, fromDate, toDate } = req.query;

    // Build query - exclude acknowledgements from main list
    let query = { isAcknowledgement: { $ne: true } };

    // Add search functionality
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { watchName: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by type
    if (type) {
      query.type = type;
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
      query.invoiceDate = { $gte: from, $lte: to };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get invoices with pagination
    const invoices = await Invoice.find(query)
      .populate('customerId', 'name phone email')
      .populate('addedBy', 'username fullName')
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
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
      .populate('addedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName');

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

// @route   POST /api/invoices/sales
// @desc    Generate sales invoice
// @access  Private
router.post('/sales', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { saleId } = req.body;

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'Sale ID is required'
      });
    }

    // Get sale details
    const sale = await Sales.findById(saleId)
      .populate('customerId', 'name phone email address')
      .populate('inventoryId', 'code brand model');

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
    const invoiceNo = await Invoice.generateInvoiceNumber('Sales');

    // Create sales invoice
    const invoice = new Invoice({
      invoiceNo,
      type: 'Sales',
      subType: 'Sales Invoice',
      customerId: sale.customerId._id,
      customerName: sale.customerId.name,
      customerPhone: sale.customerId.phone,
      customerAddress: sale.customerId.address || '',
      relatedId: saleId,
      relatedType: 'sale',
      amount: sale.totalAmount,
      addedBy: req.user._id,
      invoiceDate: sale.saleDate,
      
      // Sales specific fields
      watchName: sale.watchName,
      watchCode: sale.watchCode,
      quantity: sale.quantity,
      price: sale.price,
      paymentMethod: sale.paymentMethod,
      discount: sale.discountAmount || 0
    });

    await invoice.save();

    // Update sale to mark invoice as generated
    sale.invoiceGenerated = true;
    sale.invoiceId = invoice._id;
    await sale.save();

    // Populate invoice for response
    await invoice.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'addedBy', select: 'username fullName' }
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

// @route   POST /api/invoices/service-completion
// @desc    Generate service completion invoice
// @access  Private
router.post('/service-completion', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    // Get service details
    const service = await Service.findById(serviceId)
      .populate('customerId', 'name phone email address');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    if (service.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Service must be completed before generating invoice'
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({
      relatedId: serviceId,
      relatedType: 'service',
      type: 'Service Completion'
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Completion invoice already exists for this service'
      });
    }

    // Generate invoice number
    const invoiceNo = await Invoice.generateInvoiceNumber('Service Completion');

    // Create service completion invoice
    const invoice = new Invoice({
      invoiceNo,
      type: 'Service Completion',
      subType: 'Service Bill',
      customerId: service.customerId._id,
      customerName: service.customerId.name,
      customerPhone: service.customerId.phone,
      customerAddress: service.customerId.address || '',
      relatedId: serviceId,
      relatedType: 'service',
      amount: service.cost,
      addedBy: req.user._id,
      invoiceDate: service.actualDelivery || new Date(),
      
      // Service specific fields
      watchName: service.watchName,
      brand: service.brand,
      model: service.model,
      dialColor: service.dialColor,
      movementNo: service.movementNo,
      gender: service.gender,
      caseType: service.caseType,
      strapType: service.strapType,
      issue: service.issue,
      workPerformed: service.completionDescription || '',
      warrantyPeriod: service.warrantyPeriod || 0,
      completionDate: service.actualDelivery || new Date()
    });

    await invoice.save();

    // Update service to mark completion invoice as generated
    service.completionInvoiceGenerated = true;
    service.completionInvoiceId = invoice._id;
    await service.save();

    // Populate invoice for response
    await invoice.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'addedBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Service completion invoice generated successfully',
      data: invoice
    });

  } catch (error) {
    console.error('Generate service completion invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating service completion invoice'
    });
  }
});

// @route   POST /api/invoices/service-acknowledgement
// @desc    Generate service acknowledgement
// @access  Private
router.post('/service-acknowledgement', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    // Get service details
    const service = await Service.findById(serviceId)
      .populate('customerId', 'name phone email address');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Check if acknowledgement already exists
    const existingAck = await Invoice.findOne({
      relatedId: serviceId,
      relatedType: 'service',
      type: 'Service Acknowledgement'
    });

    if (existingAck) {
      return res.status(400).json({
        success: false,
        message: 'Acknowledgement already exists for this service'
      });
    }

    // Generate invoice number
    const invoiceNo = await Invoice.generateInvoiceNumber('Service Acknowledgement');

    // Create service acknowledgement
    const acknowledgement = new Invoice({
      invoiceNo,
      type: 'Service Acknowledgement',
      subType: 'Watch Received',
      customerId: service.customerId._id,
      customerName: service.customerId.name,
      customerPhone: service.customerId.phone,
      customerAddress: service.customerId.address || '',
      relatedId: serviceId,
      relatedType: 'service',
      amount: 0, // No amount for acknowledgement
      addedBy: req.user._id,
      invoiceDate: service.serviceDate,
      isAcknowledgement: true,
      
      // Service specific fields
      watchName: service.watchName,
      brand: service.brand,
      model: service.model,
      dialColor: service.dialColor,
      movementNo: service.movementNo,
      gender: service.gender,
      caseType: service.caseType,
      strapType: service.strapType,
      issue: service.issue,
      estimatedCost: service.cost
    });

    await acknowledgement.save();

    // Update service to mark acknowledgement as generated
    service.acknowledgementGenerated = true;
    service.acknowledgementInvoiceId = acknowledgement._id;
    await service.save();

    // Populate acknowledgement for response
    await acknowledgement.populate([
      { path: 'customerId', select: 'name phone email' },
      { path: 'addedBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Service acknowledgement generated successfully',
      data: acknowledgement
    });

  } catch (error) {
    console.error('Generate service acknowledgement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating service acknowledgement'
    });
  }
});

// @route   GET /api/invoices/transaction/:transactionId/:transactionType
// @desc    Get invoices for a transaction
// @access  Private
router.get('/transaction/:transactionId/:transactionType', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { transactionId, transactionType } = req.params;

    const invoices = await Invoice.getInvoicesByTransaction(transactionId, transactionType);

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });

  } catch (error) {
    console.error('Get invoices by transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction invoices'
    });
  }
});

// @route   GET /api/invoices/acknowledgement/:serviceId
// @desc    Get service acknowledgement
// @access  Private
router.get('/acknowledgement/:serviceId', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const acknowledgement = await Invoice.findOne({
      relatedId: req.params.serviceId,
      relatedType: 'service',
      type: 'Service Acknowledgement'
    })
    .populate('customerId', 'name phone email address')
    .populate('addedBy', 'username fullName');

    if (!acknowledgement) {
      return res.status(404).json({
        success: false,
        message: 'Service acknowledgement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: acknowledgement
    });

  } catch (error) {
    console.error('Get service acknowledgement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service acknowledgement'
    });
  }
});

// @route   PATCH /api/invoices/:id/status
// @desc    Update invoice status
// @access  Private (Non-staff only)
router.patch('/:id/status', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['generated', 'sent', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.updateStatus(status);

    res.status(200).json({
      success: true,
      message: `Invoice status updated to ${status}`,
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

// @route   POST /api/invoices/:id/notes
// @desc    Add note to invoice
// @access  Private
router.post('/:id/notes', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a note'
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.addNote(note.trim(), req.user._id);
    await invoice.populate('notes.addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: invoice
    });

  } catch (error) {
    console.error('Add invoice note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @route   GET /api/invoices/customer/:customerId
// @desc    Get invoices by customer
// @access  Private
router.get('/customer/:customerId', auth, checkPermission('invoices'), async (req, res) => {
  try {
    const invoices = await Invoice.getInvoicesByCustomer(req.params.customerId);

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });

  } catch (error) {
    console.error('Get invoices by customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer invoices'
    });
  }
});

module.exports = router;