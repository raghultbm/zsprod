const { allQuery, getQuery, runQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Expense {
    constructor() {
        this.expenses = [];
        this.filteredExpenses = [];
        this.searchTerm = '';
        this.sortField = 'date';
        this.sortDirection = 'desc';
        this.currentExpense = null;
        this.paymentModes = ['Cash', 'UPI', 'Card', 'Multiple Payment Modes'];
    }

    async render() {
        return `
            <div class="expense-container">
                <!-- Summary Cards -->
                <div class="expense-summary">
                    <div class="summary-card">
                        <div class="summary-value" id="today-expenses">₹0.00</div>
                        <div class="summary-label">Today's Expenses</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="month-expenses">₹0.00</div>
                        <div class="summary-label">This Month</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="total-expenses">₹0.00</div>
                        <div class="summary-label">Total Expenses</div>
                    </div>
                </div>

                <!-- Search and Filter Bar -->
                <div class="search-filter-bar">
                    <div class="search-box">
                        <input type="text" id="expense-search" placeholder="Search expenses..." 
                               oninput="expense.handleSearch(this.value)">
                    </div>
                    <div class="filter-group">
                        <input type="date" id="date-from" onchange="expense.applyFilters()" title="From Date">
                        <input type="date" id="date-to" onchange="expense.applyFilters()" title="To Date">
                        <select id="payment-mode-filter" onchange="expense.applyFilters()">
                            <option value="">All Payment Modes</option>
                            ${this.paymentModes.map(mode => 
                                `<option value="${mode}">${mode}</option>`
                            ).join('')}
                        </select>
                        <select id="sort-field" onchange="expense.handleSort()">
                            <option value="date">Sort by Date</option>
                            <option value="description">Sort by Description</option>
                            <option value="amount">Sort by Amount</option>
                            <option value="payment_mode">Sort by Payment Mode</option>
                        </select>
                        <select id="sort-direction" onchange="expense.handleSort()">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="expense.showAddExpenseForm()">
                        <span>+</span> Add Expense
                    </button>
                </div>

                <!-- Expenses List -->
                <div class="table-container">
                    <table class="table" id="expenses-table">
                        <thead>
                            <tr>
                                <th onclick="expense.sortBy('date')">S.No</th>
                                <th onclick="expense.sortBy('date')">Date</th>
                                <th onclick="expense.sortBy('description')">Description</th>
                                <th onclick="expense.sortBy('amount')">Amount</th>
                                <th onclick="expense.sortBy('payment_mode')">Payment Mode</th>
                                <th onclick="expense.sortBy('created_by')">Added By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="expenses-tbody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading expenses...</div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            await this.loadExpenses();
            this.updateExpensesTable();
            this.updateSummaryCards();
        } catch (error) {
            console.error('Expense module initialization error:', error);
            window.app.showMessage('Failed to load expenses', 'error');
        }
    }

    async loadExpenses() {
        try {
            this.expenses = await allQuery(`
                SELECT * FROM expenses 
                ORDER BY date DESC, created_at DESC
            `);
            
            this.filteredExpenses = [...this.expenses];
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.expenses = [];
            this.filteredExpenses = [];
            throw error;
        }
    }

    updateExpensesTable() {
        const tbody = document.getElementById('expenses-tbody');
        if (!tbody) return;

        if (this.filteredExpenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-4">
                        ${this.searchTerm ? 'No expenses found matching your search' : 'No expenses found'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.filteredExpenses.forEach((expense, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${Utils.formatDate(expense.date)}</td>
                    <td>${expense.description}</td>
                    <td>${Utils.formatCurrency(expense.amount)}</td>
                    <td>${expense.payment_mode}</td>
                    <td>${expense.created_by}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="expense.editExpense('${expense.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="expense.deleteExpense('${expense.id}')" title="Delete">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    updateSummaryCards() {
        const today = Utils.getCurrentDate();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // Calculate today's expenses
        const todayExpenses = this.expenses
            .filter(expense => expense.date.split('T')[0] === today)
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        // Calculate this month's expenses
        const monthExpenses = this.expenses
            .filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
            })
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        // Calculate total expenses
        const totalExpenses = this.expenses
            .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        // Update UI
        document.getElementById('today-expenses').textContent = Utils.formatCurrency(todayExpenses);
        document.getElementById('month-expenses').textContent = Utils.formatCurrency(monthExpenses);
        document.getElementById('total-expenses').textContent = Utils.formatCurrency(totalExpenses);
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    handleSort() {
        const sortField = document.getElementById('sort-field').value;
        const sortDirection = document.getElementById('sort-direction').value;
        
        this.sortField = sortField;
        this.sortDirection = sortDirection;
        this.applyFilters();
    }

    sortBy(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        document.getElementById('sort-field').value = this.sortField;
        document.getElementById('sort-direction').value = this.sortDirection;
        
        this.applyFilters();
    }

    applyFilters() {
        const paymentModeFilter = document.getElementById('payment-mode-filter')?.value || '';
        const dateFrom = document.getElementById('date-from')?.value;
        const dateTo = document.getElementById('date-to')?.value;
        
        // Apply filters
        this.filteredExpenses = this.expenses.filter(expense => {
            // Search filter
            if (this.searchTerm) {
                const searchableText = `${expense.description} ${expense.payment_mode} ${expense.created_by}`.toLowerCase();
                if (!searchableText.includes(this.searchTerm)) {
                    return false;
                }
            }
            
            // Payment mode filter
            if (paymentModeFilter && expense.payment_mode !== paymentModeFilter) {
                return false;
            }
            
            // Date filters
            const expenseDate = new Date(expense.date).toISOString().split('T')[0];
            if (dateFrom && expenseDate < dateFrom) return false;
            if (dateTo && expenseDate > dateTo) return false;
            
            return true;
        });

        // Apply sorting
        this.filteredExpenses.sort((a, b) => {
            let aVal = a[this.sortField];
            let bVal = b[this.sortField];

            if (this.sortField === 'date') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (this.sortField === 'amount') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (this.sortDirection === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });

        this.updateExpensesTable();
    }

    showAddExpenseForm() {
        const content = `
            <form id="expense-form" class="expense-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="expense-date">Date *</label>
                        <input type="date" id="expense-date" name="date" value="${Utils.getCurrentDate()}" required>
                    </div>
                    <div class="form-group">
                        <label for="expense-amount">Amount (₹) *</label>
                        <input type="number" id="expense-amount" name="amount" step="0.01" min="0" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="expense-description">Description *</label>
                    <textarea id="expense-description" name="description" rows="3" 
                              placeholder="Enter expense description..." required></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="expense-payment-mode">Payment Mode *</label>
                        <select id="expense-payment-mode" name="payment_mode" required>
                            <option value="">Select Payment Mode</option>
                            ${this.paymentModes.map(mode => 
                                `<option value="${mode}">${mode}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </form>
        `;

        window.app.showModal('Add Expense', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="expense.saveExpense()">Save Expense</button>
        `);

        // Focus on description field
        setTimeout(() => {
            document.getElementById('expense-description').focus();
        }, 100);
    }

    async saveExpense(isEdit = false) {
        try {
            const form = document.getElementById('expense-form');
            const formData = Utils.getFormData(form);

            // Validation
            if (!formData.description.trim()) {
                window.app.showMessage('Description is required', 'error');
                return;
            }

            if (!formData.amount || parseFloat(formData.amount) <= 0) {
                window.app.showMessage('Valid amount is required', 'error');
                return;
            }

            if (!formData.payment_mode) {
                window.app.showMessage('Payment mode is required', 'error');
                return;
            }

            const expenseData = {
                date: formData.date || Utils.getCurrentDate(),
                description: formData.description.trim(),
                amount: parseFloat(formData.amount),
                payment_mode: formData.payment_mode,
                created_by: Utils.getCurrentUser()
            };

            let result;
            if (isEdit && this.currentExpense) {
                // Update existing expense
                result = await runQuery(`
                    UPDATE expenses 
                    SET date = ?, description = ?, amount = ?, payment_mode = ?
                    WHERE id = ?
                `, [
                    expenseData.date,
                    expenseData.description,
                    expenseData.amount,
                    expenseData.payment_mode,
                    this.currentExpense.id
                ]);

                await auditLogger.logUpdate('EXPENSE', this.currentExpense.id, this.currentExpense, expenseData);
                window.app.showMessage('Expense updated successfully', 'success');
            } else {
                // Create new expense
                result = await runQuery(`
                    INSERT INTO expenses (date, description, amount, payment_mode, created_by)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    expenseData.date,
                    expenseData.description,
                    expenseData.amount,
                    expenseData.payment_mode,
                    expenseData.created_by
                ]);

                await auditLogger.logCreate('EXPENSE', result.id, expenseData);
                window.app.showMessage('Expense added successfully', 'success');
            }

            // Close modal and refresh data
            document.querySelector('.modal-overlay').remove();
            await this.loadExpenses();
            this.updateExpensesTable();
            this.updateSummaryCards();

        } catch (error) {
            console.error('Error saving expense:', error);
            window.app.showMessage('Failed to save expense', 'error');
        }
    }

    async editExpense(expenseId) {
        try {
            const expense = await getQuery('SELECT * FROM expenses WHERE id = ?', [expenseId]);
            
            if (!expense) {
                window.app.showMessage('Expense not found', 'error');
                return;
            }

            this.currentExpense = expense;

            const content = `
                <form id="expense-form" class="expense-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expense-date">Date *</label>
                            <input type="date" id="expense-date" name="date" 
                                   value="${expense.date.split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label for="expense-amount">Amount (₹) *</label>
                            <input type="number" id="expense-amount" name="amount" step="0.01" min="0" 
                                   value="${expense.amount}" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="expense-description">Description *</label>
                        <textarea id="expense-description" name="description" rows="3" 
                                  required>${expense.description}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expense-payment-mode">Payment Mode *</label>
                            <select id="expense-payment-mode" name="payment_mode" required>
                                <option value="">Select Payment Mode</option>
                                ${this.paymentModes.map(mode => 
                                    `<option value="${mode}" ${mode === expense.payment_mode ? 'selected' : ''}>${mode}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </form>
            `;

            window.app.showModal('Edit Expense', content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="expense.saveExpense(true)">Update Expense</button>
            `);

        } catch (error) {
            console.error('Error loading expense for edit:', error);
            window.app.showMessage('Failed to load expense details', 'error');
        }
    }

    async deleteExpense(expenseId) {
        try {
            const expense = await getQuery('SELECT * FROM expenses WHERE id = ?', [expenseId]);
            
            if (!expense) {
                window.app.showMessage('Expense not found', 'error');
                return;
            }

            window.app.showConfirm(
                `Are you sure you want to delete this expense?\n\n"${expense.description}" - ${Utils.formatCurrency(expense.amount)}\n\nThis action cannot be undone.`,
                async () => {
                    try {
                        await runQuery('DELETE FROM expenses WHERE id = ?', [expenseId]);
                        await auditLogger.logDelete('EXPENSE', expenseId, expense);
                        
                        window.app.showMessage('Expense deleted successfully', 'success');
                        await this.loadExpenses();
                        this.updateExpensesTable();
                        this.updateSummaryCards();
                    } catch (error) {
                        console.error('Error deleting expense:', error);
                        window.app.showMessage('Failed to delete expense', 'error');
                    }
                }
            );

        } catch (error) {
            console.error('Error in delete expense:', error);
            window.app.showMessage('Failed to delete expense', 'error');
        }
    }

    async getExpensesSummary(startDate, endDate) {
        try {
            let query = 'SELECT SUM(amount) as total FROM expenses WHERE 1=1';
            const params = [];

            if (startDate) {
                query += ' AND DATE(date) >= DATE(?)';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND DATE(date) <= DATE(?)';
                params.push(endDate);
            }

            const result = await getQuery(query, params);
            return result ? result.total || 0 : 0;
        } catch (error) {
            console.error('Error getting expenses summary:', error);
            return 0;
        }
    }

    async getExpensesByCategory() {
        try {
            // Simple categorization based on common expense patterns
            const expenses = await allQuery(`
                SELECT description, amount FROM expenses 
                ORDER BY amount DESC
            `);

            const categories = {
                'Travel & Transport': 0,
                'Office Supplies': 0,
                'Utilities': 0,
                'Marketing': 0,
                'Maintenance': 0,
                'Food & Beverages': 0,
                'Others': 0
            };

            expenses.forEach(expense => {
                const desc = expense.description.toLowerCase();
                const amount = parseFloat(expense.amount);

                if (desc.includes('travel') || desc.includes('transport') || desc.includes('fuel') || desc.includes('petrol')) {
                    categories['Travel & Transport'] += amount;
                } else if (desc.includes('stationery') || desc.includes('supplies') || desc.includes('paper')) {
                    categories['Office Supplies'] += amount;
                } else if (desc.includes('electricity') || desc.includes('water') || desc.includes('internet') || desc.includes('phone')) {
                    categories['Utilities'] += amount;
                } else if (desc.includes('advertisement') || desc.includes('marketing') || desc.includes('promotion')) {
                    categories['Marketing'] += amount;
                } else if (desc.includes('repair') || desc.includes('maintenance') || desc.includes('cleaning')) {
                    categories['Maintenance'] += amount;
                } else if (desc.includes('food') || desc.includes('tea') || desc.includes('coffee') || desc.includes('lunch')) {
                    categories['Food & Beverages'] += amount;
                } else {
                    categories['Others'] += amount;
                }
            });

            return categories;
        } catch (error) {
            console.error('Error getting expenses by category:', error);
            return {};
        }
    }

    async exportExpenses(startDate, endDate) {
        try {
            let query = 'SELECT * FROM expenses WHERE 1=1';
            const params = [];

            if (startDate) {
                query += ' AND DATE(date) >= DATE(?)';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND DATE(date) <= DATE(?)';
                params.push(endDate);
            }

            query += ' ORDER BY date DESC';

            const expenses = await allQuery(query, params);

            if (expenses.length === 0) {
                window.app.showMessage('No expenses found for the selected period', 'info');
                return;
            }

            // Prepare data for CSV export
            const csvData = expenses.map(expense => ({
                Date: Utils.formatDate(expense.date),
                Description: expense.description,
                Amount: expense.amount,
                'Payment Mode': expense.payment_mode,
                'Added By': expense.created_by,
                'Created At': Utils.formatDate(expense.created_at, 'DD MMM YYYY HH:mm')
            }));

            const filename = `expenses_${startDate || 'all'}_to_${endDate || 'today'}.csv`;
            Utils.exportToCSV(csvData, filename);
            
            window.app.showMessage('Expenses exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting expenses:', error);
            window.app.showMessage('Failed to export expenses', 'error');
        }
    }

    async refresh() {
        await this.loadExpenses();
        this.updateExpensesTable();
        this.updateSummaryCards();
    }
}

// Make expense instance available globally for event handlers
window.expense = null;

// Export the class
export default Expense;

// Set up global expense instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'expense') {
        window.expense = window.app.modules.expense;
    }
});