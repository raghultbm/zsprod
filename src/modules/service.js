// src/modules/service.js - Updated Service Module with Sales-like structure
const { ipcRenderer } = require('electron');

class ServiceModule {
    constructor(currentUser, customerModule) {
        this.currentUser = currentUser;
        this.customerModule = customerModule;
        this.serviceItems = [];
        this.selectedServiceCustomer = null;
        this.serviceJobs = [];
        this.filteredServiceJobs = [];
        this.currentServiceJob = null;
        this.isInitialized = false;
        this.customerSearchTimeout = null;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.renderInitialView();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Customer search for service
        const serviceCustomerSearch = document.getElementById('serviceCustomerSearch');
        if (serviceCustomerSearch) {
            serviceCustomerSearch.addEventListener('input', (e) => {
                clearTimeout(this.customerSearchTimeout);
                this.customerSearchTimeout = setTimeout(() => {
                    this.searchServiceCustomers(e.target.value);
                }, 300);
            });

            serviceCustomerSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestions = document.getElementById('serviceCustomerSuggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });

            serviceCustomerSearch.addEventListener('focus', () => {
                if (serviceCustomerSearch.value.trim().length >= 2) {
                    this.searchServiceCustomers(serviceCustomerSearch.value.trim());
                }
            });
        }

        // Form submissions
        const updateServiceStatusForm = document.getElementById('updateServiceStatusForm');
        if (updateServiceStatusForm) {
            updateServiceStatusForm.addEventListener('submit', (e) => this.handleUpdateServiceStatus(e));
        }
    }

    renderInitialView() {
        const contentBody = document.getElementById('service-content');
        if (!contentBody) return;

        contentBody.innerHTML = window.ServiceContent.getHTML();

        // Re-setup event listeners for the new DOM elements
        this.setupEventListeners();
        this.renderServiceTable();
    }

    async loadData() {
        try {
            this.serviceJobs = await ipcRenderer.invoke('get-service-jobs');
            this.filteredServiceJobs = [...this.serviceJobs];
            this.renderServiceTable();
        } catch (error) {
            console.error('Error loading service jobs:', error);
            showError('Error loading service jobs');
        }
    }

    renderServiceTable() {
        const tbody = document.getElementById('serviceTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredServiceJobs.forEach((job, index) => {
            const row = document.createElement('tr');
            const jobDateTime = new Date(job.created_at).toLocaleString();
            const customerMobile = job.customer_phone || '-';
            
            // Format status
            const statusClass = job.status ? job.status.replace(/_/g, '-') : 'unknown';
            const statusDisplay = job.status ? job.status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
            
            // Format location
            const locationDisplay = job.location ? 
                job.location.charAt(0).toUpperCase() + job.location.slice(1) : '-';
            
            // Payment method from advance payment
            let paymentModeDisplay = 'No Advance';
            if (job.advance_payment_method) {
                paymentModeDisplay = job.advance_payment_method.toUpperCase();
            }
            
            row.innerHTML = `
                <td class="serial-number">${index + 1}</td>
                <td><span class="job-number">${job.job_number || 'N/A'}</span></td>
                <td class="date-time">${jobDateTime}</td>
                <td class="customer-name">${job.customer_name || 'Walk-in Customer'}</td>
                <td class="customer-mobile">${customerMobile}</td>
                <td class="service-status">
                    <span class="service-status-badge ${statusClass}">${statusDisplay}</span>
                </td>
                <td class="service-location">
                    <span class="location-badge">${locationDisplay}</span>
                </td>
                <td class="estimated-cost">₹${parseFloat(job.estimated_cost || 0).toFixed(2)}</td>
                <td class="payment-mode">
                    <span class="payment-mode-badge ${job.advance_payment_method || 'none'}">${paymentModeDisplay}</span>
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="serviceModule().viewServiceDetails(${job.id})">View</button>
                    <button class="btn btn-sm btn-primary" onclick="serviceModule().updateServiceStatus(${job.id})">Update</button>
                    <button class="btn btn-sm btn-info" onclick="serviceModule().showServiceHistory(${job.id})">History</button>
                    <button class="btn btn-sm btn-success" onclick="serviceModule().printServiceAcknowledgment(${job.id})">Print</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    openNewServiceModal() {
        this.clearServiceForm();
        
        const modal = document.getElementById('newServiceModal');
        if (modal) modal.style.display = 'block';
        
        // Focus on customer search
        setTimeout(() => {
            const customerSearch = document.getElementById('serviceCustomerSearch');
            if (customerSearch) customerSearch.focus();
        }, 300);
    }

    async searchServiceCustomers(searchTerm) {
        if (searchTerm.length < 2) {
            const suggestions = document.getElementById('serviceCustomerSuggestions');
            if (suggestions) suggestions.style.display = 'none';
            return;
        }

        try {
            const customers = await this.customerModule.searchCustomersForOtherModules(searchTerm);
            this.displayServiceCustomerSuggestions(customers);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }

    displayServiceCustomerSuggestions(customers) {
        const suggestionsDiv = document.getElementById('serviceCustomerSuggestions');
        if (!suggestionsDiv) return;
        
        if (customers.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = customers.map(customer => 
            `<div class="suggestion-item" onclick="serviceModule().selectServiceCustomer(${customer.id}, '${customer.name}', '${customer.phone || ''}')">
                <strong>${customer.name}</strong>
                ${customer.phone ? `<br><small>${customer.phone}</small>` : ''}
            </div>`
        ).join('');
        
        suggestionsDiv.style.display = 'block';
    }

    selectServiceCustomer(id, name, phone) {
        this.selectedServiceCustomer = { id, name, phone };
        
        const selectedCustomerField = document.getElementById('serviceSelectedCustomer');
        const selectedCustomerIdField = document.getElementById('serviceSelectedCustomerId');
        const customerSearchField = document.getElementById('serviceCustomerSearch');
        const suggestions = document.getElementById('serviceCustomerSuggestions');
        
        if (selectedCustomerField) {
            selectedCustomerField.value = `${name} ${phone ? `(${phone})` : ''}`;
        }
        if (selectedCustomerIdField) {
            selectedCustomerIdField.value = id;
        }
        if (customerSearchField) {
            customerSearchField.value = '';
        }
        if (suggestions) {
            suggestions.style.display = 'none';
        }
        
        showSuccess(`Customer selected: ${name}`);
    }

    addServiceItem() {
        this.openServiceItemModal();
    }

    openServiceItemModal(itemIndex = null) {
        const modal = document.getElementById('serviceItemModal');
        const form = document.getElementById('serviceItemForm');
        const title = document.getElementById('serviceItemModalTitle');
        
        if (!modal || !form || !title) return;

        form.reset();
        
        if (itemIndex !== null) {
            title.textContent = 'Edit Service Item';
            document.getElementById('serviceItemIndex').value = itemIndex;
            
            const item = this.serviceItems[itemIndex];
            this.populateServiceItemForm(item);
            this.toggleServiceCategoryFields();
        } else {
            title.textContent = 'Add Service Item';
            document.getElementById('serviceItemIndex').value = '';
            this.toggleServiceCategoryFields();
        }
        
        modal.style.display = 'block';
    }

    populateServiceItemForm(item) {
        const fields = {
            serviceItemCategory: item.category,
            serviceItemBrand: item.brand || '',
            serviceItemGender: item.gender || '',
            serviceItemCaseMaterial: item.case_material || '',
            serviceItemStrapMaterial: item.strap_material || '',
            serviceItemMachineChange: item.machine_change !== null ? item.machine_change.toString() : '',
            serviceItemMovementNo: item.movement_no || '',
            serviceItemIssueDescription: item.issue_description
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) element.value = value;
        });
    }

    toggleServiceCategoryFields() {
        const category = document.getElementById('serviceItemCategory')?.value;
        
        // Hide all category-specific fields
        const watchFields = document.getElementById('watchFields');
        const clockFields = document.getElementById('clockFields');
        
        if (watchFields) watchFields.style.display = 'none';
        if (clockFields) clockFields.style.display = 'none';
        
        // Clear conditional fields
        const conditionalFields = [
            'serviceItemGender', 'serviceItemCaseMaterial', 
            'serviceItemStrapMaterial', 'serviceItemMachineChange'
        ];
        conditionalFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) element.value = '';
        });
        
        // Show relevant fields based on category
        if (category === 'watch') {
            if (watchFields) watchFields.style.display = 'block';
        } else if (category === 'wallclock') {
            if (clockFields) clockFields.style.display = 'block';
        }
    }

    async handleServiceItemForm(e) {
        e.preventDefault();
        
        const itemData = {
            category: document.getElementById('serviceItemCategory')?.value,
            brand: document.getElementById('serviceItemBrand')?.value || null,
            gender: document.getElementById('serviceItemGender')?.value || null,
            case_material: document.getElementById('serviceItemCaseMaterial')?.value || null,
            strap_material: document.getElementById('serviceItemStrapMaterial')?.value || null,
            machine_change: document.getElementById('serviceItemMachineChange')?.value ? 
                parseInt(document.getElementById('serviceItemMachineChange').value) : null,
            movement_no: document.getElementById('serviceItemMovementNo')?.value || null,
            issue_description: document.getElementById('serviceItemIssueDescription')?.value,
            product_image_path: null
        };

        if (!itemData.category || !itemData.issue_description) {
            showError('Please fill in all required fields');
            return;
        }
        
        const itemIndex = document.getElementById('serviceItemIndex')?.value;
        
        if (itemIndex !== '') {
            this.serviceItems[parseInt(itemIndex)] = itemData;
        } else {
            this.serviceItems.push(itemData);
        }
        
        closeModal('serviceItemModal');
        this.renderServiceItems();
        showSuccess('Service item saved successfully');
    }

    renderServiceItems() {
        const container = document.getElementById('serviceItemsContainer');
        if (!container) return;
        
        if (this.serviceItems.length === 0) {
            container.innerHTML = '<p class="no-items-message">No service items added yet.</p>';
            return;
        }
        
        container.innerHTML = this.serviceItems.map((item, index) => {
            let details = `<div class="service-item-detail"><strong>Category:</strong> ${item.category}</div>`;
            
            if (item.brand) details += `<div class="service-item-detail"><strong>Brand:</strong> ${item.brand}</div>`;
            if (item.gender) details += `<div class="service-item-detail"><strong>Gender:</strong> ${item.gender}</div>`;
            if (item.case_material) details += `<div class="service-item-detail"><strong>Case Material:</strong> ${item.case_material.replace('_', ' ')}</div>`;
            if (item.strap_material) details += `<div class="service-item-detail"><strong>Strap Material:</strong> ${item.strap_material.replace('_', ' ')}</div>`;
            if (item.machine_change !== null) details += `<div class="service-item-detail"><strong>Machine Change:</strong> ${item.machine_change ? 'Yes' : 'No'}</div>`;
            if (item.movement_no) details += `<div class="service-item-detail"><strong>Movement No:</strong> ${item.movement_no}</div>`;
            
            return `
                <div class="service-item-card">
                    <div class="service-item-header">
                        <span class="service-item-category">${item.category}</span>
                        <span class="service-item-remove" onclick="serviceModule().removeServiceItem(${index})">&times;</span>
                    </div>
                    <div class="service-item-details">
                        ${details}
                    </div>
                    <div class="service-item-issue">
                        <strong>Issue Description:</strong>
                        <div>${item.issue_description}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    removeServiceItem(index) {
        if (confirm('Are you sure you want to remove this service item?')) {
            this.serviceItems.splice(index, 1);
            this.renderServiceItems();
        }
    }

    async createServiceJob() {
        if (this.serviceItems.length === 0) {
            showError('Please add at least one service item');
            return;
        }
        
        const estimatedCost = parseFloat(document.getElementById('estimatedCost')?.value);
        const advanceAmount = parseFloat(document.getElementById('advanceAmount')?.value) || 0;
        const approximateDeliveryDate = document.getElementById('approximateDeliveryDate')?.value;
        const location = document.getElementById('serviceLocation')?.value;
        
        if (!estimatedCost || !approximateDeliveryDate || !location) {
            showError('Please fill in all required fields');
            return;
        }
        
        const serviceData = {
            job: {
                customer_id: this.selectedServiceCustomer ? this.selectedServiceCustomer.id : null,
                estimated_cost: estimatedCost,
                advance_amount: advanceAmount,
                advance_payment_method: document.getElementById('advancePaymentMethod')?.value || null,
                advance_payment_reference: document.getElementById('advancePaymentReference')?.value || null,
                approximate_delivery_date: approximateDeliveryDate,
                location: location,
                comments: document.getElementById('serviceJobComments')?.value || null,
                created_by: this.currentUser.id
            },
            items: this.serviceItems
        };
        
        try {
            const result = await ipcRenderer.invoke('create-service-job', serviceData);
            
            if (result.success) {
                showSuccess(`Service job created successfully! Job Number: ${result.job_number}`);
                closeModal('newServiceModal');
                this.clearServiceForm();
                await this.loadData();
                
                // Refresh customer net value if applicable
                if (this.selectedServiceCustomer && this.customerModule) {
                    await this.customerModule.refreshCustomerNetValue(this.selectedServiceCustomer.id);
                }
            }
        } catch (error) {
            console.error('Error creating service job:', error);
            showError('Error creating service job: ' + (error.message || 'Unknown error'));
        }
    }

    clearServiceForm() {
        this.serviceItems = [];
        this.selectedServiceCustomer = null;
        
        // Clear form inputs
        const fields = [
            'serviceCustomerSearch', 'serviceSelectedCustomer', 'serviceSelectedCustomerId',
            'estimatedCost', 'advanceAmount', 'advancePaymentReference',
            'approximateDeliveryDate', 'serviceJobComments'
        ];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });

        const advancePaymentMethod = document.getElementById('advancePaymentMethod');
        const serviceLocation = document.getElementById('serviceLocation');
        
        if (advancePaymentMethod) advancePaymentMethod.value = '';
        if (serviceLocation) serviceLocation.value = '';
        
        document.getElementById('advanceAmount').value = '0';
        
        // Reset UI
        this.renderServiceItems();
        
        // Hide suggestions
        const suggestions = document.getElementById('serviceCustomerSuggestions');
        if (suggestions) suggestions.style.display = 'none';
    }

    async viewServiceDetails(jobId) {
        try {
            this.currentServiceJob = await ipcRenderer.invoke('get-service-job-details', jobId);
            this.displayServiceJobDetails(this.currentServiceJob);
            const modal = document.getElementById('serviceJobDetailsModal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading service job details:', error);
            showError('Error loading service job details');
        }
    }

    displayServiceJobDetails(serviceDetails) {
        const { job, items, statusHistory, comments } = serviceDetails;
        const content = document.getElementById('serviceJobDetailsContent');
        if (!content) return;
        
        content.innerHTML = `
            <div class="service-job-details">
                <div class="service-job-info">
                    <h4>Job Information</h4>
                    <div class="job-detail-row">
                        <span class="job-detail-label">Job Number:</span>
                        <span class="job-detail-value job-number">${job.job_number}</span>
                    </div>
                    <div class="job-detail-row">
                        <span class="job-detail-label">Customer:</span>
                        <span class="job-detail-value">${job.customer_name || 'Walk-in Customer'}</span>
                    </div>
                    ${job.customer_phone ? `
                    <div class="job-detail-row">
                        <span class="job-detail-label">Phone:</span>
                        <span class="job-detail-value">${job.customer_phone}</span>
                    </div>` : ''}
                    <div class="job-detail-row">
                        <span class="job-detail-label">Status:</span>
                        <span class="job-detail-value">
                            <span class="service-status ${job.status.replace('_', '-')}">${job.status.replace('_', ' ')}</span>
                        </span>
                    </div>
                    <div class="job-detail-row">
                        <span class="job-detail-label">Location:</span>
                        <span class="job-detail-value service-location">${job.location.charAt(0).toUpperCase() + job.location.slice(1)}</span>
                    </div>
                    <div class="job-detail-row">
                        <span class="job-detail-label">Created:</span>
                        <span class="job-detail-value">${new Date(job.created_at).toLocaleString()}</span>
                    </div>
                    ${job.approximate_delivery_date ? `
                    <div class="job-detail-row">
                        <span class="job-detail-label">Expected Delivery:</span>
                        <span class="job-detail-value">${new Date(job.approximate_delivery_date).toLocaleDateString()}</span>
                    </div>` : ''}
                    ${job.actual_delivery_date ? `
                    <div class="job-detail-row">
                        <span class="job-detail-label">Actual Delivery:</span>
                        <span class="job-detail-value">${new Date(job.actual_delivery_date).toLocaleDateString()}</span>
                    </div>` : ''}
                    ${job.comments ? `
                    <div class="job-detail-row">
                        <span class="job-detail-label">Comments:</span>
                        <span class="job-detail-value">${job.comments}</span>
                    </div>` : ''}
                    
                    <div class="cost-summary">
                        <div class="cost-row">
                            <span class="cost-label">Estimated Cost:</span>
                            <span class="cost-value">₹${parseFloat(job.estimated_cost || 0).toFixed(2)}</span>
                        </div>
                        <div class="cost-row">
                            <span class="cost-label">Advance Amount:</span>
                            <span class="cost-value">₹${parseFloat(job.advance_amount || 0).toFixed(2)}</span>
                        </div>
                        ${job.advance_payment_method ? `
                        <div class="cost-row">
                            <span class="cost-label">Advance Method:</span>
                            <span class="cost-value">${job.advance_payment_method.toUpperCase()}</span>
                        </div>` : ''}
                        ${job.final_cost ? `
                        <div class="cost-row">
                            <span class="cost-label">Final Cost:</span>
                            <span class="cost-value">₹${parseFloat(job.final_cost).toFixed(2)}</span>
                        </div>
                        <div class="cost-row">
                            <span class="cost-label">Final Payment:</span>
                            <span class="cost-value">₹${parseFloat(job.final_payment_amount || 0).toFixed(2)}</span>
                        </div>
                        <div class="cost-row">
                            <span class="cost-label">Balance Due:</span>
                            <span class="cost-value">₹${(parseFloat(job.final_cost) - parseFloat(job.advance_amount || 0) - parseFloat(job.final_payment_amount || 0)).toFixed(2)}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="service-job-tracking">
                    <h4>Tracking & Comments</h4>
                    
                    <div class="status-history">
                        <h5>Status History</h5>
                        ${statusHistory.map(history => `
                            <div class="status-history-item">
                                <div class="status-history-header">
                                    <span class="status-history-status">${history.status.replace('_', ' ')}</span>
                                    <span class="status-history-date">${new Date(history.changed_at).toLocaleString()}</span>
                                </div>
                                <div class="status-history-details">
                                    <div class="status-history-location">Location: ${history.location.charAt(0).toUpperCase() + history.location.slice(1)}</div>
                                    ${history.comments ? `<div>Comments: ${history.comments}</div>` : ''}
                                    <div>Changed by: ${history.changed_by_name || 'System'}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="comments-section">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h5>Comments</h5>
                            <button class="btn btn-sm btn-primary" onclick="serviceModule().addComment(${job.id})">Add Comment</button>
                        </div>
                        ${comments.length > 0 ? comments.map(comment => `
                            <div class="comment-item">
                                <div class="comment-header">
                                    <span class="comment-author">${comment.added_by_name || 'Unknown'}</span>
                                    <span>${new Date(comment.added_at).toLocaleString()}</span>
                                </div>
                                <div class="comment-text">${comment.comment}</div>
                            </div>
                        `).join('') : '<p>No comments added yet.</p>'}
                    </div>
                </div>
            </div>
            
            <div class="service-items-display">
                <h4>Service Items</h4>
                ${items.map((item, index) => `
                    <div class="service-item-display">
                        <h5>${item.category} ${item.brand ? `- ${item.brand}` : ''}</h5>
                        <div class="item-detail-grid">
                            ${item.gender ? `<div class="item-detail"><strong>Gender:</strong> ${item.gender}</div>` : ''}
                            ${item.case_material ? `<div class="item-detail"><strong>Case Material:</strong> ${item.case_material.replace('_', ' ')}</div>` : ''}
                            ${item.strap_material ? `<div class="item-detail"><strong>Strap Material:</strong> ${item.strap_material.replace('_', ' ')}</div>` : ''}
                            ${item.machine_change !== null ? `<div class="item-detail"><strong>Machine Change:</strong> ${item.machine_change ? 'Yes' : 'No'}</div>` : ''}
                            ${item.movement_no ? `<div class="item-detail"><strong>Movement No:</strong> ${item.movement_no}</div>` : ''}
                        </div>
                        <div class="item-issue-description">
                            <strong>Issue Description:</strong>
                            <div>${item.issue_description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateServiceStatus(jobId) {
        document.getElementById('updateStatusJobId').value = jobId;
        const modal = document.getElementById('updateServiceStatusModal');
        if (modal) modal.style.display = 'block';
    }

    async handleUpdateServiceStatus(e) {
        e.preventDefault();
        
        const jobId = parseInt(document.getElementById('updateStatusJobId')?.value);
        const status = document.getElementById('updateServiceStatus')?.value;
        const location = document.getElementById('updateServiceLocation')?.value;
        const comments = document.getElementById('updateServiceComments')?.value;
        
        if (!status || !location) {
            showError('Please fill in all required fields');
            return;
        }
        
        try {
            await ipcRenderer.invoke('update-service-status', {
                jobId,
                status,
                location,
                comments,
                changedBy: this.currentUser.id
            });
            
            showSuccess('Service status updated successfully!');
            closeModal('updateServiceStatusModal');
            await this.loadData();
            
            // Refresh details modal if open
            if (this.currentServiceJob && this.currentServiceJob.job.id === jobId) {
                await this.viewServiceDetails(jobId);
            }
        } catch (error) {
            console.error('Error updating service status:', error);
            showError('Error updating service status');
        }
    }

    async showServiceHistory(jobId) {
        try {
            const serviceDetails = await ipcRenderer.invoke('get-service-job-details', jobId);
            this.displayServiceHistory(serviceDetails);
            const modal = document.getElementById('serviceHistoryModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                this.createServiceHistoryModal();
                setTimeout(() => {
                    this.displayServiceHistory(serviceDetails);
                    const newModal = document.getElementById('serviceHistoryModal');
                    if (newModal) newModal.style.display = 'block';
                }, 100);
            }
        } catch (error) {
            console.error('Error loading service history:', error);
            showError('Error loading service history');
        }
    }

    createServiceHistoryModal() {
        const modalHTML = `
            <div id="serviceHistoryModal" class="modal">
                <div class="modal-content large-modal responsive-modal">
                    <div class="modal-header">
                        <h3>Service History</h3>
                        <span class="close-btn" onclick="closeModal('serviceHistoryModal')">&times;</span>
                    </div>
                    <div class="modal-body" id="serviceHistoryContent">
                        <!-- Dynamic content -->
                    </div>
                    <div class="modal-actions">
                        <button type="button" onclick="closeModal('serviceHistoryModal')" class="btn btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    displayServiceHistory(serviceDetails) {
        const { job, statusHistory, comments } = serviceDetails;
        const content = document.getElementById('serviceHistoryContent');
        if (!content) return;
        
        content.innerHTML = `
            <div class="service-history-container">
                <div class="job-summary">
                    <h4>Job: ${job.job_number}</h4>
                    <p><strong>Customer:</strong> ${job.customer_name || 'Walk-in Customer'}</p>
                    <p><strong>Created:</strong> ${new Date(job.created_at).toLocaleString()}</p>
                    <p><strong>Current Status:</strong> <span class="service-status ${job.status.replace('_', '-')}">${job.status.replace('_', ' ').toUpperCase()}</span></p>
                </div>

                <div class="history-timeline">
                    <h4>Status History</h4>
                    <div class="timeline-container">
                        ${statusHistory.map((history, index) => `
                            <div class="timeline-item ${index === 0 ? 'current' : ''}">
                                <div class="timeline-marker"></div>
                                <div class="timeline-content">
                                    <div class="timeline-header">
                                        <span class="timeline-status">${history.status.replace('_', ' ').toUpperCase()}</span>
                                        <span class="timeline-date">${new Date(history.changed_at).toLocaleString()}</span>
                                    </div>
                                    <div class="timeline-details">
                                        <div><strong>Location:</strong> ${history.location.charAt(0).toUpperCase() + history.location.slice(1)}</div>
                                        ${history.comments ? `<div><strong>Comments:</strong> ${history.comments}</div>` : ''}
                                        <div><strong>Changed by:</strong> ${history.changed_by_name || 'System'}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="comments-timeline">
                    <h4>Comments History</h4>
                    ${comments.length > 0 ? `
                        <div class="comments-list">
                            ${comments.map(comment => `
                                <div class="comment-timeline-item">
                                    <div class="comment-timeline-header">
                                        <span class="comment-author">${comment.added_by_name || 'Unknown'}</span>
                                        <span class="comment-date">${new Date(comment.added_at).toLocaleString()}</span>
                                    </div>
                                    <div class="comment-timeline-text">${comment.comment}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="no-comments">No comments added yet.</p>'}
                </div>
            </div>
        `;
    }

    addComment(jobId) {
        document.getElementById('commentJobId').value = jobId;
        const modal = document.getElementById('addCommentModal');
        if (modal) modal.style.display = 'block';
    }

    async handleAddComment(e) {
        e.preventDefault();
        
        const jobId = parseInt(document.getElementById('commentJobId')?.value);
        const comment = document.getElementById('newComment')?.value;
        
        if (!comment.trim()) {
            showError('Please enter a comment');
            return;
        }
        
        try {
            await ipcRenderer.invoke('add-service-comment', {
                jobId,
                comment,
                addedBy: this.currentUser.id
            });
            
            showSuccess('Comment added successfully!');
            closeModal('addCommentModal');
            document.getElementById('newComment').value = '';
            
            // Refresh details modal if open
            if (this.currentServiceJob && this.currentServiceJob.job.id === jobId) {
                await this.viewServiceDetails(jobId);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            showError('Error adding comment');
        }
    }

    generateServiceInvoiceNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        
        // Generate 4 random digits
        let randomDigits = '';
        for (let i = 0; i < 4; i++) {
            randomDigits += Math.floor(Math.random() * 10).toString();
        }
        
        return `INVSR${year}${month}${day}${randomDigits}`;
    }

    generateServiceAcknowledgmentNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        
        // Generate 4 random digits
        let randomDigits = '';
        for (let i = 0; i < 4; i++) {
            randomDigits += Math.floor(Math.random() * 10).toString();
        }
        
        return `ACKSR${year}${month}${day}${randomDigits}`;
    }

    async printServiceAcknowledgment(jobId) {
        try {
            let serviceDetails;
            if (this.currentServiceJob && this.currentServiceJob.job.id === jobId) {
                serviceDetails = this.currentServiceJob;
            } else {
                serviceDetails = await ipcRenderer.invoke('get-service-job-details', jobId);
            }
            
            const { job, items } = serviceDetails;
            const acknowledgmentNumber = this.generateServiceAcknowledgmentNumber();
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Service Acknowledgment - ${acknowledgmentNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                        .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                        .subtitle { font-size: 14px; color: #666; }
                        .ack-number { font-size: 16px; font-weight: bold; margin: 10px 0; font-family: 'Courier New', monospace; }
                        .section { margin-bottom: 15px; }
                        .section h4 { border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 8px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                        .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
                        .table th { background: #f0f0f0; font-weight: bold; }
                        .footer { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
                        .job-number { font-family: 'Courier New', monospace; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">⌚ Watch Shop</div>
                        <div class="subtitle">Service Acknowledgment</div>
                        <div class="ack-number">ACK #: ${acknowledgmentNumber}</div>
                    </div>
                    
                    <div class="section">
                        <h4>Job Details</h4>
                        <div class="row">
                            <span>Job Number:</span>
                            <span class="job-number">${job.job_number}</span>
                        </div>
                        <div class="row">
                            <span>Date:</span>
                            <span>${new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="row">
                            <span>Time:</span>
                            <span>${new Date(job.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div class="row">
                            <span>Customer:</span>
                            <span>${job.customer_name || 'Walk-in Customer'}</span>
                        </div>
                        ${job.customer_phone ? `
                        <div class="row">
                            <span>Phone:</span>
                            <span>${job.customer_phone}</span>
                        </div>` : ''}
                        <div class="row">
                            <span>Location:</span>
                            <span>${job.location.charAt(0).toUpperCase() + job.location.slice(1)}</span>
                        </div>
                        <div class="row">
                            <span>Expected Delivery:</span>
                            <span>${new Date(job.approximate_delivery_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h4>Service Items</h4>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                    <th>Brand</th>
                                    <th>Details</th>
                                    <th>Issue Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((item, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.category}</td>
                                        <td>${item.brand || '-'}</td>
                                        <td>
                                            ${item.gender ? `Gender: ${item.gender}<br>` : ''}
                                            ${item.case_material ? `Case: ${item.case_material.replace('_', ' ')}<br>` : ''}
                                            ${item.strap_material ? `Strap: ${item.strap_material.replace('_', ' ')}<br>` : ''}
                                            ${item.movement_no ? `Movement: ${item.movement_no}` : ''}
                                        </td>
                                        <td>${item.issue_description}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="section">
                        <h4>Cost Details</h4>
                        <div class="row">
                            <span>Estimated Cost:</span>
                            <span>₹${parseFloat(job.estimated_cost || 0).toFixed(2)}</span>
                        </div>
                        <div class="row">
                            <span>Advance Paid:</span>
                            <span>₹${parseFloat(job.advance_amount || 0).toFixed(2)}</span>
                        </div>
                        <div class="row">
                            <span><strong>Balance (Approx):</strong></span>
                            <span><strong>₹${(parseFloat(job.estimated_cost || 0) - parseFloat(job.advance_amount || 0)).toFixed(2)}</strong></span>
                        </div>
                    </div>
                    
                    ${job.comments ? `
                    <div class="section">
                        <h4>Comments</h4>
                        <p>${job.comments}</p>
                    </div>` : ''}
                    
                    <div class="footer">
                        <p>Thank you for choosing Watch Shop!</p>
                        <p>Please keep this acknowledgment for your records.</p>
                        <p><strong>Important:</strong> Please bring this acknowledgment when collecting your item.</p>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            console.error('Error printing service acknowledgment:', error);
            showError('Error printing acknowledgment');
        }
    }

    searchServices() {
        const searchTerm = document.getElementById('serviceSearch')?.value?.trim().toLowerCase();
        
        if (searchTerm) {
            this.filteredServiceJobs = this.serviceJobs.filter(job => 
                (job.job_number && job.job_number.toLowerCase().includes(searchTerm)) ||
                (job.customer_name && job.customer_name.toLowerCase().includes(searchTerm)) ||
                (job.customer_phone && job.customer_phone.includes(searchTerm))
            );
        } else {
            this.filteredServiceJobs = [...this.serviceJobs];
        }
        
        this.renderServiceTable();
    }

    clearServiceSearch() {
        const searchField = document.getElementById('serviceSearch');
        const statusFilter = document.getElementById('serviceStatusFilter');
        const locationFilter = document.getElementById('serviceLocationFilter');
        const dateFromField = document.getElementById('serviceDateFrom');
        const dateToField = document.getElementById('serviceDateTo');
        
        if (searchField) searchField.value = '';
        if (statusFilter) statusFilter.value = '';
        if (locationFilter) locationFilter.value = '';
        if (dateFromField) dateFromField.value = '';
        if (dateToField) dateToField.value = '';
        
        this.filteredServiceJobs = [...this.serviceJobs];
        this.renderServiceTable();
    }

    filterServicesByStatus() {
        const status = document.getElementById('serviceStatusFilter')?.value;
        
        if (status) {
            this.filteredServiceJobs = this.serviceJobs.filter(job => job.status === status);
        } else {
            this.filteredServiceJobs = [...this.serviceJobs];
        }
        
        this.renderServiceTable();
    }

    filterServicesByLocation() {
        const location = document.getElementById('serviceLocationFilter')?.value;
        
        if (location) {
            this.filteredServiceJobs = this.serviceJobs.filter(job => job.location === location);
        } else {
            this.filteredServiceJobs = [...this.serviceJobs];
        }
        
        this.renderServiceTable();
    }

    filterServices() {
        const dateFrom = document.getElementById('serviceDateFrom')?.value;
        const dateTo = document.getElementById('serviceDateTo')?.value;
        
        this.filteredServiceJobs = this.serviceJobs.filter(job => {
            const jobDate = new Date(job.created_at);
            let matchesDateRange = true;
            
            if (dateFrom) {
                matchesDateRange = matchesDateRange && jobDate >= new Date(dateFrom);
            }
            
            if (dateTo) {
                matchesDateRange = matchesDateRange && jobDate <= new Date(dateTo + 'T23:59:59');
            }
            
            return matchesDateRange;
        });
        
        this.renderServiceTable();
    }

    // Method to be called when pre-selecting customer from customer module
    selectServiceCustomer(id, name, phone) {
        this.selectedServiceCustomer = { id, name, phone };
        
        const selectedCustomerField = document.getElementById('serviceSelectedCustomer');
        const selectedCustomerIdField = document.getElementById('serviceSelectedCustomerId');
        const customerSearchField = document.getElementById('serviceCustomerSearch');
        const suggestions = document.getElementById('serviceCustomerSuggestions');
        
        if (selectedCustomerField) {
            selectedCustomerField.value = `${name} ${phone ? `(${phone})` : ''}`;
        }
        if (selectedCustomerIdField) {
            selectedCustomerIdField.value = id;
        }
        if (customerSearchField) {
            customerSearchField.value = '';
        }
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }

    // Get service jobs for reporting
    getServiceJobs() {
        return this.serviceJobs;
    }

    // Get service jobs by status
    getServiceJobsByStatus(status) {
        return this.serviceJobs.filter(job => job.status === status);
    }

    // Get service jobs by date range
    getServiceJobsByDateRange(startDate, endDate) {
        return this.serviceJobs.filter(job => {
            const jobDate = new Date(job.created_at);
            return jobDate >= new Date(startDate) && jobDate <= new Date(endDate);
        });
    }

    // Get total service revenue for a period
    getTotalServiceRevenue(startDate = null, endDate = null) {
        let filteredJobs = this.serviceJobs;
        
        if (startDate && endDate) {
            filteredJobs = this.getServiceJobsByDateRange(startDate, endDate);
        }
        
        return filteredJobs.reduce((total, job) => {
            const revenue = parseFloat(job.final_cost || job.estimated_cost || 0);
            return total + revenue;
        }, 0);
    }
}

// Global functions for HTML onclick handlers
window.openNewServiceModal = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.openNewServiceModal();
    }
};

window.addServiceItem = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.addServiceItem();
    }
};

window.createServiceJob = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.createServiceJob();
    }
};

window.clearServiceForm = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.clearServiceForm();
    }
};

window.searchServices = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.searchServices();
    }
};

window.clearServiceSearch = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.clearServiceSearch();
    }
};

window.filterServicesByStatus = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.filterServicesByStatus();
    }
};

window.filterServicesByLocation = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.filterServicesByLocation();
    }
};

window.filterServices = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.filterServices();
    }
};

window.toggleServiceCategoryFields = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.toggleServiceCategoryFields();
    }
};

module.exports = ServiceModule;