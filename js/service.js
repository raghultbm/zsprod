// ZEDSON WATCHCRAFT - Service Management Module with MongoDB Integration
// Developed by PULSEWARE❤️

/**
 * Service Management System with MongoDB Backend
 */

// Service database (local cache)
let services = [];

/**
 * Open New Service Modal
 */
function openNewServiceModal() {
    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to create service requests.');
        return;
    }
    
    console.log('Opening New Service Modal');
    
    // Ensure modal exists
    const modal = document.getElementById('newServiceModal');
    if (!modal) {
        Utils.showNotification('Service modal not found. Please refresh the page.');
        return;
    }
    
    // Populate customer dropdown
    if (window.CustomerModule && CustomerModule.populateCustomerDropdown) {
        CustomerModule.populateCustomerDropdown('serviceCustomer');
    }
    
    // Reset form
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
    
    modal.style.display = 'block';
}

/**
 * Add new service request - with MongoDB integration
 */
async function addNewService(event) {
    event.preventDefault();
    
    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to create service requests.');
        return;
    }

    console.log('Adding new service...');

    // Get form data
    const customerId = parseInt(document.getElementById('serviceCustomer').value);
    const type = document.getElementById('serviceType').value;
    const watchName = document.getElementById('serviceWatchName').value.trim();
    const brand = document.getElementById('serviceBrand').value.trim();
    const model = document.getElementById('serviceModel').value.trim();
    const movementNo = document.getElementById('serviceMovementNo').value.trim();
    const dialColor = document.getElementById('serviceDialColor').value.trim() || 'N/A';
    const gender = document.getElementById('serviceGender').value || 'N/A';
    const caseType = document.getElementById('serviceCaseType').value.trim() || 'N/A';
    const strapType = document.getElementById('serviceStrapType').value.trim() || 'N/A';
    const issue = document.getElementById('serviceIssue').value.trim();
    const cost = parseFloat(document.getElementById('serviceCost').value);
    const estimatedDelivery = document.getElementById('serviceEstimatedDelivery').value;
    
    // Validate input
    if (!customerId || !type || !watchName || !brand || !model || !movementNo || !issue || !cost) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    if (cost <= 0) {
        Utils.showNotification('Cost must be greater than zero');
        return;
    }

    // Get customer details
    const customer = CustomerModule.getCustomerById(customerId);
    if (!customer) {
        Utils.showNotification('Selected customer not found');
        return;
    }

    try {
        // Create service object
        const now = new Date();
        const newService = {
            date: Utils.formatDate(now),
            time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Utils.getCurrentTimestamp(),
            customerId: customerId,
            customerName: customer.name,
            type: type,
            watchName: watchName,
            brand: brand,
            model: model,
            dialColor: dialColor,
            movementNo: movementNo,
            gender: gender,
            caseType: caseType,
            strapType: strapType,
            issue: issue,
            cost: cost,
            status: 'pending',
            estimatedDelivery: estimatedDelivery,
            actualDelivery: '',
            completionDescription: '',
            warrantyPeriod: 0,
            createdBy: AuthModule.getCurrentUser().username
        };

        // Save to MongoDB
        const response = await window.apiService.createService(newService);
        
        if (response.success) {
            // Add to local cache
            services.push(response.data);
            
            // Update customer service count
            await CustomerModule.incrementCustomerServices(customerId);
            
            // Generate Service Acknowledgement Receipt
            if (window.InvoiceModule) {
                const acknowledgement = InvoiceModule.generateServiceAcknowledgement(response.data);
                if (acknowledgement) {
                    response.data.acknowledgementGenerated = true;
                    response.data.acknowledgementInvoiceId = acknowledgement.id;
                }
            }
            
            // Update displays
            renderServiceTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Close modal and reset form
            document.getElementById('newServiceModal').style.display = 'none';
            event.target.reset();
            
            Utils.showNotification(`Service request created successfully! Service ID: ${response.data.id}. Acknowledgement receipt generated.`);
            console.log('Service added:', response.data);
        } else {
            Utils.showNotification(response.error || 'Failed to add service request');
        }
    } catch (error) {
        console.error('Error adding service:', error);
        Utils.showNotification('Error adding service request: ' + error.message);
    }
}

/**
 * Update service status - with MongoDB integration
 */
async function updateServiceStatus(serviceId, newStatus) {
    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to update service status.');
        return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) {
        Utils.showNotification('Service not found.');
        return;
    }

    try {
        const updateData = { status: newStatus };
        
        // If marking as completed, ask for completion details
        if (newStatus === 'completed') {
            const completionDescription = prompt('Enter completion description (optional):') || 'Service completed successfully';
            const warrantyPeriod = parseInt(prompt('Enter warranty period in months (0 for no warranty):') || '0');
            
            updateData.completionDescription = completionDescription;
            updateData.warrantyPeriod = Math.max(0, warrantyPeriod);
            updateData.actualDelivery = Utils.formatDate(new Date());
        }

        const response = await window.apiService.updateService(serviceId, updateData);
        
        if (response.success) {
            // Update local cache
            Object.assign(service, updateData);
            
            // Generate completion invoice if status is completed
            if (newStatus === 'completed' && window.InvoiceModule) {
                const completionInvoice = InvoiceModule.generateServiceCompletionInvoice(service);
                if (completionInvoice) {
                    service.completionInvoiceGenerated = true;
                    service.completionInvoiceId = completionInvoice.id;
                }
            }
            
            renderServiceTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            Utils.showNotification(`Service status updated to ${newStatus}!`);
        } else {
            Utils.showNotification(response.error || 'Failed to update service status');
        }
    } catch (error) {
        console.error('Error updating service status:', error);
        Utils.showNotification('Error updating service status: ' + error.message);
    }
}

/**
 * Delete service - with MongoDB integration
 */
async function deleteService(serviceId) {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot delete service requests.');
        return;
    }

    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to delete service requests.');
        return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) {
        Utils.showNotification('Service not found.');
        return;
    }

    if (confirm(`Are you sure you want to delete the service request for ${service.watchName}?`)) {
        try {
            const response = await window.apiService.deleteService(serviceId);
            
            if (response.success) {
                // Update customer service count
                await CustomerModule.decrementCustomerServices(service.customerId);
                
                // Remove from local cache
                services = services.filter(s => s.id !== serviceId);
                
                renderServiceTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
                Utils.showNotification('Service request deleted successfully!');
            } else {
                Utils.showNotification(response.error || 'Failed to delete service request');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            Utils.showNotification('Error deleting service request: ' + error.message);
        }
    }
}

/**
 * View service acknowledgement receipt
 */
function viewServiceAcknowledgement(serviceId) {
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    InvoiceModule.viewServiceAcknowledgement(serviceId);
}

/**
 * View service completion invoice
 */
function viewServiceCompletionInvoice(serviceId) {
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    const invoices = InvoiceModule.getInvoicesForTransaction(serviceId, 'service');
    const completionInvoice = invoices.find(inv => inv.type === 'Service Completion');
    
    if (completionInvoice) {
        InvoiceModule.viewInvoice(completionInvoice.id);
    } else {
        Utils.showNotification('No completion invoice found for this service.');
    }
}

/**
 * Get service by ID
 */
function getServiceById(serviceId) {
    return services.find(s => s.id === serviceId);
}

/**
 * Get services by customer
 */
function getServicesByCustomer(customerId) {
    return services.filter(service => service.customerId === customerId);
}

/**
 * Get incomplete services
 */
function getIncompleteServices() {
    return services.filter(service => service.status !== 'completed');
}

/**
 * Search services
 */
function searchServices(query) {
    const tbody = document.getElementById('serviceTableBody');
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
 * Render service table
 */
function renderServiceTable() {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort services by date (newest first)
    const sortedServices = services.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedServices.forEach((service, index) => {
        const row = document.createElement('tr');
        
        // Check user permissions
        const currentUser = AuthModule.getCurrentUser();
        const isStaff = currentUser && currentUser.role === 'staff';
        const canEdit = !isStaff && AuthModule.hasPermission('service');
        
        // Build action buttons based on permissions and service status
        let actionButtons = '';
        
        // Status update buttons (available for all users)
        if (service.status !== 'completed') {
            actionButtons += `
                <button class="btn btn-sm" onclick="ServiceModule.updateServiceStatus(${service.id}, 'in-progress')"
                    ${service.status === 'in-progress' ? 'disabled' : ''}>In Progress</button>
                <button class="btn btn-sm" onclick="ServiceModule.updateServiceStatus(${service.id}, 'on-hold')"
                    ${service.status === 'on-hold' ? 'disabled' : ''}>On Hold</button>
                <button class="btn btn-sm btn-success" onclick="ServiceModule.updateServiceStatus(${service.id}, 'completed')">Complete</button>
            `;
        }
        
        // Acknowledgement receipt button
        actionButtons += `
            <button class="btn btn-sm" onclick="ServiceModule.viewServiceAcknowledgement(${service.id})" title="View Receipt">Receipt</button>
        `;
        
        // Completion invoice button (only if completed)
        if (service.status === 'completed') {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="ServiceModule.viewServiceCompletionInvoice(${service.id})" title="View Invoice">Invoice</button>
            `;
        }
        
        // Delete button (only for non-staff users)
        if (canEdit) {
            actionButtons += `
                <button class="btn btn-sm btn-danger" onclick="ServiceModule.deleteService(${service.id})">Delete</button>
            `;
        }
        
        // Get customer mobile number
        const customer = window.CustomerModule ? CustomerModule.getCustomerById(service.customerId) : null;
        const customerMobile = customer ? customer.phone : 'N/A';
        
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>${Utils.sanitizeHtml(service.date)}</td>
            <td>${Utils.sanitizeHtml(service.time)}</td>
            <td class="customer-info">
                <div class="customer-name">${Utils.sanitizeHtml(service.customerName)}</div>
                <div class="customer-mobile">${Utils.sanitizeHtml(customerMobile)}</div>
            </td>
            <td>
                <strong>${Utils.sanitizeHtml(service.watchName)}</strong><br>
                <small>Type: ${Utils.sanitizeHtml(service.type)}</small>
            </td>
            <td>
                <strong>${Utils.sanitizeHtml(service.brand)} ${Utils.sanitizeHtml(service.model)}</strong><br>
                <small>Movement: ${Utils.sanitizeHtml(service.movementNo)}</small><br>
                <small>Dial: ${Utils.sanitizeHtml(service.dialColor)}</small>
            </td>
            <td>${Utils.sanitizeHtml(service.issue)}</td>
            <td><span class="status ${service.status.replace('-', '')}">${service.status}</span></td>
            <td>${Utils.formatCurrency(service.cost)}</td>
            <td style="white-space: nowrap;">${actionButtons}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Load services from MongoDB
 */
async function loadServices() {
    try {
        const response = await window.apiService.getServices();
        if (response.success) {
            services = response.data;
            renderServiceTable();
            console.log('Services loaded from MongoDB:', services.length);
        }
    } catch (error) {
        console.error('Error loading services:', error);
        Utils.showNotification('Error loading services from server');
    }
}

/**
 * Initialize service module
 */
async function initializeServices() {
    await loadServices();
    renderServiceTable();
    console.log('Service module initialized with MongoDB integration');
}

// Export functions for global use
window.ServiceModule = {
    openNewServiceModal,
    addNewService,
    updateServiceStatus,
    deleteService,
    viewServiceAcknowledgement,
    viewServiceCompletionInvoice,
    getServiceById,
    getServicesByCustomer,
    getIncompleteServices,
    searchServices,
    renderServiceTable,
    loadServices,
    initializeServices,
    services // For access by other modules
};