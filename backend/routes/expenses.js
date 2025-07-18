// ZEDSON WATCHCRAFT - Expenses Routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Expense = require('../models/Expense');
const { auth, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for receipts
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed for receipts!'), false);
    }
  }
});

// @route   GET /api/expenses
// @desc    Get all expenses with pagination, search, and filters
// @access  Private
router.get('/', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      category,
      paymentMethod,
      approvalStatus,
      status,
      dateFrom,
      dateTo,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isDeleted: false };

    // Add search functionality
    if (search) {
      query.$or = [
        { expenseNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'vendor.name': { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (category) query.category = category;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (status) query.status = status;
    if (department) query['allocation.department'] = department;

    // Date range filter
    if (dateFrom || dateTo) {
      query.expenseDate = {};
      if (dateFrom) query.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) query.expenseDate.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get expenses with pagination
    const expenses = await Expense.find(query)
      .populate('createdBy', 'username fullName')
      .populate('approvedBy', 'username fullName')
      .populate('updatedBy', 'username fullName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Expense.countDocuments(query);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: expenses
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expenses'
    });
  }
});

// @route   GET /api/expenses/stats
// @desc    Get expense statistics
// @access  Private
router.get('/stats', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.expenseDate = {};
      if (dateFrom) dateFilter.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.expenseDate.$lte = new Date(dateTo);
    }

    const stats = await Expense.getExpenseStats(dateFilter);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expense statistics'
    });
  }
});

// @route   GET /api/expenses/analytics/:year/:month?
// @desc    Get expense analytics by period
// @access  Private
router.get('/analytics/:year/:month?', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const analytics = await Expense.getBudgetAnalysis(parseInt(year), month ? parseInt(month) : null);

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get expense analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expense analytics'
    });
  }
});

// @route   GET /api/expenses/monthly/:year/:month
// @desc    Get monthly expenses
// @access  Private
router.get('/monthly/:year/:month', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const expenses = await Expense.getExpensesByDateRange(startDate, endDate);

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });

  } catch (error) {
    console.error('Get monthly expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly expenses'
    });
  }
});

// @route   GET /api/expenses/pending-approvals
// @desc    Get expenses pending approval
// @access  Private (Admin/Owner only)
router.get('/pending-approvals', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const pendingExpenses = await Expense.getPendingApprovals();

    res.status(200).json({
      success: true,
      count: pendingExpenses.length,
      data: pendingExpenses
    });

  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending approvals'
    });
  }
});

// @route   GET /api/expenses/recurring-due
// @desc    Get recurring expenses due
// @access  Private
router.get('/recurring-due', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const recurringDue = await Expense.getRecurringExpensesDue();

    res.status(200).json({
      success: true,
      count: recurringDue.length,
      data: recurringDue
    });

  } catch (error) {
    console.error('Get recurring due error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recurring expenses due'
    });
  }
});

// @route   GET /api/expenses/export
// @desc    Export expenses data (CSV format)
// @access  Private
router.get('/export', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    
    // Build filter object
    const exportFilters = {};
    if (filters.category) exportFilters.category = filters.category;
    if (filters.paymentMethod) exportFilters.paymentMethod = filters.paymentMethod;
    if (filters.approvalStatus) exportFilters.approvalStatus = filters.approvalStatus;
    if (filters.status) exportFilters.status = filters.status;
    if (filters.department) exportFilters['allocation.department'] = filters.department;
    if (filters.dateFrom || filters.dateTo) {
      exportFilters.expenseDate = {};
      if (filters.dateFrom) exportFilters.expenseDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) exportFilters.expenseDate.$lte = new Date(filters.dateTo);
    }

    const exportData = await Expense.getExportData(exportFilters);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'Expense Number', 'Expense Date', 'Description', 'Amount', 
        'Tax Rate', 'Tax Amount', 'Total Amount', 'Category', 'Sub Category', 
        'Payment Method', 'Vendor Name', 'Vendor Contact', 'Approval Status', 
        'Status', 'Department', 'Project', 'Is Recurring', 'Recurring Frequency',
        'Has Receipt', 'Created By', 'Approved By', 'Created Date', 'Updated Date',
        'Days Since Expense', 'Notes', 'Tags'
      ].join(',');

      const csvRows = exportData.map(expense => [
        expense.id,
        expense.expenseNumber,
        new Date(expense.expenseDate).toLocaleDateString(),
        `"${expense.description}"`,
        expense.amount,
        expense.taxRate,
        expense.taxAmount,
        expense.totalAmount,
        expense.category,
        expense.subCategory || '',
        expense.paymentMethod,
        expense.vendorName || '',
        expense.vendorContact || '',
        expense.approvalStatus,
        expense.status,
        expense.department,
        expense.project || '',
        expense.isRecurring ? 'Yes' : 'No',
        expense.recurringFrequency || '',
        expense.hasReceipt ? 'Yes' : 'No',
        `"${expense.createdBy}"`,
        expense.approvedBy || '',
        new Date(expense.createdAt).toLocaleDateString(),
        new Date(expense.updatedAt).toLocaleDateString(),
        expense.daysSinceExpense,
        `"${expense.notes}"`,
        expense.tags
      ].join(','));

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=expenses_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      // JSON format
      res.status(200).json({
        success: true,
        count: exportData.length,
        data: exportData,
        exportedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting expenses data'
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'username fullName')
      .populate('approvedBy', 'username fullName')
      .populate('updatedBy', 'username fullName')
      .populate('notes.addedBy', 'username fullName');

    if (!expense || expense.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expense'
    });
  }
});

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Private
router.post('/', auth, checkPermission('expenses'), upload.single('receipt'), async (req, res) => {
  try {
    const {
      expenseDate,
      description,
      amount,
      category,
      subCategory,
      paymentMethod,
      vendor,
      tax,
      allocation,
      tags,
      isRecurring,
      recurringDetails,
      notes
    } = req.body;

    // Validation
    if (!expenseDate || !description || !amount || !category || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide expense date, description, amount, category, and payment method'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    // Parse vendor data if provided as JSON string
    let parsedVendor = {};
    if (vendor) {
      try {
        parsedVendor = typeof vendor === 'string' ? JSON.parse(vendor) : vendor;
      } catch (error) {
        parsedVendor = {};
      }
    }

    // Parse tax data if provided
    let parsedTax = { rate: 0, amount: 0, type: 'None' };
    if (tax) {
      try {
        parsedTax = typeof tax === 'string' ? JSON.parse(tax) : tax;
      } catch (error) {
        parsedTax = { rate: 0, amount: 0, type: 'None' };
      }
    }

    // Parse allocation data if provided
    let parsedAllocation = { department: 'general', percentage: 100 };
    if (allocation) {
      try {
        parsedAllocation = typeof allocation === 'string' ? JSON.parse(allocation) : allocation;
      } catch (error) {
        parsedAllocation = { department: 'general', percentage: 100 };
      }
    }

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        parsedTags = [];
      }
    }

    // Create expense
    const expense = new Expense({
      expenseDate: new Date(expenseDate),
      description,
      amount: parseFloat(amount),
      category,
      subCategory,
      paymentMethod,
      vendor: parsedVendor,
      tax: parsedTax,
      allocation: parsedAllocation,
      tags: parsedTags,
      createdBy: req.user._id
    });

    // Handle receipt upload
    if (req.file) {
      expense.uploadReceipt(req.file);
    }

    // Handle recurring expense setup
    if (isRecurring === 'true' && recurringDetails) {
      try {
        const recurring = typeof recurringDetails === 'string' ? JSON.parse(recurringDetails) : recurringDetails;
        expense.setRecurring(recurring.frequency, recurring.endDate ? new Date(recurring.endDate) : null);
      } catch (error) {
        console.error('Error setting recurring details:', error);
      }
    }

    await expense.save();

    // Add notes if provided
    if (notes) {
      try {
        const notesArray = typeof notes === 'string' ? JSON.parse(notes) : notes;
        if (Array.isArray(notesArray)) {
          for (const note of notesArray) {
            await expense.addNote(note, req.user._id);
          }
        }
      } catch (error) {
        console.error('Error adding notes:', error);
      }
    }

    // Populate for response
    await expense.populate([
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });

  } catch (error) {
    console.error('Create expense error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({
        success: false,
        message: message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating expense'
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private (Non-staff only)
router.put('/:id', auth, authorize('admin', 'owner'), upload.single('receipt'), async (req, res) => {
  try {
    const {
      expenseDate,
      description,
      amount,
      category,
      subCategory,
      paymentMethod,
      vendor,
      tax,
      allocation,
      tags
    } = req.body;

    // Find expense
    const expense = await Expense.findById(req.params.id);

    if (!expense || expense.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Update fields
    if (expenseDate) expense.expenseDate = new Date(expenseDate);
    if (description) expense.description = description;
    if (amount !== undefined) {
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than zero'
        });
      }
      expense.amount = parseFloat(amount);
    }
    if (category) expense.category = category;
    if (subCategory) expense.subCategory = subCategory;
    if (paymentMethod) expense.paymentMethod = paymentMethod;

    // Update vendor data
    if (vendor) {
      try {
        expense.vendor = typeof vendor === 'string' ? JSON.parse(vendor) : vendor;
      } catch (error) {
        console.error('Error parsing vendor data:', error);
      }
    }

    // Update tax data
    if (tax) {
      try {
        expense.tax = typeof tax === 'string' ? JSON.parse(tax) : tax;
      } catch (error) {
        console.error('Error parsing tax data:', error);
      }
    }

    // Update allocation data
    if (allocation) {
      try {
        expense.allocation = typeof allocation === 'string' ? JSON.parse(allocation) : allocation;
      } catch (error) {
        console.error('Error parsing allocation data:', error);
      }
    }

    // Update tags
    if (tags) {
      try {
        expense.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        console.error('Error parsing tags:', error);
      }
    }

    // Handle new receipt upload
    if (req.file) {
      expense.uploadReceipt(req.file);
    }

    expense.updatedBy = req.user._id;
    await expense.save();

    // Populate for response
    await expense.populate([
      { path: 'createdBy', select: 'username fullName' },
      { path: 'updatedBy', select: 'username fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating expense'
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Soft delete expense
// @access  Private (Non-staff only)
router.delete('/:id', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { reason = 'Expense deleted via API' } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense || expense.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Soft delete expense
    await expense.softDelete(req.user._id, reason);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting expense'
    });
  }
});

// @route   POST /api/expenses/:id/approve
// @desc    Approve expense
// @access  Private (Admin/Owner only)
router.post('/:id/approve', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { notes = '' } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense || expense.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (expense.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Expense is already approved'
      });
    }

    await expense.approve(req.user._id, notes);

    res.status(200).json({
      success: true,
      message: 'Expense approved successfully',
      data: {
        id: expense._id,
        expenseNumber: expense.expenseNumber,
        approvalStatus: expense.approvalStatus,
        approvedBy: req.user.fullName,
        approvedAt: expense.approvedAt
      }
    });

  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving expense'
    });
  }
});

// @route   POST /api/expenses/:id/reject
// @desc    Reject expense
// @access  Private (Admin/Owner only)
router.post('/:id/reject', auth, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for rejection'
      });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense || expense.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (expense.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Expense is already rejected'
      });
    }

    await expense.reject(req.user._id, reason.trim());

    res.status(200).json({
      success: true,
      message: 'Expense rejected successfully',
      data: {
        id: expense._id,
        expenseNumber: expense.expenseNumber,
        approvalStatus: expense.approvalStatus,
        rejectionReason: expense.rejectionReason
      }
    });

  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting expense'
    });
  }
});

// @route   POST /api/expenses/:id/notes
// @desc    Add note to expense
// @access  Private
router.post('/:id/notes', auth, checkPermission('expenses'), async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a note'
      });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense || expense.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await expense.addNote(note.trim(), req.user._id);
    await expense.populate('notes.addedBy', 'username fullName');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: expense
    });

  } catch (error) {
    console.error('Add expense note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @route   POST /api/expenses/import
// @desc    Bulk import expenses
// @access  Private (Admin/Owner only)
router.post('/import', auth, authorize('admin', 'owner'), upload.single('importFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a CSV file for import'
      });
    }

    // Here you would implement CSV parsing and bulk insert logic
    // For now, just return a success message
    res.status(200).json({
      success: true,
      message: 'Bulk import functionality will be implemented',
      data: {
        filename: req.file.originalname,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Import expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while importing expenses'
    });
  }
});

module.exports = router;