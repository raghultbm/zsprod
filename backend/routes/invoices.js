// ZEDSON WATCHCRAFT - Invoice Routes (FIXED)
const express = require('express');
const router = express.Router();
const Invoice = require('../models/invoice'); // Fixed: lowercase filename
const Sale = require('../models/sale'); // Fixed: lowercase filename
const Service = require('../models/service'); // Fixed: lowercase filename
const Customer = require('../models/customer'); // Fixed: lowercase filename
const User = require('../models/user'); // Fixed: lowercase filename
const { auth, authorize, checkPermission } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// GET /invoices - List invoices with pagination, search, and filters
router.get('/', checkPermission('invoices'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      type = '',
      status = '',
      paymentStatus = '',
      customerId = '',
      startDate = '',
      endDate = '',
      sortBy = 'invoiceDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = { isDeleted: false };

    // Search across multiple fields
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { 'customerDetails.name': searchRegex },
        { 'customerDetails.phone': searchRegex },
        { 'customerDetails.email': searchRegex }
      ];
    }

    // Type filter
    if (type) {
      filter.invoiceType = type;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Payment status filter
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Customer filter
    if (customerId) {
      filter.customerId = customerId;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) {
        filter.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.invoiceDate.$lte = new Date(endDate);
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with population
    const [invoices, totalCount] = await Promise.all([
      Invoice.find(filter)
        .populate('customerId', 'name email phone address')
        .populate('createdBy', 'username fullName')
        .populate('updatedBy', 'username fullName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Invoice.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
});

// GET /invoices/stats - Get invoice statistics
router.get('/stats', checkPermission('invoices'), async (req, res) => {
  try {
    const { startDate, endDate, type, customerId } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) {
        dateFilter.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.invoiceDate.$lte = new Date(endDate);
      }
    }

    // Add additional filters
    if (type) {
      dateFilter.invoiceType = type;
    }
    if (customerId) {
      dateFilter.customerId = customerId;
    }

    const stats = await Invoice.getInvoiceStats(dateFilter);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice statistics',
      error: error.message
    });
  }
});

// GET /invoices/overdue - Get overdue invoices
router.get('/overdue', checkPermission('invoices'), async (req, res) => {
  try {
    const overdueInvoices = await Invoice.getOverdueInvoices();

    res.json({
      success: true,
      data: overdueInvoices
    });

  } catch (error) {
    console.error('Error fetching overdue invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue invoices',
      error: error.message
    });
  }
});

// GET /invoices/export - Export invoices data
router.get('/export', checkPermission('invoices'), async (req, res) => {
  try {
    const {
      type = '',
      status = '',
      paymentStatus = '',
      startDate = '',
      endDate = '',
      customerId = ''
    } = req.query;

    // Build filter query
    const filter = {};

    if (type) filter.invoiceType = type;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (customerId) filter.customerId = customerId;

    // Date range filter
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const exportData = await Invoice.getExportData(filter);

    res.json({
      success: true,
      data: exportData,
      message: `${exportData.length} invoices exported successfully`
    });

  } catch (error) {
    console.error('Error exporting invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting invoices',
      error: error.message
    });
  }
});

// GET /invoices/:id - Get single invoice
router.get('/:id', checkPermission('invoices'), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate('customerId', 'name email phone address')
      .populate('createdBy', 'username fullName')
      .populate('updatedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName')
      .populate('payments.recordedBy', 'username fullName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Mark as viewed if status is 'sent'
    if (invoice.status === 'sent') {
      await invoice.markAsViewed();
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
});

// POST /invoices/sales - Create sales invoice
router.post('/sales', checkPermission('invoices'), async (req, res) => {
  try {
    const { saleId } = req.body;

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'Sale ID is required'
      });
    }

    // Get sale data
    const sale = await Sale.findById(saleId)
      .populate('customerId', 'name email phone address')
      .populate('items.watchId', 'code brand model');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Check if invoice already exists
    if (sale.invoiceGenerated && sale.invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already generated for this sale',
        invoiceId: sale.invoiceId
      });
    }

    // Create sales invoice
    const invoice = await Invoice.createSalesInvoice(sale, req.user.id);

    // Update sale with invoice information
    sale.invoiceGenerated = true;
    sale.invoiceId = invoice._id;
    sale.invoiceNumber = invoice.invoiceNumber;
    await sale.save();

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Sales invoice created successfully'
    });

  } catch (error) {
    console.error('Error creating sales invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sales invoice',
      error: error.message
    });
  }
});

// POST /invoices/service-acknowledgement - Create service acknowledgement
router.post('/service-acknowledgement', checkPermission('invoices'), async (req, res) => {
  try {
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    // Get service data
    const service = await Service.findById(serviceId)
      .populate('customerId', 'name email phone address');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if acknowledgement already exists
    if (service.acknowledgementGenerated && service.acknowledgementInvoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Service acknowledgement already generated',
        invoiceId: service.acknowledgementInvoiceId
      });
    }

    // Create service acknowledgement
    const invoice = await Invoice.createServiceAcknowledgement(service, req.user.id);

    // Update service with acknowledgement information
    service.acknowledgementGenerated = true;
    service.acknowledgementInvoiceId = invoice._id;
    await service.save();

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Service acknowledgement created successfully'
    });

  } catch (error) {
    console.error('Error creating service acknowledgement:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service acknowledgement',
      error: error.message
    });
  }
});

// POST /invoices/service-completion - Create service completion invoice
router.post('/service-completion', checkPermission('invoices'), async (req, res) => {
  try {
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    // Get service data
    const service = await Service.findById(serviceId)
      .populate('customerId', 'name email phone address');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if service is completed
    if (service.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Service must be completed before generating completion invoice'
      });
    }

    // Check if completion invoice already exists
    if (service.completionInvoiceGenerated && service.completionInvoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Service completion invoice already generated',
        invoiceId: service.completionInvoiceId
      });
    }

    // Create service completion invoice
    const invoice = await Invoice.createServiceCompletionInvoice(service, req.user.id);

    // Update service with completion invoice information
    service.completionInvoiceGenerated = true;
    service.completionInvoiceId = invoice._id;
    await service.save();

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Service completion invoice created successfully'
    });

  } catch (error) {
    console.error('Error creating service completion invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service completion invoice',
      error: error.message
    });
  }
});

// PUT /invoices/:id - Update invoice
router.put('/:id', checkPermission('invoices'), async (req, res) => {
  try {
    const {
      customerDetails,
      dueDate,
      items,
      discount,
      tax,
      terms,
      notes
    } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if invoice can be updated
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update paid or cancelled invoices'
      });
    }

    // Update invoice fields
    if (customerDetails) {
      invoice.customerDetails = { ...invoice.customerDetails, ...customerDetails };
    }

    if (dueDate) {
      invoice.dueDate = new Date(dueDate);
    }

    if (items && Array.isArray(items)) {
      invoice.items = items;
    }

    if (discount) {
      invoice.discount = discount;
    }

    if (tax) {
      invoice.tax = tax;
    }

    if (terms) {
      invoice.terms = terms;
    }

    if (notes) {
      invoice.addNote(notes, req.user.id);
    }

    // Update audit fields
    invoice.updatedBy = req.user.id;

    // Recalculate totals
    invoice.calculateTotals();

    await invoice.save();

    // Populate and return updated invoice
    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('customerId', 'name email phone address')
      .populate('createdBy', 'username fullName')
      .populate('updatedBy', 'username fullName');

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message
    });
  }
});

// PATCH /invoices/:id/status - Update invoice status
router.patch('/:id/status', checkPermission('invoices'), async (req, res) => {
  try {
    const { status, reason = '' } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Handle different status updates
    if (status === 'cancelled') {
      await invoice.cancel(req.user.id, reason);
    } else {
      invoice.status = status;
      invoice.updatedBy = req.user.id;

      if (reason) {
        await invoice.addNote(`Status changed to ${status}: ${reason}`, req.user.id);
      }

      await invoice.save();
    }

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice status updated successfully'
    });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice status',
      error: error.message
    });
  }
});

// POST /invoices/:id/payment - Record payment
router.post('/:id/payment', checkPermission('invoices'), async (req, res) => {
  try {
    const {
      amount,
      method,
      date,
      reference = '',
      notes = ''
    } = req.body;

    if (!amount || !method) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount and method are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero'
      });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if payment amount is valid
    if (amount > invoice.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed balance amount'
      });
    }

    // Record payment
    await invoice.recordPayment({
      amount: parseFloat(amount),
      method,
      date: date ? new Date(date) : new Date(),
      reference,
      notes
    }, req.user.id);

    res.json({
      success: true,
      data: invoice,
      message: 'Payment recorded successfully'
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment',
      error: error.message
    });
  }
});

// POST /invoices/:id/refund - Process refund
router.post('/:id/refund', authorize('admin', 'owner'), async (req, res) => {
  try {
    const {
      refundAmount,
      reason = ''
    } = req.body;

    if (!refundAmount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount is required'
      });
    }

    if (refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount must be greater than zero'
      });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if refund amount is valid
    if (refundAmount > invoice.paidAmount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed paid amount'
      });
    }

    // Process refund
    await invoice.processRefund(refundAmount, req.user.id, reason);

    res.json({
      success: true,
      data: invoice,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
});

// POST /invoices/:id/send - Send invoice
router.post('/:id/send', checkPermission('invoices'), async (req, res) => {
  try {
    const { recipientEmail } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Mark as sent
    await invoice.markAsSent(req.user.id, recipientEmail);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice marked as sent successfully'
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invoice',
      error: error.message
    });
  }
});

// GET /invoices/templates/:type - Get invoice templates
router.get('/templates/:type', checkPermission('invoices'), async (req, res) => {
  try {
    const { type } = req.params;

    // Define templates based on invoice type
    const templates = {
      'sales': {
        title: 'Sales Invoice',
        fields: ['items', 'discount', 'tax', 'payment'],
        terms: 'Payment due upon receipt. Thank you for your business.'
      },
      'service-acknowledgement': {
        title: 'Service Acknowledgement',
        fields: ['serviceDetails', 'estimatedCost', 'estimatedDelivery'],
        terms: 'Service will be completed within estimated timeframe. Advance payment may be required.'
      },
      'service-completion': {
        title: 'Service Completion Invoice',
        fields: ['serviceDetails', 'actualCost', 'warranty', 'payment'],
        terms: 'Payment due within 7 days. Warranty terms apply as specified.'
      }
    };

    const template = templates[type];

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Invoice template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error fetching invoice template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice template',
      error: error.message
    });
  }
});

// DELETE /invoices/:id - Soft delete invoice
router.delete('/:id', authorize('admin', 'owner'), async (req, res) => {
  try {
    const { reason = 'Deleted by user' } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if invoice can be deleted
    if (invoice.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete paid invoices'
      });
    }

    // Soft delete
    await invoice.softDelete(req.user.id, reason);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message
    });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Invoice router error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error in invoice operations',
    error: error.message
  });
});

module.exports = router;