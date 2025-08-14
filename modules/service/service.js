const { allQuery, getQuery, runQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Service {
    constructor() {
        this.services = [];
        this.filteredServices = [];
        this.searchTerm = '';
        this.sortField = 'service_date';
        this.sortDirection = 'desc';
        this.currentService = null;
        this.brands = new Set();
        this.currentCustomer = null;
        this.currentCustomerInstant = null;
        
        this.serviceCategories = ['Watch', 'WallClock', 'Timepiece', 'Strap', 'Spring Bar', 'Loop', 'Buckle'];
        this.serviceStatus = [
            'Yet to Start', 'Delivered', 'In Service Center', 'Yet to Send Parrys',
            'In Parrys', 'To Return to Customer', 'Service Completed', 'Waiting for Customer to Pickup'
        ];
        this.locations = ['Semmancheri', 'Navalur', 'Padur'];
        this.caseMaterials = ['Steel', 'Gold Tone', 'Fiber'];
        this.strapMaterials = ['Leather', 'Fiber', 'Steel', 'Gold Plated'];
        this.instantIssueTypes = ['Battery Change', 'Link Removal / Addition', 'Other'];
    }

    async render() {
        return `
            <div class="service-container">
                <!-- Service Type Selection -->
                <div class="service-types">
                    <div class="service-type-card" onclick="service.showNewServiceForm()">
                        <h5>🔧 New Service</h5>
                        <p>Complete service with acknowledgment and tracking</p>
                    </div>
                    <div class="service-type-card" onclick="service.showInstantServiceForm()">
                        <h5>⚡ Instant Service</h5>
                        <p>Quick service like battery change, completed immediately</p>
                    </div>
                </div>

                <!-- Search and Filter Bar -->
                <div class="search-filter-bar">
                    <div class="search-box">
                        <input type="text" id="service-search" placeholder="Search services..." 
                               oninput="service.handleSearch(this.value)">
                    </div>
                    <div class="filter-group">
                        <select id="status-filter" onchange="service.applyFilters()">
                            <option value="">All Status</option>
                            ${this.serviceStatus.map(status => 
                                `<option value="${status}">${status}</option>`
                            ).join('')}
                        </select>
                        <select id="service-type-filter" onchange="service.applyFilters()">
                            <option value="">All Types</option>
                            <option value="new">New Service</option>
                            <option value="instant">Instant Service</option>
                        </select>
                        <input type="date" id="date-from" onchange="service.applyFilters()" title="From Date">
                        <input type="date" id="date-to" onchange="service.applyFilters()" title="To Date">
                        <select id="sort-field" onchange="service.handleSort()">
                            <option value="service_date">Sort by Date</option>
                            <option value="customer_name">Sort by Customer</option>
                            <option value="status">Sort by Status</option>
                            <option value="total_amount">Sort by Amount</option>
                        </select>
                        <select id="sort-direction" onchange="service.handleSort()">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                </div>

                <!-- Services List -->
                <div class="table-container">
                    <table class="table" id="services-table">
                        <thead>
                            <tr>
                                <th onclick="service.sortBy('service_date')">S.No</th>
                                <th onclick="service.sortBy('acknowledgement_number')">Service #</th>
                                <th onclick="service.sortBy('customer_name')">Customer</th>
                                <th onclick="service.sortBy('service_type')">Type</th>
                                <th onclick="service.sortBy('service_date')">Service Date</th>
                                <th onclick="service.sortBy('status')">Status</th>
                                <th onclick="service.sortBy('total_amount')">Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="services-tbody">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading services...</div>
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
            await this.loadServices();
            await this.loadBrands();
            this.updateServicesTable();
        } catch (error) {
            console.error('Service module initialization error:', error);
            window.app.showMessage('Failed to load services', 'error');
        }
    }

    async loadServices() {
        try {
            this.services = await allQuery(`
                SELECT s.*, c.name as customer_name, c.mobile_number
                FROM services s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                ORDER BY s.service_date DESC, s.created_at DESC
            `);
            
            this.filteredServices = [...this.services];
        } catch (error) {
            console.error('Error loading services:', error);
            this.services = [];
            this.filteredServices = [];
            throw error;
        }
    }

    async loadBrands() {
        try {
            const brands = await allQuery(`
                SELECT DISTINCT brand FROM services 
                WHERE brand IS NOT NULL AND brand != ''
                UNION
                SELECT DISTINCT brand FROM inventory 
                WHERE brand IS NOT NULL AND brand != '' AND is_active = 1
                ORDER BY brand
            `);
            
            this.brands = new Set(brands.map(b => b.brand));
        } catch (error) {
            console.error('Error loading brands:', error);
            this.brands = new Set();
        }
    }

    updateServicesTable() {
        const tbody = document.getElementById('services-tbody');
        if (!tbody) return;

        if (this.filteredServices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center p-4">
                        ${this.searchTerm ? 'No services found matching your search' : 'No services found'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.filteredServices.forEach((serviceItem, index) => {
            const statusClass = this.getServiceStatusClass(serviceItem.status);
            const serviceNumber = serviceItem.acknowledgement_number || serviceItem.invoice_number || serviceItem.id;
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${serviceNumber}</strong></td>
                    <td>
                        <div><strong>${serviceItem.customer_name || 'Unknown'}</strong></div>
                        <small>${serviceItem.mobile_number || ''}</small>
                    </td>
                    <td>${Utils.capitalize(serviceItem.service_type)}</td>
                    <td>${Utils.formatDate(serviceItem.service_date)}</td>
                    <td><span class="status-badge ${statusClass}">${serviceItem.status}</span></td>
                    <td>${Utils.formatCurrency(serviceItem.total_amount)}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="service.viewServiceDetails('${serviceItem.id}')" title="View Details">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="service.updateServiceStatus('${serviceItem.id}')" title="Update Status">
                            📝
                        </button>
                        ${serviceItem.service_type === 'new' && serviceItem.acknowledgement_number ? 
                            `<button class="btn btn-sm btn-secondary" onclick="service.printAcknowledgement('${serviceItem.acknowledgement_number}')" title="Print Acknowledgement">🖨️</button>` : ''
                        }
                        ${serviceItem.invoice_number ? 
                            `<button class="btn btn-sm btn-success" onclick="service.printInvoice('${serviceItem.invoice_number}')" title="Print Invoice">📄</button>` : ''
                        }
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    getServiceStatusClass(status) {
        const statusClasses = {
            'Yet to Start': 'status-pending',
            'In Service Center': 'status-in-progress',
            'Yet to Send Parrys': 'status-warning',
            'In Parrys': 'status-warning',
            'To Return to Customer': 'status-info',
            'Waiting for Customer to Pickup': 'status-info',
            'Service Completed': 'status-success',
            'Delivered': 'status-success'
        };
        return statusClasses[status] || 'status-default';
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
        
        document.getElementById('sort-field').value = this.sortField;
        document.getElementById('sort-direction').value = this.sortDirection;
        
        this.applyFilters();
    }

    applyFilters() {
        const statusFilter = document.getElementById('status-filter')?.value || '';
        const typeFilter = document.getElementById('service-type-filter')?.value || '';
        const dateFrom = document.getElementById('date-from')?.value;
        const dateTo = document.getElementById('date-to')?.value;
        
        // Apply filters
        this.filteredServices = this.services.filter(serviceItem => {
            // Search filter
            if (this.searchTerm) {
                const searchableText = `${serviceItem.acknowledgement_number || ''} ${serviceItem.invoice_number || ''} ${serviceItem.customer_name || ''} ${serviceItem.brand || ''} ${serviceItem.particulars || ''}`.toLowerCase();
                if (!searchableText.includes(this.searchTerm)) {
                    return false;
                }
            }
            
            // Status filter
            if (statusFilter && serviceItem.status !== statusFilter) {
                return false;
            }
            
            // Type filter
            if (typeFilter && serviceItem.service_type !== typeFilter) {
                return false;
            }
            
            // Date filters
            const serviceDate = new Date(serviceItem.service_date).toISOString().split('T')[0];
            if (dateFrom && serviceDate < dateFrom) return false;
            if (dateTo && serviceDate > dateTo) return false;
            
            return true;
        });

        // Apply sorting
        this.filteredServices.sort((a, b) => {
            let aVal = a[this.sortField];
            let bVal = b[this.sortField];

            if (this.sortField === 'service_date') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (this.sortField === 'total_amount') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (typeof aVal === 'string') {
                aVal = (aVal || '').toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (this.sortDirection === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });

        this.updateServicesTable();
    }

    showNewServiceForm() {
        this.currentCustomer = null;
        
        const content = `
            <form id="new-service-form" class="service-form">
                <!-- Customer Section -->
                <div class="form-section">
                    <h4>Customer Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-search">Customer</label>
                            <input type="text" id="customer-search" placeholder="Search customer..." 
                                   oninput="service.searchCustomers(this.value)">
                            <div id="customer-suggestions" class="suggestions-dropdown"></div>
                        </div>
                        <div class="form-group">
                            <label for="service-date">Service Date</label>
                            <input type="date" id="service-date" name="service_date" value="${Utils.getCurrentDate()}">
                        </div>
                    </div>
                    <div id="selected-customer" class="selected-customer hidden">
                        <div class="customer-info">
                            <strong id="customer-name"></strong>
                            <span id="customer-id"></span>
                            <span id="customer-mobile"></span>
                        </div>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="service.clearCustomer()">Change</button>
                    </div>
                </div>

                <!-- Watch Details -->
                <div class="form-section">
                    <h4>Watch Details</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="service-category">Category</label>
                            <select id="service-category" name="category">
                                <option value="">Select Category</option>
                                ${this.serviceCategories.map(cat => 
                                    `<option value="${cat}">${cat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="service-brand">Brand</label>
                            <input type="text" id="service-brand" name="brand" list="service-brands-list" placeholder="Enter brand">
                            <datalist id="service-brands-list">
                                ${Array.from(this.brands).map(brand => 
                                    `<option value="${brand}">`
                                ).join('')}
                            </datalist>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="dial-colour">Dial Colour</label>
                            <input type="text" id="dial-colour" name="dial_colour" placeholder="e.g., Black, White, Blue">
                        </div>
                        <div class="form-group">
                            <label for="service-gender">Gender</label>
                            <select id="service-gender" name="gender">
                                <option value="">Select Gender</option>
                                <option value="Gents">Gents</option>
                                <option value="Ladies">Ladies</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="movement-no">Movement No</label>
                            <input type="text" id="movement-no" name="movement_no" placeholder="Enter movement number">
                        </div>
                        <div class="form-group">
                            <label for="case-material">Case</label>
                            <select id="case-material" name="case_material">
                                <option value="">Select Case Material</option>
                                ${this.caseMaterials.map(material => 
                                    `<option value="${material}">${material}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="service-strap">Strap</label>
                            <select id="service-strap" name="strap">
                                <option value="">Select Strap Material</option>
                                ${this.strapMaterials.map(material => 
                                    `<option value="${material}">${material}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="warranty-period">Warranty Period (Months)</label>
                            <input type="number" id="warranty-period" name="warranty_period" value="0" min="0">
                        </div>
                    </div>
                </div>

                <!-- Service Details -->
                <div class="form-section">
                    <h4>Service Details</h4>
                    <div class="form-group">
                        <label for="service-particulars">Particulars (Problems to fix)</label>
                        <textarea id="service-particulars" name="particulars" rows="3" 
                                  placeholder="Describe the problems or issues..."></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="service-amount">Service Amount (₹)</label>
                            <input type="number" id="service-amount" name="total_amount" step="0.01" min="0" required onchange="service.validateServiceForm()">
                        </div>
                        <div class="form-group">
                            <label for="advance-amount">Advance Amount</label>
                            <input type="number" id="advance-amount" name="advance_amount" step="0.01" min="0" value="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="payment-mode">Payment Mode</label>
                            <select id="payment-mode" name="payment_mode">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Multiple Payment Modes">Multiple Payment Modes</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="service-image">Image (Optional)</label>
                            <input type="file" id="service-image" accept="image/*" onchange="service.handleImageUpload(this)">
                        </div>
                    </div>
                </div>
            </form>
        `;

        window.app.showModal('New Service', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="service.showServiceConfirmation('new')" id="confirm-service-btn" disabled>Create Service</button>
        `, 'large-modal');
    }

    showInstantServiceForm() {
        this.currentCustomerInstant = null;
        
        const content = `
            <form id="instant-service-form" class="service-form">
                <!-- Customer Section -->
                <div class="form-section">
                    <h4>Customer Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-search-instant">Customer</label>
                            <input type="text" id="customer-search-instant" placeholder="Search customer..." 
                                   oninput="service.searchCustomersInstant(this.value)">
                            <div id="customer-suggestions-instant" class="suggestions-dropdown"></div>
                        </div>
                        <div class="form-group">
                            <label for="instant-brand">Brand</label>
                            <input type="text" id="instant-brand" name="brand" list="instant-brands-list" placeholder="Enter brand">
                            <datalist id="instant-brands-list">
                                ${Array.from(this.brands).map(brand => 
                                    `<option value="${brand}">`
                                ).join('')}
                            </datalist>
                        </div>
                    </div>
                    <div id="selected-customer-instant" class="selected-customer hidden">
                        <div class="customer-info">
                            <strong id="customer-name-instant"></strong>
                            <span id="customer-id-instant"></span>
                            <span id="customer-mobile-instant"></span>
                        </div>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="service.clearCustomerInstant()">Change</button>
                    </div>
                </div>

                <!-- Service Details -->
                <div class="form-section">
                    <h4>Service Details</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="instant-service-date">Service Date</label>
                            <input type="date" id="instant-service-date" name="service_date" value="${Utils.getCurrentDate()}">
                        </div>
                        <div class="form-group">
                            <label for="instant-delivery-date">Delivery Date</label>
                            <input type="date" id="instant-delivery-date" name="delivery_date" value="${Utils.getCurrentDate()}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="issue-type">Issue Type</label>
                            <select id="issue-type" name="issue_type" onchange="service.handleIssueTypeChange(this.value)">
                                <option value="">Select Issue Type</option>
                                ${this.instantIssueTypes.map(type => 
                                    `<option value="${type}">${type}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group" id="other-issue-group" style="display: none;">
                            <label for="other-issue">Other Issue</label>
                            <input type="text" id="other-issue" placeholder="Specify the issue">
                        </div>
                    </div>
                    <div class="form-group" id="inventory-used-group" style="display: none;">
                        <label for="inventory-used">Battery Used (From Inventory)</label>
                        <input type="text" id="inventory-used" placeholder="Search inventory by code..." 
                               oninput="service.searchInventoryForBattery(this.value)">
                        <div id="battery-suggestions" class="suggestions-dropdown"></div>
                    </div>
                    <div class="form-group">
                        <label for="instant-particulars">Particulars</label>
                        <textarea id="instant-particulars" name="particulars" rows="3" 
                                  placeholder="Additional details about the service..."></textarea>
                    </div>
                </div>

                <!-- Pricing -->
                <div class="form-section">
                    <h4>Pricing</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="instant-amount">Service Amount (₹)</label>
                            <input type="number" id="instant-amount" name="total_amount" step="0.01" min="0" required onchange="service.validateInstantServiceForm()">
                        </div>
                        <div class="form-group">
                            <label for="instant-advance">Advance Amount</label>
                            <input type="number" id="instant-advance" name="advance_amount" step="0.01" min="0" value="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="instant-payment-mode">Payment Mode</label>
                            <select id="instant-payment-mode" name="payment_mode">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Multiple Payment Modes">Multiple Payment Modes</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="instant-warranty">Warranty Period (Months)</label>
                            <input type="number" id="instant-warranty" name="warranty_period" value="0" min="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="instant-image">Image (Optional)</label>
                        <input type="file" id="instant-image" accept="image/*" onchange="service.handleImageUploadInstant(this)">
                    </div>
                </div>
            </form>
        `;

        window.app.showModal('Instant Service', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="service.showServiceConfirmation('instant')" id="confirm-instant-btn" disabled>Complete Service</button>
        `, 'large-modal');
    }

    async searchCustomers(searchTerm) {
        const suggestionsDiv = document.getElementById('customer-suggestions');
        if (!suggestionsDiv) return;

        if (searchTerm.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.remove('show');
            return;
        }

        try {
            const customers = await allQuery(`
                SELECT * FROM customers 
                WHERE name LIKE ? OR customer_id LIKE ? OR mobile_number LIKE ?
                ORDER BY name
                LIMIT 10
            `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);

            this.showCustomerSuggestions(customers, 'customer-suggestions', 'selectCustomer');
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }

    async searchCustomersInstant(searchTerm) {
        const suggestionsDiv = document.getElementById('customer-suggestions-instant');
        if (!suggestionsDiv) return;

        if (searchTerm.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.remove('show');
            return;
        }

        try {
            const customers = await allQuery(`
                SELECT * FROM customers 
                WHERE name LIKE ? OR customer_id LIKE ? OR mobile_number LIKE ?
                ORDER BY name
                LIMIT 10
            `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);

            this.showCustomerSuggestions(customers, 'customer-suggestions-instant', 'selectCustomerInstant');
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }

    showCustomerSuggestions(customers, containerId, selectFunction) {
        const suggestionsDiv = document.getElementById(containerId);
        if (!suggestionsDiv) return;

        if (customers.length === 0) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item">No customers found</div>';
        } else {
            let html = '';
            customers.forEach(customer => {
                html += `
                    <div class="suggestion-item" onclick="service.${selectFunction}('${customer.id}')">
                        <div><strong>${customer.name}</strong> - ${customer.customer_id}</div>
                        <small>${customer.mobile_number}</small>
                    </div>
                `;
            });
            suggestionsDiv.innerHTML = html;
        }
        
        suggestionsDiv.classList.add('show');
    }

    async selectCustomer(customerId) {
        try {
            const customer = await getQuery('SELECT * FROM customers WHERE id = ?', [customerId]);
            if (!customer) return;

            this.currentCustomer = customer;
            
            document.getElementById('customer-search').value = '';
            document.getElementById('customer-suggestions').classList.remove('show');
            
            document.getElementById('customer-name').textContent = customer.name;
            document.getElementById('customer-id').textContent = customer.customer_id;
            document.getElementById('customer-mobile').textContent = customer.mobile_number;
            
            document.getElementById('selected-customer').classList.remove('hidden');
            this.validateServiceForm();
        } catch (error) {
            console.error('Error selecting customer:', error);
        }
    }

    async selectCustomerInstant(customerId) {
        try {
            const customer = await getQuery('SELECT * FROM customers WHERE id = ?', [customerId]);
            if (!customer) return;

            this.currentCustomerInstant = customer;
            
            document.getElementById('customer-search-instant').value = '';
            document.getElementById('customer-suggestions-instant').classList.remove('show');
            
            document.getElementById('customer-name-instant').textContent = customer.name;
            document.getElementById('customer-id-instant').textContent = customer.customer_id;
            document.getElementById('customer-mobile-instant').textContent = customer.mobile_number;
            
            document.getElementById('selected-customer-instant').classList.remove('hidden');
            this.validateInstantServiceForm();
        } catch (error) {
            console.error('Error selecting customer:', error);
        }
    }

    clearCustomer() {
        this.currentCustomer = null;
        document.getElementById('selected-customer').classList.add('hidden');
        document.getElementById('customer-search').value = '';
        this.validateServiceForm();
    }

    clearCustomerInstant() {
        this.currentCustomerInstant = null;
        document.getElementById('selected-customer-instant').classList.add('hidden');
        document.getElementById('customer-search-instant').value = '';
        this.validateInstantServiceForm();
    }

    handleIssueTypeChange(issueType) {
        const otherGroup = document.getElementById('other-issue-group');
        const inventoryGroup = document.getElementById('inventory-used-group');
        
        if (issueType === 'Other') {
            otherGroup.style.display = 'block';
            inventoryGroup.style.display = 'none';
        } else if (issueType === 'Battery Change') {
            otherGroup.style.display = 'none';
            inventoryGroup.style.display = 'block';
        } else {
            otherGroup.style.display = 'none';
            inventoryGroup.style.display = 'none';
        }
        
        this.validateInstantServiceForm();
    }

    async searchInventoryForBattery(searchTerm) {
        const suggestionsDiv = document.getElementById('battery-suggestions');
        if (!suggestionsDiv) return;

        if (searchTerm.length < 1) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.remove('show');
            return;
        }

        try {
            const items = await allQuery(`
                SELECT * FROM inventory 
                WHERE (code LIKE ? OR particulars LIKE ?) AND is_active = 1
                ORDER BY code
                LIMIT 10
            `, [`%${searchTerm}%`, `%battery%`]);

            if (items.length === 0) {
                suggestionsDiv.innerHTML = '<div class="suggestion-item">No items found</div>';
            } else {
                let html = '';
                items.forEach(item => {
                    html += `
                        <div class="suggestion-item" onclick="service.selectBattery('${item.code}', '${item.particulars}')">
                            <div><strong>${item.code}</strong></div>
                            <small>${item.particulars} - ${Utils.formatCurrency(item.amount)}</small>
                        </div>
                    `;
                });
                suggestionsDiv.innerHTML = html;
            }
            
            suggestionsDiv.classList.add('show');
        } catch (error) {
            console.error('Error searching inventory:', error);
        }
    }

    selectBattery(code, particulars) {
        document.getElementById('inventory-used').value = `${code} - ${particulars}`;
        document.getElementById('battery-suggestions').classList.remove('show');
    }

    handleImageUpload(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            if (file.size > maxSize) {
                window.app.showMessage('Image size should be less than 5MB', 'error');
                input.value = '';
                return;
            }
            
            this.serviceImage = file;
        }
    }

    handleImageUploadInstant(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            if (file.size > maxSize) {
                window.app.showMessage('Image size should be less than 5MB', 'error');
                input.value = '';
                return;
            }
            
            this.instantServiceImage = file;
        }
    }

    validateServiceForm() {
        const isValid = this.currentCustomer && 
                       document.getElementById('service-amount')?.value && 
                       parseFloat(document.getElementById('service-amount')?.value) > 0;
        const confirmBtn = document.getElementById('confirm-service-btn');
        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
        }
    }

    validateInstantServiceForm() {
        const isValid = this.currentCustomerInstant && 
                       document.getElementById('instant-amount')?.value && 
                       parseFloat(document.getElementById('instant-amount')?.value) > 0 &&
                       document.getElementById('issue-type')?.value;
        const confirmBtn = document.getElementById('confirm-instant-btn');
        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
        }
    }

    showServiceConfirmation(serviceType) {
        if (serviceType === 'new') {
            this.showNewServiceConfirmation();
        } else {
            this.showInstantServiceConfirmation();
        }
    }

    showNewServiceConfirmation() {
        if (!this.currentCustomer) {
            window.app.showMessage('Please select a customer', 'error');
            return;
        }

        const formData = Utils.getFormData(document.getElementById('new-service-form'));
        
        if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
            window.app.showMessage('Please enter a valid service amount', 'error');
            return;
        }

        const totalAmount = parseFloat(formData.total_amount);
        const advanceAmount = parseFloat(formData.advance_amount) || 0;
        const balanceAmount = totalAmount - advanceAmount;

        const content = `
            <div class="service-confirmation">
                <h4>Customer: ${this.currentCustomer.name} (${this.currentCustomer.customer_id})</h4>
                <h5>Service Date: ${Utils.formatDate(formData.service_date)}</h5>
                
                <div class="confirmation-details">
                    <div><strong>Category:</strong> ${formData.category || 'N/A'}</div>
                    <div><strong>Brand:</strong> ${formData.brand || 'N/A'}</div>
                    <div><strong>Problems:</strong> ${formData.particulars || 'N/A'}</div>
                    <div><strong>Total Amount:</strong> ${Utils.formatCurrency(totalAmount)}</div>
                    <div><strong>Advance:</strong> ${Utils.formatCurrency(advanceAmount)}</div>
                    <div><strong>Balance:</strong> ${Utils.formatCurrency(balanceAmount)}</div>
                    <div><strong>Payment Mode:</strong> ${formData.payment_mode}</div>
                    <div><strong>Warranty:</strong> ${formData.warranty_period} months</div>
                </div>
            </div>
        `;

        window.app.showModal('Confirm New Service', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Edit</button>
            <button class="btn btn-primary" onclick="service.processNewService()">Confirm & Create Acknowledgment</button>
        `);
    }

    showInstantServiceConfirmation() {
        if (!this.currentCustomerInstant) {
            window.app.showMessage('Please select a customer', 'error');
            return;
        }

        const formData = Utils.getFormData(document.getElementById('instant-service-form'));
        
        if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
            window.app.showMessage('Please enter a valid service amount', 'error');
            return;
        }

        if (!formData.issue_type) {
            window.app.showMessage('Please select an issue type', 'error');
            return;
        }

        const totalAmount = parseFloat(formData.total_amount);
        const advanceAmount = parseFloat(formData.advance_amount) || 0;
        const balanceAmount = totalAmount - advanceAmount;

        let issueDisplay = formData.issue_type;
        if (formData.issue_type === 'Other') {
            issueDisplay = document.getElementById('other-issue')?.value || 'Other';
        }

        const content = `
            <div class="service-confirmation">
                <h4>Customer: ${this.currentCustomerInstant.name} (${this.currentCustomerInstant.customer_id})</h4>
                <h5>Service Date: ${Utils.formatDate(formData.service_date)}</h5>
                <h5>Delivery Date: ${Utils.formatDate(formData.delivery_date)}</h5>
                
                <div class="confirmation-details">
                    <div><strong>Brand:</strong> ${formData.brand || 'N/A'}</div>
                    <div><strong>Issue Type:</strong> ${issueDisplay}</div>
                    <div><strong>Particulars:</strong> ${formData.particulars || 'N/A'}</div>
                    <div><strong>Total Amount:</strong> ${Utils.formatCurrency(totalAmount)}</div>
                    <div><strong>Advance:</strong> ${Utils.formatCurrency(advanceAmount)}</div>
                    <div><strong>Balance:</strong> ${Utils.formatCurrency(balanceAmount)}</div>
                    <div><strong>Payment Mode:</strong> ${formData.payment_mode}</div>
                    <div><strong>Warranty:</strong> ${formData.warranty_period} months</div>
                </div>
            </div>
        `;

        window.app.showModal('Confirm Instant Service', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Edit</button>
            <button class="btn btn-primary" onclick="service.processInstantService()">Complete Service & Generate Invoice</button>
        `);
    }

    async processNewService() {
        try {
            const formData = Utils.getFormData(document.getElementById('new-service-form'));
            const totalAmount = parseFloat(formData.total_amount);
            const advanceAmount = parseFloat(formData.advance_amount) || 0;
            const balanceAmount = totalAmount - advanceAmount;

            // Generate acknowledgment number
            const ackNumber = Utils.generateAckNumber(formData.category);

            // Calculate warranty expiry
            const warrantyPeriod = parseInt(formData.warranty_period) || 0;
            const warrantyExpiry = warrantyPeriod > 0 ? 
                new Date(new Date(formData.service_date).setMonth(new Date(formData.service_date).getMonth() + warrantyPeriod)).toISOString().split('T')[0] : 
                null;

            // Create service record
            const serviceResult = await runQuery(`
                INSERT INTO services (customer_id, service_type, service_date, acknowledgement_number,
                                    category, brand, dial_colour, gender, movement_no, case_material, strap,
                                    particulars, advance_amount, balance_amount, total_amount, payment_mode,
                                    warranty_period, warranty_expiry_date, status, location, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                this.currentCustomer.customer_id, 'new', formData.service_date, ackNumber,
                formData.category, formData.brand, formData.dial_colour, formData.gender,
                formData.movement_no, formData.case_material, formData.strap, formData.particulars,
                advanceAmount, balanceAmount, totalAmount, formData.payment_mode,
                warrantyPeriod, warrantyExpiry, 'Yet to Start', 'Semmancheri', Utils.getCurrentUser()
            ]);

            // Log the service creation
            await auditLogger.logCreate('SERVICE', serviceResult.id, {
                acknowledgement_number: ackNumber,
                customer_id: this.currentCustomer.customer_id,
                service_type: 'new',
                total_amount: totalAmount
            });

            // Close modals and show success
            document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
            window.app.showMessage(`Service created! Acknowledgment: ${ackNumber}`, 'success');
            
            // Refresh services list
            await this.loadServices();
            this.updateServicesTable();
            
            // Reset form
            this.currentCustomer = null;

        } catch (error) {
            console.error('Error processing new service:', error);
            window.app.showMessage('Failed to create service', 'error');
        }
    }

    async processInstantService() {
        try {
            const formData = Utils.getFormData(document.getElementById('instant-service-form'));
            const totalAmount = parseFloat(formData.total_amount);
            const advanceAmount = parseFloat(formData.advance_amount) || 0;
            const balanceAmount = totalAmount - advanceAmount;

            // Generate invoice number
            const invoiceNumber = Utils.generateInvoiceNumber('SR', 'Service');

            // Get issue type display value
            let issueType = formData.issue_type;
            if (formData.issue_type === 'Other') {
                issueType = document.getElementById('other-issue')?.value || 'Other';
            }

            // Get inventory used
            const inventoryUsed = document.getElementById('inventory-used')?.value || null;

            // Calculate warranty expiry
            const warrantyPeriod = parseInt(formData.warranty_period) || 0;
            const warrantyExpiry = warrantyPeriod > 0 ? 
                new Date(new Date(formData.delivery_date).setMonth(new Date(formData.delivery_date).getMonth() + warrantyPeriod)).toISOString().split('T')[0] : 
                null;

            // Create service record
            const serviceResult = await runQuery(`
                INSERT INTO services (customer_id, service_type, service_date, delivery_date, invoice_number,
                                    brand, issue_type, particulars, advance_amount, balance_amount, total_amount,
                                    payment_mode, warranty_period, warranty_expiry_date, inventory_used,
                                    status, location, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                this.currentCustomerInstant.customer_id, 'instant', formData.service_date, formData.delivery_date,
                invoiceNumber, formData.brand, issueType, formData.particulars, advanceAmount, balanceAmount,
                totalAmount, formData.payment_mode, warrantyPeriod, warrantyExpiry, inventoryUsed,
                'Service Completed', 'Semmancheri', Utils.getCurrentUser()
            ]);

            // Update customer net value
            await runQuery(`
                UPDATE customers 
                SET net_value = net_value + ?, updated_at = CURRENT_TIMESTAMP 
                WHERE customer_id = ?
            `, [totalAmount, this.currentCustomerInstant.customer_id]);

            // Log the service completion
            await auditLogger.logCreate('SERVICE', serviceResult.id, {
                invoice_number: invoiceNumber,
                customer_id: this.currentCustomerInstant.customer_id,
                service_type: 'instant',
                total_amount: totalAmount,
                issue_type: issueType
            });

            // Close modals and show success
            document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
            window.app.showMessage(`Instant service completed! Invoice: ${invoiceNumber}`, 'success');
            
            // Refresh services list
            await this.loadServices();
            this.updateServicesTable();
            
            // Reset form
            this.currentCustomerInstant = null;

        } catch (error) {
            console.error('Error processing instant service:', error);
            window.app.showMessage('Failed to complete instant service', 'error');
        }
    }

    async newService(customerId = null) {
        if (customerId) {
            const customer = await getQuery('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
            if (customer) {
                this.currentCustomer = customer;
            }
        }
        this.showNewServiceForm();
        
        // If customer is pre-selected, update the UI
        if (this.currentCustomer) {
            setTimeout(() => {
                this.selectCustomer(this.currentCustomer.id);
            }, 100);
        }
    }

    async newInstantService(customerId = null) {
        if (customerId) {
            const customer = await getQuery('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
            if (customer) {
                this.currentCustomerInstant = customer;
            }
        }
        this.showInstantServiceForm();
        
        // If customer is pre-selected, update the UI
        if (this.currentCustomerInstant) {
            setTimeout(() => {
                this.selectCustomerInstant(this.currentCustomerInstant.id);
            }, 100);
        }
    }

    async viewServiceDetails(serviceId) {
        try {
            const service = await getQuery(`
                SELECT s.*, c.name as customer_name, c.mobile_number, c.customer_id
                FROM services s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.id = ?
            `, [serviceId]);

            if (!service) {
                window.app.showMessage('Service not found', 'error');
                return;
            }

            const serviceNumber = service.acknowledgement_number || service.invoice_number || service.id;
            
            let content = `
                <div class="service-details">
                    <div class="detail-row">
                        <strong>Service Number:</strong> ${serviceNumber}
                    </div>
                    <div class="detail-row">
                        <strong>Customer:</strong> ${service.customer_name} (${service.customer_id})
                    </div>
                    <div class="detail-row">
                        <strong>Mobile:</strong> ${service.mobile_number}
                    </div>
                    <div class="detail-row">
                        <strong>Service Type:</strong> ${Utils.capitalize(service.service_type)}
                    </div>
                    <div class="detail-row">
                        <strong>Service Date:</strong> ${Utils.formatDate(service.service_date)}
                    </div>
                    <div class="detail-row">
                        <strong>Status:</strong> <span class="status-badge ${this.getServiceStatusClass(service.status)}">${service.status}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Total Amount:</strong> ${Utils.formatCurrency(service.total_amount)}
                    </div>
                    ${service.brand ? `<div class="detail-row"><strong>Brand:</strong> ${service.brand}</div>` : ''}
                    ${service.category ? `<div class="detail-row"><strong>Category:</strong> ${service.category}</div>` : ''}
                    ${service.issue_type ? `<div class="detail-row"><strong>Issue Type:</strong> ${service.issue_type}</div>` : ''}
                    ${service.particulars ? `<div class="detail-row"><strong>Particulars:</strong> ${service.particulars}</div>` : ''}
                    ${service.warranty_period > 0 ? `<div class="detail-row"><strong>Warranty:</strong> ${service.warranty_period} months</div>` : ''}
                    ${service.inventory_used ? `<div class="detail-row"><strong>Items Used:</strong> ${service.inventory_used}</div>` : ''}
                    <div class="detail-row">
                        <strong>Location:</strong> ${service.location}
                    </div>
                </div>
            `;

            window.app.showModal(`Service Details: ${serviceNumber}`, content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-warning" onclick="service.updateServiceStatus('${service.id}')">Update Status</button>
            `);

        } catch (error) {
            console.error('Error viewing service details:', error);
            window.app.showMessage('Failed to load service details', 'error');
        }
    }

    async updateServiceStatus(serviceId) {
        try {
            const service = await getQuery('SELECT * FROM services WHERE id = ?', [serviceId]);
            
            if (!service) {
                window.app.showMessage('Service not found', 'error');
                return;
            }

            const content = `
                <form id="status-update-form">
                    <div class="form-group">
                        <label for="service-status">Status</label>
                        <select id="service-status" name="status" required>
                            ${this.serviceStatus.map(status => 
                                `<option value="${status}" ${status === service.status ? 'selected' : ''}>${status}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="service-location">Location</label>
                        <select id="service-location" name="location">
                            ${this.locations.map(location => 
                                `<option value="${location}" ${location === service.location ? 'selected' : ''}>${location}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="status-comments">Comments</label>
                        <textarea id="status-comments" name="comments" rows="3" 
                                  placeholder="Add comments about this status change..."></textarea>
                    </div>
                    ${service.service_type === 'new' && !service.invoice_number ? `
                    <div class="form-group" id="delivery-date-group" style="display: none;">
                        <label for="delivery-date">Delivery Date</label>
                        <input type="date" id="delivery-date" name="delivery_date" value="${Utils.getCurrentDate()}">
                    </div>` : ''}
                </form>
            `;

            window.app.showModal('Update Service Status', content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="service.saveStatusUpdate('${serviceId}')">Update Status</button>
            `);

            // Show delivery date field when status is changed to completed/delivered
            const statusSelect = document.getElementById('service-status');
            const deliveryGroup = document.getElementById('delivery-date-group');
            
            if (statusSelect && deliveryGroup) {
                statusSelect.onchange = () => {
                    const selectedStatus = statusSelect.value;
                    if (selectedStatus === 'Service Completed' || selectedStatus === 'Delivered') {
                        deliveryGroup.style.display = 'block';
                    } else {
                        deliveryGroup.style.display = 'none';
                    }
                };
            }

        } catch (error) {
            console.error('Error loading service for status update:', error);
            window.app.showMessage('Failed to load service details', 'error');
        }
    }

    async saveStatusUpdate(serviceId) {
        try {
            const form = document.getElementById('status-update-form');
            const formData = Utils.getFormData(form);

            const service = await getQuery('SELECT * FROM services WHERE id = ?', [serviceId]);
            const oldStatus = service.status;

            // Update service status
            await runQuery(`
                UPDATE services 
                SET status = ?, location = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
                WHERE id = ?
            `, [formData.status, formData.location, Utils.getCurrentUser(), serviceId]);

            // Log status change to history
            if (oldStatus !== formData.status) {
                await auditLogger.logHistory('SERVICE', serviceId, 'status', oldStatus, formData.status, formData.comments);
                await auditLogger.logServiceStatusChange(serviceId, oldStatus, formData.status);
            }

            // If status is changed to "Service Completed" and it's a new service, generate invoice
            if (formData.status === 'Service Completed' && service.service_type === 'new' && !service.invoice_number) {
                const invoiceNumber = Utils.generateInvoiceNumber('SR', service.category);
                const deliveryDate = formData.delivery_date || Utils.getCurrentDate();
                
                await runQuery(`
                    UPDATE services 
                    SET invoice_number = ?, delivery_date = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [invoiceNumber, deliveryDate, serviceId]);

                // Update customer net value
                await runQuery(`
                    UPDATE customers 
                    SET net_value = net_value + ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE customer_id = ?
                `, [service.total_amount, service.customer_id]);

                window.app.showMessage(`Service completed! Invoice generated: ${invoiceNumber}`, 'success');
            } else {
                window.app.showMessage('Service status updated successfully', 'success');
            }

            // Close modal and refresh
            document.querySelector('.modal-overlay').remove();
            await this.loadServices();
            this.updateServicesTable();

        } catch (error) {
            console.error('Error updating service status:', error);
            window.app.showMessage('Failed to update service status', 'error');
        }
    }

    async printAcknowledgement(ackNumber) {
        window.app.showMessage('Acknowledgement printing will be integrated with invoice module', 'info');
    }

    async printInvoice(invoiceNumber) {
        window.app.showMessage('Invoice printing will be integrated with invoice module', 'info');
    }

    async refresh() {
        await this.loadServices();
        await this.loadBrands();
        this.updateServicesTable();
    }
}

// Make service instance available globally for event handlers
window.service = null;

// Export the class
export default Service;

// Set up global service instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'service') {
        window.service = window.app.modules.service;
    }
});