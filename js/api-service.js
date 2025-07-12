// File: js/api-service.js
// ZEDSON WATCHCRAFT - Offline API Service Module
// Developed by PULSEWARE❤️

/**
 * Offline API Service - NO INTERNET REQUIRED
 * All operations work locally using localStorage
 */

console.log('🔧 OFFLINE API SERVICE LOADED - No internet required!');

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.healthURL = 'http://localhost:5000/health';
        this.token = localStorage.getItem('authToken');
        this.connectionTested = false;
        this.isConnected = false;
        this.offlineMode = true; // Always start in offline mode
        
        console.log('🏠 API Service initialized in OFFLINE mode');
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

    // Test connection - Always returns false in offline mode
    async testConnection() {
        console.log('🔌 Skipping connection test - running in offline mode');
        this.connectionTested = true;
        this.isConnected = false;
        return {
            success: false,
            message: 'Running in offline mode',
            offline: true
        };
    }

    // Generic API request method - OFFLINE VERSION
    async request(endpoint, options = {}) {
        console.log(`🏠 Offline API Request: ${options.method || 'GET'} ${endpoint}`);
        
        // All requests return offline mode message
        return {
            success: false,
            error: 'Running in offline mode. All data stored locally.',
            offline: true
        };
    }

    // Authentication methods - OFFLINE VERSION
    async login(credentials) {
        console.log('🔐 Offline login attempt');
        
        // Return offline message - actual authentication handled by auth.js
        return {
            success: false,
            error: 'Using offline authentication',
            offline: true
        };
    }

    async logout() {
        this.setToken(null);
        console.log('🚪 Offline logout');
        return { success: true, offline: true };
    }

    // Generic CRUD methods - ALL RETURN OFFLINE MESSAGES
    async getAll(collection) {
        console.log(`📁 Offline mode: ${collection} data managed locally`);
        return {
            success: false,
            error: `${collection} managed locally in offline mode`,
            offline: true,
            data: []
        };
    }

    async getById(collection, id) {
        console.log(`📁 Offline mode: ${collection}/${id} managed locally`);
        return {
            success: false,
            error: `${collection} managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async getOne(collection, query = {}) {
        console.log(`📁 Offline mode: ${collection} query managed locally`);
        return {
            success: false,
            error: `${collection} managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async create(collection, data) {
        console.log(`📁 Offline mode: Create ${collection} managed locally`);
        return {
            success: false,
            error: `${collection} creation managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async createMany(collection, documents) {
        console.log(`📁 Offline mode: Create multiple ${collection} managed locally`);
        return {
            success: false,
            error: `${collection} creation managed locally in offline mode`,
            offline: true,
            data: []
        };
    }

    async updateById(collection, id, data) {
        console.log(`📁 Offline mode: Update ${collection}/${id} managed locally`);
        return {
            success: false,
            error: `${collection} updates managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async updateOne(collection, query, update) {
        console.log(`📁 Offline mode: Update ${collection} managed locally`);
        return {
            success: false,
            error: `${collection} updates managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async updateMany(collection, query, update) {
        console.log(`📁 Offline mode: Update multiple ${collection} managed locally`);
        return {
            success: false,
            error: `${collection} updates managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async deleteById(collection, id) {
        console.log(`📁 Offline mode: Delete ${collection}/${id} managed locally`);
        return {
            success: false,
            error: `${collection} deletion managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async deleteOne(collection, query) {
        console.log(`📁 Offline mode: Delete ${collection} managed locally`);
        return {
            success: false,
            error: `${collection} deletion managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async deleteMany(collection, query) {
        console.log(`📁 Offline mode: Delete multiple ${collection} managed locally`);
        return {
            success: false,
            error: `${collection} deletion managed locally in offline mode`,
            offline: true,
            data: null
        };
    }

    async search(collection, searchTerm, field = null, limit = 50) {
        console.log(`📁 Offline mode: Search ${collection} managed locally`);
        return {
            success: false,
            error: `${collection} search managed locally in offline mode`,
            offline: true,
            data: []
        };
    }

    // Special endpoints - OFFLINE VERSION
    async getDashboardStats() {
        console.log('📊 Offline mode: Dashboard stats calculated locally');
        return {
            success: false,
            error: 'Dashboard stats calculated locally in offline mode',
            offline: true,
            data: {
                totalWatches: 0,
                totalCustomers: 0,
                totalSales: 0,
                totalServices: 0,
                incompleteServices: 0,
                totalInvoices: 0,
                todayRevenue: 0
            }
        };
    }

    async exportAllData() {
        console.log('📦 Offline mode: Export managed locally');
        return {
            success: false,
            error: 'Data export managed locally in offline mode',
            offline: true,
            data: null
        };
    }

    async initializeAdmin() {
        console.log('👤 Offline mode: Admin initialization not needed');
        return {
            success: false,
            error: 'Admin management in offline mode',
            offline: true
        };
    }

    async initializeSampleData() {
        console.log('🌱 Offline mode: Sample data managed locally');
        return {
            success: false,
            error: 'Sample data managed locally in offline mode',
            offline: true
        };
    }

    async getRevenueAnalytics(params = {}) {
        console.log('💰 Offline mode: Revenue analytics calculated locally');
        return {
            success: false,
            error: 'Revenue analytics calculated locally in offline mode',
            offline: true,
            data: {
                sales: [],
                services: [],
                expenses: [],
                analytics: {
                    salesRevenue: 0,
                    servicesRevenue: 0,
                    totalRevenue: 0,
                    expensesAmount: 0,
                    netAmount: 0,
                    totalTransactions: 0
                }
            }
        };
    }

    async getCustomerAnalytics() {
        console.log('👥 Offline mode: Customer analytics calculated locally');
        return {
            success: false,
            error: 'Customer analytics calculated locally in offline mode',
            offline: true,
            data: {
                customers: [],
                topCustomers: [],
                totalCustomers: 0,
                activeCustomers: 0
            }
        };
    }

    async getInventoryAnalytics() {
        console.log('📦 Offline mode: Inventory analytics calculated locally');
        return {
            success: false,
            error: 'Inventory analytics calculated locally in offline mode',
            offline: true,
            data: {
                summary: {
                    totalItems: 0,
                    totalValue: 0,
                    availableItems: 0,
                    soldItems: 0,
                    lowStockItems: 0
                },
                brandAnalytics: {},
                outletAnalytics: {},
                lowStockItems: []
            }
        };
    }

    // Backup and restore methods - OFFLINE VERSION
    async backupCollection(collection, data) {
        console.log(`💾 Offline mode: ${collection} backup managed locally`);
        return {
            success: false,
            error: `${collection} backup managed locally in offline mode`,
            offline: true
        };
    }

    async importCollection(collection, data) {
        console.log(`📥 Offline mode: ${collection} import managed locally`);
        return {
            success: false,
            error: `${collection} import managed locally in offline mode`,
            offline: true
        };
    }

    // Collection-specific methods - ALL OFFLINE VERSIONS
    
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

    // Connection status - ALWAYS OFFLINE
    getConnectionStatus() {
        return {
            tested: true,
            connected: false,
            offline: true
        };
    }
}

// Create global instance
window.apiService = new APIService();

// Export for use in other modules
window.APIService = APIService;

console.log('✅ Offline API Service initialized - no internet required!');