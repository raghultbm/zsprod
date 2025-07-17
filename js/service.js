
// ================================
// UPDATED SERVICE MODULE - Replace existing js/service.js
// ================================

/**
 * Service Management Module with Complete MongoDB Integration
 */

// Local cache for services
let services = [];

/**
 * Initialize service module with API integration
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
  
  const modal = document.getElementById('newServiceModal');
  if (!modal) {
    Utils.showNotification('Service modal not found. Please refresh the page.');
    return;
  }
  
  // Populate customer dropdown
  if (window.CustomerModule) {
    CustomerModule.populateCustomerDropdown('serviceCustomer');
  }
  
  // Reset form
  const form = modal.querySelector('form');
  if (form) {
    form.reset();
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
  
  // Validation
  if (!customerId || !brand || !model || !dialColor || !movementNo || 
      !gender || !caseType || !strapType || !issue || cost === undefined) {
    Utils.showNotification('Please fill in all required fields');
    return;
  }

  if (cost < 0) {
    Utils.showNotification('Service cost cannot be negative');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = setButtonLoading(submitBtn, 'Creating Service...');

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
      services.push(response.data);
      
      // Generate service acknowledgement automatically
      try {
        await InvoiceAPI.generateServiceInvoice(response.data.id, 'Service Acknowledgement');
      } catch (invoiceError) {
        console.warn('Failed to generate acknowledgement automatically:', invoiceError);
      }
      
      renderServiceTable();
      if (window.updateDashboard) {
        updateDashboard();
      }
      
      closeModal('newServiceModal');
      event.target.reset();
      
      const customer = response.data.customerId;
      Utils.showNotification(`Service request created successfully! Customer: ${customer.name}, Watch: ${brand} ${model}. Acknowledgement generated.`);
    }

  } catch (error) {
    console.error('Add service error:', error);
    Utils.showNotification(error.message || 'Failed to create service request. Please try again.');
  } finally {
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
  
  // Show confirmation
  let confirmMessage = '';
  if (newStatus === 'in-progress') {
    confirmMessage = `Start working on service for ${service.customerId.name}'s ${service.brand} ${service.model}?`;
  } else if (newStatus === 'on-hold') {
    confirmMessage = `Put service for ${service.customerId.name}'s ${service.brand} ${service.model} on hold?`;
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
    }

  } catch (error) {
    console.error('Update service status error:', error);
    Utils.showNotification(error.message || 'Failed to update service status.');
  }
}

/**
 * Show service completion modal
 */
function showServiceCompletionModal(service) {
  const confirmMessage = `Complete service for ${service.customerId.name}'s ${service.brand} ${service.model}?\n\nThis will require completion details and warranty information.`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  const completionModal = document.createElement('div');
  completionModal.className = 'modal';
  completionModal.id = 'serviceCompletionModal';
  completionModal.style.display = 'block';
  completionModal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="closeServiceCompletionModal()">&times;</span>
      <h2>Complete Service Request</h2>
      <p><strong>Service ID:</strong> ${service.id} - ${service.brand} ${service.model}</p>
      <form onsubmit="completeServiceRequest(event, '${service.id}')">
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
            <label>Final Service Cost (₹):</label>
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
          <button type="button" class="btn btn-danger" onclick="closeServiceCompletionModal()">Cancel</button>
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
 * Complete service request
 */
async function completeServiceRequest(event, serviceId) {
  event.preventDefault();
  
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
  const originalText = setButtonLoading(submitBtn, 'Completing...');
  
  try {
    // Handle image upload (convert to base64 for now)
    let imageDataUrl = null;
    if (imageFile) {
      imageDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(imageFile);
      });
    }
    
    const completionData = {
      description,
      finalCost,
      warrantyPeriod: warranty,
      image: imageDataUrl
    };
    
    const response = await ServiceAPI.updateServiceStatus(serviceId, 'completed', completionData);
    
    if (response.success) {
      // Update local cache
      const serviceIndex = services.findIndex(s => s.id === serviceId);
      if (serviceIndex !== -1) {
        services[serviceIndex] = response.data;
      }
      
      // Generate service completion invoice automatically
      try {
        await InvoiceAPI.generateServiceInvoice(serviceId, 'Service Completion');
      } catch (invoiceError) {
        console.warn('Failed to generate completion invoice automatically:', invoiceError);
      }
      
      renderServiceTable();
      if (window.updateDashboard) {
        updateDashboard();
      }
      
      closeServiceCompletionModal();
      Utils.showNotification('Service completed successfully! Completion invoice generated.');
    }

  } catch (error) {
    console.error('Complete service error:', error);
    Utils.showNotification(error.message || 'Failed to complete service.');
  } finally {
    resetButton(submitBtn, originalText || 'Complete Service');
  }
}

/**
 * Close service completion modal
 */
function closeServiceCompletionModal() {
  const modal = document.getElementById('serviceCompletionModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Edit service
 */
function editService(serviceId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot edit service requests.');
    return;
  }
  
  Utils.showNotification('Edit service functionality - to be implemented');
}

/**
 * Delete service
 */
async function deleteService(serviceId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot delete service requests.');
    return;
  }

  const service = services.find(s => s.id === serviceId);
  if (!service) {
    Utils.showNotification('Service request not found.');
    return;
  }

  if (confirm(`Are you sure you want to delete the service request for ${service.brand} ${service.model}?`)) {
    try {
      const response = await ServiceAPI.deleteService(serviceId);
      
      if (response.success) {
        services = services.filter(s => s.id !== serviceId);
        renderServiceTable();
        if (window.updateDashboard) {
          updateDashboard();
        }
        Utils.showNotification('Service request deleted successfully!');
      }

    } catch (error) {
      console.error('Delete service error:', error);
      Utils.showNotification(error.message || 'Failed to delete service. Please try again.');
    }
  }
}

/**
 * View service acknowledgement
 */
async function viewServiceAcknowledgement(serviceId) {
  try {
    const response = await InvoiceAPI.getInvoicesByTransaction(serviceId, 'service');
    if (response.success && response.data.length > 0) {
      const acknowledgement = response.data.find(inv => inv.type === 'Service Acknowledgement');
      if (acknowledgement && window.InvoiceModule) {
        InvoiceModule.viewInvoice(acknowledgement.id);
      } else {
        Utils.showNotification('Service acknowledgement not found.');
      }
    } else {
      Utils.showNotification('No acknowledgement found for this service.');
    }
  } catch (error) {
    console.error('View service acknowledgement error:', error);
    Utils.showNotification('Failed to view acknowledgement.');
  }
}

/**
 * View service completion invoice
 */
async function viewServiceCompletionInvoice(serviceId) {
  try {
    const response = await InvoiceAPI.getInvoicesByTransaction(serviceId, 'service');
    if (response.success && response.data.length > 0) {
      const completionInvoice = response.data.find(inv => inv.type === 'Service Completion');
      if (completionInvoice && window.InvoiceModule) {
        InvoiceModule.viewInvoice(completionInvoice.id);
      } else {
        Utils.showNotification('Service completion invoice not found.');
      }
    } else {
      Utils.showNotification('No completion invoice found for this service.');
    }
  } catch (error) {
    console.error('View service completion invoice error:', error);
    Utils.showNotification('Failed to view completion invoice.');
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
 * Get service statistics
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
  
  return {
    totalServices,
    pendingServices,
    inProgressServices,
    onHoldServices,
    completedServices,
    incompleteServices,
    totalRevenue
  };
}

/**
 * Get incomplete services
 */
function getIncompleteServices(limit = 5) {
  return services
    .filter(s => s.status !== 'completed')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

/**
 * Render service table
 */
function renderServiceTable() {
  const tbody = document.getElementById('serviceTableBody');
  if (!tbody) {
    console.error('Service table body not found');
    return;
  }
  
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  tbody.innerHTML = '';
  
  if (services.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: #999; padding: 20px;">
          No service requests yet. Click "New Service Request" to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort services by date (newest first)
  const sortedServices = [...services].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
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
        <button class="btn btn-sm" onclick="editService('${service.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteService('${service.id}')">Delete</button>
      `;
    }
    
    // Add invoice view buttons
    actionButtons += `
      <button class="btn btn-sm btn-success" onclick="viewServiceAcknowledgement('${service.id}')" title="View Acknowledgement">Receipt</button>
    `;
    
    if (service.status === 'completed') {
      actionButtons += `
        <button class="btn btn-sm btn-success" onclick="viewServiceCompletionInvoice('${service.id}')" title="View Completion Invoice">Invoice</button>
      `;
    }
    
    const date = new Date(service.createdAt);
    const formattedDate = date.toLocaleDateString('en-IN');
    const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    
    row.innerHTML = `
      <td class="serial-number">${index + 1}</td>
      <td>${formattedDate}</td>
      <td>${formattedTime}</td>
      <td class="customer-info">
        <div class="customer-name">${Utils.sanitizeHtml(service.customerId.name)}</div>
        <div class="customer-mobile">${Utils.sanitizeHtml(service.customerId.phone)}</div>
      </td>
      <td>
        <strong>${Utils.sanitizeHtml(service.brand)} ${Utils.sanitizeHtml(service.model)}</strong>
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
  
  console.log('Service table rendered successfully with API data');
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

// Make functions globally available
window.previewCompletionImage = previewCompletionImage;
window.completeServiceRequest = completeServiceRequest;
window.closeServiceCompletionModal = closeServiceCompletionModal;

// Export functions for global use
window.ServiceModule = {
  initializeServices,
  loadServicesFromAPI,
  openNewServiceModal,
  addNewService,
  updateServiceStatus,
  editService,
  deleteService,
  viewServiceAcknowledgement,
  viewServiceCompletionInvoice,
  searchServices,
  getServiceStats,
  getIncompleteServices,
  renderServiceTable,
  refreshServices,
  resetButton,
  setButtonLoading,
  services // For access by other modules
};