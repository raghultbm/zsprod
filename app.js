const { ipcRenderer } = require('electron');

class App {
    constructor() {
        this.currentUser = null;
        this.currentModule = null;
        this.modules = {};
        this.init();
    }

    async init() {
        try {
            // Wait a bit for the DOM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize auth system
            await Auth.init();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check if user is already logged in
            const savedUser = await Auth.getCurrentUser();
            if (savedUser) {
                this.currentUser = savedUser;
                this.showMainApp();
                this.loadModule('dashboard');
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('App initialization error:', error);
            this.showError('Failed to initialize application');
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', () => this.handleLogout());

        // Navigation menu
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showError('An unexpected error occurred');
        });

        // Global unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.showError('An unexpected error occurred');
        });
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
            
            const user = await Auth.login(username, password);
            if (user) {
                this.currentUser = user;
                this.hideLoginError();
                this.showMainApp();
                this.loadModule('dashboard');
                
                // Log login audit
                await Audit.log('LOGIN', 'USER', user.id, `User ${user.username} logged in`);
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
            if (this.currentUser) {
                await Audit.log('LOGOUT', 'USER', this.currentUser.id, `User ${this.currentUser.username} logged out`);
            }
            
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
        
        const module = e.target.getAttribute('data-module');
        if (module && module !== this.currentModule) {
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            e.target.classList.add('active');
            
            this.loadModule(module);
        }
    }

    async loadModule(moduleName) {
        try {
            this.showLoading(true);
            
            // Check user permissions
            if (!Auth.hasPermission(this.currentUser, moduleName)) {
                this.showError('You do not have permission to access this module');
                return;
            }

            // Load module dynamically
            if (!this.modules[moduleName]) {
                await this.loadModuleScript(moduleName);
            }

            const moduleContent = document.getElementById('module-content');
            
            // Initialize and render module
            if (this.modules[moduleName]) {
                await this.modules[moduleName].render(moduleContent);
                this.currentModule = moduleName;
            }
        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            this.showError(`Failed to load ${moduleName} module`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadModuleScript(moduleName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `modules/${moduleName}/${moduleName}.js`;
            script.onload = () => {
                // Module should register itself
                resolve();
            };
            script.onerror = () => {
                reject(new Error(`Failed to load ${moduleName} module script`));
            };
            document.head.appendChild(script);
        });
    }

    registerModule(name, moduleInstance) {
        this.modules[name] = moduleInstance;
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Update user info
        const userInfo = document.getElementById('current-user');
        userInfo.textContent = `Welcome, ${this.currentUser.username}`;
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        // You can implement a proper error modal here
        alert(message);
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideLoginError() {
        const errorDiv = document.getElementById('login-error');
        errorDiv.style.display = 'none';
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    // Database helper methods
    async query(sql, params = []) {
        return await ipcRenderer.invoke('db-query', sql, params);
    }

    async run(sql, params = []) {
        return await ipcRenderer.invoke('db-run', sql, params);
    }

    async get(sql, params = []) {
        return await ipcRenderer.invoke('db-get', sql, params);
    }
}

// Global app instance
let app;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

// Make app globally available
window.app = app;