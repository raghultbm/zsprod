// File: js/api-service.js
// ZEDSON WATCHCRAFT - API Service Module
// Developed by PULSEWARE❤️

/**
 * API Service for communicating with MongoDB backend
 */

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    // Get authentication headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                ...options
            };

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (data.success && data.token) {
            this.setToken(data.token);
        }
        
        return data;
    }

    async logout() {
        this.setToken(null);
    }

    // Generic CRUD methods
    async getAll(collection) {
        return await this.request(`/${collection}`);
    }

    async getById(collection, id) {
        return await this.request(`/${collection}/${id}`);
    }

    async getOne(collection, query = {}) {
        const queryString = new URLSearchParams(query).toString();
        return await this.request(`/${collection}/one?${queryString}`);
    }

    async create(collection, data) {
        return await this.request(`/${collection}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async createMany(collection, documents) {
        return await this.request(`/${collection}/batch`, {
            method: 'POST',
            body: JSON.stringify({ documents })
        });
    }

    async updateById(collection, id, data) {
        return await this.request(`/${collection}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async updateOne(collection, query, update) {
        return await this.request(`/${collection}/one`, {
            method: 'PUT',
            body: JSON.stringify({ query, update })
        });
    }

    async updateMany(collection, query, update) {
        return await this.request(`/${collection}`, {
            method: 'PUT',
            body: JSON.stringify({ query, update })
        });
    }

    async deleteById(collection, id) {
        return await this.request(`/${collection}/${id}`, {
            method: 'DELETE'
        });
    }

    async deleteOne(collection, query) {
        return await this.request(`/${collection}/one`, {
            method: 'DELETE',
            body: JSON.stringify({ query })
        });
    }

    async deleteMany(collection, query) {
        return await this.request(`/${collection}`, {
            method: 'DELETE',
            body: JSON.stringify({ query })
        });
    }

    async search(collection, searchTerm, field = null, limit = 50) {
        const params = new URLSearchParams({ q: searchTerm, limit });
        if (field) params.append('field', field);
        
        return await this.request(`/${collection}/search?${params}`);
    }

    // Special endpoints
    async getDashboardStats() {
        return await this.request('/dashboard/stats');
    }

    async exportAllData() {
        return await this.request('/export/all');
    }

    async initializeAdmin() {
        return await this.request('/init/admin', {
            method: 'POST'
        });
    }

    async initializeSampleData() {
        return await this.request('/init/sample-data', {
            method: 'POST'
        });
    }

    async getRevenueAnalytics(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/analytics/revenue?${queryString}`);
    }

    async getCustomerAnalytics() {
        return await this.request('/analytics/customers');
    }

    async getInventoryAnalytics() {
        return await this.request('/analytics/inventory');
    }

    // Backup and restore methods
    async backupCollection(collection, data) {
        return await this.request(`/${collection}/backup`, {
            method: 'POST',
            body: JSON.stringify({ data })
        });
    }

    async importCollection(collection, data) {
        return await this.request(`/${collection}/import`, {
            method: 'POST',
            body: JSON.stringify({ data })
        });
    }

    // Collection-specific methods
    
    // Users
    async getUsers() {
        return await this.getAll('users');
    }

    async createUser(userData) {
        return await this.create('users', userData);
    }

    async updateUser(userId, userData) {
        return await this.updateById('users', userId, userData);
    }

    async deleteUser(userId) {
        return await this.deleteById('users', userId);
    }

    // Customers
    async getCustomers() {
        return await this.getAll('customers');
    }

    async getCustomer(customerId) {
        return await this.getById('customers', customerId);
    }

    async createCustomer(customerData) {
        return await this.create('customers', customerData);
    }

    async updateCustomer(customerId, customerData) {
        return await this.updateById('customers', customerId, customerData);
    }

    async deleteCustomer(customerId) {
        return await this.deleteById('customers', customerId);
    }

    // Inventory
    async getInventory() {
        return await this.getAll('inventory');
    }

    async getInventoryItem(itemId) {
        return await this.getById('inventory', itemId);
    }

    async createInventoryItem(itemData) {
        return await this.create('inventory', itemData);
    }

    async updateInventoryItem(itemId, itemData) {
        return await this.updateById('inventory', itemId, itemData);
    }

    async deleteInventoryItem(itemId) {
        return await this.deleteById('inventory', itemId);
    }

    // Sales
    async getSales() {
        return await this.getAll('sales');
    }

    async getSale(saleId) {
        return await this.getById('sales', saleId);
    }

    async createSale(saleData) {
        return await this.create('sales', saleData);
    }

    async updateSale(saleId, saleData) {
        return await this.updateById('sales', saleId, saleData);
    }

    async deleteSale(saleId) {
        return await this.deleteById('sales', saleId);
    }

    // Services
    async getServices() {
        return await this.getAll('services');
    }

    async getService(serviceId) {
        return await this.getById('services', serviceId);
    }

    async createService(serviceData) {
        return await this.create('services', serviceData);
    }

    async updateService(serviceId, serviceData) {
        return await this.updateById('services', serviceId, serviceData);
    }

    async deleteService(serviceId) {
        return await this.deleteById('services', serviceId);
    }

    // Expenses
    async getExpenses() {
        return await this.getAll('expenses');
    }

    async getExpense(expenseId) {
        return await this.getById('expenses', expenseId);
    }

    async createExpense(expenseData) {
        return await this.create('expenses', expenseData);
    }

    async updateExpense(expenseId, expenseData) {
        return await this.updateById('expenses', expenseId, expenseData);
    }

    async deleteExpense(expenseId) {
        return await this.deleteById('expenses', expenseId);
    }

    // Invoices
    async getInvoices() {
        return await this.getAll('invoices');
    }

    async getInvoice(invoiceId) {
        return await this.getById('invoices', invoiceId);
    }

    async createInvoice(invoiceData) {
        return await this.create('invoices', invoiceData);
    }

    async updateInvoice(invoiceId, invoiceData) {
        return await this.updateById('invoices', invoiceId, invoiceData);
    }

    async deleteInvoice(invoiceId) {
        return await this.deleteById('invoices', invoiceId);
    }

    // Activity Logs
    async getLogs() {
        return await this.getAll('logs');
    }

    async createLog(logData) {
        return await this.create('logs', logData);
    }

    // Connection test
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            return await response.json();
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }
}

// Create global instance
window.apiService = new APIService();

// Export for use in other modules
window.APIService = APIService;