// ZEDSON WATCHCRAFT - User Model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: function() {
      return !this.firstLogin;
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  tempPassword: {
    type: String,
    required: function() {
      return this.firstLogin;
    }
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['admin', 'owner', 'staff'],
    default: 'staff'
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  firstLogin: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.tempPassword;
      return ret;
    }
  }
});

// Index for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') && !this.isModified('tempPassword')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    
    if (this.password) {
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    if (this.tempPassword) {
      this.tempPassword = await bcrypt.hash(this.tempPassword, salt);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (this.firstLogin && this.tempPassword) {
      return await bcrypt.compare(candidatePassword, this.tempPassword);
    } else if (this.password) {
      return await bcrypt.compare(candidatePassword, this.password);
    }
    return false;
  } catch (error) {
    throw error;
  }
};

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static method to create default admin user
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const adminExists = await this.findOne({ username: 'admin' });
    
    if (!adminExists) {
      const defaultAdmin = new this({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        fullName: 'System Administrator',
        email: 'admin@zedsonwatchcraft.com',
        status: 'active',
        firstLogin: false
      });
      
      await defaultAdmin.save();
      console.log('✅ Default admin user created successfully');
      return defaultAdmin;
    }
    
    return adminExists;
  } catch (error) {
    console.error('❌ Error creating default admin user:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);