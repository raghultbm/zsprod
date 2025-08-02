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
            showError('Error loading customers');
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
                    <button class="btn btn-sm btn-primary" onclick="customerModule().triggerAction(${customer.id})">Actions</button>
                    <button class="btn btn-sm btn-secondary" onclick="customerModule().edit(${customer.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="customerModule().delete(${customer.id})">Delete</button>
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
                await loadDashboardStats();
                showSuccess('Customer deleted successfully');
            } catch (error) {
                console.error('Error deleting customer:', error);
                showError('Error deleting customer');
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
            showError('Customer name is required');
            return;
        }
        
        const customerId = document.getElementById('customerId').value;
        
        try {
            if (customerId) {
                customerData.id = parseInt(customerId);
                await ipcRenderer.invoke('update-customer', customerData);
                showSuccess('Customer updated successfully');
            } else {
                await ipcRenderer.invoke('add-customer', customerData);
                showSuccess('Customer added successfully');
            }
            
            closeModal('customerModal');
            await this.loadData();
            await loadDashboardStats();
        } catch (error) {
            console.error('Error saving customer:', error);
            showError('Error saving customer');
        }
    }

    // Trigger action modal for sales/service
    triggerAction(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            document.getElementById('customerActionName').textContent = customer.name;
            document.getElementById('customerActionModal').style.display = 'block';
            
            // Store customer for action handlers
            this.selectedCustomerForAction = customer;
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

// Global action handlers for customer actions
window.triggerSalesFromCustomer = function() {
    const customerModule = window.customerModule();
    if (customerModule.selectedCustomerForAction) {
        closeModal('customerActionModal');
        
        // Switch to sales module
        document.querySelector('[data-module="sales"]').click();
        
        // Wait for module to load, then populate customer
        setTimeout(() => {
            const salesModule = window.salesModule();
            if (salesModule) {
                salesModule.selectCustomer(
                    customerModule.selectedCustomerForAction.id,
                    customerModule.selectedCustomerForAction.name,
                    customerModule.selectedCustomerForAction.phone || ''
                );
            }
        }, 100);
    }
};

window.triggerServiceFromCustomer = function() {
    const customerModule = window.customerModule();
    if (customerModule.selectedCustomerForAction) {
        closeModal('customerActionModal');
        
        // Switch to service module
        document.querySelector('[data-module="service"]').click();
        
        // Wait for module to load, then populate customer
        setTimeout(() => {
            const serviceModule = window.serviceModule();
            if (serviceModule) {
                serviceModule.selectServiceCustomer(
                    customerModule.selectedCustomerForAction.id,
                    customerModule.selectedCustomerForAction.name,
                    customerModule.selectedCustomerForAction.phone || ''
                );
            }
        }, 100);
    }
};

module.exports = CustomerModule;