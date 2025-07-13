// ZEDSON WATCHCRAFT - Authentication Module with MongoDB Integration

/**
 * Authentication and User Management System with MongoDB Real-time Sync
 */

// Current logged-in user
let currentUser = null;

// User database - now synced with MongoDB
let users = [];

// User permissions configuration - Updated to include expenses
const permissions = {
    admin: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices', 'users'],
    owner: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices'],
    staff: ['dashboard', 'inventory', 'customers', 'sales', 'service', 'expenses', 'invoices']
};

/**
 * Load users from MongoDB
 */
async function loadUsers() {
    try {
        const response = await window.mongoService.getUsers();
        users = response.map(user => ({
            ...user,
            id: user._id,
            created: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'Unknown',
            lastLogin: user.lastLogin || 'Never'
        }));
        
        if (currentUser && currentUser.role === 'admin') {
            updateUserTable();
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        // Keep existing users array as fallback
    }
}

/**
 * Handle user login with MongoDB integration
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
    
    try {
        // Show loading state
        const loginBtn = event.target.querySelector('button[type="submit"]');
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'AUTHENTICATING...';
        loginBtn.disabled = true;
        
        const response = await window.mongoService.login(username, password);
        
        if (response.success) {
            if (response.firstLogin) {
                // Show first login modal
                showFirstLoginModal(response.user);
            } else {
                // Complete login
                completeLogin(response.user);
            }
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        if (window.logAuthAction) {
            logAuthAction(`Failed login attempt: ${error.message}`, username);
        }
        
        Utils.showNotification(error.message || 'Login failed. Please try again.');
        
        // Reset button
        const loginBtn = event.target.querySelector('button[type="submit"]');
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
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
 * Handle first-time password setup with MongoDB
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
    
    try {
        // Update password in MongoDB
        await window.mongoService.setPassword(currentUser.username, newPassword);
        
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
        
    } catch (error) {
        console.error('Password setup error:', error);
        Utils.showNotification('Failed to set password. Please try again.');
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
    
    // Load data from MongoDB
    loadAllData();
    
    // Update user table if admin is logged in
    if (user.role === 'admin') {
        loadUsers();
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
 * Load all data from MongoDB
 */
async function loadAllData() {
    try {
        // Load all modules' data concurrently
        const loadPromises = [];
        
        if (window.CustomerModule) {
            loadPromises.push(loadCustomersData());
        }
        
        if (window.InventoryModule) {
            loadPromises.push(loadInventoryData());
        }
        
        if (window.SalesModule) {
            loadPromises.push(loadSalesData());
        }
        
        if (window.ServiceModule) {
            loadPromises.push(loadServicesData());
        }
        
        if (window.ExpenseModule) {
            loadPromises.push(loadExpensesData());
        }
        
        if (window.InvoiceModule) {
            loadPromises.push(loadInvoicesData());
        }
        
        await Promise.all(loadPromises);
        
        // Update dashboard after all data is loaded
        if (window.updateDashboard) {
            updateDashboard();
        }
        
        console.log('All data loaded from MongoDB');
        
    } catch (error) {
        console.error('Error loading data:', error);
        Utils.showNotification('Some data may not be current. Please refresh if needed.');
    }
}

/**
 * Load customers data from MongoDB
 */
async function loadCustomersData() {
    try {
        const customersData = await window.mongoService.getCustomers();
        if (window.CustomerModule && CustomerModule.customers) {
            // Convert MongoDB data to application format
            CustomerModule.customers.length = 0; // Clear existing
            customersData.forEach(customer => {
                CustomerModule.customers.push({
                    ...customer,
                    id: customer._id.toString(), // Ensure ID is string for compatibility
                    addedDate: customer.createdAt ? new Date(customer.createdAt).toISOString().split('T')[0] : Utils.formatDate(new Date())
                });
            });
            
            // Update next ID counter
            const maxId = CustomerModule.customers.length > 0 ? 
                Math.max(...CustomerModule.customers.map(c => parseInt(c.id.replace(/[^0-9]/g, '')) || 0)) : 0;
            if (window.nextCustomerId !== undefined) {
                window.nextCustomerId = maxId + 1;
            }
            
            CustomerModule.renderCustomerTable();
            console.log(`Loaded ${CustomerModule.customers.length} customers from MongoDB`);
        }
    } catch (error) {
        console.error('Failed to load customers:', error);
    }
}

/**
 * Load inventory data from MongoDB
 */
async function loadInventoryData() {
    try {
        const inventoryData = await window.mongoService.getInventory();
        if (window.InventoryModule && InventoryModule.watches) {
            // Convert MongoDB data to application format
            InventoryModule.watches.length = 0; // Clear existing
            inventoryData.forEach(item => {
                InventoryModule.watches.push({
                    ...item,
                    id: item._id.toString(), // Ensure ID is string for compatibility
                    addedDate: item.createdAt ? Utils.getCurrentTimestamp() : Utils.getCurrentTimestamp(),
                    addedBy: item.createdBy || 'system'
                });
            });
            
            // Update next ID counter
            const maxId = InventoryModule.watches.length > 0 ? 
                Math.max(...InventoryModule.watches.map(w => parseInt(w.id.replace(/[^0-9]/g, '')) || 0)) : 0;
            if (window.nextWatchId !== undefined) {
                window.nextWatchId = maxId + 1;
            }
            
            InventoryModule.renderWatchTable();
            console.log(`Loaded ${InventoryModule.watches.length} inventory items from MongoDB`);
        }
    } catch (error) {
        console.error('Failed to load inventory:', error);
    }
}

/**
 * Load sales data from MongoDB
 */
async function loadSalesData() {
    try {
        const salesData = await window.mongoService.getSales();
        if (window.SalesModule && SalesModule.sales) {
            // Convert MongoDB data to application format
            SalesModule.sales.length = 0; // Clear existing
            salesData.forEach(sale => {
                SalesModule.sales.push({
                    ...sale,
                    id: sale._id,
                    timestamp: sale.createdAt ? sale.createdAt : Utils.getCurrentTimestamp()
                });
            });
            
            // Update next ID
            if (salesData.length > 0) {
                window.nextSaleId = Math.max(...salesData.map(s => parseInt(s.id) || 0)) + 1;
            }
            
            SalesModule.renderSalesTable();
        }
    } catch (error) {
        console.error('Failed to load sales:', error);
    }
}

/**
 * Load services data from MongoDB
 */
async function loadServicesData() {
    try {
        const servicesData = await window.mongoService.getServices();
        if (window.ServiceModule && ServiceModule.services) {
            // Convert MongoDB data to application format
            ServiceModule.services.length = 0; // Clear existing
            servicesData.forEach(service => {
                ServiceModule.services.push({
                    ...service,
                    id: service._id,
                    timestamp: service.createdAt ? service.createdAt : Utils.getCurrentTimestamp()
                });
            });
            
            // Update next ID
            if (servicesData.length > 0) {
                window.nextServiceId = Math.max(...servicesData.map(s => parseInt(s.id) || 0)) + 1;
            }
            
            ServiceModule.renderServiceTable();
        }
    } catch (error) {
        console.error('Failed to load services:', error);
    }
}

/**
 * Load expenses data from MongoDB
 */
async function loadExpensesData() {
    try {
        const expensesData = await window.mongoService.getExpenses();
        if (window.ExpenseModule && ExpenseModule.expenses) {
            // Convert MongoDB data to application format
            ExpenseModule.expenses.length = 0; // Clear existing
            expensesData.forEach(expense => {
                ExpenseModule.expenses.push({
                    ...expense,
                    id: expense._id,
                    timestamp: expense.createdAt ? expense.createdAt : Utils.getCurrentTimestamp(),
                    formattedDate: expense.formattedDate || Utils.formatDate(new Date(expense.date))
                });
            });
            
            // Update next ID
            if (expensesData.length > 0) {
                window.nextExpenseId = Math.max(...expensesData.map(e => parseInt(e.id) || 0)) + 1;
            }
            
            ExpenseModule.renderExpenseTable();
        }
    } catch (error) {
        console.error('Failed to load expenses:', error);
    }
}

/**
 * Load invoices data from MongoDB
 */
async function loadInvoicesData() {
    try {
        const invoicesData = await window.mongoService.getInvoices();
        if (window.InvoiceModule && InvoiceModule.invoices) {
            // Convert MongoDB data to application format
            InvoiceModule.invoices.length = 0; // Clear existing
            invoicesData.forEach(invoice => {
                InvoiceModule.invoices.push({
                    ...invoice,
                    id: invoice._id,
                    timestamp: invoice.createdAt ? invoice.createdAt : Utils.getCurrentTimestamp()
                });
            });
            
            // Update next ID
            if (invoicesData.length > 0) {
                window.nextInvoiceId = Math.max(...invoicesData.map(i => parseInt(i.id) || 0)) + 1;
            }
            
            InvoiceModule.renderInvoiceTable();
        }
    } catch (error) {
        console.error('Failed to load invoices:', error);
    }
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
        
        // Reset all data arrays
        resetAllData();
    }
}

/**
 * Reset all data arrays to prevent data leakage between users
 */
function resetAllData() {
    if (window.CustomerModule && CustomerModule.customers) {
        CustomerModule.customers.length = 0;
    }
    if (window.InventoryModule && InventoryModule.watches) {
        InventoryModule.watches.length = 0;
    }
    if (window.SalesModule && SalesModule.sales) {
        SalesModule.sales.length = 0;
    }
    if (window.ServiceModule && ServiceModule.services) {
        ServiceModule.services.length = 0;
    }
    if (window.ExpenseModule && ExpenseModule.expenses) {
        ExpenseModule.expenses.length = 0;
    }
    if (window.InvoiceModule && InvoiceModule.invoices) {
        InvoiceModule.invoices.length = 0;
    }
    users.length = 0;
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
 * Add new user (Admin only) with MongoDB integration
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

    try {
        const newUser = {
            username: username,
            role: role,
            fullName: fullName,
            email: email,
            status: 'active',
            created: Utils.formatDate(new Date()),
            lastLogin: 'Never',
            firstLogin: true
        };

        const response = await window.mongoService.createUser(newUser);
        
        if (response.success) {
            // Log user creation
            if (window.logUserManagementAction) {
                logUserManagementAction(`Created new user: ${username} with role: ${role}`, newUser);
            }
            
            // Reload users and update table
            await loadUsers();
            closeModal('addUserModal');
            event.target.reset();
            
            // Show temporary password to admin
            Utils.showNotification(`User created successfully!\n\nTemporary Login Details:\nUsername: ${username}\nTemporary Password: ${response.tempPassword}\n\nUser must change password on first login.`);
        }
        
    } catch (error) {
        console.error('Create user error:', error);
        Utils.showNotification(error.message || 'Failed to create user.');
    }
}

/**
 * Reset user password (Admin only) with MongoDB integration
 */
async function resetUserPassword(username) {
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
        try {
            // Generate temporary password and update in MongoDB
            const tempPassword = generateTempPassword();
            
            await window.mongoService.updateUser(username, {
                tempPassword: tempPassword,
                firstLogin: true
            });
            
            // Log password reset
            if (window.logUserManagementAction) {
                logUserManagementAction(`Reset password for user: ${username}`, user, username);
            }
            
            // Reload users and update table
            await loadUsers();
            Utils.showNotification(`Password reset successfully!\n\nNew Temporary Login Details:\nUsername: ${username}\nTemporary Password: ${tempPassword}\n\nUser must change password on next login.`);
            
        } catch (error) {
            console.error('Reset password error:', error);
            Utils.showNotification('Failed to reset password.');
        }
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
 * Edit user with MongoDB integration
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
 * Update user with MongoDB integration
 */
async function updateUser(event, username) {
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

    try {
        const updateData = {
            fullName: fullName,
            email: email,
            role: role,
            status: status
        };

        await window.mongoService.updateUser(username, updateData);

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

        // Reload users and update table
        await loadUsers();
        closeModal('editUserModal');
        document.getElementById('editUserModal').remove();
        Utils.showNotification('User updated successfully!');
        
    } catch (error) {
        console.error('Update user error:', error);
        Utils.showNotification('Failed to update user.');
    }
}

/**
 * Delete user (Admin only) with MongoDB integration
 */
async function deleteUser(username) {
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
        try {
            const userToDelete = users.find(u => u.username === username);
            
            await window.mongoService.deleteUser(username);
            
            // Log user deletion
            if (window.logUserManagementAction) {
                logUserManagementAction(`Deleted user: ${username}`, userToDelete, username);
            }
            
            // Reload users and update table
            await loadUsers();
            Utils.showNotification('User deleted successfully!');
            
        } catch (error) {
            console.error('Delete user error:', error);
            Utils.showNotification('Failed to delete user.');
        }
    }
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
    canEditDelete,
    loadUsers,
    loadAllData
};