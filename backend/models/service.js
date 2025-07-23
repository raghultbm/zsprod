// ZEDSON WATCHCRAFT - Service Model (FIXED)
const mongoose = require('mongoose');

// Check if model already exists to prevent overwrite error
if (mongoose.models.Service) {
  module.exports = mongoose.models.Service;
} else {
  const watchDetailsSchema = new mongoose.Schema({
    brand: {
      type: String,
      required: [true, 'Watch brand is required'],
      trim: true,
      maxlength: [50, 'Brand name cannot exceed 50 characters']
    },
    model: {
      type: String,
      required: [true, 'Watch model is required'],
      trim: true,
      maxlength: [100, 'Model name cannot exceed 100 characters']
    },
    dialColor: {
      type: String,
      required: [true, 'Dial color is required'],
      trim: true,
      maxlength: [30, 'Dial color cannot exceed 30 characters']
    },
    movementNo: {
      type: String,
      required: [true, 'Movement number is required'],
      trim: true,
      maxlength: [50, 'Movement number cannot exceed 50 characters']
    },
    gender: {
      type: String,
      required: [true, 'Gender specification is required'],
      enum: ['Male', 'Female', 'Unisex']
    },
    caseType: {
      type: String,
      required: [true, 'Case type is required'],
      enum: ['Steel', 'Gold Tone', 'Fiber', 'Plastic', 'Titanium', 'Ceramic']
    },
    strapType: {
      type: String,
      required: [true, 'Strap type is required'],
      enum: ['Leather', 'Fiber', 'Steel', 'Gold Plated', 'Rubber', 'Fabric']
    },
    serialNumber: {
      type: String,
      trim: true,
      default: ''
    }
  }, { _id: false });

  const statusHistorySchema = new mongoose.Schema({
    status: {
      type: String,
      required: true,
      enum: ['pending', 'in-progress', 'on-hold', 'completed', 'cancelled']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  }, { _id: true });

  const completionDetailsSchema = new mongoose.Schema({
    workPerformed: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Work description cannot exceed 1000 characters']
    },
    partsReplaced: [{
      partName: String,
      partCost: Number,
      supplier: String
    }],
    completionImage: {
      type: String, // Base64 or file path
      default: null
    },
    warrantyPeriod: {
      type: Number,
      min: [0, 'Warranty period cannot be negative'],
      max: [60, 'Warranty period cannot exceed 60 months'],
      default: 0
    },
    warrantyStartDate: {
      type: Date,
      default: Date.now
    },
    warrantyEndDate: {
      type: Date,
      default: null
    },
    qualityNotes: {
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
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }, { _id: true });

  const serviceSchema = new mongoose.Schema({
    serviceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    serviceDate: {
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
    
    // Watch details
    watchDetails: watchDetailsSchema,
    watchName: {
      type: String,
      required: true,
      trim: true
    },
    
    // Service details
    issue: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      maxlength: [1000, 'Issue description cannot exceed 1000 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    category: {
      type: String,
      enum: ['repair', 'maintenance', 'battery', 'strap', 'cleaning', 'other'],
      default: 'repair'
    },
    
    // Cost and pricing
    estimatedCost: {
      type: Number,
      required: [true, 'Estimated cost is required'],
      min: [0, 'Estimated cost cannot be negative']
    },
    actualCost: {
      type: Number,
      min: [0, 'Actual cost cannot be negative'],
      default: 0
    },
    advancePaid: {
      type: Number,
      min: [0, 'Advance amount cannot be negative'],
      default: 0
    },
    balanceAmount: {
      type: Number,
      min: [0, 'Balance amount cannot be negative'],
      default: 0
    },
    
    // Status and timeline
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'on-hold', 'completed', 'cancelled'],
      default: 'pending'
    },
    statusHistory: [statusHistorySchema],
    
    // Timeline
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    estimatedDelivery: {
      type: Date,
      default: null
    },
    actualDelivery: {
      type: Date,
      default: null
    },
    
    // Completion details
    completionDetails: completionDetailsSchema,
    
    // Invoice tracking
    acknowledgementGenerated: {
      type: Boolean,
      default: false
    },
    acknowledgementInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    completionInvoiceGenerated: {
      type: Boolean,
      default: false
    },
    completionInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
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
    
    // Customer satisfaction
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      trim: true,
      default: ''
    },
    
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
  serviceSchema.index({ serviceNumber: 1 });
  serviceSchema.index({ serviceDate: -1 });
  serviceSchema.index({ customerId: 1 });
  serviceSchema.index({ status: 1 });
  serviceSchema.index({ priority: 1 });
  serviceSchema.index({ category: 1 });
  serviceSchema.index({ createdBy: 1 });
  serviceSchema.index({ isDeleted: 1 });
  serviceSchema.index({ createdAt: -1 });

  // Compound indexes
  serviceSchema.index({ serviceDate: -1, status: 1 });
  serviceSchema.index({ customerId: 1, serviceDate: -1 });
  serviceSchema.index({ status: 1, priority: -1 });
  serviceSchema.index({ estimatedDelivery: 1, status: 1 });

  // Virtual for service duration
  serviceSchema.virtual('serviceDuration').get(function() {
    if (this.startedAt && this.completedAt) {
      return Math.ceil((this.completedAt - this.startedAt) / (1000 * 60 * 60 * 24)); // days
    }
    return null;
  });

  // Virtual for warranty end date calculation
  serviceSchema.virtual('warrantyEndDate').get(function() {
    if (this.completionDetails && this.completionDetails.warrantyPeriod > 0) {
      const startDate = this.completionDetails.warrantyStartDate || this.completedAt;
      if (startDate) {
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + this.completionDetails.warrantyPeriod);
        return endDate;
      }
    }
    return null;
  });

  // Virtual for overdue status
  serviceSchema.virtual('isOverdue').get(function() {
    if (this.estimatedDelivery && this.status !== 'completed' && this.status !== 'cancelled') {
      return new Date() > this.estimatedDelivery;
    }
    return false;
  });

  // Instance Methods

  // Update status with history tracking
  serviceSchema.methods.updateStatus = function(newStatus, userId, reason = '', notes = '') {
    const oldStatus = this.status;
    
    // Add to status history
    this.statusHistory.push({
      status: newStatus,
      changedBy: userId,
      changedAt: new Date(),
      reason: reason,
      notes: notes
    });
    
    // Update current status
    this.status = newStatus;
    this.updatedBy = userId;
    
    // Update timeline fields
    if (newStatus === 'in-progress' && !this.startedAt) {
      this.startedAt = new Date();
    } else if (newStatus === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
      if (!this.actualDelivery) {
        this.actualDelivery = new Date();
      }
    }
    
    return this.save();
  };

  // Complete service
  serviceSchema.methods.completeService = function(completionData, userId) {
    // Update completion details
    this.completionDetails = {
      workPerformed: completionData.workPerformed,
      partsReplaced: completionData.partsReplaced || [],
      completionImage: completionData.completionImage || null,
      warrantyPeriod: completionData.warrantyPeriod || 0,
      warrantyStartDate: new Date(),
      qualityNotes: completionData.qualityNotes || ''
    };
    
    // Update costs
    this.actualCost = completionData.actualCost || this.estimatedCost;
    this.balanceAmount = Math.max(0, this.actualCost - this.advancePaid);
    
    // Update status
    this.updateStatus('completed', userId, 'Service completed', completionData.completionNotes || '');
    
    // Set completion and delivery dates
    this.completedAt = new Date();
    this.actualDelivery = new Date();
    
    return this.save();
  };

  // Add note
  serviceSchema.methods.addNote = function(note, userId, isInternal = false) {
    this.notes.push({
      note: note,
      addedBy: userId,
      addedAt: new Date(),
      isInternal: isInternal
    });
    
    return this.save();
  };

  // Calculate total cost including parts
  serviceSchema.methods.calculateTotalCost = function() {
    let totalPartsCost = 0;
    if (this.completionDetails && this.completionDetails.partsReplaced) {
      totalPartsCost = this.completionDetails.partsReplaced.reduce((sum, part) => sum + (part.partCost || 0), 0);
    }
    
    return this.actualCost + totalPartsCost;
  };

  // Set rating and feedback
  serviceSchema.methods.setRating = function(rating, feedback = '') {
    this.rating = rating;
    this.feedback = feedback;
    
    return this.save();
  };

  // Cancel service
  serviceSchema.methods.cancel = function(userId, reason = '') {
    this.updateStatus('cancelled', userId, reason);
    
    return this.save();
  };

  // Soft delete
  serviceSchema.methods.softDelete = function(userId, reason = 'Deleted by user') {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    
    this.addNote(`Service deleted: ${reason}`, userId, true);
    
    return this.save();
  };

  // Static Methods

  // Generate service number
  serviceSchema.statics.generateServiceNumber = async function() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const prefix = `SR${year}${month}${day}`;
    
    // Find the last service number for today
    const lastService = await this.findOne({
      serviceNumber: { $regex: `^${prefix}` }
    }).sort({ serviceNumber: -1 });
    
    let sequence = 1;
    if (lastService) {
      const lastSequence = parseInt(lastService.serviceNumber.slice(-3));
      sequence = lastSequence + 1;
    }
    
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  };

  // Get services by status
  serviceSchema.statics.getServicesByStatus = function(status) {
    return this.find({
      status: status,
      isDeleted: false
    })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'username fullName')
      .sort({ serviceDate: -1 });
  };

  // Get services by date range
  serviceSchema.statics.getServicesByDateRange = function(startDate, endDate, options = {}) {
    const query = {
      serviceDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      isDeleted: false,
      ...options
    };
    
    return this.find(query)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'username fullName')
      .sort({ serviceDate: -1 });
  };

  // Get overdue services
  serviceSchema.statics.getOverdueServices = function() {
    return this.find({
      estimatedDelivery: { $lt: new Date() },
      status: { $in: ['pending', 'in-progress', 'on-hold'] },
      isDeleted: false
    })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'username fullName')
      .sort({ estimatedDelivery: 1 });
  };

  // Get services by customer
  serviceSchema.statics.getServicesByCustomer = function(customerId) {
    return this.find({
      customerId: customerId,
      isDeleted: false
    })
      .populate('createdBy', 'username fullName')
      .sort({ serviceDate: -1 });
  };

  // Get service statistics
  serviceSchema.statics.getServiceStats = async function(dateFilter = {}) {
    try {
      const matchQuery = { isDeleted: false, ...dateFilter };
      
      const stats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalServices: { $sum: 1 },
            totalRevenue: { $sum: '$actualCost' },
            averageServiceCost: { $avg: '$actualCost' },
            averageServiceTime: { $avg: '$serviceDuration' }
          }
        }
      ]);
      
      // Get status distribution
      const statusStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Get category distribution
      const categoryStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$actualCost' }
          }
        }
      ]);
      
      // Get priority distribution
      const priorityStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Get average rating
      const ratingStats = await this.aggregate([
        { 
          $match: { 
            ...matchQuery, 
            rating: { $ne: null } 
          } 
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            ratedServices: { $sum: 1 }
          }
        }
      ]);
      
      return {
        overall: stats[0] || {
          totalServices: 0,
          totalRevenue: 0,
          averageServiceCost: 0,
          averageServiceTime: 0
        },
        statusDistribution: statusStats,
        categoryDistribution: categoryStats,
        priorityDistribution: priorityStats,
        customerSatisfaction: ratingStats[0] || {
          averageRating: 0,
          ratedServices: 0
        }
      };
    } catch (error) {
      throw error;
    }
  };

  // Export data for CSV/Excel
  serviceSchema.statics.getExportData = async function(filters = {}) {
    try {
      const query = { isDeleted: false, ...filters };
      
      const services = await this.find(query)
        .populate('customerId', 'name email phone address')
        .populate('createdBy', 'username fullName')
        .sort({ serviceDate: -1 });
      
      // Update export metadata
      await this.updateMany(query, {
        $inc: { 'exportData.exportCount': 1 },
        $set: { 'exportData.lastExported': new Date() }
      });
      
      return services.map(service => ({
        id: service.id,
        serviceNumber: service.serviceNumber,
        serviceDate: service.serviceDate,
        customerName: service.customerName,
        customerPhone: service.customerId ? service.customerId.phone : 'N/A',
        customerEmail: service.customerId ? service.customerId.email : 'N/A',
        watchBrand: service.watchDetails.brand,
        watchModel: service.watchDetails.model,
        watchName: service.watchName,
        dialColor: service.watchDetails.dialColor,
        movementNo: service.watchDetails.movementNo,
        gender: service.watchDetails.gender,
        caseType: service.watchDetails.caseType,
        strapType: service.watchDetails.strapType,
        issue: service.issue,
        priority: service.priority,
        category: service.category,
        estimatedCost: service.estimatedCost,
        actualCost: service.actualCost,
        advancePaid: service.advancePaid,
        balanceAmount: service.balanceAmount,
        status: service.status,
        startedAt: service.startedAt,
        completedAt: service.completedAt,
        estimatedDelivery: service.estimatedDelivery,
        actualDelivery: service.actualDelivery,
        serviceDuration: service.serviceDuration,
        workPerformed: service.completionDetails ? service.completionDetails.workPerformed : '',
        warrantyPeriod: service.completionDetails ? service.completionDetails.warrantyPeriod : 0,
        rating: service.rating,
        feedback: service.feedback,
        acknowledgementGenerated: service.acknowledgementGenerated,
        completionInvoiceGenerated: service.completionInvoiceGenerated,
        createdBy: service.createdBy ? service.createdBy.fullName : 'Unknown',
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
        notes: service.notes.filter(note => !note.isInternal).map(note => note.note).join('; ')
      }));
    } catch (error) {
      throw error;
    }
  };

  // Pre-save middleware
  serviceSchema.pre('save', async function(next) {
    // Generate service number if not present
    if (!this.serviceNumber) {
      this.serviceNumber = await this.constructor.generateServiceNumber();
    }
    
    // Set watch name from details
    if (this.watchDetails && (!this.watchName || this.isModified('watchDetails'))) {
      this.watchName = `${this.watchDetails.brand} ${this.watchDetails.model}`;
    }
    
    // Calculate balance amount
    if (this.isModified('actualCost') || this.isModified('advancePaid')) {
      this.balanceAmount = Math.max(0, this.actualCost - this.advancePaid);
    }
    
    // Set warranty end date
    if (this.completionDetails && this.completionDetails.warrantyPeriod > 0) {
      const startDate = this.completionDetails.warrantyStartDate || this.completedAt || new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + this.completionDetails.warrantyPeriod);
      this.completionDetails.warrantyEndDate = endDate;
    }
    
    next();
  });

  // Post-save middleware for logging
  serviceSchema.post('save', function(doc) {
    console.log(`Service ${doc.serviceNumber} saved successfully`);
  });

  // Pre-remove middleware
  serviceSchema.pre('remove', function(next) {
    console.log(`Removing service: ${this.serviceNumber}`);
    next();
  });

  module.exports = mongoose.model('Service', serviceSchema);
}