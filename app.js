class WatchShopApp {
    constructor() {
        this.currentModule = null;
        this.modules = {};
        this.isInitialized = false;
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading('Initializing database...');
            
            // Initialize database (already done in main.js, but ensure it's ready)
            await this.waitForDatabase();
            
            // Load user session
            this.showLoading('Loading user session...');
            const sessionLoaded = authManager.loadSession();
            
            if (sessionLoaded && authManager.isAuthenticated()) {
                await this.showMainApp();
            } else {
                this.showLogin();
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Application initialization error:', error);
            throw error;
        }
    }

    async waitForDatabase() {
        // Wait for database to be ready
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            try {
                const { getDatabase } = require('./core/database');
                const db = getDatabase();
                if (db) break;
            } catch (e) {
                // Database not ready yet
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            throw new Error('Database initialization timeout');
        }
    }

    showLoading(message = 'Loading...') {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = loadingScreen.querySelector('.loading-text');
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        loadingScreen.classList.remove('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    showLogin() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        
        // Setup login form handler
        const loginForm = document.getElementById('login-form');
        loginForm.onsubmit = (e) => this.handleLogin(e);
        
        // Focus username field
        document.getElementById('username').focus();
    }

    async showMainApp() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Update user info
        this.updateUserInfo();
        
        // Setup navigation
        this.setupNavigation();
        
        // Load dashboard by default
        await this.loadModule('dashboard');
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        const errorElement = document.getElementById('login-error');
        errorElement.classList.add('hidden');
        
        try {
            const result = await authManager.login(username, password);
            
            if (result.success) {
                await auditLogger.logLogin(username);
                await this.showMainApp();
            } else {
                errorElement.textContent = result.message;
                errorElement.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorElement.textContent = 'Login failed. Please try again.';
            errorElement.classList.remove('hidden');
        }
    }

    async logout() {
        const user = authManager.getCurrentUser();
        if (user) {
            await auditLogger.logLogout(user.username);
        }
        
        authManager.logout();
        this.currentModule = null;
        this.modules = {};
        this.showLogin();
    }

    async changePassword() {
        const modal = Utils.showModal('Change Password', `
            <form id="change-password-form">
                <div class="form-group">
                    <label for="current-password">Current Password</label>
                    <input type="password" id="current-password" name="currentPassword" required>
                </div>
                <div class="form-group">
                    <label for="new-password">New Password</label>
                    <input type="password" id="new-password" name="newPassword" required>
                </div>
                <div class="form-group">
                    <label for="confirm-password">Confirm New Password</label>
                    <input type="password" id="confirm-password" name="confirmPassword" required>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="app.submitPasswordChange()">Change Password</button>
        `);
    }

    async submitPasswordChange() {
        const form = document.getElementById('change-password-form');
        const formData = new FormData(form);
        
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        
        if (newPassword !== confirmPassword) {
            Utils.showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            Utils.showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const result = await authManager.changePassword(currentPassword, newPassword);
            
            if (result.success) {
                Utils.showMessage('Password changed successfully', 'success');
                document.querySelector('.modal-overlay').remove();
            } else {
                Utils.showMessage(result.message, 'error');
            }
        } catch (error) {
            Utils.showMessage('Failed to change password', 'error');
        }
    }

    updateUserInfo() {
        const userInfo = authManager.getUserDisplayInfo();
        if (userInfo) {
            document.getElementById('current-user').textContent = userInfo.displayName;
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.onclick = () => this.handleNavigation(item);
        });
    }

    async handleNavigation(navItem) {
        const module = navItem.dataset.module;
        
        // Check permissions
        if (!authManager.hasPermission(module)) {
            Utils.showMessage('Access denied. Insufficient permissions.', 'error');
            return;
        }
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        navItem.classList.add('active');
        
        // Load module
        await this.loadModule(module);
    }

    async loadModule(moduleName) {
        try {
            this.showModuleLoading();
            
            // Update page title
            document.getElementById('page-title').textContent = Utils.capitalize(moduleName);
            
            // Load module if not already loaded
            if (!this.modules[moduleName]) {
                await this.importModule(moduleName);
            }
            
            // Initialize and render module
            const module = this.modules[moduleName];
            if (module && module.render) {
                const content = await module.render();
                document.getElementById('content-body').innerHTML = content;
                
                // Call module's init function if it exists
                if (module.init) {
                    await module.init();
                }
            }
            
            this.currentModule = moduleName;
            await auditLogger.logView(moduleName);
            
        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            this.showModuleError(error.message);
        }
    }

    async importModule(moduleName) {
        try {
            switch (moduleName) {
                case 'dashboard':
                    const { default: Dashboard } = await import('./modules/dashboard/dashboard.js');
                    this.modules[moduleName] = new Dashboard();
                    break;
                case 'customers':
                    const { default: Customers } = await import('./modules/customers/customers.js');
                    this.modules[moduleName] = new Customers();
                    break;
                case 'inventory':
                    const { default: Inventory } = await import('./modules/inventory/inventory.js');
                    this.modules[moduleName] = new Inventory();
                    break;
                case 'sales':
                    const { default: Sales } = await import('./modules/sales/sales.js');
                    this.modules[moduleName] = new Sales();
                    break;
                case 'service':
                    const { default: Service } = await import('./modules/service/service.js');
                    this.modules[moduleName] = new Service();
                    break;
                case 'invoices':
                    const { default: Invoices } = await import('./modules/invoices/invoices.js');
                    this.modules[moduleName] = new Invoices();
                    break;
                case 'expense':
                    const { default: Expense } = await import('./modules/expense/expense.js');
                    this.modules[moduleName] = new Expense();
                    break;
                case 'ledger':
                    const { default: Ledger } = await import('./modules/ledger/ledger.js');
                    this.modules[moduleName] = new Ledger();
                    break;
                case 'users':
                    const { default: Users } = await import('./modules/users/users.js');
                    this.modules[moduleName] = new Users();
                    break;
                default:
                    throw new Error(`Unknown module: ${moduleName}`);
            }
        } catch (error) {
            console.error(`Failed to import module ${moduleName}:`, error);
            throw error;
        }
    }

    showModuleLoading() {
        document.getElementById('content-body').innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading module...</div>
            </div>
        `;
    }

    showModuleError(message) {
        document.getElementById('content-body').innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h3>Module Load Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Reload Application</button>
            </div>
        `;
    }

    // Public methods for modules to use
    showMessage(message, type = 'info', duration = 3000) {
        Utils.showMessage(message, type, duration);
    }

    showConfirm(message, onConfirm, onCancel = null) {
        return Utils.showConfirm(message, onConfirm, onCancel);
    }

    showModal(title, content, actions = '') {
        return Utils.showModal(title, content, actions);
    }

    // Navigation helpers for modules
    async navigateToCustomer(customerId) {
        await this.loadModule('customers');
        if (this.modules.customers && this.modules.customers.showCustomer) {
            this.modules.customers.showCustomer(customerId);
        }
    }

    async navigateToSale(customerId = null) {
        await this.loadModule('sales');
        if (this.modules.sales && this.modules.sales.newSale) {
            this.modules.sales.newSale(customerId);
        }
    }

    async navigateToService(customerId = null, serviceType = 'new') {
        await this.loadModule('service');
        if (this.modules.service) {
            if (serviceType === 'instant' && this.modules.service.newInstantService) {
                this.modules.service.newInstantService(customerId);
            } else if (this.modules.service.newService) {
                this.modules.service.newService(customerId);
            }
        }
    }

    async navigateToInventory(code = null) {
        await this.loadModule('inventory');
        if (this.modules.inventory && code && this.modules.inventory.searchByCode) {
            this.modules.inventory.searchByCode(code);
        }
    }

    async navigateToInvoice(invoiceNumber) {
        await this.loadModule('invoices');
        if (this.modules.invoices && this.modules.invoices.showInvoice) {
            this.modules.invoices.showInvoice(invoiceNumber);
        }
    }

    // Utility methods for modules
    getCurrentModule() {
        return this.currentModule;
    }

    getModule(moduleName) {
        return this.modules[moduleName];
    }

    async refreshCurrentModule() {
        if (this.currentModule && this.modules[this.currentModule]) {
            const module = this.modules[this.currentModule];
            if (module.refresh) {
                await module.refresh();
            } else if (module.render) {
                const content = await module.render();
                document.getElementById('content-body').innerHTML = content;
                if (module.init) {
                    await module.init();
                }
            }
        }
    }

    // Error handling
    handleError(error, context = 'Application') {
        console.error(`${context} Error:`, error);
        
        let message = 'An unexpected error occurred.';
        if (error.message) {
            message = error.message;
        }
        
        this.showMessage(message, 'error');
    }

    // Global search functionality
    async globalSearch(searchTerm) {
        if (!searchTerm || searchTerm.length < 3) return;
        
        try {
            const results = {
                customers: [],
                inventory: [],
                sales: [],
                services: []
            };
            
            // Search customers
            if (authManager.hasPermission('customers')) {
                const customerModule = this.getModule('customers');
                if (customerModule && customerModule.search) {
                    results.customers = await customerModule.search(searchTerm);
                }
            }
            
            // Search inventory
            if (authManager.hasPermission('inventory')) {
                const inventoryModule = this.getModule('inventory');
                if (inventoryModule && inventoryModule.search) {
                    results.inventory = await inventoryModule.search(searchTerm);
                }
            }
            
            // Show search results
            this.showSearchResults(results, searchTerm);
            
        } catch (error) {
            console.error('Global search error:', error);
            this.showMessage('Search failed', 'error');
        }
    }

    showSearchResults(results, searchTerm) {
        const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalResults === 0) {
            this.showMessage(`No results found for "${searchTerm}"`, 'info');
            return;
        }
        
        let content = `<h3>Search Results for "${searchTerm}" (${totalResults} found)</h3>`;
        
        // Add results sections
        for (const [type, items] of Object.entries(results)) {
            if (items.length > 0) {
                content += `<h4>${Utils.capitalize(type)} (${items.length})</h4>`;
                content += '<div class="search-results-section">';
                
                items.forEach(item => {
                    content += this.formatSearchResult(type, item);
                });
                
                content += '</div>';
            }
        }
        
        this.showModal('Search Results', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        `);
    }

    formatSearchResult(type, item) {
        switch (type) {
            case 'customers':
                return `
                    <div class="search-result-item" onclick="app.navigateToCustomer('${item.customer_id}')">
                        <strong>${item.name}</strong> - ${item.customer_id}<br>
                        <small>${item.mobile_number}</small>
                    </div>
                `;
            case 'inventory':
                return `
                    <div class="search-result-item" onclick="app.navigateToInventory('${item.code}')">
                        <strong>${item.particulars || item.category}</strong> - ${item.code}<br>
                        <small>${Utils.formatCurrency(item.amount)}</small>
                    </div>
                `;
            default:
                return `
                    <div class="search-result-item">
                        <strong>${Object.values(item)[1] || 'Item'}</strong><br>
                        <small>${Object.values(item)[0] || ''}</small>
                    </div>
                `;
        }
    }
}

// Create global app instance
window.app = new WatchShopApp();

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app) {
        window.app.handleError(event.error, 'Global');
    }
});

// Handle uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app) {
        window.app.handleError(event.reason, 'Promise');
    }
    event.preventDefault();
});

// Auto-save session data periodically
setInterval(() => {
    if (authManager.isAuthenticated()) {
        authManager.refreshSession();
    }
}, 5 * 60 * 1000); // Every 5 minutes