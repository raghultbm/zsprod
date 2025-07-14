// ZEDSON WATCHCRAFT - Invoice Model
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Invoice type is required'],
    enum: ['Sales', 'Service Completion', 'Service Acknowledgement']
  },
  subType: {
    type: String,
    required: [true, 'Invoice sub-type is required'],
    trim: true
  },
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
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true,
    default: ''
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Related transaction ID is required']
  },
  relatedType: {
    type: String,
    required: [true, 'Related transaction type is required'],
    enum: ['sale', 'service']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['generated', 'sent', 'paid', 'cancelled'],
    default: 'generated'
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Sales Invoice Specific Fields
  watchName: {
    type: String,
    trim: true
  },
  watchCode: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  
  // Service Invoice Specific Fields
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  dialColor: {
    type: String,
    trim: true
  },
  movementNo: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female']
  },
  caseType: {
    type: String,
    enum: ['Steel', 'Gold Tone', 'Fiber']
  },
  strapType: {
    type: String,
    enum: ['Leather', 'Fiber', 'Steel', 'Gold Plated']
  },
  issue: {
    type: String,
    trim: true
  },
  workPerformed: {
    type: String,
    trim: true
  },
  warrantyPeriod: {
    type: Number,
    min: [0, 'Warranty period cannot be negative'],
    max: [60, 'Warranty period cannot exceed 60 months'],
    default: 0
  },
  completionDate: {
    type: Date
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative']
  },
  
  // Acknowledgement specific flag
  isAcknowledgement: {
    type: Boolean,
    default: false
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
invoiceSchema.index({ invoiceNo: 1 });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ relatedId: 1, relatedType: 1 });
invoiceSchema.index({ addedBy: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ type: 1 });
invoiceSchema.index({ status: 1 });

// Virtual for formatted date
invoiceSchema.virtual('date').get(function() {
  return this.invoiceDate.toLocaleDateString('en-IN');
});

// Virtual for timestamp
invoiceSchema.virtual('timestamp').get(function() {
  return this.invoiceDate.toISOString();
});

// Method to add note
invoiceSchema.methods.addNote = async function(note, addedBy) {
  this.notes.push({
    note,
    addedBy,
    addedAt: new Date()
  });
  return await this.save();
};

// Method to update status
invoiceSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  return await this.save();
};

// Static method to generate unique invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(type) {
  try {
    let prefix = '';
    switch (type) {
      case 'Sales':
        prefix = 'SI';
        break;
      case 'Service Completion':
        prefix = 'SV';
        break;
      case 'Service Acknowledgement':
        prefix = 'ACK';
        break;
      default:
        prefix = 'INV';
    }
    
    // Get current date components
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Find the last invoice for this type and month
    const lastInvoice = await this.findOne({
      invoiceNo: { $regex: `^${prefix}-${year}${month}` }
    }).sort({ invoiceNo: -1 });
    
    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNo.split('-')[1].slice(4));
      sequence = lastSequence + 1;
    }
    
    const invoiceNo = `${prefix}-${year}${month}${sequence.toString().padStart(4, '0')}`;
    return invoiceNo;
  } catch (error) {
    // Fallback to timestamp-based generation
    const timestamp = Date.now().toString().slice(-6);
    const prefix = type === 'Sales' ? 'SI' : type === 'Service Completion' ? 'SV' : 'ACK';
    return `${prefix}-${timestamp}`;
  }
};

// Static method to get invoice statistics
invoiceSchema.statics.getStats = async function() {
  try {
    const totalInvoices = await this.countDocuments({ isAcknowledgement: { $ne: true } });
    const salesInvoices = await this.countDocuments({ type: 'Sales' });
    const serviceCompletions = await this.countDocuments({ type: 'Service Completion' });
    
    const revenueResult = await this.aggregate([
      { $match: { isAcknowledgement: { $ne: true }, amount: { $gt: 0 } } },
      { 
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const averageAmount = revenueResult.length > 0 ? revenueResult[0].averageAmount : 0;
    
    // Monthly revenue breakdown
    const monthlyRevenue = await this.aggregate([
      { 
        $match: { 
          isAcknowledgement: { $ne: true },
          amount: { $gt: 0 },
          invoiceDate: { 
            $gte: new Date(new Date().getFullYear(), 0, 1) // Current year
          }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: '$invoiceDate' },
            year: { $year: '$invoiceDate' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    return {
      totalInvoices,
      salesInvoices,
      serviceCompletions,
      totalRevenue,
      averageAmount,
      monthlyRevenue
    };
  } catch (error) {
    throw error;
  }
};

// Static method to get invoices by transaction
invoiceSchema.statics.getInvoicesByTransaction = async function(transactionId, transactionType) {
  try {
    return await this.find({ 
      relatedId: transactionId, 
      relatedType: transactionType 
    })
    .populate('customerId', 'name phone email')
    .populate('addedBy', 'username fullName')
    .sort({ createdAt: -1 });
  } catch (error) {
    throw error;
  }
};

// Static method to get invoices by customer
invoiceSchema.statics.getInvoicesByCustomer = async function(customerId) {
  try {
    return await this.find({ customerId })
      .populate('addedBy', 'username fullName')
      .sort({ invoiceDate: -1 });
  } catch (error) {
    throw error;
  }
};

// Static method to get invoices by date range
invoiceSchema.statics.getInvoicesByDateRange = async function(fromDate, toDate) {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    
    return await this.find({
      invoiceDate: { $gte: from, $lte: to },
      isAcknowledgement: { $ne: true }
    })
    .populate('customerId', 'name phone email')
    .populate('addedBy', 'username fullName')
    .sort({ invoiceDate: -1 });
  } catch (error) {
    throw error;
  }
};

// Static method to search invoices
invoiceSchema.statics.searchInvoices = async function(searchTerm) {
  try {
    return await this.find({
      $and: [
        { isAcknowledgement: { $ne: true } },
        {
          $or: [
            { invoiceNo: { $regex: searchTerm, $options: 'i' } },
            { customerName: { $regex: searchTerm, $options: 'i' } },
            { customerPhone: { $regex: searchTerm, $options: 'i' } },
            { watchName: { $regex: searchTerm, $options: 'i' } },
            { brand: { $regex: searchTerm, $options: 'i' } },
            { model: { $regex: searchTerm, $options: 'i' } }
          ]
        }
      ]
    })
    .populate('customerId', 'name phone email')
    .populate('addedBy', 'username fullName')
    .sort({ invoiceDate: -1 });
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Invoice', invoiceSchema);