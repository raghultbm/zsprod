// Main application router and controller for ZEDSON Watchcraft
class WatchcraftApp {
    constructor() {
        this.currentModule = null;
        this.isInitialized = false;
        this.modules = {};
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize database
            await window.DB.initialize();
            
            // Initialize authentication
            await window.Auth.initialize();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check authentication state
            if (window.Auth.isLoggedIn) {
                this.showMainApp();
                this.loadModule('dashboard');
            } else {
                this.showLoginScreen();
            }

            this.isInitialized = true;
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please try again.');
        }
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation menu
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Handle window close
        window.addEventListener('beforeunload', () => {
            if (window.DB) {
                window.DB.close();
            }
        });

        // Handle offline/online status
        window.addEventListener('online', () => {
            window.Utils.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            window.Utils.showToast('Connection lost - working offline', 'warning');
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');

        if (!username || !password) {
            this.showLoginError('Please enter both username and password');
            return;
        }

        window.Utils.showLoader();
        
        try {
            const result = await window.Auth.login(username, password);
            
            if (result.success) {
                this.hideLoginError();
                this.showMainApp();
                this.loadModule('dashboard');
                window.Utils.showToast(`Welcome back, ${result.user.username}!`, 'success');
            } else {
                this.showLoginError(result.error);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Login failed. Please try again.');
        } finally {
            window.Utils.hideLoader();
        }
    }

    async handleLogout() {
        try {
            await window.Auth.logout();
            this.showLoginScreen();
            this.currentModule = null;
            window.Utils.showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    handleNavigation(event) {
        event.preventDefault();
        
        const module = event.target.dataset.module;
        if (module && window.Auth.hasPermission(module)) {
            this.loadModule(module);
        } else {
            window.Utils.showToast('You do not have permission to access this module', 'error');
        }
    }

    async loadModule(moduleName) {
        if (!window.Auth.hasPermission(moduleName)) {
            window.Utils.showToast('Access denied', 'error');
            return;
        }

        try {
            window.Utils.showLoader();

            // Update navigation
            this.updateNavigation(moduleName);

            // Load module dynamically
            await this.loadModuleScript(moduleName);

            // Initialize module
            const moduleClass = this.getModuleClass(moduleName);
            if (moduleClass) {
                this.currentModule = new moduleClass();
                await this.currentModule.render();
            }

            console.log(`Module ${moduleName} loaded successfully`);
        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
            window.Utils.showToast(`Failed to load ${moduleName} module`, 'error');
        } finally {
            window.Utils.hideLoader();
        }
    }

    async loadModuleScript(moduleName) {
        // Check if module is already loaded
        if (this.modules[moduleName]) {
            return;
        }

        // Define module file paths
        const moduleFiles = {
            dashboard: ['modules/dashboard/dashboard.js', 'modules/dashboard/dashboard-queries.js'],
            customers: ['modules/customers/customers.js', 'modules/customers/customers-form.js', 'modules/customers/customers-db.js'],
            inventory: ['modules/inventory/inventory.js', 'modules/inventory/inventory-form.js', 'modules/inventory/inventory-list.js', 'modules/inventory/inventory-db.js'],
            sales: ['modules/sales/sales.js', 'modules/sales/sales-form.js', 'modules/sales/sales-invoice.js', 'modules/sales/sales-db.js'],
            service: ['modules/service/service.js', 'modules/service/service-new.js', 'modules/service/service-instant.js', 'modules/service/service-status.js', 'modules/service/service-db.js'],
            invoices: ['modules/invoices/invoices.js', 'modules/invoices/invoices-print.js'],
            expense: ['modules/expense/expense.js', 'modules/expense/expense-db.js'],
            ledger: ['modules/ledger/ledger.js', 'modules/ledger/ledger-export.js'],
            users: ['modules/users/users.js', 'modules/users/users-permissions.js']
        };

        const files = moduleFiles[moduleName] || [];
        
        // Load all module files
        for (const file of files) {
            await this.loadScript(file);
        }

        this.modules[moduleName] = true;
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    getModuleClass(moduleName) {
        const moduleClasses = {
            dashboard: window.DashboardModule,
            customers: window.CustomersModule,
            inventory: window.InventoryModule,
            sales: window.SalesModule,
            service: window.ServiceModule,
            invoices: window.InvoicesModule,
            expense: window.ExpenseModule,
            ledger: window.LedgerModule,
            users: window.UsersModule
        };

        return moduleClasses[moduleName];
    }

    updateNavigation(activeModule) {
        // Remove active class from all nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        // Add active class to current module
        const activeItem = document.querySelector(`[data-module="${activeModule}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    showLoginScreen() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('main-app').classList.remove('active');
        
        // Clear login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.reset();
        }
        
        this.hideLoginError();
    }

    showMainApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
        
        // Update user info
        const currentUser = window.Auth.getCurrentUser();
        if (currentUser) {
            document.getElementById('current-user').textContent = currentUser.username;
        }

        // Setup module permissions
        this.setupModulePermissions();
    }

    setupModulePermissions() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const module = item.dataset.module;
            if (!window.Auth.hasPermission(module)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'block';
            }
        });
    }

    showLoginError(message) {
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    hideLoginError() {
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    showError(message) {
        window.Utils.showToast(message, 'error');
    }

    // Public method to reload current module
    async reloadCurrentModule() {
        if (this.currentModule && this.currentModule.render) {
            await this.currentModule.render();
        }
    }

    // Public method to get current module
    getCurrentModule() {
        return this.currentModule;
    }

    // Public method to navigate to specific module
    navigateTo(moduleName, params = {}) {
        this.loadModule(moduleName, params);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.App = new WatchcraftApp();
    await window.App.initialize();
});

// Make app globally available
window.WatchcraftApp = WatchcraftApp;