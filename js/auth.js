// ZEDSON WATCHCRAFT - Authentication Module with Pure MongoDB Integration
// Developed by PULSEWARE❤️

/**
 * Authentication and User Management System - PURE MONGODB BACKEND
 * NO LOCAL REFERENCE DATA - EVERYTHING FROM MONGODB API
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
        loginBtn.textContent = 'Connecting to MongoDB...';
        loginBtn.disabled = true;
        
        // Call MongoDB API
        const response = await window.apiService.login({ username, password });
        
        if (response.success) {
            completeLogin(response.user);
        } else {
            Utils.showNotification(response.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        Utils.showNotification('Login failed: ' + error.message);
        
        // Update database status
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('disconnected', '✗ MongoDB Connection Failed');
        }
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
    
    // Update database status
    if (window.AppCoreModule?.updateDatabaseStatus) {
        window.AppCoreModule.updateDatabaseStatus('connected', '✓ MongoDB Connected');
    }
    
    // Setup navigation based on user role
    setupNavigation();
    
    // Initialize logging system
    if (window.LoggingModule) {
        LoggingModule.initializeLogging();
    }
    
    // Load initial data from MongoDB - NO LOCAL FALLBACK
    loadInitialData();
    
    // Clear login form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    
    Utils.showNotification(`Welcome back, ${user.fullName}!`);
}

/**
 * Load initial data from MongoDB - PURE MONGODB APPROACH
 */
async function loadInitialData() {
    try {
        if (window.AppCoreModule?.showLoadingIndicator) {
            window.AppCoreModule.showLoadingIndicator(true);
        }
        
        console.log('📥 Loading all data from MongoDB...');
        
        // Load all collections from MongoDB in parallel
        const loadPromises = [];
        
        // Load customers
        if (window.CustomerModule?.loadCustomers) {
            loadPromises.push(
                window.CustomerModule.loadCustomers()
                    .then(() => console.log('✅ Customers loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load customers:', error))
            );
        }
        
        // Load inventory
        if (window.InventoryModule?.loadInventory) {
            loadPromises.push(
                window.InventoryModule.loadInventory()
                    .then(() => console.log('✅ Inventory loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load inventory:', error))
            );
        }
        
        // Load sales
        if (window.SalesModule?.loadSales || window.SalesCoreModule?.loadSales) {
            const salesLoader = window.SalesModule?.loadSales || window.SalesCoreModule?.loadSales;
            const salesContext = window.SalesModule || window.SalesCoreModule;
            loadPromises.push(
                salesLoader.call(salesContext)
                    .then(() => console.log('✅ Sales loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load sales:', error))
            );
        }
        
        // Load services
        if (window.ServiceModule?.loadServices) {
            loadPromises.push(
                window.ServiceModule.loadServices()
                    .then(() => console.log('✅ Services loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load services:', error))
            );
        } else if (window.ServiceModule) {
            // Create loadServices if it doesn't exist
            window.ServiceModule.loadServices = async function() {
                const response = await window.apiService.getServices();
                if (response.success) {
                    this.services = response.data || [];
                    return this.services;
                }
                throw new Error('Failed to load services');
            };
            loadPromises.push(
                window.ServiceModule.loadServices()
                    .then(() => console.log('✅ Services loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load services:', error))
            );
        }
        
        // Load expenses
        if (window.ExpenseModule?.loadExpenses) {
            loadPromises.push(
                window.ExpenseModule.loadExpenses()
                    .then(() => console.log('✅ Expenses loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load expenses:', error))
            );
        } else if (window.ExpenseModule) {
            // Create loadExpenses if it doesn't exist
            window.ExpenseModule.loadExpenses = async function() {
                const response = await window.apiService.getExpenses();
                if (response.success) {
                    this.expenses = response.data || [];
                    return this.expenses;
                }
                throw new Error('Failed to load expenses');
            };
            loadPromises.push(
                window.ExpenseModule.loadExpenses()
                    .then(() => console.log('✅ Expenses loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load expenses:', error))
            );
        }
        
        // Load invoices
        if (window.InvoiceModule?.loadInvoices) {
            loadPromises.push(
                window.InvoiceModule.loadInvoices()
                    .then(() => console.log('✅ Invoices loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load invoices:', error))
            );
        } else if (window.InvoiceModule) {
            // Create loadInvoices if it doesn't exist
            window.InvoiceModule.loadInvoices = async function() {
                const response = await window.apiService.getInvoices();
                if (response.success) {
                    this.invoices = response.data || [];
                    return this.invoices;
                }
                throw new Error('Failed to load invoices');
            };
            loadPromises.push(
                window.InvoiceModule.loadInvoices()
                    .then(() => console.log('✅ Invoices loaded from MongoDB'))
                    .catch(error => console.error('❌ Failed to load invoices:', error))
            );
        }
        
        // Wait for all data to load
        await Promise.allSettled(loadPromises);
        
        // Update dashboard after data is loaded - FROM MONGODB
        if (window.updateDashboard) {
            await window.updateDashboard();
        }
        
        console.log('✅ All initial data loaded from MongoDB successfully');
        
        // Validate no reference data is being used
        if (window.dataManager?.validateNoReferenceData) {
            window.dataManager.validateNoReferenceData();
        }
        
    } catch (error) {
        console.error('❌ Error loading initial data from MongoDB:', error);
        Utils.showNotification('Warning: Some data could not be loaded from MongoDB server.');
        
        // Update database status
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('disconnected', '✗ Data Load Failed');
        }
    } finally {
        if (window.AppCoreModule?.showLoadingIndicator) {
            window.AppCoreModule.showLoadingIndicator(false);
        }
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
            
            // Update database status
            if (window.AppCoreModule?.updateDatabaseStatus) {
                window.AppCoreModule.updateDatabaseStatus('disconnected', 'Logged Out');
            }
            
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
        loadUsers(); // Load users for admin FROM MONGODB
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
 * Load users from MongoDB (Admin only) - PURE MONGODB
 */
async function loadUsers() {
    if (currentUser.role !== 'admin') return;
    
    try {
        console.log('📥 Loading users from MongoDB...');
        const response = await window.apiService.getUsers();
        if (response.success) {
            updateUserTable(response.data);
            console.log(`✅ Loaded ${response.data.length} users from MongoDB`);
        } else {
            throw new Error('Failed to load users from MongoDB');
        }
    } catch (error) {
        console.error('❌ Error loading users from MongoDB:', error);
        Utils.showNotification('Error loading users from MongoDB server');
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
 * Add new user (Admin only) - WITH MONGODB INTEGRATION
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
            firstLogin: false,
            createdBy: currentUser.username
        };

        console.log('📤 Creating user in MongoDB...');
        const response = await window.apiService.createUser(userData);
        
        if (response.success) {
            // Reload users from MongoDB
            await loadUsers();
            closeModal('addUserModal');
            event.target.reset();
            Utils.showNotification('User created successfully in MongoDB!');
            console.log('✅ User created in MongoDB:', response.data);
        } else {
            Utils.showNotification(response.error || 'Failed to create user in MongoDB');
        }
    } catch (error) {
        console.error('❌ Error creating user in MongoDB:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('Username or email already exists in MongoDB. Please choose different values.');
        } else {
            Utils.showNotification('Error creating user in MongoDB: ' + error.message);
        }
    }
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
        console.log('📥 Fetching user from MongoDB for edit...');
        const response = await window.apiService.getOne('users', { username });
        const user = response.data;
        
        if (!user) {
            Utils.showNotification('User not found in MongoDB.');
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
                    <button type="submit" class="btn">Update User in MongoDB</button>
                    <button type="button" class="btn btn-danger" onclick="closeModal('editUserModal')">Cancel</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(editModal);
    } catch (error) {
        console.error('❌ Error fetching user from MongoDB for edit:', error);
        Utils.showNotification('Error loading user data from MongoDB: ' + error.message);
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

        console.log('📤 Updating user in MongoDB...');
        const response = await window.apiService.updateOne('users', { username }, updateData);
        
        if (response.success) {
            // Reload users from MongoDB
            await loadUsers();
            closeModal('editUserModal');
            document.getElementById('editUserModal').remove();
            Utils.showNotification('User updated successfully in MongoDB!');
            console.log('✅ User updated in MongoDB');
        } else {
            Utils.showNotification(response.error || 'Failed to update user in MongoDB');
        }
    } catch (error) {
        console.error('❌ Error updating user in MongoDB:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('Email already exists in MongoDB. Please use a different email.');
        } else {
            Utils.showNotification('Error updating user in MongoDB: ' + error.message);
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

    if (confirm(`Are you sure you want to delete user "${username}" from MongoDB?`)) {
        try {
            console.log('📤 Deleting user from MongoDB...');
            const response = await window.apiService.deleteOne('users', { username });
            
            if (response.success) {
                // Reload users from MongoDB
                await loadUsers();
                Utils.showNotification('User deleted successfully from MongoDB!');
                console.log('✅ User deleted from MongoDB');
            } else {
                Utils.showNotification(response.error || 'Failed to delete user from MongoDB');
            }
        } catch (error) {
            console.error('❌ Error deleting user from MongoDB:', error);
            Utils.showNotification('Error deleting user from MongoDB: ' + error.message);
        }
    }
}

/**
 * Update user table display
 */
function updateUserTable(users = []) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No users found in MongoDB</td></tr>';
        return;
    }
    
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
                    <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete user ${user.username} from MongoDB?', () => deleteUser('${user.username}'))" 
                            ${!canDelete ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `;
    });
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
 * Initialize authentication system with MongoDB
 */
async function initializeAuth() {
    try {
        console.log('🔄 Initializing Authentication with MongoDB...');
        
        // Test connection to backend
        await window.apiService.testConnection();
        console.log('✅ Connected to MongoDB backend successfully');
        
        // Check if we have a stored token
        const token = localStorage.getItem('authToken');
        if (token) {
            window.apiService.setToken(token);
        }
        
        // Update database status
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('connected', '✓ MongoDB Ready');
        }
        
    } catch (error) {
        console.error('❌ MongoDB backend connection failed:', error);
        Utils.showNotification('Warning: Could not connect to MongoDB server. Please check your connection.');
        
        // Update database status
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('disconnected', '✗ MongoDB Connection Failed');
        }
    }
}

/**
 * Close modal helper
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
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
    loadInitialData,
    closeModal
};