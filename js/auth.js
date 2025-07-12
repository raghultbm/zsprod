// ZEDSON WATCHCRAFT - Fixed Authentication Module
// Developed by PULSEWARE❤️

/**
 * FIXED Authentication System - No Login Loop
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
 * Handle user login - FIXED VERSION
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
        // Try API authentication first
        const response = await window.apiService.login({ username, password });
        
        if (response.success) {
            console.log('✅ API Authentication successful');
            completeLogin(response.user);
            return;
        }
    } catch (error) {
        console.log('⚠️ API authentication failed, trying offline mode');
    }
    
    // Fallback to offline authentication
    const user = authenticateOffline(username, password);
    if (user) {
        console.log('✅ Offline authentication successful');
        completeLogin(user);
    } else {
        console.log('❌ Invalid credentials');
        Utils.showNotification('Invalid username or password');
    }
    
    // Reset button state
    if (loginBtn) {
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
    }
}

/**
 * Authenticate user offline with demo credentials
 */
function authenticateOffline(username, password) {
    const demoUsers = {
        'admin': { password: 'admin123', role: 'admin', fullName: 'System Administrator', email: 'admin@zedsonwatchcraft.com' },
        'owner': { password: 'owner123', role: 'owner', fullName: 'Shop Owner', email: 'owner@zedsonwatchcraft.com' },
        'staff': { password: 'staff123', role: 'staff', fullName: 'Staff Member', email: 'staff@zedsonwatchcraft.com' }
    };
    
    const user = demoUsers[username];
    if (user && user.password === password) {
        return {
            username,
            role: user.role,
            fullName: user.fullName,
            email: user.email
        };
    }
    
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
    
    // Setup navigation based on user role
    setupNavigation();
    
    // Load initial data
    loadInitialData();
    
    // Clear login form
    const usernameField = document.getElementById('loginUsername');
    const passwordField = document.getElementById('loginPassword');
    if (usernameField) usernameField.value = '';
    if (passwordField) passwordField.value = '';
    
    console.log(`✅ Welcome back, ${user.fullName}!`);
}

/**
 * Load initial data
 */
async function loadInitialData() {
    try {
        console.log('📥 Loading application data...');
        
        // Initialize sample data if none exists
        initializeSampleData();
        
        // Update dashboard
        if (window.updateDashboard) {
            setTimeout(() => {
                window.updateDashboard();
            }, 500);
        }
        
        console.log('✅ Application data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
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
        }
    ];
    
    // Store in localStorage and set global data
    localStorage.setItem('zedson_customers', JSON.stringify(sampleCustomers));
    localStorage.setItem('zedson_inventory', JSON.stringify(sampleInventory));
    localStorage.setItem('zedson_sales', JSON.stringify([]));
    localStorage.setItem('zedson_services', JSON.stringify([]));
    localStorage.setItem('zedson_expenses', JSON.stringify([]));
    localStorage.setItem('zedson_invoices', JSON.stringify([]));
    
    // Set module data
    if (window.CustomerModule) {
        window.CustomerModule.customers = sampleCustomers;
    }
    if (window.InventoryModule) {
        window.InventoryModule.watches = sampleInventory;
    }
    
    console.log('✅ Sample data initialized');
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
    initializeSampleData
};