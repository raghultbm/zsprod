const { ipcRenderer } = require('electron');

// Import modules
const CustomerModule = require('./modules/customers');
const InventoryModule = require('./modules/inventory');
const SalesModule = require('./modules/sales');
const ServiceModule = require('./modules/service');
const ExpensesModule = require('./modules/expenses');
const InvoicesModule = require('./modules/invoices');
const UsersModule = require('./modules/users');

// Global state
let currentUser = null;
let activeModule = null;

// Module instances
let customerModule, inventoryModule, salesModule, serviceModule, expensesModule, invoicesModule, usersModule;

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
        // Initialize module instances
        customerModule = new CustomerModule(currentUser);
        inventoryModule = new InventoryModule(currentUser);
        salesModule = new SalesModule(currentUser, customerModule, inventoryModule);
        serviceModule = new ServiceModule(currentUser, customerModule);
        expensesModule = new ExpensesModule(currentUser);
        invoicesModule = new InvoicesModule(currentUser);
        if (currentUser.role === 'admin') {
            usersModule = new UsersModule(currentUser);
        }

        // Initialize each module
        await customerModule.init();
        await inventoryModule.init();
        await salesModule.init();
        await serviceModule.init();
        await expensesModule.init();
        await invoicesModule.init();
        if (usersModule) {
            await usersModule.init();
        }
    } catch (error) {
        console.error('Error initializing modules:', error);
        alert('Error initializing application modules');
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.dataset.module;
            switchModule(module);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
}

function switchModule(module) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-module="${module}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.module-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${module}-content`).classList.add('active');
    
    // Update page header and actions
    updatePageHeader(module);
    
    // Set active module and load data
    activeModule = module;
    loadModuleData(module);
}

function updatePageHeader(module) {
    const pageTitle = document.getElementById('pageTitle');
    const headerActions = document.getElementById('headerActions');
    
    headerActions.innerHTML = '';
    
    switch (module) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard';
            break;
        case 'customers':
            pageTitle.textContent = 'Customer Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="customerModule.openModal()">Add Customer</button>';
            break;
        case 'inventory':
            pageTitle.textContent = 'Inventory Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="inventoryModule.openModal()">Add Item</button>';
            break;
        case 'sales':
            pageTitle.textContent = 'Sales Management';
            break;
        case 'service':
            pageTitle.textContent = 'Service Management';
            break;
        case 'invoices':
            pageTitle.textContent = 'Invoices';
            break;
        case 'expenses':
            pageTitle.textContent = 'Expenses Management';
            break;
        case 'users':
            pageTitle.textContent = 'User Management';
            if (currentUser.role === 'admin') {
                headerActions.innerHTML = '<button class="btn btn-primary" onclick="usersModule.openModal()">Add User</button>';
            }
            break;
        default:
            pageTitle.textContent = module.charAt(0).toUpperCase() + module.slice(1);
    }
}

async function loadModuleData(module) {
    try {
        switch (module) {
            case 'customers':
                await customerModule.loadData();
                break;
            case 'inventory':
                await inventoryModule.loadData();
                break;
            case 'sales':
                await salesModule.loadData();
                break;
            case 'service':
                await serviceModule.loadData();
                break;
            case 'invoices':
                await invoicesModule.loadData();
                break;
            case 'expenses':
                await expensesModule.loadData();
                break;
            case 'users':
                if (usersModule) {
                    await usersModule.loadData();
                }
                break;
        }
    } catch (error) {
        console.error(`Error loading ${module} data:`, error);
    }
}

async function loadDashboardStats() {
    try {
        const [customersData, usersData, inventoryData] = await Promise.all([
            ipcRenderer.invoke('get-customers'),
            ipcRenderer.invoke('get-users'),
            ipcRenderer.invoke('get-inventory')
        ]);
        
        document.getElementById('totalCustomers').textContent = customersData.length;
        document.getElementById('totalUsers').textContent = usersData.length;
        document.getElementById('totalItems').textContent = inventoryData.length;
        
        // Count low stock items (items with quantity <= 5)
        const lowStockCount = inventoryData.filter(item => item.quantity <= 5).length;
        document.getElementById('lowStockItems').textContent = lowStockCount;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
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

// Export for global access
window.customerModule = () => customerModule;
window.inventoryModule = () => inventoryModule;
window.salesModule = () => salesModule;
window.serviceModule = () => serviceModule;
window.expensesModule = () => expensesModule;
window.invoicesModule = () => invoicesModule;
window.usersModule = () => usersModule;
window.closeModal = closeModal;
window.showSuccess = showSuccess;
window.showError = showError;
window.loadDashboardStats = loadDashboardStats;