// src/dashboard.js - Updated with new service module integration
const { ipcRenderer } = require('electron');

// Import modules
const CustomerModule = require('./modules/customers');
const InventoryModule = require('./modules/inventory');
const SalesModule = require('./modules/sales');
const ServiceModule = require('./modules/service');
const ExpensesModule = require('./modules/expenses');
const InvoicesModule = require('./modules/invoices');
const UsersModule = require('./modules/users');
const LedgerModule = require('./modules/ledger');

// Global state
let currentUser = null;
let activeModule = null;

// Module instances
let customerModule, inventoryModule, salesModule, serviceModule, expensesModule, invoicesModule, usersModule, ledgerModule;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const userSession = sessionStorage.getItem('currentUser');
    if (!userSession) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userSession);
    
    // Update user info in sidebar
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    
    // Hide user management for non-admin users
    if (currentUser.role !== 'admin') {
        document.getElementById('usersNav').style.display = 'none';
    }
    
    // Initialize modules
    await initializeModules();
    
    // Load initial data
    await loadDashboardStats();
    
    // Setup event listeners
    setupEventListeners();
});

async function initializeModules() {
    try {
        console.log('Starting module initialization...');
        
        // Initialize module instances
        customerModule = new CustomerModule(currentUser);
        inventoryModule = new InventoryModule(currentUser);
        if (typeof SalesModule !== 'undefined') {
            salesModule = new SalesModule(currentUser);
            // Set references to other modules after all modules are created
            salesModule.customerModule = customerModule;
            salesModule.inventoryModule = inventoryModule;
            window.salesModule = () => salesModule; // Make it a function for global access
        }
        serviceModule = new ServiceModule(currentUser, customerModule);
        expensesModule = new ExpensesModule(currentUser);
        invoicesModule = new InvoicesModule(currentUser);
        if (currentUser.role === 'admin') {
            usersModule = new UsersModule(currentUser);
        }
        ledgerModule = new LedgerModule(currentUser);

        console.log('Module instances created, starting initialization...');

        // Initialize each module with proper error handling
        try {
            await customerModule.init();
            console.log('✅ Customer module initialized');
        } catch (error) {
            console.error('❌ Customer module failed:', error);
        }

        try {
            await inventoryModule.init();
            console.log('✅ Inventory module initialized');
        } catch (error) {
            console.error('❌ Inventory module failed:', error);
        }

        try {
            await salesModule.init();
            console.log('✅ Sales module initialized');
        } catch (error) {
            console.error('❌ Sales module failed:', error);
        }

        try {
            await serviceModule.init();
            console.log('✅ Service module initialized');
        } catch (error) {
            console.error('❌ Service module failed:', error);
            alert('Error initializing Service Module: ' + error.message);
        }

        try {
            await expensesModule.init();
            console.log('✅ Expenses module initialized');
        } catch (error) {
            console.error('❌ Expenses module failed:', error);
        }

        try {
            await invoicesModule.init();
            console.log('✅ Invoices module initialized');
        } catch (error) {
            console.error('❌ Invoices module failed:', error);
        }

        if (usersModule) {
            try {
                await usersModule.init();
                console.log('✅ Users module initialized');
            } catch (error) {
                console.error('❌ Users module failed:', error);
            }
        }

        try {
            await ledgerModule.init();
            console.log('✅ Ledger module initialized');
        } catch (error) {
            console.error('❌ Ledger module failed:', error);
        }

        // Make modules globally accessible
        window.customerModule = () => customerModule;
        window.inventoryModule = () => inventoryModule;
        window.salesModule = () => salesModule;
        window.serviceModule = () => serviceModule;
        window.expensesModule = () => expensesModule;
        window.invoicesModule = () => invoicesModule;
        window.usersModule = () => usersModule;
        
        console.log('All modules initialized successfully');
        
    } catch (error) {
        console.error('Critical error initializing modules:', error);
        alert('Error initializing application modules: ' + error.message);
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.dataset.module;
            console.log('Navigation clicked:', module);
            switchModule(module);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });

    // Service-specific event listeners
    setTimeout(() => {
        // Service Item Form submission
        const serviceItemForm = document.getElementById('serviceItemForm');
        if (serviceItemForm) {
            serviceItemForm.addEventListener('submit', (e) => {
                if (serviceModule && serviceModule.handleServiceItemForm) {
                    serviceModule.handleServiceItemForm(e);
                }
            });
        }

        // Add Comment Form submission
        const addCommentForm = document.getElementById('addCommentForm');
        if (addCommentForm) {
            addCommentForm.addEventListener('submit', (e) => {
                if (serviceModule && serviceModule.handleAddComment) {
                    serviceModule.handleAddComment(e);
                }
            });
        }

        // Service Job Form submission
        const serviceJobForm = document.getElementById('serviceJobForm');
        if (serviceJobForm) {
            serviceJobForm.addEventListener('submit', (e) => {
                if (serviceModule && serviceModule.handleServiceJobSubmit) {
                    serviceModule.handleServiceJobSubmit(e);
                }
            });
        }

        // Update Service Status Form submission
        const updateServiceStatusForm = document.getElementById('updateServiceStatusForm');
        if (updateServiceStatusForm) {
            updateServiceStatusForm.addEventListener('submit', (e) => {
                if (serviceModule && serviceModule.handleUpdateServiceStatus) {
                    serviceModule.handleUpdateServiceStatus(e);
                }
            });
        }
    }, 1000); // Delay to ensure DOM is ready
}

function switchModule(module) {
    console.log('Switching to module:', module);
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-module="${module}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Update content
    document.querySelectorAll('.module-content').forEach(content => {
        content.classList.remove('active');
    });
    const moduleContent = document.getElementById(`${module}-content`);
    if (moduleContent) {
        moduleContent.classList.add('active');
        console.log('✅ Switched to', module, 'content');
    } else {
        console.error('❌ Module content not found for:', module);
    }
    
    // Update page header and actions
    updatePageHeader(module);
    
    // Set active module and load data
    activeModule = module;
    
    // Special handling for different modules
    switch (module) {
        case 'sales':
            if (salesModule) {
                console.log('Loading sales module data...');
                loadModuleData(module);
                
                // Ensure sales module content is properly rendered
                setTimeout(() => {
                    if (salesModule && !salesModule.isInitialized) {
                        console.log('Re-initializing sales module...');
                        salesModule.init().catch(error => {
                            console.error('Failed to re-initialize sales module:', error);
                        });
                    }
                }, 100);
            }
            break;
            
        case 'service':
            if (serviceModule) {
                console.log('Loading service module data...');
                loadModuleData(module);
                
                // Ensure service module content is properly rendered
                setTimeout(() => {
                    if (serviceModule && !serviceModule.isInitialized) {
                        console.log('Re-initializing service module...');
                        serviceModule.init().catch(error => {
                            console.error('Failed to re-initialize service module:', error);
                        });
                    }
                }, 100);
            }
            break;
            
        default:
            loadModuleData(module);
            break;
    }
}

function updatePageHeader(module) {
    const pageTitle = document.getElementById('pageTitle');
    const headerActions = document.getElementById('headerActions');
    
    if (!pageTitle || !headerActions) return;
    
    headerActions.innerHTML = '';
    
    switch (module) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard';
            break;
        case 'customers':
            pageTitle.textContent = 'Customer Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="openCustomerModal()">Add Customer</button>';
            break;
        case 'inventory':
            pageTitle.textContent = 'Inventory Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="openInventoryModal()">Add Item</button>';
            break;
        case 'sales':
            pageTitle.textContent = 'Sales Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="openNewSaleModal()">New Sale</button>';
            break;
        case 'service':
            pageTitle.textContent = 'Service Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="openNewServiceModal()">New Service</button>';
            break;
        case 'invoices':
            pageTitle.textContent = 'Invoices';
            break;
        case 'expenses':
            pageTitle.textContent = 'Expenses Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="openExpenseModal()">Add Expense</button>';
            break;
        case 'users':
            pageTitle.textContent = 'User Management';
            if (currentUser.role === 'admin') {
                headerActions.innerHTML = '<button class="btn btn-primary" onclick="openUserModal()">Add User</button>';
            }
            break;
        case 'ledger':
            pageTitle.textContent = 'Daily Ledger';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="ledgerModule().openCOBModal()">Close of Business</button>';
            break;
        default:
            pageTitle.textContent = module.charAt(0).toUpperCase() + module.slice(1);
    }
}

async function loadModuleData(module) {
    try {
        console.log('Loading data for module:', module);
        
        switch (module) {
            case 'customers':
                if (customerModule) await customerModule.loadData();
                break;
            case 'inventory':
                if (inventoryModule) await inventoryModule.loadData();
                break;
            case 'sales':
                if (salesModule) {
                    try {
                        await salesModule.loadData(); // This now uses get-sales-with-items
                        console.log('✅ Sales data loaded successfully');
                    } catch (error) {
                        console.error('❌ Failed to load sales data:', error);
                        // Try to re-render the sales view
                        if (salesModule.renderInitialView) {
                            salesModule.renderInitialView();
                        }
                    }
                }
                break;
            case 'service':
                if (serviceModule) {
                    try {
                        await serviceModule.loadData();
                        console.log('✅ Service data loaded successfully');
                    } catch (error) {
                        console.error('❌ Failed to load service data:', error);
                        if (serviceModule.renderInitialView) {
                            serviceModule.renderInitialView();
                        }
                    }
                }
                break;
            case 'invoices':
                if (invoicesModule) await invoicesModule.loadData();
                break;
            case 'expenses':
                if (expensesModule) await expensesModule.loadData();
                break;
            case 'users':
                if (usersModule) await usersModule.loadData();
                break;
            case 'ledger':
                if (ledgerModule) await ledgerModule.loadData();
                break;
            default:
                console.log('No specific data loading required for:', module);
        }
    } catch (error) {
        console.error('Error loading module data:', error);
        alert('Error loading module data: ' + error.message);
    }
}

// Add enhanced error handling for module operations
function handleModuleError(moduleName, operation, error) {
    console.error(`Error in ${moduleName} module during ${operation}:`, error);
    
    const errorMessage = `Error in ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} module: ${error.message || 'Unknown error'}`;
    
    if (window.showError) {
        window.showError(errorMessage);
    } else {
        alert(errorMessage);
    }
}

function updateDashboardCard(elementId, value, label) {
    const element = document.getElementById(elementId);
    if (element) {
        // Format currency values
        const formattedValue = typeof value === 'number' && label.includes('Sales') || label.includes('Revenue') 
            ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` 
            : value.toLocaleString('en-IN');
        
        element.textContent = formattedValue;
    }
}

// Enhanced dashboard stats loading with sales integration
async function loadDashboardStats() {
    try {
        const stats = await ipcRenderer.invoke('get-dashboard-stats');
        
        // Update dashboard cards
        updateDashboardCard('totalSales', stats.sales.total_sales_value || 0, 'Total Sales');
        updateDashboardCard('totalServices', stats.services.total_service_revenue || 0, 'Service Revenue');
        updateDashboardCard('totalCustomers', stats.customers.total_customers || 0, 'Total Customers');
        updateDashboardCard('lowStockItems', stats.inventory.low_stock_items || 0, 'Low Stock Items');
        
        // Update today's performance
        updateDashboardCard('todaySales', stats.sales.today_sales_value || 0, 'Today\'s Sales');
        updateDashboardCard('todayServices', stats.services.today_services || 0, 'Today\'s Services');
        updateDashboardCard('monthSales', stats.sales.month_sales_value || 0, 'This Month Sales');
        
        console.log('✅ Dashboard stats loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard stats:', error);
        handleModuleError('dashboard', 'loading stats', error);
    }
}


// Global utility functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Make functions globally available
window.closeModal = closeModal;
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};
window.showSuccess = showSuccess;
window.showError = showError;
window.loadDashboardStats = loadDashboardStats;

// Header action functions
function openCustomerModal() {
    if (customerModule) {
        customerModule.openModal();
    }
}

function openInventoryModal() {
    if (inventoryModule) {
        inventoryModule.openModal();
    }
}

function openUserModal() {
    if (usersModule) {
        usersModule.openModal();
    }
}

// Sales Module Functions
function openNewSaleModal() {
    if (salesModule) {
        salesModule.openNewSaleModal();
    }
}

// Service Module Functions
function openNewServiceModal() {
    if (serviceModule) {
        serviceModule.openNewServiceModal();
    }
}

// Inventory module functions
function inventoryEdit(id) {
    if (inventoryModule) {
        inventoryModule.edit(id);
    }
}

function inventoryDelete(id) {
    if (inventoryModule) {
        inventoryModule.delete(id);
    }
}

function searchInventory() {
    if (inventoryModule) {
        inventoryModule.searchInventory();
    }
}

function clearSearch() {
    if (inventoryModule) {
        inventoryModule.clearSearch();
    }
}

function filterByCategory() {
    if (inventoryModule) {
        inventoryModule.filterInventory();
    }
}

function filterByOutlet() {
    if (inventoryModule) {
        inventoryModule.filterInventory();
    }
}

function toggleCategoryFields() {
    if (inventoryModule) {
        inventoryModule.toggleCategoryFields();
    }
}

// Customer module functions
function searchCustomers() {
    if (customerModule) {
        customerModule.searchCustomers();
    }
}

function clearCustomerSearch() {
    if (customerModule) {
        customerModule.clearCustomerSearch();
    }
}

// Global functions for Service Module
window.addServiceItem = function() {
    if (serviceModule && serviceModule.addServiceItem) {
        serviceModule.addServiceItem();
    }
};

window.createServiceJob = function() {
    if (serviceModule && serviceModule.createServiceJob) {
        serviceModule.createServiceJob();
    }
};

window.clearServiceForm = function() {
    if (serviceModule && serviceModule.clearServiceForm) {
        serviceModule.clearServiceForm();
    }
};

window.searchServices = function() {
    if (serviceModule && serviceModule.searchServices) {
        serviceModule.searchServices();
    }
};

window.clearServiceSearch = function() {
    if (serviceModule && serviceModule.clearServiceSearch) {
        serviceModule.clearServiceSearch();
    }
};

window.filterServicesByStatus = function() {
    if (serviceModule && serviceModule.filterServicesByStatus) {
        serviceModule.filterServicesByStatus();
    }
};

window.filterServicesByLocation = function() {
    if (serviceModule && serviceModule.filterServicesByLocation) {
        serviceModule.filterServicesByLocation();
    }
};

window.filterServices = function() {
    if (serviceModule && serviceModule.filterServices) {
        serviceModule.filterServices();
    }
};

window.toggleServiceCategoryFields = function() {
    if (serviceModule && serviceModule.toggleServiceCategoryFields) {
        serviceModule.toggleServiceCategoryFields();
    }
};

// Global functions for Expenses Module
window.clearExpenseForm = function() {
    if (expensesModule && expensesModule.clearExpenseForm) {
        expensesModule.clearExpenseForm();
    }
};

window.searchExpenses = function() {
    if (expensesModule && expensesModule.searchExpenses) {
        expensesModule.searchExpenses();
    }
};

window.clearExpenseSearch = function() {
    if (expensesModule && expensesModule.clearExpenseSearch) {
        expensesModule.clearExpenseSearch();
    }
};

// Global functions for Invoices Module
window.searchInvoices = function() {
    if (invoicesModule && invoicesModule.searchInvoices) {
        invoicesModule.searchInvoices();
    }
};

window.clearInvoiceSearch = function() {
    if (invoicesModule && invoicesModule.clearInvoiceSearch) {
        invoicesModule.clearInvoiceSearch();
    }
};

window.filterInvoicesByType = function() {
    if (invoicesModule && invoicesModule.filterInvoicesByType) {
        invoicesModule.filterInvoicesByType();
    }
};

window.printCurrentInvoice = function() {
    if (invoicesModule && invoicesModule.printCurrentInvoice) {
        invoicesModule.printCurrentInvoice();
    }
};

// Sales Module Global Functions
window.addItemToSale = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.addItemToSale) {
        salesMod.addItemToSale();
    }
};

window.clearSaleForm = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.clearSaleForm) {
        salesMod.clearSaleForm();
    }
};

window.completeSale = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.completeSale) {
        salesMod.completeSale();
    }
};

window.addPaymentMethod = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.addPaymentMethod) {
        salesMod.addPaymentMethod();
    }
};

window.searchSales = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.searchSales) {
        salesMod.searchSales();
    }
};

window.clearSalesSearch = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.clearSalesSearch) {
        salesMod.clearSalesSearch();
    }
};

window.filterSales = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.filterSales) {
        salesMod.filterSales();
    }
};


// Make all header functions globally available
window.openCustomerModal = openCustomerModal;
window.openInventoryModal = openInventoryModal;
window.openUserModal = openUserModal;
// Enhanced global function for Sales Module
window.openNewSaleModal = function() {
    const salesMod = window.salesModule();
    if (salesMod && salesMod.openNewSaleModal) {
        salesMod.openNewSaleModal();
    } else {
        console.error('Sales module not available or method not found');
    }
};
window.openNewServiceModal = openNewServiceModal;
window.inventoryEdit = inventoryEdit;
window.inventoryDelete = inventoryDelete;
window.searchInventory = searchInventory;
window.clearSearch = clearSearch;
window.filterByCategory = filterByCategory;
window.filterByOutlet = filterByOutlet;
window.toggleCategoryFields = toggleCategoryFields;
window.searchCustomers = searchCustomers;
window.clearCustomerSearch = clearCustomerSearch;