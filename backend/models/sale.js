// ZEDSON WATCHCRAFT - Sale Model (FIXED)
const mongoose = require('mongoose');

// Check if model already exists to prevent overwrite error
if (mongoose.models.Sale) {
  module.exports = mongoose.models.Sale;
} else {
  const saleItemSchema = new mongoose.Schema({
    watchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Watch',
      required: true
    },
    watchCode: {
      type: String,
      required: true,
      trim: true
    },
    watchName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
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
    }
  }, { _id: true });

  const saleSchema = new mongoose.Schema({
    saleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    saleDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required']
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    items: [saleItemSchema],
    
    // Financial details
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    discount: discountSchema,
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },
    
    // Payment details
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'refunded'],
      default: 'paid'
    },
    paidAmount: {
      type: Number,
      min: [0, 'Paid amount cannot be negative'],
      default: 0
    },
    
    // Status and tracking
    status: {
      type: String,
      enum: ['draft', 'completed', 'cancelled', 'returned'],
      default: 'completed'
    },
    
    // Invoice details
    invoiceGenerated: {
      type: Boolean,
      default: false
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: null
    },
    
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
    tags: [{
      type: String,
      trim: true
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
    
    // Return/refund tracking
    returnDetails: {
      isReturned: {
        type: Boolean,
        default: false
      },
      returnDate: {
        type: Date,
        default: null
      },
      returnReason: {
        type: String,
        trim: true,
        default: null
      },
      refundAmount: {
        type: Number,
        min: [0, 'Refund amount cannot be negative'],
        default: 0
      },
      returnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
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
  saleSchema.index({ saleNumber: 1 });
  saleSchema.index({ saleDate: -1 });
  saleSchema.index({ customerId: 1 });
  saleSchema.index({ status: 1 });
  saleSchema.index({ paymentStatus: 1 });
  saleSchema.index({ createdBy: 1 });
  saleSchema.index({ isDeleted: 1 });
  saleSchema.index({ createdAt: -1 });

  // Compound indexes
  saleSchema.index({ saleDate: -1, status: 1 });
  saleSchema.index({ customerId: 1, saleDate: -1 });
  saleSchema.index({ paymentMethod: 1, saleDate: -1 });

  // Virtual for total items count
  saleSchema.virtual('totalItems').get(function() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  });

  // Virtual for profit calculation (if needed later)
  saleSchema.virtual('estimatedProfit').get(function() {
    // This would require cost price data in the watch model
    return 0; // Placeholder
  });

  // Instance Methods

  // Calculate total amount
  saleSchema.methods.calculateTotal = function() {
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
    this.totalAmount = this.subtotal - discountAmount;
    
    return this.totalAmount;
  };

  // Apply discount
  saleSchema.methods.applyDiscount = function(type, value, reason = '') {
    this.discount = {
      type: type,
      value: value,
      amount: 0,
      reason: reason
    };
    
    return this.calculateTotal();
  };

  // Add item to sale
  saleSchema.methods.addItem = function(watchId, watchCode, watchName, quantity, unitPrice) {
    const subtotal = quantity * unitPrice;
    
    this.items.push({
      watchId,
      watchCode,
      watchName,
      quantity,
      unitPrice,
      subtotal
    });
    
    return this.calculateTotal();
  };

  // Remove item from sale
  saleSchema.methods.removeItem = function(itemId) {
    this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
    return this.calculateTotal();
  };

  // Add note
  saleSchema.methods.addNote = function(note, userId) {
    this.notes.push({
      note: note,
      addedBy: userId,
      addedAt: new Date()
    });
    
    return this.save();
  };

  // Process payment
  saleSchema.methods.processPayment = function(amount, method) {
    this.paidAmount += amount;
    this.paymentMethod = method;
    
    if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = 'paid';
    } else if (this.paidAmount > 0) {
      this.paymentStatus = 'partial';
    }
    
    return this.save();
  };

  // Cancel sale
  saleSchema.methods.cancel = function(userId, reason = '') {
    this.status = 'cancelled';
    this.updatedBy = userId;
    
    if (reason) {
      this.addNote(`Sale cancelled: ${reason}`, userId);
    }
    
    return this.save();
  };

  // Process return
  saleSchema.methods.processReturn = function(userId, reason, refundAmount) {
    this.returnDetails = {
      isReturned: true,
      returnDate: new Date(),
      returnReason: reason,
      refundAmount: refundAmount,
      returnedBy: userId
    };
    
    this.status = 'returned';
    this.paymentStatus = 'refunded';
    
    this.addNote(`Sale returned: ${reason}. Refund amount: ₹${refundAmount}`, userId);
    
    return this.save();
  };

  // Soft delete
  saleSchema.methods.softDelete = function(userId, reason = 'Deleted by user') {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    
    this.addNote(`Sale deleted: ${reason}`, userId);
    
    return this.save();
  };

  // Static Methods

  // Generate sale number
  saleSchema.statics.generateSaleNumber = async function() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const prefix = `SL${year}${month}${day}`;
    
    // Find the last sale number for today
    const lastSale = await this.findOne({
      saleNumber: { $regex: `^${prefix}` }
    }).sort({ saleNumber: -1 });
    
    let sequence = 1;
    if (lastSale) {
      const lastSequence = parseInt(lastSale.saleNumber.slice(-3));
      sequence = lastSequence + 1;
    }
    
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  };

  // Get sales by date range
  saleSchema.statics.getSalesByDateRange = function(startDate, endDate, options = {}) {
    const query = {
      saleDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      isDeleted: false,
      ...options
    };
    
    return this.find(query)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'username fullName')
      .sort({ saleDate: -1 });
  };

  // Get sales by customer
  saleSchema.statics.getSalesByCustomer = function(customerId) {
    return this.find({
      customerId: customerId,
      isDeleted: false
    })
      .populate('createdBy', 'username fullName')
      .sort({ saleDate: -1 });
  };

  // Get sales statistics
  saleSchema.statics.getSalesStats = async function(dateFilter = {}) {
    try {
      const matchQuery = { isDeleted: false, ...dateFilter };
      
      const stats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalDiscount: { $sum: '$discount.amount' },
            averageSaleValue: { $avg: '$totalAmount' },
            totalItemsSold: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]);
      
      // Get payment method distribution
      const paymentStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      // Get monthly sales trend
      const monthlyStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$saleDate' },
              month: { $month: '$saleDate' }
            },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      
      // Get top selling items
      const topItems = await this.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              watchId: '$items.watchId',
              watchCode: '$items.watchCode',
              watchName: '$items.watchName'
            },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' },
            salesCount: { $sum: 1 }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]);
      
      return {
        overall: stats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalDiscount: 0,
          averageSaleValue: 0,
          totalItemsSold: 0
        },
        paymentMethods: paymentStats,
        monthlyTrend: monthlyStats,
        topSellingItems: topItems
      };
    } catch (error) {
      throw error;
    }
  };

  // Export data for CSV/Excel
  saleSchema.statics.getExportData = async function(filters = {}) {
    try {
      const query = { isDeleted: false, ...filters };
      
      const sales = await this.find(query)
        .populate('customerId', 'name email phone address')
        .populate('createdBy', 'username fullName')
        .sort({ saleDate: -1 });
      
      // Update export metadata
      await this.updateMany(query, {
        $inc: { 'exportData.exportCount': 1 },
        $set: { 'exportData.lastExported': new Date() }
      });
      
      return sales.map(sale => ({
        id: sale.id,
        saleNumber: sale.saleNumber,
        saleDate: sale.saleDate,
        customerName: sale.customerName,
        customerPhone: sale.customerId ? sale.customerId.phone : 'N/A',
        customerEmail: sale.customerId ? sale.customerId.email : 'N/A',
        totalItems: sale.totalItems,
        subtotal: sale.subtotal,
        discountType: sale.discount.type,
        discountValue: sale.discount.value,
        discountAmount: sale.discount.amount,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        paidAmount: sale.paidAmount,
        status: sale.status,
        invoiceGenerated: sale.invoiceGenerated,
        invoiceNumber: sale.invoiceNumber,
        createdBy: sale.createdBy ? sale.createdBy.fullName : 'Unknown',
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        items: sale.items.map(item => ({
          watchCode: item.watchCode,
          watchName: item.watchName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        })).join('; '),
        notes: sale.notes.map(note => note.note).join('; ')
      }));
    } catch (error) {
      throw error;
    }
  };

  // Pre-save middleware
  saleSchema.pre('save', async function(next) {
    // Generate sale number if not present
    if (!this.saleNumber) {
      this.saleNumber = await this.constructor.generateSaleNumber();
    }
    
    // Calculate total if items have changed
    if (this.isModified('items') || this.isModified('discount')) {
      this.calculateTotal();
    }
    
    // Set paid amount if not set and payment status is paid
    if (this.paymentStatus === 'paid' && this.paidAmount === 0) {
      this.paidAmount = this.totalAmount;
    }
    
    next();
  });

  // Post-save middleware for logging
  saleSchema.post('save', function(doc) {
    console.log(`Sale ${doc.saleNumber} saved successfully`);
  });

  // Pre-remove middleware
  saleSchema.pre('remove', function(next) {
    console.log(`Removing sale: ${this.saleNumber}`);
    next();
  });

  module.exports = mongoose.model('Sale', saleSchema);
}