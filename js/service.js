// ZEDSON WATCHCRAFT - Service Management Module (Phase 4 - API Integration)

/**
 * Service Request Management System with API Integration
 * Updated to use backend APIs instead of local data
 */

// Local cache for services and offline fallback
let services = [];
let nextServiceId = 1;
let isLoading = false;
let lastSyncTime = null;

/**
 * Initialize service module with API integration
 */
async function initializeServices() {
    try {
        showLoadingState('services');
        await loadServicesFromAPI();
        renderServiceTable();
        lastSyncTime = new Date();
        console.log('Service module initialized with API integration');
    } catch (error) {
        console.error('Service initialization error:', error);
        // Fall back to local data if API fails
        if (services.length === 0) {
            loadSampleServices();
        }
        renderServiceTable();
        showAPIError('Failed to load services from server. Using offline data.');
    } finally {
        hideLoadingState('services');
    }
}

/**
 * Load services from API with caching
 */
async function loadServicesFromAPI() {
    try {
        const response = await api.services.getServices();
        if (response.success) {
            services = response.data || [];
            console.log(`Loaded ${services.length} services from API`);
            
            // Update nextServiceId for local operations
            if (services.length > 0) {
                nextServiceId = Math.max(...services.map(s => s.id || 0)) + 1;
            }
            
            // Cache the data
            cacheManager.set('services_data', services, 10 * 60 * 1000); // 10 minutes cache
            return services;
        } else {
            throw new Error(response.message || 'Failed to load services');
        }
    } catch (error) {
        console.error('Load services API error:', error);
        
        // Try to use cached data
        const cachedServices = cacheManager.get('services_data');
        if (cachedServices) {
            services = cachedServices;
            console.log('Using cached service data');
            return services;
        }
        
        throw error;
    }
}

/**
 * Refresh services from API
 */
async function refreshServices() {
    try {
        showLoadingState('refresh');
        cacheManager.clear('services_data'); // Clear cache to force fresh load
        await loadServicesFromAPI();
        renderServiceTable();
        lastSyncTime = new Date();
        showSuccessMessage('Services refreshed successfully');
    } catch (error) {
        console.error('Refresh services error:', error);
        showAPIError('Failed to refresh service data');
    } finally {
        hideLoadingState('refresh');
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
    if (window.CustomerModule) {
        CustomerModule.populateCustomerDropdown('serviceCustomer');
    }
    
    document.getElementById('newServiceModal').style.display = 'block';
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
    const customerId = parseInt(document.getElementById('serviceCustomer').value);
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
        !gender || !caseType || !strapType || !issue || !cost) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    if (cost < 0) {
        Utils.showNotification('Service cost cannot be negative');
        return;
    }

    // Get customer details
    const customer = CustomerModule.getCustomerById(customerId);
    if (!customer) {
        Utils.showNotification('Selected customer not found');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;
        
        // Prepare service data
        const serviceData = {
            customerId: customerId,
            watchDetails: {
                brand: brand,
                model: model,
                dialColor: dialColor,
                movementNo: movementNo,
                gender: gender,
                caseType: caseType,
                strapType: strapType
            },
            issue: issue,
            estimatedCost: cost
        };

        // Call API
        const response = await api.services.createService(serviceData);
        
        if (response.success) {
            // Log action
            if (window.logServiceAction) {
                logServiceAction(`Created service request for ${customer.name}'s ${brand} ${model}. Estimated cost: ${Utils.formatCurrency(cost)}`, response.data);
            }
            
            // Add to local cache
            services.push(response.data);
            
            // Update customer service count
            if (window.CustomerModule) {
                CustomerModule.incrementCustomerServices(customerId);
            }
            
            // Generate Service Acknowledgement automatically
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
            closeModal('newServiceModal');
            event.target.reset();
            
            Utils.showNotification(`Service request created successfully! Request ID: ${response.data.id}. Acknowledgement generated.`);
            
        } else {
            throw new Error(response.message || 'Failed to create service request');
        }
        
    } catch (error) {
        console.error('Add service error:', error);
        Utils.showNotification(error.message || 'Failed to create service request. Please try again.');
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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
        showLoadingState('status-update');
        
        // Prepare status data
        const statusData = {
            status: newStatus,
            reason: `Status changed from ${oldStatus} to ${newStatus}`,
            timestamp: new Date().toISOString()
        };
        
        const response = await api.services.updateServiceStatus(serviceId, statusData);
        
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
            if (window.updateDashboard) {
                updateDashboard();
            }
            Utils.showNotification(`Service status updated to: ${newStatus}`);
            
        } else {
            throw new Error(response.message || 'Failed to update service status');
        }
        
    } catch (error) {
        console.error('Update service status error:', error);
        Utils.showNotification(error.message || 'Failed to update service status. Please try again.');
    } finally {
        hideLoadingState('status-update');
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
            <p><strong>Service ID:</strong> ${service.id} - ${service.watchName || service.watchDetails?.brand + ' ' + service.watchDetails?.model}</p>
            <form onsubmit="ServiceModule.completeService(event, ${service.id})">
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
                        <input type="number" id="finalServiceCost" min="0" step="0.01" value="${service.estimatedCost || service.cost || 0}" required>
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
 * Complete service with details including image and final cost with API integration
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
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Completing...';
        submitBtn.disabled = true;
        
        // Prepare completion data
        const completionData = {
            workPerformed: description,
            actualCost: finalCost,
            warrantyPeriod: warranty,
            completionNotes: description
        };
        
        // Upload completion image if provided
        let imageUploadResponse = null;
        if (imageFile) {
            try {
                imageUploadResponse = await api.services.uploadCompletionImage(serviceId, imageFile);
                if (imageUploadResponse.success) {
                    completionData.completionImagePath = imageUploadResponse.data.imagePath;
                }
            } catch (imageError) {
                console.warn('Image upload failed:', imageError);
                // Continue with completion even if image upload fails
            }
        }
        
        // Complete the service
        const response = await api.services.completeService(serviceId, completionData);
        
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
            if (window.InvoiceModule) {
                const completionInvoice = InvoiceModule.generateServiceCompletionInvoice(response.data);
                if (completionInvoice) {
                    response.data.completionInvoiceGenerated = true;
                    response.data.completionInvoiceId = completionInvoice.id;
                }
            }
            
            renderServiceTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            closeModal('serviceCompletionModal');
            document.getElementById('serviceCompletionModal').remove();
            
            Utils.showNotification('Service completed successfully! Completion invoice generated.');
            
        } else {
            throw new Error(response.message || 'Failed to complete service');
        }
        
    } catch (error) {
        console.error('Complete service error:', error);
        Utils.showNotification(error.message || 'Failed to complete service. Please try again.');
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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

    // Log action
    if (window.logAction) {
        logAction('Opened edit modal for service: ' + service.watchName);
    }

    // Create edit modal
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editServiceModal';
    editModal.style.display = 'block';
    
    // Extract watch details from the service object
    const watchDetails = service.watchDetails || {};
    
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeEditServiceModal()">&times;</span>
            <h2>Edit Service Request</h2>
            <form onsubmit="ServiceModule.updateService(event, ${serviceId})">
                <div class="form-group">
                    <label>Customer:</label>
                    <select id="editServiceCustomer" required>
                        <option value="">Select Customer</option>
                    </select>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Watch Brand:</label>
                        <input type="text" id="editServiceBrand" value="${watchDetails.brand || service.brand || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Watch Model:</label>
                        <input type="text" id="editServiceModel" value="${watchDetails.model || service.model || ''}" required>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Dial Colour:</label>
                        <input type="text" id="editServiceDialColor" value="${watchDetails.dialColor || service.dialColor || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Movement No:</label>
                        <input type="text" id="editServiceMovementNo" value="${watchDetails.movementNo || service.movementNo || ''}" required>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Gender:</label>
                        <select id="editServiceGender" required>
                            <option value="Male" ${(watchDetails.gender || service.gender) === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${(watchDetails.gender || service.gender) === 'Female' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Case Material:</label>
                        <select id="editServiceCase" required>
                            <option value="Steel" ${(watchDetails.caseType || service.caseType) === 'Steel' ? 'selected' : ''}>Steel</option>
                            <option value="Gold Tone" ${(watchDetails.caseType || service.caseType) === 'Gold Tone' ? 'selected' : ''}>Gold Tone</option>
                            <option value="Fiber" ${(watchDetails.caseType || service.caseType) === 'Fiber' ? 'selected' : ''}>Fiber</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Strap Material:</label>
                        <select id="editServiceStrap" required>
                            <option value="Leather" ${(watchDetails.strapType || service.strapType) === 'Leather' ? 'selected' : ''}>Leather</option>
                            <option value="Fiber" ${(watchDetails.strapType || service.strapType) === 'Fiber' ? 'selected' : ''}>Fiber</option>
                            <option value="Steel" ${(watchDetails.strapType || service.strapType) === 'Steel' ? 'selected' : ''}>Steel</option>
                            <option value="Gold Plated" ${(watchDetails.strapType || service.strapType) === 'Gold Plated' ? 'selected' : ''}>Gold Plated</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cost (₹):</label>
                        <input type="number" id="editServiceCost" value="${service.estimatedCost || service.cost || 0}" required min="0" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <label>Issue Description:</label>
                    <textarea id="editServiceIssue" rows="3" required>${service.issue || ''}</textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-danger" onclick="closeEditServiceModal()">Cancel</button>
                    <button type="submit" class="btn">Update Service Request</button>
                </div>
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

    const customerId = parseInt(document.getElementById('editServiceCustomer').value);
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

    const customer = CustomerModule.getCustomerById(customerId);
    if (!customer) {
        Utils.showNotification('Selected customer not found');
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
            customerId: customerId,
            watchDetails: {
                brand: brand,
                model: model,
                dialColor: dialColor,
                movementNo: movementNo,
                gender: gender,
                caseType: caseType,
                strapType: strapType
            },
            issue: issue,
            estimatedCost: cost
        };

        // Call API
        const response = await api.services.updateService(serviceId, updateData);
        
        if (response.success) {
            // Log action
            if (window.logServiceAction) {
                logServiceAction('Updated service request: ' + service.watchName + ' -> ' + brand + ' ' + model, response.data);
            }
            
            // Update local cache
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                services[serviceIndex] = response.data;
            }

            renderServiceTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            closeEditServiceModal();
            Utils.showNotification('Service request updated successfully!');
            
        } else {
            throw new Error(response.message || 'Failed to update service request');
        }
        
    } catch (error) {
        console.error('Update service error:', error);
        Utils.showNotification(error.message || 'Failed to update service request. Please try again.');
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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

    if (confirm(`Are you sure you want to delete the service request for ${service.watchName || 'this watch'}?`)) {
        try {
            showLoadingState('delete');
            
            const response = await api.services.deleteService(serviceId, 'Deleted by user');
            
            if (response.success) {
                // Log action
                if (window.logAction) {
                    logAction(`Deleted service request ${serviceId} for ${service.customerName}'s ${service.watchName}`);
                }
                
                // Decrease customer service count
                if (window.CustomerModule) {
                    CustomerModule.decrementCustomerServices(service.customerId);
                }
                
                // Remove from local cache
                services = services.filter(s => s.id !== serviceId);
                
                renderServiceTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
                Utils.showNotification('Service request deleted successfully!');
                
            } else {
                throw new Error(response.message || 'Failed to delete service request');
            }
            
        } catch (error) {
            console.error('Delete service error:', error);
            Utils.showNotification(error.message || 'Failed to delete service request. Please try again.');
        } finally {
            hideLoadingState('delete');
        }
    }
}

/**
 * View service acknowledgement
 */
function viewServiceAcknowledgement(serviceId) {
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    // Use the InvoiceModule function directly
    InvoiceModule.viewServiceAcknowledgement(serviceId);
}

/**
 * View service completion invoice
 */
function viewServiceCompletionInvoice(serviceId) {
    console.log('Attempting to view service completion invoice for service ID:', serviceId);
    
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    const invoices = InvoiceModule.getInvoicesForTransaction(serviceId, 'service');
    console.log('Found invoices for service:', invoices);
    
    const completionInvoice = invoices.find(inv => inv.type === 'Service Completion');
    console.log('Found completion invoice:', completionInvoice);
    
    if (completionInvoice) {
        InvoiceModule.viewInvoice(completionInvoice.id);
    } else {
        Utils.showNotification('No completion invoice found for this service.');
    }
}

/**
 * Search services with real-time filtering
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
        // Try to get fresh stats from API
        const response = await api.services.getServiceStats();
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get service stats API error:', error);
    }
    
    // Fallback to local calculation
    const totalServices = services.length;
    const pendingServices = services.filter(s => s.status === 'pending').length;
    const inProgressServices = services.filter(s => s.status === 'in-progress').length;
    const onHoldServices = services.filter(s => s.status === 'on-hold').length;
    const completedServices = services.filter(s => s.status === 'completed').length;
    const incompleteServices = totalServices - completedServices;
    const totalRevenue = services.filter(s => s.status === 'completed')
        .reduce((sum, service) => sum + (service.actualCost || service.cost || 0), 0);
    const averageServiceCost = totalServices > 0 ? 
        services.reduce((sum, service) => sum + (service.estimatedCost || service.cost || 0), 0) / totalServices : 0;
    
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
        .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0))
        .slice(0, limit);
}

/**
 * Filter services by date range
 */
function filterServicesByDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return services.filter(service => {
        const serviceDate = new Date(service.serviceDate || service.createdAt || service.timestamp);
        return serviceDate >= from && serviceDate <= to;
    });
}

/**
 * Filter services by month and year
 */
function filterServicesByMonth(month, year) {
    return services.filter(service => {
        const serviceDate = new Date(service.serviceDate || service.createdAt || service.timestamp);
        return serviceDate.getMonth() === parseInt(month) && serviceDate.getFullYear() === parseInt(year);
    });
}

/**
 * Render service table with API data and loading states
 */
function renderServiceTable() {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) {
        console.error('Service table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Show loading state if currently loading
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading services...</p>
                </td>
            </tr>
        `;
        return;
    }
    
    if (services.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: #999; padding: 40px;">
                    <div style="margin-bottom: 10px;">🔧</div>
                    <h3 style="margin: 10px 0;">No service requests yet</h3>
                    <p>Click "New Service Request" to get started</p>
                    <button class="btn" onclick="ServiceModule.refreshServices()" style="margin-top: 10px;">
                        Refresh Services
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    // Sort services by date (newest first)
    const sortedServices = services.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0);
        const dateB = new Date(b.createdAt || b.timestamp || 0);
        return dateB - dateA;
    });
    
    sortedServices.forEach((service, index) => {
        const row = document.createElement('tr');
        
        // Add sync indicator if item is recently updated
        const isRecentlyUpdated = service.updatedAt && 
            (new Date() - new Date(service.updatedAt)) < 10000; // 10 seconds
        const syncIndicator = isRecentlyUpdated ? 
            '<span style="color: #28a745;">●</span> ' : '';
        
        // Extract watch details safely
        const watchDetails = service.watchDetails || {};
        const watchName = service.watchName || `${watchDetails.brand || service.brand || ''} ${watchDetails.model || service.model || ''}`.trim();
        const brand = watchDetails.brand || service.brand || '';
        const model = watchDetails.model || service.model || '';
        
        // Create action buttons based on status and user role
        let actionButtons = '';
        if (service.status === 'pending') {
            actionButtons = `
                <button class="btn btn-sm" onclick="updateServiceStatus(${service.id}, 'in-progress')">Start</button>
                <button class="btn btn-sm" onclick="updateServiceStatus(${service.id}, 'on-hold')">Hold</button>
            `;
        } else if (service.status === 'in-progress') {
            actionButtons = `
                <button class="btn btn-sm btn-success" onclick="updateServiceStatus(${service.id}, 'completed')">Complete</button>
                <button class="btn btn-sm" onclick="updateServiceStatus(${service.id}, 'on-hold')">Hold</button>
            `;
        } else if (service.status === 'on-hold') {
            actionButtons = `
                <button class="btn btn-sm btn-success" onclick="updateServiceStatus(${service.id}, 'in-progress')">Resume</button>
            `;
        }
        
        // Add edit/delete buttons only for non-staff users
        if (!isStaff) {
            actionButtons += `
                <button class="btn btn-sm" onclick="ServiceModule.editService(${service.id})" 
                    ${!AuthModule.hasPermission('service') ? 'disabled' : ''}>Edit</button>
                <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete this service request?', () => ServiceModule.deleteService(${service.id}))" 
                    ${!AuthModule.hasPermission('service') ? 'disabled' : ''}>Delete</button>
            `;
        }
        
        // Add invoice view buttons
        const hasAcknowledgement = service.acknowledgementGenerated;
        const hasCompletionInvoice = service.completionInvoiceGenerated && service.status === 'completed';
        
        if (hasAcknowledgement) {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="ServiceModule.viewServiceAcknowledgement(${service.id})" title="View Acknowledgement">Receipt</button>
            `;
        }
        
        if (hasCompletionInvoice) {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="ServiceModule.viewServiceCompletionInvoice(${service.id})" title="View Completion Invoice">Invoice</button>
            `;
        }
        
        // Get customer mobile number
        const customer = window.CustomerModule ? CustomerModule.getCustomerById(service.customerId) : null;
        const customerMobile = customer ? customer.phone : 'N/A';
        const customerName = service.customerName || customer?.name || 'Unknown';
        
        // Format dates safely
        const serviceDate = service.serviceDate || service.createdAt || service.timestamp;
        const formattedDate = serviceDate ? Utils.formatDate(new Date(serviceDate)) : 'N/A';
        const formattedTime = serviceDate ? new Date(serviceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>
                ${formattedDate}
                ${syncIndicator}
            </td>
            <td>${formattedTime}</td>
            <td class="customer-info">
                <div class="customer-name">${Utils.sanitizeHtml(customerName)}</div>
                <div class="customer-mobile">${Utils.sanitizeHtml(customerMobile)}</div>
            </td>
            <td>
                <strong>${Utils.sanitizeHtml(watchName || 'Unknown Watch')}</strong><br>
                <small>${Utils.sanitizeHtml(brand)} ${Utils.sanitizeHtml(model)}</small>
            </td>
            <td>
                <small>
                    <strong>Dial:</strong> ${Utils.sanitizeHtml(watchDetails.dialColor || service.dialColor || 'N/A')}<br>
                    <strong>Movement:</strong> ${Utils.sanitizeHtml(watchDetails.movementNo || service.movementNo || 'N/A')}<br>
                    <strong>Gender:</strong> ${Utils.sanitizeHtml(watchDetails.gender || service.gender || 'N/A')}<br>
                    <strong>Case:</strong> ${Utils.sanitizeHtml(watchDetails.caseType || service.caseType || 'N/A')}<br>
                    <strong>Strap:</strong> ${Utils.sanitizeHtml(watchDetails.strapType || service.strapType || 'N/A')}
                </small>
            </td>
            <td>${Utils.sanitizeHtml(service.issue || 'No description')}</td>
            <td><span class="status ${service.status || 'pending'}">${service.status || 'pending'}</span></td>
            <td>${Utils.formatCurrency(service.actualCost || service.estimatedCost || service.cost || 0)}</td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Service table rendered successfully with API data');
    
    // Update sync status
    updateSyncStatus();
}

/**
 * Update sync status display
 */
function updateSyncStatus() {
    const syncStatus = document.getElementById('serviceSyncStatus');
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
 * Export services data
 */
async function exportServices() {
    try {
        showLoadingState('export');
        
        const response = await api.services.exportServices();
        
        if (response.success) {
            // Create and download file
            const csvContent = response.data.csvData;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `services_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            Utils.showNotification('Services exported successfully!');
            
            if (window.logAction) {
                logAction('Exported service data', { recordCount: response.data.recordCount });
            }
            
        } else {
            throw new Error(response.message || 'Export failed');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        Utils.showNotification('Failed to export services. Please try again.');
    } finally {
        hideLoadingState('export');
    }
}

/**
 * Load sample services for offline fallback
 */
function loadSampleServices() {
    services = [
        {
            id: 1,
            customerId: 1,
            customerName: 'John Doe',
            watchName: 'Rolex Submariner',
            watchDetails: {
                brand: 'Rolex',
                model: 'Submariner',
                dialColor: 'Black',
                movementNo: '3135',
                gender: 'Male',
                caseType: 'Steel',
                strapType: 'Steel'
            },
            issue: 'Watch not keeping time accurately',
            estimatedCost: 5000,
            status: 'pending',
            createdAt: '2024-01-15T10:00:00Z',
            acknowledgementGenerated: true
        },
        {
            id: 2,
            customerId: 2,
            customerName: 'Jane Smith',
            watchName: 'Omega Speedmaster',
            watchDetails: {
                brand: 'Omega',
                model: 'Speedmaster',
                dialColor: 'White',
                movementNo: '1861',
                gender: 'Male',
                caseType: 'Steel',
                strapType: 'Leather'
            },
            issue: 'Chronograph function not working',
            estimatedCost: 3500,
            status: 'in-progress',
            createdAt: '2024-01-10T14:30:00Z',
            acknowledgementGenerated: true
        }
    ];
    nextServiceId = 3;
    console.log('Loaded sample services for offline mode');
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
    if (context === 'services') {
        renderServiceTable();
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
        logAction('API Error in Services: ' + message, {}, 'error');
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    Utils.showNotification(message);
    
    if (window.logAction) {
        logAction('Service Success: ' + message);
    }
}

/**
 * Sync with server - called periodically
 */
async function syncWithServer() {
    try {
        await loadServicesFromAPI();
        renderServiceTable();
        console.log('Services synced with server');
    } catch (error) {
        console.error('Sync error:', error);
        // Don't show error to user for background sync failures
    }
}

/**
 * Load modal template for services
 */
function loadServiceModal() {
    const modalHtml = `
        <!-- New Service Modal -->
        <div id="newServiceModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('newServiceModal')">&times;</span>
                <h2>New Service Request</h2>
                <form onsubmit="ServiceModule.addNewService(event)">
                    <div class="form-group">
                        <label>Customer:</label>
                        <select id="serviceCustomer" required>
                            <option value="">Select Customer</option>
                        </select>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Watch Brand:</label>
                            <input type="text" id="serviceBrand" required placeholder="e.g., Rolex, Omega">
                        </div>
                        <div class="form-group">
                            <label>Watch Model:</label>
                            <input type="text" id="serviceModel" required placeholder="e.g., Submariner, Speedmaster">
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Dial Colour:</label>
                            <input type="text" id="serviceDialColor" required placeholder="e.g., Black, White, Blue">
                        </div>
                        <div class="form-group">
                            <label>Movement No:</label>
                            <input type="text" id="serviceMovementNo" required placeholder="e.g., 3135, 1861">
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Gender:</label>
                            <select id="serviceGender" required>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Case Material:</label>
                            <select id="serviceCase" required>
                                <option value="">Select Case</option>
                                <option value="Steel">Steel</option>
                                <option value="Gold Tone">Gold Tone</option>
                                <option value="Fiber">Fiber</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Strap Material:</label>
                            <select id="serviceStrap" required>
                                <option value="">Select Strap</option>
                                <option value="Leather">Leather</option>
                                <option value="Fiber">Fiber</option>
                                <option value="Steel">Steel</option>
                                <option value="Gold Plated">Gold Plated</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Estimated Cost (₹):</label>
                            <input type="number" id="serviceCost" required min="0" step="0.01">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Issue Description:</label>
                        <textarea id="serviceIssue" rows="3" required placeholder="Describe the problem with the watch..."></textarea>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-danger" onclick="closeModal('newServiceModal')">Cancel</button>
                        <button type="submit" class="btn">Create Service Request</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Sync Status Display -->
        <div id="serviceSyncStatus" style="position: fixed; bottom: 60px; right: 20px; background: #f8f9fa; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #666; border: 1px solid #dee2e6; display: none;">
            Checking sync status...
        </div>
    `;
    
    // Add to modals container if it exists
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) {
        modalsContainer.innerHTML += modalHtml;
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
    
    // Show sync status initially
    setTimeout(() => {
        const syncStatus = document.getElementById('serviceSyncStatus');
        if (syncStatus) {
            syncStatus.style.display = 'block';
            updateSyncStatus();
        }
    }, 2000);
}

// Auto-load modal when module loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadServiceModal();
        setupAutoSync();
        if (window.ServiceModule) {
            ServiceModule.initializeServices();
        }
    }, 100);
});

// Make preview function globally available
window.previewCompletionImage = previewCompletionImage;

// Make close function globally available
window.closeEditServiceModal = closeEditServiceModal;

// Export functions for global use
window.ServiceModule = {
    // Core functions
    initializeServices,
    loadServicesFromAPI,
    refreshServices,
    openNewServiceModal,
    addNewService,
    updateServiceStatus,
    editService,
    updateService,
    showServiceCompletionModal,
    completeService,
    deleteService,
    
    // Invoice functions
    viewServiceAcknowledgement,
    viewServiceCompletionInvoice,
    
    // Utility functions
    searchServices,
    renderServiceTable,
    exportServices,
    syncWithServer,
    
    // Stats functions
    getServiceStats,
    getIncompleteServices,
    filterServicesByDateRange,
    filterServicesByMonth,
    
    // Data access for other modules
    services
};
window.updateServiceStatus = updateServiceStatus;