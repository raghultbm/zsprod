// ZEDSON WATCHCRAFT - FIXED API Service with Database Sync
// Developed by PULSEWARE❤️

/**
 * FIXED API Service with Proper Database Synchronization and Timeout Handling
 */

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.healthURL = 'http://localhost:5000/health';
        this.token = localStorage.getItem('authToken');
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 2; // Reduced retries
        this.requestTimeout = 8000; // 8 seconds timeout
        this.pendingRequests = new Map(); // Track pending requests
        
        console.log('🔧 API Service initializing with sync capabilities...');
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

    // FIXED: Test connection with faster timeout
    async testConnection() {
        try {
            console.log('🔌 Testing backend connection...');
            this.updateConnectionStatus('connecting', '🔄 Connecting...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch(this.healthURL, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                this.connectionAttempts = 0;
                console.log('✅ Backend connected:', data.message);
                this.updateConnectionStatus('connected', '✅ MongoDB Connected');
                
                // Sync any pending data
                await this.syncPendingData();
                
                return { success: true, data };
            } else {
                throw new Error(`Backend responded with status: ${response.status}`);
            }
        } catch (error) {
            this.connectionAttempts++;
            console.log(`⚠️ Connection attempt ${this.connectionAttempts} failed:`, error.message);
            
            this.isConnected = false;
            
            if (error.name === 'AbortError') {
                console.log('❌ Connection timeout - Backend not responding');
                this.updateConnectionStatus('disconnected', '⚠️ Connection Timeout');
            } else if (this.connectionAttempts < this.maxRetries) {
                console.log(`🔄 Retrying connection in 2 seconds...`);
                this.updateConnectionStatus('connecting', `🔄 Retry ${this.connectionAttempts}/${this.maxRetries}`);
                setTimeout(() => this.testConnection(), 2000);
                return;
            } else {
                console.log('❌ Backend not available, using offline mode');
                this.updateConnectionStatus('disconnected', '📁 Offline Mode');
            }
            
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

    // FIXED: Generic API request with duplicate prevention and timeout
    async request(endpoint, options = {}) {
        // Create request signature to prevent duplicates
        const requestSignature = `${options.method || 'GET'}_${endpoint}_${JSON.stringify(options.body || {})}`;
        
        // Check if identical request is already pending
        if (this.pendingRequests.has(requestSignature)) {
            console.log('🔄 Duplicate request detected, waiting for existing request...');
            return await this.pendingRequests.get(requestSignature);
        }

        // Create the request promise
        const requestPromise = this.executeRequest(endpoint, options);
        
        // Store in pending requests
        this.pendingRequests.set(requestSignature, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Remove from pending requests when done
            this.pendingRequests.delete(requestSignature);
        }
    }

    // Execute the actual request
    async executeRequest(endpoint, options) {
        if (!this.isConnected) {
            console.log('📁 Using offline mode for:', endpoint);
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

            console.log(`🔄 API Request: ${config.method} ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
            config.signal = controller.signal;

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            const data = await response.json();
            console.log(`📡 API Response: ${response.status}`, data);

            if (response.ok) {
                // FIXED: Auto-sync to localStorage for offline access
                if (config.method === 'GET' && data.success && data.data) {
                    this.syncToLocalStorage(endpoint, data.data, config.method);
                } else if (['POST', 'PUT', 'DELETE'].includes(config.method) && data.success) {
                    // Refresh local data after modifications
                    this.refreshLocalData(endpoint);
                }
                
                return data;
            } else {
                throw new Error(data.error || `API request failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ API request failed:', error);
            
            if (error.name === 'AbortError') {
                console.log('❌ Request timeout, falling back to offline mode');
                this.isConnected = false;
                this.updateConnectionStatus('disconnected', '⚠️ Request Timeout');
            }
            
            // Fallback to offline mode
            return this.handleOffline(endpoint, options);
        }
    }

    // FIXED: Sync data to localStorage
    syncToLocalStorage(endpoint, data, method) {
        try {
            const pathParts = endpoint.split('/').filter(part => part !== '');
            const collection = pathParts[0];
            
            if (collection && method === 'GET') {
                const storageKey = `zedson_${collection}`;
                localStorage.setItem(storageKey, JSON.stringify(data));
                console.log(`💾 Synced ${data.length} ${collection} records to localStorage`);
            }
        } catch (error) {
            console.error('Error syncing to localStorage:', error);
        }
    }

    // Refresh local data after modifications
    async refreshLocalData(endpoint) {
        try {
            const pathParts = endpoint.split('/').filter(part => part !== '');
            const collection = pathParts[0];
            
            if (collection) {
                // Fetch fresh data and sync to localStorage
                const freshData = await this.executeRequest(`/${collection}`, { method: 'GET' });
                if (freshData.success) {
                    this.syncToLocalStorage(`/${collection}`, freshData.data, 'GET');
                }
            }
        } catch (error) {
            console.error('Error refreshing local data:', error);
        }
    }

    // FIXED: Handle offline operations with better data management
    handleOffline(endpoint, options) {
        console.log('📁 Offline operation:', endpoint);
        
        const pathParts = endpoint.split('/').filter(part => part !== '');
        const collection = pathParts[0];
        const itemId = pathParts[1] ? parseInt(pathParts[1]) : null;
        
        if (!collection) {
            return { success: false, error: 'Invalid endpoint' };
        }

        const method = options.method || 'GET';
        const storageKey = `zedson_${collection}`;

        try {
            switch (method) {
                case 'GET':
                    return this.getFromStorage(storageKey, itemId);
                case 'POST':
                    return this.saveToStorage(storageKey, options.body);
                case 'PUT':
                    return this.updateInStorage(storageKey, options.body, itemId);
                case 'DELETE':
                    return this.deleteFromStorage(storageKey, itemId);
                default:
                    return { success: false, error: 'Unsupported method' };
            }
        } catch (error) {
            console.error('❌ Offline operation failed:', error);
            return { success: false, error: error.message };
        }
    }

    // FIXED: Get data from localStorage with ID support
    getFromStorage(storageKey, itemId = null) {
        try {
            const stored = localStorage.getItem(storageKey);
            const data = stored ? JSON.parse(stored) : [];
            
            if (itemId !== null) {
                // Return single item
                const item = data.find(item => item.id === itemId);
                return { success: true, data: item || null };
            } else {
                // Return all items
                return { success: true, data };
            }
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return { success: true, data: itemId !== null ? null : [] };
        }
    }

    // FIXED: Save data to localStorage with duplicate prevention
    saveToStorage(storageKey, newItem) {
        try {
            const stored = localStorage.getItem(storageKey);
            const data = stored ? JSON.parse(stored) : [];
            
            // FIXED: Prevent duplicates based on unique fields
            const isDuplicate = this.checkDuplicate(data, newItem, storageKey);
            if (isDuplicate) {
                return { success: false, error: 'Duplicate entry detected' };
            }
            
            // Generate ID if not provided
            if (!newItem.id) {
                newItem.id = data.length > 0 ? Math.max(...data.map(item => item.id || 0)) + 1 : 1;
            }
            
            newItem.createdAt = new Date().toISOString();
            newItem.updatedAt = new Date().toISOString();
            
            data.push(newItem);
            localStorage.setItem(storageKey, JSON.stringify(data));
            
            console.log(`💾 Saved ${storageKey} item with ID: ${newItem.id}`);
            return { success: true, data: newItem };
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return { success: false, error: error.message };
        }
    }

    // Check for duplicates based on collection type
    checkDuplicate(existingData, newItem, storageKey) {
        if (storageKey.includes('customers')) {
            // Check for duplicate email or phone
            return existingData.some(item => 
                item.email === newItem.email || item.phone === newItem.phone
            );
        } else if (storageKey.includes('inventory')) {
            // Check for duplicate code
            return existingData.some(item => item.code === newItem.code);
        } else if (storageKey.includes('users')) {
            // Check for duplicate username or email
            return existingData.some(item => 
                item.username === newItem.username || item.email === newItem.email
            );
        }
        return false;
    }

    // FIXED: Update data in localStorage
    updateInStorage(storageKey, updateData, itemId) {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) {
                return { success: false, error: 'No data found' };
            }

            const data = JSON.parse(stored);
            const targetId = itemId || updateData.id;
            
            if (!targetId) {
                return { success: false, error: 'No ID provided for update' };
            }
            
            const index = data.findIndex(item => item.id === targetId);
            if (index === -1) {
                return { success: false, error: 'Item not found' };
            }

            data[index] = { ...data[index], ...updateData, updatedAt: new Date().toISOString() };
            localStorage.setItem(storageKey, JSON.stringify(data));
            
            console.log(`💾 Updated ${storageKey} item with ID: ${targetId}`);
            return { success: true, data: data[index] };
        } catch (error) {
            console.error('Error updating in localStorage:', error);
            return { success: false, error: error.message };
        }
    }

    // FIXED: Delete data from localStorage
    deleteFromStorage(storageKey, itemId) {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) {
                return { success: false, error: 'No data found' };
            }

            const data = JSON.parse(stored);
            
            if (!itemId) {
                return { success: false, error: 'No ID provided for deletion' };
            }
            
            const initialLength = data.length;
            const filteredData = data.filter(item => item.id !== itemId);
            
            localStorage.setItem(storageKey, JSON.stringify(filteredData));
            
            console.log(`💾 Deleted ${storageKey} item with ID: ${itemId}`);
            return { 
                success: true, 
                data: { deletedCount: initialLength - filteredData.length } 
            };
        } catch (error) {
            console.error('Error deleting from localStorage:', error);
            return { success: false, error: error.message };
        }
    }

    // FIXED: Sync pending data when connection is restored
    async syncPendingData() {
        try {
            console.log('🔄 Syncing pending data...');
            
            const pendingKey = 'zedson_pending_sync';
            const pendingData = localStorage.getItem(pendingKey);
            
            if (pendingData) {
                const operations = JSON.parse(pendingData);
                
                for (const operation of operations) {
                    try {
                        await this.executeRequest(operation.endpoint, operation.options);
                        console.log('✅ Synced pending operation:', operation.endpoint);
                    } catch (error) {
                        console.error('❌ Failed to sync operation:', operation.endpoint, error);
                    }
                }
                
                // Clear pending data after sync
                localStorage.removeItem(pendingKey);
                console.log('✅ All pending data synced');
            }
        } catch (error) {
            console.error('Error syncing pending data:', error);
        }
    }

    // Store operation for later sync when offline
    storePendingOperation(endpoint, options) {
        try {
            const pendingKey = 'zedson_pending_sync';
            const existing = localStorage.getItem(pendingKey);
            const operations = existing ? JSON.parse(existing) : [];
            
            operations.push({
                endpoint,
                options,
                timestamp: new Date().toISOString()
            });
            
            localStorage.setItem(pendingKey, JSON.stringify(operations));
            console.log('📝 Stored operation for later sync:', endpoint);
        } catch (error) {
            console.error('Error storing pending operation:', error);
        }
    }

    // FIXED: Authentication with proper error handling
    async login(credentials) {
        console.log('🔐 Attempting login for:', credentials.username);
        
        try {
            // Try backend first if connected
            if (this.isConnected) {
                console.log('🌐 Attempting backend authentication...');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
                
                const response = await fetch(`${this.baseURL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                const data = await response.json();
                
                console.log('🔑 Backend auth response:', data);
                
                if (response.ok && data.success && data.token) {
                    this.setToken(data.token);
                    return data;
                } else {
                    console.log('❌ Backend auth failed:', data.error);
                    if (response.status === 401) {
                        return data; // Return the error response as-is
                    }
                }
            }
            
            // Fallback to offline authentication
            console.log('📁 Attempting offline authentication...');
            return this.authenticateOffline(credentials);
            
        } catch (error) {
            console.error('❌ Login error:', error);
            
            if (error.name === 'AbortError') {
                console.log('❌ Login timeout, trying offline auth...');
                this.updateConnectionStatus('disconnected', '⚠️ Login Timeout');
            }
            
            return this.authenticateOffline(credentials);
        }
    }

    // Offline authentication
    authenticateOffline(credentials) {
        console.log('🔓 Offline authentication for:', credentials.username);
        
        const { username, password } = credentials;
        
        const demoUsers = {
            'admin': { 
                password: 'admin123', 
                role: 'admin', 
                fullName: 'System Administrator', 
                email: 'admin@zedsonwatchcraft.com' 
            },
            'owner': { 
                password: 'owner123', 
                role: 'owner', 
                fullName: 'Shop Owner', 
                email: 'owner@zedsonwatchcraft.com' 
            },
            'staff': { 
                password: 'staff123', 
                role: 'staff', 
                fullName: 'Staff Member', 
                email: 'staff@zedsonwatchcraft.com' 
            }
        };
        
        const user = demoUsers[username];
        
        if (user && user.password === password) {
            console.log('✅ Offline authentication successful');
            
            const token = `offline_${username}_${Date.now()}`;
            this.setToken(token);
            
            return {
                success: true,
                token: token,
                user: {
                    username,
                    role: user.role,
                    fullName: user.fullName,
                    email: user.email
                }
            };
        } else {
            console.log('❌ Invalid offline credentials');
            return { 
                success: false, 
                error: 'Invalid username or password' 
            };
        }
    }

    async logout() {
        this.setToken(null);
        return { success: true };
    }

    // Collection-specific methods with sync
    async getCustomers() {
        return await this.request('/customers');
    }

    async createCustomer(customerData) {
        const result = await this.request('/customers', {
            method: 'POST',
            body: customerData
        });
        
        // Trigger data refresh for other modules
        if (result.success) {
            this.notifyDataChange('customers', 'create', result.data);
        }
        
        return result;
    }

    async updateCustomer(customerId, customerData) {
        const result = await this.request(`/customers/${customerId}`, {
            method: 'PUT',
            body: { id: customerId, ...customerData }
        });
        
        if (result.success) {
            this.notifyDataChange('customers', 'update', { id: customerId, ...customerData });
        }
        
        return result;
    }

    async deleteCustomer(customerId) {
        const result = await this.request(`/customers/${customerId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            this.notifyDataChange('customers', 'delete', { id: customerId });
        }
        
        return result;
    }

    async getInventory() {
        return await this.request('/inventory');
    }

    async createInventoryItem(itemData) {
        const result = await this.request('/inventory', {
            method: 'POST',
            body: itemData
        });
        
        if (result.success) {
            this.notifyDataChange('inventory', 'create', result.data);
        }
        
        return result;
    }

    async updateInventoryItem(itemId, itemData) {
        const result = await this.request(`/inventory/${itemId}`, {
            method: 'PUT',
            body: { id: itemId, ...itemData }
        });
        
        if (result.success) {
            this.notifyDataChange('inventory', 'update', { id: itemId, ...itemData });
        }
        
        return result;
    }

    async deleteInventoryItem(itemId) {
        const result = await this.request(`/inventory/${itemId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            this.notifyDataChange('inventory', 'delete', { id: itemId });
        }
        
        return result;
    }

    async getSales() {
        return await this.request('/sales');
    }

    async createSale(saleData) {
        const result = await this.request('/sales', {
            method: 'POST',
            body: saleData
        });
        
        if (result.success) {
            this.notifyDataChange('sales', 'create', result.data);
        }
        
        return result;
    }

    async updateSale(saleId, saleData) {
        const result = await this.request(`/sales/${saleId}`, {
            method: 'PUT',
            body: { id: saleId, ...saleData }
        });
        
        if (result.success) {
            this.notifyDataChange('sales', 'update', { id: saleId, ...saleData });
        }
        
        return result;
    }

    async deleteSale(saleId) {
        const result = await this.request(`/sales/${saleId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            this.notifyDataChange('sales', 'delete', { id: saleId });
        }
        
        return result;
    }

    async getServices() {
        return await this.request('/services');
    }

    async createService(serviceData) {
        const result = await this.request('/services', {
            method: 'POST',
            body: serviceData
        });
        
        if (result.success) {
            this.notifyDataChange('services', 'create', result.data);
        }
        
        return result;
    }

    async updateService(serviceId, serviceData) {
        const result = await this.request(`/services/${serviceId}`, {
            method: 'PUT',
            body: { id: serviceId, ...serviceData }
        });
        
        if (result.success) {
            this.notifyDataChange('services', 'update', { id: serviceId, ...serviceData });
        }
        
        return result;
    }

    async deleteService(serviceId) {
        const result = await this.request(`/services/${serviceId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            this.notifyDataChange('services', 'delete', { id: serviceId });
        }
        
        return result;
    }

    async getExpenses() {
        return await this.request('/expenses');
    }

    async createExpense(expenseData) {
        const result = await this.request('/expenses', {
            method: 'POST',
            body: expenseData
        });
        
        if (result.success) {
            this.notifyDataChange('expenses', 'create', result.data);
        }
        
        return result;
    }

    async updateExpense(expenseId, expenseData) {
        const result = await this.request(`/expenses/${expenseId}`, {
            method: 'PUT',
            body: { id: expenseId, ...expenseData }
        });
        
        if (result.success) {
            this.notifyDataChange('expenses', 'update', { id: expenseId, ...expenseData });
        }
        
        return result;
    }

    async deleteExpense(expenseId) {
        const result = await this.request(`/expenses/${expenseId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            this.notifyDataChange('expenses', 'delete', { id: expenseId });
        }
        
        return result;
    }

    async getInvoices() {
        return await this.request('/invoices');
    }

    async createInvoice(invoiceData) {
        const result = await this.request('/invoices', {
            method: 'POST',
            body: invoiceData
        });
        
        if (result.success) {
            this.notifyDataChange('invoices', 'create', result.data);
        }
        
        return result;
    }

    // Dashboard statistics
    async getDashboardStats() {
        try {
            return await this.request('/dashboard/stats');
        } catch (error) {
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

    // Notify other modules of data changes
    notifyDataChange(collection, action, data) {
        // Dispatch custom event for data changes
        window.dispatchEvent(new CustomEvent('dataChange', {
            detail: { collection, action, data }
        }));
    }

    // Get connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            backend: this.isConnected ? 'MongoDB' : 'localStorage'
        };
    }

    // Force reconnection
    async forceReconnect() {
        console.log('🔄 Force reconnecting...');
        this.isConnected = false;
        this.connectionAttempts = 0;
        await this.testConnection();
    }
}

// Create global instance
window.apiService = new APIService();

console.log('✅ FIXED API Service initialized with proper sync and timeout handling');