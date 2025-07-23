// ZEDSON WATCHCRAFT - Customer Model (FIXED)
const mongoose = require('mongoose');

// Check if model already exists to prevent overwrite error
if (mongoose.models.Customer) {
  module.exports = mongoose.models.Customer;
} else {
  const customerSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[\+]?[0-9\-\s\(\)]{10,15}$/, 'Please enter a valid phone number']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    purchases: {
      type: Number,
      default: 0,
      min: [0, 'Purchases cannot be negative']
    },
    serviceCount: {
      type: Number,
      default: 0,
      min: [0, 'Service count cannot be negative']
    },
    netValue: {
      type: Number,
      default: 0,
      min: [0, 'Net value cannot be negative']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastPurchaseDate: {
      type: Date,
      default: null
    },
    lastServiceDate: {
      type: Date,
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
    }],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
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
  customerSchema.index({ email: 1 });
  customerSchema.index({ phone: 1 });
  customerSchema.index({ name: 1 });
  customerSchema.index({ addedBy: 1 });
  customerSchema.index({ createdAt: -1 });

  // Virtual for formatted creation date
  customerSchema.virtual('addedDate').get(function() {
    return this.createdAt.toLocaleDateString('en-IN');
  });

  // Method to update net value (will be called from sales/service modules)
  customerSchema.methods.updateNetValue = async function(salesValue = 0, serviceValue = 0) {
    this.netValue = salesValue + serviceValue;
    return await this.save();
  };

  // Method to increment purchase count
  customerSchema.methods.incrementPurchases = async function() {
    this.purchases += 1;
    this.lastPurchaseDate = new Date();
    return await this.save();
  };

  // Method to increment service count
  customerSchema.methods.incrementServices = async function() {
    this.serviceCount += 1;
    this.lastServiceDate = new Date();
    return await this.save();
  };

  // Method to decrement purchase count
  customerSchema.methods.decrementPurchases = async function() {
    if (this.purchases > 0) {
      this.purchases -= 1;
      return await this.save();
    }
    return this;
  };

  // Method to decrement service count
  customerSchema.methods.decrementServices = async function() {
    if (this.serviceCount > 0) {
      this.serviceCount -= 1;
      return await this.save();
    }
    return this;
  };

  // Method to add note
  customerSchema.methods.addNote = async function(note, addedBy) {
    this.notes.push({
      note,
      addedBy,
      addedAt: new Date()
    });
    return await this.save();
  };

  // Static method to get customer statistics
  customerSchema.statics.getStats = async function() {
    try {
      const totalCustomers = await this.countDocuments({ status: 'active' });
      const activeCustomers = await this.countDocuments({ 
        status: 'active',
        $or: [
          { purchases: { $gt: 0 } },
          { serviceCount: { $gt: 0 } }
        ]
      });
      
      const netValueResult = await this.aggregate([
        { $match: { status: 'active' } },
        { 
          $group: {
            _id: null,
            totalNetValue: { $sum: '$netValue' },
            averageNetValue: { $avg: '$netValue' }
          }
        }
      ]);
      
      const totalNetValue = netValueResult.length > 0 ? netValueResult[0].totalNetValue : 0;
      const averageNetValue = netValueResult.length > 0 ? netValueResult[0].averageNetValue : 0;
      
      const topCustomers = await this.find({ status: 'active' })
        .sort({ netValue: -1 })
        .limit(5)
        .select('name email phone netValue');
      
      return {
        totalCustomers,
        activeCustomers,
        totalNetValue,
        averageNetValue,
        topCustomers
      };
    } catch (error) {
      throw error;
    }
  };

  // Pre-save middleware to ensure phone number formatting
  customerSchema.pre('save', function(next) {
    if (this.phone) {
      // Remove any non-digit characters except + and format
      this.phone = this.phone.replace(/[^\d+\-\s\(\)]/g, '');
    }
    next();
  });

  module.exports = mongoose.model('Customer', customerSchema);
}