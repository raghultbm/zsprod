// ZEDSON WATCHCRAFT - Watch/Inventory Model
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
    required: true,
    enum: ['Semmancheri', 'Navalur', 'Padur']
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
  notes: {
    type: String,
    trim: true
  }
}, {
  _id: true,
  timestamps: true
});

const watchSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Watch code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{3}\d{3}$/, 'Code must be in format ABC123']
  },
  type: {
    type: String,
    required: [true, 'Watch type is required'],
    enum: ['Watch', 'Clock', 'Timepiece', 'Strap', 'Battery'],
    default: 'Watch'
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxlength: [100, 'Model name cannot exceed 100 characters']
  },
  size: {
    type: String,
    trim: true,
    default: '-',
    validate: {
      validator: function(v) {
        // Size is required for Strap type
        if (this.type === 'Strap') {
          return v && v.trim() !== '' && v !== '-';
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
      validator: function(v) {
        return v > 0;
      },
      message: 'Price must be greater than zero'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 1
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
    enum: ['available', 'sold', 'reserved', 'damaged'],
    default: 'available'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movementHistory: [movementHistorySchema],
  
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
watchSchema.index({ code: 1 });
watchSchema.index({ outlet: 1 });
watchSchema.index({ status: 1 });
watchSchema.index({ type: 1 });
watchSchema.index({ brand: 1 });
watchSchema.index({ isDeleted: 1 });
watchSchema.index({ createdAt: -1 });

// Compound indexes
watchSchema.index({ outlet: 1, status: 1 });
watchSchema.index({ brand: 1, model: 1 });

// Virtual for total value
watchSchema.virtual('totalValue').get(function() {
  return this.price * this.quantity;
});

// Virtual for availability
watchSchema.virtual('isAvailable').get(function() {
  return this.status === 'available' && this.quantity > 0 && !this.isDeleted;
});

// Instance Methods

// Update quantity with validation
watchSchema.methods.updateQuantity = function(newQuantity, reason = 'Manual Update', userId) {
  if (newQuantity < 0) {
    throw new Error('Quantity cannot be negative');
  }
  
  const oldQuantity = this.quantity;
  this.quantity = newQuantity;
  
  // Update status based on quantity
  if (newQuantity === 0) {
    this.status = 'sold';
  } else if (this.status === 'sold' && newQuantity > 0) {
    this.status = 'available';
  }
  
  // Log the quantity change in movement history if significant
  if (Math.abs(oldQuantity - newQuantity) > 0) {
    this.addMovementRecord(this.outlet, this.outlet, `Quantity changed from ${oldQuantity} to ${newQuantity}: ${reason}`, userId);
  }
  
  return this.save();
};

// Add movement record
watchSchema.methods.addMovementRecord = function(fromOutlet, toOutlet, reason, movedBy, notes = '') {
  this.movementHistory.push({
    date: new Date(),
    fromOutlet: fromOutlet || null,
    toOutlet: toOutlet,
    reason: reason,
    movedBy: movedBy,
    notes: notes
  });
  
  // Update current outlet if different
  if (toOutlet !== this.outlet) {
    this.outlet = toOutlet;
  }
  
  return this.save();
};

// Get available stock
watchSchema.methods.getAvailableStock = function() {
  return this.isAvailable ? this.quantity : 0;
};

// Soft delete
watchSchema.methods.softDelete = function(userId, reason = 'Deleted by user') {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.status = 'sold'; // Mark as sold so it doesn't appear in available items
  
  // Add to movement history
  this.addMovementRecord(this.outlet, this.outlet, `Item deleted: ${reason}`, userId);
  
  return this.save();
};

// Restore from soft delete
watchSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.status = this.quantity > 0 ? 'available' : 'sold';
  
  // Add to movement history
  this.addMovementRecord(this.outlet, this.outlet, 'Item restored from deletion', userId);
  
  return this.save();
};

// Static Methods

// Get watch by code
watchSchema.statics.getByCode = function(code) {
  return this.findOne({ 
    code: code.toUpperCase(), 
    isDeleted: false 
  }).populate('addedBy', 'username fullName');
};

// Get watches by outlet
watchSchema.statics.getByOutlet = function(outlet) {
  return this.find({ 
    outlet: outlet, 
    isDeleted: false 
  }).populate('addedBy', 'username fullName');
};

// Get low stock items
watchSchema.statics.getLowStock = function(threshold = 2) {
  return this.find({
    quantity: { $lte: threshold, $gt: 0 },
    status: 'available',
    isDeleted: false
  }).populate('addedBy', 'username fullName');
};

// Get available watches for sale
watchSchema.statics.getAvailableForSale = function() {
  return this.find({
    status: 'available',
    quantity: { $gt: 0 },
    isDeleted: false
  }).populate('addedBy', 'username fullName');
};

// Get inventory statistics
watchSchema.statics.getInventoryStats = async function() {
  try {
    const totalItems = await this.countDocuments({ isDeleted: false });
    const availableItems = await this.countDocuments({ 
      status: 'available', 
      quantity: { $gt: 0 },
      isDeleted: false 
    });
    const soldItems = await this.countDocuments({ 
      status: 'sold',
      isDeleted: false 
    });
    const lowStockItems = await this.countDocuments({
      quantity: { $lte: 2, $gt: 0 },
      status: 'available',
      isDeleted: false
    });
    
    // Calculate total value
    const valueResult = await this.aggregate([
      { $match: { isDeleted: false } },
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
    
    // Get outlet statistics
    const outletStats = await this.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$outlet',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
        }
      }
    ]);
    
    // Get type distribution
    const typeStats = await this.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
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
      outletStats,
      typeStats
    };
  } catch (error) {
    throw error;
  }
};

// Export data for CSV/Excel
watchSchema.statics.getExportData = async function(filters = {}) {
  try {
    const query = { isDeleted: false, ...filters };
    
    const watches = await this.find(query)
      .populate('addedBy', 'username fullName')
      .populate('movementHistory.movedBy', 'username fullName')
      .sort({ createdAt: -1 });
    
    // Update export metadata
    await this.updateMany(query, {
      $inc: { 'exportData.exportCount': 1 },
      $set: { 'exportData.lastExported': new Date() }
    });
    
    return watches.map(watch => ({
      id: watch.id,
      code: watch.code,
      type: watch.type,
      brand: watch.brand,
      model: watch.model,
      size: watch.size,
      price: watch.price,
      quantity: watch.quantity,
      totalValue: watch.totalValue,
      outlet: watch.outlet,
      status: watch.status,
      description: watch.description,
      addedBy: watch.addedBy ? watch.addedBy.fullName : 'Unknown',
      createdAt: watch.createdAt,
      updatedAt: watch.updatedAt,
      movementCount: watch.movementHistory.length,
      lastMovement: watch.movementHistory.length > 0 
        ? watch.movementHistory[watch.movementHistory.length - 1].date 
        : null
    }));
  } catch (error) {
    throw error;
  }
};

// Pre-save middleware
watchSchema.pre('save', function(next) {
  // Auto-generate code if not provided
  if (!this.code && this.brand) {
    const brandPrefix = this.brand.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-3);
    this.code = `${brandPrefix}${timestamp}`;
  }
  
  // Ensure size is set for non-strap items
  if (this.type !== 'Strap' && (!this.size || this.size.trim() === '')) {
    this.size = '-';
  }
  
  // Update status based on quantity
  if (this.quantity === 0 && this.status === 'available') {
    this.status = 'sold';
  } else if (this.quantity > 0 && this.status === 'sold') {
    this.status = 'available';
  }
  
  next();
});

// Post-save middleware for logging
watchSchema.post('save', function(doc) {
  console.log(`Watch ${doc.code} saved successfully`);
});

// Pre-remove middleware
watchSchema.pre('remove', function(next) {
  console.log(`Removing watch: ${this.code}`);
  next();
});

module.exports = mongoose.model('Watch', watchSchema);