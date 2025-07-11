// ZEDSON WATCHCRAFT - App Core Module with Full MongoDB Integration
// Developed by PULSEWARE❤️

/**
 * Main Application Controller - Core Functions with MongoDB Backend
 * ALL DATA OPERATIONS NOW USE MONGODB VIA API SERVICE
 */

/**
 * Show loading indicator
 */
function showLoadingIndicator(show = true) {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Update database connection status
 */
function updateDatabaseStatus(status, message) {
    const statusElement = document.getElementById('dbStatus');
    const statusText = document.getElementById('dbStatusText');
    
    if (statusElement && statusText) {
        statusElement.className = `db-status ${status}`;
        statusText.textContent = message;
    }
}

/**
 * Navigation function with logging and MongoDB integration
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

    // Update section-specific data from MongoDB
    updateSectionData(sectionId);
}

/**
 * Update data when switching sections - with MongoDB integration
 */
async function updateSectionData(sectionId) {
    try {
        showLoadingIndicator(true);
        
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
    } finally {
        showLoadingIndicator(false);
    }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get today's revenue from MongoDB data - NO LOCAL REFERENCES
 */
async function getTodayRevenue() {
    const today = Utils.formatDate(new Date());
    let salesRevenue = 0;
    let servicesRevenue = 0;
    
    try {
        // Get today's sales from MongoDB via API
        if (window.apiService) {
            const salesResponse = await window.apiService.getSales();
            if (salesResponse.success) {
                salesRevenue = salesResponse.data
                    .filter(sale => sale.date === today)
                    .reduce((sum, sale) => sum + sale.totalAmount, 0);
            }
        }
        
        // Get today's completed services from MongoDB via API
        if (window.apiService) {
            const servicesResponse = await window.apiService.getServices();
            if (servicesResponse.success) {
                servicesRevenue = servicesResponse.data
                    .filter(service => service.status === 'completed' && 
                             service.actualDelivery === today)
                    .reduce((sum, service) => sum + service.cost, 0);
            }
        }
    } catch (error) {
        console.error('Error calculating today\'s revenue:', error);
    }
    
    return {
        salesRevenue,
        servicesRevenue,
        totalRevenue: salesRevenue + servicesRevenue
    };
}

/**
 * Update dashboard statistics - COMPLETELY FROM MONGODB
 */
async function updateDashboard() {
    try {
        const currentUser = AuthModule.getCurrentUser();
        const isStaff = currentUser && currentUser.role === 'staff';
        
        // Get dashboard stats directly from MongoDB API
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
                }
                
                // Update incomplete services (visible for all users)
                const incompleteServicesElement = document.getElementById('incompleteServices');
                if (incompleteServicesElement) {
                    incompleteServicesElement.textContent = stats.incompleteServices || 0;
                }
            } else {
                throw new Error('Failed to get dashboard stats from MongoDB');
            }
        } else {
            throw new Error('API Service not available');
        }

        // Update dashboard visibility based on user role
        updateDashboardVisibility();
        
        // Update recent activities from MongoDB
        await updateRecentActivities();
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        Utils.showNotification('Error loading dashboard data from server');
        
        // Show loading state in stats
        const statElements = ['totalWatches', 'totalCustomers', 'totalInvoices', 'todayRevenue', 'incompleteServices'];
        statElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Error';
            }
        });
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
 * Update recent activities from MongoDB - NO LOCAL REFERENCES
 */
async function updateRecentActivities() {
    try {
        // Update recent sales from MongoDB
        const recentSalesDiv = document.getElementById('recentSales');
        if (recentSalesDiv && window.apiService) {
            const salesResponse = await window.apiService.getSales();
            if (salesResponse.success) {
                const recentSales = salesResponse.data
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 3);
                
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
            } else {
                recentSalesDiv.innerHTML = 'Error loading sales';
            }
        }

        // Update incomplete services from MongoDB
        const incompleteServicesDiv = document.getElementById('incompleteServicesList');
        if (incompleteServicesDiv && window.apiService) {
            const servicesResponse = await window.apiService.getServices();
            if (servicesResponse.success) {
                const incompleteServices = servicesResponse.data
                    .filter(service => service.status !== 'completed')
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 3);
                
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
            } else {
                incompleteServicesDiv.innerHTML = 'Error loading services';
            }
        }
    } catch (error) {
        console.error('Error updating recent activities:', error);
        const recentSalesDiv = document.getElementById('recentSales');
        const incompleteServicesDiv = document.getElementById('incompleteServicesList');
        
        if (recentSalesDiv) recentSalesDiv.innerHTML = 'Error loading data';
        if (incompleteServicesDiv) incompleteServicesDiv.innerHTML = 'Error loading data';
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
 * Toggle Revenue Filter Inputs
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
 * Apply Revenue Filter - COMPLETELY FROM MONGODB
 */
async function applyRevenueFilter() {
    const filterType = document.getElementById('revenueFilterType')?.value;
    const revenueType = document.getElementById('revenueTypeFilter')?.value || 'all';
    const includeExpenses = document.getElementById('includeExpenses')?.checked || false;
    const resultsDiv = document.getElementById('revenueFilterResults');
    
    if (!filterType || !resultsDiv) return;
    
    try {
        showLoadingIndicator(true);
        
        let filteredSales = [];
        let filteredServices = [];
        let filteredExpenses = [];
        let title = '';
        
        // Get data from MongoDB using API service
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
                
                title = `Transactions from ${Utils.formatDate(new Date(fromDate))} to ${Utils.formatDate(new Date(toDate))}`;
                
            } else if (filterType === 'monthly') {
                const month = document.getElementById('revenueMonth')?.value;
                const year = document.getElementById('revenueYear')?.value;
                
                if (month === null || !year) return;
                
                // Get all data and filter by month/year
                const [salesResponse, servicesResponse, expensesResponse] = await Promise.all([
                    window.apiService.getSales(),
                    window.apiService.getServices(),
                    includeExpenses ? window.apiService.getExpenses() : Promise.resolve({ success: true, data: [] })
                ]);
                
                if (salesResponse.success) {
                    filteredSales = salesResponse.data.filter(sale => {
                        const saleDate = new Date(sale.timestamp);
                        return saleDate.getMonth() === parseInt(month) && saleDate.getFullYear() === parseInt(year);
                    });
                }
                
                if (servicesResponse.success) {
                    filteredServices = servicesResponse.data.filter(service => {
                        const serviceDate = new Date(service.timestamp);
                        return service.status === 'completed' && 
                               serviceDate.getMonth() === parseInt(month) && 
                               serviceDate.getFullYear() === parseInt(year);
                    });
                }
                
                if (includeExpenses && expensesResponse.success) {
                    filteredExpenses = expensesResponse.data.filter(expense => {
                        const expenseDate = new Date(expense.timestamp);
                        return expenseDate.getMonth() === parseInt(month) && expenseDate.getFullYear() === parseInt(year);
                    });
                }
                
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                title = `Transactions for ${monthNames[month]} ${year}`;
                
            } else {
                // Show all transactions
                const [salesResponse, servicesResponse, expensesResponse] = await Promise.all([
                    window.apiService.getSales(),
                    window.apiService.getServices(),
                    includeExpenses ? window.apiService.getExpenses() : Promise.resolve({ success: true, data: [] })
                ]);
                
                if (salesResponse.success) {
                    filteredSales = salesResponse.data || [];
                }
                
                if (servicesResponse.success) {
                    filteredServices = (servicesResponse.data || []).filter(s => s.status === 'completed');
                }
                
                if (includeExpenses && expensesResponse.success) {
                    filteredExpenses = expensesResponse.data || [];
                }
                
                title = 'All Transactions';
            }
        } else {
            throw new Error('API Service not available');
        }
        
        // Filter by revenue type
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
        Utils.showNotification('Error loading revenue data from server. Please try again.');
        resultsDiv.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading data from server</p>';
    } finally {
        showLoadingIndicator(false);
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
    console.log('Initializing ZEDSON WATCHCRAFT Management System with Full MongoDB Integration...');
    
    try {
        // Update connection status
        updateDatabaseStatus('connecting', 'Connecting to MongoDB...');
        
        // Initialize API service first
        if (!window.apiService) {
            throw new Error('API Service not initialized');
        }
        
        // Test MongoDB connection
        try {
            await window.apiService.testConnection();
            updateDatabaseStatus('connected', '✓ MongoDB Connected');
        } catch (error) {
            updateDatabaseStatus('disconnected', '✗ MongoDB Connection Failed');
            throw error;
        }
        
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
                const loginScreen = document.getElementById('loginScreen');
                const mainApp = document.getElementById('mainApp');
                
                if (loginScreen) loginScreen.style.display = 'none';
                if (mainApp) mainApp.classList.add('logged-in');
                
                // Load initial data from MongoDB
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
            logAction('System initialized successfully with Full MongoDB integration');
        }
        
        console.log('Application initialized successfully with Full MongoDB backend');
    } catch (error) {
        console.error('Error during application initialization:', error);
        updateDatabaseStatus('disconnected', '✗ Initialization Failed');
        Utils.showNotification('Error starting application. Please check your internet connection and refresh the page.');
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
    showLoginScreen,
    showLoadingIndicator,
    updateDatabaseStatus
};