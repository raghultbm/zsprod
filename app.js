const { ipcRenderer } = require('electron');

class App {
    constructor() {
        this.currentUser = null;
        this.currentModule = null;
        this.modules = {};
        this.moduleLoadingStates = new Map();
        this.eventHandlers = {};
        this.performanceMetrics = {};
        this.init();
    }

    async init() {
        try {
            console.log('App: Starting initialization...');
            const initStart = performance.now();
            
            // Wait a bit for the DOM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize auth system
            await Auth.init();
            console.log('App: Auth initialized');
            
            // Setup event listeners
            this.setupEventListeners();
            console.log('App: Event listeners setup');
            
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
            this.showError('Failed to initialize application');
        }
    }

    setupEventListeners() {
        // Clear existing listeners first
        this.removeEventListeners();
        
        // Login form
        const loginForm = document.getElementById('login-form');
        this.eventHandlers.loginForm = (e) => this.handleLogin(e);
        loginForm.addEventListener('submit', this.eventHandlers.loginForm);

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        this.eventHandlers.logout = () => this.handleLogout();
        logoutBtn.addEventListener('click', this.eventHandlers.logout);

        // Navigation menu - use event delegation for better performance
        const navMenu = document.querySelector('.nav-menu');
        this.eventHandlers.navigation = (e) => this.handleNavigation(e);
        navMenu.addEventListener('click', this.eventHandlers.navigation);

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
    }

    removeEventListeners() {
        // Remove existing event listeners
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');
        const navMenu = document.querySelector('.nav-menu');

        if (this.eventHandlers.loginForm) loginForm?.removeEventListener('submit', this.eventHandlers.loginForm);
        if (this.eventHandlers.logout) logoutBtn?.removeEventListener('click', this.eventHandlers.logout);
        if (this.eventHandlers.navigation) navMenu?.removeEventListener('click', this.eventHandlers.navigation);
        if (this.eventHandlers.globalError) window.removeEventListener('error', this.eventHandlers.globalError);
        if (this.eventHandlers.globalReject) window.removeEventListener('unhandledrejection', this.eventHandlers.globalReject);
        if (this.eventHandlers.beforeUnload) window.removeEventListener('beforeunload', this.eventHandlers.beforeUnload);
        
        // Clear handlers
        this.eventHandlers = {};
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
            this.showLoading(true);
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
                
                const loginEnd = performance.now();
                console.log(`Login completed in ${loginEnd - loginStart}ms`);
            } else {
                this.showLoginError('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Login failed. Please try again.');
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
        } catch (error) {
            console.error('Logout error:', error);
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
                moduleContent.innerHTML = '';
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
            this.showLoading(true);
            
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
                resolve();
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
        
        // Update user info
        const userInfo = document.getElementById('current-user');
        if (userInfo && this.currentUser) {
            userInfo.textContent = `Welcome, ${this.currentUser.username}`;
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        console.error('App Error:', message);
        
        // Try to use a proper notification system if available
        if (typeof Utils !== 'undefined' && Utils.showError) {
            Utils.showError(message);
        } else {
            // Fallback to alert
            alert(message);
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
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : 'Not available'
        };
    }

    // Cleanup method
    cleanup() {
        console.log('App: Starting cleanup...');
        
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
            performance: this.getPerformanceMetrics()
        };
    }

    // Module refresh helper
    async refreshCurrentModule() {
        if (this.currentModule && this.modules[this.currentModule]) {
            const module = this.modules[this.currentModule];
            if (typeof module.refresh === 'function') {
                try {
                    console.log(`Refreshing module: ${this.currentModule}`);
                    await module.refresh();
                } catch (error) {
                    console.error(`Refresh error for module ${this.currentModule}:`, error);
                    this.showError(`Failed to refresh ${this.currentModule} module`);
                }
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
if (process.env.NODE_ENV === 'development') {
    window.appDebug = {
        getInfo: () => app?.debugInfo(),
        getPerformance: () => app?.getPerformanceMetrics(),
        refreshModule: () => app?.refreshCurrentModule(),
        reloadModule: (name) => app?.reloadModule(name),
        cleanup: () => app?.cleanup()
    };
}