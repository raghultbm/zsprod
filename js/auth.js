// ZEDSON WATCHCRAFT - Authentication Module (FIXED - Button Reset Issues)

/**
 * Authentication and User Management System with API Integration
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
 * Reset button to original state
 */
function resetButton(button, originalText) {
    if (button) {
        button.textContent = originalText;
        button.disabled = false;
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
 * Initialize authentication system
 */
async function initializeAuth() {
    try {
        // Check if user is already logged in (has valid token)
        if (APIHelpers.isAuthenticated()) {
            const user = await AuthAPI.getCurrentUser();
            if (user) {
                currentUser = user;
                return user;
            } else {
                // Invalid token, remove it
                API.removeToken();
            }
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        API.removeToken();
    }
    
    return null;
}

/**
 * Handle user login with API integration - FIXED BUTTON RESET
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Validate input
    if (!username || !password) {
        Utils.showNotification('Please enter both username and password.');
        return;
    }
    
    // Get the login button
    const loginBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(loginBtn, 'Logging in...');
    
    try {
        const response = await AuthAPI.login(username, password);
        
        if (response.success) {
            if (response.firstLogin) {
                // First time login - show password setup modal
                showFirstLoginModal(response.user);
            } else {
                // Regular login successful
                completeLogin(response.user);
            }
        }
        
    } catch (error) {
        console.error('Login error:', error);
        Utils.showNotification(error.message || 'Login failed. Please try again.');
    } finally {
        // Always reset button state
        resetButton(loginBtn, originalText || 'Login');
    }
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
 * Handle first-time password setup with API - FIXED BUTTON RESET
 */
async function handleFirstTimePasswordSetup(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('newPasswordSetup').value;
    const confirmPassword = document.getElementById('confirmPasswordSetup').value;
    
    // Validate passwords
    if (newPassword.length < 6) {
        Utils.showNotification('Password must be at least 6 characters long.');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        Utils.showNotification('Passwords do not match.');
        return;
    }
    
    if (!currentUser) {
        Utils.showNotification('Session error. Please try logging in again.');
        return;
    }
    
    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Setting Password...');
    
    try {
        const response = await AuthAPI.setFirstTimePassword(
            currentUser.username,
            newPassword,
            confirmPassword
        );
        
        if (response.success) {
            // Close modal and complete login
            document.getElementById('firstLoginModal').style.display = 'none';
            document.getElementById('newPasswordSetup').value = '';
            document.getElementById('confirmPasswordSetup').value = '';
            
            completeLogin(response.user);
            Utils.showNotification('Password set successfully! Welcome to ZEDSON WATCHCRAFT.');
        }
        
    } catch (error) {
        console.error('First time password setup error:', error);
        Utils.showNotification(error.message || 'Password setup failed. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Set Password');
    }
}

/**
 * Complete login process
 */
function completeLogin(user) {
    currentUser = user;
    
    // Log successful login
    if (window.logAuthAction) {
        logAuthAction(`User logged in successfully`, user.username, user.role);
    }
    
    // Update user info display
    document.getElementById('currentUser').textContent = `Welcome, ${user.fullName}`;
    document.getElementById('currentUserRole').textContent = user.role.toUpperCase();
    
    // Hide login screen and show main app
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').classList.add('logged-in');
    
    // Setup navigation based on user role
    setupNavigation();
    
    // Initialize modules after login
    if (window.AppCoreModule && AppCoreModule.initializeModulesAfterLogin) {
        AppCoreModule.initializeModulesAfterLogin();
    }
    
    // Initialize logging system
    if (window.LoggingModule) {
        LoggingModule.initializeLogging();
    }
    
    // Clear login form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    
    Utils.showNotification(`Welcome back, ${user.fullName}!`);
}

/**
 * User logout with API integration - FIXED BUTTON STATES
 */
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            const username = currentUser ? currentUser.username : 'unknown';
            
            // Log logout
            if (window.logAuthAction) {
                logAuthAction(`User logged out`, username);
            }
            
            // Call API logout
            await AuthAPI.logout();
            
            // Clear current user
            currentUser = null;
            
            // Reset all button states on the page
            resetAllButtonStates();
            
            // Show login screen and hide main app
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').classList.remove('logged-in');
            
            // Clear login form
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            currentUser = null;
            API.removeToken();
            resetAllButtonStates();
            window.location.reload();
        }
    }
}

/**
 * Reset all button states on the page - NEW FUNCTION
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
 * Check if current user has permission for a section
 */
function hasPermission(section) {
    if (!currentUser) return false;
    return permissions[currentUser.role].includes(section);
}

/**
 * Setup navigation based on user role
 */
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const userPermissions = permissions[currentUser.role];
    const isStaff = currentUser.role === 'staff';
    
    navButtons.forEach(button => {
        const section = button.onclick.toString().match(/showSection\('(.+?)'/);
        if (section && section[1]) {
            const sectionName = section[1];
            if (userPermissions.includes(sectionName)) {
                button.style.display = 'inline-block';
            } else {
                button.style.display = 'none';
            }
        }
    });

    // Hide user management button for staff and non-admin users
    const userMgmtBtn = document.getElementById('userManagementBtn');
    if (currentUser.role === 'admin') {
        userMgmtBtn.style.display = 'inline-block';
    } else {
        userMgmtBtn.style.display = 'none';
    }

    // Show first available section
    const firstAvailableSection = userPermissions[0];
    if (firstAvailableSection && window.showSection) {
        showSection(firstAvailableSection);
        
        // Activate corresponding nav button
        navButtons.forEach(btn => {
            const section = btn.onclick.toString().match(/showSection\('(.+?)'/);
            if (section && section[1] === firstAvailableSection) {
                btn.classList.add('active');
            }
        });
    }
    
    // Log navigation setup
    if (window.logAction) {
        logAction(`Navigation setup completed for ${currentUser.role} user`);
    }
}

/**
 * Open Add User Modal (Admin only)
 */
function openAddUserModal() {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can add new users.');
        return;
    }
    
    if (window.logAction) {
        logAction('Opened add user modal');
    }
    document.getElementById('addUserModal').style.display = 'block';
}

/**
 * Add new user with API integration - FIXED BUTTON RESET
 */
async function addNewUser(event) {
    event.preventDefault();
    
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can add new users.');
        return;
    }

    const username = document.getElementById('newUsername').value.trim();
    const role = document.getElementById('newUserRole').value;
    const fullName = document.getElementById('newUserFullName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();

    // Validate input
    if (!username || !role || !fullName || !email) {
        Utils.showNotification('Please fill in all required fields.');
        return;
    }

    // Validate email format
    if (!Utils.validateEmail(email)) {
        Utils.showNotification('Please enter a valid email address.');
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Creating User...');

    try {
        const response = await AuthAPI.createUser({
            username,
            role,
            fullName,
            email
        });

        if (response.success) {
            // Log user creation
            if (window.logUserManagementAction) {
                logUserManagementAction(`Created new user: ${username} with role: ${role}`, response.data.user);
            }
            
            await updateUserTable();
            closeModal('addUserModal');
            event.target.reset();
            
            // Show temporary password to admin
            Utils.showNotification(`User created successfully!\n\nTemporary Login Details:\nUsername: ${username}\nTemporary Password: ${response.data.tempPassword}\n\nUser must change password on first login.`);
        }

    } catch (error) {
        console.error('Add user error:', error);
        Utils.showNotification(error.message || 'Failed to create user. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Add User');
    }
}

/**
 * Reset user password with API integration
 */
async function resetUserPassword(userId) {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can reset passwords.');
        return;
    }

    if (confirm(`Are you sure you want to reset password for this user?\nThis will generate a new temporary password and require them to set a new password on next login.`)) {
        try {
            const response = await AuthAPI.resetUserPassword(userId);
            
            if (response.success) {
                // Log password reset
                if (window.logUserManagementAction) {
                    logUserManagementAction(`Reset password for user ID: ${userId}`);
                }
                
                await updateUserTable();
                Utils.showNotification(`Password reset successfully!\n\nNew Temporary Password: ${response.data.tempPassword}\n\nUser must change password on next login.`);
            }

        } catch (error) {
            console.error('Reset password error:', error);
            Utils.showNotification(error.message || 'Failed to reset password. Please try again.');
        }
    }
}

/**
 * Update user table display with API data
 */
async function updateUserTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    try {
        const response = await AuthAPI.getUsers();
        const users = response.data || [];
        
        tbody.innerHTML = '';
        
        users.forEach((user, index) => {
            const roleClass = user.role === 'admin' ? 'available' : user.role === 'owner' ? 'in-progress' : 'pending';
            const statusClass = user.status === 'active' ? 'completed' : 'pending';
            const canDelete = currentUser.username !== user.username && user.role !== 'admin';
            const passwordStatus = user.firstLogin ? '<span style="color: #ff6b6b;">Temp Password</span>' : '<span style="color: #28a745;">Set</span>';
            
            tbody.innerHTML += `
                <tr>
                    <td class="serial-number">${index + 1}</td>
                    <td>${Utils.sanitizeHtml(user.username)}</td>
                    <td><span class="status ${roleClass}">${Utils.sanitizeHtml(user.role)}</span></td>
                    <td><span class="status ${statusClass}">${Utils.sanitizeHtml(user.status)}</span></td>
                    <td>${Utils.formatDate(new Date(user.createdAt))}</td>
                    <td>${user.lastLogin ? Utils.formatDate(new Date(user.lastLogin)) : 'Never'}</td>
                    <td>
                        <button class="btn btn-sm" onclick="editUser('${user.id}')">Edit</button>
                        <button class="btn btn-sm" onclick="resetUserPassword('${user.id}')" title="Reset Password">Reset PWD</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete user ${user.username}?', () => deleteUser('${user.id}'))" 
                                ${!canDelete ? 'disabled' : ''}>Delete</button>
                    </td>
                </tr>
            `;
        });
        
    } catch (error) {
        console.error('Update user table error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">Error loading users</td></tr>';
    }
}

/**
 * Edit user with API integration
 */
function editUser(userId) {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can edit users.');
        return;
    }

    // This function would need to be implemented similar to the original
    // but using API calls instead of local data
    Utils.showNotification('Edit user functionality - to be implemented');
}

/**
 * Delete user with API integration
 */
async function deleteUser(userId) {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can delete users.');
        return;
    }

    try {
        const response = await AuthAPI.deleteUser(userId);
        
        if (response.success) {
            // Log user deletion
            if (window.logUserManagementAction) {
                logUserManagementAction(`Deleted user ID: ${userId}`);
            }
            
            await updateUserTable();
            Utils.showNotification('User deleted successfully!');
        }
        
    } catch (error) {
        console.error('Delete user error:', error);
        Utils.showNotification(error.message || 'Failed to delete user. Please try again.');
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

// Make functions globally available
window.handleFirstTimePasswordSetup = handleFirstTimePasswordSetup;
window.resetUserPassword = resetUserPassword;
window.resetAllButtonStates = resetAllButtonStates;

// Export functions for global use
window.AuthModule = {
    initializeAuth,
    handleLogin,
    logout,
    hasPermission,
    setupNavigation,
    openAddUserModal,
    addNewUser,
    updateUserTable,
    editUser,
    deleteUser,
    resetUserPassword,
    getCurrentUser,
    isLoggedIn,
    isStaffUser,
    canEditDelete,
    completeLogin,
    resetAllButtonStates
};