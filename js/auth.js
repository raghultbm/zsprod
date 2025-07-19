// ZEDSON WATCHCRAFT - Authentication Module (Phase 4 - Enhanced API Integration)

/**
 * Authentication and User Management System with Enhanced API Integration
 * Updated with improved error handling, session management, and module integration
 */

// Current logged-in user
let currentUser = null;
let sessionTimeout = null;
let isAuthenticating = false;
let lastActivityTime = Date.now();

// User permissions configuration with enhanced module permissions
const permissions = {
    admin: [
        'dashboard', 'inventory', 'customers', 'sales', 'service', 
        'expenses', 'invoices', 'users', 'reports', 'settings', 'export'
    ],
    owner: [
        'dashboard', 'inventory', 'customers', 'sales', 'service', 
        'expenses', 'invoices', 'reports', 'export'
    ],
    staff: [
        'dashboard', 'inventory', 'customers', 'sales', 'service', 
        'expenses', 'invoices'
    ]
};

// Session configuration
const SESSION_CONFIG = {
    TIMEOUT_DURATION: 30 * 60 * 1000, // 30 minutes
    WARNING_DURATION: 5 * 60 * 1000,  // 5 minutes before timeout
    ACTIVITY_EVENTS: ['click', 'keypress', 'scroll', 'mousemove']
};

/**
 * Reset button to original state
 */
function resetButton(button, originalText) {
    if (button) {
        button.textContent = originalText;
        button.disabled = false;
        delete button.dataset.originalText;
    }
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loadingText) {
    if (button) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
        return button.dataset.originalText;
    }
    return null;
}

/**
 * Enhanced authentication initialization with session management
 */
async function initializeAuth() {
    try {
        showLoadingState('auth-init');
        
        // Check if user is already logged in (has valid token)
        if (isAuthenticated()) {
            const response = await apiHelpers.withLoading('auth-check', () => 
                api.auth.getCurrentUser()
            );
            
            if (response && response.success) {
                currentUser = response.data;
                setupSessionManagement();
                updateLastActivity();
                console.log('User session restored:', currentUser.username);
                return currentUser;
            } else {
                // Invalid token, remove it
                clearAuthData();
                console.log('Invalid session, cleared auth data');
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Auth initialization error:', error);
        handleAuthError('Session check failed', error);
        clearAuthData();
        return null;
    } finally {
        hideLoadingState('auth-init');
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const token = localStorage.getItem('authToken');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    
    if (!token || !tokenExpiry) {
        return false;
    }
    
    // Check if token is expired
    if (Date.now() > parseInt(tokenExpiry)) {
        clearAuthData();
        return false;
    }
    
    return true;
}

/**
 * Clear authentication data
 */
function clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    currentUser = null;
    clearSessionTimeout();
}

/**
 * Setup session management with activity tracking
 */
function setupSessionManagement() {
    // Clear any existing timeout
    clearSessionTimeout();
    
    // Setup activity listeners
    SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
        document.addEventListener(event, updateLastActivity, { passive: true });
    });
    
    // Start session timeout timer
    startSessionTimeout();
    
    // Check session validity every minute
    setInterval(checkSessionValidity, 60 * 1000);
}

/**
 * Update last activity time
 */
function updateLastActivity() {
    lastActivityTime = Date.now();
    
    // Reset session timeout
    if (currentUser) {
        clearSessionTimeout();
        startSessionTimeout();
    }
}

/**
 * Start session timeout timer
 */
function startSessionTimeout() {
    sessionTimeout = setTimeout(() => {
        showSessionTimeoutWarning();
    }, SESSION_CONFIG.TIMEOUT_DURATION - SESSION_CONFIG.WARNING_DURATION);
}

/**
 * Clear session timeout
 */
function clearSessionTimeout() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
}

/**
 * Show session timeout warning
 */
function showSessionTimeoutWarning() {
    const timeLeft = Math.ceil(SESSION_CONFIG.WARNING_DURATION / 1000 / 60);
    const extendSession = confirm(
        `Your session will expire in ${timeLeft} minutes due to inactivity.\n\n` +
        'Click OK to extend your session, or Cancel to logout now.'
    );
    
    if (extendSession) {
        updateLastActivity();
        console.log('Session extended by user');
    } else {
        logout();
    }
}

/**
 * Check session validity
 */
async function checkSessionValidity() {
    if (!currentUser || !isAuthenticated()) {
        return;
    }
    
    try {
        const response = await api.auth.getCurrentUser();
        if (!response || !response.success) {
            console.log('Session validation failed, logging out');
            logout();
        }
    } catch (error) {
        console.warn('Session check failed:', error);
        // Don't auto-logout on network errors, just log the warning
    }
}

/**
 * Handle user login with enhanced API integration and validation
 */
async function handleLogin(event) {
    event.preventDefault();
    
    if (isAuthenticating) {
        showNotification('Login already in progress, please wait...');
        return;
    }
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Enhanced validation
    const validationResult = validateLoginInput(username, password);
    if (!validationResult.isValid) {
        showNotification(validationResult.message);
        return;
    }
    
    // Get the login button
    const loginBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(loginBtn, 'Logging in...');
    
    try {
        isAuthenticating = true;
        
        const response = await apiHelpers.withLoading('user-login', () => 
            api.auth.login(username, password)
        );
        
        if (response && response.success) {
            // Store auth data
            storeAuthData(response.data);
            
            if (response.data.firstLogin) {
                // First time login - show password setup modal
                showFirstLoginModal(response.data.user);
            } else {
                // Regular login successful
                completeLogin(response.data.user);
            }
        } else {
            throw new Error(response?.message || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        handleAuthError('Login failed', error);
    } finally {
        isAuthenticating = false;
        resetButton(loginBtn, originalText || 'Login');
    }
}

/**
 * Enhanced login input validation
 */
function validateLoginInput(username, password) {
    if (!username || username.length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters long' };
    }
    
    if (!password || password.length < 6) {
        return { isValid: false, message: 'Password must be at least 6 characters long' };
    }
    
    // Check for potentially malicious input
    const suspiciousPattern = /<script|javascript:|on\w+=/i;
    if (suspiciousPattern.test(username)) {
        return { isValid: false, message: 'Invalid characters in username' };
    }
    
    return { isValid: true };
}

/**
 * Store authentication data securely
 */
function storeAuthData(authData) {
    const { token, refreshToken, expiresIn, user } = authData;
    
    // Calculate expiry time
    const expiryTime = Date.now() + (expiresIn * 1000);
    
    localStorage.setItem('authToken', token);
    localStorage.setItem('tokenExpiry', expiryTime.toString());
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userName', user.username);
    
    if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
    }
    
    currentUser = user;
}

/**
 * Show first login modal for password setup
 */
function showFirstLoginModal(user) {
    currentUser = user; // Set temporarily for password change
    document.getElementById('firstLoginModal').style.display = 'block';
    
    if (window.logAuthAction) {
        logAuthAction(`First login initiated`, user.username);
    }
}

/**
 * Handle first-time password setup with enhanced validation
 */
async function handleFirstTimePasswordSetup(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('newPasswordSetup').value;
    const confirmPassword = document.getElementById('confirmPasswordSetup').value;
    
    // Enhanced password validation
    const validationResult = validatePasswordSetup(newPassword, confirmPassword);
    if (!validationResult.isValid) {
        showNotification(validationResult.message);
        return;
    }
    
    if (!currentUser) {
        showNotification('Session error. Please try logging in again.');
        return;
    }
    
    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Setting Password...');
    
    try {
        const response = await apiHelpers.withLoading('password-setup', () =>
            api.auth.firstLogin(currentUser.username, newPassword, confirmPassword)
        );
        
        if (response && response.success) {
            // Store new auth data
            storeAuthData(response.data);
            
            // Close modal and complete login
            document.getElementById('firstLoginModal').style.display = 'none';
            document.getElementById('newPasswordSetup').value = '';
            document.getElementById('confirmPasswordSetup').value = '';
            
            completeLogin(response.data.user);
            showSuccessMessage('Password set successfully! Welcome to ZEDSON WATCHCRAFT.');
        } else {
            throw new Error(response?.message || 'Password setup failed');
        }
        
    } catch (error) {
        console.error('First time password setup error:', error);
        handleAuthError('Password setup failed', error);
    } finally {
        resetButton(submitBtn, originalText || 'Set Password');
    }
}

/**
 * Enhanced password validation
 */
function validatePasswordSetup(newPassword, confirmPassword) {
    if (!newPassword || newPassword.length < 8) {
        return { 
            isValid: false, 
            message: 'Password must be at least 8 characters long' 
        };
    }
    
    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!(hasUpperCase && hasLowerCase && (hasNumbers || hasSpecialChar))) {
        return {
            isValid: false,
            message: 'Password must contain uppercase, lowercase, and either numbers or special characters'
        };
    }
    
    if (newPassword !== confirmPassword) {
        return { isValid: false, message: 'Passwords do not match' };
    }
    
    return { isValid: true };
}

/**
 * Complete login process with enhanced initialization
 */
async function completeLogin(user) {
    currentUser = user;
    
    try {
        // Setup session management
        setupSessionManagement();
        updateLastActivity();
        
        // Log successful login
        if (window.logAuthAction) {
            logAuthAction(`User logged in successfully`, user.username, user.role);
        }
        
        // Update user info display
        updateUserDisplay(user);
        
        // Hide login screen and show main app
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').classList.add('logged-in');
        
        // Setup navigation based on user role
        setupNavigation();
        
        // Initialize modules after login with enhanced loading
        showLoadingState('modules-init');
        await initializeModulesAfterLogin();
        hideLoadingState('modules-init');
        
        // Initialize logging system
        if (window.LoggingModule) {
            LoggingModule.initializeLogging();
        }
        
        // Clear login form
        clearLoginForm();
        
        showSuccessMessage(`Welcome back, ${user.fullName || user.username}!`);
        
    } catch (error) {
        console.error('Error completing login:', error);
        handleAuthError('Failed to initialize application', error);
    }
}

/**
 * Update user display information
 */
function updateUserDisplay(user) {
    const currentUserElement = document.getElementById('currentUser');
    const currentUserRoleElement = document.getElementById('currentUserRole');
    
    if (currentUserElement) {
        currentUserElement.textContent = `Welcome, ${user.fullName || user.username}`;
    }
    
    if (currentUserRoleElement) {
        currentUserRoleElement.textContent = (user.role || 'user').toUpperCase();
        currentUserRoleElement.className = `role-badge role-${user.role}`;
    }
}

/**
 * Enhanced module initialization after login
 */
async function initializeModulesAfterLogin() {
    const initTasks = [];
    
    try {
        // Initialize customer module with API data
        if (window.CustomerModule) {
            initTasks.push(
                CustomerModule.initializeCustomers()
                    .catch(error => console.warn('Customer module init failed:', error))
            );
        }
        
        // Initialize other modules in parallel for better performance
        const moduleInits = [
            { module: window.InventoryModule, method: 'initializeInventory' },
            { module: window.SalesModule, method: 'initializeSales' },
            { module: window.ServiceModule, method: 'initializeServices' },
            { module: window.ExpenseModule, method: 'initializeExpenses' },
            { module: window.InvoiceModule, method: 'initializeInvoices' }
        ];
        
        moduleInits.forEach(({ module, method }) => {
            if (module && typeof module[method] === 'function') {
                initTasks.push(
                    module[method]()
                        .catch(error => console.warn(`${method} failed:`, error))
                );
            }
        });
        
        // Wait for all modules to initialize (with timeout)
        await Promise.race([
            Promise.allSettled(initTasks),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Module initialization timeout')), 30000)
            )
        ]);
        
        // Update dashboard after all modules are loaded
        if (window.updateDashboard) {
            updateDashboard();
        }
        
        console.log('All modules initialized after login');
        
    } catch (error) {
        console.error('Error initializing modules:', error);
        showNotification('Some modules failed to load. Please refresh if you experience issues.');
    }
}

/**
 * Enhanced user logout with cleanup
 */
async function logout(force = false) {
    if (!force && !confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        const username = currentUser ? currentUser.username : 'unknown';
        
        // Log logout
        if (window.logAuthAction) {
            logAuthAction(`User logged out`, username);
        }
        
        // Call API logout if possible
        if (isAuthenticated()) {
            try {
                await api.auth.logout();
            } catch (error) {
                console.warn('API logout failed:', error);
            }
        }
        
        // Clear session management
        clearSessionTimeout();
        SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
            document.removeEventListener(event, updateLastActivity);
        });
        
        // Clear authentication data
        clearAuthData();
        
        // Reset all button states on the page
        resetAllButtonStates();
        
        // Clear any cached data
        if (window.cacheManager) {
            cacheManager.clear();
        }
        
        // Show login screen and hide main app
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').classList.remove('logged-in');
        
        // Clear login form
        clearLoginForm();
        
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if cleanup fails
        clearAuthData();
        resetAllButtonStates();
        window.location.reload();
    }
}

/**
 * Clear login form
 */
function clearLoginForm() {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

/**
 * Reset all button states on the page
 */
function resetAllButtonStates() {
    // Reset all buttons that might be in loading state
    const buttons = document.querySelectorAll('button[disabled]');
    buttons.forEach(button => {
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            button.disabled = false;
            delete button.dataset.originalText;
        } else {
            button.disabled = false;
        }
    });
    
    // Reset specific known buttons
    const loginBtn = document.querySelector('#loginScreen button[type="submit"]');
    if (loginBtn) {
        resetButton(loginBtn, 'Login');
    }
    
    const passwordBtn = document.querySelector('#firstLoginModal button[type="submit"]');
    if (passwordBtn) {
        resetButton(passwordBtn, 'Set Password');
    }
}

/**
 * Enhanced permission checking with detailed permissions
 */
function hasPermission(section, action = 'read') {
    if (!currentUser) return false;
    
    const userPermissions = permissions[currentUser.role] || [];
    
    // Check basic section access
    if (!userPermissions.includes(section)) {
        return false;
    }
    
    // Check action-specific permissions for staff users
    if (currentUser.role === 'staff') {
        const restrictedActions = ['delete', 'export', 'bulk'];
        if (restrictedActions.includes(action)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Enhanced navigation setup with dynamic permissions
 */
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const userPermissions = permissions[currentUser.role] || [];
    const isStaff = currentUser.role === 'staff';
    
    navButtons.forEach(button => {
        const section = extractSectionFromButton(button);
        if (section && userPermissions.includes(section)) {
            button.style.display = 'inline-block';
            
            // Add permission indicators for restricted actions
            if (isStaff && button.dataset.restricted !== 'false') {
                button.title = 'Limited access - some actions restricted';
                button.classList.add('restricted-access');
            }
        } else {
            button.style.display = 'none';
        }
    });

    // Enhanced user management button visibility
    const userMgmtBtn = document.getElementById('userManagementBtn');
    if (userMgmtBtn) {
        if (currentUser.role === 'admin') {
            userMgmtBtn.style.display = 'inline-block';
        } else {
            userMgmtBtn.style.display = 'none';
        }
    }

    // Show first available section with smooth transition
    const firstAvailableSection = userPermissions[0];
    if (firstAvailableSection && window.showSection) {
        setTimeout(() => {
            showSection(firstAvailableSection);
            
            // Activate corresponding nav button
            navButtons.forEach(btn => {
                const section = extractSectionFromButton(btn);
                if (section === firstAvailableSection) {
                    btn.classList.add('active');
                }
            });
        }, 100);
    }
    
    // Log navigation setup
    if (window.logAction) {
        logAction(`Navigation setup completed for ${currentUser.role} user`, {
            availableSections: userPermissions,
            restrictedMode: isStaff
        });
    }
}

/**
 * Extract section name from navigation button
 */
function extractSectionFromButton(button) {
    const onClick = button.getAttribute('onclick');
    if (onClick) {
        const match = onClick.match(/showSection\('(.+?)'/);
        return match ? match[1] : null;
    }
    return null;
}

/**
 * Enhanced user management with API integration
 */
async function updateUserTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    try {
        showLoadingState('user-table');
        
        const response = await apiHelpers.withLoading('users-load', () => 
            api.auth.getUsers()
        );
        
        if (response && response.success) {
            const users = response.data || [];
            renderUserTable(users);
        } else {
            throw new Error(response?.message || 'Failed to load users');
        }
        
    } catch (error) {
        console.error('Update user table error:', error);
        handleAuthError('Failed to load users', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">Error loading users</td></tr>';
    } finally {
        hideLoadingState('user-table');
    }
}

/**
 * Render user table with enhanced display
 */
function renderUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    users.forEach((user, index) => {
        const roleClass = getRoleClass(user.role);
        const statusClass = user.status === 'active' ? 'completed' : 'pending';
        const canDelete = currentUser.username !== user.username && user.role !== 'admin';
        const passwordStatus = user.firstLogin ? 
            '<span style="color: #ff6b6b;">Temp Password</span>' : 
            '<span style="color: #28a745;">Set</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>
                <div class="user-info">
                    <strong>${Utils.sanitizeHtml(user.username)}</strong>
                    ${user.fullName ? `<br><small>${Utils.sanitizeHtml(user.fullName)}</small>` : ''}
                </div>
            </td>
            <td><span class="status ${roleClass}">${Utils.sanitizeHtml(user.role)}</span></td>
            <td><span class="status ${statusClass}">${Utils.sanitizeHtml(user.status)}</span></td>
            <td>${passwordStatus}</td>
            <td>${user.lastLogin ? Utils.formatDate(new Date(user.lastLogin)) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick="editUser('${user.id}')" ${!canDelete ? 'disabled' : ''}>Edit</button>
                    <button class="btn btn-sm" onclick="resetUserPassword('${user.id}')" title="Reset Password">Reset PWD</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete user ${user.username}?', () => deleteUser('${user.id}'))" 
                            ${!canDelete ? 'disabled' : ''}>Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Get CSS class for user role
 */
function getRoleClass(role) {
    const roleClasses = {
        'admin': 'available',
        'owner': 'in-progress',
        'staff': 'pending'
    };
    return roleClasses[role] || 'pending';
}

/**
 * Enhanced error handling for authentication
 */
function handleAuthError(userMessage, error) {
    console.error('Auth Error:', error);
    
    // Determine user-friendly message
    let message = userMessage;
    if (error?.message) {
        if (error.message.includes('invalid credentials') || error.message.includes('unauthorized')) {
            message = 'Invalid username or password';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            message += ' (Network error - check connection)';
        } else if (error.message.includes('timeout')) {
            message += ' (Request timeout - try again)';
        } else {
            message += ` (${error.message})`;
        }
    }
    
    showNotification(message);
    
    // Log for debugging
    if (window.logAction) {
        logAction('Auth Error: ' + userMessage, {
            error: error?.message,
            timestamp: new Date().toISOString()
        }, 'error');
    }
}

/**
 * Loading state management
 */
function showLoadingState(context) {
    const spinner = document.getElementById(`${context}-spinner`);
    if (spinner) {
        spinner.style.display = 'block';
    }
}

function hideLoadingState(context) {
    const spinner = document.getElementById(`${context}-spinner`);
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Utility functions
 */
function showSuccessMessage(message) {
    Utils.showNotification(message);
    if (window.logAction) {
        logAction('Auth Success: ' + message);
    }
}

function showNotification(message) {
    Utils.showNotification(message);
}

// Keep all existing user management functions (addNewUser, editUser, deleteUser, etc.)
// with their original implementations

// Make functions globally available
window.handleFirstTimePasswordSetup = handleFirstTimePasswordSetup;
window.resetUserPassword = resetUserPassword;
window.resetAllButtonStates = resetAllButtonStates;

// Export enhanced functions for global use
window.AuthModule = {
    // Core functions
    initializeAuth,
    handleLogin,
    logout,
    completeLogin,
    
    // Enhanced functions
    isAuthenticated,
    hasPermission,
    setupNavigation,
    updateUserTable,
    
    // Session management
    setupSessionManagement,
    updateLastActivity,
    checkSessionValidity,
    
    // User management
    openAddUserModal,
    addNewUser,
    editUser,
    deleteUser,
    resetUserPassword,
    
    // Utility functions
    getCurrentUser: () => currentUser,
    isLoggedIn: () => currentUser !== null,
    isStaffUser: () => currentUser && currentUser.role === 'staff',
    canEditDelete: () => currentUser && currentUser.role !== 'staff',
    resetButton,
    setButtonLoading,
    resetAllButtonStates,
    handleAuthError,
    
    // Data access
    currentUser: () => currentUser,
    permissions
};