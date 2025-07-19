// ZEDSON WATCHCRAFT - App Extended Module (Phase 5 - Full API Integration)

/**
 * Main Application Controller - Extended Functions with Complete API Integration
 * Revenue Analytics, Modal Templates, and Global Function Assignments
 * Enhanced with server-side processing, loading states, and comprehensive error handling
 */

// Analytics state management
let analyticsState = {
    isLoading: false,
    lastAnalyticsQuery: null,
    cachedResults: new Map(),
    loadingOperations: new Set()
};

/**
 * Enhanced Apply Revenue Filter with Full API Integration and Server-side Processing
 */
async function applyRevenueFilter() {
    if (!window.SalesModule && !window.ServiceModule) {
        Utils.showNotification('Sales or Service module not available');
        return;
    }
    
    const filterType = document.getElementById('revenueFilterType')?.value;
    const revenueType = document.getElementById('revenueTypeFilter')?.value || 'all';
    const includeExpenses = document.getElementById('includeExpenses')?.checked || false;
    const resultsDiv = document.getElementById('revenueFilterResults');
    
    if (!filterType || !resultsDiv) return;
    
    // Prevent multiple simultaneous requests
    if (analyticsState.isLoading) {
        Utils.showNotification('Analytics already loading, please wait...');
        return;
    }
    
    try {
        analyticsState.isLoading = true;
        showAnalyticsLoadingState('Loading analytics data...');
        
        let title = '';
        let dateRange = {};
        
        // Determine date range and title
        if (filterType === 'dateRange') {
            const fromDate = document.getElementById('revenueFromDate')?.value;
            const toDate = document.getElementById('revenueToDate')?.value;
            
            if (!fromDate || !toDate) {
                Utils.showNotification('Please select both from and to dates.');
                return;
            }
            
            dateRange = { fromDate, toDate };
            title = `Transactions from ${Utils.formatDate(new Date(fromDate))} to ${Utils.formatDate(new Date(toDate))}`;
            
        } else if (filterType === 'monthly') {
            const month = document.getElementById('revenueMonth')?.value;
            const year = document.getElementById('revenueYear')?.value;
            
            if (month === null || !year) return;
            
            // Calculate month's date range
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, parseInt(month) + 1, 0);
            
            dateRange = {
                fromDate: firstDay.toISOString().split('T')[0],
                toDate: lastDay.toISOString().split('T')[0]
            };
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            title = `Transactions for ${monthNames[month]} ${year}`;
            
        } else {
            // Show all transactions without any date range
            title = 'All Transactions';
        }
        
        // Create cache key for this query
        const cacheKey = `analytics_${JSON.stringify({ filterType, revenueType, includeExpenses, dateRange })}`;
        
        // Check cache first (5 minute TTL)
        if (analyticsState.cachedResults.has(cacheKey)) {
            const cachedResult = analyticsState.cachedResults.get(cacheKey);
            if (Date.now() - cachedResult.timestamp < 300000) { // 5 minutes
                console.log('Using cached analytics result');
                displayAnalyticsResults(cachedResult.data, title, revenueType, includeExpenses);
                return;
            }
        }
        
        // Fetch data from APIs with parallel requests
        const analyticsData = await fetchAnalyticsDataFromAPI(dateRange, revenueType, includeExpenses);
        
        // Cache the result
        analyticsState.cachedResults.set(cacheKey, {
            data: analyticsData,
            timestamp: Date.now()
        });
        
        // Display results
        displayAnalyticsResults(analyticsData, title, revenueType, includeExpenses);
        
        // Log analytics usage
        if (window.LoggingModule) {
            LoggingModule.logAction('Applied revenue filter', {
                filterType,
                revenueType,
                includeExpenses,
                dateRange,
                resultCount: analyticsData.totalTransactions
            }, 'analytics');
        }
        
    } catch (error) {
        console.error('Analytics error:', error);
        handleAnalyticsError(error, 'Failed to load analytics data');
        
        // Fallback to local data
        await applyRevenueFilterFallback(filterType, revenueType, includeExpenses);
        
    } finally {
        analyticsState.isLoading = false;
        hideAnalyticsLoadingState();
    }
}

/**
 * Fetch analytics data from APIs with server-side processing
 */
async function fetchAnalyticsDataFromAPI(dateRange, revenueType, includeExpenses) {
    const fetchPromises = [];
    let salesData = [];
    let servicesData = [];
    let expensesData = [];
    
    // Prepare API query parameters
    const queryParams = {
        ...dateRange,
        limit: 1000, // Reasonable limit for analytics
        sort: '-createdAt'
    };
    
    // Fetch sales data (unless filtered out)
    if (revenueType === 'all' || revenueType === 'sales') {
        fetchPromises.push(
            fetchSalesAnalyticsData(queryParams)
                .then(data => { salesData = data; })
                .catch(error => {
                    console.warn('Sales analytics API failed:', error);
                    return fetchLocalSalesData(dateRange);
                })
        );
    }
    
    // Fetch services data (unless filtered out)
    if (revenueType === 'all' || revenueType === 'services') {
        fetchPromises.push(
            fetchServicesAnalyticsData(queryParams)
                .then(data => { servicesData = data; })
                .catch(error => {
                    console.warn('Services analytics API failed:', error);
                    return fetchLocalServicesData(dateRange);
                })
        );
    }
    
    // Fetch expenses data if included
    if (includeExpenses) {
        fetchPromises.push(
            fetchExpensesAnalyticsData(queryParams)
                .then(data => { expensesData = data; })
                .catch(error => {
                    console.warn('Expenses analytics API failed:', error);
                    return fetchLocalExpensesData(dateRange);
                })
        );
    }
    
    // Wait for all API calls to complete
    await Promise.allSettled(fetchPromises);
    
    // Calculate totals and prepare combined data
    return combineAnalyticsData(salesData, servicesData, expensesData);
}

/**
 * Fetch sales analytics data from API
 */
async function fetchSalesAnalyticsData(queryParams) {
    showOperationLoadingState('sales', 'Loading sales data...');
    
    try {
        const response = await apiHelpers.withLoadingAndCache(
            'sales-analytics',
            `sales_analytics_${JSON.stringify(queryParams)}`,
            () => api.sales.getSalesAnalytics(queryParams),
            300000 // 5 minute cache
        );
        
        if (response.success) {
            return response.data.transactions || [];
        } else {
            throw new Error(response.message || 'Failed to fetch sales analytics');
        }
    } finally {
        hideOperationLoadingState('sales');
    }
}

/**
 * Fetch services analytics data from API
 */
async function fetchServicesAnalyticsData(queryParams) {
    showOperationLoadingState('services', 'Loading services data...');
    
    try {
        // Filter for completed services only
        const serviceParams = {
            ...queryParams,
            status: 'completed'
        };
        
        const response = await apiHelpers.withLoadingAndCache(
            'services-analytics',
            `services_analytics_${JSON.stringify(serviceParams)}`,
            () => api.services.getServices(serviceParams),
            300000 // 5 minute cache
        );
        
        if (response.success) {
            return response.data || [];
        } else {
            throw new Error(response.message || 'Failed to fetch services analytics');
        }
    } finally {
        hideOperationLoadingState('services');
    }
}

/**
 * Fetch expenses analytics data from API
 */
async function fetchExpensesAnalyticsData(queryParams) {
    showOperationLoadingState('expenses', 'Loading expenses data...');
    
    try {
        const response = await apiHelpers.withLoadingAndCache(
            'expenses-analytics',
            `expenses_analytics_${JSON.stringify(queryParams)}`,
            () => api.expenses.getExpenses(queryParams),
            300000 // 5 minute cache
        );
        
        if (response.success) {
            return response.data || [];
        } else {
            throw new Error(response.message || 'Failed to fetch expenses analytics');
        }
    } finally {
        hideOperationLoadingState('expenses');
    }
}

/**
 * Combine analytics data from different sources
 */
function combineAnalyticsData(salesData, servicesData, expensesData) {
    const salesAmount = salesData.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const servicesAmount = servicesData.reduce((sum, service) => sum + (service.actualCost || service.estimatedCost || service.cost || 0), 0);
    const expensesAmount = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    const totalRevenue = salesAmount + servicesAmount;
    const netAmount = totalRevenue - expensesAmount;
    const totalTransactions = salesData.length + servicesData.length + expensesData.length;
    
    // Format transactions for display
    const allTransactions = [
        ...salesData.map(sale => formatSaleForDisplay(sale)),
        ...servicesData.map(service => formatServiceForDisplay(service)),
        ...expensesData.map(expense => formatExpenseForDisplay(expense))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
    
    return {
        salesAmount,
        servicesAmount,
        expensesAmount,
        totalRevenue,
        netAmount,
        totalTransactions,
        allTransactions,
        salesCount: salesData.length,
        servicesCount: servicesData.length,
        expensesCount: expensesData.length
    };
}

/**
 * Format sale data for display
 */
function formatSaleForDisplay(sale) {
    const customerName = sale.customerName || 'Unknown Customer';
    const itemName = sale.items?.[0]?.watchName || sale.watchName || 'Unknown Item';
    const amount = sale.totalAmount || 0;
    const date = sale.saleDate || sale.createdAt || sale.date;
    
    return {
        type: 'Sales',
        date: date,
        customer: customerName,
        details: itemName,
        amount: amount,
        isIncome: true
    };
}

/**
 * Format service data for display
 */
function formatServiceForDisplay(service) {
    const customerName = service.customerName || 'Unknown Customer';
    const watchName = service.watchName || 
        `${service.watchDetails?.brand || ''} ${service.watchDetails?.model || ''}`.trim() ||
        'Unknown Watch';
    const amount = service.actualCost || service.estimatedCost || service.cost || 0;
    const date = service.completionDate || service.actualDelivery || service.updatedAt || service.createdAt;
    
    return {
        type: 'Service',
        date: date,
        customer: customerName,
        details: watchName,
        amount: amount,
        isIncome: true
    };
}

/**
 * Format expense data for display
 */
function formatExpenseForDisplay(expense) {
    const amount = expense.amount || 0;
    const date = expense.expenseDate || expense.createdAt || expense.date;
    const description = expense.description || 'No description';
    
    return {
        type: 'Expense',
        date: date,
        customer: '-',
        details: description,
        amount: amount,
        isIncome: false
    };
}

/**
 * Display analytics results with enhanced UI
 */
function displayAnalyticsResults(analyticsData, title, revenueType, includeExpenses) {
    const resultsDiv = document.getElementById('revenueFilterResults');
    if (!resultsDiv) return;
    
    // Add revenue type filter to title
    if (revenueType === 'sales') {
        title += ' (Sales Only)';
    } else if (revenueType === 'services') {
        title += ' (Services Only)';
    }
    
    // Create comprehensive statistics display
    let statsHtml = `
        <div class="analytics-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-card" style="background: #e3f2fd; border-left: 4px solid #2196f3;">
                <h3 style="color: #1976d2;">${analyticsData.totalTransactions}</h3>
                <p>Total Transactions</p>
                <small>${analyticsData.salesCount} Sales, ${analyticsData.servicesCount} Services${includeExpenses ? `, ${analyticsData.expensesCount} Expenses` : ''}</small>
            </div>
            <div class="stat-card" style="background: #e8f5e8; border-left: 4px solid #4caf50;">
                <h3 style="color: #388e3c;">${Utils.formatCurrency(analyticsData.salesAmount)}</h3>
                <p>Sales Revenue</p>
                <small>${analyticsData.salesCount} transactions</small>
            </div>
            <div class="stat-card" style="background: #fff3e0; border-left: 4px solid #ff9800;">
                <h3 style="color: #f57c00;">${Utils.formatCurrency(analyticsData.servicesAmount)}</h3>
                <p>Services Revenue</p>
                <small>${analyticsData.servicesCount} services</small>
            </div>
            <div class="stat-card" style="background: #f3e5f5; border-left: 4px solid #9c27b0;">
                <h3 style="color: #7b1fa2;">${Utils.formatCurrency(analyticsData.totalRevenue)}</h3>
                <p>Total Revenue</p>
                <small>Combined income</small>
            </div>
    `;
    
    if (includeExpenses) {
        statsHtml += `
            <div class="stat-card" style="background: #ffebee; border-left: 4px solid #f44336;">
                <h3 style="color: #d32f2f;">${Utils.formatCurrency(analyticsData.expensesAmount)}</h3>
                <p>Total Expenses</p>
                <small>${analyticsData.expensesCount} expenses</small>
            </div>
            <div class="stat-card" style="background: ${analyticsData.netAmount >= 0 ? '#e8f5e8' : '#ffebee'}; border-left: 4px solid ${analyticsData.netAmount >= 0 ? '#4caf50' : '#f44336'};">
                <h3 style="color: ${analyticsData.netAmount >= 0 ? '#388e3c' : '#d32f2f'};">${Utils.formatCurrency(analyticsData.netAmount)}</h3>
                <p>Net Amount</p>
                <small>Revenue minus expenses</small>
            </div>
        `;
    }
    
    statsHtml += '</div>';
    
    // Create transactions table with enhanced display
    let tableRows = '';
    
    if (analyticsData.allTransactions.length > 0) {
        tableRows = analyticsData.allTransactions.map(transaction => {
            const formattedDate = Utils.formatDate(new Date(transaction.date));
            const amountStyle = transaction.isIncome ? 'color: #28a745;' : 'color: #dc3545;';
            const amountPrefix = transaction.isIncome ? '' : '-';
            const typeClass = transaction.type.toLowerCase().replace(' ', '-');
            
            return `
                <tr>
                    <td><span class="status ${typeClass}">${Utils.sanitizeHtml(transaction.type)}</span></td>
                    <td>${formattedDate}</td>
                    <td>${Utils.sanitizeHtml(transaction.customer)}</td>
                    <td>${Utils.sanitizeHtml(transaction.details)}</td>
                    <td style="${amountStyle}"><strong>${amountPrefix}${Utils.formatCurrency(transaction.amount)}</strong></td>
                </tr>
            `;
        }).join('');
    } else {
        tableRows = `
            <tr>
                <td colspan="5" style="text-align: center; color: #999; padding: 20px;">
                    No transactions found for the selected criteria
                </td>
            </tr>
        `;
    }
    
    // Create export button
    const exportButton = analyticsData.totalTransactions > 0 ? 
        `<button class="btn btn-sm" onclick="exportAnalyticsData()" style="margin-left: 10px;" title="Export to CSV">
            📊 Export Data
        </button>` : '';
    
    // Display complete results
    resultsDiv.innerHTML = `
        <div class="analytics-results">
            <div class="analytics-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1a237e;">${title}</h3>
                <div>
                    <span style="font-size: 12px; color: #666;">Last updated: ${new Date().toLocaleTimeString()}</span>
                    ${exportButton}
                </div>
            </div>
            
            ${statsHtml}
            
            <div class="analytics-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px;">
                <table class="table" style="margin: 0;">
                    <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                        <tr>
                            <th style="padding: 12px;">Type</th>
                            <th style="padding: 12px;">Date</th>
                            <th style="padding: 12px;">Customer</th>
                            <th style="padding: 12px;">Details</th>
                            <th style="padding: 12px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            
            <div class="analytics-footer" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
                <strong>Note:</strong> This data is fetched from the server and may include real-time updates. 
                Revenue calculations include completed sales and services only.
                ${includeExpenses ? ' Expenses are subtracted from revenue to show net profit.' : ''}
            </div>
        </div>
    `;
    
    // Store current analytics data for export
    window.currentAnalyticsData = analyticsData;
}

/**
 * Fallback analytics using local data
 */
async function applyRevenueFilterFallback(filterType, revenueType, includeExpenses) {
    console.log('Using fallback analytics with local data');
    
    try {
        showAnalyticsLoadingState('Loading local data...');
        
        let filteredSales = [];
        let filteredServices = [];
        let filteredExpenses = [];
        let title = '';
        
        // Filter by date/time using local data
        if (filterType === 'dateRange') {
            const fromDate = document.getElementById('revenueFromDate')?.value;
            const toDate = document.getElementById('revenueToDate')?.value;
            
            if (!fromDate || !toDate) {
                Utils.showNotification('Please select both from and to dates.');
                return;
            }
            
            filteredSales = window.SalesModule?.filterSalesByDateRange?.(fromDate, toDate) || [];
            filteredServices = window.ServiceModule?.filterServicesByDateRange?.(fromDate, toDate) || [];
            if (includeExpenses && window.ExpenseModule) {
                filteredExpenses = window.ExpenseModule.getExpensesByDateRange?.(fromDate, toDate) || [];
            }
            
            title = `Transactions from ${Utils.formatDate(new Date(fromDate))} to ${Utils.formatDate(new Date(toDate))} (Local Data)`;
            
        } else if (filterType === 'monthly') {
            const month = document.getElementById('revenueMonth')?.value;
            const year = document.getElementById('revenueYear')?.value;
            
            if (month === null || !year) return;
            
            filteredSales = window.SalesModule?.filterSalesByMonth?.(month, year) || [];
            filteredServices = window.ServiceModule?.filterServicesByMonth?.(month, year) || [];
            if (includeExpenses && window.ExpenseModule) {
                filteredExpenses = window.ExpenseModule.getExpensesByMonth?.(month, year) || [];
            }
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            title = `Transactions for ${monthNames[month]} ${year} (Local Data)`;
            
        } else {
            // Show all transactions without any date range
            filteredSales = window.SalesModule?.sales || [];
            filteredServices = (window.ServiceModule?.services || []).filter(s => s.status === 'completed');
            if (includeExpenses && window.ExpenseModule) {
                filteredExpenses = window.ExpenseModule?.expenses || [];
            }
            title = 'All Transactions (Local Data)';
        }
        
        // Apply revenue type filter
        if (revenueType === 'sales') {
            filteredServices = [];
            title += ' (Sales Only)';
        } else if (revenueType === 'services') {
            filteredSales = [];
            title += ' (Services Only)';
        }
        
        // Combine data using local format
        const localAnalyticsData = combineLocalAnalyticsData(filteredSales, filteredServices, filteredExpenses);
        
        // Display results
        displayAnalyticsResults(localAnalyticsData, title, revenueType, includeExpenses);
        
    } catch (error) {
        console.error('Fallback analytics error:', error);
        handleAnalyticsError(error, 'Failed to load analytics data');
    } finally {
        hideAnalyticsLoadingState();
    }
}

/**
 * Combine local analytics data
 */
function combineLocalAnalyticsData(salesData, servicesData, expensesData) {
    const salesAmount = salesData.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const servicesAmount = servicesData.reduce((sum, service) => sum + (service.cost || 0), 0);
    const expensesAmount = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    const totalRevenue = salesAmount + servicesAmount;
    const netAmount = totalRevenue - expensesAmount;
    const totalTransactions = salesData.length + servicesData.length + expensesData.length;
    
    // Format transactions for display using local data format
    const allTransactions = [
        ...salesData.map(sale => ({
            type: 'Sales',
            date: sale.date || sale.createdAt,
            customer: sale.customerName,
            details: sale.watchName,
            amount: sale.totalAmount,
            isIncome: true
        })),
        ...servicesData.map(service => ({
            type: 'Service',
            date: service.actualDelivery || service.date || service.createdAt,
            customer: service.customerName,
            details: service.watchName,
            amount: service.cost,
            isIncome: true
        })),
        ...expensesData.map(expense => ({
            type: 'Expense',
            date: expense.formattedDate || expense.date,
            customer: '-',
            details: expense.description,
            amount: expense.amount,
            isIncome: false
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return {
        salesAmount,
        servicesAmount,
        expensesAmount,
        totalRevenue,
        netAmount,
        totalTransactions,
        allTransactions,
        salesCount: salesData.length,
        servicesCount: servicesData.length,
        expensesCount: expensesData.length
    };
}

/**
 * Enhanced Reset Revenue Filter with API cache clearing
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
    
    // Clear analytics cache
    analyticsState.cachedResults.clear();
    analyticsState.lastAnalyticsQuery = null;
    
    // Hide filter inputs
    toggleRevenueFilterInputs();
    
    // Apply filter to show all data
    applyRevenueFilter();
}

/**
 * Toggle revenue filter inputs based on filter type
 */
function toggleRevenueFilterInputs() {
    const filterType = document.getElementById('revenueFilterType')?.value;
    const dateRangeInputs = document.getElementById('dateRangeInputs');
    const monthlyInputs = document.getElementById('monthlyInputs');
    
    if (dateRangeInputs) {
        dateRangeInputs.style.display = filterType === 'dateRange' ? 'flex' : 'none';
    }
    
    if (monthlyInputs) {
        monthlyInputs.style.display = filterType === 'monthly' ? 'flex' : 'none';
    }
}

/**
 * Export analytics data to CSV
 */
function exportAnalyticsData() {
    if (!window.currentAnalyticsData || !window.currentAnalyticsData.allTransactions.length) {
        Utils.showNotification('No data to export');
        return;
    }
    
    try {
        const data = window.currentAnalyticsData;
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Create CSV headers
        const headers = ['Type', 'Date', 'Customer', 'Details', 'Amount', 'Is Income'];
        
        // Create CSV rows
        const rows = data.allTransactions.map(transaction => [
            transaction.type,
            Utils.formatDate(new Date(transaction.date)),
            transaction.customer,
            transaction.details,
            transaction.amount,
            transaction.isIncome ? 'Yes' : 'No'
        ]);
        
        // Add summary row
        rows.unshift(['', '', '', '', '', '']); // Empty row
        rows.unshift(['SUMMARY', '', '', '', '', '']);
        rows.unshift(['Total Transactions', data.totalTransactions, '', '', '', '']);
        rows.unshift(['Sales Revenue', '', '', '', data.salesAmount, '']);
        rows.unshift(['Services Revenue', '', '', '', data.servicesAmount, '']);
        rows.unshift(['Total Revenue', '', '', '', data.totalRevenue, '']);
        if (data.expensesAmount > 0) {
            rows.unshift(['Total Expenses', '', '', '', data.expensesAmount, '']);
            rows.unshift(['Net Amount', '', '', '', data.netAmount, '']);
        }
        rows.unshift(['', '', '', '', '', '']); // Empty row
        
        // Create CSV content
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zedson_analytics_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Utils.showNotification('Analytics data exported successfully!');
        
        if (window.LoggingModule) {
            LoggingModule.logAction('Exported analytics data', {
                transactionCount: data.totalTransactions,
                totalRevenue: data.totalRevenue,
                includesExpenses: data.expensesAmount > 0
            }, 'export');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        Utils.showNotification('Failed to export data. Please try again.');
    }
}

/**
 * Loading state management for analytics
 */
function showAnalyticsLoadingState(message) {
    const resultsDiv = document.getElementById('revenueFilterResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="analytics-loading" style="text-align: center; padding: 40px;">
                <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                <p style="color: #666; margin: 0;">${message}</p>
                <div class="loading-operations" id="analyticsOperations" style="margin-top: 15px; display: flex; justify-content: center; gap: 20px; font-size: 12px; color: #999;">
                </div>
            </div>
        `;
    }
}

function hideAnalyticsLoadingState() {
    // Loading state will be replaced by results
}

function showOperationLoadingState(operation, message) {
    analyticsState.loadingOperations.add(operation);
    const operationsDiv = document.getElementById('analyticsOperations');
    if (operationsDiv) {
        const operationEl = document.createElement('div');
        operationEl.id = `operation-${operation}`;
        operationEl.innerHTML = `<span class="loading-dot"></span> ${message}`;
        operationsDiv.appendChild(operationEl);
    }
}

function hideOperationLoadingState(operation) {
    analyticsState.loadingOperations.delete(operation);
    const operationEl = document.getElementById(`operation-${operation}`);
    if (operationEl) {
        operationEl.remove();
    }
}

/**
 * Error handling for analytics
 */
function handleAnalyticsError(error, userMessage) {
    console.error('Analytics error:', error);
    
    const resultsDiv = document.getElementById('revenueFilterResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="analytics-error" style="text-align: center; padding: 40px; color: #dc3545;">
                <h4>⚠️ ${userMessage}</h4>
                <p style="margin: 10px 0;">${error.message || 'Please check your connection and try again.'}</p>
                <div style="margin-top: 20px;">
                    <button class="btn" onclick="applyRevenueFilter()" style="margin-right: 10px;">
                        🔄 Retry
                    </button>
                    <button class="btn btn-secondary" onclick="applyRevenueFilterFallback('all', 'all', false)">
                        📊 Use Local Data
                    </button>
                </div>
            </div>
        `;
    }
    
    if (window.LoggingModule) {
        LoggingModule.logAction('Analytics error occurred', {
            error: error.message,
            operation: 'revenue_filter'
        }, 'error');
    }
}

/**
 * Fetch local data fallbacks
 */
function fetchLocalSalesData(dateRange) {
    if (!window.SalesModule || !window.SalesModule.sales) return [];
    
    let filteredSales = window.SalesModule.sales;
    
    if (dateRange.fromDate && dateRange.toDate) {
        filteredSales = window.SalesModule.filterSalesByDateRange(dateRange.fromDate, dateRange.toDate);
    }
    
    return filteredSales.map(sale => formatSaleForDisplay(sale));
}

function fetchLocalServicesData(dateRange) {
    if (!window.ServiceModule || !window.ServiceModule.services) return [];
    
    let filteredServices = window.ServiceModule.services.filter(s => s.status === 'completed');
    
    if (dateRange.fromDate && dateRange.toDate) {
        filteredServices = window.ServiceModule.filterServicesByDateRange(dateRange.fromDate, dateRange.toDate)
            .filter(s => s.status === 'completed');
    }
    
    return filteredServices.map(service => formatServiceForDisplay(service));
}

function fetchLocalExpensesData(dateRange) {
    if (!window.ExpenseModule || !window.ExpenseModule.expenses) return [];
    
    let filteredExpenses = window.ExpenseModule.expenses;
    
    if (dateRange.fromDate && dateRange.toDate) {
        filteredExpenses = window.ExpenseModule.getExpensesByDateRange(dateRange.fromDate, dateRange.toDate);
    }
    
    return filteredExpenses.map(expense => formatExpenseForDisplay(expense));
}

/**
 * Enhanced Load modal templates with new functionality
 */
function loadModalTemplates() {
    const modalsContainer = document.getElementById('modals-container');
    if (!modalsContainer) return;

    const modalTemplates = `
        <!-- Add Watch Modal -->
        <div id="addWatchModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addWatchModal')">&times;</span>
                <h2>Add New Item</h2>
                <form onsubmit="InventoryModule.addNewWatch(event)">
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Code:</label>
                            <input type="text" id="watchCode" required placeholder="Auto-generated">
                        </div>
                        <div class="form-group">
                            <label>Type:</label>
                            <select id="watchType" required>
                                <option value="">Select Type</option>
                                <option value="Watch">Watch</option>
                                <option value="Clock">Clock</option>
                                <option value="Timepiece">Timepiece</option>
                                <option value="Strap">Strap</option>
                                <option value="Battery">Battery</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Brand:</label>
                            <input type="text" id="watchBrand" required onchange="InventoryModule.updateWatchCode()">
                        </div>
                        <div class="form-group">
                            <label>Model:</label>
                            <input type="text" id="watchModel" required>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Size:</label>
                            <input type="text" id="watchSize" required placeholder="e.g., 40mm, 42mm">
                        </div>
                        <div class="form-group">
                            <label>Price (₹):</label>
                            <input type="number" id="watchPrice" required min="0" step="0.01">
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Quantity:</label>
                            <input type="number" id="watchQuantity" value="1" required min="1">
                        </div>
                        <div class="form-group">
                            <label>Outlet:</label>
                            <select id="watchOutlet" required>
                                <option value="">Select Outlet</option>
                                <option value="Semmancheri">Semmancheri</option>
                                <option value="Navalur">Navalur</option>
                                <option value="Padur">Padur</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="watchDescription" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn">Add Item</button>
                </form>
            </div>
        </div>

        <!-- Add Customer Modal -->
        <div id="addCustomerModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addCustomerModal')">&times;</span>
                <h2>Add Customer</h2>
                <form onsubmit="CustomerModule.addNewCustomer(event)">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="customerName" required>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="customerEmail" required>
                    </div>
                    <div class="form-group">
                        <label>Phone:</label>
                        <input type="tel" id="customerPhone" required>
                    </div>
                    <div class="form-group">
                        <label>Address:</label>
                        <textarea id="customerAddress" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn">Add Customer</button>
                </form>
            </div>
        </div>

        <!-- Add User Modal -->
        <div id="addUserModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addUserModal')">&times;</span>
                <h2>Add New User</h2>
                <form onsubmit="AuthModule.addNewUser(event)">
                    <div class="form-group">
                        <label>Username:</label>
                        <input type="text" id="newUsername" required placeholder="Enter username">
                    </div>
                    <div class="form-group">
                        <label>Password:</label>
                        <input type="password" id="newPassword" required placeholder="Enter password">
                    </div>
                    <div class="form-group">
                        <label>Role:</label>
                        <select id="newUserRole" required>
                            <option value="">Select Role</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Full Name:</label>
                        <input type="text" id="newUserFullName" required placeholder="Enter full name">
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="newUserEmail" required placeholder="Enter email">
                    </div>
                    <button type="submit" class="btn">Add User</button>
                </form>
            </div>
        </div>

        <!-- Add Expense Modal -->
        <div id="addExpenseModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addExpenseModal')">&times;</span>
                <h2>Add New Expense</h2>
                <form onsubmit="ExpenseModule.addNewExpense(event)">
                    <div class="form-group">
                        <label>Date:</label>
                        <input type="date" id="expenseDate" required>
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="expenseDescription" rows="3" required placeholder="Enter expense description..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Amount (₹):</label>
                        <input type="number" id="expenseAmount" required min="0.01" step="0.01" placeholder="0.00">
                    </div>
                    <button type="submit" class="btn">Add Expense</button>
                </form>
            </div>
        </div>

        <!-- Enhanced Revenue Analytics Modal -->
        <div id="revenueAnalyticsModal" class="modal">
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh; overflow-y: auto;">
                <span class="close" onclick="closeModal('revenueAnalyticsModal')">&times;</span>
                <h2>📊 Revenue Analytics</h2>
                
                <!-- Enhanced Filter Controls -->
                <div class="analytics-filters" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div class="grid grid-3" style="margin-bottom: 15px;">
                        <div class="form-group">
                            <label>Filter Type:</label>
                            <select id="revenueFilterType" onchange="toggleRevenueFilterInputs()">
                                <option value="all">All Time</option>
                                <option value="dateRange">Date Range</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Revenue Type:</label>
                            <select id="revenueTypeFilter">
                                <option value="all">All Revenue</option>
                                <option value="sales">Sales Only</option>
                                <option value="services">Services Only</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" id="includeExpenses">
                                Include Expenses
                            </label>
                            <small style="color: #666;">Show net profit calculation</small>
                        </div>
                    </div>
                    
                    <!-- Date Range Inputs -->
                    <div id="dateRangeInputs" style="display: none; margin-bottom: 15px;">
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label>From Date:</label>
                                <input type="date" id="revenueFromDate">
                            </div>
                            <div class="form-group">
                                <label>To Date:</label>
                                <input type="date" id="revenueToDate">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Monthly Inputs -->
                    <div id="monthlyInputs" style="display: none; margin-bottom: 15px;">
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label>Month:</label>
                                <select id="revenueMonth">
                                    <option value="0">January</option>
                                    <option value="1">February</option>
                                    <option value="2">March</option>
                                    <option value="3">April</option>
                                    <option value="4">May</option>
                                    <option value="5">June</option>
                                    <option value="6">July</option>
                                    <option value="7">August</option>
                                    <option value="8">September</option>
                                    <option value="9">October</option>
                                    <option value="10">November</option>
                                    <option value="11">December</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Year:</label>
                                <select id="revenueYear"></select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="resetRevenueFilter()">
                            🔄 Reset
                        </button>
                        <button type="button" class="btn" onclick="applyRevenueFilter()">
                            📊 Apply Filter
                        </button>
                    </div>
                </div>

                <!-- Results Container -->
                <div id="revenueFilterResults"></div>
            </div>
        </div>

        <!-- Global Loading Overlay -->
        <div id="globalLoadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; justify-content: center; align-items: center; color: white;">
            <div style="text-align: center;">
                <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                <h3 class="loading-message">Loading...</h3>
                <p style="opacity: 0.8;">Please wait while we set up your workspace</p>
            </div>
        </div>
    `;

    modalsContainer.innerHTML = modalTemplates;
    
    // Setup event listener for filter type changes
    const filterTypeSelect = document.getElementById('revenueFilterType');
    if (filterTypeSelect) {
        filterTypeSelect.addEventListener('change', toggleRevenueFilterInputs);
    }
}

/**
 * Enhanced global functions assignment with new API features
 */
function assignGlobalFunctions() {
    // Core functions
    window.showSection = window.AppCoreModule.showSection;
    window.closeModal = window.AppCoreModule.closeModal;
    window.deleteItem = window.AppCoreModule.deleteItem;
    window.updateDashboard = window.AppCoreModule.updateDashboard;
    window.confirmTransaction = window.AppCoreModule.confirmTransaction;
    window.openRevenueAnalytics = window.AppCoreModule.openRevenueAnalytics;
    
    // Enhanced analytics functions
    window.toggleRevenueFilterInputs = toggleRevenueFilterInputs;
    window.applyRevenueFilter = applyRevenueFilter;
    window.resetRevenueFilter = resetRevenueFilter;
    window.exportAnalyticsData = exportAnalyticsData;

    // Authentication functions
    window.handleLogin = function(event) {
        if (window.AuthModule) {
            AuthModule.handleLogin(event);
        }
    };

    window.logout = function() {
        if (window.AuthModule) {
            AuthModule.logout();
        }
    };

    // User management functions
    window.openAddUserModal = function() {
        if (window.AuthModule) {
            AuthModule.openAddUserModal();
        }
    };

    window.editUser = function(username) {
        if (window.AuthModule) {
            AuthModule.editUser(username);
        }
    };

    window.deleteUser = function(username) {
        if (window.AuthModule) {
            AuthModule.deleteUser(username);
        }
    };

    // Inventory functions
    window.openAddWatchModal = function() {
        if (window.InventoryModule) {
            InventoryModule.openAddWatchModal();
        }
    };

    window.editWatch = function(watchId) {
        if (window.InventoryModule) {
            InventoryModule.editWatch(watchId);
        }
    };

    window.deleteWatch = function(watchId) {
        if (window.InventoryModule) {
            InventoryModule.deleteWatch(watchId);
        }
    };

    window.searchWatches = function(query) {
        if (window.InventoryModule) {
            InventoryModule.searchWatches(query);
        }
    };

    // Customer functions
    window.openAddCustomerModal = function() {
        if (window.CustomerModule) {
            CustomerModule.openAddCustomerModal();
        }
    };

    window.editCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.editCustomer(customerId);
        }
    };

    window.deleteCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.deleteCustomer(customerId);
        }
    };

    window.searchCustomers = function(query) {
        if (window.CustomerModule) {
            CustomerModule.searchCustomers(query);
        }
    };

    window.initiateSaleFromCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.initiateSaleFromCustomer(customerId);
        }
    };

    window.initiateServiceFromCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.initiateServiceFromCustomer(customerId);
        }
    };

    // Sales functions
    window.openNewSaleModal = function() {
        if (window.SalesModule) {
            SalesModule.openNewSaleModal();
        } else {
            Utils.showNotification('Sales module is loading. Please try again in a moment.');
        }
    };

    window.editSale = function(saleId) {
        if (window.SalesModule) {
            SalesModule.editSale(saleId);
        }
    };

    window.deleteSale = function(saleId) {
        if (window.SalesModule) {
            SalesModule.deleteSale(saleId);
        }
    };

    window.searchSales = function(query) {
        if (window.SalesModule) {
            SalesModule.searchSales(query);
        }
    };

    // Service functions
    window.openNewServiceModal = function() {
        if (window.ServiceModule) {
            ServiceModule.openNewServiceModal();
        }
    };

    window.deleteService = function(serviceId) {
        if (window.ServiceModule) {
            ServiceModule.deleteService(serviceId);
        }
    };

    window.updateServiceStatus = function(serviceId, status) {
        if (window.ServiceModule) {
            ServiceModule.updateServiceStatus(serviceId, status);
        }
    };

    window.editService = function(serviceId) {
        if (window.ServiceModule) {
            ServiceModule.editService(serviceId);
        }
    };

    window.searchServices = function(query) {
        if (window.ServiceModule) {
            ServiceModule.searchServices(query);
        }
    };

    // Expense functions
    window.openAddExpenseModal = function() {
        if (window.ExpenseModule) {
            ExpenseModule.openAddExpenseModal();
        }
    };

    window.editExpense = function(expenseId) {
        if (window.ExpenseModule) {
            ExpenseModule.editExpense(expenseId);
        }
    };

    window.deleteExpense = function(expenseId) {
        if (window.ExpenseModule) {
            ExpenseModule.deleteExpense(expenseId);
        }
    };

    window.searchExpenses = function(query) {
        if (window.ExpenseModule) {
            ExpenseModule.searchExpenses(query);
        }
    };

    // Invoice functions
    window.searchInvoices = function(query) {
        if (window.InvoiceModule) {
            InvoiceModule.searchInvoices(query);
        }
    };

    window.filterInvoicesByType = function() {
        if (window.InvoiceModule) {
            InvoiceModule.filterInvoicesByType();
        }
    };

    window.viewInvoice = function(invoiceId) {
        if (window.InvoiceModule) {
            InvoiceModule.viewInvoice(invoiceId);
        }
    };

    window.printInvoice = function() {
        if (window.InvoiceModule) {
            InvoiceModule.printInvoice();
        }
    };

    window.viewServiceAcknowledgement = function(serviceId) {
        if (window.InvoiceModule) {
            InvoiceModule.viewServiceAcknowledgement(serviceId);
        }
    };
}

/**
 * Start the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Assign global functions first
    assignGlobalFunctions();
    
    // Initialize app with full API integration
    window.AppCoreModule.initializeApp();
});

// Export for other modules
window.AppExtendedModule = {
    // Enhanced analytics functions
    applyRevenueFilter,
    resetRevenueFilter,
    toggleRevenueFilterInputs,
    exportAnalyticsData,
    
    // Analytics data fetching
    fetchAnalyticsDataFromAPI,
    fetchSalesAnalyticsData,
    fetchServicesAnalyticsData,
    fetchExpensesAnalyticsData,
    
    // Analytics state management
    showAnalyticsLoadingState,
    hideAnalyticsLoadingState,
    showOperationLoadingState,
    hideOperationLoadingState,
    handleAnalyticsError,
    
    // Modal and UI functions
    loadModalTemplates,
    assignGlobalFunctions,
    
    // Analytics state access
    analyticsState
};

// Export for other modules (backwards compatibility)
window.AppController = {
    showSection: window.AppCoreModule.showSection,
    updateDashboard: window.AppCoreModule.updateDashboardWithAPIData,
    updateSectionData: window.AppCoreModule.updateSectionDataWithAPI,
    initializeApp: window.AppCoreModule.initializeApp,
    openRevenueAnalytics: window.AppCoreModule.openRevenueAnalytics,
    getTodayRevenue: window.AppCoreModule.getTodayRevenue
};