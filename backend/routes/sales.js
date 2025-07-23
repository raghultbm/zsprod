// ZEDSON WATCHCRAFT - Sales Routes
const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../models/sale');
const Customer = require('../models/customer');
const Watch = require('../models/watch');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sales
// @desc    Get all sales with pagination, search, and filters
// @access  Private
router.get('/', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      customerId,
      paymentMethod,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isDeleted: false };

    // Add search functionality
    if (search) {
      query.$or = [
        { saleNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { 'items.watchCode': { $regex: search, $options: 'i' } },
        { 'items.watchName': { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (customerId) query.customerId = customerId;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (status) query.status = status;

    // Date range filter
    if (dateFrom || dateTo) {
      query.saleDate = {};
      if (dateFrom) query.saleDate.$gte = new Date(dateFrom);
      if (dateTo) query.saleDate.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get sales with pagination
    const sales = await Sale.find(query)
      .populate('customerId', 'name email phone address')
      .populate('createdBy', 'username fullName')
      .populate('invoiceId', 'invoiceNumber status')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Sale.countDocuments(query);

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
    const { dateFrom, dateTo } = req.query;
    
    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.saleDate = {};
      if (dateFrom) dateFilter.saleDate.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.saleDate.$lte = new Date(dateTo);
    }

    const stats = await Sale.getSalesStats(dateFilter);

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

// @route   GET /api/sales/analytics
// @desc    Get sales analytics with detailed breakdown
// @access  Private
router.get('/analytics', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { period = 'monthly', year, month } = req.query;
    
    let matchQuery = { isDeleted: false, status: 'completed' };
    
    if (year) {
      const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1);
      const endDate = month 
        ? new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
        : new Date(parseInt(year), 11, 31, 23, 59, 59);
      
      matchQuery.saleDate = { $gte: startDate, $lte: endDate };
    }

    const analytics = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: period === 'daily' ? {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' },
            day: { $dayOfMonth: '$saleDate' }
          } : {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' }
          },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discount.amount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sales analytics'
    });
  }
});

// @route   GET /api/sales/customer/:customerId
// @desc    Get sales by customer
// @access  Private
router.get('/customer/:customerId', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { customerId } = req.params;
    const sales = await Sale.getSalesByCustomer(customerId);

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

// @route   GET /api/sales/export
// @desc    Export sales data (CSV format)
// @access  Private
router.get('/export', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    
    // Build filter object
    const exportFilters = {};
    if (filters.customerId) exportFilters.customerId = filters.customerId;
    if (filters.paymentMethod) exportFilters.paymentMethod = filters.paymentMethod;
    if (filters.status) exportFilters.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      exportFilters.saleDate = {};
      if (filters.dateFrom) exportFilters.saleDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) exportFilters.saleDate.$lte = new Date(filters.dateTo);
    }

    const exportData = await Sale.getExportData(exportFilters);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'Sale Number', 'Sale Date', 'Customer Name', 'Customer Phone', 'Customer Email',
        'Total Items', 'Subtotal', 'Discount Type', 'Discount Value', 'Discount Amount',
        'Total Amount', 'Payment Method', 'Payment Status', 'Paid Amount', 'Status',
        'Invoice Generated', 'Invoice Number', 'Created By', 'Created Date', 'Items', 'Notes'
      ].join(',');

      const csvRows = exportData.map(sale => [
        sale.id,
        sale.saleNumber,
        new Date(sale.saleDate).toLocaleDateString(),
        `"${sale.customerName}"`,
        sale.customerPhone,
        sale.customerEmail,
        sale.totalItems,
        sale.subtotal,
        sale.discountType,
        sale.discountValue,
        sale.discountAmount,
        sale.totalAmount,
        sale.paymentMethod,
        sale.paymentStatus,
        sale.paidAmount,
        sale.status,
        sale.invoiceGenerated ? 'Yes' : 'No',
        sale.invoiceNumber || '',
        `"${sale.createdBy}"`,
        new Date(sale.createdAt).toLocaleDateString(),
        `"${sale.items}"`,
        `"${sale.notes}"`
      ].join(','));

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sales_export_${new Date().toISOString().split('T')[0]}.csv`);
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
    console.error('Export sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting sales data'
    });
  }
});

// @route   GET /api/sales/:id
// @desc    Get single sale
// @access  Private
router.get('/:id', auth, checkPermission('sales'), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customerId', 'name email phone address')
      .populate('createdBy', 'username fullName')
      .populate('invoiceId', 'invoiceNumber status')
      .populate('notes.addedBy', 'username fullName');

    if (!sale || sale.isDeleted) {
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
      items, // Array of { watchId, quantity, unitPrice }
      discount = { type: 'none', value: 0 },
      paymentMethod,
      notes = []
    } = req.body;

    // Validation
    if (!customerId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer, items, and payment method'
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

    // Start transaction for inventory management
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate and prepare sale items
      const saleItems = [];
      let subtotal = 0;

      for (const item of items) {
        const { watchId, quantity, unitPrice } = item;

        if (!watchId || !quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) {
          throw new Error('Invalid item data: watchId, quantity, and unitPrice are required');
        }

        // Get watch and check availability
        const watch = await Watch.findById(watchId).session(session);
        if (!watch || watch.isDeleted) {
          throw new Error(`Watch not found: ${watchId}`);
        }

        if (watch.quantity < quantity) {
          throw new Error(`Insufficient stock for ${watch.code}. Available: ${watch.quantity}, Requested: ${quantity}`);
        }

        // Update watch quantity
        await watch.updateQuantity(watch.quantity - quantity, `Sale to ${customer.name}`, req.user._id);

        const itemSubtotal = quantity * unitPrice;
        subtotal += itemSubtotal;

        saleItems.push({
          watchId: watch._id,
          watchCode: watch.code,
          watchName: `${watch.brand} ${watch.model}`,
          quantity,
          unitPrice,
          subtotal: itemSubtotal
        });
      }

      // Create sale
      const sale = new Sale({
        customerId,
        customerName: customer.name,
        items: saleItems,
        subtotal,
        discount,
        paymentMethod,
        createdBy: req.user._id
      });

      // Apply discount and calculate total
      sale.applyDiscount(discount.type, discount.value, discount.reason);

      // Add notes if provided
      if (notes.length > 0) {
        notes.forEach(note => {
          sale.addNote(note, req.user._id);
        });
      }

      await sale.save({ session });

      // Update customer purchase count
      customer.purchases += 1;
      customer.lastPurchaseDate = new Date();
      await customer.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Populate for response
      await sale.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'createdBy', select: 'username fullName' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Sale created successfully',
        data: sale
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Create sale error:', error);

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
      message: error.message || 'Server error while creating sale'
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
      items,
      discount,
      paymentMethod,
      status
    } = req.body;

    // Find sale
    const sale = await Sale.findById(req.params.id);

    if (!sale || sale.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // If customer is being changed
      if (customerId && customerId !== sale.customerId.toString()) {
        const newCustomer = await Customer.findById(customerId).session(session);
        if (!newCustomer) {
          throw new Error('New customer not found');
        }

        // Update customer counts
        const oldCustomer = await Customer.findById(sale.customerId).session(session);
        if (oldCustomer) {
          oldCustomer.purchases = Math.max(0, oldCustomer.purchases - 1);
          await oldCustomer.save({ session });
        }

        newCustomer.purchases += 1;
        newCustomer.lastPurchaseDate = new Date();
        await newCustomer.save({ session });

        sale.customerId = customerId;
        sale.customerName = newCustomer.name;
      }

      // If items are being updated
      if (items && Array.isArray(items)) {
        // Restore quantities from old items
        for (const oldItem of sale.items) {
          const watch = await Watch.findById(oldItem.watchId).session(session);
          if (watch) {
            await watch.updateQuantity(watch.quantity + oldItem.quantity, `Sale update - restore stock`, req.user._id);
          }
        }

        // Process new items
        const newSaleItems = [];
        let newSubtotal = 0;

        for (const item of items) {
          const { watchId, quantity, unitPrice } = item;

          const watch = await Watch.findById(watchId).session(session);
          if (!watch || watch.isDeleted) {
            throw new Error(`Watch not found: ${watchId}`);
          }

          if (watch.quantity < quantity) {
            throw new Error(`Insufficient stock for ${watch.code}. Available: ${watch.quantity}, Requested: ${quantity}`);
          }

          await watch.updateQuantity(watch.quantity - quantity, `Sale update - ${sale.customerName}`, req.user._id);

          const itemSubtotal = quantity * unitPrice;
          newSubtotal += itemSubtotal;

          newSaleItems.push({
            watchId: watch._id,
            watchCode: watch.code,
            watchName: `${watch.brand} ${watch.model}`,
            quantity,
            unitPrice,
            subtotal: itemSubtotal
          });
        }

        sale.items = newSaleItems;
        sale.subtotal = newSubtotal;
      }

      // Update other fields
      if (discount) sale.applyDiscount(discount.type, discount.value, discount.reason);
      if (paymentMethod) sale.paymentMethod = paymentMethod;
      if (status) sale.status = status;

      sale.updatedBy = req.user._id;
      sale.calculateTotal();

      await sale.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Populate for response
      await sale.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'createdBy', select: 'username fullName' }
      ]);

      res.status(200).json({
        success: true,
        message: 'Sale updated successfully',
        data: sale
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating sale'
    });
  }
});

// @route   DELETE /api/sales/:id
// @desc    Soft delete sale and restore inventory
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { reason = 'Sale deleted via API' } = req.body;

    const sale = await Sale.findById(req.params.id);

    if (!sale || sale.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Restore inventory quantities
      for (const item of sale.items) {
        const watch = await Watch.findById(item.watchId).session(session);
        if (watch) {
          await watch.updateQuantity(watch.quantity + item.quantity, `Sale deletion - restore stock`, req.user._id);
        }
      }

      // Update customer purchase count
      const customer = await Customer.findById(sale.customerId).session(session);
      if (customer) {
        customer.purchases = Math.max(0, customer.purchases - 1);
        await customer.save({ session });
      }

      // Soft delete sale
      await sale.softDelete(req.user._id, reason);

      // Commit transaction
      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: 'Sale deleted successfully and inventory restored'
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

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

    const sale = await Sale.findById(req.params.id);

    if (!sale || sale.isDeleted) {
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

// @route   PATCH /api/sales/:id/payment
// @desc    Update payment details
// @access  Private
router.patch('/:id/payment', auth, checkPermission('sales'), async (req, res) => {
  try {
    const { amount, method, reference = '' } = req.body;

    if (!amount || amount <= 0 || !method) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid payment amount and method'
      });
    }

    const sale = await Sale.findById(req.params.id);

    if (!sale || sale.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await sale.processPayment(amount, method);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        id: sale._id,
        saleNumber: sale.saleNumber,
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        paymentStatus: sale.paymentStatus
      }
    });

  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing payment'
    });
  }
});

// @route   PATCH /api/sales/:id/return
// @desc    Process sale return
// @access  Private (Non-staff only)
router.patch('/:id/return', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { reason, refundAmount, restoreInventory = true } = req.body;

    if (!reason || !refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide return reason and refund amount'
      });
    }

    const sale = await Sale.findById(req.params.id);

    if (!sale || sale.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Sale has already been returned'
      });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Restore inventory if requested
      if (restoreInventory) {
        for (const item of sale.items) {
          const watch = await Watch.findById(item.watchId).session(session);
          if (watch) {
            await watch.updateQuantity(watch.quantity + item.quantity, `Return - ${reason}`, req.user._id);
          }
        }
      }

      // Process return
      await sale.processReturn(req.user._id, reason, refundAmount);

      // Update customer purchase count
      const customer = await Customer.findById(sale.customerId).session(session);
      if (customer) {
        customer.purchases = Math.max(0, customer.purchases - 1);
        await customer.save({ session });
      }

      // Commit transaction
      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: 'Sale return processed successfully',
        data: {
          id: sale._id,
          saleNumber: sale.saleNumber,
          status: sale.status,
          refundAmount: refundAmount,
          returnReason: reason
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Process return error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing return'
    });
  }
});

module.exports = router;