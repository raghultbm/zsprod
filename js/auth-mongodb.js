// File: js/auth-mongodb.js
// ZEDSON WATCHCRAFT - Authentication Module with MongoDB Integration
// Developed by PULSEWARE❤️

/**
 * Authentication and User Management System with MongoDB Backend
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
 * Handle user login with MongoDB backend
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
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;
        
        // Call API
        const response = await window.apiService.login({ username, password });
        
        if (response.success) {
            completeLogin(response.user);
        } else {
            Utils.showNotification(response.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        Utils.showNotification('Login failed: ' + error.message);
    } finally {
        // Reset button state
        const loginBtn = event.target.querySelector('button[type="submit"]');
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
    }
}

/**
 * Complete login process
 */
function completeLogin(user) {
    currentUser = user;
    
    // Update user info display
    document.getElementById('currentUser').textContent = `Welcome, ${user.fullName}`;
    document.getElementById('currentUserRole').textContent = user.role.toUpperCase();
    
    // Hide login screen and show main app
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').classList.add('logged-in');
    
    // Setup navigation based on user role
    setupNavigation();
    
    // Initialize logging system
    if (window.LoggingModule) {
        LoggingModule.initializeLogging();
    }
    
    // Load initial data from MongoDB
    loadInitialData();
    
    // Clear login form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    
    Utils.showNotification(`Welcome back, ${user.fullName}!`);
}

/**
 * Load initial data from MongoDB
 */
async function loadInitialData() {
    try {
        // Load all collections from MongoDB
        await Promise.all([
            loadCustomers(),
            loadInventory(),
            loadSales(),
            loadServices(),
            loadExpenses(),
            loadInvoices()
        ]);
        
        // Update dashboard after data is loaded
        if (window.updateDashboard) {
            updateDashboard();
        }
        
        console.log('Initial data loaded from MongoDB');
    } catch (error) {
        console.error('Error loading initial data:', error);
        Utils.showNotification('Warning: Some data could not be loaded from the server.');
    }
}

/**
 * Load customers from MongoDB
 */
async function loadCustomers() {
    try {
        const response = await window.apiService.getCustomers();
        if (response.success && window.CustomerModule) {
            window.CustomerModule.customers = response.data;
            if (window.CustomerModule.renderCustomerTable) {
                window.CustomerModule.renderCustomerTable();
            }
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

/**
 * Load inventory from MongoDB
 */
async function loadInventory() {
    try {
        const response = await window.apiService.getInventory();
        if (response.success && window.InventoryModule) {
            window.InventoryModule.watches = response.data;
            if (window.InventoryModule.renderWatchTable) {
                window.InventoryModule.renderWatchTable();
            }
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

/**
 * Load sales from MongoDB
 */
async function loadSales() {
    try {
        const response = await window.apiService.getSales();
        if (response.success && window.SalesModule) {
            window.SalesModule.sales = response.data;
            if (window.SalesModule.renderSalesTable) {
                window.SalesModule.renderSalesTable();
            }
        }
    } catch (error) {
        console.error('Error loading sales:', error);
    }
}

/**
 * Load services from MongoDB
 */
async function loadServices() {
    try {
        const response = await window.apiService.getServices();
        if (response.success && window.ServiceModule) {
            window.ServiceModule.services = response.data;
            if (window.ServiceModule.renderServiceTable) {
                window.ServiceModule.renderServiceTable();
            }
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

/**
 * Load expenses from MongoDB
 */
async function loadExpenses() {
    try {
        const response = await window.apiService.getExpenses();
        if (response.success && window.ExpenseModule) {
            window.ExpenseModule.expenses = response.data;
            if (window.ExpenseModule.renderExpenseTable) {
                window.ExpenseModule.renderExpenseTable();
            }
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

/**
 * Load invoices from MongoDB
 */
async function loadInvoices() {
    try {
        const response = await window.apiService.getInvoices();
        if (response.success && window.InvoiceModule) {
            window.InvoiceModule.invoices = response.data;
            if (window.InvoiceModule.renderInvoiceTable) {
                window.InvoiceModule.renderInvoiceTable();
            }
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

/**
 * User logout
 */
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Call API logout
            await window.apiService.logout();
            
            currentUser = null;
            
            // Show login screen and hide main app
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').classList.remove('logged-in');
            
            // Clear login form
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            
            Utils.showNotification('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            currentUser = null;
            window.apiService.setToken(null);
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').classList.remove('logged-in');
        }
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

    // Hide user management button for non-admin users
    const userMgmtBtn = document.getElementById('userManagementBtn');
    if (currentUser.role === 'admin') {
        userMgmtBtn.style.display = 'inline-block';
        loadUsers(); // Load users for admin
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
}

/**
 * Load users from MongoDB (Admin only)
 */
async function loadUsers() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const response = await window.apiService.getUsers();
        if (response.success) {
            updateUserTable(response.data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
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
    
    document.getElementById('addUserModal').style.display = 'block';
}

/**
 * Add new user (Admin only) - With MongoDB integration
 */
async function addNewUser(event) {
    event.preventDefault();
    
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can add new users.');
        return;
    }

    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newUserRole').value;
    const fullName = document.getElementById('newUserFullName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();

    // Validate input
    if (!username || !password || !role || !fullName || !email) {
        Utils.showNotification('Please fill in all required fields.');
        return;
    }

    // Validate email format
    if (!Utils.validateEmail(email)) {
        Utils.showNotification('Please enter a valid email address.');
        return;
    }

    if (password.length < 6) {
        Utils.showNotification('Password must be at least 6 characters long.');
        return;
    }

    try {
        const userData = {
            username,
            password,
            role,
            fullName,
            email,
            status: 'active',
            firstLogin: false
        };

        const response = await window.apiService.createUser(userData);
        
        if (response.success) {
            await loadUsers(); // Reload users table
            closeModal('addUserModal');
            event.target.reset();
            Utils.showNotification('User created successfully!');
        } else {
            Utils.showNotification(response.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('Username or email already exists. Please choose different values.');
        } else {
            Utils.showNotification('Error creating user: ' + error.message);
        }
    }
}

/**
 * Update user table display
 */
function updateUserTable(users = null) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!users) return;
    
    users.forEach((user, index) => {
        const roleClass = user.role === 'admin' ? 'available' : user.role === 'owner' ? 'in-progress' : 'pending';
        const statusClass = user.status === 'active' ? 'completed' : 'pending';
        const canDelete = currentUser.username !== user.username && user.role !== 'admin';
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'Never';
        const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'Unknown';
        
        tbody.innerHTML += `
            <tr>
                <td class="serial-number">${index + 1}</td>
                <td>${Utils.sanitizeHtml(user.username)}</td>
                <td><span class="status ${roleClass}">${Utils.sanitizeHtml(user.role)}</span></td>
                <td><span class="status ${statusClass}">${Utils.sanitizeHtml(user.status)}</span></td>
                <td>${created}</td>
                <td>${lastLogin}</td>
                <td>
                    <button class="btn btn-sm" onclick="editUser('${user.username}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete user ${user.username}?', () => deleteUser('${user.username}'))" 
                            ${!canDelete ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `;
    });
}

/**
 * Edit user - with MongoDB integration
 */
async function editUser(username) {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can edit users.');
        return;
    }

    try {
        const response = await window.apiService.getOne('users', { username });
        const user = response.data;
        
        if (!user) {
            Utils.showNotification('User not found.');
            return;
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
    } catch (error) {
        console.error('Error fetching user for edit:', error);
        Utils.showNotification('Error loading user data: ' + error.message);
    }
}

/**
 * Update user - with MongoDB integration
 */
async function updateUser(event, username) {
    event.preventDefault();
    
    const fullName = document.getElementById('editUserFullName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;

    // Validate input
    if (!fullName || !email || !role || !status) {
        Utils.showNotification('Please fill in all fields.');
        return;
    }

    if (!Utils.validateEmail(email)) {
        Utils.showNotification('Please enter a valid email address.');
        return;
    }

    try {
        const updateData = {
            fullName,
            email,
            role,
            status
        };

        const response = await window.apiService.updateOne('users', { username }, updateData);
        
        if (response.success) {
            await loadUsers(); // Reload users table
            closeModal('editUserModal');
            document.getElementById('editUserModal').remove();
            Utils.showNotification('User updated successfully!');
        } else {
            Utils.showNotification(response.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('Email already exists. Please use a different email.');
        } else {
            Utils.showNotification('Error updating user: ' + error.message);
        }
    }
}

/**
 * Delete user (Admin only) - with MongoDB integration
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
            const response = await window.apiService.deleteOne('users', { username });
            
            if (response.success) {
                await loadUsers(); // Reload users table
                Utils.showNotification('User deleted successfully!');
            } else {
                Utils.showNotification(response.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            Utils.showNotification('Error deleting user: ' + error.message);
        }
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
 * Initialize authentication system
 */
async function initializeAuth() {
    try {
        // Test connection to backend
        await window.apiService.testConnection();
        console.log('Connected to MongoDB backend');
        
        // Check if we have a stored token
        const token = localStorage.getItem('authToken');
        if (token) {
            window.apiService.setToken(token);
            // You could validate the token here by making a test API call
        }
    } catch (error) {
        console.error('Backend connection failed:', error);
        Utils.showNotification('Warning: Could not connect to server. Some features may not work.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAuth);

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
    getCurrentUser,
    isLoggedIn,
    isStaffUser,
    canEditDelete,
    loadUsers,
    loadInitialData
};