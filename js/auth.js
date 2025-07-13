// ZEDSON WATCHCRAFT - Authentication Module with Password Encryption and First Login

/**
 * Authentication and User Management System with Encrypted Passwords
 */

// Current logged-in user
let currentUser = null;

// Simple password hashing function (in production, use a proper library like bcrypt)
function hashPassword(password) {
    // Simple hash function - in production, use proper encryption
    let hash = 0;
    if (password.length === 0) return hash.toString();
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

// User database with encrypted passwords
let users = [
    { 
        username: 'admin', 
        password: hashPassword('admin123'), // Encrypted
        role: 'admin', 
        fullName: 'System Administrator', 
        email: 'admin@zedsonwatchcraft.com', 
        status: 'active', 
        created: '2024-01-01', 
        lastLogin: 'Today',
        firstLogin: false
    }
];

// User permissions configuration - Updated to include expenses
const permissions = {
    admin: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices', 'users'],
    owner: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices'],
    staff: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices']
};

/**
 * Handle user login with first-time password setup
 */
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Validate input
    if (!username || !password) {
        Utils.showNotification('Please enter both username and password.');
        return;
    }
    
    // Find user
    const user = users.find(u => u.username === username);
    
    if (!user) {
        if (window.logAuthAction) {
            logAuthAction(`Failed login attempt - user not found`, username);
        }
        Utils.showNotification('Invalid username or password.');
        return;
    }

    if (user.status !== 'active') {
        if (window.logAuthAction) {
            logAuthAction(`Failed login attempt - account inactive`, username);
        }
        Utils.showNotification('Your account is inactive. Please contact administrator.');
        return;
    }

    // Check if this is first login (temporary password)
    if (user.firstLogin) {
        // For first login, check against temporary password
        if (user.tempPassword === password) {
            // Show first login modal
            showFirstLoginModal(user);
            return;
        } else {
            if (window.logAuthAction) {
                logAuthAction(`Failed first login attempt`, username);
            }
            Utils.showNotification('Invalid temporary password. Please contact administrator.');
            return;
        }
    }

    // Regular login - check encrypted password
    const hashedPassword = hashPassword(password);
    if (user.password === hashedPassword) {
        // Successful login
        completeLogin(user);
    } else {
        // Log failed login attempt
        if (window.logAuthAction) {
            logAuthAction(`Failed login attempt - wrong password`, username);
        }
        Utils.showNotification('Invalid username or password.');
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
 * Handle first-time password setup
 */
function handleFirstTimePasswordSetup(event) {
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
    
    // Update user password
    currentUser.password = hashPassword(newPassword);
    currentUser.firstLogin = false;
    delete currentUser.tempPassword; // Remove temporary password
    
    // Log password setup
    if (window.logAuthAction) {
        logAuthAction(`First login password setup completed`, currentUser.username);
    }
    
    // Close modal and complete login
    document.getElementById('firstLoginModal').style.display = 'none';
    document.getElementById('newPasswordSetup').value = '';
    document.getElementById('confirmPasswordSetup').value = '';
    
    completeLogin(currentUser);
    Utils.showNotification('Password set successfully! Welcome to ZEDSON WATCHCRAFT.');
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
    
    // Update last login
    user.lastLogin = 'Just now';
    
    // Update user table if admin is logged in
    if (user.role === 'admin') {
        updateUserTable();
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
 * User logout
 */
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        const username = currentUser ? currentUser.username : 'unknown';
        
        // Log logout
        if (window.logAuthAction) {
            logAuthAction(`User logged out`, username);
        }
        
        currentUser = null;
        
        // Show login screen and hide main app
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').classList.remove('logged-in');
        
        // Clear login form
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
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
 * Setup navigation based on user role with staff restrictions
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
 * Add new user (Admin only) - No password required
 */
function addNewUser(event) {
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

    // Check if username already exists
    if (users.find(u => u.username === username)) {
        Utils.showNotification('Username already exists. Please choose a different username.');
        return;
    }

    // Check if email already exists
    if (users.find(u => u.email === email)) {
        Utils.showNotification('Email already exists. Please use a different email.');
        return;
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    const newUser = {
        username: username,
        tempPassword: tempPassword, // Temporary password for first login
        password: null, // Will be set by user on first login
        role: role,
        fullName: fullName,
        email: email,
        status: 'active',
        created: Utils.formatDate(new Date()),
        lastLogin: 'Never',
        firstLogin: true
    };

    users.push(newUser);
    
    // Log user creation
    if (window.logUserManagementAction) {
        logUserManagementAction(`Created new user: ${username} with role: ${role}`, newUser);
    }
    
    updateUserTable();
    closeModal('addUserModal');
    event.target.reset();
    
    // Show temporary password to admin
    Utils.showNotification(`User created successfully!\n\nTemporary Login Details:\nUsername: ${username}\nTemporary Password: ${tempPassword}\n\nUser must change password on first login.`);
}

/**
 * Generate temporary password
 */
function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Reset user password (Admin only)
 */
function resetUserPassword(username) {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can reset passwords.');
        return;
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        Utils.showNotification('User not found.');
        return;
    }

    if (confirm(`Are you sure you want to reset password for user "${username}"?\nThis will generate a new temporary password and require them to set a new password on next login.`)) {
        const tempPassword = generateTempPassword();
        
        user.tempPassword = tempPassword;
        user.password = null;
        user.firstLogin = true;
        
        // Log password reset
        if (window.logUserManagementAction) {
            logUserManagementAction(`Reset password for user: ${username}`, user, username);
        }
        
        updateUserTable();
        Utils.showNotification(`Password reset successfully!\n\nNew Temporary Login Details:\nUsername: ${username}\nTemporary Password: ${tempPassword}\n\nUser must change password on next login.`);
    }
}

/**
 * Update user table display with reset password button
 */
function updateUserTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
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
                <td>${Utils.sanitizeHtml(user.created)}</td>
                <td>${Utils.sanitizeHtml(user.lastLogin)}</td>
                <td>
                    <button class="btn btn-sm" onclick="editUser('${user.username}')">Edit</button>
                    <button class="btn btn-sm" onclick="resetUserPassword('${user.username}')" title="Reset Password">Reset PWD</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete user ${user.username}?', () => deleteUser('${user.username}'))" 
                            ${!canDelete ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `;
    });
}

/**
 * Edit user
 */
function editUser(username) {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can edit users.');
        return;
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        Utils.showNotification('User not found.');
        return;
    }

    if (window.logAction) {
        logAction(`Opened edit modal for user: ${username}`);
    }

    // Create edit modal
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editUserModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editUserModal')">&times;</span>
            <h2>Edit User: ${user.username}</h2>
            <form onsubmit="AuthModule.updateUser(event, '${username}')">
                <div class="form-group">
                    <label>Full Name:</label>
                    <input type="text" id="editUserFullName" value="${user.fullName}" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="editUserEmail" value="${user.email}" required>
                </div>
                <div class="form-group">
                    <label>Role:</label>
                    <select id="editUserRole" required>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Owner</option>
                        <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select id="editUserStatus" required>
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <button type="submit" class="btn">Update User</button>
                <button type="button" class="btn btn-danger" onclick="closeModal('editUserModal')">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
}

/**
 * Update user
 */
function updateUser(event, username) {
    event.preventDefault();
    
    const user = users.find(u => u.username === username);
    if (!user) {
        Utils.showNotification('User not found.');
        return;
    }

    const fullName = document.getElementById('editUserFullName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;

    // Validate input
    if (!fullName || !email || !role || !status) {
        Utils.showNotification('Please fill in all fields.');
        return;
    }

    // Check if email already exists (excluding current user)
    if (users.find(u => u.email === email && u.username !== username)) {
        Utils.showNotification('Email already exists. Please use a different email.');
        return;
    }

    // Log user update
    if (window.logUserManagementAction) {
        logUserManagementAction(`Updated user: ${username}. Role: ${user.role} -> ${role}, Status: ${user.status} -> ${status}`, {
            username: username,
            oldRole: user.role,
            newRole: role,
            oldStatus: user.status,
            newStatus: status
        }, username);
    }

    // Update user
    user.fullName = fullName;
    user.email = email;
    user.role = role;
    user.status = status;

    updateUserTable();
    closeModal('editUserModal');
    document.getElementById('editUserModal').remove();
    Utils.showNotification('User updated successfully!');
}

/**
 * Delete user (Admin only)
 */
function deleteUser(username) {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can delete users.');
        return;
    }

    if (username === 'admin') {
        Utils.showNotification('Cannot delete the main admin account.');
        return;
    }

    if (username === currentUser.username) {
        Utils.showNotification('Cannot delete your own account.');
        return;
    }

    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
        const userToDelete = users.find(u => u.username === username);
        
        // Log user deletion
        if (window.logUserManagementAction) {
            logUserManagementAction(`Deleted user: ${username}`, userToDelete, username);
        }
        
        users = users.filter(u => u.username !== username);
        updateUserTable();
        Utils.showNotification('User deleted successfully!');
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

// Export functions for global use
window.AuthModule = {
    handleLogin,
    logout,
    hasPermission,
    setupNavigation,
    openAddUserModal,
    addNewUser,
    updateUserTable,
    editUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    getCurrentUser,
    isLoggedIn,
    isStaffUser,
    canEditDelete
};