// src/modules/service.js - Fixed Service Module
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
        
        console.log('Initializing Service Module...');
        
        try {
            // Load data first
            await this.loadData();
            
            // Render initial view
            this.renderInitialView();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('Service Module initialized successfully');
        } catch (error) {
            console.error('Error initializing Service Module:', error);
            throw error;
        }
    }

    renderInitialView() {
        const contentBody = document.getElementById('service-content');
        if (!contentBody) {
            console.error('Service content container not found');
            return;
        }

        // Clear existing content
        contentBody.innerHTML = '';

        // Generate the HTML content
        const htmlContent = `
            <div class="service-main-container">
                <div class="service-controls">
                    <div class="search-container">
                        <input type="text" id="serviceSearch" placeholder="Search by job number, customer name, mobile..." class="search-input">
                        <button onclick="searchServices()" class="btn btn-secondary">Search</button>
                        <button onclick="clearServiceSearch()" class="btn btn-secondary">Clear</button>
                    </div>
                    <div class="filter-container">
                        <select id="serviceStatusFilter" onchange="filterServicesByStatus()">
                            <option value="">All Status</option>
                            <option value="yet_to_start">Yet to Start</option>
                            <option value="in_service_center">In Service Center</option>
                            <option value="service_completed">Service Completed</option>
                            <option value="delivered">Delivered</option>
                            <option value="returned_to_customer">Returned to Customer</option>
                            <option value="to_be_returned_to_customer">To be Returned to Customer</option>
                        </select>
                        <select id="serviceLocationFilter" onchange="filterServicesByLocation()">
                            <option value="">All Locations</option>
                            <option value="semmancheri">Semmancheri</option>
                            <option value="navalur">Navalur</option>
                            <option value="padur">Padur</option>
                        </select>
                        <input type="date" id="serviceDateFrom" placeholder="From Date">
                        <input type="date" id="serviceDateTo" placeholder="To Date">
                        <button onclick="filterServices()" class="btn btn-secondary">Filter</button>
                    </div>
                </div>
                
                <div class="data-table-container">
                    <table class="data-table service-table" id="serviceTable">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Job #</th>
                                <th>Date & Time</th>
                                <th>Customer</th>
                                <th>Mobile</th>
                                <th>Status</th>
                                <th>Location</th>
                                <th>Est. Cost</th>
                                <th>Payment Mode</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="serviceTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Service Modals -->
            <!-- New Service Modal -->
            <div id="newServiceModal" class="modal">
                <div class="modal-content large-modal responsive-modal">
                    <div class="modal-header">
                        <h3>New Service Job</h3>
                        <span class="close-btn" onclick="closeModal('newServiceModal')">&times;</span>
                    </div>
                    <form id="serviceJobForm" class="modal-form">
                        <div class="form-section">
                            <h4>Customer Information</h4>
                            <div class="form-group">
                                <label>Search Customer</label>
                                <input type="text" id="serviceCustomerSearch" placeholder="Type customer name or phone..." autocomplete="off">
                                <div id="serviceCustomerSuggestions" class="suggestions-dropdown"></div>
                            </div>
                            <div class="form-group">
                                <label>Selected Customer</label>
                                <input type="text" id="serviceSelectedCustomer" placeholder="No customer selected" readonly>
                                <input type="hidden" id="serviceSelectedCustomerId">
                            </div>
                        </div>

                        <div class="form-section">
                            <h4>Job Details</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="serviceEstimatedCost">Estimated Cost *</label>
                                    <input type="number" id="serviceEstimatedCost" step="0.01" min="0" required>
                                </div>
                                <div class="form-group">
                                    <label for="serviceAdvanceAmount">Advance Amount</label>
                                    <input type="number" id="serviceAdvanceAmount" step="0.01" min="0">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="serviceAdvancePaymentMethod">Advance Payment Method</label>
                                    <select id="serviceAdvancePaymentMethod">
                                        <option value="">Select Method</option>
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="card">Card</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="serviceAdvancePaymentReference">Payment Reference</label>
                                    <input type="text" id="serviceAdvancePaymentReference" placeholder="Transaction ID, etc.">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="serviceApproximateDeliveryDate">Approximate Delivery Date</label>
                                    <input type="date" id="serviceApproximateDeliveryDate">
                                </div>
                                <div class="form-group">
                                    <label for="serviceLocation">Location *</label>
                                    <select id="serviceLocation" required>
                                        <option value="">Select Location</option>
                                        <option value="semmancheri">Semmancheri</option>
                                        <option value="navalur">Navalur</option>
                                        <option value="padur">Padur</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="serviceComments">Comments</label>
                                <textarea id="serviceComments" rows="3" placeholder="Additional notes or special instructions"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h4>Service Items</h4>
                            <button type="button" class="btn btn-secondary" onclick="addServiceItem()">Add Item</button>
                            <div id="serviceItemsContainer" class="service-items-container">
                                <!-- Dynamic service items will be added here -->
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="button" onclick="closeModal('newServiceModal')" class="btn btn-secondary">Cancel</button>
                            <button type="button" onclick="clearServiceForm()" class="btn btn-secondary">Clear</button>
                            <button type="submit" class="btn btn-primary">Create Service Job</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Service Job Details Modal -->
            <div id="serviceJobDetailsModal" class="modal">
                <div class="modal-content extra-large-modal responsive-modal">
                    <div class="modal-header">
                        <h3>Service Job Details</h3>
                        <span class="close-btn" onclick="closeModal('serviceJobDetailsModal')">&times;</span>
                    </div>
                    <div class="modal-body" id="serviceJobDetailsContent">
                        <!-- Dynamic content -->
                    </div>
                    <div class="modal-actions">
                        <button type="button" onclick="closeModal('serviceJobDetailsModal')" class="btn btn-secondary">Close</button>
                        <button type="button" onclick="serviceModule().printServiceAcknowledgment()" class="btn btn-primary">Print Acknowledgment</button>
                    </div>
                </div>
            </div>

            <!-- Service History Modal -->
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

            <!-- Update Service Status Modal -->
            <div id="updateServiceStatusModal" class="modal">
                <div class="modal-content responsive-modal">
                    <div class="modal-header">
                        <h3>Update Service Status</h3>
                        <span class="close-btn" onclick="closeModal('updateServiceStatusModal')">&times;</span>
                    </div>
                    <form id="updateServiceStatusForm" class="modal-form">
                        <input type="hidden" id="updateStatusJobId">
                        
                        <div class="form-group">
                            <label for="newServiceStatus">Status *</label>
                            <select id="newServiceStatus" required>
                                <option value="">Select Status</option>
                                <option value="yet_to_start">Yet to Start</option>
                                <option value="in_service_center">In Service Center</option>
                                <option value="service_completed">Service Completed</option>
                                <option value="delivered">Delivered</option>
                                <option value="returned_to_customer">Returned to Customer</option>
                                <option value="to_be_returned_to_customer">To be Returned to Customer</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="newServiceLocation">Location *</label>
                            <select id="newServiceLocation" required>
                                <option value="">Select Location</option>
                                <option value="semmancheri">Semmancheri</option>
                                <option value="navalur">Navalur</option>
                                <option value="padur">Padur</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="statusUpdateComments">Comments</label>
                            <textarea id="statusUpdateComments" rows="3" placeholder="Optional comments about the status change"></textarea>
                        </div>

                        <div class="modal-actions">
                            <button type="button" onclick="closeModal('updateServiceStatusModal')" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update Status</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Add Comment Modal -->
            <div id="addCommentModal" class="modal">
                <div class="modal-content responsive-modal">
                    <div class="modal-header">
                        <h3>Add Comment</h3>
                        <span class="close-btn" onclick="closeModal('addCommentModal')">&times;</span>
                    </div>
                    <form id="addCommentForm" class="modal-form">
                        <input type="hidden" id="commentJobId">
                        
                        <div class="form-group">
                            <label for="newComment">Comment *</label>
                            <textarea id="newComment" rows="4" required placeholder="Enter your comment"></textarea>
                        </div>

                        <div class="modal-actions">
                            <button type="button" onclick="closeModal('addCommentModal')" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add Comment</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Set the HTML content
        contentBody.innerHTML = htmlContent;

        // Render the service table
        this.renderServiceTable();
    }

    async loadData() {
        try {
            console.log('Loading service data...');
            const jobs = await ipcRenderer.invoke('get-service-jobs');
            this.serviceJobs = jobs || [];
            this.filteredServiceJobs = [...this.serviceJobs];
            console.log('Service data loaded:', this.serviceJobs.length, 'jobs');
        } catch (error) {
            console.error('Error loading service data:', error);
            this.serviceJobs = [];
            this.filteredServiceJobs = [];
        }
    }

    renderServiceTable() {
        const tbody = document.getElementById('serviceTableBody');
        if (!tbody) {
            console.error('Service table body not found');
            return;
        }

        tbody.innerHTML = '';

        if (this.filteredServiceJobs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="no-data">No service jobs found</td>
                </tr>
            `;
            return;
        }

        this.filteredServiceJobs.forEach((job, index) => {
            const row = document.createElement('tr');
            const statusClass = job.status ? job.status.replace('_', '-') : 'unknown';
            const locationClass = job.location || 'unknown';
            const paymentModeDisplay = job.advance_payment_method 
                ? job.advance_payment_method.toUpperCase() 
                : 'N/A';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <span class="job-number">${job.job_number || 'N/A'}</span>
                </td>
                <td>${job.created_at ? new Date(job.created_at).toLocaleString() : 'N/A'}</td>
                <td>${job.customer_name || 'Walk-in Customer'}</td>
                <td>${job.customer_phone || 'N/A'}</td>
                <td>
                    <span class="service-status-badge ${statusClass}">${job.status ? job.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}</span>
                </td>
                <td>
                    <span class="location-badge ${locationClass}">${job.location ? job.location.charAt(0).toUpperCase() + job.location.slice(1) : 'Unknown'}</span>
                </td>
                <td>₹${job.estimated_cost ? parseFloat(job.estimated_cost).toFixed(2) : '0.00'}</td>
                <td>
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

    setupEventListeners() {
        // Service Job Form submission
        const serviceJobForm = document.getElementById('serviceJobForm');
        if (serviceJobForm) {
            serviceJobForm.addEventListener('submit', (e) => this.handleServiceJobSubmit(e));
        }

        // Update Service Status Form submission
        const updateStatusForm = document.getElementById('updateServiceStatusForm');
        if (updateStatusForm) {
            updateStatusForm.addEventListener('submit', (e) => this.handleUpdateServiceStatus(e));
        }

        // Add Comment Form submission
        const addCommentForm = document.getElementById('addCommentForm');
        if (addCommentForm) {
            addCommentForm.addEventListener('submit', (e) => this.handleAddComment(e));
        }

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
    }

    // Service Job Operations
    async handleServiceJobSubmit(e) {
        e.preventDefault();
        
        try {
            const job = {
                customer_id: document.getElementById('serviceSelectedCustomerId').value || null,
                estimated_cost: parseFloat(document.getElementById('serviceEstimatedCost').value),
                advance_amount: parseFloat(document.getElementById('serviceAdvanceAmount').value) || 0,
                advance_payment_method: document.getElementById('serviceAdvancePaymentMethod').value || null,
                advance_payment_reference: document.getElementById('serviceAdvancePaymentReference').value || null,
                approximate_delivery_date: document.getElementById('serviceApproximateDeliveryDate').value || null,
                location: document.getElementById('serviceLocation').value,
                comments: document.getElementById('serviceComments').value || null,
                created_by: this.currentUser.id
            };

            if (this.serviceItems.length === 0) {
                alert('Please add at least one service item');
                return;
            }

            const result = await ipcRenderer.invoke('create-service-job', {
                job: job,
                items: this.serviceItems
            });

            if (result.success) {
                alert(`Service job created successfully! Job Number: ${result.job_number}`);
                this.closeModal('newServiceModal');
                this.clearServiceForm();
                await this.loadData();
                this.renderServiceTable();
            } else {
                alert('Error creating service job');
            }
        } catch (error) {
            console.error('Error creating service job:', error);
            alert('Error creating service job');
        }
    }

    // Customer Search and Selection
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
                ${customer.phone ? `<span>(${customer.phone})</span>` : ''}
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

    // Service Item Management
    addServiceItem() {
        const container = document.getElementById('serviceItemsContainer');
        if (!container) return;

        const itemId = Date.now();
        const itemHtml = `
            <div class="service-item-card" data-item-id="${itemId}">
                <div class="service-item-header">
                    <h5>Service Item #${container.children.length + 1}</h5>
                    <button type="button" class="btn-remove" onclick="serviceModule().removeServiceItem(${itemId})">&times;</button>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Category *</label>
                        <select data-field="category" required onchange="serviceModule().toggleServiceCategoryFields(${itemId})">
                            <option value="">Select Category</option>
                            <option value="watch">Watch</option>
                            <option value="wallclock">Wall Clock</option>
                            <option value="timepiece">Time Piece</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Brand</label>
                        <input type="text" data-field="brand" placeholder="Brand name">
                    </div>
                </div>

                <div class="watch-specific-fields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Gender</label>
                            <select data-field="gender">
                                <option value="">Select Gender</option>
                                <option value="gents">Gents</option>
                                <option value="ladies">Ladies</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Case Material</label>
                            <select data-field="case_material">
                                <option value="">Select Material</option>
                                <option value="steel">Steel</option>
                                <option value="gold_tone">Gold Tone</option>
                                <option value="fiber">Fiber</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Strap Material</label>
                            <select data-field="strap_material">
                                <option value="">Select Material</option>
                                <option value="leather">Leather</option>
                                <option value="fiber">Fiber</option>
                                <option value="steel">Steel</option>
                                <option value="gold_plated">Gold Plated</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Machine Change</label>
                            <select data-field="machine_change">
                                <option value="">Select</option>
                                <option value="1">Yes</option>
                                <option value="0">No</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Movement Number</label>
                        <input type="text" data-field="movement_no" placeholder="Movement number">
                    </div>
                </div>

                <div class="form-group">
                    <label>Issue Description *</label>
                    <textarea data-field="issue_description" rows="3" required placeholder="Describe the issue or service required"></textarea>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', itemHtml);
    }

    removeServiceItem(itemId) {
        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (item) {
            item.remove();
            this.updateServiceItemNumbers();
        }
    }

    updateServiceItemNumbers() {
        const items = document.querySelectorAll('.service-item-card');
        items.forEach((item, index) => {
            const header = item.querySelector('h5');
            if (header) {
                header.textContent = `Service Item #${index + 1}`;
            }
        });
    }

    toggleServiceCategoryFields(itemId) {
        const itemCard = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!itemCard) return;

        const categorySelect = itemCard.querySelector('[data-field="category"]');
        const watchFields = itemCard.querySelector('.watch-specific-fields');
        
        if (categorySelect && watchFields) {
            if (categorySelect.value === 'watch') {
                watchFields.style.display = 'block';
            } else {
                watchFields.style.display = 'none';
            }
        }
    }

    // Form Management
    clearServiceForm() {
        // Clear customer selection
        const selectedCustomerField = document.getElementById('serviceSelectedCustomer');
        const selectedCustomerIdField = document.getElementById('serviceSelectedCustomerId');
        const customerSearchField = document.getElementById('serviceCustomerSearch');
        
        if (selectedCustomerField) selectedCustomerField.value = '';
        if (selectedCustomerIdField) selectedCustomerIdField.value = '';
        if (customerSearchField) customerSearchField.value = '';
        
        // Clear job details
        const form = document.getElementById('serviceJobForm');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });
        }

        // Clear service items
        const container = document.getElementById('serviceItemsContainer');
        if (container) {
            container.innerHTML = '';
        }

        this.serviceItems = [];
        this.selectedServiceCustomer = null;
    }

    // Modal Management
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

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Search and Filter Functions
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

    // Service Job Details and Actions
    async viewServiceDetails(jobId) {
        try {
            const serviceDetails = await ipcRenderer.invoke('get-service-job-details', jobId);
            this.currentServiceJob = serviceDetails;
            this.displayServiceJobDetails(serviceDetails);
            
            const modal = document.getElementById('serviceJobDetailsModal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading service job details:', error);
            alert('Error loading service job details');
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
                    ${job.comments ? `
                    <div class="job-detail-row">
                        <span class="job-detail-label">Comments:</span>
                        <span class="job-detail-value">${job.comments}</span>
                    </div>` : ''}
                </div>

                <div class="service-items">
                    <h4>Service Items</h4>
                    ${items.map((item, index) => `
                        <div class="service-item-detail">
                            <h5>Item #${index + 1}</h5>
                            <div class="item-detail-grid">
                                <div><strong>Category:</strong> ${item.category}</div>
                                ${item.brand ? `<div><strong>Brand:</strong> ${item.brand}</div>` : ''}
                                ${item.gender ? `<div><strong>Gender:</strong> ${item.gender}</div>` : ''}
                                ${item.case_material ? `<div><strong>Case Material:</strong> ${item.case_material}</div>` : ''}
                                ${item.strap_material ? `<div><strong>Strap Material:</strong> ${item.strap_material}</div>` : ''}
                                ${item.movement_no ? `<div><strong>Movement No:</strong> ${item.movement_no}</div>` : ''}
                                <div><strong>Issue:</strong> ${item.issue_description}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="service-cost-details">
                    <h4>Cost Information</h4>
                    <div class="cost-detail-grid">
                        <div class="cost-row">
                            <span class="cost-label">Estimated Cost:</span>
                            <span class="cost-value">₹${parseFloat(job.estimated_cost).toFixed(2)}</span>
                        </div>
                        ${job.advance_amount ? `
                        <div class="cost-row">
                            <span class="cost-label">Advance:</span>
                            <span class="cost-value">₹${parseFloat(job.advance_amount).toFixed(2)}</span>
                        </div>
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
                        ${comments.length > 0 ? 
                            comments.map(comment => `
                                <div class="comment-item">
                                    <div class="comment-header">
                                        <strong>${comment.added_by_name || 'Unknown'}</strong>
                                        <span class="comment-date">${new Date(comment.added_at).toLocaleString()}</span>
                                    </div>
                                    <div class="comment-text">${comment.comment}</div>
                                </div>
                            `).join('') 
                            : '<p>No comments added yet.</p>'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    async updateServiceStatus(jobId) {
        try {
            const serviceDetails = await ipcRenderer.invoke('get-service-job-details', jobId);
            
            // Pre-populate the form with current values
            document.getElementById('updateStatusJobId').value = jobId;
            document.getElementById('newServiceStatus').value = serviceDetails.job.status;
            document.getElementById('newServiceLocation').value = serviceDetails.job.location;
            
            const modal = document.getElementById('updateServiceStatusModal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading service job for status update:', error);
            alert('Error loading service job details');
        }
    }

    async handleUpdateServiceStatus(e) {
        e.preventDefault();
        
        try {
            const jobId = parseInt(document.getElementById('updateStatusJobId').value);
            const status = document.getElementById('newServiceStatus').value;
            const location = document.getElementById('newServiceLocation').value;
            const comments = document.getElementById('statusUpdateComments').value;

            const result = await ipcRenderer.invoke('update-service-status', {
                jobId,
                status,
                location,
                comments,
                changedBy: this.currentUser.id
            });

            if (result.success) {
                alert('Service status updated successfully!');
                this.closeModal('updateServiceStatusModal');
                
                // Reset form
                document.getElementById('updateServiceStatusForm').reset();
                
                // Reload data and refresh table
                await this.loadData();
                this.renderServiceTable();
            } else {
                alert('Error updating service status');
            }
        } catch (error) {
            console.error('Error updating service status:', error);
            alert('Error updating service status');
        }
    }

    async showServiceHistory(jobId) {
        try {
            const serviceDetails = await ipcRenderer.invoke('get-service-job-details', jobId);
            this.displayServiceHistory(serviceDetails);
            
            const modal = document.getElementById('serviceHistoryModal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading service history:', error);
            alert('Error loading service history');
        }
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
                    ${comments.length > 0 ? 
                        `<div class="timeline-container">
                            ${comments.map((comment, index) => `
                                <div class="timeline-item">
                                    <div class="timeline-marker comment-marker"></div>
                                    <div class="timeline-content">
                                        <div class="comment-timeline-header">
                                            <span class="comment-author">${comment.added_by_name || 'Unknown'}</span>
                                            <span class="timeline-date">${new Date(comment.added_at).toLocaleString()}</span>
                                        </div>
                                        <div class="comment-text">${comment.comment}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>` 
                        : '<p>No comments added yet.</p>'
                    }
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
        
        try {
            const jobId = parseInt(document.getElementById('commentJobId').value);
            const comment = document.getElementById('newComment').value.trim();

            if (!comment) {
                alert('Please enter a comment');
                return;
            }

            await ipcRenderer.invoke('add-service-comment', {
                jobId,
                comment,
                addedBy: this.currentUser.id
            });

            alert('Comment added successfully!');
            this.closeModal('addCommentModal');
            document.getElementById('newComment').value = '';
            
            // Refresh details modal if open
            if (this.currentServiceJob && this.currentServiceJob.job.id === jobId) {
                await this.viewServiceDetails(jobId);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Error adding comment');
        }
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
            
            // Generate acknowledgment number
            const acknowledgmentNumber = await ipcRenderer.invoke('generate-acknowledgment-number');

            const printWindow = window.open('', '', 'width=800,height=600');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Service Acknowledgment - ${job.job_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .company-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
                        .company-info { font-size: 12px; color: #666; }
                        .acknowledgment-title { font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
                        .info-item { margin: 5px 0; }
                        .label { font-weight: bold; }
                        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        .items-table th { background: #f5f5f5; font-weight: bold; }
                        .section { margin: 20px 0; }
                        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                        .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
                        .signature-box { text-align: center; padding-top: 30px; border-top: 1px solid #333; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-name">WATCH SHOP</div>
                        <div class="company-info">Service Center<br>Professional Watch Repair Services</div>
                    </div>
                    
                    <div class="acknowledgment-title">SERVICE ACKNOWLEDGMENT</div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">Acknowledgment #:</span> ${acknowledgmentNumber}
                        </div>
                        <div class="info-item">
                            <span class="label">Job Number:</span> ${job.job_number}
                        </div>
                        <div class="info-item">
                            <span class="label">Date:</span> ${new Date().toLocaleDateString()}
                        </div>
                        <div class="info-item">
                            <span class="label">Time:</span> ${new Date().toLocaleTimeString()}
                        </div>
                        <div class="info-item">
                            <span class="label">Customer:</span> ${job.customer_name || 'Walk-in Customer'}
                        </div>
                        <div class="info-item">
                            <span class="label">Phone:</span> ${job.customer_phone || 'N/A'}
                        </div>
                    </div>

                    <div class="section">
                        <h4>Service Items</h4>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>#</th>
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
                                        <td>${item.brand || 'N/A'}</td>
                                        <td>
                                            ${item.gender ? `Gender: ${item.gender}<br>` : ''}
                                            ${item.case_material ? `Case: ${item.case_material}<br>` : ''}
                                            ${item.strap_material ? `Strap: ${item.strap_material}<br>` : ''}
                                            ${item.movement_no ? `Movement: ${item.movement_no}<br>` : ''}
                                        </td>
                                        <td>${item.issue_description}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h4>Service Details</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Estimated Cost:</span> ₹${parseFloat(job.estimated_cost).toFixed(2)}
                            </div>
                            ${job.advance_amount ? `
                            <div class="info-item">
                                <span class="label">Advance Received:</span> ₹${parseFloat(job.advance_amount).toFixed(2)}
                            </div>` : ''}
                            <div class="info-item">
                                <span class="label">Expected Delivery:</span> ${job.approximate_delivery_date ? new Date(job.approximate_delivery_date).toLocaleDateString() : 'TBD'}
                            </div>
                            <div class="info-item">
                                <span class="label">Location:</span> ${job.location.charAt(0).toUpperCase() + job.location.slice(1)}
                            </div>
                        </div>
                    </div>

                    ${job.comments ? `
                    <div class="section">
                        <h4>Comments</h4>
                        <p>${job.comments}</p>
                    </div>` : ''}
                    
                    <div class="signature-section">
                        <div class="signature-box">
                            Customer Signature
                        </div>
                        <div class="signature-box">
                            Authorized Signature
                        </div>
                    </div>
                    
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
            alert('Error printing acknowledgment');
        }
    }

    // Utility Methods
    getServiceJobs() {
        return this.serviceJobs;
    }

    getServiceJobsByStatus(status) {
        return this.serviceJobs.filter(job => job.status === status);
    }

    getServiceJobsByDateRange(startDate, endDate) {
        return this.serviceJobs.filter(job => {
            const jobDate = new Date(job.created_at);
            return jobDate >= new Date(startDate) && jobDate <= new Date(endDate);
        });
    }

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