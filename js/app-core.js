// ZEDSON WATCHCRAFT - App Core Module with API Integration

/**
 * Main Application Controller - Core Functions with API Integration
 */

/**
 * Initialize application with API integration
 */
async function initializeApp() {
    console.log('Initializing ZEDSON WATCHCRAFT Management System with API...');
    
    try {
        // First check if server is available
        const serverHealthy = await APIHelpers.checkServerHealth();
        if (!serverHealthy) {
            Utils.showNotification('Server is not available. Please ensure the backend server is running on port 5000.');
            return;
        }
        
        // Initialize logging first
        if (window.LoggingModule) {
            LoggingModule.initializeLogging();
        }
        
        // Check for existing authentication
        const user = await AuthModule.initializeAuth();
        
        if (user) {
            // User is already logged in
            console.log('User already authenticated:', user.username);
            AuthModule.completeLogin(user);
        } else {
            // Show login screen
            console.log('No authenticated user, showing login screen');
            const loginScreen = document.getElementById('loginScreen');
            const mainApp = document.getElementById('mainApp');
            
            if (loginScreen) loginScreen.style.display = 'flex';
            if (mainApp) mainApp.classList.remove('logged-in');
        }
        
        // Load modal templates
        if (window.AppExtendedModule && AppExtendedModule.loadModalTemplates) {
            AppExtendedModule.loadModalTemplates();
        }
        
        // Initialize other modules (but don't load sample data)
        if (window.InventoryModule) {
            // InventoryModule.initializeInventory(); // Will be called after login
        }
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('Application initialized successfully with API integration');
        
    } catch (error) {
        console.error('Error during application initialization:', error);
        Utils.showNotification('Error starting application. Please check if the backend server is running and refresh the page.');
    }
}

/**
 * Initialize modules after successful login
 */
async function initializeModulesAfterLogin() {
    try {
        // Initialize customer module with API data
        if (window.CustomerModule) {
            await CustomerModule.initializeCustomers();
        }
        
        // Initialize other modules (they will use local data for now)
        if (window.InventoryModule) {
            InventoryModule.initializeInventory();
        }
        
        if (window.SalesModule) {
            SalesModule.initializeSales();
        }
        
        if (window.ServiceModule) {
            ServiceModule.initializeServices();
        }
        
        if (window.ExpenseModule) {
            ExpenseModule.initializeExpenses();
        }
        
        if (window.InvoiceModule) {
            InvoiceModule.initializeInvoices();
        }
        
        // Update dashboard
        updateDashboard();
        
        console.log('All modules initialized after login');
        
    } catch (error) {
        console.error('Error initializing modules after login:', error);
        Utils.showNotification('Error loading application data. Please refresh the page.');
    }
}

/**
 * Navigation function with logging
 */
function showSection(sectionId, button) {
    // Check permissions
    if (!AuthModule.hasPermission(sectionId)) {
        Utils.showNotification('You do not have permission to access this section.');
        return;
    }

    // Log navigation
    if (window.logNavigationAction) {
        logNavigationAction(sectionId);
    }

    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Mark clicked button as active
    if (button) {
        button.classList.add('active');
    }

    // Update section-specific data
    updateSectionData(sectionId);
}

/**
 * Update data when switching sections
 */
function updateSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'inventory':
            if (window.InventoryModule) {
                InventoryModule.renderWatchTable();
            }
            break;
        case 'customers':
            if (window.CustomerModule) {
                // Refresh customers from API when viewing customers section
                CustomerModule.refreshCustomers();
            }
            break;
        case 'users':
            if (AuthModule.getCurrentUser()?.role === 'admin') {
                AuthModule.updateUserTable();
            }
            break;
        case 'sales':
            if (window.SalesModule) {
                SalesModule.renderSalesTable();
            }
            break;
        case 'service':
            if (window.ServiceModule) {
                ServiceModule.renderServiceTable();
            }
            break;
        case 'expenses':
            if (window.ExpenseModule) {
                ExpenseModule.renderExpenseTable();
            }
            break;
        case 'invoices':
            if (window.InvoiceModule) {
                InvoiceModule.renderInvoiceTable();
            }
            break;
    }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get today's sales and services revenue
 */
function getTodayRevenue() {
    const today = Utils.formatDate(new Date());
    let salesRevenue = 0;
    let servicesRevenue = 0;
    
    // Get today's sales
    if (window.SalesModule && SalesModule.sales) {
        salesRevenue = SalesModule.sales
            .filter(sale => sale.date === today)
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
    }
    
    // Get today's completed services
    if (window.ServiceModule && ServiceModule.services) {
        servicesRevenue = ServiceModule.services
            .filter(service => service.status === 'completed' && 
                     service.actualDelivery === today)
            .reduce((sum, service) => sum + service.cost, 0);
    }
    
    return {
        salesRevenue,
        servicesRevenue,
        totalRevenue: salesRevenue + servicesRevenue
    };
}

/**
 * Update dashboard statistics with API data
 */
async function updateDashboard() {
    const currentUser = AuthModule.getCurrentUser();
    if (!currentUser) return;
    
    const isStaff = currentUser.role === 'staff';
    
    try {
        // Update statistics cards with safe checks
        if (window.InventoryModule && !isStaff) {
            const inventoryStats = InventoryModule.getInventoryStats();
            const totalWatchesElement = document.getElementById('totalWatches');
            if (totalWatchesElement) {
                totalWatchesElement.textContent = inventoryStats.totalWatches;
            }
        }
        
        if (window.CustomerModule && !isStaff) {
            const customerStats = await CustomerModule.getCustomerStats();
            const totalCustomersElement = document.getElementById('totalCustomers');
            if (totalCustomersElement && customerStats) {
                totalCustomersElement.textContent = customerStats.totalCustomers;
            }
        }
        
        // Update combined today's sales (Sales + Services)
        const todaySales = getTodayRevenue();
        const todaySalesElement = document.getElementById('todayRevenue');
        if (todaySalesElement) {
            todaySalesElement.textContent = Utils.formatCurrency(todaySales.totalRevenue);
            // Update the label to "Today's Sales"
            const labelElement = todaySalesElement.nextElementSibling;
            if (labelElement && labelElement.tagName === 'P') {
                labelElement.textContent = "Today's Sales";
            }
        }
        
        // Update incomplete services - visible for both staff and others
        if (window.ServiceModule) {
            const serviceStats = ServiceModule.getServiceStats();
            const incompleteServicesElement = document.getElementById('incompleteServices');
            if (incompleteServicesElement) {
                incompleteServicesElement.textContent = serviceStats.incompleteServices;
            }
        }

        // Hide invoices stat for staff
        if (window.InvoiceModule && !isStaff) {
            const invoiceStats = InvoiceModule.getInvoiceStats();
            const totalInvoicesElement = document.getElementById('totalInvoices');
            if (totalInvoicesElement) {
                totalInvoicesElement.textContent = invoiceStats.totalInvoices;
            }
        }

        // Update dashboard visibility based on user role
        updateDashboardVisibility();
        
        // Update recent activities
        updateRecentActivities();
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

/**
 * Update dashboard visibility based on user role
 */
function updateDashboardVisibility() {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    // Get all stat cards
    const statCards = document.querySelectorAll('.stat-card');
    
    if (isStaff) {
        // For staff, only show Today's Sales and Incomplete Services
        statCards.forEach(card => {
            const cardText = card.querySelector('p')?.textContent;
            if (cardText === "Today's Sales" || cardText === "Incomplete Services") {
                card.style.display = 'block';
                // Remove clickable functionality for staff
                card.classList.remove('clickable-stat');
                card.onclick = null;
            } else {
                card.style.display = 'none';
            }
        });
    } else {
        // For non-staff, show all cards
        statCards.forEach(card => {
            card.style.display = 'block';
        });
        
        // Re-enable clickable functionality for Today's Sales (non-staff only)
        const todaySalesCard = document.getElementById('todayRevenue')?.closest('.stat-card');
        if (todaySalesCard) {
            todaySalesCard.classList.add('clickable-stat');
            todaySalesCard.onclick = () => openRevenueAnalytics();
        }
    }
}

/**
 * Update recent activities on dashboard
 */
function updateRecentActivities() {
    // Update recent sales
    const recentSalesDiv = document.getElementById('recentSales');
    if (recentSalesDiv && window.SalesModule) {
        const recentSales = SalesModule.getRecentSales(3);
        if (recentSales.length > 0) {
            recentSalesDiv.innerHTML = recentSales.map(sale => 
                `<div style="padding: 10px; border-left: 3px solid #ffd700; margin-bottom: 10px;">
                    <strong>${Utils.sanitizeHtml(sale.customerName)}</strong> - ${Utils.sanitizeHtml(sale.watchName)}<br>
                    <span style="color: #1a237e;">${Utils.formatCurrency(sale.totalAmount)}</span>
                </div>`
            ).join('');
        } else {
            recentSalesDiv.innerHTML = 'No sales yet';
        }
    }

    // Update incomplete services
    const incompleteServicesDiv = document.getElementById('incompleteServicesList');
    if (incompleteServicesDiv && window.ServiceModule) {
        const incompleteServices = ServiceModule.getIncompleteServices(3);
        if (incompleteServices.length > 0) {
            incompleteServicesDiv.innerHTML = incompleteServices.map(service => 
                `<div style="padding: 10px; border-left: 3px solid #ffd700; margin-bottom: 10px;">
                    <strong>${Utils.sanitizeHtml(service.customerName)}</strong> - ${Utils.sanitizeHtml(service.brand)} ${Utils.sanitizeHtml(service.model)}<br>
                    <span style="color: #1a237e;">${Utils.sanitizeHtml(service.issue)} (${Utils.sanitizeHtml(service.status)})</span>
                </div>`
            ).join('');
        } else {
            incompleteServicesDiv.innerHTML = 'No incomplete services';
        }
    }
}

/**
 * Open Revenue Analytics Modal with staff restrictions
 */
function openRevenueAnalytics() {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    // Staff users cannot access analytics
    if (isStaff) {
        Utils.showNotification('Revenue analytics is not available for staff users.');
        return;
    }
    
    const modal = document.getElementById('revenueAnalyticsModal');
    if (!modal) {
        Utils.showNotification('Revenue analytics modal not found');
        return;
    }
    
    // Log action
    if (window.logAction) {
        logAction('Opened revenue analytics modal');
    }
    
    modal.style.display = 'block';
    
    // Populate year dropdown
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('revenueYear');
    if (yearSelect) {
        yearSelect.innerHTML = '';
        for (let year = currentYear; year >= currentYear - 5; year--) {
            yearSelect.innerHTML += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
        }
    }
    
    // Set current month
    const currentMonth = new Date().getMonth();
    const monthSelect = document.getElementById('revenueMonth');
    if (monthSelect) {
        monthSelect.value = currentMonth;
    }
    
    // Reset and show all transactions initially
    resetRevenueAnalytics();
}

/**
 * Reset revenue analytics
 */
function resetRevenueAnalytics() {
    // This function will be implemented in app-extended.js
    if (window.AppExtendedModule && AppExtendedModule.resetRevenueFilter) {
        AppExtendedModule.resetRevenueFilter();
    }
}

/**
 * Modal functions
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Log modal close action
        if (window.logAction) {
            logAction(`Closed modal: ${modalId}`);
        }
    }
}

/**
 * Generic delete function for table rows with logging
 */
function deleteItem(button) {
    if (confirm('Are you sure you want to delete this item?')) {
        const row = button.closest('tr');
        if (row) {
            row.remove();
            
            // Log deletion
            if (window.logAction) {
                logAction('Deleted item from table');
            }
            
            Utils.showNotification('Item deleted successfully!');
            updateDashboard();
        }
    }
}

/**
 * Confirmation prompts for transactions
 */
function confirmTransaction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Handle escape key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="block"]');
            openModals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Export core functions for extended module
window.AppCoreModule = {
    initializeApp,
    initializeModulesAfterLogin,
    showSection,
    updateSectionData,
    getTodayDate,
    getTodayRevenue,
    updateDashboard,
    updateDashboardVisibility,
    updateRecentActivities,
    openRevenueAnalytics,
    closeModal,
    deleteItem,
    confirmTransaction,
    setupEventListeners
};