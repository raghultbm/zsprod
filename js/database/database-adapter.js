// ZEDSON WATCHCRAFT - Database Adapter for Real-time Sync
// js/database/database-adapter.js

/**
 * Database Adapter Module
 * Provides real-time synchronization between JS arrays and SQLite database
 * Replaces all static arrays with database-backed operations
 */

class DatabaseAdapter {
    constructor() {
        this.isReady = false;
        this.db = null;
        this.eventListeners = new Map();
    }

    /**
     * Initialize database adapter
     */
    async initialize() {
        try {
            // Wait for SQLite core to be ready
            await this.waitForDatabase();
            
            this.db = window.SQLiteCore;
            this.isReady = true;
            
            console.log('🔄 Database Adapter initialized');
            
            // Load initial data
            await this.loadInitialData();
            
            return true;
        } catch (error) {
            console.error('❌ Database Adapter initialization failed:', error);
            return false;
        }
    }

    /**
     * Wait for database to be ready
     */
    async waitForDatabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkDB = () => {
                if (window.SQLiteCore && window.SQLiteCore.isDBReady()) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Database not ready'));
                } else {
                    attempts++;
                    setTimeout(checkDB, 100);
                }
            };
            
            checkDB();
        });
    }

    /**
     * Load initial data from database to replace JS arrays
     */
    async loadInitialData() {
        try {
            // Load customers
            const customers = await this.getCustomers();
            window.customers = customers;
            console.log(`📊 Loaded ${customers.length} customers from database`);

            // Load inventory
            const inventory = await this.getInventory();
            window.watches = inventory;
            console.log(`📦 Loaded ${inventory.length} inventory items from database`);

            // Load sales
            const sales = await this.getSales();
            if (window.SalesCoreModule) {
                window.SalesCoreModule.sales = sales;
            }
            console.log(`💰 Loaded ${sales.length} sales from database`);

            // Load services
            const services = await this.getServices();
            if (window.ServiceModule) {
                window.ServiceModule.services = services;
            }
            console.log(`🔧 Loaded ${services.length} services from database`);

            // Load expenses
            const expenses = await this.getExpenses();
            if (window.ExpenseModule) {
                window.ExpenseModule.expenses = expenses;
            }
            console.log(`💸 Loaded ${expenses.length} expenses from database`);

            // Update next IDs
            this.updateNextIds();

        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    /**
     * Update next ID counters based on database data
     */
    updateNextIds() {
        try {
            if (window.customers && window.customers.length > 0) {
                window.nextCustomerId = Math.max(...window.customers.map(c => c.id)) + 1;
            }

            if (window.watches && window.watches.length > 0) {
                window.nextWatchId = Math.max(...window.watches.map(w => w.id)) + 1;
            }

            if (window.SalesCoreModule?.sales && window.SalesCoreModule.sales.length > 0) {
                window.nextSaleId = Math.max(...window.SalesCoreModule.sales.map(s => s.id)) + 1;
            }

            if (window.ServiceModule?.services && window.ServiceModule.services.length > 0) {
                window.nextServiceId = Math.max(...window.ServiceModule.services.map(s => s.id)) + 1;
            }

            if (window.ExpenseModule?.expenses && window.ExpenseModule.expenses.length > 0) {
                window.nextExpenseId = Math.max(...window.ExpenseModule.expenses.map(e => e.id)) + 1;
            }

        } catch (error) {
            console.warn('Error updating next IDs:', error);
        }
    }

    // ==================================================
    // CUSTOMER OPERATIONS
    // ==================================================

    async getCustomers() {
        try {
            const customers = this.db.selectAll(`
                SELECT c.*,
                       COUNT(DISTINCT s.id) as actual_purchases,
                       COUNT(DISTINCT sv.id) as actual_services,
                       COALESCE(SUM(s.total_amount), 0) as total_sales_value,
                       COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0) as total_services_value
                FROM customers c
                LEFT JOIN sales s ON c.id = s.customer_id
                LEFT JOIN services sv ON c.id = sv.customer_id
                GROUP BY c.id
                ORDER BY c.name
            `);

            // Calculate net value and ensure data consistency
            return customers.map(customer => ({
                ...customer,
                netValue: (customer.total_sales_value || 0) + (customer.total_services_value || 0),
                purchases: customer.actual_purchases || 0,
                serviceCount: customer.actual_services || 0
            }));
        } catch (error) {
            console.error('Failed to get customers:', error);
            return [];
        }
    }

    async addCustomer(customerData) {
        try {
            const result = this.db.insert('customers', {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address || '',
                purchases: 0,
                service_count: 0,
                net_value: 0.00,
                added_by: customerData.addedBy || 'admin'
            });

            // Reload customers array
            window.customers = await this.getCustomers();
            
            // Update next ID
            if (result.insertId) {
                window.nextCustomerId = Math.max(window.nextCustomerId || 1, result.insertId + 1);
            }

            return result;
        } catch (error) {
            console.error('Failed to add customer:', error);
            throw error;
        }
    }

    async updateCustomer(id, updateData) {
        try {
            const result = this.db.update('customers', updateData, 'id = ?', [id]);
            
            // Reload customers array
            window.customers = await this.getCustomers();
            
            return result;
        } catch (error) {
            console.error('Failed to update customer:', error);
            throw error;
        }
    }

    async deleteCustomer(id) {
        try {
            const result = this.db.delete('customers', 'id = ?', [id]);
            
            // Reload customers array
            window.customers = await this.getCustomers();
            
            return result;
        } catch (error) {
            console.error('Failed to delete customer:', error);
            throw error;
        }
    }

    // ==================================================
    // INVENTORY OPERATIONS
    // ==================================================

    async getInventory() {
        try {
            const inventory = this.db.selectAll(`
                SELECT i.*,
                       COUNT(s.id) as total_sold,
                       COALESCE(SUM(s.total_amount), 0) as total_revenue
                FROM inventory i
                LEFT JOIN sales s ON i.id = s.inventory_id
                GROUP BY i.id
                ORDER BY i.created_at DESC
            `);

            return inventory.map(item => ({
                ...item,
                addedDate: item.created_at,
                addedBy: item.added_by || 'admin',
                movementHistory: [] // Can be enhanced later
            }));
        } catch (error) {
            console.error('Failed to get inventory:', error);
            return [];
        }
    }

    async addInventoryItem(itemData) {
        try {
            const result = this.db.insert('inventory', {
                code: itemData.code,
                type: itemData.type,
                brand: itemData.brand,
                model: itemData.model,
                size: itemData.size || '-',
                price: itemData.price,
                quantity: itemData.quantity,
                outlet: itemData.outlet,
                description: itemData.description || '',
                status: itemData.quantity > 0 ? 'available' : 'sold',
                added_by: itemData.addedBy || 'admin'
            });

            // Reload inventory array
            window.watches = await this.getInventory();
            
            // Update next ID
            if (result.insertId) {
                window.nextWatchId = Math.max(window.nextWatchId || 1, result.insertId + 1);
            }

            return result;
        } catch (error) {
            console.error('Failed to add inventory item:', error);
            throw error;
        }
    }

    async updateInventoryItem(id, updateData) {
        try {
            const result = this.db.update('inventory', updateData, 'id = ?', [id]);
            
            // Reload inventory array
            window.watches = await this.getInventory();
            
            return result;
        } catch (error) {
            console.error('Failed to update inventory item:', error);
            throw error;
        }
    }

    async deleteInventoryItem(id) {
        try {
            const result = this.db.delete('inventory', 'id = ?', [id]);
            
            // Reload inventory array
            window.watches = await this.getInventory();
            
            return result;
        } catch (error) {
            console.error('Failed to delete inventory item:', error);
            throw error;
        }
    }

    // ==================================================
    // SALES OPERATIONS
    // ==================================================

    async getSales() {
        try {
            const sales = this.db.selectAll(`
                SELECT s.*,
                       c.name as customer_name,
                       c.phone as customer_phone,
                       i.code as watch_code,
                       (i.brand || ' ' || i.model) as watch_name,
                       DATE(s.created_at) as date,
                       TIME(s.created_at) as time
                FROM sales s
                JOIN customers c ON s.customer_id = c.id
                JOIN inventory i ON s.inventory_id = i.id
                ORDER BY s.created_at DESC
            `);

            return sales.map(sale => ({
                ...sale,
                customerId: sale.customer_id,
                customerName: sale.customer_name,
                watchId: sale.inventory_id,
                watchName: sale.watch_name,
                watchCode: sale.watch_code,
                totalAmount: sale.total_amount,
                paymentMethod: sale.payment_method,
                timestamp: sale.created_at,
                createdBy: sale.created_by || 'admin'
            }));
        } catch (error) {
            console.error('Failed to get sales:', error);
            return [];
        }
    }

    async addSale(saleData) {
        try {
            const result = this.db.insert('sales', {
                customer_id: saleData.customerId,
                inventory_id: saleData.watchId,
                quantity: saleData.quantity,
                price: saleData.price,
                subtotal: saleData.subtotal,
                discount_type: saleData.discountType || '',
                discount_value: saleData.discountValue || 0,
                discount_amount: saleData.discountAmount || 0,
                total_amount: saleData.totalAmount,
                payment_method: saleData.paymentMethod,
                sale_date: saleData.date,
                sale_time: saleData.time,
                created_by: saleData.createdBy || 'admin'
            });

            // Update inventory quantity
            await this.updateInventoryQuantity(saleData.watchId, -saleData.quantity);

            // Update customer purchase count
            await this.updateCustomerPurchases(saleData.customerId, 1);

            // Reload sales array
            if (window.SalesCoreModule) {
                window.SalesCoreModule.sales = await this.getSales();
            }

            // Reload related data
            window.customers = await this.getCustomers();
            window.watches = await this.getInventory();

            return result;
        } catch (error) {
            console.error('Failed to add sale:', error);
            throw error;
        }
    }

    async deleteSale(id) {
        try {
            // Get sale details first
            const sale = this.db.selectOne('SELECT * FROM sales WHERE id = ?', [id]);
            if (!sale) throw new Error('Sale not found');

            const result = this.db.delete('sales', 'id = ?', [id]);

            if (result.changes > 0) {
                // Restore inventory quantity
                await this.updateInventoryQuantity(sale.inventory_id, sale.quantity);

                // Update customer purchase count
                await this.updateCustomerPurchases(sale.customer_id, -1);

                // Reload arrays
                if (window.SalesCoreModule) {
                    window.SalesCoreModule.sales = await this.getSales();
                }
                window.customers = await this.getCustomers();
                window.watches = await this.getInventory();
            }

            return result;
        } catch (error) {
            console.error('Failed to delete sale:', error);
            throw error;
        }
    }

    // ==================================================
    // HELPER METHODS
    // ==================================================

    async updateInventoryQuantity(inventoryId, quantityChange) {
        try {
            const item = this.db.selectOne('SELECT quantity FROM inventory WHERE id = ?', [inventoryId]);
            if (item) {
                const newQuantity = Math.max(0, item.quantity + quantityChange);
                const newStatus = newQuantity > 0 ? 'available' : 'sold';
                
                this.db.update('inventory', {
                    quantity: newQuantity,
                    status: newStatus
                }, 'id = ?', [inventoryId]);
            }
        } catch (error) {
            console.error('Failed to update inventory quantity:', error);
        }
    }

    async updateCustomerPurchases(customerId, change) {
        try {
            const customer = this.db.selectOne('SELECT purchases FROM customers WHERE id = ?', [customerId]);
            if (customer) {
                const newCount = Math.max(0, customer.purchases + change);
                this.db.update('customers', { purchases: newCount }, 'id = ?', [customerId]);
            }
        } catch (error) {
            console.error('Failed to update customer purchases:', error);
        }
    }

    // ==================================================
    // SERVICE OPERATIONS
    // ==================================================

    async getServices() {
        try {
            const services = this.db.selectAll(`
                SELECT s.*,
                       c.name as customer_name,
                       c.phone as customer_phone,
                       DATE(s.created_at) as date,
                       TIME(s.created_at) as time
                FROM services s
                JOIN customers c ON s.customer_id = c.id
                ORDER BY s.created_at DESC
            `);

            return services.map(service => ({
                ...service,
                customerId: service.customer_id,
                customerName: service.customer_name,
                watchName: service.watch_name,
                timestamp: service.created_at,
                createdBy: service.created_by || 'admin'
            }));
        } catch (error) {
            console.error('Failed to get services:', error);
            return [];
        }
    }

    async addService(serviceData) {
        try {
            const result = this.db.insert('services', {
                customer_id: serviceData.customerId,
                watch_name: serviceData.watchName,
                brand: serviceData.brand,
                model: serviceData.model,
                dial_color: serviceData.dialColor,
                movement_no: serviceData.movementNo,
                gender: serviceData.gender,
                case_type: serviceData.caseType,
                strap_type: serviceData.strapType,
                issue: serviceData.issue,
                cost: serviceData.cost,
                status: 'pending',
                service_date: serviceData.date,
                service_time: serviceData.time,
                created_by: serviceData.createdBy || 'admin'
            });

            // Update customer service count
            await this.updateCustomerServices(serviceData.customerId, 1);

            // Reload services array
            if (window.ServiceModule) {
                window.ServiceModule.services = await this.getServices();
            }

            // Reload customers
            window.customers = await this.getCustomers();

            return result;
        } catch (error) {
            console.error('Failed to add service:', error);
            throw error;
        }
    }

    async updateService(id, updateData) {
        try {
            const result = this.db.update('services', updateData, 'id = ?', [id]);
            
            // Reload services array
            if (window.ServiceModule) {
                window.ServiceModule.services = await this.getServices();
            }
            
            return result;
        } catch (error) {
            console.error('Failed to update service:', error);
            throw error;
        }
    }

    async deleteService(id) {
        try {
            // Get service details first
            const service = this.db.selectOne('SELECT customer_id FROM services WHERE id = ?', [id]);
            if (!service) throw new Error('Service not found');

            const result = this.db.delete('services', 'id = ?', [id]);

            if (result.changes > 0) {
                // Update customer service count
                await this.updateCustomerServices(service.customer_id, -1);

                // Reload arrays
                if (window.ServiceModule) {
                    window.ServiceModule.services = await this.getServices();
                }
                window.customers = await this.getCustomers();
            }

            return result;
        } catch (error) {
            console.error('Failed to delete service:', error);
            throw error;
        }
    }

    async updateCustomerServices(customerId, change) {
        try {
            const customer = this.db.selectOne('SELECT service_count FROM customers WHERE id = ?', [customerId]);
            if (customer) {
                const newCount = Math.max(0, customer.service_count + change);
                this.db.update('customers', { service_count: newCount }, 'id = ?', [customerId]);
            }
        } catch (error) {
            console.error('Failed to update customer services:', error);
        }
    }

    // ==================================================
    // EXPENSE OPERATIONS
    // ==================================================

    async getExpenses() {
        try {
            const expenses = this.db.selectAll(`
                SELECT *,
                       DATE(expense_date) as formattedDate
                FROM expenses
                ORDER BY expense_date DESC, created_at DESC
            `);

            return expenses.map(expense => ({
                ...expense,
                timestamp: expense.created_at,
                createdBy: expense.created_by || 'admin'
            }));
        } catch (error) {
            console.error('Failed to get expenses:', error);
            return [];
        }
    }

    async addExpense(expenseData) {
        try {
            const result = this.db.insert('expenses', {
                expense_date: expenseData.date,
                description: expenseData.description,
                amount: expenseData.amount,
                created_by: expenseData.createdBy || 'admin'
            });

            // Reload expenses array
            if (window.ExpenseModule) {
                window.ExpenseModule.expenses = await this.getExpenses();
            }

            return result;
        } catch (error) {
            console.error('Failed to add expense:', error);
            throw error;
        }
    }

    async updateExpense(id, updateData) {
        try {
            const result = this.db.update('expenses', updateData, 'id = ?', [id]);
            
            // Reload expenses array
            if (window.ExpenseModule) {
                window.ExpenseModule.expenses = await this.getExpenses();
            }
            
            return result;
        } catch (error) {
            console.error('Failed to update expense:', error);
            throw error;
        }
    }

    async deleteExpense(id) {
        try {
            const result = this.db.delete('expenses', 'id = ?', [id]);
            
            // Reload expenses array
            if (window.ExpenseModule) {
                window.ExpenseModule.expenses = await this.getExpenses();
            }
            
            return result;
        } catch (error) {
            console.error('Failed to delete expense:', error);
            throw error;
        }
    }

    // ==================================================
    // REAL-TIME SYNC METHODS
    // ==================================================

    /**
     * Refresh all data from database
     */
    async refreshAllData() {
        try {
            await this.loadInitialData();
            
            // Trigger UI updates
            this.triggerDataUpdate('all');
            
            console.log('🔄 All data refreshed from database');
        } catch (error) {
            console.error('Failed to refresh all data:', error);
        }
    }

    /**
     * Trigger UI updates after data changes
     */
    triggerDataUpdate(dataType) {
        try {
            switch (dataType) {
                case 'customers':
                case 'all':
                    if (window.CustomerModule && window.CustomerModule.renderCustomerTable) {
                        window.CustomerModule.renderCustomerTable();
                    }
                    break;
                    
                case 'inventory':
                case 'all':
                    if (window.InventoryModule && window.InventoryModule.renderWatchTable) {
                        window.InventoryModule.renderWatchTable();
                    }
                    break;
                    
                case 'sales':
                case 'all':
                    if (window.SalesModule && window.SalesModule.renderSalesTable) {
                        window.SalesModule.renderSalesTable();
                    }
                    break;
                    
                case 'services':
                case 'all':
                    if (window.ServiceModule && window.ServiceModule.renderServiceTable) {
                        window.ServiceModule.renderServiceTable();
                    }
                    break;
                    
                case 'expenses':
                case 'all':
                    if (window.ExpenseModule && window.ExpenseModule.renderExpenseTable) {
                        window.ExpenseModule.renderExpenseTable();
                    }
                    break;
            }

            // Always update dashboard
            if (window.updateDashboard) {
                window.updateDashboard();
            }
        } catch (error) {
            console.error('Failed to trigger UI updates:', error);
        }
    }

    /**
     * Get database statistics
     */
    async getStatistics() {
        try {
            const stats = this.db.getStats();
            return {
                ...stats,
                lastUpdated: new Date().toISOString(),
                isConnected: this.isReady
            };
        } catch (error) {
            console.error('Failed to get statistics:', error);
            return null;
        }
    }
}

// Create singleton instance
const databaseAdapter = new DatabaseAdapter();

// Initialize when SQLite is ready
window.initializeAppWithDatabase = async function() {
    try {
        console.log('🔄 Initializing Database Adapter...');
        
        const success = await databaseAdapter.initialize();
        
        if (success) {
            console.log('✅ Database Adapter ready - Real-time sync enabled');
            
            // Initialize all modules after database is ready
            if (window.InventoryModule) {
                window.InventoryModule.initializeInventory();
            }
            
            if (window.CustomerModule) {
                window.CustomerModule.initializeCustomers();
            }
            
            if (window.SalesModule) {
                window.SalesModule.initializeSales();
            }
            
            if (window.ServiceModule) {
                window.ServiceModule.initializeServices();
            }
            
            if (window.ExpenseModule) {
                window.ExpenseModule.initializeExpenses();
            }
            
            // Update dashboard
            if (window.updateDashboard) {
                window.updateDashboard();
            }
        } else {
            console.error('❌ Database Adapter initialization failed');
        }
    } catch (error) {
        console.error('❌ Failed to initialize app with database:', error);
    }
};

// Export for global use
window.DatabaseAdapter = databaseAdapter;

console.log('🔄 Database Adapter module loaded');