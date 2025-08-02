const { ipcRenderer } = require('electron');

class ExpensesModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.expenses = [];
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Main expense form submission
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => this.handleMainFormSubmit(e));
        }

        // Modal expense form submission
        const expenseModalForm = document.getElementById('expenseModalForm');
        if (expenseModalForm) {
            expenseModalForm.addEventListener('submit', (e) => this.handleModalFormSubmit(e));
        }

        // Set default date to today
        this.setDefaultDates();
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        
        const expenseDate = document.getElementById('expenseDate');
        const expenseModalDate = document.getElementById('expenseModalDate');
        
        if (expenseDate) expenseDate.value = today;
        if (expenseModalDate) expenseModalDate.value = today;
    }

    async loadData() {
        try {
            this.expenses = await ipcRenderer.invoke('get-expenses');
            this.renderTable();
        } catch (error) {
            console.error('Error loading expenses:', error);
            showError('Error loading expenses');
        }
    }

    renderTable() {
        const tbody = document.getElementById('expensesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.expenses.forEach(expense => {
            const row = document.createElement('tr');
            const expenseDate = new Date(expense.expense_date).toLocaleDateString();
            
            row.innerHTML = `
                <td>${expenseDate}</td>
                <td>${expense.description}</td>
                <td>₹${parseFloat(expense.amount).toFixed(2)}</td>
                <td><span class="payment-mode ${expense.payment_mode}">${expense.payment_mode.toUpperCase()}</span></td>
                <td>${expense.created_by_name || 'Unknown'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="expensesModule().edit(${expense.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="expensesModule().delete(${expense.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async handleMainFormSubmit(e) {
        e.preventDefault();
        
        const expenseData = {
            expense_date: document.getElementById('expenseDate')?.value,
            description: document.getElementById('expenseDescription')?.value?.trim(),
            amount: parseFloat(document.getElementById('expenseAmount')?.value),
            payment_mode: document.getElementById('expenseMode')?.value,
            created_by: this.currentUser.id
        };

        if (!this.validateExpenseData(expenseData)) {
            return;
        }
        
        try {
            await ipcRenderer.invoke('add-expense', expenseData);
            showSuccess('Expense added successfully');
            this.clearExpenseForm();
            await this.loadData();
            await loadDashboardStats();
        } catch (error) {
            console.error('Error adding expense:', error);
            showError('Error adding expense');
        }
    }

    async handleModalFormSubmit(e) {
        e.preventDefault();
        
        const expenseData = {
            expense_date: document.getElementById('expenseModalDate')?.value,
            description: document.getElementById('expenseModalDescription')?.value?.trim(),
            amount: parseFloat(document.getElementById('expenseModalAmount')?.value),
            payment_mode: document.getElementById('expenseModalMode')?.value
        };

        if (!this.validateExpenseData(expenseData)) {
            return;
        }

        const expenseId = document.getElementById('expenseModalId')?.value;
        
        try {
            if (expenseId) {
                expenseData.id = parseInt(expenseId);
                await ipcRenderer.invoke('update-expense', expenseData);
                showSuccess('Expense updated successfully');
            } else {
                expenseData.created_by = this.currentUser.id;
                await ipcRenderer.invoke('add-expense', expenseData);
                showSuccess('Expense added successfully');
            }
            
            closeModal('expenseModal');
            await this.loadData();
            await loadDashboardStats();
        } catch (error) {
            console.error('Error saving expense:', error);
            showError('Error saving expense');
        }
    }

    validateExpenseData(expenseData) {
        if (!expenseData.expense_date) {
            showError('Expense date is required');
            return false;
        }

        if (!expenseData.description) {
            showError('Description is required');
            return false;
        }

        if (!expenseData.amount || expenseData.amount <= 0) {
            showError('Please enter a valid amount');
            return false;
        }

        if (!expenseData.payment_mode) {
            showError('Payment mode is required');
            return false;
        }

        return true;
    }

    openModal(expense = null) {
        const modal = document.getElementById('expenseModal');
        const form = document.getElementById('expenseModalForm');
        const title = document.getElementById('expenseModalTitle');
        
        if (!modal || !form || !title) return;

        form.reset();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const dateField = document.getElementById('expenseModalDate');
        if (dateField) dateField.value = today;
        
        if (expense) {
            title.textContent = 'Edit Expense';
            this.populateModalForm(expense);
        } else {
            title.textContent = 'Add Expense';
            document.getElementById('expenseModalId').value = '';
        }
        
        modal.style.display = 'block';
    }

    populateModalForm(expense) {
        const fields = {
            expenseModalId: expense.id,
            expenseModalDate: expense.expense_date,
            expenseModalDescription: expense.description,
            expenseModalAmount: expense.amount,
            expenseModalMode: expense.payment_mode
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) element.value = value;
        });
    }

    edit(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (expense) {
            this.openModal(expense);
        }
    }

    async delete(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            try {
                await ipcRenderer.invoke('delete-expense', id);
                await this.loadData();
                await loadDashboardStats();
                showSuccess('Expense deleted successfully');
            } catch (error) {
                console.error('Error deleting expense:', error);
                showError('Error deleting expense');
            }
        }
    }

    clearExpenseForm() {
        const form = document.getElementById('expenseForm');
        if (form) {
            form.reset();
            // Reset date to today
            const today = new Date().toISOString().split('T')[0];
            const dateField = document.getElementById('expenseDate');
            if (dateField) dateField.value = today;
        }
    }

    async searchExpenses() {
        const searchTerm = document.getElementById('expenseSearch')?.value?.trim();
        
        if (searchTerm) {
            try {
                this.expenses = await ipcRenderer.invoke('search-expenses', searchTerm);
                this.renderTable();
            } catch (error) {
                console.error('Error searching expenses:', error);
                showError('Error searching expenses');
            }
        } else {
            await this.loadData();
        }
    }

    clearExpenseSearch() {
        const searchField = document.getElementById('expenseSearch');
        if (searchField) searchField.value = '';
        this.loadData();
    }

    // Get expenses for reporting (used by other modules)
    getExpenses() {
        return this.expenses;
    }

    // Get expenses by date range
    getExpensesByDateRange(startDate, endDate) {
        return this.expenses.filter(expense => {
            const expenseDate = new Date(expense.expense_date);
            return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
        });
    }

    // Get total expenses for a period
    getTotalExpenses(startDate = null, endDate = null) {
        let filteredExpenses = this.expenses;
        
        if (startDate && endDate) {
            filteredExpenses = this.getExpensesByDateRange(startDate, endDate);
        }
        
        return filteredExpenses.reduce((total, expense) => total + parseFloat(expense.amount), 0);
    }

    // Get expenses by payment mode
    getExpensesByPaymentMode(paymentMode) {
        return this.expenses.filter(expense => expense.payment_mode === paymentMode);
    }
}

// Global functions for HTML onclick handlers
window.clearExpenseForm = function() {
    const expensesModule = window.expensesModule();
    if (expensesModule) {
        expensesModule.clearExpenseForm();
    }
};

window.searchExpenses = function() {
    const expensesModule = window.expensesModule();
    if (expensesModule) {
        expensesModule.searchExpenses();
    }
};

window.clearExpenseSearch = function() {
    const expensesModule = window.expensesModule();
    if (expensesModule) {
        expensesModule.clearExpenseSearch();
    }
};

module.exports = ExpensesModule;