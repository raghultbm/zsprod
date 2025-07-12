// ZEDSON WATCHCRAFT - FIXED Authentication Module
// Developed by PULSEWARE❤️

/**
 * FIXED Authentication System - Handles login properly
 */

// Current logged-in user
let currentUser = null;

// User permissions configuration
const permissions = {
    admin: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices', 'users'],
    owner: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices'],
    staff: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices']
};

/**
 * FIXED Handle user login - Main login function
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('🔐 FIXED Login attempt for user:', username);
    
    // Validate input
    if (!username || !password) {
        if (window.Utils && Utils.showNotification) {
            Utils.showNotification('Please enter both username and password.');
        } else {
            alert('Please enter both username and password.');
        }
        return;
    }
    
    // Show loading state
    const loginBtn = event.target.querySelector('button[type="submit"]');
    const originalText = loginBtn ? loginBtn.textContent : '';
    
    if (loginBtn) {
        loginBtn.textContent = 'Authenticating...';
        loginBtn.disabled = true;
    }
    
    try {
        console.log('🔄 Starting authentication process...');
        
        // Ensure API service is available
        if (!window.apiService) {
            console.log('⚠️ API service not available, creating new instance...');
            window.apiService = new APIService();
            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Try API authentication
        console.log('🌐 Attempting API authentication...');
        const response = await window.apiService.login({ username, password });
        
        console.log('📡 Authentication response:', response);
        
        if (response.success && response.user) {
            console.log('✅ Authentication successful for:', response.user.fullName);
            completeLogin(response.user);
            return;
        } else {
            console.log('❌ Authentication failed:', response.error);
            if (window.Utils && Utils.showNotification) {
                Utils.showNotification(response.error || 'Invalid username or password');
            } else {
                alert(response.error || 'Invalid username or password');
            }
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        if (window.Utils && Utils.showNotification) {
            Utils.showNotification('Login failed. Please try again.');
        } else {
            alert('Login failed. Please try again.');
        }
    } finally {
        // Reset button state
        if (loginBtn) {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    }
}

/**
 * FIXED Complete login process
 */
function completeLogin(user) {
    console.log('🎉 Completing login for:', user.fullName);
    
    try {
        // Set current user
        currentUser = user;
        
        // Store user in localStorage for session persistence
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Update user info display
        updateUserDisplay(user);
        
        // Hide login screen and show main app
        showMainApplication();
        
        // Setup navigation based on user role
        setupNavigation();
        
        // Load initial data
        loadInitialData();
        
        // Clear login form
        clearLoginForm();
        
        console.log(`✅ Welcome back, ${user.fullName}!`);
        
        // Show success notification
        setTimeout(() => {
            if (window.Utils && Utils.showNotification) {
                Utils.showNotification(`Welcome back, ${user.fullName}!`);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error completing login:', error);
        if (window.Utils && Utils.showNotification) {
            Utils.showNotification('Error completing login. Please try again.');
        }
    }
}

/**
 * Update user display information
 */
function updateUserDisplay(user) {
    const currentUserElement = document.getElementById('currentUser');
    const currentUserRoleElement = document.getElementById('currentUserRole');
    
    if (currentUserElement) {
        currentUserElement.textContent = `Welcome, ${user.fullName}`;
    }
    if (currentUserRoleElement) {
        currentUserRoleElement.textContent = user.role.toUpperCase();
    }
}

/**
 * Show main application and hide login screen
 */
function showMainApplication() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }
    if (mainApp) {
        mainApp.classList.add('logged-in');
        mainApp.style.display = 'block';
    }
    
    console.log('🖥️ Main application displayed');
}

/**
 * Clear login form
 */
function clearLoginForm() {
    const usernameField = document.getElementById('loginUsername');
    const passwordField = document.getElementById('loginPassword');
    
    if (usernameField) usernameField.value = '';
    if (passwordField) passwordField.value = '';
}

/**
 * Load initial data - FIXED to handle both online and offline modes
 */
async function loadInitialData() {
    try {
        console.log('📥 Loading application data...');
        
        // Load data through API service or localStorage
        if (window.AppCoreModule && window.AppCoreModule.loadModuleData) {
            console.log('🔄 Loading module data...');
            
            // Load all modules
            await Promise.all([
                window.AppCoreModule.loadModuleData('customers'),
                window.AppCoreModule.loadModuleData('inventory'),
                window.AppCoreModule.loadModuleData('sales'),
                window.AppCoreModule.loadModuleData('services'),
                window.AppCoreModule.loadModuleData('expenses'),
                window.AppCoreModule.loadModuleData('invoices')
            ]);
        }
        
        // Update dashboard
        if (window.updateDashboard) {
            console.log('📊 Updating dashboard...');
            setTimeout(() => {
                window.updateDashboard();
            }, 1000);
        }
        
        console.log('✅ Initial data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
        // Don't show error to user as we can still work in offline mode
    }
}

/**
 * User logout
 */
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 Logging out...');
        
        try {
            // Clear authentication
            if (window.apiService) {
                await window.apiService.logout();
            }
            
            // Clear current user
            currentUser = null;
            localStorage.removeItem('currentUser');
            
            // Show login screen and hide main app
            const loginScreen = document.getElementById('loginScreen');
            const mainApp = document.getElementById('mainApp');
            
            if (loginScreen) loginScreen.style.display = 'flex';
            if (mainApp) {
                mainApp.classList.remove('logged-in');
                mainApp.style.display = 'none';
            }
            
            // Clear login form
            clearLoginForm();
            
            console.log('✅ Logged out successfully');
            
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    }
}

/**
 * Check if current user has permission for a section
 */
function hasPermission(section) {
    if (!currentUser) return false;
    return permissions[currentUser.role] && permissions[currentUser.role].includes(section);
}

/**
 * Setup navigation based on user role
 */
function setupNavigation() {
    console.log('🧭 Setting up navigation for role:', currentUser.role);
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const userPermissions = permissions[currentUser.role] || [];
    
    navButtons.forEach(button => {
        try {
            const onclickStr = button.getAttribute('onclick') || button.onclick?.toString() || '';
            const section = onclickStr.match(/showSection\('(.+?)'/);
            if (section && section[1]) {
                const sectionName = section[1];
                if (userPermissions.includes(sectionName)) {
                    button.style.display = 'inline-block';
                } else {
                    button.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error setting up navigation for button:', error);
        }
    });

    // Setup user management button for admin
    const userMgmtBtn = document.getElementById('userManagementBtn');
    if (userMgmtBtn) {
        if (currentUser.role === 'admin') {
            userMgmtBtn.style.display = 'inline-block';
        } else {
            userMgmtBtn.style.display = 'none';
        }
    }

    // Show first available section
    const firstAvailableSection = userPermissions[0];
    if (firstAvailableSection && window.showSection) {
        setTimeout(() => {
            console.log('🎯 Showing first section:', firstAvailableSection);
            window.showSection(firstAvailableSection);
            
            // Activate corresponding nav button
            navButtons.forEach(btn => {
                try {
                    const onclickStr = btn.getAttribute('onclick') || btn.onclick?.toString() || '';
                    const section = onclickStr.match(/showSection\('(.+?)'/);
                    if (section && section[1] === firstAvailableSection) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                } catch (error) {
                    console.error('Error activating nav button:', error);
                }
            });
        }, 500);
    }
}

/**
 * Get current user
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return currentUser !== null;
}

/**
 * Check if current user is staff
 */
function isStaffUser() {
    return currentUser && currentUser.role === 'staff';
}

/**
 * Check if user can edit/delete (not staff)
 */
function canEditDelete() {
    return currentUser && currentUser.role !== 'staff';
}

/**
 * FIXED Auto-login check on page load
 */
function checkAutoLogin() {
    console.log('🔍 Checking for existing session...');
    
    const storedUser = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    
    if (storedUser && authToken) {
        try {
            const user = JSON.parse(storedUser);
            console.log('🔄 Found existing session for:', user.fullName);
            
            // Restore session
            currentUser = user;
            
            // Set token in API service
            if (window.apiService) {
                window.apiService.setToken(authToken);
            }
            
            // Complete login silently
            updateUserDisplay(user);
            showMainApplication();
            setupNavigation();
            loadInitialData();
            
            console.log('✅ Session restored successfully');
            
        } catch (error) {
            console.error('❌ Error restoring session:', error);
            // Clear invalid session data
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
        }
    }
}

/**
 * Initialize authentication system
 */
function initializeAuth() {
    console.log('🔐 Initializing authentication system...');
    
    // Check for existing session
    checkAutoLogin();
    
    // Ensure login screen is visible if not logged in
    if (!isLoggedIn()) {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainApp) {
            mainApp.classList.remove('logged-in');
            mainApp.style.display = 'none';
        }
    }
    
    console.log('✅ Authentication system initialized');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeAuth, 100);
});

// Export functions for global use
window.AuthModule = {
    handleLogin,
    logout,
    hasPermission,
    setupNavigation,
    getCurrentUser,
    isLoggedIn,
    isStaffUser,
    canEditDelete,
    loadInitialData,
    initializeAuth,
    checkAutoLogin,
    completeLogin
};