// ================================
// FIXED EXPENSE MODULE - js/expenses.js (COMPLETE WORKING VERSION)
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