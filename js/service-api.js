// ZEDSON WATCHCRAFT - Service Management Module with API Integration

/**
 * Service Request Management System with API Integration
 */

// Local cache for services (for quick access)
let services = [];

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
 * Initialize service module with API data
 */
async function initializeServices() {
    try {
        await loadServicesFromAPI();
        renderServiceTable();
        console.log('Service module initialized with API integration');
    } catch (error) {
        console.error('Service initialization error:', error);
        Utils.showNotification('Failed to load services. Please refresh the page.');
    }
}

/**
 * Load services from API
 */
async function loadServicesFromAPI() {
    try {
        const response = await ServiceAPI.getServices();
        if (response.success) {
            services = response.data || [];
            console.log(`Loaded ${services.length} services from API`);
        }
    } catch (error) {
        console.error('Load services error:', error);
        throw error;
    }
}

/**
 * Open New Service Modal
 */
function openNewServiceModal() {
    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to create service requests.');
        return;
    }
    
    if (window.logAction) {
        logAction('Opened new service modal');
    }
    
    // Populate customer dropdown
    CustomerModule.populateCustomerDropdown('serviceCustomer');
    
    // Reset form
    const modal = document.getElementById('newServiceModal');
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        
        // Reset the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            resetButton(submitBtn, 'Create Service Request');
        }
    }
    
    modal.style.display = 'block';
}

/**
 * Add new service request with API integration
 */
async function addNewService(event) {
    event.preventDefault();
    
    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to create service requests.');
        return;
    }

    // Get form data
    const customerId = document.getElementById('serviceCustomer').value;
    const brand = document.getElementById('serviceBrand').value.trim();
    const model = document.getElementById('serviceModel').value.trim();
    const dialColor = document.getElementById('serviceDialColor').value.trim();
    const movementNo = document.getElementById('serviceMovementNo').value.trim();
    const gender = document.getElementById('serviceGender').value;
    const caseType = document.getElementById('serviceCase').value;
    const strapType = document.getElementById('serviceStrap').value;
    const issue = document.getElementById('serviceIssue').value.trim();
    const cost = parseFloat(document.getElementById('serviceCost').value);
    
    // Validate input
    if (!customerId || !brand || !model || !dialColor || !movementNo || 
        !gender || !caseType || !strapType || !issue || cost < 0) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Creating Request...');

    try {
        const serviceData = {
            customerId,
            brand,
            model,
            dialColor,
            movementNo,
            gender,
            caseType,
            strapType,
            issue,
            cost
        };

        const response = await ServiceAPI.createService(serviceData);

        if (response.success) {
            // Log action
            if (window.logServiceAction) {
                logServiceAction(`Created service request for ${response.data.customerName}'s ${brand} ${model}`, response.data);
            }
            
            // Add to local cache
            services.push(response.data);
            
            // Generate Service Acknowledgement automatically
            try {
                const ackResponse = await InvoiceAPI.generateServiceAcknowledgement(response.data.id);
                if (ackResponse.success) {
                    response.data.acknowledgementGenerated = true;
                    response.data.acknowledgementInvoiceId = ackResponse.data.id;
                }
            } catch (ackError) {
                console.error('Acknowledgement generation error:', ackError);
                // Don't fail the service if acknowledgement generation fails
            }
            
            // Update displays
            renderServiceTable();
            updateDashboard();
            
            // Close modal and reset form
            closeModal('newServiceModal');
            event.target.reset();
            
            Utils.showNotification(`Service request created successfully! Request ID: ${response.data.id}. Acknowledgement generated.`);
        }

    } catch (error) {
        console.error('Create service error:', error);
        Utils.showNotification(error.message || 'Failed to create service request. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Create Service Request');
    }
}

/**
 * Update service status with API integration
 */
async function updateServiceStatus(serviceId, newStatus) {
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        Utils.showNotification('Service request not found.');
        return;
    }

    const oldStatus = service.status;
    
    // Show confirmation BEFORE changing status
    let confirmMessage = '';
    if (newStatus === 'in-progress') {
        confirmMessage = `Start working on service for ${service.customerName}'s ${service.watchName}?`;
    } else if (newStatus === 'on-hold') {
        confirmMessage = `Put service for ${service.customerName}'s ${service.watchName} on hold?`;
    } else if (newStatus === 'completed' && oldStatus === 'in-progress') {
        showServiceCompletionModal(service);
        return;
    }
    
    if (confirmMessage && !confirm(confirmMessage)) {
        return;
    }
    
    try {
        const response = await ServiceAPI.updateServiceStatus(serviceId, newStatus);
        
        if (response.success) {
            // Log action
            if (window.logAction) {
                logAction(`Changed service ${serviceId} status from ${oldStatus} to ${newStatus}`);
            }
            
            // Update local cache
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                services[serviceIndex] = response.data;
            }
            
            renderServiceTable();
            updateDashboard();
            Utils.showNotification(`Service status updated to: ${newStatus}`);
        }

    } catch (error) {
        console.error('Update service status error:', error);
        Utils.showNotification(error.message || 'Failed to update service status.');
    }
}

/**
 * Show service completion modal with image upload and final service cost
 */
function showServiceCompletionModal(service) {
    const confirmMessage = `Complete service for ${service.customerName}'s ${service.watchName}?\n\nThis will require completion details and warranty information.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const completionModal = document.createElement('div');
    completionModal.className = 'modal';
    completionModal.id = 'serviceCompletionModal';
    completionModal.style.display = 'block';
    completionModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('serviceCompletionModal')">&times;</span>
            <h2>Complete Service Request</h2>
            <p><strong>Service ID:</strong> ${service.id} - ${service.watchName}</p>
            <form onsubmit="ServiceModuleAPI.completeService(event, '${service.id}')">
                <div class="form-group">
                    <label>Completion Image:</label>
                    <input type="file" id="completionImage" accept="image/*" onchange="previewCompletionImage(event)">
                    <small>Upload an image showing the completed work (optional)</small>
                    <div id="imagePreview" style="margin-top: 10px; display: none;">
                        <img id="previewImg" style="max-width: 200px; max-height: 200px; border-radius: 5px; border: 1px solid #ddd;">
                    </div>
                </div>
                <div class="form-group">
                    <label>Work Description:</label>
                    <textarea id="completionDescription" rows="4" required 
                        placeholder="Describe the work performed, parts replaced, etc."></textarea>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Service Cost (₹):</label>
                        <input type="number" id="finalServiceCost" min="0" step="0.01" value="${service.cost}" required>
                        <small>Final billing amount for the service</small>
                    </div>
                    <div class="form-group">
                        <label>Warranty Period (months):</label>
                        <input type="number" id="warrantyPeriod" min="0" max="60" value="6" required>
                        <small>Enter warranty period in months (0-60)</small>
                    </div>
                </div>
                <div class="grid grid-2">
                    <button type="button" class="btn btn-danger" onclick="closeModal('serviceCompletionModal')">Cancel</button>
                    <button type="submit" class="btn btn-success">Complete Service</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(completionModal);
}

/**
 * Preview uploaded completion image
 */
function previewCompletionImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
}

/**
 * Complete service with details including image and final cost
 */
async function completeService(event, serviceId) {
    event.preventDefault();
    
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        Utils.showNotification('Service not found.');
        return;
    }
    
    const imageFile = document.getElementById('completionImage').files[0];
    const description = document.getElementById('completionDescription').value.trim();
    const finalCost = parseFloat(document.getElementById('finalServiceCost').value);
    const warranty = parseInt(document.getElementById('warrantyPeriod').value);
    
    if (!description) {
        Utils.showNotification('Please provide a work description.');
        return;
    }
    
    if (finalCost < 0) {
        Utils.showNotification('Service cost cannot be negative.');
        return;
    }
    
    if (warranty < 0 || warranty > 60) {
        Utils.showNotification('Warranty period must be between 0 and 60 months.');
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Completing Service...');
    
    try {
        // Handle image upload (convert to base64 for API)
        let imageDataUrl = null;
        if (imageFile) {
            imageDataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                reader.readAsDataURL(imageFile);
            });
        }

        const completionData = {
            description,
            finalCost,
            warrantyPeriod: warranty,
            image: imageDataUrl
        };

        const response = await ServiceAPI.completeService(serviceId, completionData);

        if (response.success) {
            // Log action
            if (window.logAction) {
                logAction(`Completed service ${serviceId} for ${service.customerName}'s ${service.watchName}. Final cost: ${Utils.formatCurrency(finalCost)}`);
            }
            
            // Update local cache
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                services[serviceIndex] = response.data;
            }
            
            // Generate Service Completion Invoice automatically
            try {
                const invoiceResponse = await InvoiceAPI.generateServiceCompletionInvoice(serviceId);
                if (invoiceResponse.success) {
                    services[serviceIndex].completionInvoiceGenerated = true;
                    services[serviceIndex].completionInvoiceId = invoiceResponse.data.id;
                }
            } catch (invoiceError) {
                console.error('Completion invoice generation error:', invoiceError);
                // Don't fail the completion if invoice generation fails
            }
            
            renderServiceTable();
            updateDashboard();
            closeModal('serviceCompletionModal');
            document.getElementById('serviceCompletionModal').remove();
            
            Utils.showNotification('Service completed successfully! Completion invoice generated.');
        }

    } catch (error) {
        console.error('Complete service error:', error);
        Utils.showNotification(error.message || 'Failed to complete service. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Complete Service');
    }
}

/**
 * Edit service with API integration
 */
function editService(serviceId) {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        Utils.showNotification('Staff users cannot edit service requests.');
        return;
    }
    
    if (!AuthModule.hasPermission('service')) {
        Utils.showNotification('You do not have permission to edit service requests.');
        return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) {
        Utils.showNotification('Service request not found.');
        return;
    }

    // Create edit modal
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editServiceModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeEditServiceModal()">&times;</span>
            <h2>Edit Service Request</h2>
            <form onsubmit="ServiceModuleAPI.updateService(event, '${serviceId}')">
                <div class="form-group">
                    <label>Customer:</label>
                    <select id="editServiceCustomer" required>
                        <option value="">Select Customer</option>
                    </select>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Watch Brand:</label>
                        <input type="text" id="editServiceBrand" value="${service.brand}" required>
                    </div>
                    <div class="form-group">
                        <label>Watch Model:</label>
                        <input type="text" id="editServiceModel" value="${service.model}" required>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Dial Colour:</label>
                        <input type="text" id="editServiceDialColor" value="${service.dialColor}" required>
                    </div>
                    <div class="form-group">
                        <label>Movement No:</label>
                        <input type="text" id="editServiceMovementNo" value="${service.movementNo}" required>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Gender:</label>
                        <select id="editServiceGender" required>
                            <option value="Male" ${service.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${service.gender === 'Female' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Case Material:</label>
                        <select id="editServiceCase" required>
                            <option value="Steel" ${service.caseType === 'Steel' ? 'selected' : ''}>Steel</option>
                            <option value="Gold Tone" ${service.caseType === 'Gold Tone' ? 'selected' : ''}>Gold Tone</option>
                            <option value="Fiber" ${service.caseType === 'Fiber' ? 'selected' : ''}>Fiber</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Strap Material:</label>
                        <select id="editServiceStrap" required>
                            <option value="Fiber" ${service.strapType === 'Fiber' ? 'selected' : ''}>Fiber</option>
                            <option value="Steel" ${service.strapType === 'Steel' ? 'selected' : ''}>Steel</option>
                            <option value="Gold Plated" ${service.strapType === 'Gold Plated' ? 'selected' : ''}>Gold Plated</option>
                            <option value="Leather" ${service.strapType === 'Leather' ? 'selected' : ''}>Leather</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cost (₹):</label>
                        <input type="number" id="editServiceCost" value="${service.cost}" required min="0" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <label>Issue Description:</label>
                    <textarea id="editServiceIssue" rows="3" required>${service.issue}</textarea>
                </div>
                <button type="submit" class="btn">Update Service Request</button>
                <button type="button" class="btn btn-danger" onclick="closeEditServiceModal()">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
    
    // Populate customer dropdown and set current customer
    if (window.CustomerModule) {
        CustomerModule.populateCustomerDropdown('editServiceCustomer');
        setTimeout(() => {
            const customerSelect = document.getElementById('editServiceCustomer');
            if (customerSelect) {
                customerSelect.value = service.customerId;
            }
        }, 50);
    }
}

/**
 * Close edit service modal
 */
function closeEditServiceModal() {
    const modal = document.getElementById('editServiceModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Update service with API integration
 */
async function updateService(event, serviceId) {
    event.preventDefault();
    
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        Utils.showNotification('Service not found.');
        return;
    }

    const customerId = document.getElementById('editServiceCustomer').value;
    const brand = document.getElementById('editServiceBrand').value.trim();
    const model = document.getElementById('editServiceModel').value.trim();
    const dialColor = document.getElementById('editServiceDialColor').value.trim();
    const movementNo = document.getElementById('editServiceMovementNo').value.trim();
    const gender = document.getElementById('editServiceGender').value;
    const caseType = document.getElementById('editServiceCase').value;
    const strapType = document.getElementById('editServiceStrap').value;
    const issue = document.getElementById('editServiceIssue').value.trim();
    const cost = parseFloat(document.getElementById('editServiceCost').value);

    // Validate input
    if (!customerId || !brand || !model || !dialColor || !movementNo || 
        !gender || !caseType || !strapType || !issue || cost < 0) {
        Utils.showNotification('Please fill in all required fields correctly');
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Updating...');

    try {
        const serviceData = {
            customerId,
            brand,
            model,
            dialColor,
            movementNo,
            gender,
            caseType,
            strapType,
            issue,
            cost
        };

        const response = await ServiceAPI.updateService(serviceId, serviceData);

        if (response.success) {
            // Log action
            if (window.logServiceAction) {
                logServiceAction(`Updated service request ${serviceId}`, response.data);
            }

            // Update local cache
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                services[serviceIndex] = response.data;
            }

            renderServiceTable();
            updateDashboard();
            closeEditServiceModal();
            Utils.showNotification('Service request updated successfully!');
        }

    } catch (error) {
        console.error('Update service error:', error);
        Utils.showNotification(error.message || 'Failed to update service. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Update Service Request');
    }
}

/**
 * Delete service request with API integration
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
        Utils.showNotification('Service request not found.');
        return;
    }

    if (confirm(`Are you sure you want to delete the service request for ${service.watchName}?`)) {
        try {
            const response = await ServiceAPI.deleteService(serviceId);
            
            if (response.success) {
                // Log action
                if (window.logAction) {
                    logAction(`Deleted service request ${serviceId} for ${service.customerName}'s ${service.watchName}`);
                }
                
                // Remove from local cache
                services = services.filter(s => s.id !== serviceId);
                
                renderServiceTable();
                updateDashboard();
                Utils.showNotification('Service request deleted successfully!');
            }

        } catch (error) {
            console.error('Delete service error:', error);
            Utils.showNotification(error.message || 'Failed to delete service. Please try again.');
        }
    }
}

/**
 * View service acknowledgement with API integration
 */
async function viewServiceAcknowledgement(serviceId) {
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    try {
        const response = await InvoiceAPI.getServiceAcknowledgement(serviceId);
        if (response.success) {
            // Create acknowledgement view using the template
            if (window.InvoiceTemplates && window.InvoiceTemplates.createServiceAcknowledgementHTML) {
                const ackHTML = window.InvoiceTemplates.createServiceAcknowledgementHTML(response.data);
                document.getElementById('invoicePreviewContent').innerHTML = ackHTML;
                document.getElementById('invoicePreviewModal').style.display = 'block';
            } else {
                Utils.showNotification('Acknowledgement template not available');
            }
        }
    } catch (error) {
        console.error('View service acknowledgement error:', error);
        Utils.showNotification('No acknowledgement found for this service.');
    }
}

/**
 * View service completion invoice with API integration
 */
async function viewServiceCompletionInvoice(serviceId) {
    console.log('Attempting to view service completion invoice for service ID:', serviceId);
    
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    try {
        const response = await InvoiceAPI.getInvoicesByTransaction(serviceId, 'service');
        console.log('Found invoices for service:', response);
        
        if (response.success && response.data.length > 0) {
            const completionInvoice = response.data.find(inv => inv.type === 'Service Completion');
            console.log('Found completion invoice:', completionInvoice);
            
            if (completionInvoice) {
                InvoiceModule.viewInvoice(completionInvoice.id);
            } else {
                Utils.showNotification('No completion invoice found for this service.');
            }
        } else {
            Utils.showNotification('No completion invoice found for this service.');
        }
    } catch (error) {
        console.error('View service completion invoice error:', error);
        Utils.showNotification('Failed to load completion invoice.');
    }
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
 * Get service statistics with API integration
 */
async function getServiceStats() {
    try {
        const response = await ServiceAPI.getServiceStats();
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get service stats error:', error);
    }
    
    // Fallback to local calculation
    const totalServices = services.length;
    const pendingServices = services.filter(s => s.status === 'pending').length;
    const inProgressServices = services.filter(s => s.status === 'in-progress').length;
    const onHoldServices = services.filter(s => s.status === 'on-hold').length;
    const completedServices = services.filter(s => s.status === 'completed').length;
    const incompleteServices = totalServices - completedServices;
    const totalRevenue = services.filter(s => s.status === 'completed')
        .reduce((sum, service) => sum + service.cost, 0);
    const averageServiceCost = totalServices > 0 ? 
        services.reduce((sum, service) => sum + service.cost, 0) / totalServices : 0;
    
    return {
        totalServices,
        pendingServices,
        inProgressServices,
        onHoldServices,
        completedServices,
        incompleteServices,
        totalRevenue,
        averageServiceCost
    };
}

/**
 * Get incomplete services
 */
function getIncompleteServices(limit = 5) {
    return services
        .filter(s => s.status !== 'completed')
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
        .slice(0, limit);
}

/**
 * Filter services by date range
 */
function filterServicesByDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return services.filter(service => {
        const serviceDate = new Date(service.timestamp || service.createdAt);
        return serviceDate >= from && serviceDate <= to;
    });
}

/**
 * Filter services by month and year
 */
function filterServicesByMonth(month, year) {
    return services.filter(service => {
        const serviceDate = new Date(service.timestamp || service.createdAt);
        return serviceDate.getMonth() === parseInt(month) && serviceDate.getFullYear() === parseInt(year);
    });
}

/**
 * Render service table with updated action buttons and API data
 */
function renderServiceTable() {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (services.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: #999; padding: 20px;">
                    No service requests found. Click "New Service Request" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    // Sort services by date (newest first)
    const sortedServices = services.sort((a, b) => 
        new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
    );
    
    sortedServices.forEach((service, index) => {
        const row = document.createElement('tr');
        
        // Create action buttons based on status and user role
        let actionButtons = '';
        if (service.status === 'pending') {
            actionButtons = `
                <button class="btn btn-sm" onclick="updateServiceStatus('${service.id}', 'in-progress')">Start</button>
                <button class="btn btn-sm" onclick="updateServiceStatus('${service.id}', 'on-hold')">Hold</button>
            `;
        } else if (service.status === 'in-progress') {
            actionButtons = `
                <button class="btn btn-sm btn-success" onclick="updateServiceStatus('${service.id}', 'completed')">Complete</button>
                <button class="btn btn-sm" onclick="updateServiceStatus('${service.id}', 'on-hold')">Hold</button>
            `;
        } else if (service.status === 'on-hold') {
            actionButtons = `
                <button class="btn btn-sm btn-success" onclick="updateServiceStatus('${service.id}', 'in-progress')">Resume</button>
            `;
        }
        
        // Add edit/delete buttons only for non-staff users
        if (!isStaff) {
            actionButtons += `
                <button class="btn btn-sm" onclick="editService('${service.id}')" 
                    ${!AuthModule.hasPermission('service') ? 'disabled' : ''}>Edit</button>
                <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete this service request?', () => deleteService('${service.id}'))" 
                    ${!AuthModule.hasPermission('service') ? 'disabled' : ''}>Delete</button>
            `;
        }
        
        // Add invoice view buttons
        const hasAcknowledgement = service.acknowledgementGenerated || service.acknowledgementInvoiceId;
        const hasCompletionInvoice = (service.completionInvoiceGenerated || service.completionInvoiceId) && service.status === 'completed';
        
        if (hasAcknowledgement) {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="ServiceModuleAPI.viewServiceAcknowledgement('${service.id}')" title="View Acknowledgement">Receipt</button>
            `;
        }
        
        if (hasCompletionInvoice) {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="ServiceModuleAPI.viewServiceCompletionInvoice('${service.id}')" title="View Completion Invoice">Invoice</button>
            `;
        }
        
        // Get customer mobile number
        const customer = window.CustomerModule ? CustomerModule.getCustomerById(service.customerId) : null;
        const customerMobile = customer ? customer.phone : 
            (service.customerId && service.customerId.phone ? service.customerId.phone : 'N/A');
        
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
                <small>${Utils.sanitizeHtml(service.brand)} ${Utils.sanitizeHtml(service.model)}</small>
            </td>
            <td>
                <small>
                    <strong>Dial:</strong> ${Utils.sanitizeHtml(service.dialColor)}<br>
                    <strong>Movement:</strong> ${Utils.sanitizeHtml(service.movementNo)}<br>
                    <strong>Gender:</strong> ${Utils.sanitizeHtml(service.gender)}<br>
                    <strong>Case:</strong> ${Utils.sanitizeHtml(service.caseType)}<br>
                    <strong>Strap:</strong> ${Utils.sanitizeHtml(service.strapType)}
                </small>
            </td>
            <td>${Utils.sanitizeHtml(service.issue)}</td>
            <td><span class="status ${service.status}">${service.status}</span></td>
            <td>${Utils.formatCurrency(service.cost)}</td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Refresh services from API
 */
async function refreshServices() {
    try {
        await loadServicesFromAPI();
        renderServiceTable();
        console.log('Services refreshed from API');
    } catch (error) {
        console.error('Refresh services error:', error);
        Utils.showNotification('Failed to refresh services data.');
    }
}

// Make preview function globally available
window.previewCompletionImage = previewCompletionImage;

// Make close function globally available
window.closeEditServiceModal = closeEditServiceModal;

// Export functions for global use
window.ServiceModuleAPI = {
    initializeServices,
    loadServicesFromAPI,
    openNewServiceModal,
    addNewService,
    updateServiceStatus,
    editService,
    updateService,
    showServiceCompletionModal,
    completeService,
    deleteService,
    viewServiceAcknowledgement,
    viewServiceCompletionInvoice,
    searchServices,
    renderServiceTable,
    getServiceStats,
    getIncompleteServices,
    filterServicesByDateRange,
    filterServicesByMonth,
    refreshServices,
    resetButton,
    setButtonLoading,
    services // For access by other modules
};