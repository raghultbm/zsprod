// ZEDSON WATCHCRAFT - Simplified API Service for Local MongoDB
// Developed by PULSEWARE❤️

/**
 * API Service for Local MongoDB Integration
 */

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.healthURL = 'http://localhost:5000/health';
        this.token = localStorage.getItem('authToken');
        this.isConnected = false;
        
        console.log('🔧 API Service initialized for Local MongoDB');
        this.testConnection();
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

    // Test connection to backend
    async testConnection() {
        try {
            console.log('🔌 Testing connection to MongoDB backend...');
            
            const response = await fetch(this.healthURL, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                console.log('✅ Connected to MongoDB backend:', data.message);
                this.updateConnectionStatus('connected', '✓ MongoDB Connected');
                return { success: true, data };
            } else {
                throw new Error('Backend not responding');
            }
        } catch (error) {
            console.log('⚠️ MongoDB backend not available, using local storage');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', '⚠️ Using Local Storage');
            return { success: false, error: error.message };
        }
    }

    // Update connection status in UI
    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('dbStatus');
        const statusText = document.getElementById('dbStatusText');
        
        if (statusElement && statusText) {
            statusElement.className = `db-status ${status}`;
            statusText.textContent = message;
        }
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        if (!this.isConnected) {
            return this.handleOffline(endpoint, options);
        }

        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                method: options.method || 'GET',
                headers: this.getHeaders(),
                ...options
            };

            if (options.body) {
                config.body = JSON.stringify(options.body);
            }

            const response = await fetch(url, config);
            const data = await response.json();

            if (response.ok) {
                return data;
            } else {
                throw new Error(data.error || 'API request failed');
            }
        } catch (error) {
            console.error('API request failed:', error);
            return this.handleOffline(endpoint, options);
        }
    }

    // Handle offline operations with localStorage
    handleOffline(endpoint, options) {
        console.log('📁 Using localStorage for:', endpoint);
        
        // Extract collection name from endpoint
        const pathParts = endpoint.split('/');
        const collection = pathParts[1] || pathParts[0];
        
        if (!collection) {
            return { success: false, error: 'Invalid endpoint' };
        }

        const method = options.method || 'GET';
        const storageKey = `zedson_${collection}`;

        try {
            switch (method) {
                case 'GET':
                    return this.getFromStorage(storageKey);
                case 'POST':
                    return this.saveToStorage(storageKey, options.body);
                case 'PUT':
                    return this.updateInStorage(storageKey, options.body);
                case 'DELETE':
                    return this.deleteFromStorage(storageKey, options.body);
                default:
                    return { success: false, error: 'Unsupported method' };
            }
        } catch (error) {
            console.error('localStorage operation failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get data from localStorage
    getFromStorage(storageKey) {
        const stored = localStorage.getItem(storageKey);
        const data = stored ? JSON.parse(stored) : [];
        return { success: true, data };
    }

    // Save data to localStorage
    saveToStorage(storageKey, newItem) {
        const stored = localStorage.getItem(storageKey);
        const data = stored ? JSON.parse(stored) : [];
        
        // Generate ID if not provided
        if (!newItem.id) {
            newItem.id = data.length > 0 ? Math.max(...data.map(item => item.id || 0)) + 1 : 1;
        }
        
        newItem.createdAt = new Date().toISOString();
        newItem.updatedAt = new Date().toISOString();
        
        data.push(newItem);
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        return { success: true, data: newItem };
    }

    // Update data in localStorage
    updateInStorage(storageKey, updateData) {
        const stored = localStorage.getItem(storageKey);
        if (!stored) {
            return { success: false, error: 'No data found' };
        }

        const data = JSON.parse(stored);
        const { id, ...updates } = updateData;
        
        const index = data.findIndex(item => item.id === id);
        if (index === -1) {
            return { success: false, error: 'Item not found' };
        }

        data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        return { success: true, data: data[index] };
    }

    // Delete data from localStorage
    deleteFromStorage(storageKey, deleteData) {
        const stored = localStorage.getItem(storageKey);
        if (!stored) {
            return { success: false, error: 'No data found' };
        }

        const data = JSON.parse(stored);
        const filteredData = data.filter(item => item.id !== deleteData.id);
        
        localStorage.setItem(storageKey, JSON.stringify(filteredData));
        
        return { success: true, data: { deletedCount: data.length - filteredData.length } };
    }

    // Authentication methods
    async login(credentials) {
        console.log('🔐 Attempting login...');
        
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: credentials
            });
            
            if (response.success && response.token) {
                this.setToken(response.token);
                return response;
            } else {
                return { success: false, error: response.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Authentication service unavailable' };
        }
    }

    async logout() {
        this.setToken(null);
        return { success: true };
    }

    // Collection-specific methods
    async getCustomers() {
        return await this.request('/customers');
    }

    async createCustomer(customerData) {
        return await this.request('/customers', {
            method: 'POST',
            body: customerData
        });
    }

    async updateCustomer(customerId, customerData) {
        return await this.request(`/customers/${customerId}`, {
            method: 'PUT',
            body: { id: customerId, ...customerData }
        });
    }

    async deleteCustomer(customerId) {
        return await this.request(`/customers/${customerId}`, {
            method: 'DELETE',
            body: { id: customerId }
        });
    }

    async getInventory() {
        return await this.request('/inventory');
    }

    async createInventoryItem(itemData) {
        return await this.request('/inventory', {
            method: 'POST',
            body: itemData
        });
    }

    async updateInventoryItem(itemId, itemData) {
        return await this.request(`/inventory/${itemId}`, {
            method: 'PUT',
            body: { id: itemId, ...itemData }
        });
    }

    async deleteInventoryItem(itemId) {
        return await this.request(`/inventory/${itemId}`, {
            method: 'DELETE',
            body: { id: itemId }
        });
    }

    async getSales() {
        return await this.request('/sales');
    }

    async createSale(saleData) {
        return await this.request('/sales', {
            method: 'POST',
            body: saleData
        });
    }

    async updateSale(saleId, saleData) {
        return await this.request(`/sales/${saleId}`, {
            method: 'PUT',
            body: { id: saleId, ...saleData }
        });
    }

    async deleteSale(saleId) {
        return await this.request(`/sales/${saleId}`, {
            method: 'DELETE',
            body: { id: saleId }
        });
    }

    async getServices() {
        return await this.request('/services');
    }

    async createService(serviceData) {
        return await this.request('/services', {
            method: 'POST',
            body: serviceData
        });
    }

    async updateService(serviceId, serviceData) {
        return await this.request(`/services/${serviceId}`, {
            method: 'PUT',
            body: { id: serviceId, ...serviceData }
        });
    }

    async deleteService(serviceId) {
        return await this.request(`/services/${serviceId}`, {
            method: 'DELETE',
            body: { id: serviceId }
        });
    }

    async getExpenses() {
        return await this.request('/expenses');
    }

    async createExpense(expenseData) {
        return await this.request('/expenses', {
            method: 'POST',
            body: expenseData
        });
    }

    async updateExpense(expenseId, expenseData) {
        return await this.request(`/expenses/${expenseId}`, {
            method: 'PUT',
            body: { id: expenseId, ...expenseData }
        });
    }

    async deleteExpense(expenseId) {
        return await this.request(`/expenses/${expenseId}`, {
            method: 'DELETE',
            body: { id: expenseId }
        });
    }

    async getInvoices() {
        return await this.request('/invoices');
    }

    async createInvoice(invoiceData) {
        return await this.request('/invoices', {
            method: 'POST',
            body: invoiceData
        });
    }

    // Dashboard statistics
    async getDashboardStats() {
        try {
            return await this.request('/dashboard/stats');
        } catch (error) {
            // Calculate from localStorage if API fails
            return this.calculateStatsOffline();
        }
    }

    // Calculate statistics from localStorage
    calculateStatsOffline() {
        try {
            const customers = JSON.parse(localStorage.getItem('zedson_customers') || '[]');
            const inventory = JSON.parse(localStorage.getItem('zedson_inventory') || '[]');
            const sales = JSON.parse(localStorage.getItem('zedson_sales') || '[]');
            const services = JSON.parse(localStorage.getItem('zedson_services') || '[]');
            const invoices = JSON.parse(localStorage.getItem('zedson_invoices') || '[]');

            const today = new Date().toLocaleDateString('en-IN');
            const todayRevenue = sales
                .filter(sale => sale.date === today)
                .reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

            const incompleteServices = services.filter(s => s.status !== 'completed').length;

            return {
                success: true,
                data: {
                    totalWatches: inventory.length,
                    totalCustomers: customers.length,
                    totalSales: sales.length,
                    totalServices: services.length,
                    incompleteServices,
                    totalInvoices: invoices.length,
                    todayRevenue
                }
            };
        } catch (error) {
            console.error('Error calculating offline stats:', error);
            return {
                success: false,
                error: 'Failed to calculate statistics'
            };
        }
    }

    // Get connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            backend: this.isConnected ? 'MongoDB' : 'localStorage'
        };
    }
}

// Create global instance
window.apiService = new APIService();

console.log('✅ API Service initialized for Local MongoDB integration');