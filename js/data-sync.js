// ZEDSON WATCHCRAFT - Real-time Data Synchronization Module

/**
 * Data Sync Module - Integrates all modules with MongoDB real-time sync
 * This module overrides the original data operations to sync with MongoDB
 */

class DataSyncModule {
    constructor() {
        this.isInitialized = false;
        this.syncInProgress = false;
    }

    /**
     * Initialize data sync for all modules
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('Initializing Data Sync Module...');
        
        try {
            // Wait for MongoDB service to be ready
            await this.waitForMongoService();
            
            // Override module functions with MongoDB sync
            this.overrideCustomerModule();
            this.overrideInventoryModule();
            this.overrideSalesModule();
            this.overrideServiceModule();
            this.overrideExpenseModule();
            this.overrideInvoiceModule();
            
            // Ensure global functions are available
            this.assignGlobalFunctions();
            
            this.isInitialized = true;
            console.log('Data Sync Module initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Data Sync Module:', error);
        }
    }

    /**
     * Assign global functions to ensure action buttons work
     */
    assignGlobalFunctions() {
        // Make sure all action functions are globally available
        window.openAddWatchModal = () => {
            if (window.InventoryModule) {
                InventoryModule.openAddWatchModal();
            }
        };

        window.openAddCustomerModal = () => {
            if (window.CustomerModule) {
                CustomerModule.openAddCustomerModal();
            }
        };

        window.openNewSaleModal = () => {
            if (window.SalesModule) {
                SalesModule.openNewSaleModal();
            }
        };

        window.openNewServiceModal = () => {
            if (window.ServiceModule) {
                ServiceModule.openNewServiceModal();
            }
        };

        window.openAddExpenseModal = () => {
            if (window.ExpenseModule) {
                ExpenseModule.openAddExpenseModal();
            }
        };

        window.openAddUserModal = () => {
            if (window.AuthModule) {
                AuthModule.openAddUserModal();
            }
        };

        // Search functions
        window.searchWatches = (query) => {
            if (window.InventoryModule) {
                InventoryModule.searchWatches(query);
            }
        };

        window.searchCustomers = (query) => {
            if (window.CustomerModule) {
                CustomerModule.searchCustomers(query);
            }
        };

        window.searchSales = (query) => {
            if (window.SalesModule) {
                SalesModule.searchSales(query);
            }
        };

        window.searchServices = (query) => {
            if (window.ServiceModule) {
                ServiceModule.searchServices(query);
            }
        };

        window.searchExpenses = (query) => {
            if (window.ExpenseModule) {
                ExpenseModule.searchExpenses(query);
            }
        };

        window.searchInvoices = (query) => {
            if (window.InvoiceModule) {
                InvoiceModule.searchInvoices(query);
            }
        };

        window.filterInvoicesByType = () => {
            if (window.InvoiceModule) {
                InvoiceModule.filterInvoicesByType();
            }
        };

        // Status update functions
        window.updateServiceStatus = (serviceId, status) => {
            if (window.ServiceModule) {
                ServiceModule.updateServiceStatus(serviceId, status);
            }
        };

        // Other utility functions
        window.confirmTransaction = (message, callback) => {
            if (confirm(message)) {
                callback();
            }
        };

        // Edit functions - Add these missing assignments
        window.editWatch = (watchId) => {
            if (window.InventoryModule) {
                InventoryModule.editWatch(watchId);
            }
        };

        window.deleteWatch = (watchId) => {
            if (window.InventoryModule) {
                InventoryModule.deleteWatch(watchId);
            }
        };

        window.editCustomer = (customerId) => {
            if (window.CustomerModule) {
                CustomerModule.editCustomer(customerId);
            }
        };

        window.deleteCustomer = (customerId) => {
            if (window.CustomerModule) {
                CustomerModule.deleteCustomer(customerId);
            }
        };

        window.initiateSaleFromCustomer = (customerId) => {
            if (window.CustomerModule) {
                CustomerModule.initiateSaleFromCustomer(customerId);
            }
        };

        window.initiateServiceFromCustomer = (customerId) => {
            if (window.CustomerModule) {
                CustomerModule.initiateServiceFromCustomer(customerId);
            }
        };

        console.log('Global functions assigned for action buttons');
    }

    /**
     * Wait for MongoDB service to be available
     */
    async waitForMongoService() {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            if (window.mongoService) {
                const status = window.mongoService.getConnectionStatus();
                if (status.isOnline) {
                    return;
                }
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('MongoDB service not available');
    }

    /**
     * Override Customer Module functions
     */
    overrideCustomerModule() {
        if (!window.CustomerModule) return;

        // Store original functions
        const originalAddNewCustomer = CustomerModule.addNewCustomer;
        const originalUpdateCustomer = CustomerModule.updateCustomer;
        const originalDeleteCustomer = CustomerModule.deleteCustomer;

        // Override addNewCustomer
        CustomerModule.addNewCustomer = async (event) => {
            event.preventDefault();
            
            if (!AuthModule.hasPermission('customers')) {
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
                const newCustomer = {
                    name: name,
                    email: email,
                    phone: phone,
                    address: address,
                    purchases: 0,
                    serviceCount: 0,
                    netValue: 0,
                    addedDate: Utils.formatDate(new Date()),
                    addedBy: AuthModule.getCurrentUser().username
                };

                const response = await window.mongoService.createCustomer(newCustomer);
                
                if (response.success) {
                    // Add to local array
                    const customerWithId = {
                        ...newCustomer,
                        id: response.customerId
                    };
                    CustomerModule.customers.push(customerWithId);
                    
                    if (window.logCustomerAction) {
                        logCustomerAction('Added new customer: ' + name, customerWithId);
                    }
                    
                    CustomerModule.renderCustomerTable();
                    if (window.updateDashboard) updateDashboard();
                    
                    closeModal('addCustomerModal');
                    event.target.reset();
                    Utils.showNotification('Customer added successfully!');
                }
            } catch (error) {
                console.error('Add customer error:', error);
                Utils.showNotification(error.message || 'Failed to add customer');
            }
        };

        // Override updateCustomer
        CustomerModule.updateCustomer = async (event, customerId) => {
            event.preventDefault();
            
            const customer = CustomerModule.customers.find(c => c.id === customerId);
            if (!customer) {
                Utils.showNotification('Customer not found.');
                return;
            }

            const name = document.getElementById('editCustomerName').value.trim();
            const email = document.getElementById('editCustomerEmail').value.trim();
            const phone = document.getElementById('editCustomerPhone').value.trim();
            const address = document.getElementById('editCustomerAddress').value.trim();

            if (!name || !email || !phone) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            try {
                const updateData = {
                    name: name,
                    email: email,
                    phone: phone,
                    address: address
                };

                await window.mongoService.updateCustomer(customerId, updateData);
                
                // Update local data
                Object.assign(customer, updateData);
                
                if (window.logCustomerAction) {
                    logCustomerAction('Updated customer: ' + customer.name, customer);
                }

                CustomerModule.renderCustomerTable();
                if (window.updateDashboard) updateDashboard();
                closeModal('editCustomerModal');
                document.getElementById('editCustomerModal').remove();
                Utils.showNotification('Customer updated successfully!');
                
            } catch (error) {
                console.error('Update customer error:', error);
                Utils.showNotification('Failed to update customer');
            }
        };

        // Override deleteCustomer
        CustomerModule.deleteCustomer = async (customerId) => {
            const currentUser = AuthModule.getCurrentUser();
            const isStaff = currentUser && currentUser.role === 'staff';
            
            if (isStaff) {
                Utils.showNotification('Staff users cannot delete customers.');
                return;
            }

            const customer = CustomerModule.customers.find(c => c.id === customerId);
            if (!customer) {
                Utils.showNotification('Customer not found.');
                return;
            }

            if (confirm('Are you sure you want to delete customer "' + customer.name + '"?')) {
                try {
                    await window.mongoService.deleteCustomer(customerId);
                    
                    // Remove from local array
                    const index = CustomerModule.customers.findIndex(c => c.id === customerId);
                    if (index > -1) {
                        CustomerModule.customers.splice(index, 1);
                    }
                    
                    if (window.logCustomerAction) {
                        logCustomerAction('Deleted customer: ' + customer.name, customer);
                    }
                    
                    CustomerModule.renderCustomerTable();
                    if (window.updateDashboard) updateDashboard();
                    Utils.showNotification('Customer deleted successfully!');
                    
                } catch (error) {
                    console.error('Delete customer error:', error);
                    Utils.showNotification('Failed to delete customer');
                }
            }
        };
    }

    /**
     * Override Inventory Module functions
     */
    overrideInventoryModule() {
        if (!window.InventoryModule) return;

        // Store original functions
        const originalAddNewWatch = InventoryModule.addNewWatch;
        const originalUpdateWatch = InventoryModule.updateWatch;
        const originalDeleteWatch = InventoryModule.deleteWatch;

        // Override addNewWatch
        InventoryModule.addNewWatch = async (event) => {
            event.preventDefault();
            
            if (!AuthModule.hasPermission('inventory')) {
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

            if (price <= 0) {
                Utils.showNotification('Price must be greater than zero');
                return;
            }

            try {
                const newWatch = {
                    code: code,
                    type: type,
                    brand: brand,
                    model: model,
                    size: size || '-',
                    price: price,
                    quantity: quantity,
                    outlet: outlet,
                    description: description,
                    status: 'available',
                    addedDate: Utils.getCurrentTimestamp(),
                    addedBy: AuthModule.getCurrentUser().username,
                    movementHistory: [{
                        date: Utils.getCurrentTimestamp().split(' ')[0],
                        fromOutlet: null,
                        toOutlet: outlet,
                        reason: "Initial stock",
                        movedBy: AuthModule.getCurrentUser().username
                    }]
                };

                const response = await window.mongoService.createInventoryItem(newWatch);
                
                if (response.success) {
                    // Add to local array
                    const watchWithId = {
                        ...newWatch,
                        id: response.itemId
                    };
                    InventoryModule.watches.push(watchWithId);
                    
                    InventoryModule.renderWatchTable();
                    if (window.updateDashboard) updateDashboard();
                    
                    closeModal('addWatchModal');
                    event.target.reset();
                    Utils.showNotification('Item added successfully!');
                }
            } catch (error) {
                console.error('Add watch error:', error);
                Utils.showNotification(error.message || 'Failed to add item');
            }
        };

        // Override updateWatch
        InventoryModule.updateWatch = async (event, watchId, originalOutlet) => {
            event.preventDefault();
            
            const watch = InventoryModule.watches.find(w => w.id === watchId);
            if (!watch) {
                Utils.showNotification('Item not found.');
                return;
            }

            const code = document.getElementById('editWatchCode').value.trim();
            const type = document.getElementById('editWatchType').value;
            const brand = document.getElementById('editWatchBrand').value.trim();
            const model = document.getElementById('editWatchModel').value.trim();
            const size = document.getElementById('editWatchSize').value.trim();
            const price = parseFloat(document.getElementById('editWatchPrice').value);
            const quantity = parseInt(document.getElementById('editWatchQuantity').value);
            const outlet = document.getElementById('editWatchOutlet').value;
            const description = document.getElementById('editWatchDescription').value.trim();
            const movementDate = document.getElementById('movementDate').value;
            const movementReason = document.getElementById('movementReason').value;

            if (!code || !type || !brand || !model || !price || quantity < 0 || !outlet) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            if (outlet !== originalOutlet && !movementDate) {
                Utils.showNotification('Movement date is required when changing outlet');
                return;
            }

            try {
                const updateData = {
                    code: code,
                    type: type,
                    brand: brand,
                    model: model,
                    size: size || '-',
                    price: price,
                    quantity: quantity,
                    outlet: outlet,
                    description: description,
                    status: quantity > 0 ? 'available' : 'sold'
                };

                // Handle outlet change and movement tracking
                if (outlet !== originalOutlet) {
                    if (!watch.movementHistory) {
                        watch.movementHistory = [];
                    }
                    
                    updateData.movementHistory = [...watch.movementHistory, {
                        date: movementDate,
                        fromOutlet: originalOutlet,
                        toOutlet: outlet,
                        reason: movementReason || 'Stock Transfer',
                        movedBy: AuthModule.getCurrentUser().username,
                        timestamp: Utils.getCurrentTimestamp()
                    }];
                }

                await window.mongoService.updateInventoryItem(watchId, updateData);
                
                // Update local data
                Object.assign(watch, updateData);

                InventoryModule.renderWatchTable();
                if (window.updateDashboard) updateDashboard();
                closeModal('editWatchModal');
                document.getElementById('editWatchModal').remove();
                
                if (outlet !== originalOutlet) {
                    Utils.showNotification(`Item updated and moved from ${originalOutlet} to ${outlet} successfully!`);
                } else {
                    Utils.showNotification('Item updated successfully!');
                }
                
            } catch (error) {
                console.error('Update watch error:', error);
                Utils.showNotification('Failed to update item');
            }
        };

        // Override deleteWatch
        InventoryModule.deleteWatch = async (watchId) => {
            if (!AuthModule.hasPermission('inventory')) {
                Utils.showNotification('You do not have permission to delete items.');
                return;
            }

            const watch = InventoryModule.watches.find(w => w.id === watchId);
            if (!watch) {
                Utils.showNotification('Item not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete "${watch.brand} ${watch.model}"?`)) {
                try {
                    await window.mongoService.deleteInventoryItem(watchId);
                    
                    // Remove from local array
                    const index = InventoryModule.watches.findIndex(w => w.id === watchId);
                    if (index > -1) {
                        InventoryModule.watches.splice(index, 1);
                    }
                    
                    InventoryModule.renderWatchTable();
                    if (window.updateDashboard) updateDashboard();
                    Utils.showNotification('Item deleted successfully!');
                    
                } catch (error) {
                    console.error('Delete watch error:', error);
                    Utils.showNotification('Failed to delete item');
                }
            }
        };
    }

    /**
     * Override Sales Module functions
     */
    overrideSalesModule() {
        if (!window.SalesModule) return;

        // Override addNewSale
        const originalAddNewSale = SalesModule.addNewSale;
        
        SalesModule.addNewSale = async (event) => {
            event.preventDefault();
            
            if (!AuthModule.hasPermission('sales')) {
                Utils.showNotification('You do not have permission to create sales.');
                return;
            }

            const customerId = document.getElementById('saleCustomer').value;
            const watchId = document.getElementById('saleWatch').value;
            const price = parseFloat(document.getElementById('salePrice').value);
            const quantity = parseInt(document.getElementById('saleQuantity').value) || 1;
            const discountType = document.getElementById('saleDiscountType').value;
            const discountValue = parseFloat(document.getElementById('saleDiscountValue').value) || 0;
            const paymentMethod = document.getElementById('salePaymentMethod').value;
            
            if (!customerId || !watchId || !price || !paymentMethod) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            // Find customer and watch using flexible ID matching
            const customer = CustomerModule.customers.find(c => c.id == customerId || c.id === customerId.toString());
            const watch = InventoryModule.watches.find(w => w.id == watchId || w.id === watchId.toString());
            
            if (!customer) {
                Utils.showNotification('Selected customer not found. Please refresh and try again.');
                console.error('Customer not found:', customerId, 'Available customers:', CustomerModule.customers);
                return;
            }

            if (!watch) {
                Utils.showNotification('Selected item not found. Please refresh and try again.');
                console.error('Watch not found:', watchId, 'Available watches:', InventoryModule.watches);
                return;
            }

            if (watch.quantity < quantity) {
                Utils.showNotification(`Insufficient stock. Only ${watch.quantity} available.`);
                return;
            }

            try {
                const subtotal = price * quantity;
                let discountAmount = 0;
                
                if (discountType === 'percentage') {
                    discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
                } else if (discountType === 'amount') {
                    discountAmount = Math.min(discountValue, subtotal);
                }
                
                const totalAmount = subtotal - discountAmount;

                const now = new Date();
                const newSale = {
                    date: Utils.formatDate(now),
                    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Utils.getCurrentTimestamp(),
                    customerId: customer.id,
                    customerName: customer.name,
                    watchId: watch.id,
                    watchName: `${watch.brand} ${watch.model}`,
                    watchCode: watch.code,
                    price: price,
                    quantity: quantity,
                    subtotal: subtotal,
                    discountType: discountType,
                    discountValue: discountValue,
                    discountAmount: discountAmount,
                    totalAmount: totalAmount,
                    paymentMethod: paymentMethod,
                    status: 'completed',
                    createdBy: AuthModule.getCurrentUser().username,
                    invoiceGenerated: false,
                    notes: []
                };

                const response = await window.mongoService.createSale(newSale);
                
                if (response.success) {
                    // Add to local array
                    const saleWithId = {
                        ...newSale,
                        id: response.saleId
                    };
                    SalesModule.sales.push(saleWithId);
                    
                    // Update inventory (decrease quantity) - Use the local watch object
                    watch.quantity -= quantity;
                    watch.status = watch.quantity > 0 ? 'available' : 'sold';
                    
                    // Update in database
                    try {
                        await window.mongoService.updateInventoryItem(watch.id, {
                            quantity: watch.quantity,
                            status: watch.status
                        });
                    } catch (updateError) {
                        console.warn('Failed to update inventory in database:', updateError);
                    }
                    
                    // Update customer purchase count
                    customer.purchases += 1;
                    
                    // Update in database
                    try {
                        await window.mongoService.updateCustomer(customer.id, {
                            purchases: customer.purchases
                        });
                    } catch (updateError) {
                        console.warn('Failed to update customer in database:', updateError);
                    }
                    
                    // Generate Sales Invoice automatically
                    if (window.InvoiceModule) {
                        try {
                            const invoice = InvoiceModule.generateSalesInvoice(saleWithId);
                            if (invoice) {
                                saleWithId.invoiceGenerated = true;
                                saleWithId.invoiceId = invoice.id;
                            }
                        } catch (invoiceError) {
                            console.warn('Failed to generate invoice:', invoiceError);
                        }
                    }
                    
                    // Update displays
                    SalesModule.renderSalesTable();
                    InventoryModule.renderWatchTable();
                    CustomerModule.renderCustomerTable();
                    if (window.updateDashboard) updateDashboard();
                    
                    document.getElementById('newSaleModal').style.display = 'none';
                    event.target.reset();
                    
                    Utils.showNotification(`Sale recorded successfully! Sale ID: ${saleWithId.id}. Total: ${Utils.formatCurrency(totalAmount)}.`);
                }
            } catch (error) {
                console.error('Add sale error:', error);
                Utils.showNotification(error.message || 'Failed to record sale');
            }
        };
                        if (invoice) {
                            saleWithId.invoiceGenerated = true;
                            saleWithId.invoiceId = invoice.id;
                        }
                    }
                    
                    SalesModule.renderSalesTable();
                    if (window.updateDashboard) updateDashboard();
                    
                    document.getElementById('newSaleModal').style.display = 'none';
                    event.target.reset();
                    
                    Utils.showNotification(`Sale recorded successfully! Sale ID: ${saleWithId.id}. Total: ${Utils.formatCurrency(totalAmount)}. Invoice automatically generated.`);
                }
            } catch (error) {
                console.error('Add sale error:', error);
                Utils.showNotification(error.message || 'Failed to record sale');
            }
        };

        // Override deleteSale
        SalesModule.deleteSale = async (saleId) => {
            if (!AuthModule.hasPermission('sales')) {
                Utils.showNotification('You do not have permission to delete sales.');
                return;
            }

            const sale = SalesModule.sales.find(s => s.id === saleId);
            if (!sale) {
                Utils.showNotification('Sale not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete the sale for ${sale.watchName}?`)) {
                try {
                    await window.mongoService.deleteSale(saleId);
                    
                    // Remove from local array
                    const index = SalesModule.sales.findIndex(s => s.id === saleId);
                    if (index > -1) {
                        SalesModule.sales.splice(index, 1);
                    }
                    
                    // Restore inventory and customer counts
                    InventoryModule.increaseWatchQuantity(sale.watchId, sale.quantity);
                    CustomerModule.decrementCustomerPurchases(sale.customerId);
                    
                    SalesModule.renderSalesTable();
                    if (window.updateDashboard) updateDashboard();
                    Utils.showNotification('Sale deleted successfully!');
                    
                } catch (error) {
                    console.error('Delete sale error:', error);
                    Utils.showNotification('Failed to delete sale');
                }
            }
        };
    }

    /**
     * Override Service Module functions
     */
    overrideServiceModule() {
        if (!window.ServiceModule) return;

        // Override addNewService for services
        ServiceModule.addNewService = async (event) => {
            event.preventDefault();
            
            if (!AuthModule.hasPermission('service')) {
                Utils.showNotification('You do not have permission to create service requests.');
                return;
            }

            const customerId = document.getElementById('serviceCustomer').value;
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
                !gender || !caseType || !strapType || !issue || !cost) {
                Utils.showNotification('Please fill in all required fields');
                return;
            }

            if (cost < 0) {
                Utils.showNotification('Service cost cannot be negative');
                return;
            }

            // Find customer using flexible ID matching
            const customer = CustomerModule.customers.find(c => c.id == customerId || c.id === customerId.toString());
            if (!customer) {
                Utils.showNotification('Selected customer not found. Please refresh and try again.');
                console.error('Customer not found:', customerId, 'Available customers:', CustomerModule.customers);
                return;
            }

            try {
                const now = new Date();
                const newService = {
                    date: Utils.formatDate(now),
                    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Utils.getCurrentTimestamp(),
                    customerId: customer.id,
                    customerName: customer.name,
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
                    status: 'pending',
                    createdBy: AuthModule.getCurrentUser().username,
                    estimatedDelivery: null,
                    actualDelivery: null,
                    completionImage: null,
                    completionDescription: null,
                    warrantyPeriod: null,
                    notes: [],
                    acknowledgementGenerated: false,
                    completionInvoiceGenerated: false,
                    acknowledgementInvoiceId: null,
                    completionInvoiceId: null
                };

                const response = await window.mongoService.createService(newService);
                
                if (response.success) {
                    // Add to local array
                    const serviceWithId = {
                        ...newService,
                        id: response.serviceId
                    };
                    ServiceModule.services.push(serviceWithId);
                    
                    // Update customer service count
                    customer.serviceCount += 1;
                    await window.mongoService.updateCustomer(customer.id, {
                        serviceCount: customer.serviceCount
                    });
                    
                    // Generate Service Acknowledgement automatically
                    if (window.InvoiceModule) {
                        const acknowledgement = InvoiceModule.generateServiceAcknowledgement(serviceWithId);
                        if (acknowledgement) {
                            serviceWithId.acknowledgementGenerated = true;
                            serviceWithId.acknowledgementInvoiceId = acknowledgement.id;
                        }
                    }
                    
                    if (window.logServiceAction) {
                        logServiceAction(`Created service request for ${customer.name}'s ${brand} ${model}. Estimated cost: ${Utils.formatCurrency(cost)}`, serviceWithId);
                    }
                    
                    ServiceModule.renderServiceTable();
                    CustomerModule.renderCustomerTable();
                    if (window.updateDashboard) updateDashboard();
                    
                    closeModal('newServiceModal');
                    event.target.reset();
                    
                    Utils.showNotification(`Service request created successfully! Request ID: ${serviceWithId.id}. Acknowledgement generated.`);
                }
            } catch (error) {
                console.error('Add service error:', error);
                Utils.showNotification(error.message || 'Failed to create service request');
            }
        };

        // Override deleteService
        ServiceModule.deleteService = async (serviceId) => {
            const currentUser = AuthModule.getCurrentUser();
            const isStaff = currentUser && currentUser.role === 'staff';
            
            if (isStaff) {
                Utils.showNotification('Staff users cannot delete service requests.');
                return;
            }

            const service = ServiceModule.services.find(s => s.id === serviceId);
            if (!service) {
                Utils.showNotification('Service request not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete the service request for ${service.watchName}?`)) {
                try {
                    await window.mongoService.deleteService(serviceId);
                    
                    // Remove from local array
                    const index = ServiceModule.services.findIndex(s => s.id === serviceId);
                    if (index > -1) {
                        ServiceModule.services.splice(index, 1);
                    }
                    
                    // Decrease customer service count
                    CustomerModule.decrementCustomerServices(service.customerId);
                    
                    if (window.logAction) {
                        logAction(`Deleted service request ${serviceId} for ${service.customerName}'s ${service.watchName}`);
                    }
                    
                    ServiceModule.renderServiceTable();
                    if (window.updateDashboard) updateDashboard();
                    Utils.showNotification('Service request deleted successfully!');
                    
                } catch (error) {
                    console.error('Delete service error:', error);
                    Utils.showNotification('Failed to delete service request');
                }
            }
        };
    }

    /**
     * Override Expense Module functions
     */
    overrideExpenseModule() {
        if (!window.ExpenseModule) return;

        // Override handleAddExpense
        const originalHandleAddExpense = ExpenseModule.handleAddExpense;
        
        ExpenseModule.handleAddExpense = async (event) => {
            event.preventDefault();
            
            if (!AuthModule.hasPermission('expenses')) {
                Utils.showNotification('You do not have permission to add expenses.');
                return;
            }

            const dateInput = document.getElementById('expenseDate');
            const descriptionInput = document.getElementById('expenseDescription');
            const amountInput = document.getElementById('expenseAmount');
            
            if (!dateInput || !descriptionInput || !amountInput) {
                Utils.showNotification('Form inputs not found.');
                return;
            }
            
            const date = dateInput.value.trim();
            const description = descriptionInput.value.trim();
            const amount = parseFloat(amountInput.value);
            
            if (!date || !description || !amount || amount <= 0) {
                Utils.showNotification('Please fill in all fields correctly.');
                return;
            }

            try {
                const newExpense = {
                    date: date,
                    formattedDate: Utils.formatDate(new Date(date)),
                    description: description,
                    amount: amount,
                    timestamp: Utils.getCurrentTimestamp(),
                    createdBy: AuthModule.getCurrentUser().username,
                    addedDate: Utils.formatDate(new Date())
                };

                const response = await window.mongoService.createExpense(newExpense);
                
                if (response.success) {
                    // Add to local array
                    const expenseWithId = {
                        ...newExpense,
                        id: response.expenseId
                    };
                    ExpenseModule.expenses.push(expenseWithId);
                    
                    if (window.logExpenseAction) {
                        logExpenseAction('Added new expense: ' + description + ' - ' + Utils.formatCurrency(amount), expenseWithId);
                    }
                    
                    ExpenseModule.renderExpenseTable();
                    if (window.updateDashboard) updateDashboard();
                    
                    ExpenseModule.closeExpenseModal();
                    Utils.showNotification('Expense added successfully!');
                }
            } catch (error) {
                console.error('Add expense error:', error);
                Utils.showNotification(error.message || 'Failed to add expense');
            }
        };

        // Override deleteExpense
        const originalDeleteExpense = ExpenseModule.deleteExpense;
        
        ExpenseModule.deleteExpense = async (expenseId) => {
            const currentUser = AuthModule.getCurrentUser();
            const isStaff = currentUser && currentUser.role === 'staff';
            
            if (isStaff) {
                Utils.showNotification('Staff users cannot delete expenses.');
                return;
            }

            const expense = ExpenseModule.expenses.find(e => e.id === expenseId);
            if (!expense) {
                Utils.showNotification('Expense not found.');
                return;
            }

            if (confirm(`Are you sure you want to delete expense "${expense.description}"?`)) {
                try {
                    await window.mongoService.deleteExpense(expenseId);
                    
                    // Remove from local array
                    const index = ExpenseModule.expenses.findIndex(e => e.id === expenseId);
                    if (index > -1) {
                        ExpenseModule.expenses.splice(index, 1);
                    }
                    
                    if (window.logExpenseAction) {
                        logExpenseAction('Deleted expense: ' + expense.description + ' - ' + Utils.formatCurrency(expense.amount), expense);
                    }
                    
                    ExpenseModule.renderExpenseTable();
                    if (window.updateDashboard) updateDashboard();
                    Utils.showNotification('Expense deleted successfully!');
                    
                } catch (error) {
                    console.error('Delete expense error:', error);
                    Utils.showNotification('Failed to delete expense');
                }
            }
        };
    }

    /**
     * Override Invoice Module functions
     */
    overrideInvoiceModule() {
        if (!window.InvoiceModule) return;

        // Override generateSalesInvoice
        const originalGenerateSalesInvoice = InvoiceModule.generateSalesInvoice;
        
        InvoiceModule.generateSalesInvoice = async (saleData) => {
            const customer = CustomerModule.getCustomerById(saleData.customerId);
            const watch = InventoryModule.getWatchById(saleData.watchId);
            
            if (!customer || !watch) {
                Utils.showNotification('Customer or item data not found for invoice generation');
                return null;
            }

            const invoiceData = {
                invoiceNo: Utils.generateBillNumber('Sales'),
                type: 'Sales',
                subType: 'Sales Invoice',
                date: Utils.formatDate(new Date()),
                timestamp: Utils.getCurrentTimestamp(),
                customerId: saleData.customerId,
                customerName: customer.name,
                customerPhone: customer.phone,
                customerAddress: customer.address || '',
                relatedId: saleData.id,
                relatedType: 'sale',
                amount: saleData.totalAmount,
                status: 'generated',
                createdBy: AuthModule.getCurrentUser().username,
                
                // Sales specific data
                watchName: saleData.watchName,
                watchCode: saleData.watchCode,
                quantity: saleData.quantity,
                price: saleData.price,
                paymentMethod: saleData.paymentMethod,
                discount: 0
            };

            try {
                const response = await window.mongoService.createInvoice(invoiceData);
                
                if (response.success) {
                    const invoiceWithId = {
                        ...invoiceData,
                        id: response.invoiceId
                    };
                    InvoiceModule.invoices.push(invoiceWithId);
                    
                    InvoiceModule.renderInvoiceTable();
                    if (window.updateDashboard) updateDashboard();
                    
                    Utils.showNotification('Sales invoice generated successfully!');
                    return invoiceWithId;
                }
            } catch (error) {
                console.error('Generate sales invoice error:', error);
                return null;
            }
        };
    }

    /**
     * Sync all data with MongoDB
     */
    async syncAllData() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        console.log('Starting full data sync...');
        
        try {
            // Load fresh data from MongoDB
            if (window.AuthModule && AuthModule.loadAllData) {
                await AuthModule.loadAllData();
            }
            
            console.log('Full data sync completed');
        } catch (error) {
            console.error('Data sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }
}

// Create global instance
window.dataSyncModule = new DataSyncModule();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.dataSyncModule) {
            window.dataSyncModule.initialize();
        }
    }, 500);
});

// Export for use in other modules
window.DataSyncModule = DataSyncModule;