// ZEDSON WATCHCRAFT - Invoice Model (FIXED)
const mongoose = require('mongoose');

// Check if model already exists to prevent overwrite error
if (mongoose.models.Invoice) {
  module.exports = mongoose.models.Invoice;
} else {
  const invoiceItemSchema = new mongoose.Schema({
    itemType: {
      type: String,
      enum: ['watch', 'service', 'product', 'other'],
      required: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'items.itemType',
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      rate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%'],
        default: 0
      },
      amount: {
        type: Number,
        min: [0, 'Tax amount cannot be negative'],
        default: 0
      }
    }
  }, { _id: true });

  const discountSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ['percentage', 'amount', 'none'],
      default: 'none'
    },
    value: {
      type: Number,
      min: [0, 'Discount value cannot be negative'],
      default: 0
    },
    amount: {
      type: Number,
      min: [0, 'Discount amount cannot be negative'],
      default: 0
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    }
  }, { _id: false });

  const paymentTrackingSchema = new mongoose.Schema({
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount cannot be negative']
    },
    method: {
      type: String,
      required: true,
      enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Other']
    },
    reference: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }, { _id: true });

  const noteSchema = new mongoose.Schema({
    note: {
      type: String,
      required: true,
      trim: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }, { _id: true });

  const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    invoiceType: {
      type: String,
      required: [true, 'Invoice type is required'],
      enum: ['sales', 'service-completion', 'service-acknowledgement', 'refund', 'adjustment']
    },
    
    // Related transaction references
    relatedTransaction: {
      type: {
        type: String,
        enum: ['sale', 'service'],
        required: true
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'relatedTransaction.type'
      }
    },
    
    // Customer information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required']
    },
    customerDetails: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        trim: true,
        lowercase: true
      },
      phone: {
        type: String,
        required: true,
        trim: true
      },
      address: {
        type: String,
        trim: true,
        default: ''
      }
    },
    
    // Invoice dates
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true,
      default: function() {
        // Default due date is 30 days from invoice date
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      }
    },
    
    // Financial details
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
      default: 0
    },
    discount: discountSchema,
    tax: {
      rate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%'],
        default: 0
      },
      amount: {
        type: Number,
        min: [0, 'Tax amount cannot be negative'],
        default: 0
      },
      type: {
        type: String,
        enum: ['GST', 'VAT', 'Service Tax', 'None'],
        default: 'None'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },
    
    // Payment tracking
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue', 'refunded'],
      default: 'unpaid'
    },
    paidAmount: {
      type: Number,
      min: [0, 'Paid amount cannot be negative'],
      default: 0
    },
    balanceAmount: {
      type: Number,
      min: [0, 'Balance amount cannot be negative'],
      default: 0
    },
    payments: [paymentTrackingSchema],
    
    // Invoice status
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'paid', 'cancelled', 'refunded'],
      default: 'sent'
    },
    
    // Service-specific fields (for service invoices)
    serviceDetails: {
      acknowledgementData: {
        issueDescription: String,
        estimatedCost: Number,
        estimatedDelivery: Date
      },
      completionData: {
        workPerformed: String,
        actualCost: Number,
        warrantyPeriod: Number,
        completionDate: Date,
        completionImage: String
      }
    },
    
    // Communication tracking
    sentDate: {
      type: Date,
      default: null
    },
    viewedDate: {
      type: Date,
      default: null
    },
    emailsSent: [{
      sentAt: Date,
      recipient: String,
      subject: String,
      status: {
        type: String,
        enum: ['sent', 'delivered', 'opened', 'failed']
      }
    }],
    
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    // Additional information
    notes: [noteSchema],
    terms: {
      type: String,
      trim: true,
      default: 'Payment due within 30 days. Thank you for your business.'
    },
    
    // File attachments
    attachments: [{
      filename: String,
      path: String,
      size: Number,
      mimetype: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Export metadata
    exportData: {
      lastExported: {
        type: Date,
        default: null
      },
      exportCount: {
        type: Number,
        default: 0
      }
    },
    
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }, {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  });

  // Indexes for performance
  invoiceSchema.index({ invoiceNumber: 1 });
  invoiceSchema.index({ invoiceDate: -1 });
  invoiceSchema.index({ dueDate: 1 });
  invoiceSchema.index({ customerId: 1 });
  invoiceSchema.index({ invoiceType: 1 });
  invoiceSchema.index({ paymentStatus: 1 });
  invoiceSchema.index({ status: 1 });
  invoiceSchema.index({ createdBy: 1 });
  invoiceSchema.index({ isDeleted: 1 });
  invoiceSchema.index({ createdAt: -1 });

  // Compound indexes
  invoiceSchema.index({ invoiceDate: -1, paymentStatus: 1 });
  invoiceSchema.index({ customerId: 1, invoiceDate: -1 });
  invoiceSchema.index({ invoiceType: 1, status: 1 });
  invoiceSchema.index({ 'relatedTransaction.type': 1, 'relatedTransaction.id': 1 });

  // Virtual for days overdue
  invoiceSchema.virtual('daysOverdue').get(function() {
    if (this.paymentStatus === 'overdue' || (this.dueDate < new Date() && this.paymentStatus !== 'paid')) {
      const today = new Date();
      const diffTime = Math.abs(today - this.dueDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  });

  // Virtual for is overdue
  invoiceSchema.virtual('isOverdue').get(function() {
    return this.dueDate < new Date() && this.paymentStatus !== 'paid' && this.status !== 'cancelled';
  });

  // Virtual for payment completion percentage
  invoiceSchema.virtual('paymentPercentage').get(function() {
    if (this.totalAmount === 0) return 100;
    return Math.round((this.paidAmount / this.totalAmount) * 100);
  });

  // Instance Methods

  // Calculate totals
  invoiceSchema.methods.calculateTotals = function() {
    // Calculate subtotal from items
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Apply discount
    let discountAmount = 0;
    if (this.discount.type === 'percentage') {
      discountAmount = Math.min((this.subtotal * this.discount.value) / 100, this.subtotal);
    } else if (this.discount.type === 'amount') {
      discountAmount = Math.min(this.discount.value, this.subtotal);
    }
    this.discount.amount = discountAmount;
    
    // Calculate tax
    const taxableAmount = this.subtotal - discountAmount;
    this.tax.amount = (taxableAmount * this.tax.rate) / 100;
    
    // Calculate total
    this.totalAmount = taxableAmount + this.tax.amount;
    this.balanceAmount = this.totalAmount - this.paidAmount;
    
    return this.totalAmount;
  };

  // Add item to invoice
  invoiceSchema.methods.addItem = function(itemData) {
    const subtotal = itemData.quantity * itemData.unitPrice;
    const taxAmount = (subtotal * (itemData.tax?.rate || 0)) / 100;
    
    this.items.push({
      itemType: itemData.itemType,
      itemId: itemData.itemId,
      description: itemData.description,
      quantity: itemData.quantity,
      unitPrice: itemData.unitPrice,
      subtotal: subtotal,
      tax: {
        rate: itemData.tax?.rate || 0,
        amount: taxAmount
      }
    });
    
    return this.calculateTotals();
  };

  // Apply discount
  invoiceSchema.methods.applyDiscount = function(type, value, reason = '') {
    this.discount = {
      type: type,
      value: value,
      amount: 0,
      reason: reason
    };
    
    return this.calculateTotals();
  };

  // Record payment
  invoiceSchema.methods.recordPayment = function(paymentData, userId) {
    this.payments.push({
      paymentDate: paymentData.date || new Date(),
      amount: paymentData.amount,
      method: paymentData.method,
      reference: paymentData.reference || '',
      notes: paymentData.notes || '',
      recordedBy: userId
    });
    
    this.paidAmount += paymentData.amount;
    this.balanceAmount = Math.max(0, this.totalAmount - this.paidAmount);
    
    // Update payment status
    if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = 'paid';
      this.status = 'paid';
    } else if (this.paidAmount > 0) {
      this.paymentStatus = 'partial';
    }
    
    this.updatedBy = userId;
    
    return this.save();
  };

  // Mark as sent
  invoiceSchema.methods.markAsSent = function(userId, recipientEmail = null) {
    this.status = 'sent';
    this.sentDate = new Date();
    this.updatedBy = userId;
    
    if (recipientEmail) {
      this.emailsSent.push({
        sentAt: new Date(),
        recipient: recipientEmail,
        subject: `Invoice ${this.invoiceNumber}`,
        status: 'sent'
      });
    }
    
    return this.save();
  };

  // Mark as viewed
  invoiceSchema.methods.markAsViewed = function() {
    if (this.status === 'sent') {
      this.status = 'viewed';
      this.viewedDate = new Date();
    }
    
    return this.save();
  };

  // Cancel invoice
  invoiceSchema.methods.cancel = function(userId, reason = '') {
    this.status = 'cancelled';
    this.updatedBy = userId;
    
    if (reason) {
      this.addNote(`Invoice cancelled: ${reason}`, userId);
    }
    
    return this.save();
  };

  // Process refund
  invoiceSchema.methods.processRefund = function(refundAmount, userId, reason = '') {
    this.status = 'refunded';
    this.paymentStatus = 'refunded';
    this.updatedBy = userId;
    
    // Record refund as negative payment
    this.payments.push({
      paymentDate: new Date(),
      amount: -Math.abs(refundAmount),
      method: 'Refund',
      reference: '',
      notes: `Refund processed: ${reason}`,
      recordedBy: userId
    });
    
    this.paidAmount -= Math.abs(refundAmount);
    this.balanceAmount = this.totalAmount - this.paidAmount;
    
    this.addNote(`Refund processed: ₹${Math.abs(refundAmount)}. Reason: ${reason}`, userId);
    
    return this.save();
  };

  // Add note
  invoiceSchema.methods.addNote = function(note, userId, isInternal = false) {
    this.notes.push({
      note: note,
      addedBy: userId,
      addedAt: new Date(),
      isInternal: isInternal
    });
    
    return this.save();
  };

  // Soft delete
  invoiceSchema.methods.softDelete = function(userId, reason = 'Deleted by user') {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    
    this.addNote(`Invoice deleted: ${reason}`, userId, true);
    
    return this.save();
  };

  // Static Methods

  // Generate invoice number
  invoiceSchema.statics.generateInvoiceNumber = async function(type) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    let prefix;
    switch (type) {
      case 'sales':
        prefix = `SI${year}${month}${day}`;
        break;
      case 'service-completion':
        prefix = `SC${year}${month}${day}`;
        break;
      case 'service-acknowledgement':
        prefix = `SA${year}${month}${day}`;
        break;
      case 'refund':
        prefix = `RF${year}${month}${day}`;
        break;
      default:
        prefix = `IN${year}${month}${day}`;
    }
    
    // Find the last invoice number for this type today
    const lastInvoice = await this.findOne({
      invoiceNumber: { $regex: `^${prefix}` }
    }).sort({ invoiceNumber: -1 });
    
    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-3));
      sequence = lastSequence + 1;
    }
    
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  };

  // Get invoices by type
  invoiceSchema.statics.getInvoicesByType = function(type) {
    return this.find({
      invoiceType: type,
      isDeleted: false
    })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'username fullName')
      .sort({ invoiceDate: -1 });
  };

  // Get invoices by customer
  invoiceSchema.statics.getInvoicesByCustomer = function(customerId) {
    return this.find({
      customerId: customerId,
      isDeleted: false
    })
      .populate('createdBy', 'username fullName')
      .sort({ invoiceDate: -1 });
  };

  // Get overdue invoices
  invoiceSchema.statics.getOverdueInvoices = function() {
    return this.find({
      dueDate: { $lt: new Date() },
      paymentStatus: { $in: ['unpaid', 'partial'] },
      status: { $ne: 'cancelled' },
      isDeleted: false
    })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'username fullName')
      .sort({ dueDate: 1 });
  };

  // Get invoices by date range
  invoiceSchema.statics.getInvoicesByDateRange = function(startDate, endDate, options = {}) {
    const query = {
      invoiceDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      isDeleted: false,
      ...options
    };
    
    return this.find(query)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'username fullName')
      .sort({ invoiceDate: -1 });
  };

  // Get invoice statistics
  invoiceSchema.statics.getInvoiceStats = async function(dateFilter = {}) {
    try {
      const matchQuery = { isDeleted: false, ...dateFilter };
      
      const stats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$balanceAmount' },
            averageInvoiceValue: { $avg: '$totalAmount' }
          }
        }
      ]);
      
      // Get status distribution
      const statusStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      // Get type distribution
      const typeStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$invoiceType',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      // Get overdue statistics
      const overdueStats = await this.aggregate([
        { 
          $match: { 
            ...matchQuery,
            dueDate: { $lt: new Date() },
            paymentStatus: { $in: ['unpaid', 'partial'] },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            overdueCount: { $sum: 1 },
            overdueAmount: { $sum: '$balanceAmount' }
          }
        }
      ]);
      
      // Get monthly trend
      const monthlyStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' }
            },
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
            paid: { $sum: '$paidAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      
      return {
        overall: stats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          averageInvoiceValue: 0
        },
        statusDistribution: statusStats,
        typeDistribution: typeStats,
        overdue: overdueStats[0] || {
          overdueCount: 0,
          overdueAmount: 0
        },
        monthlyTrend: monthlyStats
      };
    } catch (error) {
      throw error;
    }
  };

  // Export data for CSV/Excel
  invoiceSchema.statics.getExportData = async function(filters = {}) {
    try {
      const query = { isDeleted: false, ...filters };
      
      const invoices = await this.find(query)
        .populate('customerId', 'name email phone address')
        .populate('createdBy', 'username fullName')
        .sort({ invoiceDate: -1 });
      
      // Update export metadata
      await this.updateMany(query, {
        $inc: { 'exportData.exportCount': 1 },
        $set: { 'exportData.lastExported': new Date() }
      });
      
      return invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        customerName: invoice.customerDetails.name,
        customerPhone: invoice.customerDetails.phone,
        customerEmail: invoice.customerDetails.email,
        customerAddress: invoice.customerDetails.address,
        subtotal: invoice.subtotal,
        discountType: invoice.discount.type,
        discountValue: invoice.discount.value,
        discountAmount: invoice.discount.amount,
        taxRate: invoice.tax.rate,
        taxAmount: invoice.tax.amount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        paymentStatus: invoice.paymentStatus,
        status: invoice.status,
        isOverdue: invoice.isOverdue,
        daysOverdue: invoice.daysOverdue,
        paymentPercentage: invoice.paymentPercentage,
        sentDate: invoice.sentDate,
        viewedDate: invoice.viewedDate,
        relatedTransactionType: invoice.relatedTransaction.type,
        relatedTransactionId: invoice.relatedTransaction.id,
        itemsCount: invoice.items.length,
        paymentsCount: invoice.payments.length,
        createdBy: invoice.createdBy ? invoice.createdBy.fullName : 'Unknown',
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        items: invoice.items.map(item => 
          `${item.description} (Qty: ${item.quantity}, Rate: ₹${item.unitPrice})`
        ).join('; '),
        notes: invoice.notes.filter(note => !note.isInternal).map(note => note.note).join('; ')
      }));
    } catch (error) {
      throw error;
    }
  };

  // Create sales invoice
  invoiceSchema.statics.createSalesInvoice = async function(saleData, userId) {
    try {
      const invoiceNumber = await this.generateInvoiceNumber('sales');
      
      const invoice = new this({
        invoiceNumber,
        invoiceType: 'sales',
        relatedTransaction: {
          type: 'sale',
          id: saleData.id || saleData._id
        },
        customerId: saleData.customerId,
        customerDetails: {
          name: saleData.customerName,
          phone: saleData.customerPhone || '',
          email: saleData.customerEmail || '',
          address: saleData.customerAddress || ''
        },
        invoiceDate: saleData.saleDate || new Date(),
        subtotal: saleData.subtotal || saleData.totalAmount,
        discount: {
          type: saleData.discountType || 'none',
          value: saleData.discountValue || 0,
          amount: saleData.discountAmount || 0
        },
        totalAmount: saleData.totalAmount,
        paymentStatus: 'paid', // Sales are typically paid immediately
        paidAmount: saleData.totalAmount,
        balanceAmount: 0,
        status: 'paid',
        createdBy: userId
      });
      
      // Add sale items
      if (saleData.items && saleData.items.length > 0) {
        saleData.items.forEach(item => {
          invoice.addItem({
            itemType: 'watch',
            itemId: item.watchId,
            description: item.watchName || `${item.watchCode} - ${item.watchName}`,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            tax: { rate: 0, amount: 0 }
          });
        });
      } else {
        // Single item sale (legacy format)
        invoice.addItem({
          itemType: 'watch',
          itemId: saleData.watchId,
          description: saleData.watchName || `${saleData.watchCode} - ${saleData.watchName}`,
          quantity: saleData.quantity || 1,
          unitPrice: saleData.price || saleData.totalAmount,
          tax: { rate: 0, amount: 0 }
        });
      }
      
      return await invoice.save();
    } catch (error) {
      throw error;
    }
  };

  // Create service acknowledgement
  invoiceSchema.statics.createServiceAcknowledgement = async function(serviceData, userId) {
    try {
      const invoiceNumber = await this.generateInvoiceNumber('service-acknowledgement');
      
      const invoice = new this({
        invoiceNumber,
        invoiceType: 'service-acknowledgement',
        relatedTransaction: {
          type: 'service',
          id: serviceData.id || serviceData._id
        },
        customerId: serviceData.customerId,
        customerDetails: {
          name: serviceData.customerName,
          phone: serviceData.customerPhone || '',
          email: serviceData.customerEmail || '',
          address: serviceData.customerAddress || ''
        },
        invoiceDate: serviceData.serviceDate || new Date(),
        subtotal: 0,
        totalAmount: 0,
        paymentStatus: 'unpaid',
        paidAmount: 0,
        balanceAmount: 0,
        status: 'sent',
        serviceDetails: {
          acknowledgementData: {
            issueDescription: serviceData.issue,
            estimatedCost: serviceData.estimatedCost,
            estimatedDelivery: serviceData.estimatedDelivery
          }
        },
        createdBy: userId
      });
      
      return await invoice.save();
    } catch (error) {
      throw error;
    }
  };

  // Create service completion invoice
  invoiceSchema.statics.createServiceCompletionInvoice = async function(serviceData, userId) {
    try {
      const invoiceNumber = await this.generateInvoiceNumber('service-completion');
      
      const invoice = new this({
        invoiceNumber,
        invoiceType: 'service-completion',
        relatedTransaction: {
          type: 'service',
          id: serviceData.id || serviceData._id
        },
        customerId: serviceData.customerId,
        customerDetails: {
          name: serviceData.customerName,
          phone: serviceData.customerPhone || '',
          email: serviceData.customerEmail || '',
          address: serviceData.customerAddress || ''
        },
        invoiceDate: serviceData.completedAt || new Date(),
        subtotal: serviceData.actualCost || serviceData.cost,
        totalAmount: serviceData.actualCost || serviceData.cost,
        paymentStatus: serviceData.balanceAmount > 0 ? 'unpaid' : 'paid',
        paidAmount: serviceData.advancePaid || 0,
        balanceAmount: serviceData.balanceAmount || (serviceData.actualCost || serviceData.cost),
        status: 'sent',
        serviceDetails: {
          completionData: {
            workPerformed: serviceData.completionDetails?.workPerformed || '',
            actualCost: serviceData.actualCost || serviceData.cost,
            warrantyPeriod: serviceData.completionDetails?.warrantyPeriod || 0,
            completionDate: serviceData.completedAt || new Date(),
            completionImage: serviceData.completionDetails?.completionImage || null
          }
        },
        createdBy: userId
      });
      
      // Add service item
      invoice.addItem({
        itemType: 'service',
        itemId: serviceData.id || serviceData._id,
        description: `Service: ${serviceData.watchName} - ${serviceData.issue}`,
        quantity: 1,
        unitPrice: serviceData.actualCost || serviceData.cost,
        tax: { rate: 0, amount: 0 }
      });
      
      return await invoice.save();
    } catch (error) {
      throw error;
    }
  };

  // Pre-save middleware
  invoiceSchema.pre('save', async function(next) {
    // Generate invoice number if not present
    if (!this.invoiceNumber) {
      this.invoiceNumber = await this.constructor.generateInvoiceNumber(this.invoiceType);
    }
    
    // Calculate totals if items have changed
    if (this.isModified('items') || this.isModified('discount') || this.isModified('tax')) {
      this.calculateTotals();
    }
    
    // Update payment status based on amounts
    if (this.isModified('paidAmount') || this.isModified('totalAmount')) {
      if (this.paidAmount >= this.totalAmount && this.totalAmount > 0) {
        this.paymentStatus = 'paid';
        if (this.status !== 'cancelled' && this.status !== 'refunded') {
          this.status = 'paid';
        }
      } else if (this.paidAmount > 0) {
        this.paymentStatus = 'partial';
      } else {
        this.paymentStatus = 'unpaid';
      }
      
      this.balanceAmount = Math.max(0, this.totalAmount - this.paidAmount);
    }
    
    // Check for overdue status
    if (this.dueDate < new Date() && this.paymentStatus !== 'paid' && this.status !== 'cancelled') {
      this.paymentStatus = 'overdue';
    }
    
    next();
  });

  // Post-save middleware for logging
  invoiceSchema.post('save', function(doc) {
    console.log(`Invoice ${doc.invoiceNumber} saved successfully`);
  });

  // Pre-remove middleware
  invoiceSchema.pre('remove', function(next) {
    console.log(`Removing invoice: ${this.invoiceNumber}`);
    next();
  });

  module.exports = mongoose.model('Invoice', invoiceSchema);
}