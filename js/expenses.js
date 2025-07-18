// ZEDSON WATCHCRAFT - Expense Management Module (Complete Rebuild)

/**
 * Complete Expense Management System - Rebuilt from scratch
 */

// Expense data storage
let expenses = [];
let nextExpenseId = 1;

/**
 * Initialize the expense module
 */
function initializeExpenses() {
    console.log('Initializing Expense Module...');
    
    // Create the expense modal
    createExpenseModal();
    
    // Render the expense table
    renderExpenseTable();
    
    // Set up global functions
    setupGlobalFunctions();
    
    console.log('Expense Module initialized successfully');
}

/**
 * Create the Add Expense Modal
 */
function createExpenseModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('addExpenseModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="addExpenseModal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="close" id="closeExpenseModal">&times;</span>
                <h2>Add New Expense</h2>
                <form id="addExpenseForm">
                    <div class="form-group">
                        <label for="expenseDate">Date:</label>
                        <input type="date" id="expenseDate" name="expenseDate" required>
                    </div>
                    <div class="form-group">
                        <label for="expenseDescription">Description:</label>
                        <textarea id="expenseDescription" name="expenseDescription" rows="3" required 
                                placeholder="Enter expense description..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="expenseAmount">Amount (₹):</label>
                        <input type="number" id="expenseAmount" name="expenseAmount" 
                               required min="0.01" step="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn" id="submitExpenseBtn">Add Expense</button>
                        <button type="button" class="btn btn-danger" id="cancelExpenseBtn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set up modal event listeners
    setupModalEventListeners();
    
    console.log('Expense modal created');
}

/**
 * Set up modal event listeners
 */
function setupModalEventListeners() {
    const modal = document.getElementById('addExpenseModal');
    const closeBtn = document.getElementById('closeExpenseModal');
    const cancelBtn = document.getElementById('cancelExpenseBtn');
    const form = document.getElementById('addExpenseForm');
    
    // Close modal events
    if (closeBtn) {
        closeBtn.addEventListener('click', closeExpenseModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeExpenseModal);
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeExpenseModal();
            }
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', handleAddExpense);
    }
}

/**
 * Open the Add Expense Modal
 */
function openAddExpenseModal() {
    console.log('Opening Add Expense Modal');
    
    // Check permissions
    if (!AuthModule || !AuthModule.hasPermission('expenses')) {
        Utils.showNotification('You do not have permission to add expenses.');
        return;
    }
    
    // Get the modal
    let modal = document.getElementById('addExpenseModal');
    
    // Create modal if it doesn't exist
    if (!modal) {
        createExpenseModal();
        modal = document.getElementById('addExpenseModal');
    }
    
    if (!modal) {
        console.error('Failed to create expense modal');
        Utils.showNotification('Error: Could not open expense form.');
        return;
    }
    
    // Reset form
    const form = document.getElementById('addExpenseForm');
    if (form) {
        form.reset();
        
        // Set today's date as default
        const dateInput = document.getElementById('expenseDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Log action
    if (window.logAction) {
        logAction('Opened add expense modal');
    }
    
    console.log('Expense modal opened');
}

/**
 * Close the Add Expense Modal
 */
function closeExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Reset form
        const form = document.getElementById('addExpenseForm');
        if (form) {
            form.reset();
        }
    }
    
    console.log('Expense modal closed');
}

/**
 * Handle Add Expense Form Submission
 */
function handleAddExpense(event) {
    event.preventDefault();
    console.log('Handling expense form submission');
    
    // Get form data
    const dateInput = document.getElementById('expenseDate');
    const descriptionInput = document.getElementById('expenseDescription');
    const amountInput = document.getElementById('expenseAmount');
    
    if (!dateInput || !descriptionInput || !amountInput) {
        console.error('Form inputs not found');
        Utils.showNotification('Error: Form inputs not found.');
        return;
    }
    
    const date = dateInput.value.trim();
    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    console.log('Form data:', { date, description, amount });
    
    // Validate input
    if (!date) {
        Utils.showNotification('Please select a date.');
        return;
    }
    
    if (!description) {
        Utils.showNotification('Please enter a description.');
        return;
    }
    
    if (!amount || amount <= 0) {
        Utils.showNotification('Please enter a valid amount greater than 0.');
        return;
    }
    
    // Create expense object
    const newExpense = {
        id: nextExpenseId++,
        date: date,
        formattedDate: Utils.formatDate(new Date(date)),
        description: description,
        amount: amount,
        timestamp: Utils.getCurrentTimestamp(),
        createdBy: AuthModule.getCurrentUser() ? AuthModule.getCurrentUser().username : 'unknown',
        addedDate: Utils.formatDate(new Date())
    };
    
    // Add to expenses array
    expenses.push(newExpense);
    
    console.log('Expense added:', newExpense);
    
    // Log action
    if (window.logExpenseAction) {
        logExpenseAction('Added new expense: ' + description + ' - ' + Utils.formatCurrency(amount), newExpense);
    }
    
    // Update display
    renderExpenseTable();
    
    // Update dashboard if function exists
    if (window.updateDashboard) {
        updateDashboard();
    }
    
    // Close modal
    closeExpenseModal();
    
    // Show success message
    Utils.showNotification('Expense added successfully!');
}

/**
 * Edit an expense
 */
function editExpense(expenseId) {
    console.log('Editing expense:', expenseId);
    
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot edit expenses.');
        return;
    }
    
    if (!AuthModule.hasPermission('expenses')) {
        Utils.showNotification('You do not have permission to edit expenses.');
        return;
    }
    
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
        Utils.showNotification('Expense not found.');
        return;
    }
    
    // Create edit modal
    createEditModal(expense);
}

/**
 * Create edit modal
 */
function createEditModal(expense) {
    // Remove existing edit modal
    const existingEditModal = document.getElementById('editExpenseModal');
    if (existingEditModal) {
        existingEditModal.remove();
    }
    
    const editModalHTML = `
        <div id="editExpenseModal" class="modal" style="display: block;">
            <div class="modal-content">
                <span class="close" id="closeEditExpenseModal">&times;</span>
                <h2>Edit Expense</h2>
                <form id="editExpenseForm">
                    <div class="form-group">
                        <label for="editExpenseDate">Date:</label>
                        <input type="date" id="editExpenseDate" value="${expense.date}" required>
                    </div>
                    <div class="form-group">
                        <label for="editExpenseDescription">Description:</label>
                        <textarea id="editExpenseDescription" rows="3" required>${expense.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editExpenseAmount">Amount (₹):</label>
                        <input type="number" id="editExpenseAmount" value="${expense.amount}" 
                               required min="0.01" step="0.01">
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn">Update Expense</button>
                        <button type="button" class="btn btn-danger" id="cancelEditExpenseBtn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', editModalHTML);
    
    // Set up edit modal event listeners
    const editModal = document.getElementById('editExpenseModal');
    const closeEditBtn = document.getElementById('closeEditExpenseModal');
    const cancelEditBtn = document.getElementById('cancelEditExpenseBtn');
    const editForm = document.getElementById('editExpenseForm');
    
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', closeEditModal);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModal);
    }
    
    if (editModal) {
        editModal.addEventListener('click', function(event) {
            if (event.target === editModal) {
                closeEditModal();
            }
        });
    }
    
    if (editForm) {
        editForm.addEventListener('submit', function(event) {
            handleUpdateExpense(event, expense.id);
        });
    }
}

/**
 * Close edit modal
 */
function closeEditModal() {
    const editModal = document.getElementById('editExpenseModal');
    if (editModal) {
        editModal.remove();
    }
}

/**
 * Handle update expense
 */
function handleUpdateExpense(event, expenseId) {
    event.preventDefault();
    
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
        Utils.showNotification('Expense not found.');
        return;
    }
    
    const date = document.getElementById('editExpenseDate').value.trim();
    const description = document.getElementById('editExpenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('editExpenseAmount').value);
    
    // Validate input
    if (!date || !description || !amount || amount <= 0) {
        Utils.showNotification('Please fill in all fields correctly.');
        return;
    }
    
    // Log action
    if (window.logExpenseAction) {
        logExpenseAction('Updated expense: ' + expense.description + ' -> ' + description, {
            id: expenseId,
            oldDescription: expense.description,
            newDescription: description,
            oldAmount: expense.amount,
            newAmount: amount
        });
    }
    
    // Update expense
    expense.date = date;
    expense.formattedDate = Utils.formatDate(new Date(date));
    expense.description = description;
    expense.amount = amount;
    
    // Update display
    renderExpenseTable();
    
    if (window.updateDashboard) {
        updateDashboard();
    }
    
    // Close modal
    closeEditModal();
    
    Utils.showNotification('Expense updated successfully!');
}

/**
 * Delete an expense
 */
function deleteExpense(expenseId) {
    console.log('Deleting expense:', expenseId);
    
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot delete expenses.');
        return;
    }
    
    if (!AuthModule.hasPermission('expenses')) {
        Utils.showNotification('You do not have permission to delete expenses.');
        return;
    }
    
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
        Utils.showNotification('Expense not found.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete expense "${expense.description}"?`)) {
        // Log action
        if (window.logExpenseAction) {
            logExpenseAction('Deleted expense: ' + expense.description + ' - ' + Utils.formatCurrency(expense.amount), expense);
        }
        
        // Remove from array
        expenses = expenses.filter(e => e.id !== expenseId);
        
        // Update display
        renderExpenseTable();
        
        if (window.updateDashboard) {
            updateDashboard();
        }
        
        Utils.showNotification('Expense deleted successfully!');
    }
}

/**
 * Search expenses
 */
function searchExpenses(query) {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    const searchTerm = query.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Render the expense table
 */
function renderExpenseTable() {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) {
        console.error('Expense table body not found');
        return;
    }
    
    // Clear existing content
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
    
    // Check user permissions
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    const canEdit = !isStaff && AuthModule.hasPermission('expenses');
    
    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Render each expense
    sortedExpenses.forEach((expense, index) => {
        const row = document.createElement('tr');
        
        let actionButtons = '';
        if (canEdit) {
            actionButtons = `
                <button class="btn btn-sm" onclick="editExpenseAction(${expense.id})" title="Edit Expense">
                    Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteExpenseAction(${expense.id})" title="Delete Expense">
                    Delete
                </button>
            `;
        } else {
            actionButtons = '<span style="color: #999; font-size: 12px;">View Only</span>';
        }
        
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>${Utils.sanitizeHtml(expense.formattedDate)}</td>
            <td>${Utils.sanitizeHtml(expense.description)}</td>
            <td><strong style="color: #dc3545;">${Utils.formatCurrency(expense.amount)}</strong></td>
            <td>${actionButtons}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`Expense table rendered with ${expenses.length} expenses`);
}

/**
 * Get expense statistics
 */
function getExpenseStats() {
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
    
    // Today's expenses
    const today = Utils.formatDate(new Date());
    const todayExpenses = expenses
        .filter(expense => expense.formattedDate === today)
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
 * Set up global functions
 */
function setupGlobalFunctions() {
    // Main functions
    window.openAddExpenseModal = openAddExpenseModal;
    window.searchExpenses = searchExpenses;
    
    // Action wrapper functions for onclick events
    window.editExpenseAction = function(expenseId) {
        editExpense(expenseId);
    };
    
    window.deleteExpenseAction = function(expenseId) {
        deleteExpense(expenseId);
    };
    
    // Expense logging
    if (!window.logExpenseAction) {
        window.logExpenseAction = function(action, expenseData) {
            const details = {
                expenseId: expenseData.id,
                description: expenseData.description || expenseData.newDescription,
                amount: expenseData.amount || expenseData.newAmount,
                date: expenseData.date
            };
            
            if (window.logAction) {
                logAction(action, details, 'expense');
            }
        };
    }
}

/**
 * Export the expense module
 */
window.ExpenseModule = {
    // Core functions
    initializeExpenses,
    openAddExpenseModal,
    editExpense,
    deleteExpense,
    searchExpenses,
    
    // Data functions
    getExpenseStats,
    getExpensesByDateRange,
    getExpensesByMonth,
    renderExpenseTable,
    
    // Data access
    expenses,
    
    // Internal functions (for testing/debugging)
    createExpenseModal,
    closeExpenseModal,
    handleAddExpense
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        console.log('DOM ready, initializing ExpenseModule');
        initializeExpenses();
    }, 300);
});

console.log('Expense module script loaded');