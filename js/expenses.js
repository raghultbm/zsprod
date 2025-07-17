// ================================
// UPDATED EXPENSE MODULE - Replace existing js/expenses.js
// ================================

/**
 * Expense Management Module with Complete MongoDB Integration
 */

// Local cache for expenses
let expenses = [];

/**
 * Button state management
 */
function resetButton(button, originalText) {
  if (button) {
    button.textContent = originalText;
    button.disabled = false;
  }
}

function setButtonLoading(button, loadingText) {
  if (button) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return button.dataset.originalText;
  }
  return null;
}

/**
 * Initialize expense module with API integration
 */
async function initializeExpenses() {
  try {
    await loadExpensesFromAPI();
    renderExpenseTable();
    console.log('Expense module initialized with API integration');
  } catch (error) {
    console.error('Expense initialization error:', error);
    Utils.showNotification('Failed to load expenses. Please refresh the page.');
  }
}

/**
 * Load expenses from API
 */
async function loadExpensesFromAPI() {
  try {
    const response = await ExpenseAPI.getExpenses();
    if (response.success) {
      expenses = response.data || [];
      console.log(`Loaded ${expenses.length} expenses from API`);
    }
  } catch (error) {
    console.error('Load expenses error:', error);
    throw error;
  }
}

/**
 * Open Add Expense Modal
 */
function openAddExpenseModal() {
  if (!AuthModule.hasPermission('expenses')) {
    Utils.showNotification('You do not have permission to add expenses.');
    return;
  }
  
  const modal = document.getElementById('addExpenseModal');
  if (!modal) {
    Utils.showNotification('Expense modal not found. Please refresh the page.');
    return;
  }
  
  // Reset form
  const form = modal.querySelector('form');
  if (form) {
    form.reset();
    
    // Set today's date as default
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      resetButton(submitBtn, 'Add Expense');
    }
  }
  
  modal.style.display = 'block';
}

/**
 * Add new expense with API integration
 */
async function addNewExpense(event) {
  event.preventDefault();
  
  if (!AuthModule.hasPermission('expenses')) {
    Utils.showNotification('You do not have permission to add expenses.');
    return;
  }

  const date = document.getElementById('expenseDate').value;
  const description = document.getElementById('expenseDescription').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const category = document.getElementById('expenseCategory').value || 'Other';
  const paymentMethod = document.getElementById('expensePaymentMethod').value || 'Cash';
  const notes = document.getElementById('expenseNotes').value.trim();
  
  // Validation
  if (!date || !description || !amount) {
    Utils.showNotification('Please fill in all required fields');
    return;
  }

  if (amount <= 0) {
    Utils.showNotification('Amount must be greater than zero');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = setButtonLoading(submitBtn, 'Adding Expense...');

  try {
    const expenseData = {
      date,
      description,
      amount,
      category,
      paymentMethod,
      notes
    };

    const response = await ExpenseAPI.createExpense(expenseData);

    if (response.success) {
      expenses.push(response.data);
      renderExpenseTable();
      if (window.updateDashboard) {
        updateDashboard();
      }
      
      closeModal('addExpenseModal');
      event.target.reset();
      
      Utils.showNotification(`Expense added successfully! ${description} - ${Utils.formatCurrency(amount)}`);
    }

  } catch (error) {
    console.error('Add expense error:', error);
    Utils.showNotification(error.message || 'Failed to add expense. Please try again.');
  } finally {
    resetButton(submitBtn, originalText || 'Add Expense');
  }
}

/**
 * Edit expense
 */
function editExpense(expenseId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot edit expenses.');
    return;
  }
  
  const expense = expenses.find(e => e.id === expenseId);
  if (!expense) {
    Utils.showNotification('Expense not found.');
    return;
  }

  // Create edit modal
  const editModal = document.createElement('div');
  editModal.className = 'modal';
  editModal.id = 'editExpenseModal';
  editModal.style.display = 'block';
  editModal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="closeEditExpenseModal()">&times;</span>
      <h2>Edit Expense</h2>
      <form onsubmit="updateExpense(event, '${expenseId}')">
        <div class="form-group">
          <label>Date:</label>
          <input type="date" id="editExpenseDate" value="${expense.date.split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea id="editExpenseDescription" rows="3" required>${expense.description}</textarea>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>Amount (₹):</label>
            <input type="number" id="editExpenseAmount" value="${expense.amount}" required min="0.01" step="0.01">
          </div>
          <div class="form-group">
            <label>Category:</label>
            <select id="editExpenseCategory">
              <option value="Office Supplies" ${expense.category === 'Office Supplies' ? 'selected' : ''}>Office Supplies</option>
              <option value="Rent" ${expense.category === 'Rent' ? 'selected' : ''}>Rent</option>
              <option value="Utilities" ${expense.category === 'Utilities' ? 'selected' : ''}>Utilities</option>
              <option value="Marketing" ${expense.category === 'Marketing' ? 'selected' : ''}>Marketing</option>
              <option value="Travel" ${expense.category === 'Travel' ? 'selected' : ''}>Travel</option>
              <option value="Equipment" ${expense.category === 'Equipment' ? 'selected' : ''}>Equipment</option>
              <option value="Maintenance" ${expense.category === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="Other" ${expense.category === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>Payment Method:</label>
            <select id="editExpensePaymentMethod">
              <option value="Cash" ${expense.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
              <option value="Bank Transfer" ${expense.paymentMethod === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
              <option value="Card" ${expense.paymentMethod === 'Card' ? 'selected' : ''}>Card</option>
              <option value="Cheque" ${expense.paymentMethod === 'Cheque' ? 'selected' : ''}>Cheque</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes:</label>
            <textarea id="editExpenseNotes" rows="2">${expense.notes || ''}</textarea>
          </div>
        </div>
        <div class="grid grid-2">
          <button type="button" class="btn btn-danger" onclick="closeEditExpenseModal()">Cancel</button>
          <button type="submit" class="btn">Update Expense</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(editModal);
}

/**
 * Close edit expense modal
 */
function closeEditExpenseModal() {
  const modal = document.getElementById('editExpenseModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Update expense
 */
async function updateExpense(event, expenseId) {
  event.preventDefault();
  
  const expense = expenses.find(e => e.id === expenseId);
  if (!expense) {
    Utils.showNotification('Expense not found.');
    return;
  }

  const date = document.getElementById('editExpenseDate').value;
  const description = document.getElementById('editExpenseDescription').value.trim();
  const amount = parseFloat(document.getElementById('editExpenseAmount').value);
  const category = document.getElementById('editExpenseCategory').value;
  const paymentMethod = document.getElementById('editExpensePaymentMethod').value;
  const notes = document.getElementById('editExpenseNotes').value.trim();

  // Validation
  if (!date || !description || !amount || amount <= 0) {
    Utils.showNotification('Please fill in all fields correctly.');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = setButtonLoading(submitBtn, 'Updating...');

  try {
    const expenseData = {
      date,
      description,
      amount,
      category,
      paymentMethod,
      notes
    };

    const response = await ExpenseAPI.updateExpense(expenseId, expenseData);

    if (response.success) {
      // Update local cache
      const expenseIndex = expenses.findIndex(e => e.id === expenseId);
      if (expenseIndex !== -1) {
        expenses[expenseIndex] = response.data;
      }
      
      renderExpenseTable();
      if (window.updateDashboard) {
        updateDashboard();
      }
      
      closeEditExpenseModal();
      Utils.showNotification('Expense updated successfully!');
    }

  } catch (error) {
    console.error('Update expense error:', error);
    Utils.showNotification(error.message || 'Failed to update expense. Please try again.');
  } finally {
    resetButton(submitBtn, originalText || 'Update Expense');
  }
}

/**
 * Delete expense
 */
async function deleteExpense(expenseId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot delete expenses.');
    return;
  }

  const expense = expenses.find(e => e.id === expenseId);
  if (!expense) {
    Utils.showNotification('Expense not found.');
    return;
  }

  if (confirm(`Are you sure you want to delete expense "${expense.description}"?`)) {
    try {
      const response = await ExpenseAPI.deleteExpense(expenseId);
      
      if (response.success) {
        expenses = expenses.filter(e => e.id !== expenseId);
        renderExpenseTable();
        if (window.updateDashboard) {
          updateDashboard();
        }
        Utils.showNotification('Expense deleted successfully!');
      }

    } catch (error) {
      console.error('Delete expense error:', error);
      Utils.showNotification(error.message || 'Failed to delete expense. Please try again.');
    }
  }
}

/**
 * Search expenses
 */
function searchExpenses(query) {
  const tbody = document.getElementById('expenseTableBody');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(query.toLowerCase())) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Get expense statistics
 */
async function getExpenseStats() {
  try {
    const response = await ExpenseAPI.getExpenseStats();
    if (response.success) {
      return response.data;
    }
  } catch (error) {
    console.error('Get expense stats error:', error);
  }
  
  // Fallback to local calculation
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
  
  // Today's expenses
  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses
    .filter(expense => expense.date.split('T')[0] === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  return {
    totalExpenses,
    totalAmount,
    averageExpense,
    todayExpenses
  };
}

/**
 * Get expenses by date range
 */
function getExpensesByDateRange(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= from && expenseDate <= to;
  });
}

/**
 * Get expenses by month and year
 */
function getExpensesByMonth(month, year) {
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === parseInt(month) && expenseDate.getFullYear() === parseInt(year);
  });
}

/**
 * Render expense table
 */
function renderExpenseTable() {
  const tbody = document.getElementById('expenseTableBody');
  if (!tbody) {
    console.error('Expense table body not found');
    return;
  }
  
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  tbody.innerHTML = '';
  
  if (expenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #999; padding: 20px;">
          No expenses recorded yet. Click "Add New Expense" to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sortedExpenses.forEach((expense, index) => {
    const row = document.createElement('tr');
    
    let actionButtons = '';
    if (!isStaff) {
      actionButtons = `
        <button class="btn btn-sm" onclick="editExpense('${expense.id}')" title="Edit Expense">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteExpense('${expense.id}')" title="Delete Expense">Delete</button>
      `;
    } else {
      actionButtons = '<span style="color: #999; font-size: 12px;">View Only</span>';
    }
    
    const formattedDate = new Date(expense.date).toLocaleDateString('en-IN');
    
    row.innerHTML = `
      <td class="serial-number">${index + 1}</td>
      <td>${formattedDate}</td>
      <td>
        ${Utils.sanitizeHtml(expense.description)}<br>
        <small style="color: #666;">Category: ${Utils.sanitizeHtml(expense.category)}</small>
      </td>
      <td><strong style="color: #dc3545;">${Utils.formatCurrency(expense.amount)}</strong></td>
      <td>${actionButtons}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  console.log('Expense table rendered successfully with API data');
}

/**
 * Refresh expenses from API
 */
async function refreshExpenses() {
  try {
    await loadExpensesFromAPI();
    renderExpenseTable();
    console.log('Expenses refreshed from API');
  } catch (error) {
    console.error('Refresh expenses error:', error);
    Utils.showNotification('Failed to refresh expenses data.');
  }
}

// Make functions globally available
window.updateExpense = updateExpense;
window.closeEditExpenseModal = closeEditExpenseModal;

// Export functions for global use
window.ExpenseModule = {
  initializeExpenses,
  loadExpensesFromAPI,
  openAddExpenseModal,
  addNewExpense,
  editExpense,
  updateExpense,
  deleteExpense,
  searchExpenses,
  getExpenseStats,
  getExpensesByDateRange,
  getExpensesByMonth,
  renderExpenseTable,
  refreshExpenses,
  resetButton,
  setButtonLoading,
  expenses // For access by other modules
};

// ================================
// UPDATED INVOICE MODULE - Replace existing js/invoices.js
// ================================

/**
 * Invoice Management Module with Complete MongoDB Integration
 */

// Local cache for invoices
let invoices = [];

/**
 * Initialize invoice module with API integration
 */
async function initializeInvoices() {
  try {
    await loadInvoicesFromAPI();
    renderInvoiceTable();
    console.log('Invoice module initialized with API integration');
  } catch (error) {
    console.error('Invoice initialization error:', error);
    Utils.showNotification('Failed to load invoices. Please refresh the page.');
  }
}

/**
 * Load invoices from API
 */
async function loadInvoicesFromAPI() {
  try {
    const response = await InvoiceAPI.getInvoices();
    if (response.success) {
      invoices = response.data || [];
      console.log(`Loaded ${invoices.length} invoices from API`);
    }
  } catch (error) {
    console.error('Load invoices error:', error);
    throw error;
  }
}

/**
 * Generate sales invoice
 */
async function generateSalesInvoice(saleData) {
  try {
    const response = await InvoiceAPI.generateSalesInvoice(saleData.id);
    if (response.success) {
      invoices.push(response.data);
      renderInvoiceTable();
      Utils.showNotification('Sales invoice generated successfully!');
      return response.data;
    }
  } catch (error) {
    console.error('Generate sales invoice error:', error);
    throw error;
  }
}

/**
 * Generate service invoice
 */
async function generateServiceInvoice(serviceData, type) {
  try {
    const response = await InvoiceAPI.generateServiceInvoice(serviceData.id, type);
    if (response.success) {
      invoices.push(response.data);
      renderInvoiceTable();
      Utils.showNotification(`${type} generated successfully!`);
      return response.data;
    }
  } catch (error) {
    console.error('Generate service invoice error:', error);
    throw error;
  }
}

/**
 * View invoice
 */
async function viewInvoice(invoiceId) {
  try {
    const response = await InvoiceAPI.getInvoice(invoiceId);
    if (response.success) {
      const invoice = response.data;
      let invoiceHTML = '';

      if (invoice.type === 'Sales') {
        if (window.InvoiceTemplates && window.InvoiceTemplates.createSalesInvoiceHTML) {
          invoiceHTML = window.InvoiceTemplates.createSalesInvoiceHTML(invoice.invoiceData);
        }
      } else if (invoice.type === 'Service Completion') {
        if (window.InvoiceTemplates && window.InvoiceTemplates.createServiceCompletionHTML) {
          invoiceHTML = window.InvoiceTemplates.createServiceCompletionHTML(invoice.invoiceData);
        }
      } else if (invoice.type === 'Service Acknowledgement') {
        if (window.InvoiceTemplates && window.InvoiceTemplates.createServiceAcknowledgementHTML) {
          invoiceHTML = window.InvoiceTemplates.createServiceAcknowledgementHTML(invoice.invoiceData);
        }
      }

      if (invoiceHTML) {
        document.getElementById('invoicePreviewContent').innerHTML = invoiceHTML;
        document.getElementById('invoicePreviewModal').style.display = 'block';
      } else {
        Utils.showNotification('Invoice template not available');
      }
    }
  } catch (error) {
    console.error('View invoice error:', error);
    Utils.showNotification('Failed to view invoice.');
  }
}

/**
 * Print invoice
 */
function printInvoice() {
  const printContent = document.getElementById('invoicePreviewContent').innerHTML;
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ZEDSON WATCHCRAFT - Invoice</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${printContent}
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print(); window.close();" style="padding: 10px 20px; background: #1a237e; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
          <button onclick="window.close();" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
    
  } else {
    Utils.showNotification('Please allow pop-ups for printing functionality');
  }
}

/**
 * Search invoices
 */
function searchInvoices(query) {
  const tbody = document.getElementById('invoiceTableBody');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(query.toLowerCase())) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Filter invoices by type
 */
function filterInvoicesByType() {
  const filterValue = document.getElementById('invoiceTypeFilter').value;
  const tbody = document.getElementById('invoiceTableBody');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const typeCell = row.cells[2]; // Type column
    if (typeCell) {
      const typeText = typeCell.textContent.trim();
      if (!filterValue || typeText === filterValue) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

/**
 * Get invoice statistics
 */
async function getInvoiceStats() {
  try {
    const response = await InvoiceAPI.getInvoiceStats();
    if (response.success) {
      return response.data;
    }
  } catch (error) {
    console.error('Get invoice stats error:', error);
  }
  
  // Fallback to local calculation
  const totalInvoices = invoices.length;
  const salesInvoices = invoices.filter(inv => inv.type === 'Sales').length;
  const serviceCompletions = invoices.filter(inv => inv.type === 'Service Completion').length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  
  return {
    totalInvoices,
    salesInvoices,
    serviceCompletions,
    totalRevenue
  };
}

/**
 * Get invoices for a specific transaction
 */
async function getInvoicesForTransaction(transactionId, transactionType) {
  try {
    const response = await InvoiceAPI.getInvoicesByTransaction(transactionId, transactionType);
    if (response.success) {
      return response.data;
    }
  } catch (error) {
    console.error('Get invoices for transaction error:', error);
  }
  return [];
}

/**
 * Render invoice table
 */
function renderInvoiceTable() {
  const tbody = document.getElementById('invoiceTableBody');
  if (!tbody) {
    console.error('Invoice table body not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: #999; padding: 20px;">
          No invoices generated yet. Invoices are automatically created when sales and services are completed.
        </td>
      </tr>
    `;
    return;
  }
  
  // Filter out Service Acknowledgements and sort by date (newest first)
  const displayInvoices = invoices
    .filter(inv => inv.type !== 'Service Acknowledgement')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  displayInvoices.forEach((invoice, index) => {
    const row = document.createElement('tr');
    
    let details = '';
    if (invoice.type === 'Sales') {
      details = `${invoice.invoiceData.watchName} (${invoice.invoiceData.watchCode})`;
    } else {
      details = `${invoice.invoiceData.watchName} - ${invoice.invoiceData.brand} ${invoice.invoiceData.model}`;
    }
    
    const statusClass = invoice.status === 'generated' ? 'completed' : 'pending';
    const date = new Date(invoice.createdAt).toLocaleDateString('en-IN');
    
    row.innerHTML = `
      <td class="serial-number">${index + 1}</td>
      <td><strong>${Utils.sanitizeHtml(invoice.invoiceNo)}</strong></td>
      <td><span class="status ${invoice.type.toLowerCase().replace(' ', '-')}">${Utils.sanitizeHtml(invoice.type)}</span></td>
      <td>${date}</td>
      <td class="customer-info">
        <div class="customer-name">${Utils.sanitizeHtml(invoice.customerId.name)}</div>
        <div class="customer-mobile">${Utils.sanitizeHtml(invoice.customerId.phone)}</div>
      </td>
      <td>${Utils.sanitizeHtml(details)}</td>
      <td>${invoice.amount > 0 ? Utils.formatCurrency(invoice.amount) : '-'}</td>
      <td><span class="status ${statusClass}">${Utils.sanitizeHtml(invoice.status)}</span></td>
      <td>
        <button class="btn btn-sm" onclick="viewInvoice('${invoice.id}')" title="View Invoice">View</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  console.log('Invoice table rendered successfully with API data');
}

/**
 * Refresh invoices from API
 */
async function refreshInvoices() {
  try {
    await loadInvoicesFromAPI();
    renderInvoiceTable();
    console.log('Invoices refreshed from API');
  } catch (error) {
    console.error('Refresh invoices error:', error);
    Utils.showNotification('Failed to refresh invoices data.');
  }
}

// Make functions globally available
window.viewInvoice = viewInvoice;
window.printInvoice = printInvoice;
window.searchInvoices = searchInvoices;
window.filterInvoicesByType = filterInvoicesByType;

// Export functions for global use
window.InvoiceModule = {
  initializeInvoices,
  loadInvoicesFromAPI,
  generateSalesInvoice,
  generateServiceInvoice,
  viewInvoice,
  printInvoice,
  searchInvoices,
  filterInvoicesByType,
  getInvoiceStats,
  getInvoicesForTransaction,
  renderInvoiceTable,
  refreshInvoices,
  invoices // For access by other modules
};

// ================================
// UPDATED APP-CORE.JS - Integration Point
// ================================

/**
 * Updated initializeModulesAfterLogin function to include all modules
 */
async function initializeModulesAfterLogin() {
  try {
    console.log('Initializing all modules after login...');
    
    // Initialize all modules with API integration
    if (window.CustomerModule) {
      await CustomerModule.initializeCustomers();
    }
    
    if (window.InventoryModule) {
      await InventoryModule.initializeInventory();
    }
    
    if (window.SalesModule) {
      await SalesModule.initializeSales();
    }
    
    if (window.ServiceModule) {
      await ServiceModule.initializeServices();
    }
    
    if (window.ExpenseModule) {
      await ExpenseModule.initializeExpenses();
    }
    
    if (window.InvoiceModule) {
      await InvoiceModule.initializeInvoices();
    }
    
    // Update dashboard with all data
    updateDashboard();
    
    console.log('All modules initialized successfully with MongoDB integration');
    
  } catch (error) {
    console.error('Error initializing modules after login:', error);
    Utils.showNotification('Error loading application data. Please refresh the page.');
  }
}

// Update the existing function in app-core.js
if (window.AppCoreModule) {
  window.AppCoreModule.initializeModulesAfterLogin = initializeModulesAfterLogin;
}