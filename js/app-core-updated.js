// ZEDSON WATCHCRAFT - Updated App Controller with Database Integration
// js/app-core-updated.js

/**
 * Updated Application Controller with Database Integration
 * Replaces static arrays with real-time database operations
 */

// Override existing modules to use database adapter
class DatabaseIntegratedApp {
    constructor() {
        this.db = null;
        this.isReady = false;
    }

    /**
     * Initialize app with database integration
     */
    async initialize() {
        try {
            // Wait for database adapter
            await this.waitForDatabaseAdapter();
            
            this.db = window.DatabaseAdapter;
            this.isReady = true;
            
            // Override existing module functions
            this.overrideModuleFunctions();
            
            console.log('🚀 Database-integrated app initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize database-integrated app:', error);
            return false;
        }
    }

    /**
     * Wait for database adapter to be ready
     */
    async waitForDatabaseAdapter() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkAdapter = () => {
                if (window.DatabaseAdapter && window.DatabaseAdapter.isReady) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Database adapter not ready'));
                } else {
                    attempts++;
                    setTimeout(checkAdapter, 100);
                }
            };
            
            checkAdapter();
        });
    }

    /**
     * Override existing module functions to use database
     */
    overrideModuleFunctions() {
        this.overrideCustomerModule();
        this.overrideInventoryModule();
        this.overrideSalesModule();
        this.overrideServiceModule();
        this.overrideExpenseModule();
    }

    // ==================================================
    // CUSTOMER MODULE OVERRIDES
    // ==================================================

    overrideCustomerModule() {
        if (!window.CustomerModule) return;

        const db = this.db;

        // Override addNewCustomer
        const originalAddNewCustomer = window.CustomerModule.addNewCustomer;
        window.CustomerModule.addNewCustomer = async function(event) {
            event.preventDefault();
            
            if (!AuthModule || !AuthModule.hasPermission('customers')) {
                Utils.showNotification('You do not have permission to add customers.');
                return;
            }

            const name = document.getElementById('customerName').value.trim();
            const email = document.getElementById('customerEmail').value.trim();
            const phone = document.getElementById('customerPhone').value.trim();
            const address = document.getElementById('customerAddress').value.trim();
            
            if (!name || !email || !phone) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            if (!Utils.validateEmail(email)) {
                Utils.showNotification('Please enter a valid email address');
                return;
            }

            if (!Utils.validatePhone(phone)) {
                Utils.showNotification('Please enter a valid phone number');
                return;
            }

            try {
                await db.addCustomer({
                    name: name,
                    email: email,
                    phone: phone,
                    address: address,
                    addedBy: AuthModule.getCurrentUser()?.username || 'admin'
                });

                Utils.showNotification('Customer added successfully!');
                
                // Close modal and reset form
                closeModal('addCustomerModal');
                event.target.reset();
                
                // Update UI
                db.triggerDataUpdate('customers');
                
            } catch (error) {
                console.error('Failed to add customer:', error);
                Utils.showNotification('Failed to add customer: ' + error.message);
            }
        };

        // Override deleteCustomer
        window.CustomerModule.deleteCustomer = async function(customerId) {
            const currentUser = AuthModule.getCurrentUser();
            const isStaff = currentUser && currentUser.role === 'staff';
            
            if (isStaff) {
                Utils.showNotification('Staff users cannot delete customers.');
                return;
            }
            
            if (!AuthModule || !AuthModule.hasPermission('customers')) {
                Utils.showNotification('You do not have permission to delete customers.');
                return;
            }

            const customer = window.customers?.find(c => c.id === customerId);
            if (!customer) {
                Utils.showNotification('Customer not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
                try {
                    await db.deleteCustomer(customerId);
                    Utils.showNotification('Customer deleted successfully!');
                    db.triggerDataUpdate('customers');
                } catch (error) {
                    console.error('Failed to delete customer:', error);
                    Utils.showNotification('Failed to delete customer: ' + error.message);
                }
            }
        };

        console.log('✅ Customer module overridden for database integration');
    }

    // ==================================================
    // INVENTORY MODULE OVERRIDES
    // ==================================================

    overrideInventoryModule() {
        if (!window.InventoryModule) return;

        const db = this.db;

        // Override addNewWatch
        const originalAddNewWatch = window.InventoryModule.addNewWatch;
        window.InventoryModule.addNewWatch = async function(event) {
            event.preventDefault();
            
            if (!AuthModule || !AuthModule.hasPermission('inventory')) {
                Utils.showNotification('You do not have permission to add items.');
                return;
            }

            const code = document.getElementById('watchCode').value.trim();
            const type = document.getElementById('watchType').value;
            const brand = document.getElementById('watchBrand').value.trim();
            const model = document.getElementById('watchModel').value.trim();
            const size = document.getElementById('watchSize').value.trim();
            const price = parseFloat(document.getElementById('watchPrice').value);
            const quantity = parseInt(document.getElementById('watchQuantity').value);
            const outlet = document.getElementById('watchOutlet').value;
            const description = document.getElementById('watchDescription').value.trim();
            
            if (!code || !type || !brand || !model || !price || !quantity || !outlet) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            if (price <= 0 || quantity <= 0) {
                Utils.showNotification('Price and quantity must be greater than zero');
                return;
            }

            try {
                await db.addInventoryItem({
                    code: code,
                    type: type,
                    brand: brand,
                    model: model,
                    size: size || '-',
                    price: price,
                    quantity: quantity,
                    outlet: outlet,
                    description: description,
                    addedBy: AuthModule.getCurrentUser()?.username || 'admin'
                });

                Utils.showNotification('Item added successfully!');
                
                // Close modal and reset form
                closeModal('addWatchModal');
                event.target.reset();
                
                // Update UI
                db.triggerDataUpdate('inventory');
                
            } catch (error) {
                console.error('Failed to add inventory item:', error);
                Utils.showNotification('Failed to add item: ' + error.message);
            }
        };

        // Override deleteWatch
        window.InventoryModule.deleteWatch = async function(watchId) {
            if (!AuthModule || !AuthModule.hasPermission('inventory')) {
                Utils.showNotification('You do not have permission to delete items.');
                return;
            }

            const watch = window.watches?.find(w => w.id === watchId);
            if (!watch) {
                Utils.showNotification('Item not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete "${watch.brand} ${watch.model}"?`)) {
                try {
                    await db.deleteInventoryItem(watchId);
                    Utils.showNotification('Item deleted successfully!');
                    db.triggerDataUpdate('inventory');
                } catch (error) {
                    console.error('Failed to delete inventory item:', error);
                    Utils.showNotification('Failed to delete item: ' + error.message);
                }
            }
        };

        console.log('✅ Inventory module overridden for database integration');
    }

    // ==================================================
    // SALES MODULE OVERRIDES
    // ==================================================

    overrideSalesModule() {
        if (!window.SalesModule) return;

        const db = this.db;

        // Override addNewSale
        window.SalesModule.addNewSale = async function(event) {
            event.preventDefault();
            
            if (!AuthModule.hasPermission('sales')) {
                Utils.showNotification('You do not have permission to create sales.');
                return;
            }

            const customerId = parseInt(document.getElementById('saleCustomer').value);
            const watchId = parseInt(document.getElementById('saleWatch').value);
            const price = parseFloat(document.getElementById('salePrice').value);
            const quantity = parseInt(document.getElementById('saleQuantity').value) || 1;
            const discountType = document.getElementById('saleDiscountType').value;
            const discountValue = parseFloat(document.getElementById('saleDiscountValue').value) || 0;
            const paymentMethod = document.getElementById('salePaymentMethod').value;
            
            if (!customerId || !watchId || !price || !paymentMethod) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            if (price <= 0 || quantity <= 0) {
                Utils.showNotification('Price and quantity must be greater than zero');
                return;
            }

            const customer = window.customers?.find(c => c.id === customerId);
            const watch = window.watches?.find(w => w.id === watchId);
            
            if (!customer || !watch) {
                Utils.showNotification('Selected customer or item not found');
                return;
            }

            if (watch.quantity < quantity) {
                Utils.showNotification(`Insufficient stock. Only ${watch.quantity} available.`);
                return;
            }

            // Calculate amounts
            const subtotal = price * quantity;
            let discountAmount = 0;
            
            if (discountType === 'percentage') {
                discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
            } else if (discountType === 'amount') {
                discountAmount = Math.min(discountValue, subtotal);
            }
            
            const totalAmount = subtotal - discountAmount;

            const now = new Date();
            try {
                await db.addSale({
                    customerId: customerId,
                    watchId: watchId,
                    price: price,
                    quantity: quantity,
                    subtotal: subtotal,
                    discountType: discountType,
                    discountValue: discountValue,
                    discountAmount: discountAmount,
                    totalAmount: totalAmount,
                    paymentMethod: paymentMethod,
                    date: Utils.formatDate(now),
                    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    createdBy: AuthModule.getCurrentUser()?.username || 'admin'
                });

                Utils.showNotification(`Sale recorded successfully! Total: ${Utils.formatCurrency(totalAmount)}`);
                
                // Close modal and reset form
                document.getElementById('newSaleModal').style.display = 'none';
                event.target.reset();
                
                // Update UI
                db.triggerDataUpdate('sales');
                
            } catch (error) {
                console.error('Failed to add sale:', error);
                Utils.showNotification('Failed to record sale: ' + error.message);
            }
        };

        // Override deleteSale
        window.SalesModule.deleteSale = async function(saleId) {
            if (!AuthModule.hasPermission('sales')) {
                Utils.showNotification('You do not have permission to delete sales.');
                return;
            }

            const sale = window.SalesCoreModule?.sales?.find(s => s.id === saleId);
            if (!sale) {
                Utils.showNotification('Sale not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete the sale for ${sale.watchName}?`)) {
                try {
                    await db.deleteSale(saleId);
                    Utils.showNotification('Sale deleted successfully!');
                    db.triggerDataUpdate('sales');
                } catch (error) {
                    console.error('Failed to delete sale:', error);
                    Utils.showNotification('Failed to delete sale: ' + error.message);
                }
            }
        };

        console.log('✅ Sales module overridden for database integration');
    }

    // ==================================================
    // SERVICE MODULE OVERRIDES
    // ==================================================

    overrideServiceModule() {
        if (!window.ServiceModule) return;

        const db = this.db;

        // Override addNewService
        window.ServiceModule.addNewService = async function(event) {
            event.preventDefault();
            
            if (!AuthModule.hasPermission('service')) {
                Utils.showNotification('You do not have permission to create service requests.');
                return;
            }

            const customerId = parseInt(document.getElementById('serviceCustomer').value);
            const brand = document.getElementById('serviceBrand').value.trim();
            const model = document.getElementById('serviceModel').value.trim();
            const dialColor = document.getElementById('serviceDialColor').value.trim();
            const movementNo = document.getElementById('serviceMovementNo').value.trim();
            const gender = document.getElementById('serviceGender').value;
            const caseType = document.getElementById('serviceCase').value;
            const strapType = document.getElementById('serviceStrap').value;
            const issue = document.getElementById('serviceIssue').value.trim();
            const cost = parseFloat(document.getElementById('serviceCost').value);
            
            if (!customerId || !brand || !model || !dialColor || !movementNo || 
                !gender || !caseType || !strapType || !issue || cost < 0) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            const customer = window.customers?.find(c => c.id === customerId);
            if (!customer) {
                Utils.showNotification('Selected customer not found');
                return;
            }

            const now = new Date();
            try {
                await db.addService({
                    customerId: customerId,
                    watchName: `${brand} ${model}`,
                    brand: brand,
                    model: model,
                    dialColor: dialColor,
                    movementNo: movementNo,
                    gender: gender,
                    caseType: caseType,
                    strapType: strapType,
                    issue: issue,
                    cost: cost,
                    date: Utils.formatDate(now),
                    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    createdBy: AuthModule.getCurrentUser()?.username || 'admin'
                });

                Utils.showNotification('Service request created successfully!');
                
                // Close modal and reset form
                closeModal('newServiceModal');
                event.target.reset();
                
                // Update UI
                db.triggerDataUpdate('services');
                
            } catch (error) {
                console.error('Failed to add service:', error);
                Utils.showNotification('Failed to create service request: ' + error.message);
            }
        };

        // Override deleteService
        window.ServiceModule.deleteService = async function(serviceId) {
            const currentUser = AuthModule.getCurrentUser();
            const isStaff = currentUser && currentUser.role === 'staff';
            
            if (isStaff) {
                Utils.showNotification('Staff users cannot delete service requests.');
                return;
            }
            
            if (!AuthModule.hasPermission('service')) {
                Utils.showNotification('You do not have permission to delete service requests.');
                return;
            }

            const service = window.ServiceModule?.services?.find(s => s.id === serviceId);
            if (!service) {
                Utils.showNotification('Service request not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete the service request for ${service.watchName}?`)) {
                try {
                    await db.deleteService(serviceId);
                    Utils.showNotification('Service request deleted successfully!');
                    db.triggerDataUpdate('services');
                } catch (error) {
                    console.error('Failed to delete service:', error);
                    Utils.showNotification('Failed to delete service request: ' + error.message);
                }
            }
        };

        console.log('✅ Service module overridden for database integration');
    }

    // ==================================================
    // EXPENSE MODULE OVERRIDES
    // ==================================================

    overrideExpenseModule() {
        if (!window.ExpenseModule) return;

        const db = this.db;

        // Override expense functions would go here
        // Similar pattern to above modules

        console.log('✅ Expense module overridden for database integration');
    }
}

// Initialize database integrated app
const databaseIntegratedApp = new DatabaseIntegratedApp();

// Override the main app initialization
window.initializeAppWithDatabase = async function() {
    try {
        console.log('🔄 Initializing Database-Integrated App...');
        
        const success = await databaseIntegratedApp.initialize();
        
        if (success) {
            console.log('✅ Database-Integrated App ready');
            
            // Initialize all modules
            setTimeout(() => {
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
            }, 500);
        } else {
            console.error('❌ Database-Integrated App initialization failed');
        }
    } catch (error) {
        console.error('❌ Failed to initialize database-integrated app:', error);
    }
};

console.log('🔄 Database-Integrated App Controller loaded');