// ZEDSON WATCHCRAFT - Customer Management Module (FIXED - Button Reset Issues)

/**
 * Customer Management System with API Integration and Real-time sync
 */

// Local cache for customers (for quick access)
let customers = [];

/**
 * Reset button to original state
 */
function resetButton(button, originalText) {
    if (button) {
        button.textContent = originalText;
        button.disabled = false;
    }
}

/**
 * Set button loading state
 */
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
 * Initialize customer module with API data
 */
async function initializeCustomers() {
    try {
        await loadCustomersFromAPI();
        renderCustomerTable();
        console.log('Customer module initialized with API integration');
    } catch (error) {
        console.error('Customer initialization error:', error);
        Utils.showNotification('Failed to load customers. Please refresh the page.');
    }
}

/**
 * Load customers from API
 */
async function loadCustomersFromAPI() {
    try {
        const response = await CustomerAPI.getCustomers();
        if (response.success) {
            customers = response.data || [];
            console.log(`Loaded ${customers.length} customers from API`);
        }
    } catch (error) {
        console.error('Load customers error:', error);
        throw error;
    }
}

/**
 * Calculate customer's net value from sales and services
 */
function calculateCustomerNetValue(customerId) {
    let salesValue = 0;
    let servicesValue = 0;
    
    // Calculate sales value
    if (window.SalesModule && SalesModule.sales) {
        salesValue = SalesModule.sales
            .filter(sale => sale.customerId === customerId)
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
    }
    
    // Calculate services value (completed services only)
    if (window.ServiceModule && ServiceModule.services) {
        servicesValue = ServiceModule.services
            .filter(service => service.customerId === customerId && service.status === 'completed')
            .reduce((sum, service) => sum + service.cost, 0);
    }
    
    return salesValue + servicesValue;
}

/**
 * Update customer's net value
 */
async function updateCustomerNetValue(customerId) {
    try {
        const salesValue = 0; // This would come from sales module
        const serviceValue = 0; // This would come from service module
        
        const response = await CustomerAPI.updateNetValue(customerId, salesValue, serviceValue);
        if (response.success) {
            // Update local cache
            const customerIndex = customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                customers[customerIndex] = response.data;
            }
            renderCustomerTable();
        }
    } catch (error) {
        console.error('Update net value error:', error);
        Utils.showNotification('Failed to update customer value.');
    }
}

/**
 * Open Add Customer Modal
 */
function openAddCustomerModal() {
    if (!AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to add customers.');
        return;
    }
    
    // Reset the form when opening modal
    const form = document.querySelector('#addCustomerModal form');
    if (form) {
        form.reset();
        
        // Reset the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            resetButton(submitBtn, 'Add Customer');
        }
    }
    
    if (window.logAction) {
        logAction('Opened add customer modal');
    }
    document.getElementById('addCustomerModal').style.display = 'block';
}

/**
 * Add new customer with API integration - FIXED BUTTON RESET
 */
async function addNewCustomer(event) {
    event.preventDefault();
    
    if (!AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to add customers.');
        return;
    }

    // Get form data
    const name = document.getElementById('customerName').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    
    // Validate input
    if (!name || !email || !phone) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    // Validate email format
    if (!Utils.validateEmail(email)) {
        Utils.showNotification('Please enter a valid email address');
        return;
    }

    // Validate phone format
    if (!Utils.validatePhone(phone)) {
        Utils.showNotification('Please enter a valid phone number');
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Adding Customer...');

    try {
        const customerData = {
            name,
            email,
            phone,
            address
        };

        const response = await CustomerAPI.createCustomer(customerData);

        if (response.success) {
            // Log action
            if (window.logCustomerAction) {
                logCustomerAction('Added new customer: ' + name, response.data);
            }
            
            // Add to local cache
            customers.push(response.data);
            
            // Update display
            renderCustomerTable();
            updateDashboard();
            
            // Close modal and reset form
            closeModal('addCustomerModal');
            event.target.reset();
            
            Utils.showNotification('Customer added successfully!');
        }

    } catch (error) {
        console.error('Add customer error:', error);
        Utils.showNotification(error.message || 'Failed to add customer. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Add Customer');
    }
}

/**
 * Edit customer with API integration
 */
function editCustomer(customerId) {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot edit customers.');
        return;
    }
    
    if (!AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to edit customers.');
        return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        Utils.showNotification('Customer not found.');
        return;
    }

    if (window.logAction) {
        logAction('Opened edit modal for customer: ' + customer.name);
    }

    // Create edit modal with Net Value display (read-only)
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editCustomerModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editCustomerModal')">&times;</span>
            <h2>Edit Customer</h2>
            <form onsubmit="CustomerModule.updateCustomer(event, '${customerId}')">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="editCustomerName" value="${Utils.sanitizeHtml(customer.name)}" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="editCustomerEmail" value="${Utils.sanitizeHtml(customer.email)}" required>
                </div>
                <div class="form-group">
                    <label>Phone:</label>
                    <input type="tel" id="editCustomerPhone" value="${Utils.sanitizeHtml(customer.phone)}" required>
                </div>
                <div class="form-group">
                    <label>Address:</label>
                    <textarea id="editCustomerAddress" rows="3">${Utils.sanitizeHtml(customer.address || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Net Value:</label>
                    <input type="text" value="${Utils.formatCurrency(customer.netValue)}" readonly 
                           style="background-color: #f0f0f0; color: #666;">
                    <small>Total value from sales and services (automatically calculated)</small>
                </div>
                <button type="submit" class="btn">Update Customer</button>
                <button type="button" class="btn btn-danger" onclick="closeModal('editCustomerModal')">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
}

/**
 * Update customer with API integration - FIXED BUTTON RESET
 */
async function updateCustomer(event, customerId) {
    event.preventDefault();
    
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        Utils.showNotification('Customer not found.');
        return;
    }

    const name = document.getElementById('editCustomerName').value.trim();
    const email = document.getElementById('editCustomerEmail').value.trim();
    const phone = document.getElementById('editCustomerPhone').value.trim();
    const address = document.getElementById('editCustomerAddress').value.trim();

    // Validate input
    if (!name || !email || !phone) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    // Validate email format
    if (!Utils.validateEmail(email)) {
        Utils.showNotification('Please enter a valid email address');
        return;
    }

    // Validate phone format
    if (!Utils.validatePhone(phone)) {
        Utils.showNotification('Please enter a valid phone number');
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Updating...');

    try {
        const customerData = {
            name,
            email,
            phone,
            address
        };

        const response = await CustomerAPI.updateCustomer(customerId, customerData);

        if (response.success) {
            // Log action
            if (window.logCustomerAction) {
                logCustomerAction('Updated customer: ' + customer.name + ' -> ' + name, {
                    id: customerId,
                    oldName: customer.name,
                    newName: name,
                    oldEmail: customer.email,
                    newEmail: email
                });
            }

            // Update local cache
            const customerIndex = customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                customers[customerIndex] = response.data;
            }

            renderCustomerTable();
            updateDashboard();
            closeModal('editCustomerModal');
            document.getElementById('editCustomerModal').remove();
            Utils.showNotification('Customer updated successfully!');
        }

    } catch (error) {
        console.error('Update customer error:', error);
        Utils.showNotification(error.message || 'Failed to update customer. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Update Customer');
    }
}

/**
 * Delete customer with API integration
 */
async function deleteCustomer(customerId) {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot delete customers.');
        return;
    }
    
    if (!AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to delete customers.');
        return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        Utils.showNotification('Customer not found.');
        return;
    }

    if (confirm('Are you sure you want to delete customer "' + customer.name + '"?')) {
        try {
            const response = await CustomerAPI.deleteCustomer(customerId);
            
            if (response.success) {
                // Log action
                if (window.logCustomerAction) {
                    logCustomerAction('Deleted customer: ' + customer.name, customer);
                }
                
                // Remove from local cache
                customers = customers.filter(c => c.id !== customerId);
                
                renderCustomerTable();
                updateDashboard();
                Utils.showNotification('Customer deleted successfully!');
            }

        } catch (error) {
            console.error('Delete customer error:', error);
            Utils.showNotification(error.message || 'Failed to delete customer. Please try again.');
        }
    }
}

/**
 * Update customer purchase count and net value with API
 */
async function incrementCustomerPurchases(customerId) {
    try {
        const response = await CustomerAPI.incrementPurchases(customerId);
        if (response.success) {
            // Update local cache
            const customerIndex = customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                customers[customerIndex] = response.data;
            }
            renderCustomerTable();
        }
    } catch (error) {
        console.error('Increment purchases error:', error);
    }
}

/**
 * Update customer service count and net value with API
 */
async function incrementCustomerServices(customerId) {
    try {
        const response = await CustomerAPI.incrementServices(customerId);
        if (response.success) {
            // Update local cache
            const customerIndex = customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                customers[customerIndex] = response.data;
            }
            renderCustomerTable();
        }
    } catch (error) {
        console.error('Increment services error:', error);
    }
}

/**
 * Decrease customer purchase count and net value
 */
function decrementCustomerPurchases(customerId) {
    // This would need API endpoint for decrementing
    // For now, just reload customers
    loadCustomersFromAPI().then(() => renderCustomerTable());
}

/**
 * Decrease customer service count and net value
 */
function decrementCustomerServices(customerId) {
    // This would need API endpoint for decrementing
    // For now, just reload customers
    loadCustomersFromAPI().then(() => renderCustomerTable());
}

/**
 * Get customer by ID
 */
function getCustomerById(customerId) {
    return customers.find(c => c.id === customerId);
}

/**
 * Search customers with real-time filtering
 */
function searchCustomers(query) {
    const tbody = document.getElementById('customerTableBody');
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
 * Initiate sale from customer
 */
function initiateSaleFromCustomer(customerId) {
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to create sales.');
        return;
    }
    
    const customer = customers.find(c => c.id === customerId);
    if (window.logAction && customer) {
        logAction('Initiated sale from customer profile: ' + customer.name);
    }
    
    // Switch to sales section
    showSection('sales');
    
    // Update nav button state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-btn')[3].classList.add('active'); // Sales is 4th button
    
    // Open sale modal with pre-selected customer
    setTimeout(() => {
        if (window.SalesModule && window.SalesModule.openNewSaleModal) {
            SalesModule.openNewSaleModal();
            const customerSelect = document.getElementById('saleCustomer');
            if (customerSelect) {
                customerSelect.value = customerId;
            }
        } else {
            Utils.showNotification('Sales module not available. Please ensure sales.js is loaded.');
        }
    }, 100);
}

/**
 * Initiate service from customer
 */
function initiateServiceFromCustomer(customerId) {
    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to create service requests.');
        return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (window.logAction && customer) {
        logAction('Initiated service from customer profile: ' + customer.name);
    }
    
    // Switch to service section
    showSection('service');
    
    // Update nav button state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-btn')[4].classList.add('active'); // Service is 5th button
    
    // Open service modal with pre-selected customer
    setTimeout(() => {
        if (window.ServiceModule && window.ServiceModule.openNewServiceModal) {
            ServiceModule.openNewServiceModal();
            const customerSelect = document.getElementById('serviceCustomer');
            if (customerSelect) {
                customerSelect.value = customerId;
            }
        } else {
            Utils.showNotification('Service module not available. Please ensure service.js is loaded.');
        }
    }, 100);
}

/**
 * Render customer table with API data
 */
function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) {
        console.error('Customer table body not found');
        return;
    }
    
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #999; padding: 20px;">
                    No customers found. Click "Add Customer" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        
        let actionButtons = '';
        
        // Sale and Service buttons (available for all users)
        actionButtons += `
            <button class="btn" onclick="initiateSaleFromCustomer('${customer.id}')" 
                title="New Sale" ${!AuthModule.hasPermission('sales') ? 'disabled' : ''}>
                Sale
            </button>
            <button class="btn" onclick="initiateServiceFromCustomer('${customer.id}')" 
                title="New Service Request" ${!AuthModule.hasPermission('service') ? 'disabled' : ''}>
                Service
            </button>
        `;
        
        // Add edit/delete buttons only for non-staff users
        if (!isStaff) {
            actionButtons = `
                <button class="btn" onclick="editCustomer('${customer.id}')" 
                    title="Edit Customer" ${!AuthModule.hasPermission('customers') ? 'disabled' : ''}>
                    Edit
                </button>
                ${actionButtons}
                <button class="btn btn-danger" onclick="deleteCustomer('${customer.id}')"
                    ${!AuthModule.hasPermission('customers') ? 'disabled' : ''}>
                    Delete
                </button>
            `;
        }
        
        // Creating 8 columns: S.No, Name, Email, Phone, Purchases, Services, Net Value, Actions
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>${Utils.sanitizeHtml(customer.name)}</td>
            <td>${Utils.sanitizeHtml(customer.email)}</td>
            <td>${Utils.sanitizeHtml(customer.phone)}</td>
            <td>${customer.purchases}</td>
            <td>${customer.serviceCount}</td>
            <td><strong style="color: #1a237e;">${Utils.formatCurrency(customer.netValue)}</strong></td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Customer table rendered successfully with API data');
}

/**
 * Get customer statistics with API integration
 */
async function getCustomerStats() {
    try {
        const response = await CustomerAPI.getCustomerStats();
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get customer stats error:', error);
    }
    
    // Fallback to local calculation
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.purchases > 0 || c.serviceCount > 0).length;
    const totalNetValue = customers.reduce((sum, c) => sum + c.netValue, 0);
    const averageNetValue = totalCustomers > 0 ? totalNetValue / totalCustomers : 0;
    const topCustomers = customers
        .sort((a, b) => b.netValue - a.netValue)
        .slice(0, 5);
    
    return {
        totalCustomers,
        activeCustomers,
        totalNetValue,
        averageNetValue,
        topCustomers
    };
}

/**
 * Populate customer dropdown for other modules
 */
function populateCustomerDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Customer</option>';
    customers.forEach(customer => {
        select.innerHTML += `<option value="${customer.id}">${Utils.sanitizeHtml(customer.name)}</option>`;
    });
}

/**
 * Refresh customers from API
 */
async function refreshCustomers() {
    try {
        await loadCustomersFromAPI();
        renderCustomerTable();
        console.log('Customers refreshed from API');
    } catch (error) {
        console.error('Refresh customers error:', error);
        Utils.showNotification('Failed to refresh customer data.');
    }
}

/**
 * Close modal and reset form states - NEW FUNCTION
 */
function closeCustomerModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Reset any forms in the modal
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
            
            // Reset submit buttons
            const submitBtns = form.querySelectorAll('button[type="submit"]');
            submitBtns.forEach(btn => {
                if (btn.dataset.originalText) {
                    resetButton(btn, btn.dataset.originalText);
                } else {
                    btn.disabled = false;
                }
            });
        });
    }
}

// Override the global closeModal function for customer modals
window.closeModal = function(modalId) {
    // Check if it's a customer modal
    if (modalId === 'addCustomerModal' || modalId === 'editCustomerModal') {
        closeCustomerModal(modalId);
    } else {
        // Use original close modal logic for other modals
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
};

// Export functions for global use
window.CustomerModule = {
    initializeCustomers,
    loadCustomersFromAPI,
    openAddCustomerModal,
    addNewCustomer,
    editCustomer,
    updateCustomer,
    deleteCustomer,
    incrementCustomerPurchases,
    incrementCustomerServices,
    decrementCustomerPurchases,
    decrementCustomerServices,
    getCustomerById,
    searchCustomers,
    initiateSaleFromCustomer,
    initiateServiceFromCustomer,
    renderCustomerTable,
    getCustomerStats,
    populateCustomerDropdown,
    updateCustomerNetValue,
    calculateCustomerNetValue,
    refreshCustomers,
    resetButton,
    setButtonLoading,
    closeCustomerModal,
    customers // For access by other modules
};
window.openAddCustomerModal = openAddCustomerModal;
