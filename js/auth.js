// ZEDSON WATCHCRAFT - FIXED Authentication Module
// Developed by PULSEWARE❤️

/**
 * FIXED Authentication System with Proper Error Handling and Timeout Management
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
 * FIXED: Handle user login with proper timeout and error handling
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    console.log('🔐 Login attempt for user:', username);
    
    // Validate input
    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }
    
    // Show loading state
    const loginBtn = event.target.querySelector('button[type="submit"]');
    const originalText = loginBtn ? loginBtn.textContent : 'Login';
    
    if (loginBtn) {
        loginBtn.textContent = 'AUTHENTICATING...';
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.7';
    }
    
    try {
        console.log('🔄 Starting authentication process...');
        
        // Ensure API service is available
        if (!window.apiService) {
            console.log('⚠️ API service not available, creating new instance...');
            window.apiService = new APIService();
            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Set timeout for the entire login process
        const loginTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login timeout')), 15000) // 15 second timeout
        );
        
        // Try API authentication with timeout
        console.log('🌐 Attempting authentication...');
        const response = await Promise.race([
            window.apiService.login({ username, password }),
            loginTimeout
        ]);
        
        console.log('📡 Authentication response:', response);
        
        if (response && response.success && response.user) {
            console.log('✅ Authentication successful for:', response.user.fullName);
            completeLogin(response.user);
        } else {
            console.log('❌ Authentication failed:', response?.error);
            showError(response?.error || 'Invalid username or password');
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        if (error.message === 'Login timeout') {
            showError('Login timeout. Please check your connection and try again.');
        } else {
            showError('Login failed. Please try again.');
        }
    } finally {
        // Reset button state
        if (loginBtn) {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';
        }
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (window.Utils && Utils.showNotification) {
        Utils.showNotification(message);
    } else {
        alert(message);
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    if (window.Utils && Utils.showNotification) {
        Utils.showNotification(message);
    } else {
        console.log('Success:', message);
    }
}

/**
 * FIXED: Complete login process with proper error handling
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
        
        // Show success notification after a brief delay
        setTimeout(() => {
            showSuccess(`Welcome back, ${user.fullName}!`);
        }, 500);
        
    } catch (error) {
        console.error('❌ Error completing login:', error);
        showError('Error completing login. Please try again.');
    }
}

/**
 * Update user display information
 */
function updateUserDisplay(user) {
    try {
        const currentUserElement = document.getElementById('currentUser');
        const currentUserRoleElement = document.getElementById('currentUserRole');
        
        if (currentUserElement) {
            currentUserElement.textContent = `Welcome, ${user.fullName}`;
        }
        if (currentUserRoleElement) {
            currentUserRoleElement.textContent = user.role.toUpperCase();
        }
    } catch (error) {
        console.error('Error updating user display:', error);
    }
}

/**
 * Show main application and hide login screen
 */
function showMainApplication() {
    try {
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
    } catch (error) {
        console.error('Error showing main application:', error);
    }
}

/**
 * Clear login form
 */
function clearLoginForm() {
    try {
        const usernameField = document.getElementById('loginUsername');
        const passwordField = document.getElementById('loginPassword');
        
        if (usernameField) usernameField.value = '';
        if (passwordField) passwordField.value = '';
    } catch (error) {
        console.error('Error clearing login form:', error);
    }
}

/**
 * FIXED: Load initial data with proper error handling
 */
async function loadInitialData() {
    try {
        console.log('📥 Loading application data...');
        
        // Show loading status
        const statusElement = document.getElementById('dbStatusText');
        if (statusElement) {
            statusElement.textContent = '📥 Loading data...';
        }
        
        // Load data through API service or localStorage
        if (window.AppCoreModule && window.AppCoreModule.loadModuleData) {
            console.log('🔄 Loading module data...');
            
            // Load all modules with timeout protection
            const loadPromises = [
                'customers',
                'inventory', 
                'sales',
                'services',
                'expenses',
                'invoices'
            ].map(async (module) => {
                try {
                    await Promise.race([
                        window.AppCoreModule.loadModuleData(module),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error(`${module} load timeout`)), 5000)
                        )
                    ]);
                    console.log(`✅ ${module} data loaded`);
                } catch (error) {
                    console.log(`⚠️ ${module} load failed:`, error.message);
                    // Continue with other modules even if one fails
                }
            });
            
            // Wait for all modules to complete (or timeout)
            await Promise.allSettled(loadPromises);
        }
        
        // Update dashboard with delay to ensure all modules are loaded
        setTimeout(() => {
            try {
                if (window.updateDashboard) {
                    console.log('📊 Updating dashboard...');
                    window.updateDashboard();
                }
            } catch (error) {
                console.error('Error updating dashboard:', error);
            }
        }, 1000);
        
        console.log('✅ Initial data loading completed');
        
        // Update status
        if (statusElement) {
            setTimeout(() => {
                if (window.apiService?.isConnected) {
                    statusElement.textContent = '✅ MongoDB Connected';
                } else {
                    statusElement.textContent = '📁 Offline Mode';
                }
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
        // Don't show error to user as we can still work in offline mode
    }
}

/**
 * FIXED: User logout with proper cleanup
 */
async function logout() {
    const confirmLogout = confirm('Are you sure you want to logout?');
    
    if (confirmLogout) {
        console.log('🚪 Logging out...');
        
        try {
            // Clear authentication
            if (window.apiService) {
                await window.apiService.logout();
            }
            
            // Clear current user
            currentUser = null;
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            
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
            
            // Reset connection status
            const statusElement = document.getElementById('dbStatus');
            const statusText = document.getElementById('dbStatusText');
            
            if (statusElement && statusText) {
                statusElement.className = 'db-status connecting';
                statusText.textContent = 'Initializing...';
            }
            
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
 * FIXED: Setup navigation based on user role
 */
function setupNavigation() {
    console.log('🧭 Setting up navigation for role:', currentUser.role);
    
    try {
        const navButtons = document.querySelectorAll('.nav-btn');
        const userPermissions = permissions[currentUser.role] || [];
        
        navButtons.forEach(button => {
            try {
                const onclickStr = button.getAttribute('onclick') || '';
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
                
                try {
                    window.showSection(firstAvailableSection);
                    
                    // Activate corresponding nav button
                    navButtons.forEach(btn => {
                        try {
                            const onclickStr = btn.getAttribute('onclick') || '';
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
                } catch (error) {
                    console.error('Error showing section:', error);
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error setting up navigation:', error);
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
 * FIXED: Auto-login check on page load with proper error handling
 */
function checkAutoLogin() {
    console.log('🔍 Checking for existing session...');
    
    try {
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
                
                // Load data with delay to avoid blocking UI
                setTimeout(() => {
                    loadInitialData();
                }, 500);
                
                console.log('✅ Session restored successfully');
                
            } catch (parseError) {
                console.error('❌ Error parsing stored user data:', parseError);
                // Clear invalid session data
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                showLoginScreen();
            }
        } else {
            console.log('🔍 No existing session found');
            showLoginScreen();
        }
    } catch (error) {
        console.error('❌ Error checking auto-login:', error);
        showLoginScreen();
    }
}

/**
 * Show login screen
 */
function showLoginScreen() {
    try {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainApp) {
            mainApp.classList.remove('logged-in');
            mainApp.style.display = 'none';
        }
    } catch (error) {
        console.error('Error showing login screen:', error);
    }
}

/**
 * FIXED: Initialize authentication system with proper error handling
 */
function initializeAuth() {
    console.log('🔐 Initializing authentication system...');
    
    try {
        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initializeAuth, 100);
            });
            return;
        }
        
        // Check for existing session
        checkAutoLogin();
        
        console.log('✅ Authentication system initialized');
        
    } catch (error) {
        console.error('❌ Error initializing auth system:', error);
        showLoginScreen();
    }
}

/**
 * Force login (for emergency situations)
 */
function forceLogin(username, role = 'admin') {
    console.log('🚨 Force login for:', username);
    
    const user = {
        username: username,
        role: role,
        fullName: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
        email: `${username}@zedsonwatchcraft.com`
    };
    
    completeLogin(user);
}

/**
 * Reset authentication (for debugging)
 */
function resetAuth() {
    console.log('🔄 Resetting authentication...');
    
    // Clear everything
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    
    // Reset API service
    if (window.apiService) {
        window.apiService.setToken(null);
    }
    
    // Show login screen
    showLoginScreen();
    
    console.log('✅ Authentication reset complete');
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
    completeLogin,
    forceLogin,
    resetAuth,
    showLoginScreen
};

// Make essential functions globally available
window.handleLogin = handleLogin;
window.logout = logout;

console.log('✅ FIXED Authentication module loaded with enhanced error handling');