// ================================
// COMPLETE MODELS FILE - backend/models/inventory.js (UPDATE EXISTING)
// ================================

const mongoose = require('mongoose');

// Movement History Schema
const movementHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  fromOutlet: {
    type: String,
    default: null
  },
  toOutlet: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true,
    default: 'Stock Transfer'
  },
  movedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: [true, 'Item type is required'],
    enum: ['Watch', 'Clock', 'Timepiece', 'Strap', 'Battery']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  size: {
    type: String,
    trim: true,
    default: '-'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  outlet: {
    type: String,
    required: [true, 'Outlet is required'],
    enum: ['Semmancheri', 'Navalur', 'Padur']
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'discontinued'],
    default: 'available'
  },
  movementHistory: [movementHistorySchema],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
inventorySchema.index({ code: 1 });
inventorySchema.index({ brand: 1, model: 1 });
inventorySchema.index({ outlet: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ type: 1 });

// Methods
inventorySchema.methods.updateQuantity = async function(newQuantity) {
  this.quantity = Math.max(0, newQuantity);
  this.status = this.quantity > 0 ? 'available' : 'sold';
  return await this.save();
};

inventorySchema.methods.moveToOutlet = async function(newOutlet, reason, movedBy) {
  const oldOutlet = this.outlet;
  this.outlet = newOutlet;
  this.movementHistory.push({
    fromOutlet: oldOutlet,
    toOutlet: newOutlet,
    reason: reason || 'Stock Transfer',
    movedBy: movedBy,
    date: new Date()
  });
  return await this.save();
};

// Static method to get inventory statistics
inventorySchema.statics.getStats = async function() {
  try {
    const totalItems = await this.countDocuments();
    const availableItems = await this.countDocuments({ status: 'available', quantity: { $gt: 0 } });
    const soldItems = await this.countDocuments({ status: 'sold' });
    const lowStockItems = await this.countDocuments({ quantity: { $lte: 2, $gt: 0 } });
    
    const valueResult = await this.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);
    
    const totalValue = valueResult.length > 0 ? valueResult[0].totalValue : 0;
    const averagePrice = valueResult.length > 0 ? valueResult[0].averagePrice : 0;
    
    const outletStats = await this.aggregate([
      {
        $group: {
          _id: '$outlet',
          count: { $sum: 1 },
          value: { $sum: { $multiply: ['$price', '$quantity'] } }
        }
      }
    ]);
    
    return {
      totalItems,
      availableItems,
      soldItems,
      lowStockItems,
      totalValue,
      averagePrice,
      outletStats
    };
  } catch (error) {
    throw error;
  }
};

const Inventory = mongoose.model('Inventory', inventorySchema);

// ================================
// SALES MODEL
// ================================
const salesSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true
  },
  discountType: {
    type: String,
    enum: ['', 'percentage', 'amount'],
    default: ''
  },
  discountValue: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer']
  },
  status: {
    type: String,
    enum: ['completed', 'refunded', 'cancelled'],
    default: 'completed'
  },
  notes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
salesSchema.index({ customerId: 1 });
salesSchema.index({ itemId: 1 });
salesSchema.index({ createdAt: -1 });
salesSchema.index({ status: 1 });
salesSchema.index({ paymentMethod: 1 });

// Static method to get sales statistics
salesSchema.statics.getStats = async function() {
  try {
    const totalSales = await this.countDocuments({ status: 'completed' });
    
    const revenueResult = await this.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discountAmount' },
          averageSale: { $avg: '$totalAmount' }
        }
      }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const totalDiscount = revenueResult.length > 0 ? revenueResult[0].totalDiscount : 0;
    const averageSale = revenueResult.length > 0 ? revenueResult[0].averageSale : 0;
    
    // Today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayResult = await this.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          todayRevenue: { $sum: '$totalAmount' },
          todaySales: { $sum: 1 }
        }
      }
    ]);
    
    const todayRevenue = todayResult.length > 0 ? todayResult[0].todayRevenue : 0;
    const todaySales = todayResult.length > 0 ? todayResult[0].todaySales : 0;
    
    return {
      totalSales,
      totalRevenue,
      totalDiscount,
      averageSale,
      todayRevenue,
      todaySales
    };
  } catch (error) {
    throw error;
  }
};

const Sales = mongoose.model('Sales', salesSchema);

// ================================
// SERVICE MODEL
// ================================
const serviceSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  dialColor: {
    type: String,
    required: true,
    trim: true
  },
  movementNo: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  caseType: {
    type: String,
    required: true,
    enum: ['Steel', 'Gold Tone', 'Fiber']
  },
  strapType: {
    type: String,
    required: true,
    enum: ['Leather', 'Fiber', 'Steel', 'Gold Plated']
  },
  issue: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'on-hold', 'completed', 'cancelled'],
    default: 'pending'
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  completionImage: {
    type: String // Base64 encoded image or URL
  },
  completionDescription: {
    type: String,
    trim: true
  },
  warrantyPeriod: {
    type: Number,
    min: 0,
    max: 60,
    default: 0
  },
  notes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
serviceSchema.index({ customerId: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ brand: 1, model: 1 });

// Virtual for watch name
serviceSchema.virtual('watchName').get(function() {
  return `${this.brand} ${this.model}`;
});

// Method to update status
serviceSchema.methods.updateStatus = async function(newStatus, changedBy) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy: changedBy,
    changedAt: new Date()
  });
  return await this.save();
};

// Static method to get service statistics
serviceSchema.statics.getStats = async function() {
  try {
    const totalServices = await this.countDocuments();
    const pendingServices = await this.countDocuments({ status: 'pending' });
    const inProgressServices = await this.countDocuments({ status: 'in-progress' });
    const onHoldServices = await this.countDocuments({ status: 'on-hold' });
    const completedServices = await this.countDocuments({ status: 'completed' });
    const incompleteServices = totalServices - completedServices;
    
    const revenueResult = await this.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$cost' },
          averageCost: { $avg: '$cost' }
        }
      }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const averageCost = revenueResult.length > 0 ? revenueResult[0].averageCost : 0;
    
    return {
      totalServices,
      pendingServices,
      inProgressServices,
      onHoldServices,
      completedServices,
      incompleteServices,
      totalRevenue,
      averageCost
    };
  } catch (error) {
    throw error;
  }
};

const Service = mongoose.model('Service', serviceSchema);

// ================================
// EXPENSE MODEL
// ================================
const expenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    enum: ['Office Supplies', 'Rent', 'Utilities', 'Marketing', 'Travel', 'Equipment', 'Maintenance', 'Other'],
    default: 'Other'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Card', 'Cheque'],
    default: 'Cash'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdAt: -1 });

// Virtual for formatted date
expenseSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-IN');
});

// Static method to get expense statistics
expenseSchema.statics.getStats = async function() {
  try {
    const totalExpenses = await this.countDocuments();
    
    const amountResult = await this.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          averageExpense: { $avg: '$amount' }
        }
      }
    ]);
    
    const totalAmount = amountResult.length > 0 ? amountResult[0].totalAmount : 0;
    const averageExpense = amountResult.length > 0 ? amountResult[0].averageExpense : 0;
    
    // Today's expenses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayResult = await this.aggregate([
      { 
        $match: { 
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          todayExpenses: { $sum: '$amount' }
        }
      }
    ]);
    
    const todayExpenses = todayResult.length > 0 ? todayResult[0].todayExpenses : 0;
    
    const categoryStats = await this.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);
    
    return {
      totalExpenses,
      totalAmount,
      averageExpense,
      todayExpenses,
      categoryStats
    };
  } catch (error) {
    throw error;
  }
};

const Expense = mongoose.model('Expense', expenseSchema);

// ================================
// INVOICE MODEL
// ================================
const invoiceSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Sales', 'Service Completion', 'Service Acknowledgement']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  relatedType: {
    type: String,
    required: true,
    enum: ['sale', 'service']
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['generated', 'sent', 'paid', 'cancelled'],
    default: 'generated'
  },
  invoiceData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
invoiceSchema.index({ invoiceNo: 1 });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ type: 1 });
invoiceSchema.index({ relatedId: 1, relatedType: 1 });
invoiceSchema.index({ createdAt: -1 });

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = function(type) {
  const prefix = type === 'Sales' ? 'SI' : type === 'Service Completion' ? 'SV' : 'ACK';
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
};

// Static method to get invoice statistics
invoiceSchema.statics.getStats = async function() {
  try {
    const totalInvoices = await this.countDocuments();
    const salesInvoices = await this.countDocuments({ type: 'Sales' });
    const serviceInvoices = await this.countDocuments({ type: 'Service Completion' });
    
    const revenueResult = await this.aggregate([
      { $match: { type: { $in: ['Sales', 'Service Completion'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    
    return {
      totalInvoices,
      salesInvoices,
      serviceInvoices,
      totalRevenue
    };
  } catch (error) {
    throw error;
  }
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Export all models
module.exports = {
  Inventory,
  Sales,
  Service,
  Expense,
  Invoice
};