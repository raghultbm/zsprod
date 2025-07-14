// ZEDSON WATCHCRAFT - Sales Model
const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Inventory item is required']
  },
  watchName: {
    type: String,
    required: [true, 'Watch name is required'],
    trim: true
  },
  watchCode: {
    type: String,
    required: [true, 'Watch code is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  discountType: {
    type: String,
    enum: ['', 'percentage', 'amount'],
    default: ''
  },
  discountValue: {
    type: Number,
    default: 0,
    min: [0, 'Discount value cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer']
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  invoiceGenerated: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  }]
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
salesSchema.index({ inventoryId: 1 });
salesSchema.index({ addedBy: 1 });
salesSchema.index({ saleDate: -1 });
salesSchema.index({ createdAt: -1 });
salesSchema.index({ status: 1 });

// Virtual for formatted date
salesSchema.virtual('date').get(function() {
  return this.saleDate.toLocaleDateString('en-IN');
});

// Virtual for formatted time
salesSchema.virtual('time').get(function() {
  return this.saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
});

// Virtual for timestamp
salesSchema.virtual('timestamp').get(function() {
  return this.saleDate.toISOString();
});

// Method to add note
salesSchema.methods.addNote = async function(note, addedBy) {
  this.notes.push({
    note,
    addedBy,
    addedAt: new Date()
  });
  return await this.save();
};

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
          saleDate: { $gte: today, $lt: tomorrow }
        }
      },
      { 
        $group: {
          _id: null,
          todayRevenue: { $sum: '$totalAmount' },
          todayCount: { $sum: 1 }
        }
      }
    ]);
    
    const todayRevenue = todayResult.length > 0 ? todayResult[0].todayRevenue : 0;
    const todayCount = todayResult.length > 0 ? todayResult[0].todayCount : 0;
    
    // Top selling items
    const topItems = await this.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$inventoryId',
          watchName: { $first: '$watchName' },
          watchCode: { $first: '$watchCode' },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);
    
    return {
      totalSales,
      totalRevenue,
      totalDiscount,
      averageSale,
      todayRevenue,
      todayCount,
      topItems
    };
  } catch (error) {
    throw error;
  }
};

// Static method to get recent sales
salesSchema.statics.getRecentSales = async function(limit = 5) {
  try {
    return await this.find({ status: 'completed' })
      .populate('customerId', 'name phone')
      .populate('addedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    throw error;
  }
};

// Static method to get sales by date range
salesSchema.statics.getSalesByDateRange = async function(fromDate, toDate) {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    
    return await this.find({
      status: 'completed',
      saleDate: { $gte: from, $lte: to }
    })
    .populate('customerId', 'name phone')
    .populate('addedBy', 'username fullName')
    .sort({ saleDate: -1 });
  } catch (error) {
    throw error;
  }
};

// Static method to get sales by customer
salesSchema.statics.getSalesByCustomer = async function(customerId) {
  try {
    return await this.find({ customerId, status: 'completed' })
      .populate('addedBy', 'username fullName')
      .sort({ saleDate: -1 });
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Sales', salesSchema);