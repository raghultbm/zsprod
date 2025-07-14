// ZEDSON WATCHCRAFT - Customer Routes
const express = require('express');
const Customer = require('../models/Customer');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', auth, checkPermission('customers'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status = 'active' } = req.query;

    // Build query
    let query = { status };

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get customers with pagination
    const customers = await Customer.find(query)
      .populate('addedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: customers
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customers'
    });
  }
});

// @route   GET /api/customers/stats
// @desc    Get customer statistics
// @access  Private
router.get('/stats', auth, checkPermission('customers'), async (req, res) => {
  try {
    const stats = await Customer.getStats();

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer statistics'
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', auth, checkPermission('customers'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('addedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer'
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', auth, checkPermission('customers'), async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and phone number'
      });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { phone: phone.trim() }
      ]
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email or phone number already exists'
      });
    }

    // Create customer
    const customer = new Customer({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
      addedBy: req.user._id
    });

    await customer.save();

    // Populate addedBy field for response
    await customer.populate('addedBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });

  } catch (error) {
    console.error('Create customer error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Customer with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating customer'
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Find customer
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if email or phone is already taken by another customer
    if (email || phone) {
      const query = { _id: { $ne: customer._id } };
      const conditions = [];

      if (email && email.trim().toLowerCase() !== customer.email) {
        conditions.push({ email: email.trim().toLowerCase() });
      }

      if (phone && phone.trim() !== customer.phone) {
        conditions.push({ phone: phone.trim() });
      }

      if (conditions.length > 0) {
        query.$or = conditions;
        const existingCustomer = await Customer.findOne(query);

        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Another customer with this email or phone number already exists'
          });
        }
      }
    }

    // Update customer
    if (name) customer.name = name.trim();
    if (email) customer.email = email.trim().toLowerCase();
    if (phone) customer.phone = phone.trim();
    if (address !== undefined) customer.address = address.trim();

    await customer.save();

    // Populate addedBy field for response
    await customer.populate('addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });

  } catch (error) {
    console.error('Update customer error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Another customer with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating customer'
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has any transactions (optional business logic)
    // In a real system, you might want to prevent deletion if customer has sales/services
    if (customer.purchases > 0 || customer.serviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing transactions. Consider deactivating instead.'
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting customer'
    });
  }
});

// @route   PATCH /api/customers/:id/status
// @desc    Update customer status (activate/deactivate)
// @access  Private (Non-staff only)
router.patch('/:id/status', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status (active or inactive)'
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.status = status;
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: customer
    });

  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating customer status'
    });
  }
});

// @route   POST /api/customers/:id/notes
// @desc    Add note to customer
// @access  Private
router.post('/:id/notes', auth, checkPermission('customers'), async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a note'
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await customer.addNote(note.trim(), req.user._id);
    await customer.populate('notes.addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: customer
    });

  } catch (error) {
    console.error('Add customer note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @route   PATCH /api/customers/:id/increment-purchases
// @desc    Increment customer purchase count
// @access  Private (Internal use by sales module)
router.patch('/:id/increment-purchases', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await customer.incrementPurchases();

    res.status(200).json({
      success: true,
      message: 'Purchase count incremented',
      data: customer
    });

  } catch (error) {
    console.error('Increment purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating purchase count'
    });
  }
});

// @route   PATCH /api/customers/:id/increment-services
// @desc    Increment customer service count
// @access  Private (Internal use by service module)
router.patch('/:id/increment-services', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await customer.incrementServices();

    res.status(200).json({
      success: true,
      message: 'Service count incremented',
      data: customer
    });

  } catch (error) {
    console.error('Increment services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service count'
    });
  }
});

// @route   PATCH /api/customers/:id/update-net-value
// @desc    Update customer net value
// @access  Private (Internal use by sales/service modules)
router.patch('/:id/update-net-value', auth, async (req, res) => {
  try {
    const { salesValue = 0, serviceValue = 0 } = req.body;

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await customer.updateNetValue(salesValue, serviceValue);

    res.status(200).json({
      success: true,
      message: 'Net value updated',
      data: customer
    });

  } catch (error) {
    console.error('Update net value error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating net value'
    });
  }
});

module.exports = router;