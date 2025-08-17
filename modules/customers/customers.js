// Complete Fixed Customers module for ZEDSON Watchcraft
(function() {
    'use strict';
    
    // Prevent redeclaration
    if (typeof window.CustomersModule !== 'undefined') {
        console.log('CustomersModule already exists, skipping redeclaration');
        return;
    }

class CustomersModule {
    constructor() {
        this.customers = [];
        this.filteredCustomers = [];
        this.currentSort = { field: 'created_at', direction: 'desc' };
        this.searchTerm = '';
        this.filters = {};
        this.editingCustomer = null;
        
        // Store event handlers for proper cleanup
        this.eventHandlers = {};
    }

    async render(container) {
        try {
            console.log('Customers module: Starting render...');
            
            // Check dependencies
            if (typeof app === 'undefined') {
                throw new Error('App instance not available');
            }
            
            if (typeof Utils === 'undefined') {
                throw new Error('Utils not available');
            }
            
            container.innerHTML = this.getTemplate();
            console.log('Customers module: Template rendered');
            
            await this.loadCustomers();
            console.log('Customers module: Data loaded');
            
            this.setupEventListeners();
            console.log('Customers module: Event listeners setup');
            
            this.renderCustomersList();
            console.log('Customers module: List rendered');
            
        } catch (error) {
            console.error('Customers render error:', error);
            container.innerHTML = `
                <div class="error-container" style="padding: 2rem; text-align: center; color: #dc2626;">
                    <h2>Failed to Load Customers Module</h2>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        Reload Application
                    </button>
                </div>
            `;
        }
    }

    getTemplate() {
        return `
            <div class="customers-container">
                <div class="customers-header">
                    <h1>Customer Management</h1>
                    <button class="btn btn-primary" id="add-customer-btn">
                        <span>+</span> New Customer
                    </button>
                </div>

                <div class="customers-toolbar">
                    <div class="search-section">
                        <div class="search-input">
                            <input type="text" id="customer-search" class="form-input" 
                                   placeholder="Search customers by name, mobile, or ID...">
                        </div>
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="location-filter" class="form-select">
                            <option value="">All Locations</option>
                            <option value="Semmancheri">Semmancheri</option>
                            <option value="Navalur">Navalur</option>
                            <option value="Padur">Padur</option>
                        </select>
                        
                        <select id="sort-by" class="form-select">
                            <option value="created_at-desc">Newest First</option>
                            <option value="created_at-asc">Oldest First</option>
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                            <option value="net_value-desc">Highest Value</option>
                            <option value="net_value-asc">Lowest Value</option>
                        </select>
                    </div>
                </div>

                <div class="customers-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-customers-count">0</span>
                        <span class="stat-label">Total Customers</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="total-customer-value">₹0</span>
                        <span class="stat-label">Total Customer Value</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="active-customers-count">0</span>
                        <span class="stat-label">Active This Month</span>
                    </div>
                </div>

                <div class="customers-list-container">
                    <div id="customers-list" class="table-responsive">
                        <div class="loading-placeholder">Loading customers...</div>
                    </div>
                </div>

                <!-- Customer Form Modal -->
                <div id="customer-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-md">
                        <div class="modal-header">
                            <h3 class="modal-title" id="modal-title">Add New Customer</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="customer-form" class="form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Customer ID</label>
                                        <input type="text" name="customerId" id="customer-id" class="form-input" 
                                               maxlength="6" pattern="[0-9]{6}" required>
                                        <small class="form-help">6-digit customer ID (auto-generated)</small>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Customer Name</label>
                                        <input type="text" name="name" class="form-input" 
                                               maxlength="100" required>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Mobile Number</label>
                                        <input type="tel" name="mobile" class="form-input" 
                                               maxlength="15" pattern="[+]?[0-9]{10,15}" required>
                                        <small class="form-help">Include country code if international</small>
                                    </div>
                                </div>

                                <div id="form-errors" class="form-errors" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="customer-form" class="btn btn-primary" id="save-customer-btn">
                                Save Customer
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Confirmation Modal -->
                <div id="confirm-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-sm confirm-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Confirm Action</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="confirm-icon warning">⚠️</div>
                            <p id="confirm-message">Are you sure you want to delete this customer?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="button" class="btn btn-error" id="confirm-action-btn">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadCustomers() {
        try {
            this.customers = await app.query(`
                SELECT 
                    c.*,
                    COALESCE(s.sales_total, 0) + COALESCE(srv.service_total, 0) as net_value
                FROM customers c
                LEFT JOIN (
                    SELECT customer_id, SUM(total_amount) as sales_total
                    FROM sales
                    GROUP BY customer_id
                ) s ON c.id = s.customer_id
                LEFT JOIN (
                    SELECT customer_id, SUM(amount) as service_total
                    FROM services
                    GROUP BY customer_id
                ) srv ON c.id = srv.customer_id
                ORDER BY c.created_at DESC
            `);

            this.applyFilters();
            this.updateStats();
        } catch (error) {
            console.error('Error loading customers:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Clear existing listeners to prevent duplicates
        this.removeEventListeners();
        
        // Add customer button
        const addBtn = document.getElementById('add-customer-btn');
        this.eventHandlers.addBtn = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openCustomerModal();
        };
        addBtn.addEventListener('click', this.eventHandlers.addBtn);

        // Search functionality
        const searchInput = document.getElementById('customer-search');
        this.eventHandlers.search = Utils.debounce((e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        }, 300);
        searchInput.addEventListener('input', this.eventHandlers.search);

        // Clear search
        const clearBtn = document.getElementById('clear-search');
        this.eventHandlers.clear = (e) => {
            e.preventDefault();
            searchInput.value = '';
            this.searchTerm = '';
            this.applyFilters();
        };
        clearBtn.addEventListener('click', this.eventHandlers.clear);

        // Filters
        const locationFilter = document.getElementById('location-filter');
        this.eventHandlers.locationFilter = (e) => {
            this.filters.location = e.target.value;
            this.applyFilters();
        };
        locationFilter.addEventListener('change', this.eventHandlers.locationFilter);

        const sortBy = document.getElementById('sort-by');
        this.eventHandlers.sort = (e) => {
            const [field, direction] = e.target.value.split('-');
            this.currentSort = { field, direction };
            this.applyFilters();
        };
        sortBy.addEventListener('change', this.eventHandlers.sort);

        // Form submission
        const form = document.getElementById('customer-form');
        this.eventHandlers.form = (e) => {
            this.handleFormSubmit(e);
        };
        form.addEventListener('submit', this.eventHandlers.form);

        // Modal close on backdrop click
        this.eventHandlers.modal = (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                e.target.style.display = 'none';
            }
        };
        document.addEventListener('click', this.eventHandlers.modal);
    }

    removeEventListeners() {
        // Remove existing event listeners to prevent duplicates
        const addBtn = document.getElementById('add-customer-btn');
        const searchInput = document.getElementById('customer-search');
        const clearBtn = document.getElementById('clear-search');
        const locationFilter = document.getElementById('location-filter');
        const sortBy = document.getElementById('sort-by');
        const form = document.getElementById('customer-form');

        if (this.eventHandlers.addBtn) addBtn?.removeEventListener('click', this.eventHandlers.addBtn);
        if (this.eventHandlers.search) searchInput?.removeEventListener('input', this.eventHandlers.search);
        if (this.eventHandlers.clear) clearBtn?.removeEventListener('click', this.eventHandlers.clear);
        if (this.eventHandlers.locationFilter) locationFilter?.removeEventListener('change', this.eventHandlers.locationFilter);
        if (this.eventHandlers.sort) sortBy?.removeEventListener('change', this.eventHandlers.sort);
        if (this.eventHandlers.form) form?.removeEventListener('submit', this.eventHandlers.form);
        if (this.eventHandlers.modal) document.removeEventListener('click', this.eventHandlers.modal);
        
        // Clear handlers
        this.eventHandlers = {};
    }

    applyFilters() {
        let filtered = [...this.customers];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(customer => 
                customer.name.toLowerCase().includes(term) ||
                customer.mobile.includes(term) ||
                customer.customer_id.includes(term)
            );
        }

        // Apply location filter (if you track customer locations)
        if (this.filters.location) {
            // This would be used if we track customer locations
        }

        // Apply sorting
        filtered = Utils.sortBy(filtered, this.currentSort.field, this.currentSort.direction);

        this.filteredCustomers = filtered;
        this.renderCustomersList();
    }

    renderCustomersList() {
        const container = document.getElementById('customers-list');
        
        if (this.filteredCustomers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No customers found</h3>
                    <p>Start by adding your first customer</p>
                    <button class="btn btn-primary" onclick="customersModule.openCustomerModal()">
                        Add Customer
                    </button>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th class="sortable" data-field="customer_id">Customer ID</th>
                        <th class="sortable" data-field="name">Name</th>
                        <th class="sortable" data-field="mobile">Mobile</th>
                        <th class="sortable" data-field="created_at">Created Date</th>
                        <th class="sortable" data-field="net_value">Net Value</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredCustomers.map((customer, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td class="font-mono">${customer.customer_id}</td>
                            <td class="font-semibold">${customer.name}</td>
                            <td>${customer.mobile}</td>
                            <td>${Utils.formatDate(customer.created_at)}</td>
                            <td class="text-success font-semibold">${Utils.formatCurrency(customer.net_value)}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="customersModule.editCustomer(${customer.id})" title="Edit">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-error" onclick="customersModule.deleteCustomer(${customer.id})" title="Delete">
                                        🗑️
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="customersModule.createSale(${customer.id})" title="New Sale">
                                        💰
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="customersModule.createService(${customer.id})" title="New Service">
                                        🔧
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="customersModule.createInstantService(${customer.id})" title="Instant Service">
                                        ⚡
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;

        // Add sort click handlers using event delegation
        const table = container.querySelector('.table');
        if (table) {
            table.addEventListener('click', (e) => {
                if (e.target.classList.contains('sortable')) {
                    const field = e.target.getAttribute('data-field');
                    const direction = this.currentSort.field === field && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                    
                    this.currentSort = { field, direction };
                    this.applyFilters();
                    
                    // Update UI indicators
                    table.querySelectorAll('th').forEach(header => header.classList.remove('sorted-asc', 'sorted-desc'));
                    e.target.classList.add(`sorted-${direction}`);
                }
            });
        }
    }

    updateStats() {
        const totalCount = this.customers.length;
        const totalValue = this.customers.reduce((sum, customer) => sum + (customer.net_value || 0), 0);
        
        // Calculate active customers (those with transactions this month)
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const activeCount = this.customers.filter(customer => {
            const createdDate = new Date(customer.created_at);
            return createdDate >= thisMonth || customer.net_value > 0;
        }).length;

        document.getElementById('total-customers-count').textContent = totalCount.toLocaleString();
        document.getElementById('total-customer-value').textContent = Utils.formatCurrency(totalValue);
        document.getElementById('active-customers-count').textContent = activeCount.toLocaleString();
    }

    openCustomerModal(customer = null) {
        // Prevent multiple calls
        if (document.getElementById('customer-modal').style.display === 'block') {
            return;
        }
        
        this.editingCustomer = customer;
        const modal = document.getElementById('customer-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('customer-form');
        const saveBtn = document.getElementById('save-customer-btn');

        // Clear form errors immediately
        document.getElementById('form-errors').style.display = 'none';

        if (customer) {
            // Edit mode - populate form synchronously
            title.textContent = 'Edit Customer';
            saveBtn.textContent = 'Update Customer';
            
            // Populate fields immediately
            const customerIdField = document.getElementById('customer-id');
            customerIdField.value = customer.customer_id;
            customerIdField.readOnly = true;
            customerIdField.style.backgroundColor = '#f8f9fa';
            customerIdField.style.cursor = 'not-allowed';
            customerIdField.style.color = '#6c757d';
            
            form.querySelector('input[name="name"]').value = customer.name || '';
            form.querySelector('input[name="mobile"]').value = customer.mobile || '';
            
        } else {
            // Add mode - reset form first
            form.reset();
            title.textContent = 'Add New Customer';
            saveBtn.textContent = 'Save Customer';
            
            // Generate new customer ID immediately
            const customerId = this.getNextCustomerIdSync();
            const customerIdField = document.getElementById('customer-id');
            customerIdField.value = customerId;
            customerIdField.readOnly = false;
            customerIdField.style.backgroundColor = '';
            customerIdField.style.cursor = '';
            customerIdField.style.color = '';
        }

        // Show modal and focus immediately
        modal.style.display = 'block';
        
        // Focus on the name field
        requestAnimationFrame(() => {
            const nameField = form.querySelector('input[name="name"]');
            if (nameField) {
                nameField.focus();
                nameField.select(); // Select any existing text for immediate replacement
            }
        });
    }

    getNextCustomerIdSync() {
        try {
            if (this.customers.length === 0) {
                return '100001';
            }
            
            // Get the highest customer ID from current loaded customers (synchronous)
            const highestId = Math.max(...this.customers.map(c => parseInt(c.customer_id)));
            return (highestId + 1).toString().padStart(6, '0');
        } catch (error) {
            console.error('Error generating customer ID:', error);
            return '100001';
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            // Simple form data collection
            const form = e.target;
            const formData = {
                customerId: form.querySelector('#customer-id').value.trim(),
                name: form.querySelector('input[name="name"]').value.trim(),
                mobile: form.querySelector('input[name="mobile"]').value.trim()
            };
            
            // Basic validation
            if (!formData.customerId || !formData.name || !formData.mobile) {
                this.showFormErrors({ general: 'All fields are required' });
                return;
            }

            if (formData.customerId.length !== 6 || !/^\d{6}$/.test(formData.customerId)) {
                this.showFormErrors({ general: 'Customer ID must be 6 digits' });
                return;
            }

            if (formData.mobile.length < 10) {
                this.showFormErrors({ general: 'Mobile number must be at least 10 digits' });
                return;
            }

            // Check for duplicates
            const existingCustomer = await app.get(`
                SELECT id FROM customers 
                WHERE (customer_id = ? OR mobile = ?) 
                ${this.editingCustomer ? 'AND id != ?' : ''}
            `, this.editingCustomer 
                ? [formData.customerId, formData.mobile, this.editingCustomer.id]
                : [formData.customerId, formData.mobile]
            );

            if (existingCustomer) {
                this.showFormErrors({ general: 'Customer ID or mobile number already exists' });
                return;
            }

            // Disable save button
            const saveBtn = document.getElementById('save-customer-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            if (this.editingCustomer) {
                await this.updateCustomer(this.editingCustomer.id, formData);
            } else {
                await this.createCustomer(formData);
            }

            document.getElementById('customer-modal').style.display = 'none';
            await this.loadCustomers();
            
            Utils.showSuccess(this.editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showFormErrors({ general: 'Failed to save customer. Please try again.' });
        } finally {
            // Re-enable save button
            const saveBtn = document.getElementById('save-customer-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = this.editingCustomer ? 'Update Customer' : 'Save Customer';
            }
        }
    }

    async createCustomer(data) {
        const currentUser = await Auth.getCurrentUser();
        const username = currentUser ? currentUser.username : 'system';
        
        const result = await app.run(`
            INSERT INTO customers (customer_id, name, mobile, created_by, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [
            data.customerId,
            data.name,
            data.mobile,
            username,
            new Date().toISOString()
        ]);

        await Audit.logCreate('customers', result.id, data, `Created customer: ${data.name} (${data.customerId})`);
        return result;
    }

    async updateCustomer(id, data) {
        const oldData = this.customers.find(c => c.id === id);
        
        await app.run(`
            UPDATE customers 
            SET customer_id = ?, name = ?, mobile = ?, updated_at = ?
            WHERE id = ?
        `, [
            data.customerId,
            data.name,
            data.mobile,
            new Date().toISOString(),
            id
        ]);

        await Audit.logUpdate('customers', id, oldData, data, `Updated customer: ${data.name} (${data.customerId})`);
        return true;
    }

    editCustomer(id) {
        const customer = this.customers.find(c => c.id === id);
        if (customer) {
            this.openCustomerModal(customer);
        }
    }

    deleteCustomer(id) {
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-action-btn');

        message.textContent = `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`;
        
        confirmBtn.onclick = async () => {
            try {
                // Disable button to prevent double clicks
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Deleting...';
                
                await app.run('DELETE FROM customers WHERE id = ?', [id]);
                await Audit.logDelete('customers', id, customer, `Deleted customer: ${customer.name} (${customer.customer_id})`);
                
                modal.style.display = 'none';
                await this.loadCustomers();
                Utils.showSuccess('Customer deleted successfully');
                
            } catch (error) {
                console.error('Delete error:', error);
                Utils.showError('Failed to delete customer');
            } finally {
                // Re-enable button
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete';
            }
        };

        modal.style.display = 'block';
    }

    // Action methods for sales and services
    createSale(customerId) {
        console.log('Create sale for customer:', customerId);
        Utils.showError('Sales module not implemented yet');
    }

    createService(customerId) {
        console.log('Create service for customer:', customerId);
        Utils.showError('Service module not implemented yet');
    }

    createInstantService(customerId) {
        console.log('Create instant service for customer:', customerId);
        Utils.showError('Instant service module not implemented yet');
    }

    showFormErrors(errors) {
        const errorsDiv = document.getElementById('form-errors');
        const errorMessages = Object.values(errors).map(error => `<div class="error-item">• ${error}</div>`).join('');
        
        errorsDiv.innerHTML = `
            <div class="alert alert-error">
                <strong>Please fix the following errors:</strong>
                ${errorMessages}
            </div>
        `;
        errorsDiv.style.display = 'block';
    }

    async refresh() {
        try {
            await this.loadCustomers();
        } catch (error) {
            console.error('Customers refresh error:', error);
            Utils.showError('Failed to refresh customers');
        }
    }

    // Cleanup method for performance
    cleanup() {
        console.log('Cleaning up customers module...');
        this.removeEventListeners();
        
        // Clear any intervals or timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Reset state
        this.editingCustomer = null;
        this.customers = [];
        this.filteredCustomers = [];
        this.eventHandlers = {};
    }
}

// Register the module (prevent duplicate registration)
if (typeof window !== 'undefined') {
    window.CustomersModule = CustomersModule;
}

const customersModule = new CustomersModule();
if (typeof app !== 'undefined') {
    app.registerModule('customers', customersModule);
} else {
    // Wait for app to be available
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof app !== 'undefined') {
            app.registerModule('customers', customersModule);
        }
    });
}

})(); // End IIFE