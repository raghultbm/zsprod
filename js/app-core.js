// ZEDSON WATCHCRAFT - App Core Module with MongoDB Integration
// Developed by PULSEWARE❤️

/**
 * Main Application Controller - Core Functions with MongoDB Backend
 */

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
 * Update data when switching sections - with MongoDB integration
 */
async function updateSectionData(sectionId) {
    try {
        switch (sectionId) {
            case 'dashboard':
                await updateDashboard();
                break;
            case 'inventory':
                if (window.InventoryModule) {
                    await InventoryModule.loadInventory();
                    InventoryModule.renderWatchTable();
                }
                break;
            case 'customers':
                if (window.CustomerModule) {
                    await CustomerModule.loadCustomers();
                    CustomerModule.renderCustomerTable();
                }
                break;
            case 'users':
                if (AuthModule.getCurrentUser()?.role === 'admin') {
                    await AuthModule.loadUsers();
                }
                break;
            case 'sales':
                if (window.SalesModule) {
                    await SalesModule.loadSales();
                    SalesModule.renderSalesTable();
                }
                break;
            case 'service':
                if (window.ServiceModule) {
                    await ServiceModule.loadServices();
                    ServiceModule.renderServiceTable();
                }
                break;
            case 'expenses':
                if (window.ExpenseModule) {
                    await ExpenseModule.loadExpenses();
                    ExpenseModule.renderExpenseTable();
                }
                break;
            case 'invoices':
                if (window.InvoiceModule) {
                    await InvoiceModule.loadInvoices();
                    InvoiceModule.renderInvoiceTable();
                }
                break;
        }
    } catch (error) {
        console.error('Error updating section data:', error);
        Utils.showNotification('Error loading section data. Please try again.');
    }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get today's sales and services revenue - with MongoDB data
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
 * Update dashboard statistics with role-based restrictions and MongoDB data
 */
async function updateDashboard() {
    try {
        const currentUser = AuthModule.getCurrentUser();
        const isStaff = currentUser && currentUser.role === 'staff';
        
        // Get dashboard stats from MongoDB
        if (window.apiService) {
            const response = await window.apiService.getDashboardStats();
            if (response.success) {
                const stats = response.data;
                
                // Update statistics cards with safe checks
                if (!isStaff) {
                    const totalWatchesElement = document.getElementById('totalWatches');
                    if (totalWatchesElement) {
                        totalWatchesElement.textContent = stats.totalWatches || 0;
                    }
                    
                    const totalCustomersElement = document.getElementById('totalCustomers');
                    if (totalCustomersElement) {
                        totalCustomersElement.textContent = stats.totalCustomers || 0;
                    }
                    
                    const totalInvoicesElement = document.getElementById('totalInvoices');
                    if (totalInvoicesElement) {
                        totalInvoicesElement.textContent = stats.totalInvoices || 0;
                    }
                }
                
                // Update today's revenue (visible for all users)
                const todayRevenueElement = document.getElementById('todayRevenue');
                if (todayRevenueElement) {
                    todayRevenueElement.textContent = Utils.formatCurrency(stats.todayRevenue || 0);
                    // Update the label to "Today's Sales"
                    const labelElement = todayRevenueElement.nextElementSibling;
                    if (labelElement && labelElement.tagName === 'P') {
                        labelElement.textContent = "Today's Sales";
                    }
                }
                
                // Update incomplete services (visible for all users)
                const incompleteServicesElement = document.getElementById('incompleteServices');
                if (incompleteServicesElement) {
                    incompleteServicesElement.textContent = stats.incompleteServices || 0;
                }
            }
        }

        // Update dashboard visibility based on user role
        updateDashboardVisibility();
        
        // Update recent activities
        await updateRecentActivities();
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        // Fallback to local calculation if API fails
        updateDashboardLocal();
    }
}

/**
 * Fallback dashboard update using local data
 */
function updateDashboardLocal() {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    // Update statistics cards with safe checks
    if (window.InventoryModule && !isStaff) {
        const inventoryStats = InventoryModule.getInventoryStats();
        const totalWatchesElement = document.getElementById('totalWatches');
        if (totalWatchesElement) {
            totalWatchesElement.textContent = inventoryStats.totalWatches;
        }
    }
    
    if (window.CustomerModule && !isStaff) {
        const customerStats = CustomerModule.getCustomerStats();
        const totalCustomersElement = document.getElementById('totalCustomers');
        if (totalCustomersElement) {
            totalCustomersElement.textContent = customerStats.totalCustomers;
        }
    }
    
    // Update combined today's sales (Sales + Services)
    const todaySales = getTodayRevenue();
    const todaySalesElement = document.getElementById('todayRevenue');
    if (todaySalesElement) {
        todaySalesElement.textContent = Utils.formatCurrency(todaySales.totalRevenue);
    }
    
    // Update incomplete services
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
async function updateRecentActivities() {
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
    resetRevenueFilter();
}

/**
 * Toggle Revenue Filter Inputs with updated structure
 */
function toggleRevenueFilterInputs() {
    const filterType = document.getElementById('revenueFilterType')?.value;
    const dateRangeInputs = document.getElementById('revenueDateRangeInputs');
    const monthGroup = document.getElementById('revenueMonthGroup');
    const yearGroup = document.getElementById('revenueYearGroup');
    
    if (!filterType || !dateRangeInputs || !monthGroup || !yearGroup) return;
    
    // Hide all inputs first
    dateRangeInputs.style.display = 'none';
    monthGroup.style.display = 'none';
    
    if (filterType === 'dateRange') {
        dateRangeInputs.style.display = 'grid';
        yearGroup.style.display = 'none';
    } else if (filterType === 'monthly') {
        monthGroup.style.display = 'block';
        yearGroup.style.display = 'block';
    } else {
        yearGroup.style.display = 'block';
    }
}

/**
 * Apply Revenue Filter with expenses integration and MongoDB data
 */
async function applyRevenueFilter() {
    if (!window.SalesModule || !window.ServiceModule) {
        Utils.showNotification('Sales or Service module not available');
        return;
    }
    
    const filterType = document.getElementById('revenueFilterType')?.value;
    const revenueType = document.getElementById('revenueTypeFilter')?.value || 'all';
    const includeExpenses = document.getElementById('includeExpenses')?.checked || false;
    const resultsDiv = document.getElementById('revenueFilterResults');
    
    if (!filterType || !resultsDiv) return;
    
    try {
        let filteredSales = [];
        let filteredServices = [];
        let filteredExpenses = [];
        let title = '';
        
        // Get data from MongoDB if available, otherwise use local cache
        if (window.apiService) {
            const params = {};
            
            if (filterType === 'dateRange') {
                const fromDate = document.getElementById('revenueFromDate')?.value;
                const toDate = document.getElementById('revenueToDate')?.value;
                
                if (!fromDate || !toDate) {
                    Utils.showNotification('Please select both from and to dates.');
                    return;
                }
                
                params.fromDate = fromDate;
                params.toDate = toDate;
                params.type = revenueType;
                params.includeExpenses = includeExpenses;
                
                const response = await window.apiService.getRevenueAnalytics(params);
                if (response.success) {
                    filteredSales = response.data.sales || [];
                    filteredServices = response.data.services || [];
                    filteredExpenses = response.data.expenses || [];
                }
                
                title = `Transactions from ${Utils.formatDate(fromDate)} to ${Utils.formatDate(toDate)}`;
                
            } else if (filterType === 'monthly') {
                const month = document.getElementById('revenueMonth')?.value;
                const year = document.getElementById('revenueYear')?.value;
                
                if (month === null || !year) return;
                
                // Use local filter functions for monthly
                filteredSales = SalesModule.filterSalesByMonth(month, year);
                filteredServices = ServiceModule.filterServicesByMonth(month, year)
                    .filter(s => s.status === 'completed');
                
                if (includeExpenses && window.ExpenseModule) {
                    filteredExpenses = ExpenseModule.getExpensesByMonth(month, year);
                }
                
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                title = `Transactions for ${monthNames[month]} ${year}`;
                
            } else {
                // Show all transactions
                filteredSales = SalesModule.sales || [];
                filteredServices = (ServiceModule.services || []).filter(s => s.status === 'completed');
                
                if (includeExpenses && window.ExpenseModule) {
                    filteredExpenses = ExpenseModule.expenses || [];
                }
                
                title = 'All Transactions';
            }
        } else {
            // Fallback to local data
            if (filterType === 'dateRange') {
                const fromDate = document.getElementById('revenueFromDate')?.value;
                const toDate = document.getElementById('revenueToDate')?.value;
                
                if (!fromDate || !toDate) {
                    Utils.showNotification('Please select both from and to dates.');
                    return;
                }
                
                filteredSales = SalesModule.filterSalesByDateRange(fromDate, toDate);
                filteredServices = ServiceModule.filterServicesByDateRange(fromDate, toDate)
                    .filter(s => s.status === 'completed');
                
                if (includeExpenses && window.ExpenseModule) {
                    filteredExpenses = ExpenseModule.getExpensesByDateRange(fromDate, toDate);
                }
                
                title = `Transactions from ${Utils.formatDate(fromDate)} to ${Utils.formatDate(toDate)}`;
                
            } else if (filterType === 'monthly') {
                const month = document.getElementById('revenueMonth')?.value;
                const year = document.getElementById('revenueYear')?.value;
                
                if (month === null || !year) return;
                
                filteredSales = SalesModule.filterSalesByMonth(month, year);
                filteredServices = ServiceModule.filterServicesByMonth(month, year)
                    .filter(s => s.status === 'completed');
                
                if (includeExpenses && window.ExpenseModule) {
                    filteredExpenses = ExpenseModule.getExpensesByMonth(month, year);
                }
                
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                title = `Transactions for ${monthNames[month]} ${year}`;
                
            } else {
                filteredSales = SalesModule.sales || [];
                filteredServices = (ServiceModule.services || []).filter(s => s.status === 'completed');
                
                if (includeExpenses && window.ExpenseModule) {
                    filteredExpenses = ExpenseModule.expenses || [];
                }
                
                title = 'All Transactions';
            }
        }
        
        // Then filter by revenue type
        if (revenueType === 'sales') {
            filteredServices = [];
            title += ' (Sales Only)';
        } else if (revenueType === 'services') {
            filteredSales = [];
            title += ' (Services Only)';
        }
        
        // Calculate totals
        const salesAmount = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const servicesAmount = filteredServices.reduce((sum, service) => sum + service.cost, 0);
        const expensesAmount = includeExpenses ? filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
        const totalRevenue = salesAmount + servicesAmount;
        const netAmount = totalRevenue - expensesAmount;
        const totalTransactions = filteredSales.length + filteredServices.length + (includeExpenses ? filteredExpenses.length : 0);
        
        // Display results
        let statsHtml = `
            <div class="stat-card" style="margin: 10px;">
                <h3>${totalTransactions}</h3>
                <p>Total Transactions</p>
            </div>
            <div class="stat-card" style="margin: 10px;">
                <h3>${Utils.formatCurrency(salesAmount)}</h3>
                <p>Sales Revenue</p>
            </div>
            <div class="stat-card" style="margin: 10px;">
                <h3>${Utils.formatCurrency(servicesAmount)}</h3>
                <p>Services Revenue</p>
            </div>
            <div class="stat-card" style="margin: 10px;">
                <h3>${Utils.formatCurrency(totalRevenue)}</h3>
                <p>Total Revenue</p>
            </div>
        `;
        
        if (includeExpenses) {
            statsHtml += `
                <div class="stat-card" style="margin: 10px;">
                    <h3 style="color: #dc3545;">${Utils.formatCurrency(expensesAmount)}</h3>
                    <p>Total Expenses</p>
                </div>
                <div class="stat-card" style="margin: 10px;">
                    <h3 style="color: ${netAmount >= 0 ? '#28a745' : '#dc3545'};">${Utils.formatCurrency(netAmount)}</h3>
                    <p>Net Amount</p>
                </div>
            `;
        }
        
        let tableRows = '';
        
        // Add sales rows
        tableRows += filteredSales.map(sale => `
            <tr>
                <td><span class="status available">Sales</span></td>
                <td>${Utils.sanitizeHtml(sale.date)}</td>
                <td>${Utils.sanitizeHtml(sale.customerName)}</td>
                <td>${Utils.sanitizeHtml(sale.watchName)}</td>
                <td style="color: #28a745;">${Utils.formatCurrency(sale.totalAmount)}</td>
            </tr>
        `).join('');
        
        // Add services rows
        tableRows += filteredServices.map(service => `
            <tr>
                <td><span class="status completed">Service</span></td>
                <td>${Utils.sanitizeHtml(service.actualDelivery || service.date)}</td>
                <td>${Utils.sanitizeHtml(service.customerName)}</td>
                <td>${Utils.sanitizeHtml(service.watchName)}</td>
                <td style="color: #28a745;">${Utils.formatCurrency(service.cost)}</td>
            </tr>
        `).join('');
        
        // Add expenses rows if included
        if (includeExpenses) {
            tableRows += filteredExpenses.map(expense => `
                <tr>
                    <td><span class="status on-hold">Expense</span></td>
                    <td>${Utils.sanitizeHtml(expense.formattedDate)}</td>
                    <td>-</td>
                    <td>${Utils.sanitizeHtml(expense.description)}</td>
                    <td style="color: #dc3545;">-${Utils.formatCurrency(expense.amount)}</td>
                </tr>
            `).join('');
        }
        
        resultsDiv.innerHTML = `
            <div class="filter-results">
                <h3>${title}</h3>
                <div class="stats" style="margin: 20px 0;">
                    ${statsHtml}
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Details</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error applying revenue filter:', error);
        Utils.showNotification('Error loading revenue data. Please try again.');
    }
}

/**
 * Reset Revenue Filter
 */
function resetRevenueFilter() {
    const filterType = document.getElementById('revenueFilterType');
    const revenueType = document.getElementById('revenueTypeFilter');
    const includeExpenses = document.getElementById('includeExpenses');
    const resultsDiv = document.getElementById('revenueFilterResults');
    
    if (filterType) filterType.value = 'all';
    if (revenueType) revenueType.value = 'all';
    if (includeExpenses) includeExpenses.checked = false;
    if (resultsDiv) resultsDiv.innerHTML = '';
    
    toggleRevenueFilterInputs();
    applyRevenueFilter();
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

/**
 * Initialize application with MongoDB integration
 */
async function initializeApp() {
    console.log('Initializing ZEDSON WATCHCRAFT Management System with MongoDB...');
    
    try {
        // Initialize logging first
        if (window.LoggingModule) {
            LoggingModule.initializeLogging();
        }
        
        // Load modal templates
        if (window.AppExtendedModule && AppExtendedModule.loadModalTemplates) {
            AppExtendedModule.loadModalTemplates();
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Check if user is already logged in
        const token = localStorage.getItem('authToken');
        if (token && window.apiService) {
            window.apiService.setToken(token);
            
            // Try to validate token and load user data
            try {
                // You could add a validate token endpoint here
                const loginScreen = document.getElementById('loginScreen');
                const mainApp = document.getElementById('mainApp');
                
                if (loginScreen) loginScreen.style.display = 'none';
                if (mainApp) mainApp.classList.add('logged-in');
                
                // Load initial data
                await AuthModule.loadInitialData();
            } catch (error) {
                console.error('Token validation failed:', error);
                // Clear invalid token and show login
                localStorage.removeItem('authToken');
                window.apiService.setToken(null);
                showLoginScreen();
            }
        } else {
            // Ensure login screen is shown initially
            showLoginScreen();
        }
        
        // Log system startup
        if (window.logAction) {
            logAction('System initialized successfully with MongoDB integration');
        }
        
        console.log('Application initialized successfully with MongoDB backend');
    } catch (error) {
        console.error('Error during application initialization:', error);
        Utils.showNotification('Error starting application. Please refresh the page.');
        showLoginScreen();
    }
}

/**
 * Show login screen
 */
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.classList.remove('logged-in');
}

// Export core functions for extended module
window.AppCoreModule = {
    showSection,
    updateSectionData,
    getTodayDate,
    getTodayRevenue,
    updateDashboard,
    updateDashboardVisibility,
    updateRecentActivities,
    openRevenueAnalytics,
    toggleRevenueFilterInputs,
    applyRevenueFilter,
    resetRevenueFilter,
    closeModal,
    deleteItem,
    confirmTransaction,
    setupEventListeners,
    initializeApp,
    showLoginScreen
};