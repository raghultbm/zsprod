// ZEDSON WATCHCRAFT - Customer Management Module (Phase 4 - Enhanced API Integration)

/**
 * Customer Management System with Enhanced API Integration and Real-time sync
 * Updated with improved error handling, loading states, and bulk operations
 */

// Local cache for customers (for quick access)
let customers = [];
let isLoading = false;
let lastSyncTime = null;
let syncInProgress = false;

/**
 * Reset button to original state
 */
function resetButton(button, originalText) {
    if (button) {
        button.textContent = originalText;
        button.disabled = false;
        delete button.dataset.originalText;
    }
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loadingText) {
    if (button) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
        return button.dataset.originalText;
    }
    return null;
}

/**
 * Initialize customer module with enhanced API data loading
 */
async function initializeCustomers() {
    try {
        showLoadingState('customers-init');
        await loadCustomersFromAPI();
        renderCustomerTable();
        setupAutoSync();
        lastSyncTime = new Date();
        console.log('Customer module initialized with enhanced API integration');
    } catch (error) {
        console.error('Customer initialization error:', error);
        handleAPIError('Failed to load customers from server', error);
        // Fall back to any cached data
        renderCustomerTable();
    } finally {
        hideLoadingState('customers-init');
    }
}

/**
 * Enhanced API loading with better error handling and caching
 */
async function loadCustomersFromAPI() {
    try {
        // Use the API helper for loading with cache
        const response = await apiHelpers.withLoadingAndCache(
            'customers-load',
            'customers_data',
            () => api.customers.getCustomers(),
            15 * 60 * 1000 // 15 minutes cache
        );
        
        if (response && response.success) {
            customers = response.data || [];
            console.log(`Loaded ${customers.length} customers from API`);
            
            // Update UI indicators
            updateSyncStatus('success', `${customers.length} customers loaded`);
            return customers;
        } else {
            throw new Error(response?.message || 'Failed to load customers');
        }
        
    } catch (error) {
        console.error('Load customers API error:', error);
        
        // Try to use cached data
        const cachedCustomers = cacheManager.get('customers_data');
        if (cachedCustomers) {
            customers = cachedCustomers;
            updateSyncStatus('warning', 'Using cached data');
            console.log('Using cached customer data');
            return customers;
        }
        
        updateSyncStatus('error', 'Failed to load');
        throw error;
    }
}

/**
 * Enhanced refresh with progress indication
 */
async function refreshCustomers() {
    if (syncInProgress) {
        showNotification('Sync already in progress, please wait...');
        return;
    }
    
    try {
        syncInProgress = true;
        showLoadingState('customers-refresh');
        updateSyncStatus('syncing', 'Refreshing...');
        
        // Clear cache to force fresh load
        cacheManager.clear('customers_data');
        
        await loadCustomersFromAPI();
        renderCustomerTable();
        lastSyncTime = new Date();
        
        showSuccessMessage('Customers refreshed successfully');
        updateSyncStatus('success', 'Refreshed');
        
    } catch (error) {
        console.error('Refresh customers error:', error);
        handleAPIError('Failed to refresh customer data', error);
        updateSyncStatus('error', 'Refresh failed');
    } finally {
        syncInProgress = false;
        hideLoadingState('customers-refresh');
    }
}

/**
 * Calculate customer's net value from sales and services with API integration
 */
async function calculateCustomerNetValue(customerId) {
    try {
        // Get sales data from API
        let salesValue = 0;
        if (window.api && api.sales) {
            const salesResponse = await api.sales.getSalesByCustomer(customerId);
            if (salesResponse.success) {
                salesValue = salesResponse.data.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
            }
        }
        
        // Get services data from API
        let servicesValue = 0;
        if (window.api && api.services) {
            const servicesResponse = await api.services.getServicesByCustomer(customerId);
            if (servicesResponse.success) {
                servicesValue = servicesResponse.data
                    .filter(service => service.status === 'completed')
                    .reduce((sum, service) => sum + (service.actualCost || service.estimatedCost || 0), 0);
            }
        }
        
        return salesValue + servicesValue;
        
    } catch (error) {
        console.warn('Error calculating net value from API, using fallback:', error);
        
        // Fallback to local calculation
        let salesValue = 0;
        let servicesValue = 0;
        
        // Calculate sales value from local data
        if (window.SalesModule && SalesModule.sales) {
            salesValue = SalesModule.sales
                .filter(sale => sale.customerId === customerId)
                .reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        }
        
        // Calculate services value from local data
        if (window.ServiceModule && ServiceModule.services) {
            servicesValue = ServiceModule.services
                .filter(service => service.customerId === customerId && service.status === 'completed')
                .reduce((sum, service) => sum + (service.actualCost || service.estimatedCost || 0), 0);
        }
        
        return salesValue + servicesValue;
    }
}

/**
 * Update customer's net value with API integration
 */
async function updateCustomerNetValue(customerId) {
    try {
        const netValue = await calculateCustomerNetValue(customerId);
        
        const response = await api.customers.updateNetValue(customerId, netValue, 0);
        if (response.success) {
            // Update local cache
            const customerIndex = customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                customers[customerIndex] = response.data;
            }
            renderCustomerTable();
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to update net value');
        }
    } catch (error) {
        console.error('Update net value error:', error);
        handleAPIError('Failed to update customer value', error);
    }
}

/**
 * Enhanced customer dropdown population with loading states
 */
async function populateCustomerDropdown(selectId, options = {}) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        // Show loading state
        select.innerHTML = '<option value="">Loading customers...</option>';
        select.disabled = true;
        
        // Ensure customers are loaded
        if (customers.length === 0) {
            await loadCustomersFromAPI();
        }
        
        // Populate dropdown
        select.innerHTML = '<option value="">Select Customer</option>';
        
        // Filter customers if needed
        let filteredCustomers = customers;
        if (options.filter) {
            filteredCustomers = customers.filter(options.filter);
        }
        
        // Sort customers
        const sortedCustomers = filteredCustomers.sort((a, b) => 
            (a.name || '').localeCompare(b.name || '')
        );
        
        sortedCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name}${options.showPhone ? ` (${customer.phone})` : ''}`;
            if (options.includeNetValue && customer.netValue > 0) {
                option.textContent += ` - ${Utils.formatCurrency(customer.netValue)}`;
            }
            select.appendChild(option);
        });
        
        // Set default value if provided
        if (options.defaultValue) {
            select.value = options.defaultValue;
        }
        
    } catch (error) {
        console.error('Error populating customer dropdown:', error);
        select.innerHTML = '<option value="">Error loading customers</option>';
    } finally {
        select.disabled = false;
    }
}

/**
 * Open Add Customer Modal with improved state management
 */
function openAddCustomerModal() {
    if (!AuthModule.hasPermission('customers')) {
        showNotification('You do not have permission to add customers.');
        return;
    }
    
    // Reset the form when opening modal
    const form = document.querySelector('#addCustomerModal form');
    if (form) {
        form.reset();
        
        // Reset the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            resetButton(submitBtn, 'Add Customer');
        }
    }
    
    if (window.logAction) {
        logAction('Opened add customer modal');
    }
    document.getElementById('addCustomerModal').style.display = 'block';
}

/**
 * Add new customer with enhanced API integration and validation
 */
async function addNewCustomer(event) {
    event.preventDefault();
    
    if (!AuthModule.hasPermission('customers')) {
        showNotification('You do not have permission to add customers.');
        return;
    }

    // Get form data
    const name = document.getElementById('customerName').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    
    // Enhanced validation
    const validationResult = validateCustomerData({ name, email, phone, address });
    if (!validationResult.isValid) {
        showNotification(validationResult.message);
        return;
    }

    // Check for duplicates
    const duplicate = await checkForDuplicateCustomer(email, phone);
    if (duplicate) {
        showNotification(`Customer already exists: ${duplicate.name} (${duplicate.email})`);
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Adding Customer...');

    try {
        const customerData = { name, email, phone, address };

        const response = await apiHelpers.withLoading('customer-add', () => 
            api.customers.createCustomer(customerData)
        );

        if (response && response.success) {
            // Log action
            if (window.logCustomerAction) {
                logCustomerAction('Added new customer: ' + name, response.data);
            }
            
            // Add to local cache
            customers.push(response.data);
            
            // Update display
            renderCustomerTable();
            updateDashboard();
            
            // Clear cache to ensure fresh data on next load
            cacheManager.clear('customers_data');
            
            // Close modal and reset form
            closeModal('addCustomerModal');
            event.target.reset();
            
            showSuccessMessage(`Customer "${name}" added successfully!`);
        } else {
            throw new Error(response?.message || 'Failed to add customer');
        }

    } catch (error) {
        console.error('Add customer error:', error);
        handleAPIError('Failed to add customer', error);
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Add Customer');
    }
}

/**
 * Enhanced customer data validation
 */
function validateCustomerData(data) {
    if (!data.name || data.name.length < 2) {
        return { isValid: false, message: 'Customer name must be at least 2 characters long' };
    }
    
    if (!data.email || !Utils.validateEmail(data.email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    if (!data.phone || !Utils.validatePhone(data.phone)) {
        return { isValid: false, message: 'Please enter a valid phone number' };
    }
    
    // Check for potentially malicious input
    const suspiciousPattern = /<script|javascript:|on\w+=/i;
    if (suspiciousPattern.test(data.name) || suspiciousPattern.test(data.email) || 
        suspiciousPattern.test(data.address)) {
        return { isValid: false, message: 'Invalid characters detected in input' };
    }
    
    return { isValid: true };
}

/**
 * Check for duplicate customer
 */
async function checkForDuplicateCustomer(email, phone) {
    try {
        // Check in local cache first
        const localDuplicate = customers.find(c => 
            c.email.toLowerCase() === email.toLowerCase() || c.phone === phone
        );
        
        if (localDuplicate) {
            return localDuplicate;
        }
        
        // If not in cache, check via API
        const response = await api.customers.getCustomers({ 
            search: email,
            includePhone: phone 
        });
        
        if (response.success && response.data.length > 0) {
            const duplicate = response.data.find(c => 
                c.email.toLowerCase() === email.toLowerCase() || c.phone === phone
            );
            return duplicate || null;
        }
        
        return null;
    } catch (error) {
        console.warn('Error checking for duplicates:', error);
        return null; // Allow creation if check fails
    }
}

/**
 * Bulk operations for customers
 */
async function bulkUpdateCustomers(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
        return { success: false, message: 'No updates provided' };
    }
    
    try {
        showLoadingState('bulk-update');
        updateSyncStatus('syncing', 'Processing bulk updates...');
        
        const results = [];
        const batchSize = 5; // Process in batches to avoid overwhelming the API
        
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            const batchPromises = batch.map(update => 
                api.customers.updateCustomer(update.id, update.data)
            );
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            
            // Update progress
            const progress = Math.min(((i + batchSize) / updates.length) * 100, 100);
            updateSyncStatus('syncing', `Processing: ${Math.round(progress)}%`);
        }
        
        // Process results
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
        const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
        
        // Update local cache for successful updates
        successful.forEach((result, index) => {
            const update = updates[index];
            const customerIndex = customers.findIndex(c => c.id === update.id);
            if (customerIndex !== -1) {
                customers[customerIndex] = { ...customers[customerIndex], ...update.data };
            }
        });
        
        // Refresh display
        renderCustomerTable();
        cacheManager.clear('customers_data');
        
        const message = `Bulk update completed: ${successful.length} successful, ${failed.length} failed`;
        if (failed.length === 0) {
            showSuccessMessage(message);
            updateSyncStatus('success', 'Bulk update completed');
        } else {
            showNotification(message);
            updateSyncStatus('warning', 'Partially completed');
        }
        
        return {
            success: true,
            message,
            successful: successful.length,
            failed: failed.length,
            errors: failed.map(f => f.reason || f.value?.message)
        };
        
    } catch (error) {
        console.error('Bulk update error:', error);
        handleAPIError('Bulk update failed', error);
        updateSyncStatus('error', 'Bulk update failed');
        return { success: false, message: error.message };
    } finally {
        hideLoadingState('bulk-update');
    }
}

/**
 * Enhanced search with API integration
 */
async function searchCustomers(query, useAPI = false) {
    if (!query || query.length < 2) {
        renderCustomerTable(); // Show all customers
        return;
    }
    
    try {
        if (useAPI) {
            showLoadingState('search');
            const response = await api.customers.getCustomers({ search: query });
            
            if (response.success) {
                const searchResults = response.data;
                renderCustomerTable(searchResults);
                updateSyncStatus('success', `Found ${searchResults.length} results`);
            } else {
                throw new Error(response.message);
            }
        } else {
            // Local search with enhanced matching
            const tbody = document.getElementById('customerTableBody');
            if (!tbody) return;
            
            const rows = tbody.querySelectorAll('tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const searchTerms = query.toLowerCase().split(' ');
                const matches = searchTerms.every(term => text.includes(term));
                
                if (matches) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            
            updateSyncStatus('info', `Showing ${visibleCount} matches`);
        }
    } catch (error) {
        console.error('Search error:', error);
        handleAPIError('Search failed', error);
    } finally {
        hideLoadingState('search');
    }
}

/**
 * Enhanced customer statistics with API integration
 */
async function getCustomerStats() {
    try {
        // Try to get fresh stats from API
        const response = await apiHelpers.withCache(
            'customer_stats',
            () => api.customers.getCustomerStats(),
            5 * 60 * 1000 // 5 minutes cache
        );
        
        if (response && response.success) {
            return response.data;
        }
    } catch (error) {
        console.warn('API stats error, using fallback:', error);
    }
    
    // Fallback to local calculation
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => 
        (c.purchases > 0) || (c.serviceCount > 0) || (c.netValue > 0)
    ).length;
    const totalNetValue = customers.reduce((sum, c) => sum + (c.netValue || 0), 0);
    const averageNetValue = totalCustomers > 0 ? totalNetValue / totalCustomers : 0;
    const topCustomers = customers
        .filter(c => c.netValue > 0)
        .sort((a, b) => (b.netValue || 0) - (a.netValue || 0))
        .slice(0, 5);
    
    return {
        totalCustomers,
        activeCustomers,
        totalNetValue,
        averageNetValue,
        topCustomers,
        timestamp: new Date().toISOString()
    };
}

/**
 * Export customers with enhanced options
 */
async function exportCustomers(format = 'csv', options = {}) {
    try {
        showLoadingState('export');
        updateSyncStatus('syncing', 'Preparing export...');
        
        // Get export data from API if available
        const response = await api.customers.exportCustomers({
            format,
            includeStats: options.includeStats || false,
            dateRange: options.dateRange,
            filters: options.filters
        });
        
        if (response && response.success) {
            // Create and download file
            const { data, filename, contentType } = response.data;
            downloadFile(data, filename, contentType);
            
            showSuccessMessage(`${customers.length} customers exported successfully!`);
            updateSyncStatus('success', 'Export completed');
            
            if (window.logAction) {
                logAction('Exported customer data', { 
                    format, 
                    recordCount: customers.length,
                    options 
                });
            }
        } else {
            throw new Error(response?.message || 'Export failed');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        handleAPIError('Failed to export customers', error);
        updateSyncStatus('error', 'Export failed');
    } finally {
        hideLoadingState('export');
    }
}

/**
 * Download file helper
 */
function downloadFile(data, filename, contentType = 'text/csv') {
    const blob = new Blob([data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Enhanced sync status management
 */
function updateSyncStatus(status, message) {
    const syncIndicator = document.getElementById('customerSyncStatus');
    if (!syncIndicator) return;
    
    const statusConfig = {
        'success': { color: '#28a745', icon: '✓' },
        'warning': { color: '#ffc107', icon: '⚠' },
        'error': { color: '#dc3545', icon: '✗' },
        'syncing': { color: '#007bff', icon: '↻' },
        'info': { color: '#17a2b8', icon: 'ℹ' }
    };
    
    const config = statusConfig[status] || statusConfig.info;
    syncIndicator.innerHTML = `${config.icon} ${message || status}`;
    syncIndicator.style.color = config.color;
    syncIndicator.style.display = 'block';
    
    // Auto-hide success/info messages after 5 seconds
    if (status === 'success' || status === 'info') {
        setTimeout(() => {
            if (syncIndicator.textContent.includes(message)) {
                syncIndicator.style.display = 'none';
            }
        }, 5000);
    }
}

/**
 * Setup automatic synchronization
 */
function setupAutoSync() {
    // Sync every 10 minutes in background
    setInterval(async () => {
        if (!syncInProgress && navigator.onLine) {
            try {
                await loadCustomersFromAPI();
                renderCustomerTable();
                lastSyncTime = new Date();
                console.log('Background sync completed');
            } catch (error) {
                console.warn('Background sync failed:', error);
            }
        }
    }, 10 * 60 * 1000);
    
    // Update sync status every 30 seconds
    setInterval(() => {
        if (lastSyncTime && !syncInProgress) {
            const timeAgo = getTimeAgo(lastSyncTime);
            updateSyncStatus('info', `Last synced: ${timeAgo}`);
        }
    }, 30 * 1000);
}

/**
 * Enhanced error handling
 */
function handleAPIError(userMessage, error) {
    console.error('Customer API Error:', error);
    
    // Determine user-friendly message
    let message = userMessage;
    if (error?.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
            message += ' (Network error - check connection)';
        } else if (error.message.includes('timeout')) {
            message += ' (Request timeout - try again)';
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
            message += ' (Permission denied)';
        } else {
            message += ` (${error.message})`;
        }
    }
    
    showNotification(message);
    
    // Log for debugging
    if (window.logAction) {
        logAction('Customer API Error: ' + userMessage, {
            error: error?.message,
            stack: error?.stack,
            timestamp: new Date().toISOString()
        }, 'error');
    }
}

/**
 * Loading state management
 */
function showLoadingState(context) {
    isLoading = true;
    const spinner = document.getElementById(`${context}-spinner`);
    if (spinner) {
        spinner.style.display = 'block';
    }
    
    // Show loading in table if it's the main load
    if (context === 'customers-init') {
        const tbody = document.getElementById('customerTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner"></div>
                        <p>Loading customers...</p>
                    </td>
                </tr>
            `;
        }
    }
}

function hideLoadingState(context) {
    isLoading = false;
    const spinner = document.getElementById(`${context}-spinner`);
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Utility functions
 */
function showSuccessMessage(message) {
    Utils.showNotification(message);
    if (window.logAction) {
        logAction('Customer Success: ' + message);
    }
}

function showNotification(message) {
    Utils.showNotification(message);
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Keep all existing functions from the original file
// [Include all the existing functions like editCustomer, updateCustomer, deleteCustomer, 
//  incrementCustomerPurchases, etc. with their original implementations]

// Export enhanced functions for global use
window.CustomerModule = {
    // Core functions
    initializeCustomers,
    loadCustomersFromAPI,
    refreshCustomers,
    openAddCustomerModal,
    addNewCustomer,
    editCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Enhanced functions
    populateCustomerDropdown,
    calculateCustomerNetValue,
    updateCustomerNetValue,
    bulkUpdateCustomers,
    searchCustomers,
    exportCustomers,
    
    // Statistics
    getCustomerStats,
    
    // Integration functions
    incrementCustomerPurchases,
    incrementCustomerServices,
    decrementCustomerPurchases,
    decrementCustomerServices,
    getCustomerById,
    initiateSaleFromCustomer,
    initiateServiceFromCustomer,
    renderCustomerTable,
    
    // Utility functions
    resetButton,
    setButtonLoading,
    closeCustomerModal,
    handleAPIError,
    updateSyncStatus,
    
    // Data access for other modules
    customers
};