// ZEDSON WATCHCRAFT - Expense Management Module (Phase 4 - API Integration)

/**
 * Complete Expense Management System with API Integration
 * Updated to use backend APIs instead of local data
 */

// Local cache for expenses and offline fallback
let expenses = [];
let nextExpenseId = 1;
let isLoading = false;
let lastSyncTime = null;

/**
 * Initialize the expense module with API integration
 */
async function initializeExpenses() {
    console.log('Initializing Expense Module with API...');
    
    try {
        showLoadingState('expenses');
        
        // Create the expense modal
        createExpenseModal();
        
        // Load expenses from API
        await loadExpensesFromAPI();
        
        // Render the expense table
        renderExpenseTable();
        
        // Set up global functions
        setupGlobalFunctions();
        
        lastSyncTime = new Date();
        console.log('Expense Module initialized successfully with API integration');
        
    } catch (error) {
        console.error('Expense initialization error:', error);
        
        // Fall back to local data if API fails
        if (expenses.length === 0) {
            loadSampleExpenses();
        }
        renderExpenseTable();
        showAPIError('Failed to load expenses from server. Using offline data.');
        
    } finally {
        hideLoadingState('expenses');
    }
}

/**
 * Load expenses from API with caching
 */
async function loadExpensesFromAPI() {
    try {
        const response = await api.expenses.getExpenses();
        
        if (response.success) {
            expenses = response.data || [];
            console.log(`Loaded ${expenses.length} expenses from API`);
            
            // Update nextExpenseId for local operations
            if (expenses.length > 0) {
                nextExpenseId = Math.max(...expenses.map(e => e.id || 0)) + 1;
            }
            
            // Cache the data
            cacheManager.set('expenses_data', expenses, 10 * 60 * 1000); // 10 minutes cache
            return expenses;
            
        } else {
            throw new Error(response.message || 'Failed to load expenses');
        }
        
    } catch (error) {
        console.error('Load expenses API error:', error);
        
        // Try to use cached data
        const cachedExpenses = cacheManager.get('expenses_data');
        if (cachedExpenses) {
            expenses = cachedExpenses;
            console.log('Using cached expense data');
            return expenses;
        }
        
        throw error;
    }
}

/**
 * Refresh expenses from API
 */
async function refreshExpenses() {
    try {
        showLoadingState('refresh');
        cacheManager.clear('expenses_data'); // Clear cache to force fresh load
        await loadExpensesFromAPI();
        renderExpenseTable();
        lastSyncTime = new Date();
        showSuccessMessage('Expenses refreshed successfully');
    } catch (error) {
        console.error('Refresh expenses error:', error);
        showAPIError('Failed to refresh expense data');
    } finally {
        hideLoadingState('refresh');
    }
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
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label for="expenseAmount">Amount (₹):</label>
                            <input type="number" id="expenseAmount" name="expenseAmount" 
                                   required min="0.01" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label for="expenseCategory">Category:</label>
                            <select id="expenseCategory" name="expenseCategory" required>
                                <option value="">Select Category</option>
                                <option value="office-supplies">Office Supplies</option>
                                <option value="utilities">Utilities</option>
                                <option value="rent">Rent</option>
                                <option value="marketing">Marketing</option>
                                <option value="tools">Tools & Equipment</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="travel">Travel</option>
                                <option value="professional">Professional Services</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="expensePaymentMethod">Payment Method:</label>
                        <select id="expensePaymentMethod" name="expensePaymentMethod" required>
                            <option value="">Select Payment Method</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="expenseReceipt">Receipt (Optional):</label>
                        <input type="file" id="expenseReceipt" name="expenseReceipt" accept="image/*,.pdf">
                        <small>Upload receipt image or PDF (optional)</small>
                        <div id="receiptPreview" style="margin-top: 10px; display: none;">
                            <img id="previewImg" style="max-width: 200px; max-height: 200px; border-radius: 5px; border: 1px solid #ddd;">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="expenseNotes">Notes (Optional):</label>
                        <textarea id="expenseNotes" name="expenseNotes" rows="2" 
                                placeholder="Additional notes..."></textarea>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-danger" id="cancelExpenseBtn">Cancel</button>
                        <button type="submit" class="btn" id="submitExpenseBtn">Add Expense</button>
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
    const receiptInput = document.getElementById('expenseReceipt');
    
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
    
    // Receipt preview
    if (receiptInput) {
        receiptInput.addEventListener('change', previewReceipt);
    }
}

/**
 * Preview receipt file
 */
function previewReceipt(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('receiptPreview');
    const previewImg = document.getElementById('previewImg');
    
    if (file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'block';
            previewImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iI0Y4RjlGQSIvPgo8cGF0aCBkPSJNMTIgMTJIMjhWMjhIMTJWMTJaIiBzdHJva2U9IiM2Qzc1N0QiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
        }
    } else {
        preview.style.display = 'none';
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
        
        // Hide receipt preview
        const preview = document.getElementById('receiptPreview');
        if (preview) {
            preview.style.display = 'none';
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
        
        // Hide receipt preview
        const preview = document.getElementById('receiptPreview');
        if (preview) {
            preview.style.display = 'none';
        }
    }
    
    console.log('Expense modal closed');
}

/**
 * Handle Add Expense Form Submission with API integration
 */
async function handleAddExpense(event) {
    event.preventDefault();
    console.log('Handling expense form submission with API');
    
    // Get form data
    const dateInput = document.getElementById('expenseDate');
    const descriptionInput = document.getElementById('expenseDescription');
    const amountInput = document.getElementById('expenseAmount');
    const categoryInput = document.getElementById('expenseCategory');
    const paymentMethodInput = document.getElementById('expensePaymentMethod');
    const receiptInput = document.getElementById('expenseReceipt');
    const notesInput = document.getElementById('expenseNotes');
    
    if (!dateInput || !descriptionInput || !amountInput || !categoryInput || !paymentMethodInput) {
        console.error('Form inputs not found');
        Utils.showNotification('Error: Form inputs not found.');
        return;
    }
    
    const date = dateInput.value.trim();
    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const paymentMethod = paymentMethodInput.value;
    const notes = notesInput.value.trim();
    const receiptFile = receiptInput.files[0];
    
    console.log('Form data:', { date, description, amount, category, paymentMethod, notes, hasReceipt: !!receiptFile });
    
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
    
    if (!category) {
        Utils.showNotification('Please select a category.');
        return;
    }
    
    if (!paymentMethod) {
        Utils.showNotification('Please select a payment method.');
        return;
    }
    
    const submitBtn = document.getElementById('submitExpenseBtn');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;
        
        // Prepare expense data
        const expenseData = {
            expenseDate: date,
            description: description,
            amount: amount,
            category: category,
            paymentMethod: paymentMethod,
            notes: notes
        };
        
        // Call API with or without receipt file
        const response = await api.expenses.createExpense(expenseData, receiptFile);
        
        if (response.success) {
            // Log action
            if (window.logExpenseAction) {
                logExpenseAction('Added new expense: ' + description + ' - ' + Utils.formatCurrency(amount), response.data);
            }
            
            // Add to local cache
            expenses.push(response.data);
            
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
            console.log('Expense added:', response.data);
            
        } else {
            throw new Error(response.message || 'Failed to add expense');
        }
        
    } catch (error) {
        console.error('Add expense error:', error);
        Utils.showNotification(error.message || 'Failed to add expense. Please try again.');
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Edit an expense with API integration
 */
async function editExpense(expenseId) {
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
    
    // Log action
    if (window.logAction) {
        logAction('Opened edit modal for expense: ' + expense.description);
    }
    
    // Create edit modal
    createEditModal(expense);
}

/**
 * Create edit modal with API integration
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
                        <input type="date" id="editExpenseDate" value="${expense.expenseDate || expense.date}" required>
                    </div>
                    <div class="form-group">
                        <label for="editExpenseDescription">Description:</label>
                        <textarea id="editExpenseDescription" rows="3" required>${expense.description}</textarea>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label for="editExpenseAmount">Amount (₹):</label>
                            <input type="number" id="editExpenseAmount" value="${expense.amount}" 
                                   required min="0.01" step="0.01">
                        </div>
                        <div class="form-group">
                            <label for="editExpenseCategory">Category:</label>
                            <select id="editExpenseCategory" required>
                                <option value="office-supplies" ${expense.category === 'office-supplies' ? 'selected' : ''}>Office Supplies</option>
                                <option value="utilities" ${expense.category === 'utilities' ? 'selected' : ''}>Utilities</option>
                                <option value="rent" ${expense.category === 'rent' ? 'selected' : ''}>Rent</option>
                                <option value="marketing" ${expense.category === 'marketing' ? 'selected' : ''}>Marketing</option>
                                <option value="tools" ${expense.category === 'tools' ? 'selected' : ''}>Tools & Equipment</option>
                                <option value="maintenance" ${expense.category === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                                <option value="travel" ${expense.category === 'travel' ? 'selected' : ''}>Travel</option>
                                <option value="professional" ${expense.category === 'professional' ? 'selected' : ''}>Professional Services</option>
                                <option value="other" ${expense.category === 'other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editExpensePaymentMethod">Payment Method:</label>
                        <select id="editExpensePaymentMethod" required>
                            <option value="Cash" ${expense.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Card" ${expense.paymentMethod === 'Card' ? 'selected' : ''}>Card</option>
                            <option value="UPI" ${expense.paymentMethod === 'UPI' ? 'selected' : ''}>UPI</option>
                            <option value="Bank Transfer" ${expense.paymentMethod === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                            <option value="Cheque" ${expense.paymentMethod === 'Cheque' ? 'selected' : ''}>Cheque</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editExpenseReceipt">Receipt (Optional):</label>
                        <input type="file" id="editExpenseReceipt" accept="image/*,.pdf">
                        <small>Upload new receipt to replace existing one (optional)</small>
                        ${expense.receipt ? `<div style="margin-top: 5px;"><small>Current receipt: <a href="${expense.receipt}" target="_blank">View</a></small></div>` : ''}
                    </div>
                    <div class="form-group">
                        <label for="editExpenseNotes">Notes:</label>
                        <textarea id="editExpenseNotes" rows="2">${expense.notes || ''}</textarea>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-danger" id="cancelEditExpenseBtn">Cancel</button>
                        <button type="submit" class="btn">Update Expense</button>
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
 * Handle update expense with API integration
 */
async function handleUpdateExpense(event, expenseId) {
    event.preventDefault();
    
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
        Utils.showNotification('Expense not found.');
        return;
    }
    
    const date = document.getElementById('editExpenseDate').value.trim();
    const description = document.getElementById('editExpenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('editExpenseAmount').value);
    const category = document.getElementById('editExpenseCategory').value;
    const paymentMethod = document.getElementById('editExpensePaymentMethod').value;
    const notes = document.getElementById('editExpenseNotes').value.trim();
    const receiptFile = document.getElementById('editExpenseReceipt').files[0];
    
    // Validate input
    if (!date || !description || !amount || amount <= 0 || !category || !paymentMethod) {
        Utils.showNotification('Please fill in all required fields correctly.');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;
        
        // Prepare update data
        const updateData = {
            expenseDate: date,
            description: description,
            amount: amount,
            category: category,
            paymentMethod: paymentMethod,
            notes: notes
        };
        
        // Call API
        const response = await api.expenses.updateExpense(expenseId, updateData, receiptFile);
        
        if (response.success) {
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
            
            // Update local cache
            const expenseIndex = expenses.findIndex(e => e.id === expenseId);
            if (expenseIndex !== -1) {
                expenses[expenseIndex] = response.data;
            }
            
            // Update display
            renderExpenseTable();
            
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Close modal
            closeEditModal();
            
            Utils.showNotification('Expense updated successfully!');
            
        } else {
            throw new Error(response.message || 'Failed to update expense');
        }
        
    } catch (error) {
        console.error('Update expense error:', error);
        Utils.showNotification(error.message || 'Failed to update expense. Please try again.');
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Delete an expense with API integration
 */
async function deleteExpense(expenseId) {
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
        try {
            showLoadingState('delete');
            
            const response = await api.expenses.deleteExpense(expenseId, 'Deleted by user');
            
            if (response.success) {
                // Log action
                if (window.logExpenseAction) {
                    logExpenseAction('Deleted expense: ' + expense.description + ' - ' + Utils.formatCurrency(expense.amount), expense);
                }
                
                // Remove from local cache
                expenses = expenses.filter(e => e.id !== expenseId);
                
                // Update display
                renderExpenseTable();
                
                if (window.updateDashboard) {
                    updateDashboard();
                }
                
                Utils.showNotification('Expense deleted successfully!');
                
            } else {
                throw new Error(response.message || 'Failed to delete expense');
            }
            
        } catch (error) {
            console.error('Delete expense error:', error);
            Utils.showNotification(error.message || 'Failed to delete expense. Please try again.');
        } finally {
            hideLoadingState('delete');
        }
    }
}

/**
 * Search expenses with real-time filtering
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
 * Render the expense table with API data and loading states
 */
function renderExpenseTable() {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) {
        console.error('Expense table body not found');
        return;
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Show loading state if currently loading
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading expenses...</p>
                </td>
            </tr>
        `;
        return;
    }
    
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #999; padding: 40px;">
                    <div style="margin-bottom: 10px;">💰</div>
                    <h3 style="margin: 10px 0;">No expenses recorded yet</h3>
                    <p>Click "Add New Expense" to get started</p>
                    <button class="btn" onclick="ExpenseModule.refreshExpenses()" style="margin-top: 10px;">
                        Refresh Expenses
                    </button>
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
    const sortedExpenses = [...expenses].sort((a, b) => {
        const dateA = new Date(a.expenseDate || a.date);
        const dateB = new Date(b.expenseDate || b.date);
        return dateB - dateA;
    });
    
    // Render each expense
    sortedExpenses.forEach((expense, index) => {
        const row = document.createElement('tr');
        
        // Add sync indicator if item is recently updated
        const isRecentlyUpdated = expense.updatedAt && 
            (new Date() - new Date(expense.updatedAt)) < 10000; // 10 seconds
        const syncIndicator = isRecentlyUpdated ? 
            '<span style="color: #28a745;">●</span> ' : '';
        
        // Format category for display
        const categoryDisplay = expense.category ? 
            expense.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Other';
        
        // Receipt indicator
        const receiptIndicator = expense.receipt ? 
            `<a href="${expense.receipt}" target="_blank" style="color: #28a745;" title="View Receipt">📄</a>` : '';
        
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
            <td>
                ${Utils.formatDate(new Date(expense.expenseDate || expense.date))}
                ${syncIndicator}
            </td>
            <td>
                ${Utils.sanitizeHtml(expense.description)}
                ${receiptIndicator}
                <br>
                <small style="color: #666;">
                    <span class="status pending">${categoryDisplay}</span>
                    ${expense.paymentMethod ? ` • ${expense.paymentMethod}` : ''}
                </small>
            </td>
            <td><strong style="color: #dc3545;">${Utils.formatCurrency(expense.amount)}</strong></td>
            <td>
                <span class="status ${expense.status || 'pending'}">${expense.status || 'recorded'}</span>
                ${expense.notes ? `<br><small style="color: #666;">${Utils.sanitizeHtml(expense.notes.substring(0, 50))}${expense.notes.length > 50 ? '...' : ''}</small>` : ''}
            </td>
            <td>${actionButtons}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`Expense table rendered with ${expenses.length} expenses`);
    
    // Update sync status
    updateSyncStatus();
}

/**
 * Update sync status display
 */
function updateSyncStatus() {
    const syncStatus = document.getElementById('expenseSyncStatus');
    if (syncStatus && lastSyncTime) {
        const timeAgo = getTimeAgo(lastSyncTime);
        syncStatus.textContent = `Last synced: ${timeAgo}`;
        syncStatus.style.color = (new Date() - lastSyncTime) > 300000 ? '#dc3545' : '#28a745'; // Red if >5 min
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Get expense statistics with API integration
 */
async function getExpenseStats() {
    try {
        // Try to get fresh stats from API
        const response = await api.expenses.getExpenseStats();
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get expense stats API error:', error);
    }
    
    // Fallback to local calculation
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
    
    // Today's expenses
    const today = Utils.formatDate(new Date());
    const todayExpenses = expenses
        .filter(expense => {
            const expenseDate = Utils.formatDate(new Date(expense.expenseDate || expense.date));
            return expenseDate === today;
        })
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
        const expenseDate = new Date(expense.expenseDate || expense.date);
        return expenseDate >= from && expenseDate <= to;
    });
}

/**
 * Get expenses by month and year
 */
function getExpensesByMonth(month, year) {
    return expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate || expense.date);
        return expenseDate.getMonth() === parseInt(month) && expenseDate.getFullYear() === parseInt(year);
    });
}

/**
 * Export expenses data
 */
async function exportExpenses() {
    try {
        showLoadingState('export');
        
        const response = await api.expenses.exportExpenses();
        
        if (response.success) {
            // Create and download file
            const csvContent = response.data.csvData;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            Utils.showNotification('Expenses exported successfully!');
            
            if (window.logAction) {
                logAction('Exported expense data', { recordCount: response.data.recordCount });
            }
            
        } else {
            throw new Error(response.message || 'Export failed');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        Utils.showNotification('Failed to export expenses. Please try again.');
    } finally {
        hideLoadingState('export');
    }
}

/**
 * Load sample expenses for offline fallback
 */
function loadSampleExpenses() {
    expenses = [
        {
            id: 1,
            expenseDate: '2024-01-15',
            description: 'Office supplies and stationery',
            amount: 2500,
            category: 'office-supplies',
            paymentMethod: 'Card',
            notes: 'Monthly office supplies purchase',
            status: 'recorded',
            createdAt: '2024-01-15T10:00:00Z'
        },
        {
            id: 2,
            expenseDate: '2024-01-10',
            description: 'Electricity bill payment',
            amount: 4500,
            category: 'utilities',
            paymentMethod: 'UPI',
            notes: 'Monthly electricity bill',
            status: 'recorded',
            createdAt: '2024-01-10T14:30:00Z'
        }
    ];
    nextExpenseId = 3;
    console.log('Loaded sample expenses for offline mode');
}

/**
 * Loading state management
 */
function showLoadingState(context) {
    isLoading = true;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'block';
    }
    
    // Show loading in table if it's the main load
    if (context === 'expenses') {
        renderExpenseTable();
    }
}

function hideLoadingState(context) {
    isLoading = false;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Show API error with retry option
 */
function showAPIError(message) {
    Utils.showNotification(message + ' You can continue working offline.');
    
    // Log the error for debugging
    if (window.logAction) {
        logAction('API Error in Expenses: ' + message, {}, 'error');
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    Utils.showNotification(message);
    
    if (window.logAction) {
        logAction('Expense Success: ' + message);
    }
}

/**
 * Sync with server - called periodically
 */
async function syncWithServer() {
    try {
        await loadExpensesFromAPI();
        renderExpenseTable();
        console.log('Expenses synced with server');
    } catch (error) {
        console.error('Sync error:', error);
        // Don't show error to user for background sync failures
    }
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
                date: expenseData.expenseDate || expenseData.date
            };
            
            if (window.logAction) {
                logAction(action, details, 'expense');
            }
        };
    }
}

/**
 * Setup automatic sync
 */
function setupAutoSync() {
    // Sync every 5 minutes
    setInterval(syncWithServer, 5 * 60 * 1000);
    
    // Update sync status every 30 seconds
    setInterval(updateSyncStatus, 30 * 1000);
}

/**
 * Export the expense module
 */
window.ExpenseModule = {
    // Core functions
    initializeExpenses,
    loadExpensesFromAPI,
    refreshExpenses,
    openAddExpenseModal,
    editExpense,
    deleteExpense,
    searchExpenses,
    
    // Data functions
    getExpenseStats,
    getExpensesByDateRange,
    getExpensesByMonth,
    renderExpenseTable,
    exportExpenses,
    syncWithServer,
    
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
        console.log('DOM ready, initializing ExpenseModule with API');
        setupAutoSync();
        initializeExpenses();
    }, 300);
});

console.log('Expense module script loaded with API integration');