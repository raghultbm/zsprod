// File: js/customers-mongodb.js
// ZEDSON WATCHCRAFT - Customer Management Module with MongoDB Integration
// Developed by PULSEWARE❤️

/**
 * Customer Management System with MongoDB Backend
 */

// Customer database (local cache)
let customers = [];

/**
 * Open Add Customer Modal
 */
function openAddCustomerModal() {
    if (!AuthModule.hasPermission('customers')) {
        Utils.showNotification('You do not have permission to add customers.');
        return;
    }
    
    document.getElementById('addCustomerModal').style.display = 'block';
}

/**
 * Add new customer - with MongoDB integration
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

    try {
        // Create new customer object
        const newCustomer = {
            name: name,
            email: email,
            phone: phone,
            address: address,
            purchases: 0,
            serviceCount: 0,
            netValue: 0,
            addedBy: AuthModule.getCurrentUser().username
        };

        // Save to MongoDB
        const response = await window.apiService.createCustomer(newCustomer);
        
        if (response.success) {
            // Add to local cache
            customers.push(response.data);
            
            // Update display
            renderCustomerTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Close modal and reset form
            closeModal('addCustomerModal');
            event.target.reset();
            
            Utils.showNotification('Customer added successfully!');
        } else {
            Utils.showNotification(response.error || 'Failed to add customer');
        }
    } catch (error) {
        console.error('Error adding customer:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('A customer with this email or phone already exists');
        } else {
            Utils.showNotification('Error adding customer: ' + error.message);
        }
    }
}

/**
 * Edit customer - with MongoDB integration
 */
async function editCustomer(customerId) {
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

    try {
        const response = await window.apiService.getCustomer(customerId);
        const customer = response.data;
        
        if (!customer) {
            Utils.showNotification('Customer not found.');
            return;
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
                <form onsubmit="CustomerModule.updateCustomer(event, ${customerId})">
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
    } catch (error) {
        console.error('Error fetching customer for edit:', error);
        Utils.showNotification('Error loading customer data: ' + error.message);
    }
}

/**
 * Update customer - with MongoDB integration
 */
async function updateCustomer(event, customerId) {
    event.preventDefault();
    
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

    try {
        const updateData = {
            name,
            email,
            phone,
            address
        };

        const response = await window.apiService.updateCustomer(customerId, updateData);
        
        if (response.success) {
            // Update local cache
            const customerIndex = customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                customers[customerIndex] = { ...customers[customerIndex], ...updateData };
            }
            
            renderCustomerTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            closeModal('editCustomerModal');
            document.getElementById('editCustomerModal').remove();
            Utils.showNotification('Customer updated successfully!');
        } else {
            Utils.showNotification(response.error || 'Failed to update customer');
        }
    } catch (error) {
        console.error('Error updating customer:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('A customer with this email or phone already exists');
        } else {
            Utils.showNotification('Error updating customer: ' + error.message);
        }
    }
}

/**
 * Delete customer - with MongoDB integration
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
            const response = await window.apiService.deleteCustomer(customerId);
            
            if (response.success) {
                // Remove from local cache
                customers = customers.filter(c => c.id !== customerId);
                
                renderCustomerTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
                Utils.showNotification('Customer deleted successfully!');
            } else {
                Utils.showNotification(response.error || 'Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            Utils.showNotification('Error deleting customer: ' + error.message);
        }
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
 * Update customer's net value - with MongoDB integration
 */
async function updateCustomerNetValue(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        const newNetValue = calculateCustomerNetValue(customerId);
        customer.netValue = newNetValue;
        
        try {
            // Update in MongoDB
            await window.apiService.updateCustomer(customerId, { netValue: newNetValue });
            renderCustomerTable();
        } catch (error) {
            console.error('Error updating customer net value:', error);
        }
    }
}

/**
 * Update all customers' net values
 */
async function updateAllCustomersNetValue() {
    for (const customer of customers) {
        await updateCustomerNetValue(customer.id);
    }
}

/**
 * Update customer purchase count and net value - with MongoDB integration
 */
async function incrementCustomerPurchases(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.purchases++;
        
        try {
            await window.apiService.updateCustomer(customerId, { 
                purchases: customer.purchases 
            });
            await updateCustomerNetValue(customerId);
        } catch (error) {
            console.error('Error incrementing customer purchases:', error);
        }
    }
}

/**
 * Update customer service count and net value - with MongoDB integration
 */
async function incrementCustomerServices(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.serviceCount++;
        
        try {
            await window.apiService.updateCustomer(customerId, { 
                serviceCount: customer.serviceCount 
            });
            await updateCustomerNetValue(customerId);
        } catch (error) {
            console.error('Error incrementing customer services:', error);
        }
    }
}

/**
 * Decrease customer purchase count and net value - with MongoDB integration
 */
async function decrementCustomerPurchases(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.purchases = Math.max(0, customer.purchases - 1);
        
        try {
            await window.apiService.updateCustomer(customerId, { 
                purchases: customer.purchases 
            });
            await updateCustomerNetValue(customerId);
        } catch (error) {
            console.error('Error decrementing customer purchases:', error);
        }
    }
}

/**
 * Decrease customer service count and net value - with MongoDB integration
 */
async function decrementCustomerServices(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.serviceCount = Math.max(0, customer.serviceCount - 1);
        
        try {
            await window.apiService.updateCustomer(customerId, { 
                serviceCount: customer.serviceCount 
            });
            await updateCustomerNetValue(customerId);
        } catch (error) {
            console.error('Error decrementing customer services:', error);
        }
    }
}

/**
 * Get customer by ID
 */
function getCustomerById(customerId) {
    return customers.find(c => c.id === customerId);
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
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to create sales.');
        return;
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
 * Render customer table with Net Value column
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
    
            customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        
        let actionButtons = '';
        
        // Sale and Service buttons (available for all users)
        actionButtons += `
            <button class="btn" onclick="initiateSaleFromCustomer(${customer.id})" 
                title="New Sale" ${!AuthModule.hasPermission('sales') ? 'disabled' : ''}>
                Sale
            </button>
            <button class="btn" onclick="initiateServiceFromCustomer(${customer.id})" 
                title="New Service Request" ${!AuthModule.hasPermission('service') ? 'disabled' : ''}>
                Service
            </button>
        `;
        
        // Add edit/delete buttons only for non-staff users
        if (!isStaff) {
            actionButtons = `
                <button class="btn" onclick="editCustomer(${customer.id})" 
                    title="Edit Customer" ${!AuthModule.hasPermission('customers') ? 'disabled' : ''}>
                    Edit
                </button>
                ${actionButtons}
                <button class="btn btn-danger" onclick="deleteCustomer(${customer.id})"
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
    
    console.log('Customer table rendered successfully with Net Value column');
}

/**
 * Get customer statistics
 */
function getCustomerStats() {
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
        select.innerHTML += '<option value="' + customer.id + '">' + Utils.sanitizeHtml(customer.name) + '</option>';
    });
}

/**
 * Load customers from MongoDB
 */
async function loadCustomers() {
    try {
        const response = await window.apiService.getCustomers();
        if (response.success) {
            customers = response.data;
            renderCustomerTable();
            console.log('Customers loaded from MongoDB:', customers.length);
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        Utils.showNotification('Error loading customers from server');
    }
}

/**
 * Initialize customer module
 */
async function initializeCustomers() {
    await loadCustomers();
    await updateAllCustomersNetValue();
    renderCustomerTable();
    console.log('Customer module initialized with MongoDB integration');
}

// Export functions for global use
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
    loadCustomers,
    customers // For access by other modules
};