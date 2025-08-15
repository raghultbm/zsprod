class WatchShopApp {
    constructor() {
        this.currentModule = null;
        this.modules = {};
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('Initializing WatchShop application...');
            
            // Wait for database to be ready
            await this.waitForDatabase();
            
            // Initialize authentication
            this.setupAuth();
            
            // Load user session
            const restored = authManager.loadSession();
            if (restored) {
                this.updateUserInfo();
                this.showDashboard();
            } else {
                this.showLogin();
            }
            
            // Setup navigation and event handlers
            this.setupNavigation();
            this.setupEventHandlers();
            
            // Hide loading screen
            document.getElementById('loading-screen').style.display = 'none';
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Application initialization error:', error);
            this.showInitializationError(error);
            throw error;
        }
    }

    async waitForDatabase(maxAttempts = 30, delay = 1000) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                // Import database functions dynamically to avoid early loading
                const { getQuery } = require('./core/database');
                
                // Test database connection
                const result = await getQuery('SELECT 1 as test');
                if (result) {
                    console.log('Database connected successfully');
                    return true;
                }
            } catch (error) {
                console.log(`Database connection attempt ${i + 1} failed:`, error.message);
            }
            
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Database initialization timeout after ${maxAttempts} attempts`);
    }

    setupAuth() {
        // Make auth manager globally available
        window.authManager = authManager;
    }

    showInitializationError(error) {
        const loadingScreen = document.getElementById('loading-screen');
        let message = 'Application initialization failed. Please try again.';
        if (error.message) {
            message = error.message;
        }
        
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="error-message">
                    <h3>Initialization Failed</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            </div>
        `;
        
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    showLogin() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        
        // Setup login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = (e) => this.handleLogin(e);
        }
        
        // Focus username field
        const usernameField = document.getElementById('username');
        if (usernameField) {
            usernameField.focus();
        }
    }

    showDashboard() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        
        // Load dashboard content
        this.loadModule('dashboard');
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (!username || !password) {
            this.showMessage('Please enter both username and password', 'error');
            return;
        }
        
        try {
            const result = await authManager.login(username, password);
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                this.updateUserInfo();
                this.showDashboard();
                
                // Log the login
                if (typeof auditLogger !== 'undefined') {
                    await auditLogger.logLogin(username);
                }
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed. Please try again.', 'error');
        }
    }

    async handleLogout() {
        try {
            const currentUser = authManager.getCurrentUser();
            const result = authManager.logout();
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                this.showLogin();
                
                // Log the logout
                if (typeof auditLogger !== 'undefined' && currentUser) {
                    await auditLogger.logLogout(currentUser.username);
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Logout failed', 'error');
        }
    }

    updateUserInfo() {
        const userInfo = authManager.getUserDisplayInfo();
        if (userInfo) {
            const currentUserElement = document.getElementById('current-user');
            if (currentUserElement) {
                currentUserElement.textContent = userInfo.displayName;
            }
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.onclick = () => this.handleNavigation(item);
        });
    }

    setupEventHandlers() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.handleLogout();
        }

        // Search functionality
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.globalSearch(e.target.value);
                }
            };
        }

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => this.showSettings();
        }
    }

    async handleNavigation(navItem) {
        const module = navItem.dataset.module;
        
        // Check permissions
        if (!authManager.hasPermission(module)) {
            this.showMessage('Access denied. Insufficient permissions.', 'error');
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
            const contentArea = document.getElementById('content-area');
            if (!contentArea) return;

            // Show loading
            contentArea.innerHTML = '<div class="loading">Loading...</div>';

            // Load module dynamically
            let moduleContent = '';
            
            switch (moduleName) {
                case 'dashboard':
                    moduleContent = await this.loadDashboard();
                    break;
                case 'customers':
                    moduleContent = '<div class="module-placeholder">Customers module will be loaded here</div>';
                    break;
                case 'inventory':
                    moduleContent = '<div class="module-placeholder">Inventory module will be loaded here</div>';
                    break;
                case 'sales':
                    moduleContent = '<div class="module-placeholder">Sales module will be loaded here</div>';
                    break;
                case 'service':
                    moduleContent = '<div class="module-placeholder">Service module will be loaded here</div>';
                    break;
                default:
                    moduleContent = '<div class="module-placeholder">Module not found</div>';
            }

            contentArea.innerHTML = moduleContent;
            this.currentModule = moduleName;

            // Log module access
            if (typeof auditLogger !== 'undefined') {
                await auditLogger.logView(moduleName.toUpperCase());
            }

        } catch (error) {
            console.error('Module loading error:', error);
            this.showMessage('Failed to load module', 'error');
        }
    }

    async loadDashboard() {
        return `
            <div class="dashboard">
                <h2>Dashboard</h2>
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>Quick Stats</h3>
                        <p>Welcome to WatchShop Management System</p>
                    </div>
                </div>
            </div>
        `;
    }

    showSettings() {
        const content = `
            <div class="settings-form">
                <h3>User Settings</h3>
                <button class="btn btn-secondary" onclick="app.showChangePassword()">Change Password</button>
            </div>
        `;

        this.showModal('Settings', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        `);
    }

    showChangePassword() {
        const content = `
            <form id="change-password-form" class="change-password-form">
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
        `;

        this.showModal('Change Password', content, `
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
            this.showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const result = await authManager.changePassword(currentPassword, newPassword);
            
            if (result.success) {
                this.showMessage('Password changed successfully', 'success');
                document.querySelector('.modal-overlay').remove();
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            this.showMessage('Failed to change password', 'error');
        }
    }

    showModal(title, content, actions = '') {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                <div class="modal-actions">
                    ${actions}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async globalSearch(searchTerm) {
        if (!searchTerm || searchTerm.length < 3) {
            this.showMessage('Please enter at least 3 characters to search', 'info');
            return;
        }
        
        this.showMessage(`Searching for "${searchTerm}"...`, 'info');
        // Implement search functionality here
    }
}

// Create and initialize the app
const app = new WatchShopApp();

// Make it globally available
window.app = app;