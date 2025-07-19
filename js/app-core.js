// ZEDSON WATCHCRAFT - App Core Module with Full API Integration (Phase 5)

/**
 * Main Application Controller - Core Functions with Complete API Integration
 * Enhanced with loading states, error handling, offline detection, and retry mechanisms
 */

// Application state management
let appState = {
    isOnline: navigator.onLine,
    isInitializing: false,
    moduleLoadingStates: new Map(),
    dashboardLoadingStates: new Map(),
    retryAttempts: new Map(),
    lastSuccessfulSync: new Map()
};

// Configuration
const APP_CONFIG = {
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // 1 second base delay
    HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
    DASHBOARD_REFRESH_INTERVAL: 300000, // 5 minutes
    OFFLINE_CACHE_TTL: 3600000 // 1 hour
};

/**
 * Enhanced application initialization with API integration and error handling
 */
async function initializeApp() {
    console.log('Initializing ZEDSON WATCHCRAFT Management System with Full API Integration...');
    
    if (appState.isInitializing) {
        console.log('App already initializing, skipping...');
        return;
    }
    
    appState.isInitializing = true;
    
    try {
        // Show global loading state
        showGlobalLoadingState('Initializing application...');
        
        // Initialize logging first
        if (window.LoggingModule) {
            LoggingModule.initializeLogging();
            LoggingModule.logAction('Application initialization started', { 
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                onlineStatus: appState.isOnline
            }, 'system');
        }
        
        // Setup offline/online detection
        setupNetworkStatusMonitoring();
        
        // Initialize API health monitoring
        await initializeAPIHealthMonitoring();
        
        // Check for existing authentication with retry mechanism
        const user = await withRetry('auth-init', async () => {
            return await AuthModule.initializeAuth();
        });
        
        if (user) {
            // User is already logged in
            console.log('User already authenticated:', user.username);
            showGlobalLoadingState('Loading user session...');
            AuthModule.completeLogin(user);
        } else {
            // Show login screen
            console.log('No authenticated user, showing login screen');
            hideGlobalLoadingState();
            showLoginScreen();
        }
        
        // Load modal templates
        if (window.AppExtendedModule && AppExtendedModule.loadModalTemplates) {
            AppExtendedModule.loadModalTemplates();
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup periodic health checks
        setupPeriodicHealthChecks();
        
        console.log('Application initialized successfully with Full API Integration');
        
        if (window.LoggingModule) {
            LoggingModule.logAction('Application initialization completed successfully', {
                hasUser: !!user,
                modulesCount: getLoadedModulesCount()
            }, 'system');
        }
        
    } catch (error) {
        console.error('Critical error during application initialization:', error);
        handleCriticalError('Failed to initialize application', error);
        
        if (window.LoggingModule) {
            LoggingModule.logAction('Application initialization failed', {
                error: error.message,
                stack: error.stack
            }, 'error');
        }
        
    } finally {
        appState.isInitializing = false;
        hideGlobalLoadingState();
    }
}

/**
 * Enhanced module initialization with comprehensive API integration and error handling
 */
async function initializeModulesAfterLogin() {
    try {
        showGlobalLoadingState('Loading application modules...');
        
        console.log('Initializing modules with API integration...');
        const moduleInitPromises = [];
        
        // Initialize customer module with API data (highest priority)
        if (window.CustomerModule) {
            const customerPromise = initializeModuleWithRetry('customers', async () => {
                showModuleLoadingState('customers', 'Loading customers...');
                await CustomerModule.initializeCustomers();
                hideModuleLoadingState('customers');
                appState.lastSuccessfulSync.set('customers', Date.now());
            });
            moduleInitPromises.push(customerPromise);
        }
        
        // Initialize inventory module with API data
        if (window.InventoryModule) {
            const inventoryPromise = initializeModuleWithRetry('inventory', async () => {
                showModuleLoadingState('inventory', 'Loading inventory...');
                await InventoryModule.initializeInventory();
                hideModuleLoadingState('inventory');
                appState.lastSuccessfulSync.set('inventory', Date.now());
            });
            moduleInitPromises.push(inventoryPromise);
        }
        
        // Initialize sales module with API data
        if (window.SalesModule) {
            const salesPromise = initializeModuleWithRetry('sales', async () => {
                showModuleLoadingState('sales', 'Loading sales data...');
                await SalesModule.initializeSales();
                hideModuleLoadingState('sales');
                appState.lastSuccessfulSync.set('sales', Date.now());
            });
            moduleInitPromises.push(salesPromise);
        }
        
        // Initialize service module with API data
        if (window.ServiceModule) {
            const servicePromise = initializeModuleWithRetry('services', async () => {
                showModuleLoadingState('services', 'Loading service requests...');
                await ServiceModule.initializeServices();
                hideModuleLoadingState('services');
                appState.lastSuccessfulSync.set('services', Date.now());
            });
            moduleInitPromises.push(servicePromise);
        }
        
        // Initialize expense module with API data
        if (window.ExpenseModule) {
            const expensePromise = initializeModuleWithRetry('expenses', async () => {
                showModuleLoadingState('expenses', 'Loading expenses...');
                await ExpenseModule.initializeExpenses();
                hideModuleLoadingState('expenses');
                appState.lastSuccessfulSync.set('expenses', Date.now());
            });
            moduleInitPromises.push(expensePromise);
        }
        
        // Initialize invoice module with API data
        if (window.InvoiceModule) {
            const invoicePromise = initializeModuleWithRetry('invoices', async () => {
                showModuleLoadingState('invoices', 'Loading invoices...');
                await InvoiceModule.initializeInvoices();
                hideModuleLoadingState('invoices');
                appState.lastSuccessfulSync.set('invoices', Date.now());
            });
            moduleInitPromises.push(invoicePromise);
        }
        
        // Wait for all critical modules to load (with timeout)
        await Promise.race([
            Promise.allSettled(moduleInitPromises),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Module initialization timeout')), 60000)
            )
        ]);
        
        // Update dashboard with API data
        await updateDashboardWithAPIData();
        
        // Setup automatic dashboard refresh
        setupDashboardAutoRefresh();
        
        console.log('All modules initialized successfully with API data');
        
        if (window.LoggingModule) {
            LoggingModule.logAction('All modules initialized after login', {
                modulesInitialized: Array.from(appState.lastSuccessfulSync.keys()),
                initializationTime: Date.now()
            }, 'system');
        }
        
    } catch (error) {
        console.error('Error initializing modules after login:', error);
        handleModuleInitializationError(error);
        
        if (window.LoggingModule) {
            LoggingModule.logAction('Module initialization after login failed', {
                error: error.message,
                loadedModules: Array.from(appState.lastSuccessfulSync.keys())
            }, 'error');
        }
    } finally {
        hideGlobalLoadingState();
    }
}

/**
 * Enhanced dashboard update with comprehensive API data integration
 */
async function updateDashboardWithAPIData() {
    const currentUser = AuthModule.getCurrentUser();
    if (!currentUser) return;
    
    const isStaff = currentUser.role === 'staff';
    
    try {
        console.log('Updating dashboard with API data...');
        showDashboardLoadingStates();
        
        // Collect all dashboard update promises
        const dashboardPromises = [];
        
        // Update inventory statistics (non-staff only)
        if (!isStaff && window.InventoryModule) {
            dashboardPromises.push(
                updateInventoryStats().catch(error => {
                    console.warn('Inventory stats update failed:', error);
                    return null;
                })
            );
        }
        
        // Update customer statistics (non-staff only)
        if (!isStaff && window.CustomerModule) {
            dashboardPromises.push(
                updateCustomerStats().catch(error => {
                    console.warn('Customer stats update failed:', error);
                    return null;
                })
            );
        }
        
        // Update today's revenue (includes sales + services)
        dashboardPromises.push(
            updateTodayRevenue().catch(error => {
                console.warn('Revenue stats update failed:', error);
                return null;
            })
        );
        
        // Update service statistics (visible for all users)
        if (window.ServiceModule) {
            dashboardPromises.push(
                updateServiceStats().catch(error => {
                    console.warn('Service stats update failed:', error);
                    return null;
                })
            );
        }
        
        // Update invoice statistics (non-staff only)
        if (!isStaff && window.InvoiceModule) {
            dashboardPromises.push(
                updateInvoiceStats().catch(error => {
                    console.warn('Invoice stats update failed:', error);
                    return null;
                })
            );
        }
        
        // Wait for all dashboard updates (allow partial failures)
        await Promise.allSettled(dashboardPromises);
        
        // Update dashboard visibility based on user role
        updateDashboardVisibility();
        
        // Update recent activities with API data
        await updateRecentActivitiesWithAPI();
        
        console.log('Dashboard updated successfully with API data');
        
    } catch (error) {
        console.error('Error updating dashboard with API data:', error);
        showFallbackDashboard();
    } finally {
        hideDashboardLoadingStates();
    }
}

/**
 * Update inventory statistics with API integration
 */
async function updateInventoryStats() {
    try {
        showCardLoadingState('totalWatches');
        
        const stats = await apiHelpers.withLoadingAndCache(
            'inventory-stats',
            'dashboard_inventory_stats',
            () => api.watches.getWatchStats(),
            60000 // 1 minute cache
        );
        
        if (stats.success) {
            const totalWatchesElement = document.getElementById('totalWatches');
            if (totalWatchesElement) {
                animateNumberUpdate(totalWatchesElement, stats.data.totalWatches || 0);
            }
        } else {
            throw new Error(stats.message || 'Failed to load inventory stats');
        }
        
    } catch (error) {
        console.error('Inventory stats error:', error);
        // Fallback to local data if available
        if (window.InventoryModule) {
            const localStats = InventoryModule.getInventoryStats();
            const totalWatchesElement = document.getElementById('totalWatches');
            if (totalWatchesElement && localStats) {
                totalWatchesElement.textContent = localStats.totalWatches || 0;
            }
        }
        throw error;
    } finally {
        hideCardLoadingState('totalWatches');
    }
}

/**
 * Update customer statistics with API integration
 */
async function updateCustomerStats() {
    try {
        showCardLoadingState('totalCustomers');
        
        const stats = await apiHelpers.withLoadingAndCache(
            'customer-stats',
            'dashboard_customer_stats',
            () => api.customers.getCustomerStats(),
            60000 // 1 minute cache
        );
        
        if (stats.success) {
            const totalCustomersElement = document.getElementById('totalCustomers');
            if (totalCustomersElement) {
                animateNumberUpdate(totalCustomersElement, stats.data.totalCustomers || 0);
            }
        } else {
            throw new Error(stats.message || 'Failed to load customer stats');
        }
        
    } catch (error) {
        console.error('Customer stats error:', error);
        // Fallback to local data if available
        if (window.CustomerModule) {
            const localStats = CustomerModule.getCustomerStats?.();
            const totalCustomersElement = document.getElementById('totalCustomers');
            if (totalCustomersElement && localStats) {
                totalCustomersElement.textContent = localStats.totalCustomers || 0;
            }
        }
        throw error;
    } finally {
        hideCardLoadingState('totalCustomers');
    }
}

/**
 * Update today's revenue with API integration (Sales + Services)
 */
async function updateTodayRevenue() {
    try {
        showCardLoadingState('todayRevenue');
        
        const today = new Date();
        const dateFilter = {
            date: today.toISOString().split('T')[0]
        };
        
        // Get today's sales and service revenue in parallel
        const [salesResponse, servicesResponse] = await Promise.allSettled([
            apiHelpers.withLoadingAndCache(
                'today-sales',
                `dashboard_sales_${dateFilter.date}`,
                () => api.sales.getSaleStats(dateFilter),
                300000 // 5 minute cache
            ),
            apiHelpers.withLoadingAndCache(
                'today-services',
                `dashboard_services_${dateFilter.date}`,
                () => api.services.getServiceStats(dateFilter),
                300000 // 5 minute cache
            )
        ]);
        
        let totalRevenue = 0;
        
        // Process sales revenue
        if (salesResponse.status === 'fulfilled' && salesResponse.value.success) {
            totalRevenue += salesResponse.value.data.todayRevenue || 0;
        } else {
            console.warn('Sales revenue API failed, using fallback');
            // Fallback to local calculation
            const localRevenue = getTodayRevenue();
            totalRevenue += localRevenue.salesRevenue || 0;
        }
        
        // Process services revenue
        if (servicesResponse.status === 'fulfilled' && servicesResponse.value.success) {
            totalRevenue += servicesResponse.value.data.todayRevenue || 0;
        } else {
            console.warn('Services revenue API failed, using fallback');
            // Fallback to local calculation
            const localRevenue = getTodayRevenue();
            totalRevenue += localRevenue.servicesRevenue || 0;
        }
        
        // Update display
        const todayRevenueElement = document.getElementById('todayRevenue');
        if (todayRevenueElement) {
            animateCurrencyUpdate(todayRevenueElement, totalRevenue);
        }
        
        // Update label
        const labelElement = todayRevenueElement?.nextElementSibling;
        if (labelElement && labelElement.tagName === 'P') {
            labelElement.textContent = "Today's Sales";
        }
        
    } catch (error) {
        console.error('Today revenue error:', error);
        // Fallback to local calculation
        const localRevenue = getTodayRevenue();
        const todayRevenueElement = document.getElementById('todayRevenue');
        if (todayRevenueElement) {
            todayRevenueElement.textContent = Utils.formatCurrency(localRevenue.totalRevenue || 0);
        }
        throw error;
    } finally {
        hideCardLoadingState('todayRevenue');
    }
}

/**
 * Update service statistics with API integration
 */
async function updateServiceStats() {
    try {
        showCardLoadingState('incompleteServices');
        
        const stats = await apiHelpers.withLoadingAndCache(
            'service-stats',
            'dashboard_service_stats',
            () => api.services.getServiceStats(),
            300000 // 5 minute cache
        );
        
        if (stats.success) {
            const incompleteServicesElement = document.getElementById('incompleteServices');
            if (incompleteServicesElement) {
                animateNumberUpdate(incompleteServicesElement, stats.data.incompleteServices || 0);
            }
        } else {
            throw new Error(stats.message || 'Failed to load service stats');
        }
        
    } catch (error) {
        console.error('Service stats error:', error);
        // Fallback to local data if available
        if (window.ServiceModule) {
            const localStats = ServiceModule.getServiceStats?.();
            const incompleteServicesElement = document.getElementById('incompleteServices');
            if (incompleteServicesElement && localStats) {
                incompleteServicesElement.textContent = localStats.incompleteServices || 0;
            }
        }
        throw error;
    } finally {
        hideCardLoadingState('incompleteServices');
    }
}

/**
 * Update invoice statistics with API integration
 */
async function updateInvoiceStats() {
    try {
        showCardLoadingState('totalInvoices');
        
        const stats = await apiHelpers.withLoadingAndCache(
            'invoice-stats',
            'dashboard_invoice_stats',
            () => api.invoices.getInvoiceStats(),
            300000 // 5 minute cache
        );
        
        if (stats.success) {
            const totalInvoicesElement = document.getElementById('totalInvoices');
            if (totalInvoicesElement) {
                animateNumberUpdate(totalInvoicesElement, stats.data.totalInvoices || 0);
            }
        } else {
            throw new Error(stats.message || 'Failed to load invoice stats');
        }
        
    } catch (error) {
        console.error('Invoice stats error:', error);
        // Fallback to local data if available
        if (window.InvoiceModule) {
            const localStats = InvoiceModule.getInvoiceStats?.();
            const totalInvoicesElement = document.getElementById('totalInvoices');
            if (totalInvoicesElement && localStats) {
                totalInvoicesElement.textContent = localStats.totalInvoices || 0;
            }
        }
        throw error;
    } finally {
        hideCardLoadingState('totalInvoices');
    }
}

/**
 * Update recent activities with API data
 */
async function updateRecentActivitiesWithAPI() {
    try {
        // Update recent sales with API data
        await updateRecentSalesWithAPI();
        
        // Update incomplete services with API data
        await updateIncompleteServicesWithAPI();
        
    } catch (error) {
        console.error('Error updating recent activities:', error);
        // Fallback to local data
        updateRecentActivities();
    }
}

/**
 * Update recent sales with API data
 */
async function updateRecentSalesWithAPI() {
    const recentSalesDiv = document.getElementById('recentSales');
    if (!recentSalesDiv) return;
    
    try {
        const response = await apiHelpers.withCache(
            'recent_sales',
            () => api.sales.getSales({ limit: 3, sort: '-createdAt' }),
            300000 // 5 minute cache
        );
        
        if (response.success && response.data.length > 0) {
            recentSalesDiv.innerHTML = response.data.map(sale => {
                const customerName = sale.customerName || 'Unknown Customer';
                const watchName = sale.items?.[0]?.watchName || sale.watchName || 'Unknown Item';
                const amount = sale.totalAmount || 0;
                
                return `<div style="padding: 10px; border-left: 3px solid #ffd700; margin-bottom: 10px;">
                    <strong>${Utils.sanitizeHtml(customerName)}</strong> - ${Utils.sanitizeHtml(watchName)}<br>
                    <span style="color: #1a237e;">${Utils.formatCurrency(amount)}</span>
                </div>`;
            }).join('');
        } else {
            recentSalesDiv.innerHTML = 'No recent sales';
        }
        
    } catch (error) {
        console.warn('Failed to load recent sales from API:', error);
        // Fallback to local data
        if (window.SalesModule) {
            const recentSales = SalesModule.getRecentSales?.(3) || [];
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
    }
}

/**
 * Update incomplete services with API data
 */
async function updateIncompleteServicesWithAPI() {
    const incompleteServicesDiv = document.getElementById('incompleteServicesList');
    if (!incompleteServicesDiv) return;
    
    try {
        const response = await apiHelpers.withCache(
            'incomplete_services',
            () => api.services.getServices({ 
                status: ['pending', 'in-progress', 'on-hold'], 
                limit: 3, 
                sort: '-createdAt' 
            }),
            300000 // 5 minute cache
        );
        
        if (response.success && response.data.length > 0) {
            incompleteServicesDiv.innerHTML = response.data.map(service => {
                const customerName = service.customerName || 'Unknown Customer';
                const watchName = service.watchName || 
                    `${service.watchDetails?.brand || ''} ${service.watchDetails?.model || ''}`.trim() ||
                    'Unknown Watch';
                const issue = service.issue || 'No description';
                const status = service.status || 'pending';
                
                return `<div style="padding: 10px; border-left: 3px solid #ffd700; margin-bottom: 10px;">
                    <strong>${Utils.sanitizeHtml(customerName)}</strong> - ${Utils.sanitizeHtml(watchName)}<br>
                    <span style="color: #1a237e;">${Utils.sanitizeHtml(issue)} (${Utils.sanitizeHtml(status)})</span>
                </div>`;
            }).join('');
        } else {
            incompleteServicesDiv.innerHTML = 'No incomplete services';
        }
        
    } catch (error) {
        console.warn('Failed to load incomplete services from API:', error);
        // Fallback to local data
        if (window.ServiceModule) {
            const incompleteServices = ServiceModule.getIncompleteServices?.(3) || [];
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
}

/**
 * Enhanced navigation with API data loading
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

    // Update section-specific data with API integration
    updateSectionDataWithAPI(sectionId);
}

/**
 * Enhanced section data update with API integration
 */
async function updateSectionDataWithAPI(sectionId) {
    try {
        showSectionLoadingState(sectionId);
        
        switch (sectionId) {
            case 'dashboard':
                await updateDashboardWithAPIData();
                break;
            case 'inventory':
                if (window.InventoryModule) {
                    await refreshModuleWithRetry('inventory', () => 
                        InventoryModule.refreshWatches?.() || InventoryModule.renderWatchTable()
                    );
                }
                break;
            case 'customers':
                if (window.CustomerModule) {
                    await refreshModuleWithRetry('customers', () => 
                        CustomerModule.refreshCustomers?.() || CustomerModule.renderCustomerTable()
                    );
                }
                break;
            case 'users':
                if (AuthModule.getCurrentUser()?.role === 'admin') {
                    await refreshModuleWithRetry('users', () => 
                        AuthModule.updateUserTable()
                    );
                }
                break;
            case 'sales':
                if (window.SalesModule) {
                    await refreshModuleWithRetry('sales', () => 
                        SalesModule.refreshSales?.() || SalesModule.renderSalesTable()
                    );
                }
                break;
            case 'service':
                if (window.ServiceModule) {
                    await refreshModuleWithRetry('services', () => 
                        ServiceModule.refreshServices?.() || ServiceModule.renderServiceTable()
                    );
                }
                break;
            case 'expenses':
                if (window.ExpenseModule) {
                    await refreshModuleWithRetry('expenses', () => 
                        ExpenseModule.refreshExpenses?.() || ExpenseModule.renderExpenseTable()
                    );
                }
                break;
            case 'invoices':
                if (window.InvoiceModule) {
                    await refreshModuleWithRetry('invoices', () => 
                        InvoiceModule.refreshInvoices?.() || InvoiceModule.renderInvoiceTable()
                    );
                }
                break;
        }
        
    } catch (error) {
        console.warn(`Failed to refresh section ${sectionId}:`, error);
        handleSectionRefreshError(sectionId, error);
    } finally {
        hideSectionLoadingState(sectionId);
    }
}

/**
 * API Health Monitoring
 */
async function initializeAPIHealthMonitoring() {
    try {
        const healthCheck = await checkAPIHealth();
        if (!healthCheck.healthy) {
            console.warn('API health check failed, enabling offline mode');
            enableOfflineMode('API not responding');
        } else {
            console.log('API health check passed');
            if (!appState.isOnline) {
                enableOnlineMode();
            }
        }
    } catch (error) {
        console.error('API health monitoring initialization failed:', error);
        enableOfflineMode('Health monitoring failed');
    }
}

/**
 * Check API health
 */
async function checkAPIHealth() {
    try {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        return {
            healthy: response.ok,
            status: response.status,
            responseTime: responseTime
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            responseTime: null
        };
    }
}

/**
 * Network status monitoring
 */
function setupNetworkStatusMonitoring() {
    window.addEventListener('online', () => {
        console.log('Network connection restored');
        appState.isOnline = true;
        enableOnlineMode();
    });
    
    window.addEventListener('offline', () => {
        console.log('Network connection lost');
        appState.isOnline = false;
        enableOfflineMode('Network connection lost');
    });
    
    // Periodic connectivity check
    setInterval(async () => {
        if (appState.isOnline) {
            const healthCheck = await checkAPIHealth();
            if (!healthCheck.healthy) {
                enableOfflineMode('API health check failed');
            }
        }
    }, APP_CONFIG.HEALTH_CHECK_INTERVAL);
}

/**
 * Enable offline mode with graceful degradation
 */
function enableOfflineMode(reason) {
    console.log('Enabling offline mode:', reason);
    appState.isOnline = false;
    
    // Show offline indicator
    showOfflineIndicator(reason);
    
    // Disable API-dependent features
    disableAPIFeatures();
    
    // Show cached data where available
    enableCachedDataMode();
    
    if (window.LoggingModule) {
        LoggingModule.logAction('Offline mode enabled', { reason }, 'system');
    }
}

/**
 * Enable online mode
 */
function enableOnlineMode() {
    console.log('Enabling online mode');
    appState.isOnline = true;
    
    // Hide offline indicator
    hideOfflineIndicator();
    
    // Re-enable API features
    enableAPIFeatures();
    
    // Refresh data from API
    refreshAllModulesData();
    
    if (window.LoggingModule) {
        LoggingModule.logAction('Online mode enabled', {}, 'system');
    }
}

/**
 * Retry mechanism with exponential backoff
 */
async function withRetry(operation, asyncFn, maxRetries = APP_CONFIG.MAX_RETRY_ATTEMPTS) {
    let lastError;
    let retryCount = appState.retryAttempts.get(operation) || 0;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await asyncFn();
            
            // Reset retry count on success
            appState.retryAttempts.set(operation, 0);
            
            return result;
        } catch (error) {
            lastError = error;
            retryCount++;
            appState.retryAttempts.set(operation, retryCount);
            
            console.warn(`Attempt ${attempt + 1} failed for ${operation}:`, error.message);
            
            if (attempt < maxRetries) {
                const delay = APP_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt);
                console.log(`Retrying ${operation} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error(`All ${maxRetries + 1} attempts failed for ${operation}:`, lastError);
    throw lastError;
}

/**
 * Initialize module with retry mechanism
 */
async function initializeModuleWithRetry(moduleName, initFn) {
    return withRetry(`init-${moduleName}`, initFn, 2); // Less retries for initialization
}

/**
 * Refresh module with retry mechanism
 */
async function refreshModuleWithRetry(moduleName, refreshFn) {
    return withRetry(`refresh-${moduleName}`, refreshFn, 1); // Single retry for refresh
}

/**
 * Loading state management
 */
function showGlobalLoadingState(message) {
    const loadingOverlay = document.getElementById('globalLoadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        const messageEl = loadingOverlay.querySelector('.loading-message');
        if (messageEl) messageEl.textContent = message;
    }
}

function hideGlobalLoadingState() {
    const loadingOverlay = document.getElementById('globalLoadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showModuleLoadingState(moduleName, message) {
    appState.moduleLoadingStates.set(moduleName, true);
    const loadingEl = document.getElementById(`${moduleName}LoadingIndicator`);
    if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.textContent = message;
    }
}

function hideModuleLoadingState(moduleName) {
    appState.moduleLoadingStates.set(moduleName, false);
    const loadingEl = document.getElementById(`${moduleName}LoadingIndicator`);
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

function showDashboardLoadingStates() {
    const cards = ['totalWatches', 'totalCustomers', 'todayRevenue', 'incompleteServices', 'totalInvoices'];
    cards.forEach(cardId => showCardLoadingState(cardId));
}

function hideDashboardLoadingStates() {
    const cards = ['totalWatches', 'totalCustomers', 'todayRevenue', 'incompleteServices', 'totalInvoices'];
    cards.forEach(cardId => hideCardLoadingState(cardId));
}

function showCardLoadingState(cardId) {
    appState.dashboardLoadingStates.set(cardId, true);
    const cardElement = document.getElementById(cardId);
    if (cardElement) {
        cardElement.innerHTML = '<div class="loading-spinner-small"></div>';
        cardElement.style.opacity = '0.6';
    }
}

function hideCardLoadingState(cardId) {
    appState.dashboardLoadingStates.set(cardId, false);
    const cardElement = document.getElementById(cardId);
    if (cardElement) {
        cardElement.style.opacity = '1';
    }
}

function showSectionLoadingState(sectionId) {
    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
        const loadingEl = sectionEl.querySelector('.section-loading-indicator');
        if (loadingEl) {
            loadingEl.style.display = 'block';
        }
    }
}

function hideSectionLoadingState(sectionId) {
    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
        const loadingEl = sectionEl.querySelector('.section-loading-indicator');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }
}

/**
 * Animation helpers
 */
function animateNumberUpdate(element, newValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const increment = Math.ceil((newValue - currentValue) / 20);
    let current = currentValue;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= newValue) || (increment < 0 && current <= newValue)) {
            current = newValue;
            clearInterval(timer);
        }
        element.textContent = current;
    }, 50);
}

function animateCurrencyUpdate(element, newValue) {
    element.textContent = Utils.formatCurrency(newValue);
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 200);
}

/**
 * Error handling
 */
function handleCriticalError(message, error) {
    console.error('Critical error:', message, error);
    
    Utils.showNotification(`${message}. Please refresh the page and try again.`);
    
    // Show fallback UI
    showFallbackDashboard();
}

function handleModuleInitializationError(error) {
    console.error('Module initialization error:', error);
    
    Utils.showNotification('Some modules failed to load. The application may have limited functionality.');
    
    // Try to update dashboard with whatever modules loaded successfully
    updateDashboard();
}

function handleSectionRefreshError(sectionId, error) {
    console.warn(`Section ${sectionId} refresh error:`, error);
    
    // Show section-specific error message
    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
        const errorEl = sectionEl.querySelector('.section-error-indicator');
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = `Failed to refresh ${sectionId}. Click to retry.`;
            errorEl.onclick = () => updateSectionDataWithAPI(sectionId);
        }
    }
}

function showFallbackDashboard() {
    console.log('Showing fallback dashboard with local data');
    
    // Hide loading states
    hideDashboardLoadingStates();
    
    // Update with local data if available
    updateDashboard();
}

/**
 * Offline mode management
 */
function showOfflineIndicator(reason) {
    let indicator = document.getElementById('offlineIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff6b6b;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 9999;
            font-weight: bold;
        `;
        document.body.prepend(indicator);
    }
    indicator.textContent = `Offline Mode: ${reason}. Some features may be limited.`;
    indicator.style.display = 'block';
}

function hideOfflineIndicator() {
    const indicator = document.getElementById('offlineIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function disableAPIFeatures() {
    // Disable buttons that require API
    const apiButtons = document.querySelectorAll('[data-requires-api="true"]');
    apiButtons.forEach(button => {
        button.disabled = true;
        button.title = 'This feature requires internet connection';
    });
}

function enableAPIFeatures() {
    // Re-enable API buttons
    const apiButtons = document.querySelectorAll('[data-requires-api="true"]');
    apiButtons.forEach(button => {
        button.disabled = false;
        button.title = '';
    });
}

function enableCachedDataMode() {
    console.log('Enabling cached data mode');
    // Show cached data where available
    // This is handled by individual modules using their local cache
}

/**
 * Periodic refresh setup
 */
function setupPeriodicHealthChecks() {
    setInterval(async () => {
        if (appState.isOnline) {
            try {
                const healthCheck = await checkAPIHealth();
                if (!healthCheck.healthy) {
                    enableOfflineMode('Periodic health check failed');
                }
            } catch (error) {
                console.warn('Periodic health check failed:', error);
            }
        }
    }, APP_CONFIG.HEALTH_CHECK_INTERVAL);
}

function setupDashboardAutoRefresh() {
    setInterval(async () => {
        if (appState.isOnline && !appState.isInitializing) {
            try {
                await updateDashboardWithAPIData();
                console.log('Dashboard auto-refreshed');
            } catch (error) {
                console.warn('Dashboard auto-refresh failed:', error);
            }
        }
    }, APP_CONFIG.DASHBOARD_REFRESH_INTERVAL);
}

function refreshAllModulesData() {
    // Refresh all modules when coming back online
    setTimeout(async () => {
        try {
            const refreshPromises = [];
            
            Array.from(appState.lastSuccessfulSync.keys()).forEach(moduleName => {
                switch (moduleName) {
                    case 'customers':
                        if (window.CustomerModule?.refreshCustomers) {
                            refreshPromises.push(CustomerModule.refreshCustomers());
                        }
                        break;
                    case 'inventory':
                        if (window.InventoryModule?.refreshWatches) {
                            refreshPromises.push(InventoryModule.refreshWatches());
                        }
                        break;
                    case 'sales':
                        if (window.SalesModule?.refreshSales) {
                            refreshPromises.push(SalesModule.refreshSales());
                        }
                        break;
                    case 'services':
                        if (window.ServiceModule?.refreshServices) {
                            refreshPromises.push(ServiceModule.refreshServices());
                        }
                        break;
                    case 'expenses':
                        if (window.ExpenseModule?.refreshExpenses) {
                            refreshPromises.push(ExpenseModule.refreshExpenses());
                        }
                        break;
                    case 'invoices':
                        if (window.InvoiceModule?.refreshInvoices) {
                            refreshPromises.push(InvoiceModule.refreshInvoices());
                        }
                        break;
                }
            });
            
            await Promise.allSettled(refreshPromises);
            await updateDashboardWithAPIData();
            
            console.log('All modules data refreshed after coming online');
            
        } catch (error) {
            console.error('Error refreshing modules data:', error);
        }
    }, 1000); // Small delay to allow connection to stabilize
}

/**
 * Utility functions
 */
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.classList.remove('logged-in');
}

function getLoadedModulesCount() {
    return Array.from(appState.lastSuccessfulSync.keys()).length;
}

/**
 * Enhanced event listeners setup
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
    
    // Handle retry buttons
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('retry-button')) {
            const operation = event.target.dataset.operation;
            if (operation) {
                retryOperation(operation);
            }
        }
    });
}

async function retryOperation(operation) {
    try {
        switch (operation) {
            case 'refresh-dashboard':
                await updateDashboardWithAPIData();
                break;
            case 'check-connection':
                await initializeAPIHealthMonitoring();
                break;
            default:
                console.warn('Unknown retry operation:', operation);
        }
    } catch (error) {
        console.error('Retry operation failed:', error);
        Utils.showNotification('Retry failed. Please check your connection and try again.');
    }
}

// Keep all existing functions from the original app-core.js
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

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

function updateDashboard() {
    // Fallback to original dashboard update for offline mode
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
            const customerStats = CustomerModule.getCustomerStats?.();
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
            const serviceStats = ServiceModule.getServiceStats?.();
            const incompleteServicesElement = document.getElementById('incompleteServices');
            if (incompleteServicesElement && serviceStats) {
                incompleteServicesElement.textContent = serviceStats.incompleteServices;
            }
        }

        // Hide invoices stat for staff
        if (window.InvoiceModule && !isStaff) {
            const invoiceStats = InvoiceModule.getInvoiceStats?.();
            const totalInvoicesElement = document.getElementById('totalInvoices');
            if (totalInvoicesElement && invoiceStats) {
                totalInvoicesElement.textContent = invoiceStats.totalInvoices;
            }
        }

        // Update dashboard visibility based on user role
        updateDashboardVisibility();
        
        // Update recent activities
        updateRecentActivities();
        
    } catch (error) {
        console.error('Error updating fallback dashboard:', error);
    }
}

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

function updateRecentActivities() {
    // Update recent sales
    const recentSalesDiv = document.getElementById('recentSales');
    if (recentSalesDiv && window.SalesModule) {
        const recentSales = SalesModule.getRecentSales?.(3) || [];
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
        const incompleteServices = ServiceModule.getIncompleteServices?.(3) || [];
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

function resetRevenueAnalytics() {
    // This function will be implemented in app-extended.js
    if (window.AppExtendedModule && AppExtendedModule.resetRevenueFilter) {
        AppExtendedModule.resetRevenueFilter();
    }
}

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

function confirmTransaction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Export core functions for extended module
window.AppCoreModule = {
    // Enhanced API-integrated functions
    initializeApp,
    initializeModulesAfterLogin,
    updateDashboardWithAPIData,
    showSection,
    updateSectionDataWithAPI,
    
    // API health and connectivity
    initializeAPIHealthMonitoring,
    checkAPIHealth,
    setupNetworkStatusMonitoring,
    enableOfflineMode,
    enableOnlineMode,
    
    // Retry and error handling
    withRetry,
    initializeModuleWithRetry,
    refreshModuleWithRetry,
    handleCriticalError,
    handleModuleInitializationError,
    handleSectionRefreshError,
    
    // Loading states
    showGlobalLoadingState,
    hideGlobalLoadingState,
    showModuleLoadingState,
    hideModuleLoadingState,
    showDashboardLoadingStates,
    hideDashboardLoadingStates,
    showCardLoadingState,
    hideCardLoadingState,
    
    // Legacy functions (for backwards compatibility)
    updateSectionData: updateSectionDataWithAPI,
    getTodayDate,
    getTodayRevenue,
    updateDashboard,
    updateDashboardVisibility,
    updateRecentActivities,
    openRevenueAnalytics,
    closeModal,
    deleteItem,
    confirmTransaction,
    setupEventListeners,
    
    // Application state
    appState,
    APP_CONFIG
};