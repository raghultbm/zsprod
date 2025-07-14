// ZEDSON WATCHCRAFT - Inventory Model
const mongoose = require('mongoose');

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

const inventorySchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Code cannot exceed 20 characters']
  },
  type: {
    type: String,
    required: [true, 'Item type is required'],
    enum: ['Watch', 'Clock', 'Timepiece', 'Strap', 'Battery'],
    default: 'Watch'
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [100, 'Brand cannot exceed 100 characters']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxlength: [100, 'Model cannot exceed 100 characters']
  },
  size: {
    type: String,
    trim: true,
    maxlength: [50, 'Size cannot exceed 50 characters'],
    default: '-',
    validate: {
      validator: function(value) {
        // Size is required for Strap type
        if (this.type === 'Strap') {
          return value && value.trim() !== '' && value !== '-';
        }
        return true;
      },
      message: 'Size is required for Strap type items'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Price must be greater than zero'
    }
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
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'out-of-stock'],
    default: function() {
      return this.quantity > 0 ? 'available' : 'out-of-stock';
    }
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movementHistory: [movementHistorySchema],
  lowStockThreshold: {
    type: Number,
    default: 2,
    min: [0, 'Low stock threshold cannot be negative']
  },
  lastSaleDate: {
    type: Date,
    default: null
  },
  totalSold: {
    type: Number,
    default: 0,
    min: [0, 'Total sold cannot be negative']
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
inventorySchema.index({ brand: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ outlet: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ addedBy: 1 });
inventorySchema.index({ createdAt: -1 });
inventorySchema.index({ 'movementHistory.date': -1 });

// Compound indexes
inventorySchema.index({ brand: 1, model: 1 });
inventorySchema.index({ outlet: 1, status: 1 });
inventorySchema.index({ type: 1, status: 1 });

// Virtual for formatted creation date
inventorySchema.virtual('addedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN');
});

// Virtual for low stock check
inventorySchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockThreshold && this.quantity > 0;
});

// Virtual for full item name
inventorySchema.virtual('itemName').get(function() {
  return `${this.brand} ${this.model}`;
});

// Pre-save middleware to update status based on quantity
inventorySchema.pre('save', function(next) {
  if (this.quantity <= 0) {
    this.status = 'out-of-stock';
  } else if (this.status === 'out-of-stock' && this.quantity > 0) {
    this.status = 'available';
  }
  next();
});

// Method to decrease quantity (for sales)
inventorySchema.methods.decreaseQuantity = async function(amount = 1, soldBy = null) {
  if (this.quantity < amount) {
    throw new Error(`Insufficient stock. Only ${this.quantity} available.`);
  }
  
  this.quantity -= amount;
  this.totalSold += amount;
  this.lastSaleDate = new Date();
  
  if (this.quantity === 0) {
    this.status = 'sold';
  }
  
  return await this.save();
};

// Method to increase quantity (for returns/restocking)
inventorySchema.methods.increaseQuantity = async function(amount = 1) {
  this.quantity += amount;
  
  if (this.quantity > 0 && (this.status === 'sold' || this.status === 'out-of-stock')) {
    this.status = 'available';
  }
  
  return await this.save();
};

// Method to move item to different outlet
inventorySchema.methods.moveToOutlet = async function(newOutlet, reason = 'Stock Transfer', movedBy) {
  const oldOutlet = this.outlet;
  
  if (oldOutlet === newOutlet) {
    throw new Error('Item is already in the specified outlet');
  }
  
  if (!['Semmancheri', 'Navalur', 'Padur'].includes(newOutlet)) {
    throw new Error('Invalid outlet specified');
  }
  
  // Add movement history record
  this.movementHistory.push({
    date: new Date(),
    fromOutlet: oldOutlet,
    toOutlet: newOutlet,
    reason: reason,
    movedBy: movedBy,
    timestamp: new Date()
  });
  
  // Update outlet
  this.outlet = newOutlet;
  
  return await this.save();
};

// Method to add movement history
inventorySchema.methods.addMovementRecord = async function(fromOutlet, toOutlet, reason, movedBy) {
  this.movementHistory.push({
    date: new Date(),
    fromOutlet: fromOutlet,
    toOutlet: toOutlet,
    reason: reason || 'Stock Transfer',
    movedBy: movedBy,
    timestamp: new Date()
  });
  
  return await this.save();
};

// Static method to get inventory statistics
inventorySchema.statics.getStats = async function() {
  try {
    const totalItems = await this.countDocuments();
    const availableItems = await this.countDocuments({ status: 'available' });
    const soldItems = await this.countDocuments({ status: 'sold' });
    const outOfStockItems = await this.countDocuments({ status: 'out-of-stock' });
    const lowStockItems = await this.countDocuments({
      $expr: { $and: [{ $lte: ['$quantity', '$lowStockThreshold'] }, { $gt: ['$quantity', 0] }] }
    });
    
    const totalValueResult = await this.aggregate([
      { $match: { status: { $ne: 'sold' } } },
      { 
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);
    
    const totalValue = totalValueResult.length > 0 ? totalValueResult[0].totalValue : 0;
    const averagePrice = totalValueResult.length > 0 ? totalValueResult[0].averagePrice : 0;
    
    // Statistics by outlet
    const outletStats = await this.aggregate([
      {
        $group: {
          _id: '$outlet',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          availableItems: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Statistics by type
    const typeStats = await this.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);
    
    return {
      totalItems,
      availableItems,
      soldItems,
      outOfStockItems,
      lowStockItems,
      totalValue,
      averagePrice,
      outletStats,
      typeStats
    };
  } catch (error) {
    throw error;
  }
};

// Static method to get low stock alerts
inventorySchema.statics.getLowStockAlerts = async function() {
  try {
    return await this.find({
      $expr: { $and: [{ $lte: ['$quantity', '$lowStockThreshold'] }, { $gt: ['$quantity', 0] }] }
    })
    .populate('addedBy', 'username fullName')
    .sort({ quantity: 1 });
  } catch (error) {
    throw error;
  }
};

// Static method to get available items for sales
inventorySchema.statics.getAvailableItems = async function(outlet = null) {
  try {
    const query = { 
      quantity: { $gt: 0 }, 
      status: 'available' 
    };
    
    if (outlet) {
      query.outlet = outlet;
    }
    
    return await this.find(query)
      .populate('addedBy', 'username fullName')
      .sort({ brand: 1, model: 1 });
  } catch (error) {
    throw error;
  }
};

// Static method to search items
inventorySchema.statics.searchItems = async function(searchTerm, filters = {}) {
  try {
    const query = {
      $or: [
        { code: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } },
        { model: { $regex: searchTerm, $options: 'i' } },
        { type: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    // Apply additional filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        query[key] = filters[key];
      }
    });
    
    return await this.find(query)
      .populate('addedBy', 'username fullName')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Inventory', inventorySchema);