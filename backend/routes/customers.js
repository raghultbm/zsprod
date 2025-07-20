// ZEDSON WATCHCRAFT - Customer Routes
const express = require('express');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/customers
// @desc    Get all customers with pagination and search
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { status };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const customers = await Customer.find(query)
      .populate('addedBy', 'username fullName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: customers.length,
        totalCount: total
      }
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
router.get('/stats', auth, async (req, res) => {
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
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('addedBy', 'username fullName');

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
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      });
    }

    // Check for duplicate email or phone
    const existingCustomer = await Customer.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone }
      ],
      status: 'active'
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email or phone already exists'
      });
    }

    // Create customer
    const customer = new Customer({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
      addedBy: req.user._id
    });

    await customer.save();

    // Populate for response
    await customer.populate('addedBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });

  } catch (error) {
    console.error('Create customer error:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
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
// @access  Private
router.put('/:id', auth, async (req, res) => {
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

    // Check for duplicate email or phone (excluding current customer)
    if (email || phone) {
      const duplicateQuery = {
        _id: { $ne: req.params.id },
        status: 'active',
        $or: []
      };

      if (email) duplicateQuery.$or.push({ email: email.toLowerCase() });
      if (phone) duplicateQuery.$or.push({ phone });

      if (duplicateQuery.$or.length > 0) {
        const existingCustomer = await Customer.findOne(duplicateQuery);

        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Another customer with this email or phone already exists'
          });
        }
      }
    }

    // Update fields
    if (name) customer.name = name.trim();
    if (email) customer.email = email.toLowerCase().trim();
    if (phone) customer.phone = phone.trim();
    if (address !== undefined) customer.address = address.trim();

    await customer.save();

    // Populate for response
    await customer.populate('addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });

  } catch (error) {
    console.error('Update customer error:', error);
    
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
// @desc    Delete customer (soft delete)
// @access  Private
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Soft delete
    customer.status = 'inactive';
    await customer.save();

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
// @desc    Update customer status
// @access  Private (Admin/Owner only)
router.patch('/:id/status', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or inactive'
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
      message: 'Customer status updated successfully',
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
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
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
// @access  Private
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
      message: 'Purchase count incremented successfully',
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
// @access  Private
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
      message: 'Service count incremented successfully',
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
// @access  Private
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
      message: 'Net value updated successfully',
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

// @route   GET /api/customers/export
// @desc    Export customers data
// @access  Private (Admin/Owner only)
router.get('/export', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { format = 'csv', includeStats = false } = req.query;

    const customers = await Customer.find({ status: 'active' })
      .populate('addedBy', 'username fullName')
      .sort({ name: 1 });

    if (format === 'csv') {
      const csvHeader = 'Name,Email,Phone,Address,Purchases,Services,Net Value,Added Date,Added By\n';
      const csvData = customers.map(customer => {
        return [
          `"${customer.name}"`,
          `"${customer.email}"`,
          `"${customer.phone}"`,
          `"${customer.address || ''}"`,
          customer.purchases,
          customer.serviceCount,
          customer.netValue,
          customer.createdAt.toISOString().split('T')[0],
          `"${customer.addedBy ? customer.addedBy.fullName || customer.addedBy.username : 'Unknown'}"`
        ].join(',');
      }).join('\n');

      const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.status(200).json({
        success: true,
        data: {
          data: csvHeader + csvData,
          filename,
          contentType: 'text/csv'
        }
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          customers,
          exportDate: new Date().toISOString(),
          totalCount: customers.length
        }
      });
    }

  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting customers'
    });
  }
});

module.exports = router;