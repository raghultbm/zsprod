// ZEDSON WATCHCRAFT - API Utilities (Updated for Phase 3)

// Base API configuration
const API_BASE_URL = 'http://localhost:5000/api';
const API_TIMEOUT = 30000; // 30 seconds

// API Response handler
class APIResponse {
    constructor(success, data = null, message = '', error = null) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }
}

// Base API class with common functionality
class BaseAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.timeout = API_TIMEOUT;
    }

    // Get authentication token
    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    // Get default headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (includeAuth) {
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // Create AbortController for request cancellation
    createAbortController() {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.timeout);
        return controller;
    }

    // Handle API response
    async handleResponse(response) {
        try {
            const data = await response.json();
            
            if (response.ok) {
                return new APIResponse(true, data.data || data, data.message || 'Success');
            } else {
                return new APIResponse(false, null, data.message || 'Request failed', data.error);
            }
        } catch (error) {
            return new APIResponse(false, null, 'Failed to parse response', error.message);
        }
    }

    // Handle network errors
    handleNetworkError(error) {
        if (error.name === 'AbortError') {
            return new APIResponse(false, null, 'Request timeout', 'Request was cancelled due to timeout');
        } else if (!navigator.onLine) {
            return new APIResponse(false, null, 'No internet connection', 'Please check your network connection');
        } else {
            return new APIResponse(false, null, 'Network error', error.message);
        }
    }

    // Retry mechanism
    async withRetry(requestFn, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await requestFn();
                if (result.success) {
                    return result;
                }
                
                // Don't retry on authentication errors
                if (result.error && result.error.includes('401')) {
                    return result;
                }
                
                if (attempt === maxRetries) {
                    return result;
                }
            } catch (error) {
                if (attempt === maxRetries) {
                    return this.handleNetworkError(error);
                }
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }

    // Generic GET request
    async get(endpoint, params = {}) {
        return this.withRetry(async () => {
            const controller = this.createAbortController();
            const url = new URL(`${this.baseURL}${endpoint}`);
            
            // Add query parameters
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.getHeaders(),
                signal: controller.signal
            });

            return this.handleResponse(response);
        });
    }

    // Generic POST request
    async post(endpoint, data = {}) {
        return this.withRetry(async () => {
            const controller = this.createAbortController();
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                signal: controller.signal
            });

            return this.handleResponse(response);
        });
    }

    // Generic PUT request
    async put(endpoint, data = {}) {
        return this.withRetry(async () => {
            const controller = this.createAbortController();
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                signal: controller.signal
            });

            return this.handleResponse(response);
        });
    }

    // Generic PATCH request
    async patch(endpoint, data = {}) {
        return this.withRetry(async () => {
            const controller = this.createAbortController();
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                signal: controller.signal
            });

            return this.handleResponse(response);
        });
    }

    // Generic DELETE request
    async delete(endpoint, data = {}) {
        return this.withRetry(async () => {
            const controller = this.createAbortController();
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: Object.keys(data).length > 0 ? JSON.stringify(data) : undefined,
                signal: controller.signal
            });

            return this.handleResponse(response);
        });
    }

    // File upload request
    async uploadFile(endpoint, formData) {
        return this.withRetry(async () => {
            const controller = this.createAbortController();
            const headers = { 'Authorization': `Bearer ${this.getAuthToken()}` };
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: formData,
                signal: controller.signal
            });

            return this.handleResponse(response);
        });
    }
}

// Authentication API
class AuthAPI extends BaseAPI {
    async login(username, password) {
        return this.post('/auth/login', { username, password });
    }

    async firstLogin(username, newPassword, confirmPassword) {
        return this.post('/auth/first-login', { username, newPassword, confirmPassword });
    }

    async logout() {
        return this.post('/auth/logout');
    }

    async getCurrentUser() {
        return this.get('/auth/me');
    }

    async getUsers() {
        return this.get('/auth/users');
    }

    async createUser(userData) {
        return this.post('/auth/users', userData);
    }

    async updateUser(id, userData) {
        return this.put(`/auth/users/${id}`, userData);
    }

    async deleteUser(id) {
        return this.delete(`/auth/users/${id}`);
    }

    async resetPassword(id) {
        return this.post(`/auth/users/${id}/reset-password`);
    }
}

// Customer API
class CustomerAPI extends BaseAPI {
    async getCustomers(params = {}) {
        return this.get('/customers', params);
    }

    async getCustomerStats() {
        return this.get('/customers/stats');
    }

    async getCustomer(id) {
        return this.get(`/customers/${id}`);
    }

    async createCustomer(customerData) {
        return this.post('/customers', customerData);
    }

    async updateCustomer(id, customerData) {
        return this.put(`/customers/${id}`, customerData);
    }

    async deleteCustomer(id) {
        return this.delete(`/customers/${id}`);
    }

    async updateCustomerStatus(id, status) {
        return this.patch(`/customers/${id}/status`, { status });
    }

    async addCustomerNote(id, note) {
        return this.post(`/customers/${id}/notes`, { note });
    }

    async incrementPurchases(id) {
        return this.patch(`/customers/${id}/increment-purchases`);
    }

    async incrementServices(id) {
        return this.patch(`/customers/${id}/increment-services`);
    }

    async updateNetValue(id, salesValue, serviceValue) {
        return this.patch(`/customers/${id}/update-net-value`, { salesValue, serviceValue });
    }
}

// Watch/Inventory API
class WatchAPI extends BaseAPI {
    async getWatches(params = {}) {
        return this.get('/watches', params);
    }

    async getWatchStats() {
        return this.get('/watches/stats');
    }

    async getWatch(id) {
        return this.get(`/watches/${id}`);
    }

    async getWatchByCode(code) {
        return this.get(`/watches/code/${code}`);
    }

    async getAvailableWatches() {
        return this.get('/watches/available');
    }

    async getLowStock(threshold = 2) {
        return this.get('/watches/low-stock', { threshold });
    }

    async getWatchesByOutlet(outlet) {
        return this.get(`/watches/outlet/${outlet}`);
    }

    async createWatch(watchData) {
        return this.post('/watches', watchData);
    }

    async updateWatch(id, watchData) {
        return this.put(`/watches/${id}`, watchData);
    }

    async deleteWatch(id, reason = '') {
        return this.delete(`/watches/${id}`, { reason });
    }

    async restoreWatch(id) {
        return this.patch(`/watches/${id}/restore`);
    }

    async updateQuantity(id, quantity, reason = 'Quantity adjustment') {
        return this.patch(`/watches/${id}/quantity`, { quantity, reason });
    }

    async transferWatch(id, transferData) {
        return this.patch(`/watches/${id}/transfer`, transferData);
    }

    async exportWatches(filters = {}) {
        return this.get('/watches/export', filters);
    }
}

// Sales API
class SalesAPI extends BaseAPI {
    async getSales(params = {}) {
        return this.get('/sales', params);
    }

    async getSaleStats(dateFilter = {}) {
        return this.get('/sales/stats', dateFilter);
    }

    async getSale(id) {
        return this.get(`/sales/${id}`);
    }

    async getSalesByCustomer(customerId) {
        return this.get(`/sales/customer/${customerId}`);
    }

    async getSalesAnalytics(params = {}) {
        return this.get('/sales/analytics', params);
    }

    async createSale(saleData) {
        return this.post('/sales', saleData);
    }

    async updateSale(id, saleData) {
        return this.put(`/sales/${id}`, saleData);
    }

    async deleteSale(id, reason = '') {
        return this.delete(`/sales/${id}`, { reason });
    }

    async addSaleNote(id, note) {
        return this.post(`/sales/${id}/notes`, { note });
    }

    async processPayment(id, paymentData) {
        return this.patch(`/sales/${id}/payment`, paymentData);
    }

    async processSaleReturn(id, returnData) {
        return this.patch(`/sales/${id}/return`, returnData);
    }

    async exportSales(filters = {}) {
        return this.get('/sales/export', filters);
    }
}

// Service API
class ServiceAPI extends BaseAPI {
    async getServices(params = {}) {
        return this.get('/services', params);
    }

    async getServiceStats(dateFilter = {}) {
        return this.get('/services/stats', dateFilter);
    }

    async getService(id) {
        return this.get(`/services/${id}`);
    }

    async getServicesByStatus(status) {
        return this.get(`/services/status/${status}`);
    }

    async getServicesByCustomer(customerId) {
        return this.get(`/services/customer/${customerId}`);
    }

    async getOverdueServices() {
        return this.get('/services/overdue');
    }

    async createService(serviceData) {
        return this.post('/services', serviceData);
    }

    async updateService(id, serviceData) {
        return this.put(`/services/${id}`, serviceData);
    }

    async deleteService(id, reason = '') {
        return this.delete(`/services/${id}`, { reason });
    }

    async updateServiceStatus(id, statusData) {
        return this.patch(`/services/${id}/status`, statusData);
    }

    async completeService(id, completionData) {
        return this.post(`/services/${id}/complete`, completionData);
    }

    async addServiceNote(id, note, isInternal = false) {
        return this.post(`/services/${id}/notes`, { note, isInternal });
    }

    async setServiceRating(id, rating, feedback = '') {
        return this.patch(`/services/${id}/rating`, { rating, feedback });
    }

    async uploadCompletionImage(id, imageFile) {
        const formData = new FormData();
        formData.append('completionImage', imageFile);
        return this.uploadFile(`/services/${id}/completion-image`, formData);
    }

    async exportServices(filters = {}) {
        return this.get('/services/export', filters);
    }
}

// Expense API
class ExpenseAPI extends BaseAPI {
    async getExpenses(params = {}) {
        return this.get('/expenses', params);
    }

    async getExpenseStats(dateFilter = {}) {
        return this.get('/expenses/stats', dateFilter);
    }

    async getExpense(id) {
        return this.get(`/expenses/${id}`);
    }

    async getExpenseAnalytics(year, month = null) {
        return this.get(`/expenses/analytics/${year}${month ? `/${month}` : ''}`);
    }

    async getMonthlyExpenses(year, month) {
        return this.get(`/expenses/monthly/${year}/${month}`);
    }

    async getPendingApprovals() {
        return this.get('/expenses/pending-approvals');
    }

    async getRecurringDue() {
        return this.get('/expenses/recurring-due');
    }

    async createExpense(expenseData, receiptFile = null) {
        if (receiptFile) {
            const formData = new FormData();
            Object.keys(expenseData).forEach(key => {
                if (expenseData[key] !== undefined) {
                    formData.append(key, typeof expenseData[key] === 'object' ? 
                        JSON.stringify(expenseData[key]) : expenseData[key]);
                }
            });
            formData.append('receipt', receiptFile);
            return this.uploadFile('/expenses', formData);
        } else {
            return this.post('/expenses', expenseData);
        }
    }

    async updateExpense(id, expenseData, receiptFile = null) {
        if (receiptFile) {
            const formData = new FormData();
            Object.keys(expenseData).forEach(key => {
                if (expenseData[key] !== undefined) {
                    formData.append(key, typeof expenseData[key] === 'object' ? 
                        JSON.stringify(expenseData[key]) : expenseData[key]);
                }
            });
            formData.append('receipt', receiptFile);
            return this.uploadFile(`/expenses/${id}`, formData);
        } else {
            return this.put(`/expenses/${id}`, expenseData);
        }
    }

    async deleteExpense(id, reason = '') {
        return this.delete(`/expenses/${id}`, { reason });
    }

    async approveExpense(id, notes = '') {
        return this.post(`/expenses/${id}/approve`, { notes });
    }

    async rejectExpense(id, reason) {
        return this.post(`/expenses/${id}/reject`, { reason });
    }

    async addExpenseNote(id, note) {
        return this.post(`/expenses/${id}/notes`, { note });
    }

    async importExpenses(csvFile) {
        const formData = new FormData();
        formData.append('importFile', csvFile);
        return this.uploadFile('/expenses/import', formData);
    }

    async exportExpenses(filters = {}) {
        return this.get('/expenses/export', filters);
    }
}

// Invoice API
class InvoiceAPI extends BaseAPI {
    async getInvoices(params = {}) {
        return this.get('/invoices', params);
    }

    async getInvoiceStats(dateFilter = {}) {
        return this.get('/invoices/stats', dateFilter);
    }

    async getInvoice(id) {
        return this.get(`/invoices/${id}`);
    }

    async getOverdueInvoices() {
        return this.get('/invoices/overdue');
    }

    async getInvoiceTemplate(type) {
        return this.get(`/invoices/templates/${type}`);
    }

    async createSalesInvoice(saleId) {
        return this.post('/invoices/sales', { saleId });
    }

    async createServiceAcknowledgement(serviceId) {
        return this.post('/invoices/service-acknowledgement', { serviceId });
    }

    async createServiceCompletionInvoice(serviceId) {
        return this.post('/invoices/service-completion', { serviceId });
    }

    async updateInvoice(id, invoiceData) {
        return this.put(`/invoices/${id}`, invoiceData);
    }

    async deleteInvoice(id, reason = '') {
        return this.delete(`/invoices/${id}`, { reason });
    }

    async updateInvoiceStatus(id, status, reason = '') {
        return this.patch(`/invoices/${id}/status`, { status, reason });
    }

    async recordPayment(id, paymentData) {
        return this.post(`/invoices/${id}/payment`, paymentData);
    }

    async processRefund(id, refundAmount, reason = '') {
        return this.post(`/invoices/${id}/refund`, { refundAmount, reason });
    }

    async sendInvoice(id, recipientEmail) {
        return this.post(`/invoices/${id}/send`, { recipientEmail });
    }

    async exportInvoices(filters = {}) {
        return this.get('/invoices/export', filters);
    }
}

// Loading state manager
class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.callbacks = new Map();
    }

    setLoading(key, isLoading) {
        this.loadingStates.set(key, isLoading);
        const callbacks = this.callbacks.get(key) || [];
        callbacks.forEach(callback => callback(isLoading));
    }

    isLoading(key) {
        return this.loadingStates.get(key) || false;
    }

    onLoadingChange(key, callback) {
        if (!this.callbacks.has(key)) {
            this.callbacks.set(key, []);
        }
        this.callbacks.get(key).push(callback);
    }

    removeCallback(key, callback) {
        const callbacks = this.callbacks.get(key) || [];
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
}

// Error handler utility
class ErrorHandler {
    static handle(error, context = '') {
        console.error(`API Error ${context}:`, error);
        
        // Show user-friendly error messages
        if (error.message) {
            this.showError(error.message);
        } else {
            this.showError('An unexpected error occurred. Please try again.');
        }
    }

    static showError(message) {
        // This can be integrated with your notification system
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            console.error('Error:', message);
        }
    }

    static showSuccess(message) {
        // This can be integrated with your notification system
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }
}

// Cache manager for API responses
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    }

    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, value);
        this.ttl.set(key, Date.now() + ttl);
    }

    get(key) {
        const expiry = this.ttl.get(key);
        if (expiry && Date.now() > expiry) {
            this.cache.delete(key);
            this.ttl.delete(key);
            return null;
        }
        return this.cache.get(key);
    }

    clear(pattern = null) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    this.cache.delete(key);
                    this.ttl.delete(key);
                }
            }
        } else {
            this.cache.clear();
            this.ttl.clear();
        }
    }

    has(key) {
        return this.cache.has(key) && this.ttl.get(key) > Date.now();
    }
}

// Initialize API instances
const api = {
    auth: new AuthAPI(),
    customers: new CustomerAPI(),
    watches: new WatchAPI(),
    sales: new SalesAPI(),
    services: new ServiceAPI(),
    expenses: new ExpenseAPI(),
    invoices: new InvoiceAPI()
};

// Initialize utilities
const loadingManager = new LoadingManager();
const cacheManager = new CacheManager();

// Helper functions for common operations
const apiHelpers = {
    // Set loading state with automatic cleanup
    async withLoading(key, apiCall) {
        loadingManager.setLoading(key, true);
        try {
            const result = await apiCall();
            return result;
        } finally {
            loadingManager.setLoading(key, false);
        }
    },

    // Cache API response
    async withCache(key, apiCall, ttl) {
        if (cacheManager.has(key)) {
            return cacheManager.get(key);
        }
        
        const result = await apiCall();
        if (result.success) {
            cacheManager.set(key, result, ttl);
        }
        return result;
    },

    // Combined loading and cache
    async withLoadingAndCache(loadingKey, cacheKey, apiCall, ttl) {
        return this.withLoading(loadingKey, () => 
            this.withCache(cacheKey, apiCall, ttl)
        );
    },

    // Handle API response with UI updates
    handleResponse(response, successMessage = null) {
        if (response.success) {
            if (successMessage) {
                ErrorHandler.showSuccess(successMessage);
            }
            return response.data;
        } else {
            ErrorHandler.handle(response, 'API Call');
            return null;
        }
    },

    // Format error for display
    formatError(error) {
        if (typeof error === 'string') {
            return error;
        } else if (error && error.message) {
            return error.message;
        } else {
            return 'An unexpected error occurred';
        }
    },

    // Clear all caches
    clearAllCaches() {
        cacheManager.clear();
    },

    // Clear specific cache pattern
    clearCache(pattern) {
        cacheManager.clear(pattern);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        api, 
        loadingManager, 
        cacheManager, 
        apiHelpers, 
        ErrorHandler,
        APIResponse 
    };
} else {
    // Browser environment
    window.api = api;
    window.loadingManager = loadingManager;
    window.cacheManager = cacheManager;
    window.apiHelpers = apiHelpers;
    window.ErrorHandler = ErrorHandler;
    window.APIResponse = APIResponse;
}