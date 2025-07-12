// File: js/api-service.js
// ZEDSON WATCHCRAFT - Fixed API Service Module
// Developed by PULSEWARE❤️

/**
 * API Service for communicating with MongoDB backend
 * Enhanced with better error handling and connection testing
 */

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.healthURL = 'http://localhost:5000/health';
        this.token = localStorage.getItem('authToken');
        this.connectionTested = false;
        this.isConnected = false;
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

    // Test backend connection
    async testConnection() {
        try {
            console.log('🔄 Testing backend connection...');
            
            // Test both health endpoint and API endpoint
            const healthResponse = await fetch(this.healthURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!healthResponse.ok) {
                throw new Error(`Health check failed: ${healthResponse.status}`);
            }
            
            const healthData = await healthResponse.json();
            console.log('✅ Backend health check passed:', healthData.message);
            
            // Test API endpoint
            const testResponse = await fetch(`${this.baseURL}/test`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!testResponse.ok) {
                throw new Error(`API test failed: ${testResponse.status}`);
            }
            
            const testData = await testResponse.json();
            console.log('✅ API test passed:', testData.message);
            
            this.connectionTested = true;
            this.isConnected = true;
            
            return {
                success: true,
                message: 'Backend connection successful',
                health: healthData,
                api: testData
            };
            
        } catch (error) {
            console.error('❌ Backend connection test failed:', error);
            this.connectionTested = true;
            this.isConnected = false;
            
            // Provide helpful error messages
            let userMessage = 'Backend connection failed. ';
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                userMessage += 'Please ensure the backend server is running on port 5000. Run "npm run dev" in the backend folder.';
            } else if (error.message.includes('Health check failed')) {
                userMessage += 'Backend server is running but not responding correctly.';
            } else {
                userMessage += error.message;
            }
            
            throw new Error(userMessage);
        }
    }

    // Generic API request method with enhanced error handling
    async request(endpoint, options = {}) {
        try {
            // Test connection if not done yet
            if (!this.connectionTested) {
                await this.testConnection();
            }
            
            if (!this.isConnected) {
                throw new Error('Backend server is not available. Please start the backend server.');
            }
            
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                ...options
            };

            console.log(`🔄 API Request: ${config.method || 'GET'} ${endpoint}`);
            
            const response = await fetch(url, config);
            
            // Handle different response types
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                // Handle specific error codes
                if (response.status === 401) {
                    // Unauthorized - clear token and redirect to login
                    this.setToken(null);
                    throw new Error('Session expired. Please login again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. Insufficient permissions.');
                } else if (response.status === 404) {
                    throw new Error('API endpoint not found.');
                } else if (response.status === 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }
            }

            console.log(`✅ API Response: ${endpoint}`, data);
            return data;
            
        } catch (error) {
            console.error('❌ API Request Error:', error);
            
            // Mark connection as failed if it's a network error
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                this.isConnected = false;
                throw new Error('Backend server is not available. Please ensure the server is running on port 5000.');
            }
            
            throw error;
        }
    }

    // Authentication methods
    async login(credentials) {
        try {
            const data = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            if (data.success && data.token) {
                this.setToken(data.token);
                console.log('✅ Login successful');
            }
            
            return data;
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    async logout() {
        this.setToken(null);
        console.log('✅ Logout successful');
    }

    // Generic CRUD methods with better error handling
    async getAll(collection) {
        try {
            return await this.request(`/${collection}`);
        } catch (error) {
            console.error(`Error fetching ${collection}:`, error);
            throw new Error(`Failed to load ${collection}: ${error.message}`);
        }
    }

    async getById(collection, id) {
        try {
            return await this.request(`/${collection}/${id}`);
        } catch (error) {
            console.error(`Error fetching ${collection} by ID:`, error);
            throw new Error(`Failed to load ${collection}: ${error.message}`);
        }
    }

    async getOne(collection, query = {}) {
        try {
            const queryString = new URLSearchParams(query).toString();
            return await this.request(`/${collection}/one?${queryString}`);
        } catch (error) {
            console.error(`Error fetching ${collection}:`, error);
            throw new Error(`Failed to load ${collection}: ${error.message}`);
        }
    }

    async create(collection, data) {
        try {
            return await this.request(`/${collection}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error(`Error creating ${collection}:`, error);
            throw new Error(`Failed to create ${collection}: ${error.message}`);
        }
    }

    async createMany(collection, documents) {
        try {
            return await this.request(`/${collection}/batch`, {
                method: 'POST',
                body: JSON.stringify({ documents })
            });
        } catch (error) {
            console.error(`Error creating multiple ${collection}:`, error);
            throw new Error(`Failed to create ${collection}: ${error.message}`);
        }
    }

    async updateById(collection, id, data) {
        try {
            return await this.request(`/${collection}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error(`Error updating ${collection}:`, error);
            throw new Error(`Failed to update ${collection}: ${error.message}`);
        }
    }

    async updateOne(collection, query, update) {
        try {
            return await this.request(`/${collection}/one`, {
                method: 'PUT',
                body: JSON.stringify({ query, update })
            });
        } catch (error) {
            console.error(`Error updating ${collection}:`, error);
            throw new Error(`Failed to update ${collection}: ${error.message}`);
        }
    }

    async updateMany(collection, query, update) {
        try {
            return await this.request(`/${collection}`, {
                method: 'PUT',
                body: JSON.stringify({ query, update })
            });
        } catch (error) {
            console.error(`Error updating multiple ${collection}:`, error);
            throw new Error(`Failed to update ${collection}: ${error.message}`);
        }
    }

    async deleteById(collection, id) {
        try {
            return await this.request(`/${collection}/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error(`Error deleting ${collection}:`, error);
            throw new Error(`Failed to delete ${collection}: ${error.message}`);
        }
    }

    async deleteOne(collection, query) {
        try {
            return await this.request(`/${collection}/one`, {
                method: 'DELETE',
                body: JSON.stringify({ query })
            });
        } catch (error) {
            console.error(`Error deleting ${collection}:`, error);
            throw new Error(`Failed to delete ${collection}: ${error.message}`);
        }
    }

    async deleteMany(collection, query) {
        try {
            return await this.request(`/${collection}`, {
                method: 'DELETE',
                body: JSON.stringify({ query })
            });
        } catch (error) {
            console.error(`Error deleting multiple ${collection}:`, error);
            throw new Error(`Failed to delete ${collection}: ${error.message}`);
        }
    }

    async search(collection, searchTerm, field = null, limit = 50) {
        try {
            const params = new URLSearchParams({ q: searchTerm, limit });
            if (field) params.append('field', field);
            
            return await this.request(`/${collection}/search?${params}`);
        } catch (error) {
            console.error(`Error searching ${collection}:`, error);
            throw new Error(`Failed to search ${collection}: ${error.message}`);
        }
    }

    // Special endpoints
    async getDashboardStats() {
        try {
            return await this.request('/dashboard/stats');
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw new Error(`Failed to load dashboard stats: ${error.message}`);
        }
    }

    async exportAllData() {
        try {
            return await this.request('/export/all');
        } catch (error) {
            console.error('Error exporting data:', error);
            throw new Error(`Failed to export data: ${error.message}`);
        }
    }

    async initializeAdmin() {
        try {
            return await this.request('/init/admin', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error initializing admin:', error);
            throw new Error(`Failed to initialize admin: ${error.message}`);
        }
    }

    async initializeSampleData() {
        try {
            return await this.request('/init/sample-data', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error initializing sample data:', error);
            throw new Error(`Failed to initialize sample data: ${error.message}`);
        }
    }

    async getRevenueAnalytics(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            return await this.request(`/analytics/revenue?${queryString}`);
        } catch (error) {
            console.error('Error fetching revenue analytics:', error);
            throw new Error(`Failed to load revenue analytics: ${error.message}`);
        }
    }

    async getCustomerAnalytics() {
        try {
            return await this.request('/analytics/customers');
        } catch (error) {
            console.error('Error fetching customer analytics:', error);
            throw new Error(`Failed to load customer analytics: ${error.message}`);
        }
    }

    async getInventoryAnalytics() {
        try {
            return await this.request('/analytics/inventory');
        } catch (error) {
            console.error('Error fetching inventory analytics:', error);
            throw new Error(`Failed to load inventory analytics: ${error.message}`);
        }
    }

    // Backup and restore methods
    async backupCollection(collection, data) {
        try {
            return await this.request(`/${collection}/backup`, {
                method: 'POST',
                body: JSON.stringify({ data })
            });
        } catch (error) {
            console.error(`Error backing up ${collection}:`, error);
            throw new Error(`Failed to backup ${collection}: ${error.message}`);
        }
    }

    async importCollection(collection, data) {
        try {
            return await this.request(`/${collection}/import`, {
                method: 'POST',
                body: JSON.stringify({ data })
            });
        } catch (error) {
            console.error(`Error importing ${collection}:`, error);
            throw new Error(`Failed to import ${collection}: ${error.message}`);
        }
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

    // Connection status
    getConnectionStatus() {
        return {
            tested: this.connectionTested,
            connected: this.isConnected
        };
    }
}

// Create global instance
window.apiService = new APIService();

// Export for use in other modules
window.APIService = APIService;

console.log('✅ API Service initialized with enhanced error handling');