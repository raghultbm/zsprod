// ZEDSON WATCHCRAFT - Simplified Application Core
// Developed by PULSEWARE❤️

/**
 * Main Application Controller - MongoDB Only, No Reference Data
 */

console.log('🔧 SIMPLIFIED APP CORE LOADED');

/**
 * Navigation function
 */
function showSection(sectionId, button) {
    // Check permissions
    if (!AuthModule.hasPermission(sectionId)) {
        console.log('Permission denied for section:', sectionId);
        return;
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
 * Update data when switching sections - MongoDB only
 */
async function updateSectionData(sectionId) {
    try {
        console.log(`🔄 Loading section: ${sectionId}`);
        
        switch (sectionId) {
            case 'dashboard':
                await updateDashboard();
                break;
            case 'inventory':
                await loadModuleData('inventory');
                if (window.InventoryModule && window.InventoryModule.renderWatchTable) {
                    window.InventoryModule.renderWatchTable();
                }
                break;
            case 'customers':
                await loadModuleData('customers');
                if (window.CustomerModule && window.CustomerModule.renderCustomerTable) {
                    window.CustomerModule.renderCustomerTable();
                }
                break;
            case 'sales':
                await loadModuleData('sales');
                if (window.SalesModule && window.SalesModule.renderSalesTable) {
                    window.SalesModule.renderSalesTable();
                }
                break;
            case 'service':
                await loadModuleData('services');
                if (window.ServiceModule && window.ServiceModule.renderServiceTable) {
                    window.ServiceModule.renderServiceTable();
                }
                break;
            case 'expenses':
                await loadModuleData('expenses');
                if (window.ExpenseModule && window.ExpenseModule.renderExpenseTable) {
                    window.ExpenseModule.renderExpenseTable();
                }
                break;
            case 'invoices':
                await loadModuleData('invoices');
                if (window.InvoiceModule && window.InvoiceModule.renderInvoiceTable) {
                    window.InvoiceModule.renderInvoiceTable();
                }
                break;
        }
        
        console.log(`✅ Section loaded: ${sectionId}`);
        
    } catch (error) {
        console.error('Error updating section data:', error);
    }
}

/**
 * Load module data from MongoDB ONLY - NO reference data fallback
 */
async function loadModuleData(type) {
    try {
        let response;
        
        switch (type) {
            case 'customers':
                response = await window.apiService.getCustomers();
                if (response.success && window.CustomerModule) {
                    window.CustomerModule.customers = response.data || [];
                    console.log(`📥 Loaded ${response.data.length} customers from MongoDB`);
                }
                break;
            case 'inventory':
                response = await window.apiService.getInventory();
                if (response.success && window.InventoryModule) {
                    window.InventoryModule.watches = response.data || [];
                    console.log(`📥 Loaded ${response.data.length} inventory items from MongoDB`);
                }
                break;
            case 'sales':
                response = await window.apiService.getSales();
                if (response.success && window.SalesModule) {
                    window.SalesModule.sales = response.data || [];
                    console.log(`📥 Loaded ${response.data.length} sales from MongoDB`);
                }
                break;
            case 'services':
                response = await window.apiService.getServices();
                if (response.success && window.ServiceModule) {
                    window.ServiceModule.services = response.data || [];
                    console.log(`📥 Loaded ${response.data.length} services from MongoDB`);
                }
                break;
            case 'expenses':
                response = await window.apiService.getExpenses();
                if (response.success && window.ExpenseModule) {
                    window.ExpenseModule.expenses = response.data || [];
                    console.log(`📥 Loaded ${response.data.length} expenses from MongoDB`);
                }
                break;
            case 'invoices':
                response = await window.apiService.getInvoices();
                if (response.success && window.InvoiceModule) {
                    window.InvoiceModule.invoices = response.data || [];
                    console.log(`📥 Loaded ${response.data.length} invoices from MongoDB`);
                }
                break;
        }
        
        // Save to localStorage for offline access
        if (response && response.success) {
            localStorage.setItem(`zedson_${type}`, JSON.stringify(response.data));
        }
        
    } catch (error) {
        console.error(`Error loading ${type} data from MongoDB:`, error);
        // Try loading from localStorage as fallback only
        try {
            const stored = localStorage.getItem(`zedson_${type}`);
            if (stored) {
                const data = JSON.parse(stored);
                console.log(`📁 Using cached data for ${type}`);
                setModuleData(type, data);
            } else {
                console.log(`⚠️ No cached data available for ${type}`);
                setModuleData(type, []); // Empty array, no reference data
            }
        } catch (storageError) {
            console.error(`Error loading from localStorage:`, storageError);
            setModuleData(type, []); // Empty array, no reference data
        }
    }
}

/**
 * Set module data
 */
function setModuleData(type, data) {
    switch (type) {
        case 'customers':
            if (window.CustomerModule) window.CustomerModule.customers = data;
            break;
        case 'inventory':
            if (window.InventoryModule) window.InventoryModule.watches = data;
            break;
        case 'sales':
            if (window.SalesModule) window.SalesModule.sales = data;
            break;
        case 'services':
            if (window.ServiceModule) window.ServiceModule.services = data;
            break;
        case 'expenses':
            if (window.ExpenseModule) window.ExpenseModule.expenses = data;
            break;
        case 'invoices':
            if (window.InvoiceModule) window.InvoiceModule.invoices = data;
            break;
    }
}

/**
 * Update dashboard statistics from MongoDB
 */
async function updateDashboard() {
    try {
        console.log('📊 Updating dashboard from MongoDB...');
        
        const currentUser = AuthModule.getCurrentUser();
        const isStaff = currentUser && currentUser.role === 'staff';
        
        // Get stats from MongoDB
        let stats;
        try {
            const response = await window.apiService.getDashboardStats();
            stats = response.success ? response.data : null;
        } catch (error) {
            console.log('⚠️ API stats failed, calculating from cached data');
            stats = null;
        }
        
        // If MongoDB fails, calculate from localStorage (cached data only)
        if (!stats) {
            stats = calculateLocalStats();
        }
        
        // Update statistics cards
        if (!isStaff) {
            updateElement('totalWatches', stats.totalWatches || 0);
            updateElement('totalCustomers', stats.totalCustomers || 0);
            updateElement('totalInvoices', stats.totalInvoices || 0);
        }
        
        updateElement('todayRevenue', Utils.formatCurrency(stats.todayRevenue || 0));
        updateElement('incompleteServices', stats.incompleteServices || 0);

        // Update dashboard visibility based on user role
        updateDashboardVisibility();
        
        // Update recent activities
        await updateRecentActivities();
        
        console.log('✅ Dashboard updated successfully from MongoDB');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

/**
 * Calculate statistics from localStorage (cached data only)
 */
function calculateLocalStats() {
    try {
        const customers = JSON.parse(localStorage.getItem('zedson_customers') || '[]');
        const inventory = JSON.parse(localStorage.getItem('zedson_inventory') || '[]');
        const sales = JSON.parse(localStorage.getItem('zedson_sales') || '[]');
        const services = JSON.parse(localStorage.getItem('zedson_services') || '[]');
        const invoices = JSON.parse(localStorage.getItem('zedson_invoices') || '[]');

        const today = new Date().toLocaleDateString('en-IN');
        const todayRevenue = sales
            .filter(sale => sale.date === today)
            .reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

        const incompleteServices = services.filter(s => s.status !== 'completed').length;

        return {
            totalWatches: inventory.length,
            totalCustomers: customers.length,
            totalSales: sales.length,
            totalServices: services.length,
            incompleteServices,
            totalInvoices: invoices.length,
            todayRevenue
        };
    } catch (error) {
        console.error('Error calculating local stats:', error);
        return {
            totalWatches: 0,
            totalCustomers: 0,
            totalSales: 0,
            totalServices: 0,
            incompleteServices: 0,
            totalInvoices: 0,
            todayRevenue: 0
        };
    }
}

/**
 * Update element safely
 */
function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Update dashboard visibility based on user role
 */
function updateDashboardVisibility() {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    const statCards = document.querySelectorAll('.stat-card');
    
    if (isStaff) {
        // For staff, only show Today's Sales and Incomplete Services
        statCards.forEach(card => {
            const cardText = card.querySelector('p')?.textContent;
            if (cardText === "Today's Sales" || cardText === "Incomplete Services") {
                card.style.display = 'block';
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
        
        // Re-enable clickable functionality for Today's Sales
        const todaySalesCard = document.getElementById('todayRevenue')?.closest('.stat-card');
        if (todaySalesCard) {
            todaySalesCard.classList.add('clickable-stat');
            todaySalesCard.onclick = () => openRevenueAnalytics();
        }
    }
}

/**
 * Update recent activities from cached data only
 */
async function updateRecentActivities() {
    try {
        // Update recent sales
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

        // Update incomplete services
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
    }
}

/**
 * Open Revenue Analytics Modal
 */
function openRevenueAnalytics() {
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    if (isStaff) {
        console.log('Revenue analytics not available for staff users');
        return;
    }
    
    const modal = document.getElementById('revenueAnalyticsModal');
    if (!modal) {
        console.log('Revenue analytics modal not found');
        return;
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
}

/**
 * Modal functions
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Initialize application - MongoDB only
 */
async function initializeApp() {
    console.log('🚀 Initializing ZEDSON WATCHCRAFT Management System...');
    
    try {
        // Show login screen initially
        showLoginScreen();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('Error during application initialization:', error);
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

// Export core functions
window.AppCoreModule = {
    showSection,
    updateSectionData,
    updateDashboard,
    updateDashboardVisibility,
    updateRecentActivities,
    openRevenueAnalytics,
    closeModal,
    initializeApp,
    showLoginScreen,
    loadModuleData
};

// Make functions globally available
window.showSection = showSection;
window.updateDashboard = updateDashboard;
window.closeModal = closeModal;
window.openRevenueAnalytics = openRevenueAnalytics;