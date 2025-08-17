// Expense module for ZEDSON Watchcraft - Simple & Reliable
(function() {
    'use strict';
    
    if (typeof window.ExpenseModule !== 'undefined') {
        return;
    }

class ExpenseModule {
    constructor() {
        this.expenses = [];
        this.searchTerm = '';
        this.filters = {};
        this.paymentModes = ['Cash', 'UPI', 'Card', 'Multiple Payment Modes'];
    }

    render(container) {
        console.log('Expense module: Starting render...');
        
        container.innerHTML = this.getTemplate();
        this.loadData();
        this.setupEvents();
        this.renderExpensesList();
        
        console.log('Expense module: Render completed');
    }

    getTemplate() {
        return `
            <div class="expense-container">
                <div class="expense-header">
                    <h1>Expense Management</h1>
                    <button class="btn btn-primary" id="add-expense-btn">
                        <span>+</span> Add Expense
                    </button>
                </div>

                <div class="expense-toolbar">
                    <div class="search-section">
                        <input type="text" id="expense-search" class="form-input" 
                               placeholder="Search by description or amount...">
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="date-filter" class="form-select">
                            <option value="">All Dates</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        
                        <select id="payment-filter" class="form-select">
                            <option value="">All Payment Modes</option>
                            ${this.paymentModes.map(mode => 
                                `<option value="${mode}">${mode}</option>`
                            ).join('')}
                        </select>
                        
                        <button class="btn btn-info" id="export-expenses-btn">
                            📊 Export CSV
                        </button>
                    </div>
                </div>

                <div class="expense-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-expenses">0</span>
                        <span class="stat-label">Total Expenses</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="today-expenses">₹0</span>
                        <span class="stat-label">Today's Expenses</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="month-expenses">₹0</span>
                        <span class="stat-label">This Month</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="average-expense">₹0</span>
                        <span class="stat-label">Average/Day</span>
                    </div>
                </div>

                <div class="expense-list-container">
                    <div id="expense-list"></div>
                </div>

                <!-- Expense Form Modal -->
                <div id="expense-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-md">
                        <div class="modal-header">
                            <h3 id="expense-modal-title">Add New Expense</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="expense-form" class="form">
                                <div class="form-group">
                                    <label class="form-label required">Date</label>
                                    <input type="date" name="date" class="form-input" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label required">Description</label>
                                    <textarea name="description" class="form-textarea" rows="3" 
                                             maxlength="500" required 
                                             placeholder="Describe the expense (e.g., Office supplies, Repair tools, etc.)"></textarea>
                                    <small class="form-help">Maximum 500 characters</small>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label required">Amount (₹)</label>
                                    <input type="number" name="amount" class="form-input" 
                                           min="0" step="0.01" required placeholder="0.00">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label required">Payment Mode</label>
                                    <select name="paymentMode" class="form-select" required>
                                        <option value="">Select Payment Mode</option>
                                        ${this.paymentModes.map(mode => 
                                            `<option value="${mode}">${mode}</option>`
                                        ).join('')}
                                    </select>
                                </div>

                                <div id="expense-form-errors" class="form-errors" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="expense-form" class="btn btn-primary" id="save-expense-btn">
                                Save Expense
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Confirmation Modal -->
                <div id="confirm-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-sm confirm-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Confirm Action</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="confirm-icon warning">⚠️</div>
                            <p id="confirm-message">Are you sure you want to delete this expense?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="button" class="btn btn-error" id="confirm-action-btn">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadData() {
        app.query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC')
            .then(expenses => {
                this.expenses = expenses || [];
                this.updateStats();
                this.renderExpensesList();
            })
            .catch(error => {
                console.error('Error loading expenses:', error);
                this.expenses = [];
                this.renderExpensesList();
            });
    }

    setupEvents() {
        // Add expense button
        document.getElementById('add-expense-btn').onclick = () => this.openExpenseModal();

        // Search functionality
        document.getElementById('expense-search').oninput = (e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        };

        // Clear search
        document.getElementById('clear-search').onclick = () => {
            document.getElementById('expense-search').value = '';
            this.searchTerm = '';
            this.applyFilters();
        };

        // Filters
        document.getElementById('date-filter').onchange = (e) => {
            this.filters.date = e.target.value;
            this.applyFilters();
        };

        document.getElementById('payment-filter').onchange = (e) => {
            this.filters.payment = e.target.value;
            this.applyFilters();
        };

        // Export button
        document.getElementById('export-expenses-btn').onclick = () => this.exportExpenses();

        // Form submission
        document.getElementById('expense-form').onsubmit = (e) => this.handleExpenseSubmit(e);

        // Set today's date as default
        document.querySelector('input[name="date"]').value = Utils.getCurrentDate();
    }

    openExpenseModal(expense = null) {
        const modal = document.getElementById('expense-modal');
        const title = document.getElementById('expense-modal-title');
        const form = document.getElementById('expense-form');
        const saveBtn = document.getElementById('save-expense-btn');

        // Clear form errors
        document.getElementById('expense-form-errors').style.display = 'none';

        if (expense) {
            // Edit mode
            title.textContent = 'Edit Expense';
            saveBtn.textContent = 'Update Expense';
            
            // Populate form
            form.querySelector('input[name="date"]').value = expense.date;
            form.querySelector('textarea[name="description"]').value = expense.description || '';
            form.querySelector('input[name="amount"]').value = expense.amount || '';
            form.querySelector('select[name="paymentMode"]').value = expense.payment_mode || '';
            
            this.editingExpense = expense;
        } else {
            // Add mode
            form.reset();
            title.textContent = 'Add New Expense';
            saveBtn.textContent = 'Save Expense';
            
            // Set today's date
            form.querySelector('input[name="date"]').value = Utils.getCurrentDate();
            
            this.editingExpense = null;
        }

        modal.style.display = 'block';
        
        // Focus on description field
        setTimeout(() => {
            form.querySelector('textarea[name="description"]').focus();
        }, 100);
    }

    handleExpenseSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const expenseData = {
            date: formData.get('date'),
            description: formData.get('description').trim(),
            amount: parseFloat(formData.get('amount')),
            paymentMode: formData.get('paymentMode')
        };
        
        // Basic validation
        if (!expenseData.description) {
            this.showFormErrors({ description: 'Description is required' });
            return;
        }
        
        if (!expenseData.amount || expenseData.amount <= 0) {
            this.showFormErrors({ amount: 'Valid amount is required' });
            return;
        }
        
        if (!expenseData.paymentMode) {
            this.showFormErrors({ payment: 'Payment mode is required' });
            return;
        }
        
        // Save expense
        this.saveExpense(expenseData);
    }

    saveExpense(expenseData) {
        const saveBtn = document.getElementById('save-expense-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        if (this.editingExpense) {
            // Update expense
            app.run(`
                UPDATE expenses 
                SET date = ?, description = ?, amount = ?, payment_mode = ?
                WHERE id = ?
            `, [
                expenseData.date, expenseData.description, 
                expenseData.amount, expenseData.paymentMode, 
                this.editingExpense.id
            ]).then(() => {
                // Log audit
                if (typeof Audit !== 'undefined') {
                    Audit.logUpdate('expenses', this.editingExpense.id, this.editingExpense, expenseData, 
                        `Updated expense: ${expenseData.description.substring(0, 50)}`);
                }
                
                this.completeExpenseSave('Expense updated successfully');
            }).catch(error => {
                console.error('Expense update error:', error);
                this.showFormErrors({ general: 'Failed to update expense' });
                saveBtn.disabled = false;
                saveBtn.textContent = 'Update Expense';
            });
        } else {
            // Create new expense
            app.run(`
                INSERT INTO expenses (date, description, amount, payment_mode, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                expenseData.date, expenseData.description, expenseData.amount,
                expenseData.paymentMode, Auth.getCurrentUser()?.username || 'system',
                new Date().toISOString()
            ]).then(result => {
                // Log audit
                if (typeof Audit !== 'undefined') {
                    Audit.logCreate('expenses', result.id, expenseData, 
                        `Created expense: ${expenseData.description.substring(0, 50)}`);
                }
                
                this.completeExpenseSave('Expense saved successfully');
            }).catch(error => {
                console.error('Expense creation error:', error);
                this.showFormErrors({ general: 'Failed to save expense' });
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Expense';
            });
        }
    }

    completeExpenseSave(message) {
        // Close modal
        document.getElementById('expense-modal').style.display = 'none';
        
        // Refresh data
        this.loadData();
        
        // Show success message
        Utils.showSuccess(message);
        
        // Re-enable button
        const saveBtn = document.getElementById('save-expense-btn');
        saveBtn.disabled = false;
        saveBtn.textContent = this.editingExpense ? 'Update Expense' : 'Save Expense';
    }

    editExpense(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (expense) {
            this.openExpenseModal(expense);
        }
    }

    deleteExpense(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-action-btn');

        message.textContent = `Are you sure you want to delete this expense? This action cannot be undone.`;
        
        confirmBtn.onclick = () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
            
            app.run('DELETE FROM expenses WHERE id = ?', [expenseId])
                .then(() => {
                    // Log audit
                    if (typeof Audit !== 'undefined') {
                        Audit.logDelete('expenses', expenseId, expense, 
                            `Deleted expense: ${expense.description.substring(0, 50)}`);
                    }
                    
                    modal.style.display = 'none';
                    this.loadData();
                    Utils.showSuccess('Expense deleted successfully');
                })
                .catch(error => {
                    console.error('Delete error:', error);
                    Utils.showError('Failed to delete expense');
                })
                .finally(() => {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Delete';
                });
        };

        modal.style.display = 'block';
    }

    applyFilters() {
        let filtered = [...this.expenses];
        
        // Search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(expense => 
                expense.description.toLowerCase().includes(term) ||
                expense.amount.toString().includes(term)
            );
        }
        
        // Date filter
        if (this.filters.date) {
            const today = new Date();
            filtered = filtered.filter(expense => {
                const expenseDate = new Date(expense.date);
                switch (this.filters.date) {
                    case 'today':
                        return expenseDate.toDateString() === today.toDateString();
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return expenseDate >= weekAgo;
                    case 'month':
                        return expenseDate.getMonth() === today.getMonth() && 
                               expenseDate.getFullYear() === today.getFullYear();
                    default:
                        return true;
                }
            });
        }
        
        // Payment filter
        if (this.filters.payment) {
            filtered = filtered.filter(expense => expense.payment_mode === this.filters.payment);
        }
        
        this.renderExpensesList(filtered);
    }

    renderExpensesList(expensesData = null) {
        const expenses = expensesData || this.expenses;
        const container = document.getElementById('expense-list');
        
        if (expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💰</div>
                    <h3>No expenses found</h3>
                    <p>Start by adding your first expense</p>
                    <button class="btn btn-primary" onclick="expenseModule.openExpenseModal()">
                        Add Expense
                    </button>
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Payment Mode</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map((expense, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${Utils.formatDate(expense.date)}</td>
                            <td class="expense-description" title="${expense.description}">
                                ${expense.description.length > 50 ? 
                                  expense.description.substring(0, 50) + '...' : 
                                  expense.description}
                            </td>
                            <td class="font-semibold text-error">₹${parseFloat(expense.amount).toFixed(2)}</td>
                            <td>
                                <span class="payment-badge">${expense.payment_mode}</span>
                            </td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="expenseModule.editExpense(${expense.id})" title="Edit">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-error" onclick="expenseModule.deleteExpense(${expense.id})" title="Delete">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    }

    updateStats() {
        const totalExpenses = this.expenses.length;
        
        // Today's expenses
        const today = new Date().toDateString();
        const todayExpenses = this.expenses.filter(expense => 
            new Date(expense.date).toDateString() === today
        );
        const todayTotal = todayExpenses.reduce((sum, expense) => 
            sum + parseFloat(expense.amount), 0
        );
        
        // This month's expenses
        const thisMonth = new Date();
        const monthExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === thisMonth.getMonth() && 
                   expenseDate.getFullYear() === thisMonth.getFullYear();
        });
        const monthTotal = monthExpenses.reduce((sum, expense) => 
            sum + parseFloat(expense.amount), 0
        );
        
        // Average per day (this month)
        const daysInMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).getDate();
        const averagePerDay = monthTotal / daysInMonth;
        
        document.getElementById('total-expenses').textContent = totalExpenses;
        document.getElementById('today-expenses').textContent = Utils.formatCurrency(todayTotal);
        document.getElementById('month-expenses').textContent = Utils.formatCurrency(monthTotal);
        document.getElementById('average-expense').textContent = Utils.formatCurrency(averagePerDay);
    }

    exportExpenses() {
        if (this.expenses.length === 0) {
            Utils.showError('No expenses to export');
            return;
        }
        
        const exportData = this.expenses.map(expense => ({
            'Date': Utils.formatDate(expense.date),
            'Description': expense.description,
            'Amount': parseFloat(expense.amount).toFixed(2),
            'Payment Mode': expense.payment_mode,
            'Created By': expense.created_by || 'Unknown',
            'Created Date': Utils.formatDate(expense.created_at)
        }));
        
        Utils.exportToCSV(exportData, 'expenses');
        Utils.showSuccess('Expenses exported successfully');
    }

    showFormErrors(errors) {
        const errorsDiv = document.getElementById('expense-form-errors');
        const errorMessages = Object.values(errors).map(error => `<div>• ${error}</div>`).join('');
        
        errorsDiv.innerHTML = `
            <div class="alert alert-error">
                <strong>Please fix the following errors:</strong>
                ${errorMessages}
            </div>
        `;
        errorsDiv.style.display = 'block';
    }

    cleanup() {
        console.log('Cleaning up expense module...');
        this.editingExpense = null;
    }
}

// Register module
window.ExpenseModule = ExpenseModule;
const expenseModule = new ExpenseModule();
if (typeof app !== 'undefined') {
    app.registerModule('expense', expenseModule);
}

})();