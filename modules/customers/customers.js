const { allQuery, getQuery, runQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Customers {
    constructor() {
        this.customers = [];
        this.filteredCustomers = [];
        this.searchTerm = '';
        this.sortField = 'creation_date';
        this.sortDirection = 'desc';
        this.currentCustomer = null;
    }

    async render() {
        return `
            <div class="customers-container">
                <!-- Search and Filter Bar -->
                <div class="search-filter-bar">
                    <div class="search-box">
                        <input type="text" id="customer-search" placeholder="Search customers..." 
                               oninput="customers.handleSearch(this.value)">
                    </div>
                    <div class="filter-group">
                        <select id="sort-field" onchange="customers.handleSort()">
                            <option value="creation_date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                            <option value="customer_id">Sort by ID</option>
                            <option value="net_value">Sort by Net Value</option>
                        </select>
                        <select id="sort-direction" onchange="customers.handleSort()">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="customers.showNewCustomerForm()">
                        <span>+</span> New Customer
                    </button>
                </div>

                <!-- Customers List -->
                <div class="table-container">
                    <table class="table" id="customers-table">
                        <thead>
                            <tr>
                                <th onclick="customers.sortBy('customer_id')">S.No</th>
                                <th onclick="customers.sortBy('customer_id')">Customer ID</th>
                                <th onclick="customers.sortBy('name')">Name</th>
                                <th onclick="customers.sortBy('mobile_number')">Mobile Number</th>
                                <th onclick="customers.sortBy('creation_date')">Creation Date</th>
                                <th onclick="customers.sortBy('net_value')">Net Value</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customers-tbody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading customers...</div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            await this.loadCustomers();
            this.updateCustomersTable();
        } catch (error) {
            console.error('Customers module initialization error:', error);
            window.app.showMessage('Failed to load customers', 'error');
        }
    }

    async loadCustomers() {
        try {
            this.customers = await allQuery(`
                SELECT 
                    c.*,
                    COALESCE(
                        (SELECT SUM(total_amount) FROM sales WHERE customer_id = c.customer_id AND status = 'completed'), 0
                    ) + 
                    COALESCE(
                        (SELECT SUM(total_amount) FROM services WHERE customer_id = c.customer_id AND status = 'Service Completed'), 0
                    ) as calculated_net_value
                FROM customers c
                ORDER BY c.creation_date DESC
            `);

            // Update net_value in database if different from calculated
            for (const customer of this.customers) {
                if (Math.abs(customer.net_value - customer.calculated_net_value) > 0.01) {
                    await runQuery(
                        'UPDATE customers SET net_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [customer.calculated_net_value, customer.id]
                    );
                    customer.net_value = customer.calculated_net_value;
                }
            }

            this.filteredCustomers = [...this.customers];
        } catch (error) {
            console.error('Error loading customers:', error);
            this.customers = [];
            this.filteredCustomers = [];
            throw error;
        }
    }

    updateCustomersTable() {
        const tbody = document.getElementById('customers-tbody');
        if (!tbody) return;

        if (this.filteredCustomers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-4">
                        ${this.searchTerm ? 'No customers found matching your search' : 'No customers found'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.filteredCustomers.forEach((customer, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${customer.customer_id}</strong></td>
                    <td>${customer.name}</td>
                    <td>${customer.mobile_number}</td>
                    <td>${Utils.formatDate(customer.creation_date)}</td>
                    <td>${Utils.formatCurrency(customer.net_value)}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="customers.editCustomer('${customer.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="customers.deleteCustomer('${customer.id}')" title="Delete">
                            🗑️
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="customers.createSale('${customer.customer_id}')" title="New Sale">
                            💰
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="customers.createService('${customer.customer_id}')" title="New Service">
                            🔧
                        </button>
                        <button class="btn btn-sm btn-success" onclick="customers.createInstantService('${customer.customer_id}')" title="Instant Service">
                            ⚡
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    handleSort() {
        const sortField = document.getElementById('sort-field').value;
        const sortDirection = document.getElementById('sort-direction').value;
        
        this.sortField = sortField;
        this.sortDirection = sortDirection;
        this.applyFilters();
    }

    sortBy(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        // Update UI controls
        document.getElementById('sort-field').value = this.sortField;
        document.getElementById('sort-direction').value = this.sortDirection;
        
        this.applyFilters();
    }

    applyFilters() {
        // Apply search filter
        this.filteredCustomers = this.customers.filter(customer => {
            if (!this.searchTerm) return true;
            
            return (
                customer.name.toLowerCase().includes(this.searchTerm) ||
                customer.customer_id.toLowerCase().includes(this.searchTerm) ||
                customer.mobile_number.toLowerCase().includes(this.searchTerm)
            );
        });

        // Apply sorting
        this.filteredCustomers.sort((a, b) => {
            let aVal = a[this.sortField];
            let bVal = b[this.sortField];

            // Handle different data types
            if (this.sortField === 'creation_date') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (this.sortField === 'net_value') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (this.sortDirection === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });

        this.updateCustomersTable();
    }

    showNewCustomerForm() {
        const content = `
            <form id="customer-form" class="customer-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="customer-id">Customer ID</label>
                        <input type="text" id="customer-id" name="customer_id" 
                               value="${Utils.generateCustomerId()}" maxlength="6">
                        <small>6-digit unique ID (auto-generated, editable)</small>
                    </div>
                    <div class="form-group">
                        <label for="customer-name">Name *</label>
                        <input type="text" id="customer-name" name="name" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="mobile-number">Mobile Number *</label>
                        <input type="tel" id="mobile-number" name="mobile_number" required>
                    </div>
                    <div class="form-group">
                        <label for="creation-date">Creation Date</label>
                        <input type="date" id="creation-date" name="creation_date" 
                               value="${Utils.getCurrentDate()}">
                    </div>
                </div>
            </form>
        `;

        window.app.showModal('New Customer', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="customers.saveCustomer()">Save Customer</button>
        `);

        // Focus on name field
        setTimeout(() => {
            document.getElementById('customer-name').focus();
        }, 100);
    }

    async saveCustomer(isEdit = false) {
        try {
            const form = document.getElementById('customer-form');
            const formData = Utils.getFormData(form);

            // Validation
            if (!formData.name.trim()) {
                window.app.showMessage('Customer name is required', 'error');
                return;
            }

            if (!formData.mobile_number.trim()) {
                window.app.showMessage('Mobile number is required', 'error');
                return;
            }

            if (!Utils.validateMobile(formData.mobile_number)) {
                window.app.showMessage('Please enter a valid mobile number', 'error');
                return;
            }

            // Check for duplicate customer ID (only for new customers)
            if (!isEdit) {
                const existingCustomer = await getQuery(
                    'SELECT id FROM customers WHERE customer_id = ?',
                    [formData.customer_id]
                );

                if (existingCustomer) {
                    window.app.showMessage('Customer ID already exists', 'error');
                    return;
                }
            }

            const customerData = {
                customer_id: formData.customer_id.trim(),
                name: formData.name.trim(),
                mobile_number: formData.mobile_number.trim(),
                creation_date: formData.creation_date || Utils.getCurrentDate(),
                created_by: Utils.getCurrentUser(),
                updated_by: Utils.getCurrentUser()
            };

            let result;
            if (isEdit && this.currentCustomer) {
                // Update existing customer
                result = await runQuery(`
                    UPDATE customers 
                    SET name = ?, mobile_number = ?, creation_date = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    customerData.name,
                    customerData.mobile_number,
                    customerData.creation_date,
                    customerData.updated_by,
                    this.currentCustomer.id
                ]);

                await auditLogger.logUpdate('CUSTOMERS', this.currentCustomer.id, this.currentCustomer, customerData);
                window.app.showMessage('Customer updated successfully', 'success');
            } else {
                // Create new customer
                result = await runQuery(`
                    INSERT INTO customers (customer_id, name, mobile_number, creation_date, created_by, updated_by)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    customerData.customer_id,
                    customerData.name,
                    customerData.mobile_number,
                    customerData.creation_date,
                    customerData.created_by,
                    customerData.updated_by
                ]);

                await auditLogger.logCreate('CUSTOMERS', result.id, customerData);
                window.app.showMessage('Customer created successfully', 'success');
            }

            // Close modal and refresh data
            document.querySelector('.modal-overlay').remove();
            await this.loadCustomers();
            this.updateCustomersTable();

        } catch (error) {
            console.error('Error saving customer:', error);
            window.app.showMessage('Failed to save customer', 'error');
        }
    }

    async editCustomer(customerId) {
        try {
            const customer = await getQuery('SELECT * FROM customers WHERE id = ?', [customerId]);
            
            if (!customer) {
                window.app.showMessage('Customer not found', 'error');
                return;
            }

            this.currentCustomer = customer;

            const content = `
                <form id="customer-form" class="customer-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-id">Customer ID</label>
                            <input type="text" id="customer-id" name="customer_id" 
                                   value="${customer.customer_id}" readonly>
                            <small>Customer ID cannot be changed</small>
                        </div>
                        <div class="form-group">
                            <label for="customer-name">Name *</label>
                            <input type="text" id="customer-name" name="name" 
                                   value="${customer.name}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="mobile-number">Mobile Number *</label>
                            <input type="tel" id="mobile-number" name="mobile_number" 
                                   value="${customer.mobile_number}" required>
                        </div>
                        <div class="form-group">
                            <label for="creation-date">Creation Date</label>
                            <input type="date" id="creation-date" name="creation_date" 
                                   value="${customer.creation_date.split('T')[0]}">
                        </div>
                    </div>
                </form>
            `;

            window.app.showModal('Edit Customer', content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="customers.saveCustomer(true)">Update Customer</button>
            `);

        } catch (error) {
            console.error('Error loading customer for edit:', error);
            window.app.showMessage('Failed to load customer details', 'error');
        }
    }

    async deleteCustomer(customerId) {
        try {
            const customer = await getQuery('SELECT * FROM customers WHERE id = ?', [customerId]);
            
            if (!customer) {
                window.app.showMessage('Customer not found', 'error');
                return;
            }

            // Check if customer has any sales or services
            const salesCount = await getQuery(
                'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
                [customer.customer_id]
            );
            
            const servicesCount = await getQuery(
                'SELECT COUNT(*) as count FROM services WHERE customer_id = ?',
                [customer.customer_id]
            );

            if (salesCount.count > 0 || servicesCount.count > 0) {
                window.app.showMessage(
                    'Cannot delete customer with existing sales or services. Please remove all related records first.',
                    'error'
                );
                return;
            }

            window.app.showConfirm(
                `Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`,
                async () => {
                    try {
                        await runQuery('DELETE FROM customers WHERE id = ?', [customerId]);
                        await auditLogger.logDelete('CUSTOMERS', customerId, customer);
                        
                        window.app.showMessage('Customer deleted successfully', 'success');
                        await this.loadCustomers();
                        this.updateCustomersTable();
                    } catch (error) {
                        console.error('Error deleting customer:', error);
                        window.app.showMessage('Failed to delete customer', 'error');
                    }
                }
            );

        } catch (error) {
            console.error('Error in delete customer:', error);
            window.app.showMessage('Failed to delete customer', 'error');
        }
    }

    async createSale(customerId) {
        await window.app.navigateToSale(customerId);
    }

    async createService(customerId) {
        await window.app.navigateToService(customerId, 'new');
    }

    async createInstantService(customerId) {
        await window.app.navigateToService(customerId, 'instant');
    }

    async showCustomer(customerId) {
        const customer = this.customers.find(c => c.customer_id === customerId);
        if (customer) {
            // Highlight the customer in the table
            const searchBox = document.getElementById('customer-search');
            if (searchBox) {
                searchBox.value = customer.customer_id;
                this.handleSearch(customer.customer_id);
            }
        }
    }

    async search(searchTerm) {
        // For global search integration
        return this.customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.mobile_number.includes(searchTerm)
        ).slice(0, 10); // Limit to 10 results for global search
    }

    async refresh() {
        await this.loadCustomers();
        this.updateCustomersTable();
    }
}

// Make customers instance available globally for event handlers
window.customers = null;

// Export the class
export default Customers;

// Set up global customers instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'customers') {
        window.customers = window.app.modules.customers;
    }
});