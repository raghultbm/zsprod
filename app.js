const { ipcRenderer } = require('electron');

class App {
    constructor() {
        this.currentUser = null;
        this.currentModule = null;
        this.modules = {};
        this.moduleLoadingStates = new Map();
        this.eventHandlers = {};
        this.performanceMetrics = {};
        this.timeInterval = null;
        this.init();
    }

    async init() {
        try {
            console.log('App: Starting initialization...');
            const initStart = performance.now();
            
            // Wait for DOM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize auth system
            await Auth.init();
            console.log('App: Auth initialized');
            
            // Setup event listeners
            this.setupEventListeners();
            console.log('App: Event listeners setup');
            
            // Start time display
            this.startTimeDisplay();
            
            // Check if user is already logged in
            const savedUser = await Auth.getCurrentUser();
            if (savedUser) {
                this.currentUser = savedUser;
                this.showMainApp();
                await this.loadModule('dashboard');
                console.log('App: Auto-logged in user');
            } else {
                this.showLoginScreen();
                console.log('App: Showing login screen');
            }
            
            const initEnd = performance.now();
            console.log(`App: Initialization completed in ${initEnd - initStart}ms`);
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    setupEventListeners() {
        // Clear existing listeners first
        this.removeEventListeners();
        
        // Login form
        const loginForm = document.getElementById('login-form');
        this.eventHandlers.loginForm = (e) => this.handleLogin(e);
        loginForm?.addEventListener('submit', this.eventHandlers.loginForm);

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        this.eventHandlers.logout = () => this.handleLogout();
        logoutBtn?.addEventListener('click', this.eventHandlers.logout);

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        this.eventHandlers.refresh = () => this.refreshCurrentModule();
        refreshBtn?.addEventListener('click', this.eventHandlers.refresh);

        // Navigation menu - use event delegation for better performance
        const navMenu = document.querySelector('.nav-menu');
        this.eventHandlers.navigation = (e) => this.handleNavigation(e);
        navMenu?.addEventListener('click', this.eventHandlers.navigation);

        // Global error handler
        this.eventHandlers.globalError = (e) => {
            console.error('Global error:', e.error);
            this.showError('An unexpected error occurred');
        };
        window.addEventListener('error', this.eventHandlers.globalError);

        // Global unhandled promise rejection handler
        this.eventHandlers.globalReject = (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.showError('An unexpected error occurred');
        };
        window.addEventListener('unhandledrejection', this.eventHandlers.globalReject);

        // Performance monitoring
        this.eventHandlers.beforeUnload = () => {
            this.cleanup();
        };
        window.addEventListener('beforeunload', this.eventHandlers.beforeUnload);

        // Keyboard shortcuts
        this.eventHandlers.keyDown = (e) => this.handleKeyboardShortcuts(e);
        document.addEventListener('keydown', this.eventHandlers.keyDown);
    }

    removeEventListeners() {
        // Remove existing event listeners to prevent duplicates
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const navMenu = document.querySelector('.nav-menu');

        if (this.eventHandlers.loginForm) loginForm?.removeEventListener('submit', this.eventHandlers.loginForm);
        if (this.eventHandlers.logout) logoutBtn?.removeEventListener('click', this.eventHandlers.logout);
        if (this.eventHandlers.refresh) refreshBtn?.removeEventListener('click', this.eventHandlers.refresh);
        if (this.eventHandlers.navigation) navMenu?.removeEventListener('click', this.eventHandlers.navigation);
        if (this.eventHandlers.globalError) window.removeEventListener('error', this.eventHandlers.globalError);
        if (this.eventHandlers.globalReject) window.removeEventListener('unhandledrejection', this.eventHandlers.globalReject);
        if (this.eventHandlers.beforeUnload) window.removeEventListener('beforeunload', this.eventHandlers.beforeUnload);
        if (this.eventHandlers.keyDown) document.removeEventListener('keydown', this.eventHandlers.keyDown);
        
        // Clear handlers
        this.eventHandlers = {};
    }

    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when not in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Ctrl/Cmd + R - Refresh current module
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshCurrentModule();
        }
        
        // Alt + 1-9 - Quick module navigation
        if (e.altKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const moduleIndex = parseInt(e.key) - 1;
            const modules = ['dashboard', 'customers', 'inventory', 'sales', 'service', 'invoices', 'expense', 'ledger', 'users'];
            if (modules[moduleIndex]) {
                this.loadModule(modules[moduleIndex]);
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showLoginError('Please enter both username and password');
            return;
        }

        try {
            this.showLoading(true, 'Authenticating...');
            const loginStart = performance.now();
            
            const user = await Auth.login(username, password);
            if (user) {
                this.currentUser = user;
                this.hideLoginError();
                this.showMainApp();
                await this.loadModule('dashboard');
                
                // Log login audit
                if (typeof Audit !== 'undefined') {
                    await Audit.log('LOGIN', 'USER', user.id, `User ${user.username} logged in`);
                }
                
                this.showToast('Login successful', 'success');
                
                const loginEnd = performance.now();
                console.log(`Login completed in ${loginEnd - loginStart}ms`);
            } else {
                this.showLoginError('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Login failed: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async handleLogout() {
        try {
            if (this.currentUser && typeof Audit !== 'undefined') {
                await Audit.log('LOGOUT', 'USER', this.currentUser.id, `User ${this.currentUser.username} logged out`);
            }
            
            // Cleanup current module
            this.cleanupCurrentModule();
            
            await Auth.logout();
            this.currentUser = null;
            this.currentModule = null;
            this.modules = {};
            
            this.showLoginScreen();
            this.clearForm('login-form');
            this.showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Logout failed: ' + error.message);
        }
    }

    handleNavigation(e) {
        e.preventDefault();
        
        // Use event delegation - check if clicked element or parent has data-module
        let target = e.target;
        while (target && !target.getAttribute('data-module')) {
            target = target.parentElement;
            if (target === e.currentTarget) {
                target = null;
                break;
            }
        }
        
        if (!target) return;
        
        const module = target.getAttribute('data-module');
        if (module && module !== this.currentModule) {
            // Update active nav link immediately for better UX
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            target.classList.add('active');
            
            // Load module with debouncing
            this.loadModuleDebounced(module);
        }
    }

    // Debounced module loading to prevent rapid switching
    loadModuleDebounced = this.debounce(function(moduleName) {
        this.loadModule(moduleName);
    }, 150)

    // Cleanup method for current module
    cleanupCurrentModule() {
        if (this.currentModule && this.modules[this.currentModule]) {
            const module = this.modules[this.currentModule];
            
            // Call cleanup method if it exists
            if (typeof module.cleanup === 'function') {
                try {
                    console.log(`Cleaning up module: ${this.currentModule}`);
                    module.cleanup();
                } catch (error) {
                    console.warn(`Cleanup error for module ${this.currentModule}:`, error);
                }
            }
            
            // Clear the module content
            const moduleContent = document.getElementById('module-content');
            if (moduleContent) {
                moduleContent.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading...</div>';
            }
        }
    }

    async loadModule(moduleName) {
        try {
            // Prevent loading the same module multiple times
            if (this.currentModule === moduleName) {
                return;
            }

            // Prevent concurrent loading of the same module
            if (this.moduleLoadingStates.get(moduleName)) {
                console.log(`Module ${moduleName} is already loading, skipping...`);
                return;
            }

            this.moduleLoadingStates.set(moduleName, true);
            this.showLoading(true, `Loading ${moduleName}...`);
            
            // Check user permissions
            if (!Auth.hasPermission(this.currentUser, moduleName)) {
                this.showError('You do not have permission to access this module');
                return;
            }

            // Cleanup current module before loading new one
            this.cleanupCurrentModule();

            // Debug log
            console.log(`Loading module: ${moduleName}`);
            const moduleStart = performance.now();

            // Load module script if not already loaded
            if (!this.modules[moduleName]) {
                await this.loadModuleScript(moduleName);
            }

            const moduleContent = document.getElementById('module-content');
            
            // Initialize and render module
            if (this.modules[moduleName]) {
                console.log(`Rendering module: ${moduleName}`);
                
                const renderStart = performance.now();
                await this.modules[moduleName].render(moduleContent);
                const renderEnd = performance.now();
                
                console.log(`Module ${moduleName} rendered in ${renderEnd - renderStart}ms`);
                
                this.currentModule = moduleName;
                
                // Store performance metrics
                this.performanceMetrics[moduleName] = {
                    loadTime: renderEnd - moduleStart,
                    renderTime: renderEnd - renderStart,
                    lastLoaded: Date.now()
                };

                // Update navigation active state
                this.updateNavigationState(moduleName);
                
            } else {
                throw new Error(`Module ${moduleName} not found after loading`);
            }
        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            this.showError(`Failed to load ${moduleName} module: ${error.message}`);
        } finally {
            this.moduleLoadingStates.set(moduleName, false);
            this.showLoading(false);
        }
    }

    updateNavigationState(moduleName) {
        // Update active navigation state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-module') === moduleName) {
                link.classList.add('active');
            }
        });
    }

    async loadModuleScript(moduleName) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src*="${moduleName}.js"]`);
            if (existingScript) {
                console.log(`Script for ${moduleName} already loaded`);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `modules/${moduleName}/${moduleName}.js`;
            script.onload = () => {
                console.log(`Script loaded for module: ${moduleName}`);
                // Wait a bit for module to register itself
                setTimeout(resolve, 100);
            };
            script.onerror = () => {
                reject(new Error(`Failed to load ${moduleName} module script`));
            };
            document.head.appendChild(script);
        });
    }

    registerModule(name, moduleInstance) {
        console.log(`Registering module: ${name}`);
        this.modules[name] = moduleInstance;
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
        
        // Stop time display
        this.stopTimeDisplay();
        
        // Focus on username field
        requestAnimationFrame(() => {
            const usernameField = document.getElementById('username');
            if (usernameField) {
                usernameField.focus();
            }
        });
    }

    showMainApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Start time display
        this.startTimeDisplay();
        
        // Update user info
        const userInfo = document.getElementById('current-user');
        if (userInfo && this.currentUser) {
            userInfo.textContent = `Welcome, ${this.currentUser.username}`;
        }
    }

    startTimeDisplay() {
        this.updateCurrentTime();
        this.timeInterval = setInterval(() => this.updateCurrentTime(), 1000);
    }

    stopTimeDisplay() {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
    }

    updateCurrentTime() {
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-IN', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const dateString = now.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            timeElement.textContent = `${dateString} ${timeString}`;
        }
    }

    showLoading(show, message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
            const loadingText = overlay.querySelector('p');
            if (loadingText && message) {
                loadingText.textContent = message;
            }
        }
    }

    showError(message) {
        console.error('App Error:', message);
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
            min-width: 250px;
            max-width: 400px;
            word-wrap: break-word;
        `;

        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        toast.textContent = message;

        // Add close on click
        toast.onclick = () => {
            toast.style.animation = 'slideOut 0.2s ease-in forwards';
            setTimeout(() => container.removeChild(toast), 200);
        };

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (container.contains(toast)) {
                toast.style.animation = 'slideOut 0.2s ease-in forwards';
                setTimeout(() => {
                    if (container.contains(toast)) {
                        container.removeChild(toast);
                    }
                }, 200);
            }
        }, duration);

        // Add CSS animations if not already added
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    hideLoginError() {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    // Database helper methods
    async query(sql, params = []) {
        try {
            return await ipcRenderer.invoke('db-query', sql, params);
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async run(sql, params = []) {
        try {
            return await ipcRenderer.invoke('db-run', sql, params);
        } catch (error) {
            console.error('Database run error:', error);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            return await ipcRenderer.invoke('db-get', sql, params);
        } catch (error) {
            console.error('Database get error:', error);
            throw error;
        }
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Performance monitoring
    getPerformanceMetrics() {
        return {
            modules: this.performanceMetrics,
            totalModules: Object.keys(this.modules).length,
            currentModule: this.currentModule,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
            } : 'Not available'
        };
    }

    // Module refresh helper
    async refreshCurrentModule() {
        if (this.currentModule && this.modules[this.currentModule]) {
            const module = this.modules[this.currentModule];
            if (typeof module.refresh === 'function') {
                try {
                    console.log(`Refreshing module: ${this.currentModule}`);
                    this.showLoading(true, `Refreshing ${this.currentModule}...`);
                    await module.refresh();
                    this.showToast(`${this.currentModule} refreshed`, 'success');
                } catch (error) {
                    console.error(`Refresh error for module ${this.currentModule}:`, error);
                    this.showError(`Failed to refresh ${this.currentModule} module`);
                } finally {
                    this.showLoading(false);
                }
            } else {
                // Fallback: reload the module
                await this.loadModule(this.currentModule);
            }
        }
    }

    // Hot reload for development
    async reloadModule(moduleName) {
        if (process.env.NODE_ENV === 'development') {
            try {
                // Remove old script
                const oldScript = document.querySelector(`script[src*="${moduleName}.js"]`);
                if (oldScript) {
                    oldScript.remove();
                }
                
                // Clear module from registry
                delete this.modules[moduleName];
                
                // Reload if it's the current module
                if (this.currentModule === moduleName) {
                    await this.loadModule(moduleName);
                }
                
                console.log(`Module ${moduleName} reloaded`);
            } catch (error) {
                console.error(`Failed to reload module ${moduleName}:`, error);
            }
        }
    }

    // Cleanup method
    cleanup() {
        console.log('App: Starting cleanup...');
        
        // Stop time display
        this.stopTimeDisplay();
        
        // Cleanup current module
        this.cleanupCurrentModule();
        
        // Remove event listeners
        this.removeEventListeners();
        
        // Clear modules
        Object.keys(this.modules).forEach(moduleName => {
            const module = this.modules[moduleName];
            if (typeof module.cleanup === 'function') {
                try {
                    module.cleanup();
                } catch (error) {
                    console.warn(`Cleanup error for module ${moduleName}:`, error);
                }
            }
        });
        
        // Clear state
        this.modules = {};
        this.moduleLoadingStates.clear();
        this.performanceMetrics = {};
        
        console.log('App: Cleanup completed');
    }

    // Development helpers
    debugInfo() {
        return {
            currentUser: this.currentUser,
            currentModule: this.currentModule,
            loadedModules: Object.keys(this.modules),
            performance: this.getPerformanceMetrics(),
            moduleStates: Object.fromEntries(this.moduleLoadingStates)
        };
    }

    // Quick module navigation helpers
    goToDashboard() { this.loadModule('dashboard'); }
    goToCustomers() { this.loadModule('customers'); }
    goToInventory() { this.loadModule('inventory'); }
    goToSales() { this.loadModule('sales'); }
    goToService() { this.loadModule('service'); }
    goToInvoices() { this.loadModule('invoices'); }
    goToExpense() { this.loadModule('expense'); }
    goToLedger() { this.loadModule('ledger'); }
    goToUsers() { this.loadModule('users'); }

    // System status check
    async getSystemStatus() {
        try {
            const dbTest = await this.get('SELECT 1 as test');
            const userCount = await this.get('SELECT COUNT(*) as count FROM users');
            
            return {
                database: dbTest ? 'Connected' : 'Disconnected',
                users: userCount ? userCount.count : 0,
                currentUser: this.currentUser?.username || 'Not logged in',
                currentModule: this.currentModule || 'None',
                loadedModules: Object.keys(this.modules).length,
                uptime: performance.now(),
                memory: this.getPerformanceMetrics().memoryUsage
            };
        } catch (error) {
            return {
                database: 'Error: ' + error.message,
                error: true
            };
        }
    }

    // Backup and restore helpers (for future implementation)
    async exportData() {
        try {
            this.showToast('Data export feature coming soon', 'info');
            // TODO: Implement data export functionality
        } catch (error) {
            this.showError('Export failed: ' + error.message);
        }
    }

    async importData() {
        try {
            this.showToast('Data import feature coming soon', 'info');
            // TODO: Implement data import functionality
        } catch (error) {
            this.showError('Import failed: ' + error.message);
        }
    }
}

// Global app instance
let app;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    app = new App();
});

// Make app globally available
window.app = app;

// Development helpers
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.appDebug = {
        getInfo: () => app?.debugInfo(),
        getPerformance: () => app?.getPerformanceMetrics(),
        getSystemStatus: () => app?.getSystemStatus(),
        refreshModule: () => app?.refreshCurrentModule(),
        reloadModule: (name) => app?.reloadModule(name),
        cleanup: () => app?.cleanup(),
        goTo: (module) => app?.loadModule(module),
        exportData: () => app?.exportData(),
        importData: () => app?.importData()
    };

    // Add global keyboard shortcut for debug console
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            console.log('=== ZEDSON Watchcraft Debug Info ===');
            console.log('App Info:', window.appDebug.getInfo());
            console.log('Performance:', window.appDebug.getPerformance());
            console.log('System Status:', window.appDebug.getSystemStatus());
            console.log('Available commands:', Object.keys(window.appDebug));
            console.log('=====================================');
        }
    });
}

// Global error boundary for unhandled errors
window.addEventListener('error', (e) => {
    console.error('Global error caught:', e);
    if (app) {
        app.showError('An unexpected error occurred. Please refresh the application.');
    }
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator && typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}