// ZEDSON WATCHCRAFT - Expense Model (FIXED)
const mongoose = require('mongoose');

// Check if model already exists to prevent overwrite error
if (mongoose.models.Expense) {
  module.exports = mongoose.models.Expense;
} else {
  const receiptSchema = new mongoose.Schema({
    filename: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    path: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: Number,
      required: true,
      min: [0, 'File size cannot be negative']
    },
    mimetype: {
      type: String,
      required: true,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
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

  const expenseSchema = new mongoose.Schema({
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    expenseDate: {
      type: Date,
      required: [true, 'Expense date is required'],
      validate: {
        validator: function(v) {
          return v <= new Date();
        },
        message: 'Expense date cannot be in the future'
      }
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: [
        'office-supplies',
        'utilities',
        'rent',
        'maintenance',
        'tools-equipment',
        'marketing',
        'travel',
        'food-beverages',
        'professional-services',
        'insurance',
        'taxes',
        'miscellaneous'
      ],
      default: 'miscellaneous'
    },
    subCategory: {
      type: String,
      trim: true,
      maxlength: [100, 'Sub-category cannot exceed 100 characters']
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Other']
    },
    vendor: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Vendor name cannot exceed 100 characters']
      },
      contact: {
        type: String,
        trim: true,
        maxlength: [50, 'Vendor contact cannot exceed 50 characters']
      },
      address: {
        type: String,
        trim: true,
        maxlength: [200, 'Vendor address cannot exceed 200 characters']
      }
    },
    receipt: receiptSchema,
    
    // Tax and financial details
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
    
    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto-approved'],
      default: 'auto-approved'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Status and tracking
    status: {
      type: String,
      enum: ['draft', 'submitted', 'processed', 'cancelled'],
      default: 'processed'
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringDetails: {
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
        default: null
      },
      nextDueDate: {
        type: Date,
        default: null
      },
      endDate: {
        type: Date,
        default: null
      }
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
      trim: true,
      maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    
    // Project/department allocation
    allocation: {
      department: {
        type: String,
        enum: ['sales', 'service', 'administration', 'marketing', 'general'],
        default: 'general'
      },
      project: {
        type: String,
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters']
      },
      percentage: {
        type: Number,
        min: [0, 'Allocation percentage cannot be negative'],
        max: [100, 'Allocation percentage cannot exceed 100'],
        default: 100
      }
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
  expenseSchema.index({ expenseNumber: 1 });
  expenseSchema.index({ expenseDate: -1 });
  expenseSchema.index({ category: 1 });
  expenseSchema.index({ paymentMethod: 1 });
  expenseSchema.index({ approvalStatus: 1 });
  expenseSchema.index({ status: 1 });
  expenseSchema.index({ createdBy: 1 });
  expenseSchema.index({ isDeleted: 1 });
  expenseSchema.index({ createdAt: -1 });

  // Compound indexes
  expenseSchema.index({ expenseDate: -1, category: 1 });
  expenseSchema.index({ createdBy: 1, expenseDate: -1 });
  expenseSchema.index({ approvalStatus: 1, expenseDate: -1 });
  expenseSchema.index({ 'allocation.department': 1, expenseDate: -1 });

  // Virtual for total amount including tax
  expenseSchema.virtual('totalAmount').get(function() {
    return this.amount + (this.tax.amount || 0);
  });

  // Virtual for formatted category
  expenseSchema.virtual('formattedCategory').get(function() {
    return this.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  });

  // Virtual for days since expense
  expenseSchema.virtual('daysSinceExpense').get(function() {
    const today = new Date();
    const expenseDate = new Date(this.expenseDate);
    const diffTime = Math.abs(today - expenseDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  });

  // Instance Methods

  // Calculate tax amount
  expenseSchema.methods.calculateTax = function() {
    if (this.tax.rate > 0) {
      this.tax.amount = (this.amount * this.tax.rate) / 100;
    } else {
      this.tax.amount = 0;
    }
    return this.tax.amount;
  };

  // Add note
  expenseSchema.methods.addNote = function(note, userId) {
    this.notes.push({
      note: note,
      addedBy: userId,
      addedAt: new Date()
    });
    
    return this.save();
  };

  // Approve expense
  expenseSchema.methods.approve = function(userId, notes = '') {
    this.approvalStatus = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.updatedBy = userId;
    
    if (notes) {
      this.addNote(`Expense approved: ${notes}`, userId);
    }
    
    return this.save();
  };

  // Reject expense
  expenseSchema.methods.reject = function(userId, reason) {
    this.approvalStatus = 'rejected';
    this.rejectionReason = reason;
    this.updatedBy = userId;
    
    this.addNote(`Expense rejected: ${reason}`, userId);
    
    return this.save();
  };

  // Upload receipt
  expenseSchema.methods.uploadReceipt = function(receiptData) {
    this.receipt = {
      filename: receiptData.filename,
      originalName: receiptData.originalname,
      path: receiptData.path,
      size: receiptData.size,
      mimetype: receiptData.mimetype,
      uploadedAt: new Date()
    };
    
    return this.save();
  };

  // Set recurring details
  expenseSchema.methods.setRecurring = function(frequency, endDate = null) {
    this.isRecurring = true;
    this.recurringDetails.frequency = frequency;
    this.recurringDetails.endDate = endDate;
    
    // Calculate next due date
    const nextDate = new Date(this.expenseDate);
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    this.recurringDetails.nextDueDate = nextDate;
    
    return this.save();
  };

  // Cancel expense
  expenseSchema.methods.cancel = function(userId, reason = '') {
    this.status = 'cancelled';
    this.updatedBy = userId;
    
    if (reason) {
      this.addNote(`Expense cancelled: ${reason}`, userId);
    }
    
    return this.save();
  };

  // Soft delete
  expenseSchema.methods.softDelete = function(userId, reason = 'Deleted by user') {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    
    this.addNote(`Expense deleted: ${reason}`, userId);
    
    return this.save();
  };

  // Static Methods

  // Generate expense number
  expenseSchema.statics.generateExpenseNumber = async function() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const prefix = `EX${year}${month}${day}`;
    
    // Find the last expense number for today
    const lastExpense = await this.findOne({
      expenseNumber: { $regex: `^${prefix}` }
    }).sort({ expenseNumber: -1 });
    
    let sequence = 1;
    if (lastExpense) {
      const lastSequence = parseInt(lastExpense.expenseNumber.slice(-3));
      sequence = lastSequence + 1;
    }
    
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  };

  // Get expenses by date range
  expenseSchema.statics.getExpensesByDateRange = function(startDate, endDate, options = {}) {
    const query = {
      expenseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      isDeleted: false,
      ...options
    };
    
    return this.find(query)
      .populate('createdBy', 'username fullName')
      .populate('approvedBy', 'username fullName')
      .sort({ expenseDate: -1 });
  };

  // Get expenses by category
  expenseSchema.statics.getExpensesByCategory = function(category) {
    return this.find({
      category: category,
      isDeleted: false
    })
      .populate('createdBy', 'username fullName')
      .sort({ expenseDate: -1 });
  };

  // Get pending approvals
  expenseSchema.statics.getPendingApprovals = function() {
    return this.find({
      approvalStatus: 'pending',
      isDeleted: false
    })
      .populate('createdBy', 'username fullName')
      .sort({ expenseDate: -1 });
  };

  // Get recurring expenses due
  expenseSchema.statics.getRecurringExpensesDue = function() {
    return this.find({
      isRecurring: true,
      'recurringDetails.nextDueDate': { $lte: new Date() },
      isDeleted: false
    })
      .populate('createdBy', 'username fullName')
      .sort({ 'recurringDetails.nextDueDate': 1 });
  };

  // Get expense statistics
  expenseSchema.statics.getExpenseStats = async function(dateFilter = {}) {
    try {
      const matchQuery = { isDeleted: false, approvalStatus: { $ne: 'rejected' }, ...dateFilter };
      
      const stats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalTax: { $sum: '$tax.amount' },
            averageExpense: { $avg: '$amount' }
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
            totalAmount: { $sum: '$amount' },
            percentage: { $avg: 100 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);
      
      // Get payment method distribution
      const paymentStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);
      
      // Get monthly trend
      const monthlyStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' }
            },
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      
      // Get department allocation
      const departmentStats = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$allocation.department',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);
      
      // Calculate total amount including tax
      const totalAmountWithTax = stats[0] ? stats[0].totalAmount + stats[0].totalTax : 0;
      
      return {
        overall: stats[0] ? {
          ...stats[0],
          totalAmountWithTax
        } : {
          totalExpenses: 0,
          totalAmount: 0,
          totalTax: 0,
          averageExpense: 0,
          totalAmountWithTax: 0
        },
        categoryDistribution: categoryStats,
        paymentMethods: paymentStats,
        monthlyTrend: monthlyStats,
        departmentAllocation: departmentStats
      };
    } catch (error) {
      throw error;
    }
  };

  // Export data for CSV/Excel
  expenseSchema.statics.getExportData = async function(filters = {}) {
    try {
      const query = { isDeleted: false, ...filters };
      
      const expenses = await this.find(query)
        .populate('createdBy', 'username fullName')
        .populate('approvedBy', 'username fullName')
        .sort({ expenseDate: -1 });
      
      // Update export metadata
      await this.updateMany(query, {
        $inc: { 'exportData.exportCount': 1 },
        $set: { 'exportData.lastExported': new Date() }
      });
      
      return expenses.map(expense => ({
        id: expense.id,
        expenseNumber: expense.expenseNumber,
        expenseDate: expense.expenseDate,
        description: expense.description,
        amount: expense.amount,
        taxRate: expense.tax.rate,
        taxAmount: expense.tax.amount,
        totalAmount: expense.totalAmount,
        category: expense.formattedCategory,
        subCategory: expense.subCategory || '',
        paymentMethod: expense.paymentMethod,
        vendorName: expense.vendor.name || '',
        vendorContact: expense.vendor.contact || '',
        approvalStatus: expense.approvalStatus,
        status: expense.status,
        department: expense.allocation.department,
        project: expense.allocation.project || '',
        isRecurring: expense.isRecurring,
        recurringFrequency: expense.isRecurring ? expense.recurringDetails.frequency : '',
        hasReceipt: !!expense.receipt,
        createdBy: expense.createdBy ? expense.createdBy.fullName : 'Unknown',
        approvedBy: expense.approvedBy ? expense.approvedBy.fullName : '',
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
        daysSinceExpense: expense.daysSinceExpense,
        notes: expense.notes.map(note => note.note).join('; '),
        tags: expense.tags.join(', ')
      }));
    } catch (error) {
      throw error;
    }
  };

  // Get expenses for budget analysis
  expenseSchema.statics.getBudgetAnalysis = async function(year, month = null) {
    try {
      const matchQuery = {
        isDeleted: false,
        approvalStatus: { $ne: 'rejected' },
        expenseDate: {}
      };
      
      if (month) {
        // Specific month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        matchQuery.expenseDate = { $gte: startDate, $lte: endDate };
      } else {
        // Entire year
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        matchQuery.expenseDate = { $gte: startDate, $lte: endDate };
      }
      
      const analysis = await this.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              category: '$category',
              department: '$allocation.department'
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            averageAmount: { $avg: '$amount' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);
      
      return analysis;
    } catch (error) {
      throw error;
    }
  };

  // Pre-save middleware
  expenseSchema.pre('save', async function(next) {
    // Generate expense number if not present
    if (!this.expenseNumber) {
      this.expenseNumber = await this.constructor.generateExpenseNumber();
    }
    
    // Calculate tax if tax rate is set
    if (this.isModified('amount') || this.isModified('tax.rate')) {
      this.calculateTax();
    }
    
    // Auto-approve if amount is below threshold (₹1000)
    if (this.isNew && this.amount <= 1000 && this.approvalStatus === 'pending') {
      this.approvalStatus = 'auto-approved';
      this.approvedAt = new Date();
    }
    
    next();
  });

  // Post-save middleware for logging
  expenseSchema.post('save', function(doc) {
    console.log(`Expense ${doc.expenseNumber} saved successfully`);
  });

  // Pre-remove middleware
  expenseSchema.pre('remove', function(next) {
    console.log(`Removing expense: ${this.expenseNumber}`);
    next();
  });

  module.exports = mongoose.model('Expense', expenseSchema);
}