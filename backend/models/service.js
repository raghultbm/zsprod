// ZEDSON WATCHCRAFT - Service Model
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
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
  watchName: {
    type: String,
    required: [true, 'Watch name is required'],
    trim: true
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
  dialColor: {
    type: String,
    required: [true, 'Dial color is required'],
    trim: true
  },
  movementNo: {
    type: String,
    required: [true, 'Movement number is required'],
    trim: true
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female']
  },
  caseType: {
    type: String,
    required: [true, 'Case type is required'],
    enum: ['Steel', 'Gold Tone', 'Fiber']
  },
  strapType: {
    type: String,
    required: [true, 'Strap type is required'],
    enum: ['Leather', 'Fiber', 'Steel', 'Gold Plated']
  },
  issue: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true
  },
  cost: {
    type: Number,
    required: [true, 'Service cost is required'],
    min: [0, 'Cost cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'on-hold', 'completed', 'cancelled'],
    default: 'pending'
  },
  serviceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  estimatedDelivery: {
    type: Date,
    default: null
  },
  actualDelivery: {
    type: Date,
    default: null
  },
  completionImage: {
    type: String, // Base64 encoded image or file path
    default: null
  },
  completionDescription: {
    type: String,
    trim: true,
    default: null
  },
  warrantyPeriod: {
    type: Number,
    default: 0,
    min: [0, 'Warranty period cannot be negative'],
    max: [60, 'Warranty period cannot exceed 60 months']
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  heldAt: {
    type: Date,
    default: null
  },
  acknowledgementGenerated: {
    type: Boolean,
    default: false
  },
  completionInvoiceGenerated: {
    type: Boolean,
    default: false
  },
  acknowledgementInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  completionInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
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
serviceSchema.index({ customerId: 1 });
serviceSchema.index({ addedBy: 1 });
serviceSchema.index({ serviceDate: -1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ brand: 1 });
serviceSchema.index({ model: 1 });

// Virtual for formatted date
serviceSchema.virtual('date').get(function() {
  return this.serviceDate.toLocaleDateString('en-IN');
});

// Virtual for formatted time
serviceSchema.virtual('time').get(function() {
  return this.serviceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
});

// Virtual for timestamp
serviceSchema.virtual('timestamp').get(function() {
  return this.serviceDate.toISOString();
});

// Method to add note
serviceSchema.methods.addNote = async function(note, addedBy) {
  this.notes.push({
    note,
    addedBy,
    addedAt: new Date()
  });
  return await this.save();
};

// Method to update status with timestamps
serviceSchema.methods.updateStatus = async function(newStatus, userId) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Update timestamps based on status change
  const now = new Date();
  if (newStatus === 'in-progress' && oldStatus === 'pending') {
    this.startedAt = now;
  } else if (newStatus === 'on-hold') {
    this.heldAt = now;
  } else if (newStatus === 'completed') {
    this.completedAt = now;
    if (!this.actualDelivery) {
      this.actualDelivery = now;
    }
  }
  
  return await this.save();
};

// Method to complete service
serviceSchema.methods.completeService = async function(completionData) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.actualDelivery = completionData.actualDelivery || new Date();
  this.completionDescription = completionData.description;
  this.completionImage = completionData.image;
  this.warrantyPeriod = completionData.warrantyPeriod || 0;
  this.cost = completionData.finalCost || this.cost;
  
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
    
    // Average completion time (in days)
    const completionTimeResult = await this.aggregate([
      { 
        $match: { 
          status: 'completed',
          startedAt: { $ne: null },
          completedAt: { $ne: null }
        }
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$completedAt', '$startedAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageCompletionTime: { $avg: '$completionTime' }
        }
      }
    ]);
    
    const averageCompletionTime = completionTimeResult.length > 0 ? 
      Math.round(completionTimeResult[0].averageCompletionTime) : 0;
    
    return {
      totalServices,
      pendingServices,
      inProgressServices,
      onHoldServices,
      completedServices,
      incompleteServices,
      totalRevenue,
      averageCost,
      averageCompletionTime
    };
  } catch (error) {
    throw error;
  }
};

// Static method to get incomplete services
serviceSchema.statics.getIncompleteServices = async function(limit = 5) {
  try {
    return await this.find({ status: { $ne: 'completed' } })
      .populate('customerId', 'name phone')
      .populate('addedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    throw error;
  }
};

// Static method to get services by date range
serviceSchema.statics.getServicesByDateRange = async function(fromDate, toDate) {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    
    return await this.find({
      serviceDate: { $gte: from, $lte: to }
    })
    .populate('customerId', 'name phone')
    .populate('addedBy', 'username fullName')
    .sort({ serviceDate: -1 });
  } catch (error) {
    throw error;
  }
};

// Static method to get services by customer
serviceSchema.statics.getServicesByCustomer = async function(customerId) {
  try {
    return await this.find({ customerId })
      .populate('addedBy', 'username fullName')
      .sort({ serviceDate: -1 });
  } catch (error) {
    throw error;
  }
};

// Static method to get services by status
serviceSchema.statics.getServicesByStatus = async function(status) {
  try {
    return await this.find({ status })
      .populate('customerId', 'name phone')
      .populate('addedBy', 'username fullName')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Service', serviceSchema);