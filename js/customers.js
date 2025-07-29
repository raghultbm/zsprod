// ZEDSON WATCHCRAFT - Customer Management Module (Fixed)

/**
 * Customer Management System - Fixed for undefined variables
 */

/**
 * Calculate customer's net value from sales and services
 */
function calculateCustomerNetValue(customerId) {
    let salesValue = 0;
    let servicesValue = 0;
    
    // Calculate sales value
    if (window.SalesModule && window.SalesModule.sales) {
        salesValue = window.SalesModule.sales
            .filter(sale => sale.customerId === customerId)
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
    }
    
    // Calculate services value (completed services only)
    if (window.ServiceModule && window.ServiceModule.services) {
        servicesValue = window.ServiceModule.services
            .filter(service => service.customerId === customerId && service.status === 'completed')
            .reduce((sum, service) => sum + service.cost, 0);
    }
    
    return salesValue + servicesValue;
}

/**
 * Update customer's net value
 */
function updateCustomerNetValue(customerId) {
    if (!window.customers) return;
    
    const customer = window.customers.find(c => c.id === customerId);
    if (customer) {
        customer.netValue = calculateCustomerNetValue(customerId);
        renderCustomerTable();
    }
}

/**
 * Update all customers' net values
 */
function updateAllCustomersNetValue() {
    if (!window.customers) return;
    
    window.customers.forEach(customer => {
        customer.netValue = calculateCustomerNetValue(customer.id);
    });
    renderCustomerTable();
}

/**
 * Open Add Customer Modal
 */
function openAddCustomerModal() {
    if (!AuthModule || !AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to add customers.');
        return;
    }
    
    if (window.logAction) {
        logAction('Opened add customer modal');
    }
    
    const modal = document.getElementById('addCustomerModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Add customer modal not found');
    }
}

/**
 * Add new customer
 */
function addNewCustomer(event) {
    event.preventDefault();
    
    if (!AuthModule || !AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to add customers.');
        return;
    }

    // Ensure customers array exists
    if (!window.customers) {
        window.customers = [];
    }
    if (!window.nextCustomerId) {
        window.nextCustomerId = 1;
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

    // Check if email already exists
    if (window.customers.find(c => c.email === email)) {
        Utils.showNotification('A customer with this email already exists');
        return;
    }

    // Check if phone already exists
    if (window.customers.find(c => c.phone === phone)) {
        Utils.showNotification('A customer with this phone number already exists');
        return;
    }

    // Create new customer object
    const newCustomer = {
        id: window.nextCustomerId++,
        name: name,
        email: email,
        phone: phone,
        address: address,
        purchases: 0,
        serviceCount: 0,
        netValue: 0,
        addedDate: Utils.formatDate(new Date()),
        addedBy: AuthModule.getCurrentUser() ? AuthModule.getCurrentUser().username : 'admin'
    };

    // Add to customers array
    window.customers.push(newCustomer);
    
    // Log action
    if (window.logCustomerAction) {
        logCustomerAction('Added new customer: ' + name, newCustomer);
    }
    
    // Update display
    renderCustomerTable();
    if (window.updateDashboard) {
        updateDashboard();
    }
    
    // Close modal and reset form
    closeModal('addCustomerModal');
    event.target.reset();
    
    Utils.showNotification('Customer added successfully!');
}

/**
 * Edit customer
 */
function editCustomer(customerId) {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot edit customers.');
        return;
    }
    
    if (!AuthModule || !AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to edit customers.');
        return;
    }

    if (!window.customers) {
        Utils.showNotification('No customers found.');
        return;
    }

    const customer = window.customers.find(c => c.id === customerId);
    if (!customer) {
        Utils.showNotification('Customer not found.');
        return;
    }

    if (window.logAction) {
        logAction('Opened edit modal for customer: ' + customer.name);
    }

    // Create edit modal
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editCustomerModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editCustomerModal')">&times;</span>
            <h2>Edit Customer</h2>
            <form onsubmit="updateCustomer(event, ${customerId})">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="editCustomerName" value="${customer.name}" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="editCustomerEmail" value="${customer.email}" required>
                </div>
                <div class="form-group">
                    <label>Phone:</label>
                    <input type="tel" id="editCustomerPhone" value="${customer.phone}" required>
                </div>
                <div class="form-group">
                    <label>Address:</label>
                    <textarea id="editCustomerAddress" rows="3">${customer.address || ''}</textarea>
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
 * Update customer
 */
function updateCustomer(event, customerId) {
    event.preventDefault();
    
    if (!window.customers) return;
    
    const customer = window.customers.find(c => c.id === customerId);
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

    // Check if email already exists (excluding current customer)
    if (window.customers.find(c => c.email === email && c.id !== customerId)) {
        Utils.showNotification('A customer with this email already exists');
        return;
    }

    // Check if phone already exists (excluding current customer)
    if (window.customers.find(c => c.phone === phone && c.id !== customerId)) {
        Utils.showNotification('A customer with this phone number already exists');
        return;
    }

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

    // Update customer
    customer.name = name;
    customer.email = email;
    customer.phone = phone;
    customer.address = address;

    renderCustomerTable();
    if (window.updateDashboard) {
        updateDashboard();
    }
    closeModal('editCustomerModal');
    document.getElementById('editCustomerModal').remove();
    Utils.showNotification('Customer updated successfully!');
}

/**
 * Delete customer
 */
function deleteCustomer(customerId) {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot delete customers.');
        return;
    }
    
    if (!AuthModule || !AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to delete customers.');
        return;
    }

    if (!window.customers) {
        Utils.showNotification('No customers found.');
        return;
    }

    const customer = window.customers.find(c => c.id === customerId);
    if (!customer) {
        Utils.showNotification('Customer not found.');
        return;
    }

    if (confirm('Are you sure you want to delete customer "' + customer.name + '"?')) {
        // Log action
        if (window.logCustomerAction) {
            logCustomerAction('Deleted customer: ' + customer.name, customer);
        }
        
        window.customers = window.customers.filter(c => c.id !== customerId);
        renderCustomerTable();
        if (window.updateDashboard) {
            updateDashboard();
        }
        Utils.showNotification('Customer deleted successfully!');
    }
}

/**
 * Update customer purchase count and net value
 */
function incrementCustomerPurchases(customerId) {
    if (!window.customers) return;
    
    const customer = window.customers.find(c => c.id === customerId);
    if (customer) {
        customer.purchases++;
        updateCustomerNetValue(customerId);
    }
}

/**
 * Update customer service count and net value
 */
function incrementCustomerServices(customerId) {
    if (!window.customers) return;
    
    const customer = window.customers.find(c => c.id === customerId);
    if (customer) {
        customer.serviceCount++;
        updateCustomerNetValue(customerId);
    }
}

/**
 * Decrease customer purchase count and net value
 */
function decrementCustomerPurchases(customerId) {
    if (!window.customers) return;
    
    const customer = window.customers.find(c => c.id === customerId);
    if (customer) {
        customer.purchases = Math.max(0, customer.purchases - 1);
        updateCustomerNetValue(customerId);
    }
}

/**
 * Decrease customer service count and net value
 */
function decrementCustomerServices(customerId) {
    if (!window.customers) return;
    
    const customer = window.customers.find(c => c.id === customerId);
    if (customer) {
        customer.serviceCount = Math.max(0, customer.serviceCount - 1);
        updateCustomerNetValue(customerId);
    }
}

/**
 * Get customer by ID
 */
function getCustomerById(customerId) {
    if (!window.customers) return null;
    return window.customers.find(c => c.id === customerId);
}

/**
 * Search customers
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
    if (!AuthModule || !AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to create sales.');
        return;
    }
    
    const customer = getCustomerById(customerId);
    if (window.logAction && customer) {
        logAction('Initiated sale from customer profile: ' + customer.name);
    }
    
    // Switch to sales section
    showSection('sales');
    
    // Update nav button state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const salesBtn = document.querySelector('.nav-btn[onclick*="sales"]');
    if (salesBtn) salesBtn.classList.add('active');
    
    // Open sale modal with pre-selected customer
    setTimeout(() => {
        if (window.openNewSaleModal) {
            openNewSaleModal();
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
    if (!AuthModule || !AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to create service requests.');
        return;
    }

    const customer = getCustomerById(customerId);
    if (window.logAction && customer) {
        logAction('Initiated service from customer profile: ' + customer.name);
    }
    
    // Switch to service section
    showSection('service');
    
    // Update nav button state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const serviceBtn = document.querySelector('.nav-btn[onclick*="service"]');
    if (serviceBtn) serviceBtn.classList.add('active');
    
    // Open service modal with pre-selected customer
    setTimeout(() => {
        if (window.openNewServiceModal) {
            openNewServiceModal();
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
 * Render customer table
 */
function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) {
        console.error('Customer table body not found');
        return;
    }
    
    // Ensure customers array exists
    if (!window.customers) {
        window.customers = [];
    }
    
    tbody.innerHTML = '';
    
    if (window.customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #999; padding: 20px;">
                    No customers yet. Click "Add Customer" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    window.customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        
        let actionButtons = '';
        
        // Sale and Service buttons (available for all users)
        actionButtons += `
            <button class="btn btn-sm" onclick="initiateSaleFromCustomer(${customer.id})" 
                title="New Sale" ${!AuthModule.hasPermission('sales') ? 'disabled' : ''}>
                Sale
            </button>
            <button class="btn btn-sm" onclick="initiateServiceFromCustomer(${customer.id})" 
                title="New Service Request" ${!AuthModule.hasPermission('service') ? 'disabled' : ''}>
                Service
            </button>
        `;
        
        // Add edit/delete buttons only for non-staff users
        if (!isStaff) {
            actionButtons = `
                <button class="btn btn-sm" onclick="editCustomer(${customer.id})" 
                    title="Edit Customer" ${!AuthModule.hasPermission('customers') ? 'disabled' : ''}>
                    Edit
                </button>
                ${actionButtons}
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})"
                    ${!AuthModule.hasPermission('customers') ? 'disabled' : ''}>
                    Delete
                </button>
            `;
        }
        
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
    
    console.log('Customer table rendered successfully');
}

/**
 * Get customer statistics
 */
function getCustomerStats() {
    if (!window.customers) {
        return {
            totalCustomers: 0,
            activeCustomers: 0,
            totalNetValue: 0,
            averageNetValue: 0,
            topCustomers: []
        };
    }
    
    const totalCustomers = window.customers.length;
    const activeCustomers = window.customers.filter(c => c.purchases > 0 || c.serviceCount > 0).length;
    const totalNetValue = window.customers.reduce((sum, c) => sum + c.netValue, 0);
    const averageNetValue = totalCustomers > 0 ? totalNetValue / totalCustomers : 0;
    const topCustomers = window.customers
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
    
    if (window.customers) {
        window.customers.forEach(customer => {
            select.innerHTML += '<option value="' + customer.id + '">' + Utils.sanitizeHtml(customer.name) + '</option>';
        });
    }
}

/**
 * Initialize customer module
 */
function initializeCustomers() {
    updateAllCustomersNetValue();
    renderCustomerTable();
    console.log('Customer module initialized');
}

/**
 * Close modal function
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Load customer modal
 */
function loadCustomerModal() {
    const modalHtml = `
        <!-- Add Customer Modal -->
        <div id="addCustomerModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addCustomerModal')">&times;</span>
                <h2>Add Customer</h2>
                <form onsubmit="addNewCustomer(event)">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="customerName" required>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="customerEmail" required>
                    </div>
                    <div class="form-group">
                        <label>Phone:</label>
                        <input type="tel" id="customerPhone" required>
                    </div>
                    <div class="form-group">
                        <label>Address:</label>
                        <textarea id="customerAddress" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn">Add Customer</button>
                </form>
            </div>
        </div>
    `;
    
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) {
        modalsContainer.innerHTML += modalHtml;
    }
}

// Auto-load modal when module loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadCustomerModal();
        initializeCustomers();
    }, 100);
});

// Make functions globally available
window.addNewCustomer = addNewCustomer;
window.editCustomer = editCustomer;
window.updateCustomer = updateCustomer;
window.deleteCustomer = deleteCustomer;
window.searchCustomers = searchCustomers;
window.openAddCustomerModal = openAddCustomerModal;
window.initiateSaleFromCustomer = initiateSaleFromCustomer;
window.initiateServiceFromCustomer = initiateServiceFromCustomer;

// Export functions for use by other modules
window.CustomerModule = {
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
    initializeCustomers,
    updateCustomerNetValue,
    updateAllCustomersNetValue,
    calculateCustomerNetValue,
    customers: window.customers
};