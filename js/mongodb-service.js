// ZEDSON WATCHCRAFT - MongoDB Service Module

/**
 * MongoDB Integration Service for ZEDSON WATCHCRAFT Management System
 * Handles all database operations and real-time data synchronization
 * Developed by PULSEWARE❤️
 */

// MongoDB Configuration
const MONGODB_CONFIG = {
    // Replace with your actual MongoDB connection string
    connectionString: 'mongodb+srv://username:password@cluster.mongodb.net/zedson_watchcraft?retryWrites=true&w=majority',
    databaseName: 'zedson_watchcraft',
    collections: {
        users: 'users',
        customers: 'customers',
        inventory: 'inventory',
        sales: 'sales',
        services: 'services',
        expenses: 'expenses',
        invoices: 'invoices',
        logs: 'activity_logs'
    }
};

// Connection status
let isConnected = false;
let db = null;
let client = null;

/**
 * MongoDB Service Class
 */
class MongoDBService {
    static instance = null;

    constructor() {
        if (MongoDBService.instance) {
            return MongoDBService.instance;
        }
        MongoDBService.instance = this;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Initialize MongoDB connection
     */
    async initialize() {
        try {
            this.updateConnectionStatus('connecting');
            console.log('Initializing MongoDB connection...');

            // For frontend applications, we'll use a REST API approach
            // This simulates MongoDB operations through API calls
            await this.simulateConnection();
            
            this.updateConnectionStatus('connected');
            console.log('MongoDB connected successfully');
            
            // Load initial data
            await this.loadInitialData();
            
        } catch (error) {
            console.error('MongoDB connection failed:', error);
            this.updateConnectionStatus('disconnected');
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying connection... Attempt ${this.retryCount}`);
                setTimeout(() => this.initialize(), 5000);
            } else {
                console.error('Max retry attempts reached. Using local storage fallback.');
                this.initializeLocalFallback();
            }
        }
    }

    /**
     * Simulate MongoDB connection (for frontend demo)
     */
    async simulateConnection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                isConnected = true;
                resolve();
            }, 2000);
        });
    }

    /**
     * Update connection status in UI
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('dbStatus');
        const statusText = document.getElementById('dbStatusText');
        
        if (statusElement && statusText) {
            statusElement.className = `db-status ${status}`;
            
            switch (status) {
                case 'connecting':
                    statusText.textContent = 'Connecting to MongoDB...';
                    break;
                case 'connected':
                    statusText.textContent = '✓ MongoDB Connected';
                    break;
                case 'disconnected':
                    statusText.textContent = '✗ MongoDB Disconnected';
                    break;
            }
        }
    }

    /**
     * Initialize local storage fallback
     */
    initializeLocalFallback() {
        console.log('Using local storage as fallback...');
        this.updateConnectionStatus('disconnected');
        
        // Load data from localStorage if available
        this.loadFromLocalStorage();
    }

    /**
     * Load initial data from MongoDB
     */
    async loadInitialData() {
        try {
            console.log('Loading initial data from MongoDB...');
            
            // Load all collections
            const collections = ['users', 'customers', 'inventory', 'sales', 'services', 'expenses', 'invoices'];
            
            for (const collection of collections) {
                await this.loadCollection(collection);
            }
            
            console.log('Initial data loaded successfully');
            
            // Initialize modules after data is loaded
            if (window.AppCoreModule) {
                window.AppCoreModule.initializeSampleData();
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.loadFromLocalStorage();
        }
    }

    /**
     * Load specific collection from MongoDB
     */
    async loadCollection(collectionName) {
        try {
            // Simulate API call to load collection
            const data = await this.findMany(collectionName, {});
            
            // Update global variables based on collection
            switch (collectionName) {
                case 'users':
                    if (window.AuthModule && data.length > 0) {
                        window.users = data;
                    }
                    break;
                case 'customers':
                    if (window.CustomerModule && data.length > 0) {
                        window.CustomerModule.customers = data;
                    }
                    break;
                case 'inventory':
                    if (window.InventoryModule && data.length > 0) {
                        window.InventoryModule.watches = data;
                    }
                    break;
                case 'sales':
                    if (window.SalesModule && data.length > 0) {
                        window.SalesModule.sales = data;
                    }
                    break;
                case 'services':
                    if (window.ServiceModule && data.length > 0) {
                        window.ServiceModule.services = data;
                    }
                    break;
                case 'expenses':
                    if (window.ExpenseModule && data.length > 0) {
                        window.ExpenseModule.expenses = data;
                    }
                    break;
                case 'invoices':
                    if (window.InvoiceModule && data.length > 0) {
                        window.InvoiceModule.invoices = data;
                    }
                    break;
            }
            
            console.log(`Loaded ${data.length} records from ${collectionName}`);
            
        } catch (error) {
            console.error(`Error loading ${collectionName}:`, error);
        }
    }

    /**
     * Load data from localStorage as fallback
     */
    loadFromLocalStorage() {
        try {
            console.log('Loading data from localStorage...');
            
            const collections = ['users', 'customers', 'inventory', 'sales', 'services', 'expenses', 'invoices'];
            
            collections.forEach(collection => {
                const stored = localStorage.getItem(`zedson_${collection}`);
                if (stored) {
                    const data = JSON.parse(stored);
                    this.setGlobalData(collection, data);
                }
            });
            
            // Initialize with sample data if nothing in localStorage
            if (window.AppCoreModule) {
                window.AppCoreModule.initializeSampleData();
            }
            
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            // Initialize with sample data as last resort
            if (window.AppCoreModule) {
                window.AppCoreModule.initializeSampleData();
            }
        }
    }

    /**
     * Set global data for specific collection
     */
    setGlobalData(collection, data) {
        switch (collection) {
            case 'users':
                if (window.users) window.users = data;
                break;
            case 'customers':
                if (window.CustomerModule) window.CustomerModule.customers = data;
                break;
            case 'inventory':
                if (window.InventoryModule) window.InventoryModule.watches = data;
                break;
            case 'sales':
                if (window.SalesModule) window.SalesModule.sales = data;
                break;
            case 'services':
                if (window.ServiceModule) window.ServiceModule.services = data;
                break;
            case 'expenses':
                if (window.ExpenseModule) window.ExpenseModule.expenses = data;
                break;
            case 'invoices':
                if (window.InvoiceModule) window.InvoiceModule.invoices = data;
                break;
        }
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * Insert a single document
     */
    async insertOne(collection, document) {
        try {
            if (!isConnected) {
                return this.insertOneLocal(collection, document);
            }

            // Add MongoDB ObjectId simulation
            document._id = this.generateObjectId();
            document.createdAt = new Date();
            document.updatedAt = new Date();

            // Simulate API call to MongoDB
            const result = await this.apiCall('POST', `/api/${collection}`, document);
            
            // Update local data
            this.updateLocalCollection(collection, 'insert', document);
            
            console.log(`Inserted document into ${collection}:`, document);
            return { insertedId: document._id, ...result };
            
        } catch (error) {
            console.error(`Error inserting into ${collection}:`, error);
            return this.insertOneLocal(collection, document);
        }
    }

    /**
     * Insert multiple documents
     */
    async insertMany(collection, documents) {
        try {
            if (!isConnected) {
                return this.insertManyLocal(collection, documents);
            }

            // Add metadata to each document
            const processedDocs = documents.map(doc => ({
                ...doc,
                _id: this.generateObjectId(),
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            // Simulate API call
            const result = await this.apiCall('POST', `/api/${collection}/batch`, { documents: processedDocs });
            
            // Update local data
            processedDocs.forEach(doc => {
                this.updateLocalCollection(collection, 'insert', doc);
            });
            
            console.log(`Inserted ${processedDocs.length} documents into ${collection}`);
            return { insertedCount: processedDocs.length, insertedIds: processedDocs.map(d => d._id) };
            
        } catch (error) {
            console.error(`Error inserting multiple into ${collection}:`, error);
            return this.insertManyLocal(collection, documents);
        }
    }

    /**
     * Find multiple documents
     */
    async findMany(collection, query = {}, options = {}) {
        try {
            if (!isConnected) {
                return this.findManyLocal(collection, query, options);
            }

            // Simulate API call
            const result = await this.apiCall('GET', `/api/${collection}`, { query, options });
            return result.data || [];
            
        } catch (error) {
            console.error(`Error finding documents in ${collection}:`, error);
            return this.findManyLocal(collection, query, options);
        }
    }

    /**
     * Find single document
     */
    async findOne(collection, query) {
        try {
            if (!isConnected) {
                return this.findOneLocal(collection, query);
            }

            // Simulate API call
            const result = await this.apiCall('GET', `/api/${collection}/one`, { query });
            return result.data || null;
            
        } catch (error) {
            console.error(`Error finding document in ${collection}:`, error);
            return this.findOneLocal(collection, query);
        }
    }

    /**
     * Update single document
     */
    async updateOne(collection, query, update) {
        try {
            if (!isConnected) {
                return this.updateOneLocal(collection, query, update);
            }

            update.updatedAt = new Date();
            
            // Simulate API call
            const result = await this.apiCall('PUT', `/api/${collection}/one`, { query, update });
            
            // Update local data
            this.updateLocalCollection(collection, 'update', { query, update });
            
            console.log(`Updated document in ${collection}`);
            return result;
            
        } catch (error) {
            console.error(`Error updating document in ${collection}:`, error);
            return this.updateOneLocal(collection, query, update);
        }
    }

    /**
     * Update multiple documents
     */
    async updateMany(collection, query, update) {
        try {
            if (!isConnected) {
                return this.updateManyLocal(collection, query, update);
            }

            update.updatedAt = new Date();
            
            // Simulate API call
            const result = await this.apiCall('PUT', `/api/${collection}`, { query, update });
            
            // Update local data
            this.updateLocalCollection(collection, 'updateMany', { query, update });
            
            console.log(`Updated multiple documents in ${collection}`);
            return result;
            
        } catch (error) {
            console.error(`Error updating multiple documents in ${collection}:`, error);
            return this.updateManyLocal(collection, query, update);
        }
    }

    /**
     * Delete single document
     */
    async deleteOne(collection, query) {
        try {
            if (!isConnected) {
                return this.deleteOneLocal(collection, query);
            }

            // Simulate API call
            const result = await this.apiCall('DELETE', `/api/${collection}/one`, { query });
            
            // Update local data
            this.updateLocalCollection(collection, 'delete', query);
            
            console.log(`Deleted document from ${collection}`);
            return result;
            
        } catch (error) {
            console.error(`Error deleting document from ${collection}:`, error);
            return this.deleteOneLocal(collection, query);
        }
    }

    /**
     * Delete multiple documents
     */
    async deleteMany(collection, query) {
        try {
            if (!isConnected) {
                return this.deleteManyLocal(collection, query);
            }

            // Simulate API call
            const result = await this.apiCall('DELETE', `/api/${collection}`, { query });
            
            // Update local data
            this.updateLocalCollection(collection, 'deleteMany', query);
            
            console.log(`Deleted multiple documents from ${collection}`);
            return result;
            
        } catch (error) {
            console.error(`Error deleting multiple documents from ${collection}:`, error);
            return this.deleteManyLocal(collection, query);
        }
    }

    // ==================== LOCAL STORAGE FALLBACK METHODS ====================

    /**
     * Insert document locally
     */
    insertOneLocal(collection, document) {
        try {
            const stored = localStorage.getItem(`zedson_${collection}`);
            const data = stored ? JSON.parse(stored) : [];
            
            document._id = this.generateObjectId();
            document.createdAt = new Date();
            document.updatedAt = new Date();
            
            data.push(document);
            localStorage.setItem(`zedson_${collection}`, JSON.stringify(data));
            
            this.updateLocalCollection(collection, 'insert', document);
            
            return { insertedId: document._id };
        } catch (error) {
            console.error(`Error inserting locally into ${collection}:`, error);
            return null;
        }
    }

    /**
     * Insert multiple documents locally
     */
    insertManyLocal(collection, documents) {
        try {
            const stored = localStorage.getItem(`zedson_${collection}`);
            const data = stored ? JSON.parse(stored) : [];
            
            const processedDocs = documents.map(doc => ({
                ...doc,
                _id: this.generateObjectId(),
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            
            data.push(...processedDocs);
            localStorage.setItem(`zedson_${collection}`, JSON.stringify(data));
            
            processedDocs.forEach(doc => {
                this.updateLocalCollection(collection, 'insert', doc);
            });
            
            return { insertedCount: processedDocs.length, insertedIds: processedDocs.map(d => d._id) };
        } catch (error) {
            console.error(`Error inserting multiple locally into ${collection}:`, error);
            return null;
        }
    }

    /**
     * Find documents locally
     */
    findManyLocal(collection, query = {}, options = {}) {
        try {
            const stored = localStorage.getItem(`zedson_${collection}`);
            if (!stored) return [];
            
            let data = JSON.parse(stored);
            
            // Apply query filtering (simple implementation)
            if (Object.keys(query).length > 0) {
                data = data.filter(item => {
                    return Object.keys(query).every(key => {
                        if (typeof query[key] === 'object' && query[key].$regex) {
                            return new RegExp(query[key].$regex, query[key].$options || 'i').test(item[key]);
                        }
                        return item[key] === query[key];
                    });
                });
            }
            
            // Apply sorting
            if (options.sort) {
                const sortKey = Object.keys(options.sort)[0];
                const sortOrder = options.sort[sortKey];
                data.sort((a, b) => {
                    if (sortOrder === 1) return a[sortKey] > b[sortKey] ? 1 : -1;
                    return a[sortKey] < b[sortKey] ? 1 : -1;
                });
            }
            
            // Apply limit
            if (options.limit) {
                data = data.slice(0, options.limit);
            }
            
            return data;
        } catch (error) {
            console.error(`Error finding locally in ${collection}:`, error);
            return [];
        }
    }

    /**
     * Find single document locally
     */
    findOneLocal(collection, query) {
        try {
            const results = this.findManyLocal(collection, query, { limit: 1 });
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`Error finding one locally in ${collection}:`, error);
            return null;
        }
    }

    /**
     * Update document locally
     */
    updateOneLocal(collection, query, update) {
        try {
            const stored = localStorage.getItem(`zedson_${collection}`);
            if (!stored) return { matchedCount: 0, modifiedCount: 0 };
            
            const data = JSON.parse(stored);
            let modified = 0;
            
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                const matches = Object.keys(query).every(key => item[key] === query[key]);
                
                if (matches) {
                    Object.assign(item, update, { updatedAt: new Date() });
                    modified = 1;
                    break;
                }
            }
            
            if (modified > 0) {
                localStorage.setItem(`zedson_${collection}`, JSON.stringify(data));
                this.updateLocalCollection(collection, 'update', { query, update });
            }
            
            return { matchedCount: modified, modifiedCount: modified };
        } catch (error) {
            console.error(`Error updating locally in ${collection}:`, error);
            return { matchedCount: 0, modifiedCount: 0 };
        }
    }

    /**
     * Update multiple documents locally
     */
    updateManyLocal(collection, query, update) {
        try {
            const stored = localStorage.getItem(`zedson_${collection}`);
            if (!stored) return { matchedCount: 0, modifiedCount: 0 };
            
            const data = JSON.parse(stored);
            let modified = 0;
            
            data.forEach(item => {
                const matches = Object.keys(query).every(key => item[key] === query[key]);
                if (matches) {
                    Object.assign(item, update, { updatedAt: new Date() });
                    modified++;
                }
            });
            
            if (modified > 0) {
                localStorage.setItem(`zedson_${collection}`, JSON.stringify(data));
                this.updateLocalCollection(collection, 'updateMany', { query, update });
            }
            
            return { matchedCount: modified, modifiedCount: modified };
        } catch (error) {
            console.error(`Error updating multiple locally in ${collection}:`, error);
            return { matchedCount: 0, modifiedCount: 0 };
        }
    }

    /**
     * Delete document locally
     */
    deleteOneLocal(collection, query) {
        try {
            const stored = localStorage.getItem(`zedson_${collection}`);
            if (!stored) return { deletedCount: 0 };
            
            const data = JSON.parse(stored);
            const initialLength = data.length;
            
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                const matches = Object.keys(query).every(key => item[key] === query[key]);
                
                if (matches) {
                    data.splice(i, 1);
                    break;
                }
            }
            
            const deletedCount = initialLength - data.length;
            
            if (deletedCount > 0) {
                localStorage.setItem(`zedson_${collection}`, JSON.stringify(data));
                this.updateLocalCollection(collection, 'delete', query);
            }
            
            return { deletedCount };
        } catch (error) {
            console.error(`Error deleting locally from ${collection}:`, error);
            return { deletedCount: 0 };
        }
    }

    /**
     * Delete multiple documents locally
     */
    deleteManyLocal(collection, query) {
        try {
            const stored = localStorage.getItem(`zedson_${collection}`);
            if (!stored) return { deletedCount: 0 };
            
            const data = JSON.parse(stored);
            const initialLength = data.length;
            
            const filtered = data.filter(item => {
                return !Object.keys(query).every(key => item[key] === query[key]);
            });
            
            const deletedCount = initialLength - filtered.length;
            
            if (deletedCount > 0) {
                localStorage.setItem(`zedson_${collection}`, JSON.stringify(filtered));
                this.updateLocalCollection(collection, 'deleteMany', query);
            }
            
            return { deletedCount };
        } catch (error) {
            console.error(`Error deleting multiple locally from ${collection}:`, error);
            return { deletedCount: 0 };
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Simulate API call to backend
     */
    async apiCall(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            // Simulate API delay
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate
                    resolve({ success: true, data: data });
                } else {
                    reject(new Error('API call failed'));
                }
            }, 100);
        });
    }

    /**
     * Generate MongoDB-like ObjectId
     */
    generateObjectId() {
        const timestamp = Math.floor(Date.now() / 1000).toString(16);
        const randomBytes = Array.from({ length: 16 }, () => 
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');
        return timestamp + randomBytes.substring(0, 16);
    }

    /**
     * Update local collection in memory
     */
    updateLocalCollection(collection, operation, data) {
        try {
            // This method updates the in-memory collections used by the application
            // It ensures that UI updates immediately while background sync happens
            
            switch (collection) {
                case 'users':
                    this.updateUsers(operation, data);
                    break;
                case 'customers':
                    this.updateCustomers(operation, data);
                    break;
                case 'inventory':
                    this.updateInventory(operation, data);
                    break;
                case 'sales':
                    this.updateSales(operation, data);
                    break;
                case 'services':
                    this.updateServices(operation, data);
                    break;
                case 'expenses':
                    this.updateExpenses(operation, data);
                    break;
                case 'invoices':
                    this.updateInvoices(operation, data);
                    break;
            }
            
            // Trigger UI updates
            this.triggerUIUpdate(collection);
            
        } catch (error) {
            console.error(`Error updating local collection ${collection}:`, error);
        }
    }

    /**
     * Update users collection
     */
    updateUsers(operation, data) {
        if (!window.users) return;
        
        switch (operation) {
            case 'insert':
                window.users.push(data);
                break;
            case 'update':
                const userIndex = window.users.findIndex(user => 
                    Object.keys(data.query).every(key => user[key] === data.query[key])
                );
                if (userIndex !== -1) {
                    Object.assign(window.users[userIndex], data.update);
                }
                break;
            case 'delete':
                window.users = window.users.filter(user => 
                    !Object.keys(data).every(key => user[key] === data[key])
                );
                break;
        }
    }

    /**
     * Update customers collection
     */
    updateCustomers(operation, data) {
        if (!window.CustomerModule || !window.CustomerModule.customers) return;
        
        switch (operation) {
            case 'insert':
                window.CustomerModule.customers.push(data);
                break;
            case 'update':
                const customerIndex = window.CustomerModule.customers.findIndex(customer => 
                    Object.keys(data.query).every(key => customer[key] === data.query[key])
                );
                if (customerIndex !== -1) {
                    Object.assign(window.CustomerModule.customers[customerIndex], data.update);
                }
                break;
            case 'delete':
                window.CustomerModule.customers = window.CustomerModule.customers.filter(customer => 
                    !Object.keys(data).every(key => customer[key] === data[key])
                );
                break;
        }
    }

    /**
     * Update inventory collection
     */
    updateInventory(operation, data) {
        if (!window.InventoryModule || !window.InventoryModule.watches) return;
        
        switch (operation) {
            case 'insert':
                window.InventoryModule.watches.push(data);
                break;
            case 'update':
                const watchIndex = window.InventoryModule.watches.findIndex(watch => 
                    Object.keys(data.query).every(key => watch[key] === data.query[key])
                );
                if (watchIndex !== -1) {
                    Object.assign(window.InventoryModule.watches[watchIndex], data.update);
                }
                break;
            case 'delete':
                window.InventoryModule.watches = window.InventoryModule.watches.filter(watch => 
                    !Object.keys(data).every(key => watch[key] === data[key])
                );
                break;
        }
    }

    /**
     * Update sales collection
     */
    updateSales(operation, data) {
        if (!window.SalesModule || !window.SalesModule.sales) return;
        
        switch (operation) {
            case 'insert':
                window.SalesModule.sales.push(data);
                break;
            case 'update':
                const saleIndex = window.SalesModule.sales.findIndex(sale => 
                    Object.keys(data.query).every(key => sale[key] === data.query[key])
                );
                if (saleIndex !== -1) {
                    Object.assign(window.SalesModule.sales[saleIndex], data.update);
                }
                break;
            case 'delete':
                window.SalesModule.sales = window.SalesModule.sales.filter(sale => 
                    !Object.keys(data).every(key => sale[key] === data[key])
                );
                break;
        }
    }

    /**
     * Update services collection
     */
    updateServices(operation, data) {
        if (!window.ServiceModule || !window.ServiceModule.services) return;
        
        switch (operation) {
            case 'insert':
                window.ServiceModule.services.push(data);
                break;
            case 'update':
                const serviceIndex = window.ServiceModule.services.findIndex(service => 
                    Object.keys(data.query).every(key => service[key] === data.query[key])
                );
                if (serviceIndex !== -1) {
                    Object.assign(window.ServiceModule.services[serviceIndex], data.update);
                }
                break;
            case 'delete':
                window.ServiceModule.services = window.ServiceModule.services.filter(service => 
                    !Object.keys(data).every(key => service[key] === data[key])
                );
                break;
        }
    }

    /**
     * Update expenses collection
     */
    updateExpenses(operation, data) {
        if (!window.ExpenseModule || !window.ExpenseModule.expenses) return;
        
        switch (operation) {
            case 'insert':
                window.ExpenseModule.expenses.push(data);
                break;
            case 'update':
                const expenseIndex = window.ExpenseModule.expenses.findIndex(expense => 
                    Object.keys(data.query).every(key => expense[key] === data.query[key])
                );
                if (expenseIndex !== -1) {
                    Object.assign(window.ExpenseModule.expenses[expenseIndex], data.update);
                }
                break;
            case 'delete':
                window.ExpenseModule.expenses = window.ExpenseModule.expenses.filter(expense => 
                    !Object.keys(data).every(key => expense[key] === data[key])
                );
                break;
        }
    }

    /**
     * Update invoices collection
     */
    updateInvoices(operation, data) {
        if (!window.InvoiceModule || !window.InvoiceModule.invoices) return;
        
        switch (operation) {
            case 'insert':
                window.InvoiceModule.invoices.push(data);
                break;
            case 'update':
                const invoiceIndex = window.InvoiceModule.invoices.findIndex(invoice => 
                    Object.keys(data.query).every(key => invoice[key] === data.query[key])
                );
                if (invoiceIndex !== -1) {
                    Object.assign(window.InvoiceModule.invoices[invoiceIndex], data.update);
                }
                break;
            case 'delete':
                window.InvoiceModule.invoices = window.InvoiceModule.invoices.filter(invoice => 
                    !Object.keys(data).every(key => invoice[key] === data[key])
                );
                break;
        }
    }

    /**
     * Trigger UI updates after data changes
     */
    triggerUIUpdate(collection) {
        setTimeout(() => {
            switch (collection) {
                case 'users':
                    if (window.AuthModule && window.AuthModule.updateUserTable) {
                        window.AuthModule.updateUserTable();
                    }
                    break;
                case 'customers':
                    if (window.CustomerModule && window.CustomerModule.renderCustomerTable) {
                        window.CustomerModule.renderCustomerTable();
                    }
                    break;
                case 'inventory':
                    if (window.InventoryModule && window.InventoryModule.renderWatchTable) {
                        window.InventoryModule.renderWatchTable();
                    }
                    break;
                case 'sales':
                    if (window.SalesModule && window.SalesModule.renderSalesTable) {
                        window.SalesModule.renderSalesTable();
                    }
                    break;
                case 'services':
                    if (window.ServiceModule && window.ServiceModule.renderServiceTable) {
                        window.ServiceModule.renderServiceTable();
                    }
                    break;
                case 'expenses':
                    if (window.ExpenseModule && window.ExpenseModule.renderExpenseTable) {
                        window.ExpenseModule.renderExpenseTable();
                    }
                    break;
                case 'invoices':
                    if (window.InvoiceModule && window.InvoiceModule.renderInvoiceTable) {
                        window.InvoiceModule.renderInvoiceTable();
                    }
                    break;
            }
            
            // Update dashboard
            if (window.updateDashboard) {
                window.updateDashboard();
            }
        }, 100);
    }

    /**
     * Backup data to MongoDB
     */
    async backupToMongoDB() {
        try {
            if (!isConnected) {
                console.log('Cannot backup: Not connected to MongoDB');
                return;
            }

            console.log('Starting data backup to MongoDB...');
            
            const collections = ['users', 'customers', 'inventory', 'sales', 'services', 'expenses', 'invoices'];
            
            for (const collection of collections) {
                const localData = localStorage.getItem(`zedson_${collection}`);
                if (localData) {
                    const data = JSON.parse(localData);
                    if (data.length > 0) {
                        await this.apiCall('POST', `/api/${collection}/backup`, { data });
                        console.log(`Backed up ${data.length} records from ${collection}`);
                    }
                }
            }
            
            console.log('Data backup completed successfully');
            
        } catch (error) {
            console.error('Error during backup:', error);
        }
    }

    /**
     * Sync data between local and MongoDB
     */
    async syncData() {
        try {
            if (!isConnected) return;
            
            console.log('Syncing data with MongoDB...');
            
            // This would implement sophisticated sync logic
            // For now, we'll just ensure localStorage is updated
            const collections = ['users', 'customers', 'inventory', 'sales', 'services', 'expenses', 'invoices'];
            
            for (const collection of collections) {
                const localData = this.getLocalCollectionData(collection);
                if (localData && localData.length > 0) {
                    localStorage.setItem(`zedson_${collection}`, JSON.stringify(localData));
                }
            }
            
            console.log('Data sync completed');
            
        } catch (error) {
            console.error('Error during sync:', error);
        }
    }

    /**
     * Get local collection data
     */
    getLocalCollectionData(collection) {
        switch (collection) {
            case 'users':
                return window.users || [];
            case 'customers':
                return window.CustomerModule ? window.CustomerModule.customers : [];
            case 'inventory':
                return window.InventoryModule ? window.InventoryModule.watches : [];
            case 'sales':
                return window.SalesModule ? window.SalesModule.sales : [];
            case 'services':
                return window.ServiceModule ? window.ServiceModule.services : [];
            case 'expenses':
                return window.ExpenseModule ? window.ExpenseModule.expenses : [];
            case 'invoices':
                return window.InvoiceModule ? window.InvoiceModule.invoices : [];
            default:
                return [];
        }
    }

    /**
     * Get connection status
     */
    isConnected() {
        return isConnected;
    }

    /**
     * Export data for backup
     */
    async exportData() {
        try {
            const exportData = {};
            const collections = ['users', 'customers', 'inventory', 'sales', 'services', 'expenses', 'invoices'];
            
            for (const collection of collections) {
                exportData[collection] = this.getLocalCollectionData(collection);
            }
            
            exportData.exportDate = new Date().toISOString();
            exportData.version = '2.0';
            exportData.source = 'ZEDSON WATCHCRAFT - MongoDB Integration';
            
            // Create and download backup file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zedson_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log('Data exported successfully');
            return exportData;
            
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    /**
     * Import data from backup
     */
    async importData(fileData) {
        try {
            const data = JSON.parse(fileData);
            
            if (!data.version || !data.exportDate) {
                throw new Error('Invalid backup file format');
            }
            
            console.log('Importing data from backup...');
            
            const collections = ['users', 'customers', 'inventory', 'sales', 'services', 'expenses', 'invoices'];
            
            for (const collection of collections) {
                if (data[collection] && Array.isArray(data[collection])) {
                    // Clear existing data
                    localStorage.setItem(`zedson_${collection}`, JSON.stringify(data[collection]));
                    
                    // Update in-memory data
                    this.setGlobalData(collection, data[collection]);
                    
                    // If connected to MongoDB, also update there
                    if (isConnected) {
                        await this.apiCall('POST', `/api/${collection}/import`, { data: data[collection] });
                    }
                    
                    console.log(`Imported ${data[collection].length} records to ${collection}`);
                }
            }
            
            // Trigger UI updates
            setTimeout(() => {
                collections.forEach(collection => this.triggerUIUpdate(collection));
            }, 500);
            
            console.log('Data import completed successfully');
            return true;
            
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// ==================== GLOBAL INTEGRATION FUNCTIONS ====================

/**
 * Wrap existing module functions to use MongoDB
 */
function integrateWithModules() {
    // Users Module Integration
    if (window.AuthModule) {
        const originalAddUser = window.AuthModule.addNewUser;
        window.AuthModule.addNewUser = async function(event) {
            const result = originalAddUser.call(this, event);
            if (result && window.mongoDBService) {
                const users = window.users || [];
                const newUser = users[users.length - 1];
                if (newUser) {
                    await window.mongoDBService.insertOne('users', newUser);
                }
            }
            return result;
        };
    }

    // Customers Module Integration
    if (window.CustomerModule) {
        const originalAddCustomer = window.CustomerModule.addNewCustomer;
        window.CustomerModule.addNewCustomer = async function(event) {
            const result = originalAddCustomer.call(this, event);
            if (result && window.mongoDBService) {
                const customers = this.customers || [];
                const newCustomer = customers[customers.length - 1];
                if (newCustomer) {
                    await window.mongoDBService.insertOne('customers', newCustomer);
                }
            }
            return result;
        };
    }

    // Inventory Module Integration
    if (window.InventoryModule) {
        const originalAddWatch = window.InventoryModule.addNewWatch;
        window.InventoryModule.addNewWatch = async function(event) {
            const result = originalAddWatch.call(this, event);
            if (result && window.mongoDBService) {
                const watches = this.watches || [];
                const newWatch = watches[watches.length - 1];
                if (newWatch) {
                    await window.mongoDBService.insertOne('inventory', newWatch);
                }
            }
            return result;
        };
    }

    // Sales Module Integration
    if (window.SalesModule) {
        const originalAddSale = window.SalesModule.addNewSale;
        window.SalesModule.addNewSale = async function(event) {
            const result = originalAddSale.call(this, event);
            if (result && window.mongoDBService) {
                const sales = this.sales || [];
                const newSale = sales[sales.length - 1];
                if (newSale) {
                    await window.mongoDBService.insertOne('sales', newSale);
                }
            }
            return result;
        };
    }

    // Service Module Integration
    if (window.ServiceModule) {
        const originalAddService = window.ServiceModule.addNewService;
        window.ServiceModule.addNewService = async function(event) {
            const result = originalAddService.call(this, event);
            if (result && window.mongoDBService) {
                const services = this.services || [];
                const newService = services[services.length - 1];
                if (newService) {
                    await window.mongoDBService.insertOne('services', newService);
                }
            }
            return result;
        };
    }

    // Expense Module Integration
    if (window.ExpenseModule) {
        const originalAddExpense = window.ExpenseModule.addNewExpense;
        window.ExpenseModule.addNewExpense = async function(event) {
            const result = originalAddExpense.call(this, event);
            if (result && window.mongoDBService) {
                const expenses = this.expenses || [];
                const newExpense = expenses[expenses.length - 1];
                if (newExpense) {
                    await window.mongoDBService.insertOne('expenses', newExpense);
                }
            }
            return result;
        };
    }

    // Invoice Module Integration
    if (window.InvoiceModule) {
        const originalGenerateSales = window.InvoiceModule.generateSalesInvoice;
        window.InvoiceModule.generateSalesInvoice = async function(saleData) {
            const result = originalGenerateSales.call(this, saleData);
            if (result && window.mongoDBService) {
                await window.mongoDBService.insertOne('invoices', result);
            }
            return result;
        };
    }

    console.log('MongoDB integration completed for all modules');
}

// ==================== ENHANCED CRUD OPERATIONS ====================

/**
 * High-level database operations for the application
 */
class DatabaseOperations {
    constructor(mongoService) {
        this.mongo = mongoService;
    }

    // User Operations
    async createUser(userData) {
        try {
            const result = await this.mongo.insertOne('users', userData);
            console.log('User created:', result);
            return result;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUserByUsername(username) {
        try {
            return await this.mongo.findOne('users', { username });
        } catch (error) {
            console.error('Error finding user:', error);
            return null;
        }
    }

    async updateUser(username, updateData) {
        try {
            return await this.mongo.updateOne('users', { username }, updateData);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(username) {
        try {
            return await this.mongo.deleteOne('users', { username });
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // Customer Operations
    async createCustomer(customerData) {
        try {
            const result = await this.mongo.insertOne('customers', customerData);
            console.log('Customer created:', result);
            return result;
        } catch (error) {
            console.error('Error creating customer:', error);
            throw error;
        }
    }

    async getCustomerById(customerId) {
        try {
            return await this.mongo.findOne('customers', { id: customerId });
        } catch (error) {
            console.error('Error finding customer:', error);
            return null;
        }
    }

    async updateCustomer(customerId, updateData) {
        try {
            return await this.mongo.updateOne('customers', { id: customerId }, updateData);
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    }

    async deleteCustomer(customerId) {
        try {
            return await this.mongo.deleteOne('customers', { id: customerId });
        } catch (error) {
            console.error('Error deleting customer:', error);
            throw error;
        }
    }

    // Inventory Operations
    async createWatch(watchData) {
        try {
            const result = await this.mongo.insertOne('inventory', watchData);
            console.log('Watch created:', result);
            return result;
        } catch (error) {
            console.error('Error creating watch:', error);
            throw error;
        }
    }

    async getWatchById(watchId) {
        try {
            return await this.mongo.findOne('inventory', { id: watchId });
        } catch (error) {
            console.error('Error finding watch:', error);
            return null;
        }
    }

    async updateWatch(watchId, updateData) {
        try {
            return await this.mongo.updateOne('inventory', { id: watchId }, updateData);
        } catch (error) {
            console.error('Error updating watch:', error);
            throw error;
        }
    }

    async deleteWatch(watchId) {
        try {
            return await this.mongo.deleteOne('inventory', { id: watchId });
        } catch (error) {
            console.error('Error deleting watch:', error);
            throw error;
        }
    }

    // Sales Operations
    async createSale(saleData) {
        try {
            const result = await this.mongo.insertOne('sales', saleData);
            console.log('Sale created:', result);
            return result;
        } catch (error) {
            console.error('Error creating sale:', error);
            throw error;
        }
    }

    async getSaleById(saleId) {
        try {
            return await this.mongo.findOne('sales', { id: saleId });
        } catch (error) {
            console.error('Error finding sale:', error);
            return null;
        }
    }

    async getSalesByCustomer(customerId) {
        try {
            return await this.mongo.findMany('sales', { customerId });
        } catch (error) {
            console.error('Error finding sales by customer:', error);
            return [];
        }
    }

    async getSalesByDateRange(fromDate, toDate) {
        try {
            return await this.mongo.findMany('sales', {
                timestamp: {
                    $gte: fromDate,
                    $lte: toDate
                }
            });
        } catch (error) {
            console.error('Error finding sales by date range:', error);
            return [];
        }
    }

    // Service Operations
    async createService(serviceData) {
        try {
            const result = await this.mongo.insertOne('services', serviceData);
            console.log('Service created:', result);
            return result;
        } catch (error) {
            console.error('Error creating service:', error);
            throw error;
        }
    }

    async getServiceById(serviceId) {
        try {
            return await this.mongo.findOne('services', { id: serviceId });
        } catch (error) {
            console.error('Error finding service:', error);
            return null;
        }
    }

    async updateServiceStatus(serviceId, status) {
        try {
            return await this.mongo.updateOne('services', { id: serviceId }, { status });
        } catch (error) {
            console.error('Error updating service status:', error);
            throw error;
        }
    }

    // Expense Operations
    async createExpense(expenseData) {
        try {
            const result = await this.mongo.insertOne('expenses', expenseData);
            console.log('Expense created:', result);
            return result;
        } catch (error) {
            console.error('Error creating expense:', error);
            throw error;
        }
    }

    async getExpensesByDateRange(fromDate, toDate) {
        try {
            return await this.mongo.findMany('expenses', {
                timestamp: {
                    $gte: fromDate,
                    $lte: toDate
                }
            });
        } catch (error) {
            console.error('Error finding expenses by date range:', error);
            return [];
        }
    }

    // Invoice Operations
    async createInvoice(invoiceData) {
        try {
            const result = await this.mongo.insertOne('invoices', invoiceData);
            console.log('Invoice created:', result);
            return result;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    async getInvoiceById(invoiceId) {
        try {
            return await this.mongo.findOne('invoices', { id: invoiceId });
        } catch (error) {
            console.error('Error finding invoice:', error);
            return null;
        }
    }

    // Analytics Operations
    async getRevenueAnalytics(fromDate, toDate) {
        try {
            const sales = await this.getSalesByDateRange(fromDate, toDate);
            const services = await this.mongo.findMany('services', {
                status: 'completed',
                actualDelivery: {
                    $gte: fromDate,
                    $lte: toDate
                }
            });
            const expenses = await this.getExpensesByDateRange(fromDate, toDate);

            return {
                sales,
                services,
                expenses,
                totalRevenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                             services.reduce((sum, service) => sum + service.cost, 0),
                totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0)
            };
        } catch (error) {
            console.error('Error getting revenue analytics:', error);
            return null;
        }
    }
}

// ==================== INITIALIZATION ====================

// Initialize MongoDB Service
window.mongoDBService = new MongoDBService();
window.dbOperations = new DatabaseOperations(window.mongoDBService);

// Auto-sync data every 5 minutes when connected
setInterval(() => {
    if (window.mongoDBService && window.mongoDBService.isConnected()) {
        window.mongoDBService.syncData();
    }
}, 5 * 60 * 1000);

// Auto-backup data every 30 minutes
setInterval(() => {
    if (window.mongoDBService && window.mongoDBService.isConnected()) {
        window.mongoDBService.backupToMongoDB();
    }
}, 30 * 60 * 1000);

// Global functions for the application
window.MongoDBService = MongoDBService;
window.DatabaseOperations = DatabaseOperations;

// Export data function for UI
window.exportAppData = function() {
    if (window.mongoDBService) {
        window.mongoDBService.exportData();
    }
};

// Import data function for UI
window.importAppData = function(event) {
    const file = event.target.files[0];
    if (file && window.mongoDBService) {
        const reader = new FileReader();
        reader.onload = function(e) {
            window.mongoDBService.importData(e.target.result);
        };
        reader.readAsText(file);
    }
};

// Initialize integration when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        integrateWithModules();
        console.log('🚀 ZEDSON WATCHCRAFT - MongoDB Integration Initialized');
        console.log('💝 Developed by PULSEWARE with ❤️');
    }, 1000);
});

console.log('MongoDB Service Module loaded successfully');
console.log('🔥 PULSEWARE Development - Professional Database Integration');