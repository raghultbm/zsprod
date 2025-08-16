// Main Customers Module for ZEDSON Watchcraft
class CustomersModule {
    constructor() {
        this.customers = [];
        this.filteredCustomers = [];
        this.currentFilters = {};
        this.currentSort = { field: 'creation_date', direction: 'desc' };
        this.currentPage = 1;
        this.pageSize = 20;
        this.searchTerm = '';
        this.db = new CustomersDB();
        this.form = new CustomersForm();
    }

    async render() {
        const container = document.getElementById('module-container');
        container.innerHTML = this.getHTML();
        
        await this.loadCustomers();
        this.setupEventListeners();
        this.renderCustomersList();
    }

    getHTML() {
        return `
            <div class="customers-module">
                <div class="module-header">
                    <h2 class="module-title">
                        <i class="fas fa-users"></i> Customers Management
                    </h2>
                    <div class="module-actions">
                        <button class="btn btn-primary" id="add-customer-btn">
                            <i class="fas fa-plus"></i> New Customer
                        </button>
                        <button class="btn btn-secondary" id="export-customers-btn">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>

                <!-- Search and Filters -->
                <div class="filters">
                    <div class="filters-row">
                        <div class="filter-group" style="flex: 2;">
                            <label>Search</label>
                            <div class="search-container">
                                <input type="text" id="customer-search" class="search-input" 
                                       placeholder="Search by name, mobile, or customer ID...">
                                <i class="fas fa-search search-icon"></i>
                            </div>
                        </div>
                        <div class="filter-group">
                            <label>Creation Date From</label>
                            <input type="date" id="date-from-filter" class="form-control">
                        </div>
                        <div class="filter-group">
                            <label>Creation Date To</label>
                            <input type="date" id="date-to-filter" class="form-control">
                        </div>
                        <div class="filter-group">
                            <label>Net Value Range</label>
                            <select id="net-value-filter" class="form-control">
                                <option value="">All Customers</option>
                                <option value="0-1000">₹0 - ₹1,000</option>
                                <option value="1000-5000">₹1,000 - ₹5,000</option>
                                <option value="5000-10000">₹5,000 - ₹10,000</option>
                                <option value="10000+">₹10,000+</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>&nbsp;</label>
                            <button class="btn btn-warning" id="clear-filters-btn">
                                <i class="fas fa-times"></i> Clear
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Customers List -->
                <div class="card">
                    <div class="card-header">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>Customers List</span>
                            <div class="pagination-info">
                                <span id="customers-count">0 customers</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <table class="table" id="customers-table">
                                <thead>
                                    <tr>
                                        <th data-sort="row_number">S.No</th>
                                        <th data-sort="customer_id" class="sortable">Customer ID</th>
                                        <th data-sort="name" class="sortable">Name</th>
                                        <th data-sort="mobile_number" class="sortable">Mobile Number</th>
                                        <th data-sort="creation_date" class="sortable">Creation Date</th>
                                        <th data-sort="net_value" class="sortable">Net Value</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="customers-tbody">
                                    <!-- Customer rows will be inserted here -->
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Pagination -->
                        <div class="pagination-container" id="customers-pagination">
                            <!-- Pagination will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add customer button
        document.getElementById('add-customer-btn').addEventListener('click', () => {
            this.showCustomerForm();
        });

        // Export button
        document.getElementById('export-customers-btn').addEventListener('click', () => {
            this.exportCustomers();
        });

        // Search input with debounce
        const searchInput = document.getElementById('customer-search');
        searchInput.addEventListener('input', window.Utils.debounce((e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        }, 300));

        // Filter inputs
        document.getElementById('date-from-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('date-to-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('net-value-filter').addEventListener('change', () => this.applyFilters());

        // Clear filters
        document.getElementById('clear-filters-btn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Table sorting
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                this.sortCustomers(field);
            });
        });
    }

    async loadCustomers() {
        try {
            window.Utils.showLoader();
            this.customers = await this.db.getAllCustomers();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading customers:', error);
            window.Utils.showToast('Failed to load customers', 'error');
        } finally {
            window.Utils.hideLoader();
        }
    }

    applyFilters() {
        this.filteredCustomers = [...this.customers];

        // Search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            this.filteredCustomers = this.filteredCustomers.filter(customer => 
                customer.name.toLowerCase().includes(term) ||
                customer.mobile_number.includes(term) ||
                customer.customer_id.includes(term)
            );
        }

        // Date range filter
        const dateFrom = document.getElementById('date-from-filter').value;
        const dateTo = document.getElementById('date-to-filter').value;
        
        if (dateFrom) {
            this.filteredCustomers = this.filteredCustomers.filter(customer => 
                customer.creation_date >= dateFrom
            );
        }
        
        if (dateTo) {
            this.filteredCustomers = this.filteredCustomers.filter(customer => 
                customer.creation_date <= dateTo
            );
        }

        // Net value filter
        const netValueFilter = document.getElementById('net-value-filter').value;
        if (netValueFilter) {
            this.filteredCustomers = this.filteredCustomers.filter(customer => {
                const netValue = parseFloat(customer.net_value) || 0;
                switch (netValueFilter) {
                    case '0-1000':
                        return netValue >= 0 && netValue <= 1000;
                    case '1000-5000':
                        return netValue > 1000 && netValue <= 5000;
                    case '5000-10000':
                        return netValue > 5000 && netValue <= 10000;
                    case '10000+':
                        return netValue > 10000;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        this.applySorting();
        
        // Reset to first page
        this.currentPage = 1;
        this.renderCustomersList();
    }

    applySorting() {
        this.filteredCustomers.sort((a, b) => {
            let aVal = a[this.currentSort.field];
            let bVal = b[this.currentSort.field];

            // Handle different data types
            if (this.currentSort.field === 'creation_date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (this.currentSort.field === 'net_value') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            let result = 0;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;

            return this.currentSort.direction === 'desc' ? -result : result;
        });
    }

    sortCustomers(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        // Update header classes
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        const currentHeader = document.querySelector(`[data-sort="${field}"]`);
        currentHeader.classList.add(`sort-${this.currentSort.direction}`);

        this.applySorting();
        this.renderCustomersList();
    }

    renderCustomersList() {
        const tbody = document.getElementById('customers-tbody');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredCustomers.length);
        const pageCustomers = this.filteredCustomers.slice(startIndex, endIndex);

        tbody.innerHTML = pageCustomers.map((customer, index) => `
            <tr>
                <td>${startIndex + index + 1}</td>
                <td><strong>${customer.customer_id}</strong></td>
                <td>${customer.name}</td>
                <td>${customer.mobile_number}</td>
                <td>${window.Utils.formatDate(customer.creation_date)}</td>
                <td>${window.Utils.formatCurrency(customer.net_value)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-edit" onclick="window.App.getCurrentModule().editCustomer('${customer.customer_id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="window.App.getCurrentModule().deleteCustomer('${customer.customer_id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn action-btn-view" onclick="window.App.getCurrentModule().triggerSale('${customer.customer_id}')" title="New Sale">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="action-btn action-btn-warning" onclick="window.App.getCurrentModule().triggerService('${customer.customer_id}')" title="New Service">
                            <i class="fas fa-tools"></i>
                        </button>
                        <button class="action-btn action-btn-success" onclick="window.App.getCurrentModule().triggerInstantService('${customer.customer_id}')" title="Instant Service">
                            <i class="fas fa-bolt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.renderPagination();
        this.updateCountDisplay();
    }

    renderPagination() {
        const container = document.getElementById('customers-pagination');
        const totalPages = Math.ceil(this.filteredCustomers.length / this.pageSize);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagination = '<div class="pagination">';
        
        // Previous button
        pagination += `<button ${this.currentPage === 1 ? 'disabled' : ''} 
                       onclick="window.App.getCurrentModule().changePage(${this.currentPage - 1})">
                       <i class="fas fa-chevron-left"></i>
                       </button>`;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            pagination += `<button onclick="window.App.getCurrentModule().changePage(1)">1</button>`;
            if (startPage > 2) {
                pagination += '<span>...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pagination += `<button ${i === this.currentPage ? 'class="active"' : ''} 
                           onclick="window.App.getCurrentModule().changePage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pagination += '<span>...</span>';
            }
            pagination += `<button onclick="window.App.getCurrentModule().changePage(${totalPages})">${totalPages}</button>`;
        }

        // Next button
        pagination += `<button ${this.currentPage === totalPages ? 'disabled' : ''} 
                       onclick="window.App.getCurrentModule().changePage(${this.currentPage + 1})">
                       <i class="fas fa-chevron-right"></i>
                       </button>`;

        pagination += '</div>';
        container.innerHTML = pagination;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderCustomersList();
    }

    updateCountDisplay() {
        const countElement = document.getElementById('customers-count');
        const total = this.filteredCustomers.length;
        const showing = Math.min(this.pageSize, total - (this.currentPage - 1) * this.pageSize);
        
        if (total === this.customers.length) {
            countElement.textContent = `${total} customers`;
        } else {
            countElement.textContent = `${total} of ${this.customers.length} customers`;
        }
    }

    clearFilters() {
        document.getElementById('customer-search').value = '';
        document.getElementById('date-from-filter').value = '';
        document.getElementById('date-to-filter').value = '';
        document.getElementById('net-value-filter').value = '';
        
        this.searchTerm = '';
        this.currentFilters = {};
        this.applyFilters();
    }

    showCustomerForm(customerId = null) {
        this.form.show(customerId, () => {
            this.loadCustomers();
        });
    }

    async editCustomer(customerId) {
        this.showCustomerForm(customerId);
    }

    async deleteCustomer(customerId) {
        if (!window.Auth.hasPermission('customers', 'delete')) {
            window.Utils.showToast('You do not have permission to delete customers', 'error');
            return;
        }

        const customer = this.customers.find(c => c.customer_id === customerId);
        if (!customer) return;

        const confirmed = confirm(`Are you sure you want to delete customer "${customer.name}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;

        try {
            window.Utils.showLoader();
            await this.db.deleteCustomer(customerId);
            await this.loadCustomers();
            window.Utils.showToast('Customer deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting customer:', error);
            window.Utils.showToast('Failed to delete customer', 'error');
        } finally {
            window.Utils.hideLoader();
        }
    }

    triggerSale(customerId) {
        // Navigate to sales module with customer pre-selected
        window.App.navigateTo('sales', { customerId, action: 'new' });
    }

    triggerService(customerId) {
        // Navigate to service module with customer pre-selected
        window.App.navigateTo('service', { customerId, action: 'new' });
    }

    triggerInstantService(customerId) {
        // Navigate to service module with customer pre-selected for instant service
        window.App.navigateTo('service', { customerId, action: 'instant' });
    }

    async exportCustomers() {
        try {
            const dataToExport = this.filteredCustomers.map((customer, index) => ({
                'S.No': index + 1,
                'Customer ID': customer.customer_id,
                'Name': customer.name,
                'Mobile Number': customer.mobile_number,
                'Email': customer.email || '',
                'Address': customer.address || '',
                'Creation Date': window.Utils.formatDate(customer.creation_date),
                'Net Value': customer.net_value,
                'Created By': customer.created_by
            }));

            const filename = `customers_export_${window.Utils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
            window.Utils.exportToCSV(dataToExport, filename);
            window.Utils.showToast('Customers exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting customers:', error);
            window.Utils.showToast('Failed to export customers', 'error');
        }
    }
}

// Make module globally available
window.CustomersModule = CustomersModule;