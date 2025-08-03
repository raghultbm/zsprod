const { ipcRenderer } = require('electron');

class CustomerModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.customers = [];
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Customer form submission
        const customerForm = document.getElementById('customerForm');
        if (customerForm) {
            customerForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async loadData() {
        try {
            this.customers = await ipcRenderer.invoke('get-customers');
            this.renderTable();
        } catch (error) {
            console.error('Error loading customers:', error);
            const errorMsg = 'Error loading customers';
            showError ? showError(errorMsg) : alert(errorMsg);
        }
    }

    renderTable() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.email || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.customerModule().createSale(${customer.id})">Sale</button>
                    <button class="btn btn-sm btn-secondary" onclick="window.customerModule().createService(${customer.id})">Service</button>
                    <button class="btn btn-sm btn-warning" onclick="window.customerModule().edit(${customer.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="window.customerModule().delete(${customer.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    openModal(customer = null) {
        const modal = document.getElementById('customerModal');
        const form = document.getElementById('customerForm');
        const title = document.getElementById('customerModalTitle');
        
        if (!modal || !form || !title) return;

        form.reset();
        
        if (customer) {
            title.textContent = 'Edit Customer';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerEmail').value = customer.email || '';
        } else {
            title.textContent = 'Add Customer';
            document.getElementById('customerId').value = '';
        }
        
        modal.style.display = 'block';
    }

    edit(id) {
        const customer = this.customers.find(c => c.id === id);
        if (customer) {
            this.openModal(customer);
        }
    }

    async delete(id) {
        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                await ipcRenderer.invoke('delete-customer', id);
                await this.loadData();
                if (window.loadDashboardStats) {
                    await window.loadDashboardStats();
                }
                const successMsg = 'Customer deleted successfully';
                showSuccess ? showSuccess(successMsg) : alert(successMsg);
            } catch (error) {
                console.error('Error deleting customer:', error);
                const errorMsg = 'Error deleting customer';
                showError ? showError(errorMsg) : alert(errorMsg);
            }
        }
    }

    // Create Sale - Navigate to sales module with customer pre-selected
    createSale(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            // Store customer for sales module
            window.selectedCustomerForSale = customer;
            
            // Switch to sales module
            const salesNavItem = document.querySelector('[data-module="sales"]');
            if (salesNavItem) {
                salesNavItem.click();
                
                // Wait for module to load, then populate customer
                setTimeout(() => {
                    const salesModule = window.salesModule();
                    if (salesModule && salesModule.selectCustomer) {
                        salesModule.selectCustomer(
                            customer.id,
                            customer.name,
                            customer.phone || ''
                        );
                    }
                }, 100);
            }
        }
    }

    // Create Service - Navigate to service module with customer pre-selected
    createService(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            // Store customer for service module
            window.selectedCustomerForService = customer;
            
            // Switch to service module
            const serviceNavItem = document.querySelector('[data-module="service"]');
            if (serviceNavItem) {
                serviceNavItem.click();
                
                // Wait for module to load, then populate customer
                setTimeout(() => {
                    const serviceModule = window.serviceModule();
                    if (serviceModule && serviceModule.selectServiceCustomer) {
                        serviceModule.selectServiceCustomer(
                            customer.id,
                            customer.name,
                            customer.phone || ''
                        );
                    }
                }, 100);
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const customerData = {
            name: document.getElementById('customerName').value.trim(),
            phone: document.getElementById('customerPhone').value.trim(),
            email: document.getElementById('customerEmail').value.trim()
        };

        if (!customerData.name) {
            const errorMsg = 'Customer name is required';
            showError ? showError(errorMsg) : alert(errorMsg);
            return;
        }
        
        const customerId = document.getElementById('customerId').value;
        
        try {
            if (customerId) {
                customerData.id = parseInt(customerId);
                await ipcRenderer.invoke('update-customer', customerData);
                const successMsg = 'Customer updated successfully';
                showSuccess ? showSuccess(successMsg) : alert(successMsg);
            } else {
                await ipcRenderer.invoke('add-customer', customerData);
                const successMsg = 'Customer added successfully';
                showSuccess ? showSuccess(successMsg) : alert(successMsg);
            }
            
            if (window.closeModal) {
                window.closeModal('customerModal');
            } else {
                document.getElementById('customerModal').style.display = 'none';
            }
            
            await this.loadData();
            if (window.loadDashboardStats) {
                await window.loadDashboardStats();
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            const errorMsg = 'Error saving customer';
            showError ? showError(errorMsg) : alert(errorMsg);
        }
    }

    // Search customers for other modules
    async searchCustomers(searchTerm) {
        try {
            return await ipcRenderer.invoke('search-customers', searchTerm);
        } catch (error) {
            console.error('Error searching customers:', error);
            return [];
        }
    }

    // Get customer by ID
    getCustomerById(id) {
        return this.customers.find(c => c.id === id);
    }

    // Get all customers
    getAllCustomers() {
        return this.customers;
    }
}

module.exports = CustomerModule;