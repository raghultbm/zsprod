// 🔧 FINAL FIXED AUTH - NO LOGIN LOOP + NO POPUP
console.log('🔧 FINAL FIXED AUTH LOADED - Login works instantly!');

// ZEDSON WATCHCRAFT - FINAL Fixed Authentication Module
// Developed by PULSEWARE❤️

/**
 * Authentication and User Management System - FINAL FIX
 * Removes login loop and annoying popups
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
 * Handle user login - FINAL FIXED VERSION
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('🔐 Login attempt for user:', username);
    
    // Validate input
    if (!username || !password) {
        Utils.showNotification('Please enter both username and password.');
        return;
    }
    
    // Show loading state
    const loginBtn = event.target.querySelector('button[type="submit"]');
    if (loginBtn) {
        loginBtn.textContent = 'Authenticating...';
        loginBtn.disabled = true;
    }
    
    try {
        console.log('🚀 Authenticating user...');
        
        // Update database status
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('connecting', 'Authenticating...');
        }
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Check demo credentials immediately
        const success = authenticateUser(username, password);
        if (success) {
            console.log('✅ Authentication successful for:', username);
            completeLogin(success);
            return;
        }
        
        console.log('❌ Invalid credentials for:', username);
        Utils.showNotification('Invalid username or password');
        
    } catch (error) {
        console.error('❌ Login error:', error);
        Utils.showNotification('Login failed: ' + error.message);
    } finally {
        // Reset button state
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.disabled = false;
        }
    }
}

/**
 * Authenticate user with demo credentials - INSTANT CHECK
 */
function authenticateUser(username, password) {
    console.log('🎯 Checking credentials for:', username);
    
    // Demo credentials for offline mode
    const demoUsers = {
        'admin': { password: 'admin123', role: 'admin', fullName: 'System Administrator', email: 'admin@zedsonwatchcraft.com' },
        'owner': { password: 'owner123', role: 'owner', fullName: 'Shop Owner', email: 'owner@zedsonwatchcraft.com' },
        'staff': { password: 'staff123', role: 'staff', fullName: 'Staff Member', email: 'staff@zedsonwatchcraft.com' }
    };
    
    const user = demoUsers[username];
    if (user && user.password === password) {
        console.log('✅ Valid credentials for:', username);
        return {
            username,
            role: user.role,
            fullName: user.fullName,
            email: user.email
        };
    }
    
    console.log('❌ Invalid credentials for:', username);
    return null;
}

/**
 * Complete login process - FIXED
 */
function completeLogin(user) {
    console.log('🎉 Completing login for:', user.fullName);
    
    // Set current user
    currentUser = user;
    
    // Update user info display
    const currentUserElement = document.getElementById('currentUser');
    const currentUserRoleElement = document.getElementById('currentUserRole');
    
    if (currentUserElement) {
        currentUserElement.textContent = `Welcome, ${user.fullName}`;
    }
    if (currentUserRoleElement) {
        currentUserRoleElement.textContent = user.role.toUpperCase();
    }
    
    // Hide login screen and show main app
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }
    if (mainApp) {
        mainApp.classList.add('logged-in');
    }
    
    // Update database status
    if (window.AppCoreModule?.updateDatabaseStatus) {
        window.AppCoreModule.updateDatabaseStatus('connected', '✓ System Ready');
    }
    
    // Setup navigation based on user role
    setupNavigation();
    
    // Initialize logging system
    if (window.LoggingModule) {
        try {
            LoggingModule.initializeLogging();
        } catch (error) {
            console.log('Logging module not available');
        }
    }
    
    // Load initial data
    loadInitialData();
    
    // Clear login form
    const usernameField = document.getElementById('loginUsername');
    const passwordField = document.getElementById('loginPassword');
    if (usernameField) usernameField.value = '';
    if (passwordField) passwordField.value = '';
    
    // NO POPUP - Just console log
    console.log(`✅ Welcome back, ${user.fullName}!`);
}

/**
 * Load initial data - SIMPLE VERSION
 */
async function loadInitialData() {
    try {
        if (window.AppCoreModule?.showLoadingIndicator) {
            window.AppCoreModule.showLoadingIndicator(true);
        }
        
        console.log('📥 Loading application data...');
        
        // Load from localStorage
        await loadDataFromLocalStorage();
        
        // Update dashboard
        if (window.updateDashboard) {
            setTimeout(() => {
                window.updateDashboard();
            }, 500);
        } else if (window.AppCoreModule?.updateDashboard) {
            setTimeout(() => {
                window.AppCoreModule.updateDashboard();
            }, 500);
        }
        
        console.log('✅ Application data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
        // Initialize with sample data as fallback
        initializeSampleData();
    } finally {
        if (window.AppCoreModule?.showLoadingIndicator) {
            window.AppCoreModule.showLoadingIndicator(false);
        }
    }
}

/**
 * Load data from localStorage
 */
async function loadDataFromLocalStorage() {
    console.log('📁 Loading data from localStorage...');
    
    try {
        // Load each module's data from localStorage
        const modules = ['customers', 'inventory', 'sales', 'services', 'expenses', 'invoices'];
        let hasAnyData = false;
        
        modules.forEach(moduleName => {
            const stored = localStorage.getItem(`zedson_${moduleName}`);
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    setModuleData(moduleName, data);
                    console.log(`✅ Loaded ${data.length} ${moduleName} from localStorage`);
                    hasAnyData = true;
                } catch (error) {
                    console.error(`Error parsing ${moduleName} data:`, error);
                }
            }
        });
        
        // If no data in localStorage, initialize with sample data
        if (!hasAnyData) {
            console.log('📦 No localStorage data found, initializing sample data...');
            initializeSampleData();
        }
        
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        initializeSampleData();
    }
}

/**
 * Set data for specific module
 */
function setModuleData(moduleName, data) {
    try {
        switch (moduleName) {
            case 'customers':
                if (window.CustomerModule) {
                    window.CustomerModule.customers = data;
                    setTimeout(() => {
                        if (window.CustomerModule.renderCustomerTable) {
                            window.CustomerModule.renderCustomerTable();
                        }
                    }, 100);
                }
                break;
            case 'inventory':
                if (window.InventoryModule) {
                    window.InventoryModule.watches = data;
                    setTimeout(() => {
                        if (window.InventoryModule.renderWatchTable) {
                            window.InventoryModule.renderWatchTable();
                        }
                    }, 100);
                }
                break;
            case 'sales':
                if (window.SalesModule) {
                    window.SalesModule.sales = data;
                    setTimeout(() => {
                        if (window.SalesModule.renderSalesTable) {
                            window.SalesModule.renderSalesTable();
                        }
                    }, 100);
                } else if (window.SalesCoreModule) {
                    window.SalesCoreModule.sales = data;
                    setTimeout(() => {
                        if (window.SalesCoreModule.renderSalesTable) {
                            window.SalesCoreModule.renderSalesTable();
                        }
                    }, 100);
                }
                break;
            case 'services':
                if (window.ServiceModule) {
                    window.ServiceModule.services = data;
                    setTimeout(() => {
                        if (window.ServiceModule.renderServiceTable) {
                            window.ServiceModule.renderServiceTable();
                        }
                    }, 100);
                }
                break;
            case 'expenses':
                if (window.ExpenseModule) {
                    window.ExpenseModule.expenses = data;
                    setTimeout(() => {
                        if (window.ExpenseModule.renderExpenseTable) {
                            window.ExpenseModule.renderExpenseTable();
                        }
                    }, 100);
                }
                break;
            case 'invoices':
                if (window.InvoiceModule) {
                    window.InvoiceModule.invoices = data;
                    setTimeout(() => {
                        if (window.InvoiceModule.renderInvoiceTable) {
                            window.InvoiceModule.renderInvoiceTable();
                        }
                    }, 100);
                }
                break;
        }
    } catch (error) {
        console.error(`Error setting module data for ${moduleName}:`, error);
    }
}

/**
 * Initialize with sample data
 */
function initializeSampleData() {
    console.log('🌱 Initializing with sample data...');
    
    // Sample customers
    const sampleCustomers = [
        {
            id: 1,
            name: "Raj Kumar",
            email: "raj@email.com",
            phone: "+91-9876543210",
            address: "Chennai, Tamil Nadu",
            purchases: 0,
            serviceCount: 0,
            netValue: 0,
            addedBy: "admin"
        },
        {
            id: 2,
            name: "Priya Sharma",
            email: "priya@email.com",
            phone: "+91-9876543211",
            address: "Mumbai, Maharashtra",
            purchases: 0,
            serviceCount: 0,
            netValue: 0,
            addedBy: "admin"
        },
        {
            id: 3,
            name: "Amit Patel",
            email: "amit@email.com",
            phone: "+91-9876543212",
            address: "Ahmedabad, Gujarat",
            purchases: 0,
            serviceCount: 0,
            netValue: 0,
            addedBy: "admin"
        }
    ];
    
    // Sample inventory
    const sampleInventory = [
        {
            id: 1,
            code: "ROL001",
            type: "Watch",
            brand: "Rolex",
            model: "Submariner",
            size: "40mm",
            price: 850000,
            quantity: 2,
            outlet: "Semmancheri",
            description: "Luxury diving watch",
            status: "available",
            addedBy: "admin"
        },
        {
            id: 2,
            code: "OMG001",
            type: "Watch",
            brand: "Omega",
            model: "Speedmaster",
            size: "42mm",
            price: 450000,
            quantity: 1,
            outlet: "Navalur",
            description: "Professional chronograph",
            status: "available",
            addedBy: "admin"
        },
        {
            id: 3,
            code: "CAS001",
            type: "Watch",
            brand: "Casio",
            model: "G-Shock",
            size: "44mm",
            price: 15000,
            quantity: 5,
            outlet: "Padur",
            description: "Sports watch",
            status: "available",
            addedBy: "admin"
        }
    ];
    
    // Initialize all with sample data
    const sampleData = {
        customers: sampleCustomers,
        inventory: sampleInventory,
        sales: [],
        services: [],
        expenses: [],
        invoices: []
    };
    
    // Set and save data
    Object.keys(sampleData).forEach(moduleName => {
        setModuleData(moduleName, sampleData[moduleName]);
        localStorage.setItem(`zedson_${moduleName}`, JSON.stringify(sampleData[moduleName]));
    });
    
    console.log('✅ Sample data initialized and saved to localStorage');
}

/**
 * User logout
 */
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 Logging out...');
        
        currentUser = null;
        
        // Show login screen and hide main app
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainApp) mainApp.classList.remove('logged-in');
        
        // Clear login form
        const usernameField = document.getElementById('loginUsername');
        const passwordField = document.getElementById('loginPassword');
        if (usernameField) usernameField.value = '';
        if (passwordField) passwordField.value = '';
        
        // Update database status
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('disconnected', 'Logged Out');
        }
        
        console.log('✅ Logged out successfully');
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
            loadOfflineUsers(); // Load demo users for admin
        } else {
            userMgmtBtn.style.display = 'none';
        }
    }

    // Show first available section
    const firstAvailableSection = userPermissions[0];
    if (firstAvailableSection && window.showSection) {
        setTimeout(() => {
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
        }, 200);
    }
}

/**
 * Load users for admin
 */
async function loadOfflineUsers() {
    if (currentUser.role !== 'admin') return;
    
    try {
        console.log('📥 Loading demo users...');
        
        // Demo users for offline mode
        const demoUsers = [
            {
                username: 'admin',
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@zedsonwatchcraft.com',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            },
            {
                username: 'owner',
                role: 'owner',
                fullName: 'Shop Owner',
                email: 'owner@zedsonwatchcraft.com',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: null
            },
            {
                username: 'staff',
                role: 'staff',
                fullName: 'Staff Member',
                email: 'staff@zedsonwatchcraft.com',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: null
            }
        ];
        
        updateUserTable(demoUsers);
        console.log('✅ Demo users loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading demo users:', error);
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No users found</td></tr>';
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
                    <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete user ${user.username}?', () => deleteUser('${user.username}'))" 
                            ${!canDelete ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `;
    });
}

// Placeholder functions for user management
function openAddUserModal() {
    if (currentUser.role !== 'admin') {
        Utils.showNotification('Only administrators can add new users.');
        return;
    }
    console.log('User management in offline mode.');
}

function addNewUser(event) {
    console.log('User management in offline mode.');
}

function editUser(username) {
    console.log('User editing in offline mode.');
}

function updateUser(event, username) {
    console.log('User editing in offline mode.');
}

function deleteUser(username) {
    console.log('User management in offline mode.');
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
 * Initialize authentication system - NO POPUPS
 */
async function initializeAuth() {
    try {
        console.log('🔄 Initializing Authentication System...');
        
        // Update database status
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('connecting', 'Initializing...');
        }
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set to ready state
        console.log('✅ Authentication system ready');
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('connected', '✓ System Ready');
        }
        
    } catch (error) {
        console.error('❌ Authentication initialization error:', error);
        
        // Still set to ready state
        if (window.AppCoreModule?.updateDatabaseStatus) {
            window.AppCoreModule.updateDatabaseStatus('connected', '✓ System Ready');
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
    loadUsers: loadOfflineUsers,
    loadInitialData,
    closeModal,
    initializeSampleData
};