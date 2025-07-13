// ZEDSON WATCHCRAFT - MongoDB Real-time Sync Service

/**
 * MongoDB Real-time Synchronization Service
 * Handles all database operations with real-time sync
 */

class MongoDBService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.isOnline = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.syncQueue = [];
        
        // Initialize connection check
        this.checkConnection();
        
        // Set up periodic connection check
        setInterval(() => this.checkConnection(), 30000); // Check every 30 seconds
    }
    
    /**
     * Check backend connection
     */
    async checkConnection() {
        try {
            const response = await fetch('http://localhost:5000/health');
            if (response.ok) {
                this.isOnline = true;
                this.retryAttempts = 0;
                
                // Process queued operations
                if (this.syncQueue.length > 0) {
                    console.log('Processing queued operations...');
                    await this.processSyncQueue();
                }
                
                return true;
            }
        } catch (error) {
            this.isOnline = false;
            console.warn('Backend connection failed:', error.message);
        }
        return false;
    }
    
    /**
     * Process queued sync operations
     */
    async processSyncQueue() {
        const queue = [...this.syncQueue];
        this.syncQueue = [];
        
        for (const operation of queue) {
            try {
                await this.makeRequest(operation.endpoint, operation.options);
                console.log('Queued operation processed:', operation.endpoint);
            } catch (error) {
                console.error('Failed to process queued operation:', error);
                // Re-queue failed operations
                this.syncQueue.push(operation);
            }
        }
    }
    
    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(endpoint, options = {}) {
        if (!this.isOnline) {
            // Queue operation for later
            this.syncQueue.push({ endpoint, options });
            throw new Error('Backend offline - operation queued');
        }
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            
            // Retry logic for failed requests
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                console.log(`Retrying request (${this.retryAttempts}/${this.maxRetries})...`);
                
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.makeRequest(endpoint, options);
            }
            
            this.retryAttempts = 0;
            throw error;
        }
    }
    
    // Authentication Methods
    async login(username, password) {
        return this.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }
    
    async setPassword(username, newPassword) {
        return this.makeRequest('/auth/set-password', {
            method: 'POST',
            body: JSON.stringify({ username, newPassword })
        });
    }
    
    // Users Methods
    async getUsers() {
        return this.makeRequest('/users');
    }
    
    async createUser(userData) {
        return this.makeRequest('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async updateUser(username, userData) {
        return this.makeRequest(`/users/${username}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    async deleteUser(username) {
        return this.makeRequest(`/users/${username}`, {
            method: 'DELETE'
        });
    }
    
    // Customers Methods
    async getCustomers() {
        return this.makeRequest('/customers');
    }
    
    async createCustomer(customerData) {
        return this.makeRequest('/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    }
    
    async updateCustomer(id, customerData) {
        return this.makeRequest(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
    }
    
    async deleteCustomer(id) {
        return this.makeRequest(`/customers/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Inventory Methods
    async getInventory() {
        return this.makeRequest('/inventory');
    }
    
    async createInventoryItem(itemData) {
        return this.makeRequest('/inventory', {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    }
    
    async updateInventoryItem(id, itemData) {
        return this.makeRequest(`/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(itemData)
        });
    }
    
    async deleteInventoryItem(id) {
        return this.makeRequest(`/inventory/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Sales Methods
    async getSales() {
        return this.makeRequest('/sales');
    }
    
    async createSale(saleData) {
        return this.makeRequest('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
    }
    
    async updateSale(id, saleData) {
        return this.makeRequest(`/sales/${id}`, {
            method: 'PUT',
            body: JSON.stringify(saleData)
        });
    }
    
    async deleteSale(id) {
        return this.makeRequest(`/sales/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Services Methods
    async getServices() {
        return this.makeRequest('/services');
    }
    
    async createService(serviceData) {
        return this.makeRequest('/services', {
            method: 'POST',
            body: JSON.stringify(serviceData)
        });
    }
    
    async updateService(id, serviceData) {
        return this.makeRequest(`/services/${id}`, {
            method: 'PUT',
            body: JSON.stringify(serviceData)
        });
    }
    
    async deleteService(id) {
        return this.makeRequest(`/services/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Expenses Methods
    async getExpenses() {
        return this.makeRequest('/expenses');
    }
    
    async createExpense(expenseData) {
        return this.makeRequest('/expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData)
        });
    }
    
    async updateExpense(id, expenseData) {
        return this.makeRequest(`/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(expenseData)
        });
    }
    
    async deleteExpense(id) {
        return this.makeRequest(`/expenses/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Invoices Methods
    async getInvoices() {
        return this.makeRequest('/invoices');
    }
    
    async createInvoice(invoiceData) {
        return this.makeRequest('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });
    }
    
    // Logs Methods
    async createLog(logData) {
        return this.makeRequest('/logs', {
            method: 'POST',
            body: JSON.stringify(logData)
        });
    }
    
    async getLogs(limit = 100) {
        return this.makeRequest(`/logs?limit=${limit}`);
    }
    
    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            queuedOperations: this.syncQueue.length
        };
    }
    
    /**
     * Force sync - useful for manual sync triggers
     */
    async forceSync() {
        await this.checkConnection();
        if (this.syncQueue.length > 0) {
            await this.processSyncQueue();
        }
    }
}

// Create global instance
window.mongoService = new MongoDBService();

// Export for use in other modules
window.MongoDBService = MongoDBService;