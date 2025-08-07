const { ipcRenderer } = require('electron');

class ServiceModule {
    constructor(currentUser, customerModule) {
        this.currentUser = currentUser;
        this.customerModule = customerModule;
        this.serviceItems = [];
        this.selectedServiceCustomer = null;
        this.serviceJobs = [];
        this.currentServiceJob = null;
        this.isInitialized = false;
        this.customerSearchTimeout = null;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
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
        }

        // Form submissions
        const serviceItemForm = document.getElementById('serviceItemForm');
        if (serviceItemForm) {
            serviceItemForm.addEventListener('submit', (e) => this.handleServiceItemForm(e));
        }

        const updateServiceStatusForm = document.getElementById('updateServiceStatusForm');
        if (updateServiceStatusForm) {
            updateServiceStatusForm.addEventListener('submit', (e) => this.handleUpdateServiceStatus(e));
        }

        const completeServiceForm = document.getElementById('completeServiceForm');
        if (completeServiceForm) {
            completeServiceForm.addEventListener('submit', (e) => this.handleCompleteService(e));
        }

        const addCommentForm = document.getElementById('addCommentForm');
        if (addCommentForm) {
            addCommentForm.addEventListener('submit', (e) => this.handleAddComment(e));
        }
    }

    async loadData() {
        try {
            this.serviceJobs = await ipcRenderer.invoke('get-service-jobs');
            this.renderServiceJobsTable();
        } catch (error) {
            console.error('Error loading service jobs:', error);
            showError('Error loading service jobs');
        }
    }

    async searchServiceCustomers(searchTerm) {
        if (searchTerm.length < 2) {
            const suggestions = document.getElementById('serviceCustomerSuggestions');
            if (suggestions) suggestions.style.display = 'none';
            return;
        }

        try {
            // Use the renamed method to avoid confusion with the main search
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
            product_image_path: null // Handle file upload separately if needed
        };

        if (!itemData.category || !itemData.issue_description) {
            showError('Please fill in all required fields');
            return;
        }
        
        const itemIndex = document.getElementById('serviceItemIndex')?.value;
        
        if (itemIndex !== '') {
            // Update existing item
            this.serviceItems[parseInt(itemIndex)] = itemData;
        } else {
            // Add new item
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

    editServiceItem(index) {
        this.openServiceItemModal(index);
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
                this.clearServiceJob();
                await this.loadData();
            }
        } catch (error) {
            console.error('Error creating service job:', error);
            showError('Error creating service job');
        }
    }

    clearServiceJob() {
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

    renderServiceJobsTable() {
        const tbody = document.getElementById('serviceJobsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.serviceJobs.slice(0, 20).forEach(job => { // Show only last 20 jobs
            const row = document.createElement('tr');
            
            const statusClass = job.status.replace('_', '-');
            const locationCapitalized = job.location.charAt(0).toUpperCase() + job.location.slice(1);
            
            row.innerHTML = `
                <td><span class="job-number">${job.job_number}</span></td>
                <td>${job.customer_name || 'Walk-in'}</td>
                <td>${job.items_count || 0}</td>
                <td><span class="service-status ${statusClass}">${job.status.replace('_', ' ')}</span></td>
                <td><span class="service-location">${locationCapitalized}</span></td>
                <td>₹${parseFloat(job.estimated_cost || 0).toFixed(2)}</td>
                <td>
                    <div class="service-actions">
                        <button class="btn btn-sm btn-secondary" onclick="serviceModule().viewServiceJobDetails(${job.id})">View</button>
                        <button class="btn btn-sm btn-primary" onclick="serviceModule().updateServiceStatus(${job.id})">Update</button>
                        ${job.status !== 'service_completed' ? 
                            `<button class="btn btn-sm btn-success" onclick="serviceModule().completeService(${job.id})">Complete</button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async searchServiceJobs() {
        const searchTerm = document.getElementById('serviceJobSearch')?.value?.trim();
        
        if (searchTerm) {
            try {
                this.serviceJobs = await ipcRenderer.invoke('search-service-jobs', searchTerm);
                this.renderServiceJobsTable();
            } catch (error) {
                console.error('Error searching service jobs:', error);
                showError('Error searching service jobs');
            }
        } else {
            await this.loadData();
        }
    }

    clearServiceSearch() {
        const searchField = document.getElementById('serviceJobSearch');
        if (searchField) searchField.value = '';
        this.loadData();
    }

    async viewServiceJobDetails(jobId) {
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
        
        // Show/hide print invoice button
        const printInvoiceBtn = document.getElementById('printInvoiceBtn');
        if (printInvoiceBtn) {
            if (job.status === 'service_completed' || job.status === 'delivered') {
                printInvoiceBtn.style.display = 'inline-block';
            } else {
                printInvoiceBtn.style.display = 'none';
            }
        }
        
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
                await this.viewServiceJobDetails(jobId);
            }
        } catch (error) {
            console.error('Error updating service status:', error);
            showError('Error updating service status');
        }
    }

    completeService(jobId) {
        document.getElementById('completeServiceJobId').value = jobId;
        
        // Set default delivery date to today
        const today = new Date().toISOString().split('T')[0];
        const deliveryDateField = document.getElementById('actualDeliveryDate');
        if (deliveryDateField) deliveryDateField.value = today;
        
        const modal = document.getElementById('completeServiceModal');
        if (modal) modal.style.display = 'block';
    }

    async handleCompleteService(e) {
        e.preventDefault();
        
        const jobId = parseInt(document.getElementById('completeServiceJobId')?.value);
        const finalCost = parseFloat(document.getElementById('finalCost')?.value);
        const finalPaymentAmount = parseFloat(document.getElementById('finalPaymentAmount')?.value);
        const finalPaymentMethod = document.getElementById('finalPaymentMethod')?.value;
        const finalPaymentReference = document.getElementById('finalPaymentReference')?.value;
        const actualDeliveryDate = document.getElementById('actualDeliveryDate')?.value;
        
        if (!finalCost || !finalPaymentAmount || !finalPaymentMethod || !actualDeliveryDate) {
            showError('Please fill in all required fields');
            return;
        }
        
        try {
            await ipcRenderer.invoke('complete-service', {
                jobId,
                finalCost,
                finalPaymentAmount,
                finalPaymentMethod,
                finalPaymentReference,
                actualDeliveryDate,
                completedBy: this.currentUser.id
            });
            
            showSuccess('Service completed successfully!');
            closeModal('completeServiceModal');
            await this.loadData();
            
            // Refresh details modal if open
            if (this.currentServiceJob && this.currentServiceJob.job.id === jobId) {
                await this.viewServiceJobDetails(jobId);
            }
        } catch (error) {
            console.error('Error completing service:', error);
            showError('Error completing service');
        }
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
                await this.viewServiceJobDetails(jobId);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            showError('Error adding comment');
        }
    }

    printServiceAcknowledgment() {
        if (!this.currentServiceJob) return;
        
        const { job, items } = this.currentServiceJob;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Service Acknowledgment - ${job.job_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .subtitle { font-size: 14px; color: #666; }
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
                                <th>Category</th>
                                <th>Brand</th>
                                <th>Details</th>
                                <th>Issue Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
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
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    printServiceInvoice() {
        if (!this.currentServiceJob) return;
        
        const { job, items } = this.currentServiceJob;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Service Invoice - ${job.job_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .subtitle { font-size: 14px; color: #666; }
                    .section { margin-bottom: 15px; }
                    .section h4 { border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 8px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
                    .table th { background: #f0f0f0; font-weight: bold; }
                    .footer { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
                    .job-number { font-family: 'Courier New', monospace; font-weight: bold; }
                    .total-row { font-weight: bold; background: #f0f0f0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">⌚ Watch Shop</div>
                    <div class="subtitle">Service Invoice</div>
                </div>
                
                <div class="section">
                    <h4>Invoice Details</h4>
                    <div class="row">
                        <span>Job Number:</span>
                        <span class="job-number">${job.job_number}</span>
                    </div>
                    <div class="row">
                        <span>Service Date:</span>
                        <span>${new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="row">
                        <span>Completion Date:</span>
                        <span>${job.actual_delivery_date ? new Date(job.actual_delivery_date).toLocaleDateString() : 'N/A'}</span>
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
                </div>
                
                <div class="section">
                    <h4>Service Summary</h4>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Brand</th>
                                <th>Service Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.category}</td>
                                    <td>${item.brand || '-'}</td>
                                    <td>${item.issue_description}</td>
                                    <td>₹${(parseFloat(job.final_cost || 0) / items.length).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="3"><strong>Total Service Cost</strong></td>
                                <td><strong>₹${parseFloat(job.final_cost || 0).toFixed(2)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h4>Payment Summary</h4>
                    <div class="row">
                        <span>Total Service Cost:</span>
                        <span>₹${parseFloat(job.final_cost || 0).toFixed(2)}</span>
                    </div>
                    <div class="row">
                        <span>Advance Paid:</span>
                        <span>₹${parseFloat(job.advance_amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="row">
                        <span>Final Payment:</span>
                        <span>₹${parseFloat(job.final_payment_amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="row">
                        <span><strong>Total Paid:</strong></span>
                        <span><strong>₹${(parseFloat(job.advance_amount || 0) + parseFloat(job.final_payment_amount || 0)).toFixed(2)}</strong></span>
                    </div>
                    <div class="row">
                        <span><strong>Balance:</strong></span>
                        <span><strong>₹${(parseFloat(job.final_cost || 0) - parseFloat(job.advance_amount || 0) - parseFloat(job.final_payment_amount || 0)).toFixed(2)}</strong></span>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>Warranty period: As per manufacturer's warranty</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }
}

// Global functions for HTML onclick handlers
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

window.clearServiceJob = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.clearServiceJob();
    }
};

window.searchServiceJobs = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.searchServiceJobs();
    }
};

window.clearServiceSearch = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.clearServiceSearch();
    }
};

window.toggleServiceCategoryFields = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.toggleServiceCategoryFields();
    }
};

window.printServiceAcknowledgment = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.printServiceAcknowledgment();
    }
};

window.printServiceInvoice = function() {
    const serviceModule = window.serviceModule();
    if (serviceModule) {
        serviceModule.printServiceInvoice();
    }
};

module.exports = ServiceModule;