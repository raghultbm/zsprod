// ZEDSON WATCHCRAFT - App Core Module (FIXED - NO POPUPS)
// Developed by PULSEWARE❤️

/**
 * Main Application Controller - Core Functions (NO ANNOYING POPUPS)
 * ALL OPERATIONS LOCAL - NO INTERNET CONNECTION REQUIRED
 */

console.log('🔧 FIXED APP CORE LOADED - No annoying popups!');

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
 * Update database status
 */
function updateDatabaseStatus(status, message) {
    const statusElement = document.getElementById('dbStatus');
    const statusText = document.getElementById('dbStatusText');
    
    if (statusElement && statusText) {
        statusElement.className = `db-status ${status}`;
        statusText.textContent = message;
    }
    
    console.log(`📊 Status: ${status} - ${message}`);
}

/**
 * Navigation function
 */
function showSection(sectionId, button) {
    // Check permissions
    if (!AuthModule.hasPermission(sectionId)) {
        console.log('Permission denied for section:', sectionId);
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
    updateSectionDataOffline(sectionId);
}

/**
 * Update data when switching sections
 */
async function updateSectionDataOffline(sectionId) {
    try {
        showLoadingIndicator(true);
        
        console.log(`🔄 Loading section: ${sectionId}`);
        
        switch (sectionId) {
            case 'dashboard':
                await updateDashboardOffline();
                break;
            case 'inventory':
                if (window.InventoryModule) {
                    const stored = localStorage.getItem('zedson_inventory');
                    if (stored) {
                        window.InventoryModule.watches = JSON.parse(stored);
                    }
                    if (window.InventoryModule.renderWatchTable) {
                        window.InventoryModule.renderWatchTable();
                    }
                }
                break;
            case 'customers':
                if (window.CustomerModule) {
                    const stored = localStorage.getItem('zedson_customers');
                    if (stored) {
                        window.CustomerModule.customers = JSON.parse(stored);
                    }
                    if (window.CustomerModule.renderCustomerTable) {
                        window.CustomerModule.renderCustomerTable();
                    }
                }
                break;
            case 'users':
                if (AuthModule.getCurrentUser()?.role === 'admin') {
                    await AuthModule.loadUsers();
                }
                break;
            case 'sales':
                if (window.SalesModule) {
                    const stored = localStorage.getItem('zedson_sales');
                    if (stored) {
                        window.SalesModule.sales = JSON.parse(stored);
                    }
                    if (window.SalesModule.renderSalesTable) {
                        window.SalesModule.renderSalesTable();
                    }
                }
                break;
            case 'service':
                if (window.ServiceModule) {
                    const stored = localStorage.getItem('zedson_services');
                    if (stored) {
                        window.ServiceModule.services = JSON.parse(stored);
                    }
                    if (window.ServiceModule.renderServiceTable) {
                        window.ServiceModule.renderServiceTable();
                    }
                }
                break;
            case 'expenses':
                if (window.ExpenseModule) {
                    const stored = localStorage.getItem('zedson_expenses');
                    if (stored) {
                        window.ExpenseModule.expenses = JSON.parse(stored);
                    }
                    if (window.ExpenseModule.renderExpenseTable) {
                        window.ExpenseModule.renderExpenseTable();
                    }
                }
                break;
            case 'invoices':
                if (window.InvoiceModule) {
                    const stored = localStorage.getItem('zedson_invoices');
                    if (stored) {
                        window.InvoiceModule.invoices = JSON.parse(stored);
                    }
                    if (window.InvoiceModule.renderInvoiceTable) {
                        window.InvoiceModule.renderInvoiceTable();
                    }
                }
                break;
        }
        
        console.log(`✅ Section loaded: ${sectionId}`);
        
    } catch (error) {
        console.error('Error updating section data:', error);
        // NO POPUP - Just console log
        console.log('Using cached data for section:', sectionId);
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
 * Get today's revenue from localStorage
 */
async function getTodayRevenueOffline() {
    const today = Utils.formatDate(new Date());
    let salesRevenue = 0;
    let servicesRevenue = 0;
    
    try {
        // Get today's sales from localStorage
        const salesData = localStorage.getItem('zedson_sales');
        if (salesData) {
            const sales = JSON.parse(salesData);
            salesRevenue = sales
                .filter(sale => sale.date === today)
                .reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        }
        
        // Get today's completed services from localStorage
        const servicesData = localStorage.getItem('zedson_services');
        if (servicesData) {
            const services = JSON.parse(servicesData);
            servicesRevenue = services
                .filter(service => service.status === 'completed' && 
                         service.actualDelivery === today)
                .reduce((sum, service) => sum + (service.cost || 0), 0);
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
 * Update dashboard statistics from localStorage
 */
async function updateDashboardOffline() {
    try {
        console.log('📊 Updating dashboard...');
        
        const currentUser = AuthModule.getCurrentUser();
        const isStaff = currentUser && currentUser.role === 'staff';
        
        // Calculate stats from localStorage
        let totalWatches = 0;
        let totalCustomers = 0;
        let totalSales = 0;
        let totalServices = 0;
        let incompleteServices = 0;
        let totalInvoices = 0;
        let todayRevenue = 0;
        
        try {
            // Count inventory
            const inventoryData = localStorage.getItem('zedson_inventory');
            if (inventoryData) {
                const inventory = JSON.parse(inventoryData);
                totalWatches = inventory.length;
            }
            
            // Count customers
            const customersData = localStorage.getItem('zedson_customers');
            if (customersData) {
                const customers = JSON.parse(customersData);
                totalCustomers = customers.length;
            }
            
            // Count sales
            const salesData = localStorage.getItem('zedson_sales');
            if (salesData) {
                const sales = JSON.parse(salesData);
                totalSales = sales.length;
            }
            
            // Count services
            const servicesData = localStorage.getItem('zedson_services');
            if (servicesData) {
                const services = JSON.parse(servicesData);
                totalServices = services.length;
                incompleteServices = services.filter(s => s.status !== 'completed').length;
            }
            
            // Count invoices
            const invoicesData = localStorage.getItem('zedson_invoices');
            if (invoicesData) {
                const invoices = JSON.parse(invoicesData);
                totalInvoices = invoices.length;
            }
            
            // Calculate today's revenue
            const revenueData = await getTodayRevenueOffline();
            todayRevenue = revenueData.totalRevenue;
            
        } catch (error) {
            console.error('Error calculating dashboard stats:', error);
        }
        
        // Update statistics cards with safe checks
        if (!isStaff) {
            const totalWatchesElement = document.getElementById('totalWatches');
            if (totalWatchesElement) {
                totalWatchesElement.textContent = totalWatches;
            }
            
            const totalCustomersElement = document.getElementById('totalCustomers');
            if (totalCustomersElement) {
                totalCustomersElement.textContent = totalCustomers;
            }
            
            const totalInvoicesElement = document.getElementById('totalInvoices');
            if (totalInvoicesElement) {
                totalInvoicesElement.textContent = totalInvoices;
            }
        }
        
        // Update today's revenue (visible for all users)
        const todayRevenueElement = document.getElementById('todayRevenue');
        if (todayRevenueElement) {
            todayRevenueElement.textContent = Utils.formatCurrency(todayRevenue);
        }
        
        // Update incomplete services (visible for all users)
        const incompleteServicesElement = document.getElementById('incompleteServices');
        if (incompleteServicesElement) {
            incompleteServicesElement.textContent = incompleteServices;
        }

        // Update dashboard visibility based on user role
        updateDashboardVisibility();
        
        // Update recent activities from localStorage
        await updateRecentActivitiesOffline();
        
        console.log('✅ Dashboard updated successfully');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        // NO POPUP - Just log the error
        console.log('Dashboard data loading error - using fallback values');
        
        // Show error state in stats
        const statElements = ['totalWatches', 'totalCustomers', 'totalInvoices', 'todayRevenue', 'incompleteServices'];
        statElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '0';
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
 * Update recent activities from localStorage
 */
async function updateRecentActivitiesOffline() {
    try {
        // Update recent sales from localStorage
        const recentSalesDiv = document.getElementById('recentSales');
        if (recentSalesDiv) {
            const salesData = localStorage.getItem('zedson_sales');
            if (salesData) {
                const sales = JSON.parse(salesData);
                const recentSales = sales
                    .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
                    .slice(0, 3);
                
                if (recentSales.length > 0) {
                    recentSalesDiv.innerHTML = recentSales.map(sale => 
                        `<div style="padding: 10px; border-left: 3px solid #ffd700; margin-bottom: 10px;">
                            <strong>${Utils.sanitizeHtml(sale.customerName)}</strong> - ${Utils.sanitizeHtml(sale.watchName)}<br>
                            <span style="color: #1a237e;">${Utils.formatCurrency(sale.totalAmount)}</span>
                        </div>`
                    ).join('');
                } else {
                    recentSalesDiv.innerHTML = '<p style="color: #666; padding: 10px;">No sales yet</p>';
                }
            } else {
                recentSalesDiv.innerHTML = '<p style="color: #666; padding: 10px;">No sales data</p>';
            }
        }

        // Update incomplete services from localStorage
        const incompleteServicesDiv = document.getElementById('incompleteServicesList');
        if (incompleteServicesDiv) {
            const servicesData = localStorage.getItem('zedson_services');
            if (servicesData) {
                const services = JSON.parse(servicesData);
                const incompleteServices = services
                    .filter(service => service.status !== 'completed')
                    .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
                    .slice(0, 3);
                
                if (incompleteServices.length > 0) {
                    incompleteServicesDiv.innerHTML = incompleteServices.map(service => 
                        `<div style="padding: 10px; border-left: 3px solid #ffd700; margin-bottom: 10px;">
                            <strong>${Utils.sanitizeHtml(service.customerName)}</strong> - ${Utils.sanitizeHtml(service.brand)} ${Utils.sanitizeHtml(service.model)}<br>
                            <span style="color: #1a237e;">${Utils.sanitizeHtml(service.issue)} (${Utils.sanitizeHtml(service.status)})</span>
                        </div>`
                    ).join('');
                } else {
                    incompleteServicesDiv.innerHTML = '<p style="color: #666; padding: 10px;">No incomplete services</p>';
                }
            } else {
                incompleteServicesDiv.innerHTML = '<p style="color: #666; padding: 10px;">No services data</p>';
            }
        }
    } catch (error) {
        console.error('Error updating recent activities:', error);
        const recentSalesDiv = document.getElementById('recentSales');
        const incompleteServicesDiv = document.getElementById('incompleteServicesList');
        
        if (recentSalesDiv) recentSalesDiv.innerHTML = '<p style="color: #dc3545; padding: 10px;">Error loading data</p>';
        if (incompleteServicesDiv) incompleteServicesDiv.innerHTML = '<p style="color: #dc3545; padding: 10px;">Error loading data</p>';
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
        console.log('Revenue analytics not available for staff users');
        return;
    }
    
    const modal = document.getElementById('revenueAnalyticsModal');
    if (!modal) {
        console.log('Revenue analytics modal not found');
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
 * Apply Revenue Filter from localStorage
 */
async function applyRevenueFilter() {
    const filterType = document.getElementById('revenueFilterType')?.value;
    const revenueType = document.getElementById('revenueTypeFilter')?.value || 'all';
    const includeExpenses = document.getElementById('includeExpenses')?.checked || false;
    const resultsDiv = document.getElementById('revenueFilterResults');
    
    if (!filterType || !resultsDiv) return;
    
    try {
        showLoadingIndicator(true);
        
        console.log('📊 Applying revenue filter...');
        
        let filteredSales = [];
        let filteredServices = [];
        let filteredExpenses = [];
        let title = '';
        
        // Get data from localStorage
        const salesData = localStorage.getItem('zedson_sales');
        const servicesData = localStorage.getItem('zedson_services');
        const expensesData = localStorage.getItem('zedson_expenses');
        
        const allSales = salesData ? JSON.parse(salesData) : [];
        const allServices = servicesData ? JSON.parse(servicesData) : [];
        const allExpenses = expensesData ? JSON.parse(expensesData) : [];
        
        if (filterType === 'dateRange') {
            const fromDate = document.getElementById('revenueFromDate')?.value;
            const toDate = document.getElementById('revenueToDate')?.value;
            
            if (!fromDate || !toDate) {
                console.log('Date range not selected');
                return;
            }
            
            const from = new Date(fromDate);
            const to = new Date(toDate);
            
            filteredSales = allSales.filter(sale => {
                const saleDate = new Date(sale.timestamp || sale.date);
                return saleDate >= from && saleDate <= to;
            });
            
            filteredServices = allServices.filter(service => {
                const serviceDate = new Date(service.timestamp || service.date);
                return service.status === 'completed' && serviceDate >= from && serviceDate <= to;
            });
            
            if (includeExpenses) {
                filteredExpenses = allExpenses.filter(expense => {
                    const expenseDate = new Date(expense.timestamp || expense.date);
                    return expenseDate >= from && expenseDate <= to;
                });
            }
            
            title = `Transactions from ${Utils.formatDate(from)} to ${Utils.formatDate(to)}`;
            
        } else if (filterType === 'monthly') {
            const month = document.getElementById('revenueMonth')?.value;
            const year = document.getElementById('revenueYear')?.value;
            
            if (month === null || !year) return;
            
            filteredSales = allSales.filter(sale => {
                const saleDate = new Date(sale.timestamp || sale.date);
                return saleDate.getMonth() === parseInt(month) && saleDate.getFullYear() === parseInt(year);
            });
            
            filteredServices = allServices.filter(service => {
                const serviceDate = new Date(service.timestamp || service.date);
                return service.status === 'completed' && 
                       serviceDate.getMonth() === parseInt(month) && 
                       serviceDate.getFullYear() === parseInt(year);
            });
            
            if (includeExpenses) {
                filteredExpenses = allExpenses.filter(expense => {
                    const expenseDate = new Date(expense.timestamp || expense.date);
                    return expenseDate.getMonth() === parseInt(month) && expenseDate.getFullYear() === parseInt(year);
                });
            }
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            title = `Transactions for ${monthNames[month]} ${year}`;
            
        } else {
            // Show all transactions
            filteredSales = allSales;
            filteredServices = allServices.filter(s => s.status === 'completed');
            if (includeExpenses) {
                filteredExpenses = allExpenses;
            }
            title = 'All Transactions';
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
        const salesAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const servicesAmount = filteredServices.reduce((sum, service) => sum + (service.cost || 0), 0);
        const expensesAmount = includeExpenses ? filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0) : 0;
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
                    <td>${Utils.sanitizeHtml(expense.formattedDate || expense.date)}</td>
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
                            ${tableRows || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No transactions found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        console.log('✅ Revenue filter applied successfully');
        
    } catch (error) {
        console.error('Error applying revenue filter:', error);
        resultsDiv.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading data</p>';
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
            
            console.log('Item deleted successfully');
            updateDashboardOffline();
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
 * Initialize application - NO ANNOYING POPUPS
 */
async function initializeApp() {
    console.log('🚀 Initializing ZEDSON WATCHCRAFT Management System...');
    
    try {
        // Update connection status immediately
        updateDatabaseStatus('connecting', 'Starting System...');
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Set to ready state
        updateDatabaseStatus('connected', '✓ System Ready');
        
        // Initialize logging first
        if (window.LoggingModule) {
            try {
                LoggingModule.initializeLogging();
            } catch (error) {
                console.log('Logging module not available');
            }
        }
        
        // Load modal templates
        if (window.AppExtendedModule && AppExtendedModule.loadModalTemplates) {
            try {
                AppExtendedModule.loadModalTemplates();
            } catch (error) {
                console.log('Modal templates not available');
            }
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Show login screen initially
        showLoginScreen();
        
        // Log system startup
        if (window.logAction) {
            logAction('System initialized successfully');
        }
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('Error during application initialization:', error);
        updateDatabaseStatus('connected', '✓ System Ready');
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
    updateSectionData: updateSectionDataOffline,
    getTodayDate,
    getTodayRevenue: getTodayRevenueOffline,
    updateDashboard: updateDashboardOffline,
    updateDashboardVisibility,
    updateRecentActivities: updateRecentActivitiesOffline,
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