// ZEDSON WATCHCRAFT - Data Manager Module
// Ensures ALL modules use MongoDB instead of local reference data
// Developed by PULSEWARE❤️

/**
 * Data Manager - Central data coordination for MongoDB integration
 * NO LOCAL REFERENCE DATA - EVERYTHING FROM MONGODB
 */

class DataManager {
    constructor() {
        this.isInitialized = false;
        this.dataCache = new Map();
        this.lastSync = null;
    }

    /**
     * Initialize data manager and ensure all modules use MongoDB
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🔄 Initializing Data Manager for MongoDB integration...');
        
        try {
            // Ensure API service is available
            if (!window.apiService) {
                throw new Error('API Service not available');
            }
            
            // Clear any existing local reference data
            this.clearLocalReferenceData();
            
            // Initialize module data loaders
            this.setupModuleDataLoaders();
            
            // Set up automatic data refresh
            this.setupAutoRefresh();
            
            this.isInitialized = true;
            console.log('✅ Data Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Data Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Clear any local reference data that might interfere with MongoDB operations
     */
    clearLocalReferenceData() {
        // Clear any global variables that might contain reference data
        const globalDataVars = [
            'sampleCustomers', 'sampleInventory', 'sampleSales', 
            'sampleServices', 'sampleExpenses', 'sampleInvoices',
            'defaultUsers', 'referenceData'
        ];
        
        globalDataVars.forEach(varName => {
            if (window[varName]) {
                delete window[varName];
                console.log(`🗑️ Cleared reference data: ${varName}`);
            }
        });
        
        // Clear localStorage cache if it exists
        const cacheKeys = [
            'zedson_reference_data', 'sample_data', 'default_data'
        ];
        
        cacheKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`🗑️ Cleared localStorage: ${key}`);
            }
        });
    }

    /**
     * Setup data loaders for all modules to use MongoDB
     */
    setupModuleDataLoaders() {
        console.log('🔧 Setting up module data loaders...');
        
        // Override any existing data loading functions to use MongoDB
        this.overrideCustomerModule();
        this.overrideInventoryModule();
        this.overrideSalesModule();
        this.overrideServiceModule();
        this.overrideExpenseModule();
        this.overrideInvoiceModule();
        this.overrideAuthModule();
    }

    /**
     * Override Customer Module to use MongoDB exclusively
     */
    overrideCustomerModule() {
        if (!window.CustomerModule) return;
        
        // Ensure customers array is always loaded from MongoDB
        const originalLoadCustomers = window.CustomerModule.loadCustomers;
        window.CustomerModule.loadCustomers = async function() {
            try {
                const response = await window.apiService.getCustomers();
                if (response.success) {
                    this.customers = response.data || [];
                    console.log(`📥 Loaded ${this.customers.length} customers from MongoDB`);
                    return this.customers;
                } else {
                    throw new Error('Failed to load customers from MongoDB');
                }
            } catch (error) {
                console.error('Error loading customers from MongoDB:', error);
                this.customers = []; // Empty array, no fallback to reference data
                throw error;
            }
        };

        // Override customer data access to always check MongoDB first
        const originalGetCustomerById = window.CustomerModule.getCustomerById;
        window.CustomerModule.getCustomerById = function(customerId) {
            // First try local cache
            let customer = this.customers?.find(c => c.id === customerId);
            if (!customer) {
                // If not in cache, trigger reload (async)
                this.loadCustomers().then(() => this.renderCustomerTable()).catch(console.error);
                return null;
            }
            return customer;
        };
    }

    /**
     * Override Inventory Module to use MongoDB exclusively
     */
    overrideInventoryModule() {
        if (!window.InventoryModule) return;
        
        // Ensure watches array is always loaded from MongoDB
        const originalLoadInventory = window.InventoryModule.loadInventory;
        window.InventoryModule.loadInventory = async function() {
            try {
                const response = await window.apiService.getInventory();
                if (response.success) {
                    this.watches = response.data || [];
                    console.log(`📥 Loaded ${this.watches.length} inventory items from MongoDB`);
                    return this.watches;
                } else {
                    throw new Error('Failed to load inventory from MongoDB');
                }
            } catch (error) {
                console.error('Error loading inventory from MongoDB:', error);
                this.watches = []; // Empty array, no fallback to reference data
                throw error;
            }
        };

        // Override inventory data access
        const originalGetWatchById = window.InventoryModule.getWatchById;
        window.InventoryModule.getWatchById = function(watchId) {
            let watch = this.watches?.find(w => w.id === watchId);
            if (!watch) {
                // If not in cache, trigger reload (async)
                this.loadInventory().then(() => this.renderWatchTable()).catch(console.error);
                return null;
            }
            return watch;
        };

        // Override available watches to always check current data
        const originalGetAvailableWatches = window.InventoryModule.getAvailableWatches;
        window.InventoryModule.getAvailableWatches = function() {
            if (!this.watches || this.watches.length === 0) {
                // Trigger reload if no data
                this.loadInventory().then(() => this.renderWatchTable()).catch(console.error);
                return [];
            }
            return this.watches.filter(w => w.quantity > 0 && w.status === 'available');
        };
    }

    /**
     * Override Sales Module to use MongoDB exclusively
     */
    overrideSalesModule() {
        if (!window.SalesModule) return;
        
        // Ensure sales array is always loaded from MongoDB
        if (window.SalesCoreModule) {
            const originalLoadSales = window.SalesCoreModule.loadSales;
            window.SalesCoreModule.loadSales = async function() {
                try {
                    const response = await window.apiService.getSales();
                    if (response.success) {
                        this.sales = response.data || [];
                        console.log(`📥 Loaded ${this.sales.length} sales from MongoDB`);
                        return this.sales;
                    } else {
                        throw new Error('Failed to load sales from MongoDB');
                    }
                } catch (error) {
                    console.error('Error loading sales from MongoDB:', error);
                    this.sales = []; // Empty array, no fallback to reference data
                    throw error;
                }
            };
        }

        // Override sales data access
        const originalGetSaleById = window.SalesModule.getSaleById;
        if (originalGetSaleById) {
            window.SalesModule.getSaleById = function(saleId) {
                let sale = this.sales?.find(s => s.id === saleId);
                if (!sale) {
                    // If not in cache, trigger reload (async)
                    this.loadSales().then(() => this.renderSalesTable()).catch(console.error);
                    return null;
                }
                return sale;
            };
        }
    }

    /**
     * Override Service Module to use MongoDB exclusively
     */
    overrideServiceModule() {
        if (!window.ServiceModule) return;
        
        // Ensure services array is always loaded from MongoDB
        const originalLoadServices = window.ServiceModule.loadServices;
        if (!originalLoadServices) {
            // Create loadServices function if it doesn't exist
            window.ServiceModule.loadServices = async function() {
                try {
                    const response = await window.apiService.getServices();
                    if (response.success) {
                        this.services = response.data || [];
                        console.log(`📥 Loaded ${this.services.length} services from MongoDB`);
                        return this.services;
                    } else {
                        throw new Error('Failed to load services from MongoDB');
                    }
                } catch (error) {
                    console.error('Error loading services from MongoDB:', error);
                    this.services = []; // Empty array, no fallback to reference data
                    throw error;
                }
            };
        }

        // Override service data access
        const originalGetServiceById = window.ServiceModule.getServiceById;
        if (!originalGetServiceById) {
            window.ServiceModule.getServiceById = function(serviceId) {
                let service = this.services?.find(s => s.id === serviceId);
                if (!service) {
                    // If not in cache, trigger reload (async)
                    this.loadServices().then(() => this.renderServiceTable()).catch(console.error);
                    return null;
                }
                return service;
            };
        }
    }

    /**
     * Override Expense Module to use MongoDB exclusively
     */
    overrideExpenseModule() {
        if (!window.ExpenseModule) return;
        
        // Ensure expenses array is always loaded from MongoDB
        const originalLoadExpenses = window.ExpenseModule.loadExpenses;
        if (!originalLoadExpenses) {
            // Create loadExpenses function if it doesn't exist
            window.ExpenseModule.loadExpenses = async function() {
                try {
                    const response = await window.apiService.getExpenses();
                    if (response.success) {
                        this.expenses = response.data || [];
                        console.log(`📥 Loaded ${this.expenses.length} expenses from MongoDB`);
                        return this.expenses;
                    } else {
                        throw new Error('Failed to load expenses from MongoDB');
                    }
                } catch (error) {
                    console.error('Error loading expenses from MongoDB:', error);
                    this.expenses = []; // Empty array, no fallback to reference data
                    throw error;
                }
            };
        }
    }

    /**
     * Override Invoice Module to use MongoDB exclusively
     */
    overrideInvoiceModule() {
        if (!window.InvoiceModule) return;
        
        // Ensure invoices array is always loaded from MongoDB
        const originalLoadInvoices = window.InvoiceModule.loadInvoices;
        if (!originalLoadInvoices) {
            // Create loadInvoices function if it doesn't exist
            window.InvoiceModule.loadInvoices = async function() {
                try {
                    const response = await window.apiService.getInvoices();
                    if (response.success) {
                        this.invoices = response.data || [];
                        console.log(`📥 Loaded ${this.invoices.length} invoices from MongoDB`);
                        return this.invoices;
                    } else {
                        throw new Error('Failed to load invoices from MongoDB');
                    }
                } catch (error) {
                    console.error('Error loading invoices from MongoDB:', error);
                    this.invoices = []; // Empty array, no fallback to reference data
                    throw error;
                }
            };
        }
    }

    /**
     * Override Auth Module to use MongoDB exclusively
     */
    overrideAuthModule() {
        if (!window.AuthModule) return;
        
        // Ensure users are always loaded from MongoDB
        const originalLoadUsers = window.AuthModule.loadUsers;
        if (originalLoadUsers) {
            window.AuthModule.loadUsers = async function() {
                if (this.getCurrentUser()?.role !== 'admin') return;
                
                try {
                    const response = await window.apiService.getUsers();
                    if (response.success) {
                        // Don't store in global variable, use the response directly
                        this.updateUserTable(response.data);
                        console.log(`📥 Loaded ${response.data.length} users from MongoDB`);
                    } else {
                        throw new Error('Failed to load users from MongoDB');
                    }
                } catch (error) {
                    console.error('Error loading users from MongoDB:', error);
                    throw error;
                }
            };
        }
    }

    /**
     * Setup automatic data refresh
     */
    setupAutoRefresh() {
        // Refresh data every 5 minutes to ensure freshness
        setInterval(async () => {
            if (this.isInitialized && window.apiService) {
                try {
                    console.log('🔄 Auto-refreshing data from MongoDB...');
                    await this.refreshAllData();
                    this.lastSync = new Date();
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Refresh all data from MongoDB
     */
    async refreshAllData() {
        const refreshPromises = [];
        
        // Refresh all module data
        if (window.CustomerModule?.loadCustomers) {
            refreshPromises.push(window.CustomerModule.loadCustomers());
        }
        
        if (window.InventoryModule?.loadInventory) {
            refreshPromises.push(window.InventoryModule.loadInventory());
        }
        
        if (window.SalesModule?.loadSales || window.SalesCoreModule?.loadSales) {
            const loadSales = window.SalesModule?.loadSales || window.SalesCoreModule?.loadSales;
            refreshPromises.push(loadSales.call(window.SalesModule || window.SalesCoreModule));
        }
        
        if (window.ServiceModule?.loadServices) {
            refreshPromises.push(window.ServiceModule.loadServices());
        }
        
        if (window.ExpenseModule?.loadExpenses) {
            refreshPromises.push(window.ExpenseModule.loadExpenses());
        }
        
        if (window.InvoiceModule?.loadInvoices) {
            refreshPromises.push(window.InvoiceModule.loadInvoices());
        }
        
        // Wait for all refreshes to complete
        await Promise.allSettled(refreshPromises);
        
        // Update dashboard after refresh
        if (window.updateDashboard) {
            await window.updateDashboard();
        }
        
        console.log('✅ Data refresh completed');
    }

    /**
     * Force reload of specific data type
     */
    async forceReload(dataType) {
        console.log(`🔄 Force reloading ${dataType} from MongoDB...`);
        
        try {
            switch (dataType) {
                case 'customers':
                    if (window.CustomerModule?.loadCustomers) {
                        await window.CustomerModule.loadCustomers();
                        if (window.CustomerModule?.renderCustomerTable) {
                            window.CustomerModule.renderCustomerTable();
                        }
                    }
                    break;
                    
                case 'inventory':
                    if (window.InventoryModule?.loadInventory) {
                        await window.InventoryModule.loadInventory();
                        if (window.InventoryModule?.renderWatchTable) {
                            window.InventoryModule.renderWatchTable();
                        }
                    }
                    break;
                    
                case 'sales':
                    const salesModule = window.SalesModule || window.SalesCoreModule;
                    if (salesModule?.loadSales) {
                        await salesModule.loadSales();
                        if (salesModule?.renderSalesTable) {
                            salesModule.renderSalesTable();
                        }
                    }
                    break;
                    
                case 'services':
                    if (window.ServiceModule?.loadServices) {
                        await window.ServiceModule.loadServices();
                        if (window.ServiceModule?.renderServiceTable) {
                            window.ServiceModule.renderServiceTable();
                        }
                    }
                    break;
                    
                case 'expenses':
                    if (window.ExpenseModule?.loadExpenses) {
                        await window.ExpenseModule.loadExpenses();
                        if (window.ExpenseModule?.renderExpenseTable) {
                            window.ExpenseModule.renderExpenseTable();
                        }
                    }
                    break;
                    
                case 'invoices':
                    if (window.InvoiceModule?.loadInvoices) {
                        await window.InvoiceModule.loadInvoices();
                        if (window.InvoiceModule?.renderInvoiceTable) {
                            window.InvoiceModule.renderInvoiceTable();
                        }
                    }
                    break;
                    
                case 'all':
                    await this.refreshAllData();
                    break;
                    
                default:
                    console.warn('Unknown data type for reload:', dataType);
            }
        } catch (error) {
            console.error(`Error reloading ${dataType}:`, error);
            throw error;
        }
    }

    /**
     * Get cache status
     */
    getCacheStatus() {
        return {
            isInitialized: this.isInitialized,
            lastSync: this.lastSync,
            cacheSize: this.dataCache.size
        };
    }

    /**
     * Clear all cached data and force reload
     */
    async clearCacheAndReload() {
        console.log('🗑️ Clearing cache and reloading all data...');
        
        this.dataCache.clear();
        
        // Clear module data arrays
        if (window.CustomerModule) window.CustomerModule.customers = [];
        if (window.InventoryModule) window.InventoryModule.watches = [];
        if (window.SalesModule) window.SalesModule.sales = [];
        if (window.SalesCoreModule) window.SalesCoreModule.sales = [];
        if (window.ServiceModule) window.ServiceModule.services = [];
        if (window.ExpenseModule) window.ExpenseModule.expenses = [];
        if (window.InvoiceModule) window.InvoiceModule.invoices = [];
        
        // Force reload everything
        await this.forceReload('all');
        
        console.log('✅ Cache cleared and data reloaded');
    }

    /**
     * Validate that no reference data is being used
     */
    validateNoReferenceData() {
        const violations = [];
        
        // Check for reference data variables
        const referenceDataVars = [
            'sampleCustomers', 'sampleInventory', 'sampleSales', 
            'sampleServices', 'sampleExpenses', 'sampleInvoices'
        ];
        
        referenceDataVars.forEach(varName => {
            if (window[varName] && Array.isArray(window[varName]) && window[varName].length > 0) {
                violations.push(`Reference data found: ${varName}`);
            }
        });
        
        // Check localStorage for reference data
        const cacheKeys = ['zedson_reference_data', 'sample_data', 'default_data'];
        cacheKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                violations.push(`Reference data in localStorage: ${key}`);
            }
        });
        
        if (violations.length > 0) {
            console.warn('⚠️ Reference data violations found:', violations);
            return false;
        }
        
        console.log('✅ No reference data violations found');
        return true;
    }
}

// Create global data manager instance
window.dataManager = new DataManager();

/**
 * Initialize data manager when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(async () => {
        try {
            await window.dataManager.initialize();
            
            // Validate no reference data is being used
            window.dataManager.validateNoReferenceData();
            
            console.log('🚀 Data Manager ready - All modules using MongoDB exclusively');
        } catch (error) {
            console.error('❌ Data Manager initialization failed:', error);
        }
    }, 500);
});

// Export for global use
window.DataManager = DataManager;

// Global utility functions
window.forceReloadData = function(dataType = 'all') {
    return window.dataManager.forceReload(dataType);
};

window.clearCacheAndReload = function() {
    return window.dataManager.clearCacheAndReload();
};

window.validateNoReferenceData = function() {
    return window.dataManager.validateNoReferenceData();
};

console.log('📊 Data Manager module loaded - Ensuring MongoDB-only operations');