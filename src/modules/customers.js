// src/modules/customers.js - Complete fixed version with search and net value
const { ipcRenderer } = require('electron');

class CustomerModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.customers = [];
        this.filteredCustomers = [];
        this.customerNetValues = new Map(); // Cache for customer net values
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

        // Search functionality
        const searchInput = document.getElementById('customerSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.searchCustomers();
                }
            });
            
            searchInput.addEventListener('input', (e) => {
                if (e.target.value.trim() === '') {
                    this.clearCustomerSearch();
                }
            });
        }
    }

    async loadData() {
        try {
            this.customers = await ipcRenderer.invoke('get-customers');
            this.filteredCustomers = [...this.customers];
            
            // Load net values for all customers
            await this.loadCustomerNetValues();
            
            this.renderTable();
        } catch (error) {
            console.error('Error loading customers:', error);
            const errorMsg = 'Error loading customers';
            if (window.showError) {
                window.showError(errorMsg);
            } else {
                alert(errorMsg);
            }
        }
    }

    async loadCustomerNetValues() {
        try {
            // Clear existing cache
            this.customerNetValues.clear();
            
            // Load net values for each customer
            for (const customer of this.customers) {
                const netValue = await this.calculateCustomerNetValue(customer.id);
                this.customerNetValues.set(customer.id, netValue);
            }
        } catch (error) {
            console.error('Error loading customer net values:', error);
        }
    }

    async calculateCustomerNetValue(customerId) {
        try {
            // Get sales for this customer
            const salesData = await ipcRenderer.invoke('get-customer-sales', customerId);
            const salesTotal = salesData.reduce((total, sale) => total + parseFloat(sale.total_amount || 0), 0);

            // Get service jobs for this customer
            const serviceData = await ipcRenderer.invoke('get-customer-services', customerId);
            const servicesTotal = serviceData.reduce((total, service) => {
                const finalCost = parseFloat(service.final_cost || service.estimated_cost || 0);
                return total + finalCost;
            }, 0);

            return salesTotal + servicesTotal;
        } catch (error) {
            console.error('Error calculating net value for customer:', customerId, error);
            return 0;
        }
    }

    renderTable() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredCustomers.forEach(customer => {
            const row = document.createElement('tr');
            const netValue = this.customerNetValues.get(customer.id) || 0;
            
            row.innerHTML = `
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.email || '-'}</td>
                <td>₹${netValue.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="customerCreateSale(${customer.id})">Sale</button>
                    <button class="btn btn-sm btn-secondary" onclick="customerCreateService(${customer.id})">Service</button>
                    <button class="btn btn-sm btn-warning" onclick="customerEdit(${customer.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="customerDelete(${customer.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Search functionality
    async searchCustomers() {
        const searchTerm = document.getElementById('customerSearch')?.value?.trim();
        
        if (searchTerm) {
            try {
                // Search locally first for better performance
                this.filteredCustomers = this.customers.filter(customer => 
                    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (customer.phone && customer.phone.includes(searchTerm)) ||
                    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
                );
                
                // If no local results and search term is significant, search database
                if (this.filteredCustomers.length === 0 && searchTerm.length >= 2) {
                    const dbResults = await ipcRenderer.invoke('search-customers', searchTerm);
                    this.filteredCustomers = dbResults;
                    
                    // Load net values for new search results
                    for (const customer of this.filteredCustomers) {
                        if (!this.customerNetValues.has(customer.id)) {
                            const netValue = await this.calculateCustomerNetValue(customer.id);
                            this.customerNetValues.set(customer.id, netValue);
                        }
                    }
                }
                
                this.renderTable();
            } catch (error) {
                console.error('Error searching customers:', error);
                if (window.showError) {
                    window.showError('Error searching customers');
                } else {
                    alert('Error searching customers');
                }
            }
        } else {
            this.clearCustomerSearch();
        }
    }

    clearCustomerSearch() {
        const searchField = document.getElementById('customerSearch');
        if (searchField) searchField.value = '';
        
        this.filteredCustomers = [...this.customers];
        this.renderTable();
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
                
                // Remove from cache
                this.customerNetValues.delete(id);
                
                await this.loadData();
                if (window.loadDashboardStats) {
                    await window.loadDashboardStats();
                }
                const successMsg = 'Customer deleted successfully';
                if (window.showSuccess) {
                    window.showSuccess(successMsg);
                } else {
                    alert(successMsg);
                }
            } catch (error) {
                console.error('Error deleting customer:', error);
                const errorMsg = 'Error deleting customer';
                if (window.showError) {
                    window.showError(errorMsg);
                } else {
                    alert(errorMsg);
                }
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
            if (window.showError) {
                window.showError(errorMsg);
            } else {
                alert(errorMsg);
            }
            return;
        }
        
        const customerId = document.getElementById('customerId').value;
        
        try {
            if (customerId) {
                customerData.id = parseInt(customerId);
                await ipcRenderer.invoke('update-customer', customerData);
                
                // Recalculate net value for updated customer
                const netValue = await this.calculateCustomerNetValue(customerData.id);
                this.customerNetValues.set(customerData.id, netValue);
                
                const successMsg = 'Customer updated successfully';
                if (window.showSuccess) {
                    window.showSuccess(successMsg);
                } else {
                    alert(successMsg);
                }
            } else {
                const result = await ipcRenderer.invoke('add-customer', customerData);
                
                // Calculate net value for new customer (will be 0)
                this.customerNetValues.set(result.id, 0);
                
                const successMsg = 'Customer added successfully';
                if (window.showSuccess) {
                    window.showSuccess(successMsg);
                } else {
                    alert(successMsg);
                }
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
            if (window.showError) {
                window.showError(errorMsg);
            } else {
                alert(errorMsg);
            }
        }
    }

    // Refresh net values (call this after sales/service transactions)
    async refreshCustomerNetValue(customerId) {
        try {
            const netValue = await this.calculateCustomerNetValue(customerId);
            this.customerNetValues.set(customerId, netValue);
            
            // Re-render table if this customer is currently displayed
            const currentCustomer = this.filteredCustomers.find(c => c.id === customerId);
            if (currentCustomer) {
                this.renderTable();
            }
        } catch (error) {
            console.error('Error refreshing customer net value:', error);
        }
    }

    // Search customers for other modules (renamed to avoid confusion)
    async searchCustomersForOtherModules(searchTerm) {
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

    // Get customer net value
    getCustomerNetValue(customerId) {
        return this.customerNetValues.get(customerId) || 0;
    }
}

module.exports = CustomerModule;