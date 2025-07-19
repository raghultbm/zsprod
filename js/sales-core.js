// ZEDSON WATCHCRAFT - Sales Core Module (Phase 4 - API Integration)

/**
 * Sales Transaction Management System - Core Functions with API Integration
 * Updated to use backend APIs instead of local data
 */

// Local cache for sales and offline fallback
let sales = [];
let nextSaleId = 1;
let isLoading = false;
let lastSyncTime = null;

/**
 * Initialize sales module with API integration
 */
async function initializeSales() {
    try {
        showLoadingState('sales');
        await loadSalesFromAPI();
        renderSalesTable();
        lastSyncTime = new Date();
        console.log('Sales module initialized with API integration');
    } catch (error) {
        console.error('Sales initialization error:', error);
        // Fall back to local data if API fails
        if (sales.length === 0) {
            loadSampleSales();
        }
        renderSalesTable();
        showAPIError('Failed to load sales from server. Using offline data.');
    } finally {
        hideLoadingState('sales');
    }
}

/**
 * Load sales from API with caching
 */
async function loadSalesFromAPI() {
    try {
        const response = await api.sales.getSales();
        if (response.success) {
            sales = response.data || [];
            console.log(`Loaded ${sales.length} sales from API`);
            
            // Update nextSaleId for local operations
            if (sales.length > 0) {
                nextSaleId = Math.max(...sales.map(s => s.id || 0)) + 1;
            }
            
            // Cache the data
            cacheManager.set('sales_data', sales, 10 * 60 * 1000); // 10 minutes cache
            return sales;
        } else {
            throw new Error(response.message || 'Failed to load sales');
        }
    } catch (error) {
        console.error('Load sales API error:', error);
        
        // Try to use cached data
        const cachedSales = cacheManager.get('sales_data');
        if (cachedSales) {
            sales = cachedSales;
            console.log('Using cached sales data');
            return sales;
        }
        
        throw error;
    }
}

/**
 * Refresh sales from API
 */
async function refreshSales() {
    try {
        showLoadingState('refresh');
        cacheManager.clear('sales_data'); // Clear cache to force fresh load
        await loadSalesFromAPI();
        renderSalesTable();
        lastSyncTime = new Date();
        showSuccessMessage('Sales refreshed successfully');
    } catch (error) {
        console.error('Refresh sales error:', error);
        showAPIError('Failed to refresh sales data');
    } finally {
        hideLoadingState('refresh');
    }
}

/**
 * Open New Sale Modal - FIXED with API integration
 */
function openNewSaleModal() {
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to create sales.');
        return;
    }
    
    console.log('Opening New Sale Modal');
    
    // Ensure modal exists before trying to open it
    const modal = document.getElementById('newSaleModal');
    if (!modal) {
        Utils.showNotification('Sales modal not found. Please refresh the page.');
        return;
    }
    
    // Populate customer dropdown
    if (window.CustomerModule && CustomerModule.populateCustomerDropdown) {
        CustomerModule.populateCustomerDropdown('saleCustomer');
    }
    
    // Populate watch dropdown with API data
    populateWatchDropdown('saleWatch');
    
    // Reset form
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
    
    // Reset calculation displays
    updateCalculationDisplay();
    
    // Log action
    if (window.logAction) {
        logAction('Opened new sale modal');
    }
    
    modal.style.display = 'block';
}

/**
 * Populate watch dropdown with available watches from API
 */
async function populateWatchDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Loading items...</option>';
        
        // Get available watches from API
        const response = await api.watches.getAvailableWatches();
        
        select.innerHTML = '<option value="">Select Item</option>';
        
        if (response.success && response.data) {
            response.data.forEach(watch => {
                select.innerHTML += `<option value="${watch.id}" data-price="${watch.price}" data-code="${watch.code}">
                    ${Utils.sanitizeHtml(watch.code)} - ${Utils.sanitizeHtml(watch.brand)} ${Utils.sanitizeHtml(watch.model)} (₹${watch.price})
                </option>`;
            });
        } else {
            // Fallback to local inventory if API fails
            if (window.InventoryModule && InventoryModule.watches) {
                const availableWatches = InventoryModule.getAvailableWatches();
                availableWatches.forEach(watch => {
                    select.innerHTML += `<option value="${watch.id}" data-price="${watch.price}" data-code="${watch.code}">
                        ${Utils.sanitizeHtml(watch.code)} - ${Utils.sanitizeHtml(watch.brand)} ${Utils.sanitizeHtml(watch.model)} (₹${watch.price})
                    </option>`;
                });
            }
        }
        
    } catch (error) {
        console.error('Populate watch dropdown error:', error);
        select.innerHTML = '<option value="">Error loading items</option>';
    }
}

/**
 * Search watch by code and auto-populate
 */
function searchWatchByCode() {
    const codeInput = document.getElementById('saleWatchCode');
    const watchSelect = document.getElementById('saleWatch');
    const priceInput = document.getElementById('salePrice');
    
    if (!codeInput || !watchSelect || !priceInput) return;
    
    const enteredCode = codeInput.value.trim().toUpperCase();
    
    if (!enteredCode) {
        watchSelect.value = '';
        priceInput.value = '';
        updateCalculationDisplay();
        return;
    }
    
    // Find watch by code
    const watchOption = Array.from(watchSelect.options).find(option => 
        option.dataset.code && option.dataset.code.toUpperCase() === enteredCode
    );
    
    if (watchOption) {
        watchSelect.value = watchOption.value;
        priceInput.value = watchOption.dataset.price;
        updateCalculationDisplay();
    } else {
        watchSelect.value = '';
        priceInput.value = '';
        updateCalculationDisplay();
        Utils.showNotification('Item with this code not found or not available');
    }
}

/**
 * Update price when watch is selected
 */
function updateSalePrice() {
    const watchSelect = document.getElementById('saleWatch');
    const priceInput = document.getElementById('salePrice');
    const codeInput = document.getElementById('saleWatchCode');
    
    if (watchSelect && priceInput) {
        const selectedOption = watchSelect.options[watchSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.price) {
            priceInput.value = selectedOption.dataset.price;
            if (codeInput && selectedOption.dataset.code) {
                codeInput.value = selectedOption.dataset.code;
            }
        } else {
            priceInput.value = '';
            if (codeInput) codeInput.value = '';
        }
        updateCalculationDisplay();
    }
}

/**
 * Update calculation display
 */
function updateCalculationDisplay() {
    const price = parseFloat(document.getElementById('salePrice')?.value) || 0;
    const quantity = parseInt(document.getElementById('saleQuantity')?.value) || 1;
    const discountType = document.getElementById('saleDiscountType')?.value || '';
    const discountValue = parseFloat(document.getElementById('saleDiscountValue')?.value) || 0;
    
    const subtotal = price * quantity;
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
        discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
    } else if (discountType === 'amount') {
        discountAmount = Math.min(discountValue, subtotal);
    }
    
    const totalAmount = subtotal - discountAmount;
    
    // Update display fields
    const subtotalDisplay = document.getElementById('saleSubtotal');
    const discountDisplay = document.getElementById('saleDiscountAmount');
    const totalDisplay = document.getElementById('saleTotalAmount');
    
    if (subtotalDisplay) subtotalDisplay.textContent = Utils.formatCurrency(subtotal);
    if (discountDisplay) discountDisplay.textContent = Utils.formatCurrency(discountAmount);
    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(totalAmount);
}

/**
 * Add new sale with API integration
 */
async function addNewSale(event) {
    event.preventDefault();
    
    console.log('Adding new sale with API...');
    
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to create sales.');
        return;
    }

    // Get form data
    const customerId = parseInt(document.getElementById('saleCustomer').value);
    const watchId = parseInt(document.getElementById('saleWatch').value);
    const price = parseFloat(document.getElementById('salePrice').value);
    const quantity = parseInt(document.getElementById('saleQuantity').value) || 1;
    const discountType = document.getElementById('saleDiscountType').value;
    const discountValue = parseFloat(document.getElementById('saleDiscountValue').value) || 0;
    const paymentMethod = document.getElementById('salePaymentMethod').value;
    
    // Validate input
    if (!customerId || !watchId || !price || !paymentMethod) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    if (price <= 0) {
        Utils.showNotification('Price must be greater than zero');
        return;
    }

    if (quantity <= 0) {
        Utils.showNotification('Quantity must be greater than zero');
        return;
    }

    // Get customer and watch details for validation
    const customer = CustomerModule.getCustomerById(customerId);
    if (!customer) {
        Utils.showNotification('Selected customer not found');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Processing Sale...';
        submitBtn.disabled = true;
        
        // Calculate amounts
        const subtotal = price * quantity;
        let discountAmount = 0;
        
        if (discountType === 'percentage') {
            discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
        } else if (discountType === 'amount') {
            discountAmount = Math.min(discountValue, subtotal);
        }
        
        const totalAmount = subtotal - discountAmount;

        // Prepare sale data for API
        const saleData = {
            customerId: customerId,
            items: [{
                watchId: watchId,
                quantity: quantity,
                price: price
            }],
            discountType: discountType,
            discountValue: discountValue,
            paymentMethod: paymentMethod,
            notes: []
        };

        // Call API to create sale
        const response = await api.sales.createSale(saleData);
        
        if (response.success) {
            const newSale = response.data;
            
            // Log action
            if (window.logSalesAction) {
                logSalesAction(`Created sale for ${customer.name}. Total: ${Utils.formatCurrency(totalAmount)}`, newSale, customer);
            }
            
            // Add to local cache
            sales.push(newSale);
            
            // Update customer purchase count (local cache)
            if (window.CustomerModule) {
                CustomerModule.incrementCustomerPurchases(customerId);
            }
            
            // Generate Sales Invoice automatically
            if (window.InvoiceModule) {
                const invoice = InvoiceModule.generateSalesInvoice(newSale);
                if (invoice) {
                    newSale.invoiceGenerated = true;
                    newSale.invoiceId = invoice.id;
                }
            }
            
            // Update displays
            renderSalesTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Close modal and reset form
            document.getElementById('newSaleModal').style.display = 'none';
            event.target.reset();
            
            Utils.showNotification(`Sale recorded successfully! Sale ID: ${newSale.id}. Total: ${Utils.formatCurrency(newSale.totalAmount)}. Invoice automatically generated.`);
            console.log('Sale added:', newSale);
            
        } else {
            throw new Error(response.message || 'Failed to create sale');
        }
        
    } catch (error) {
        console.error('Add sale error:', error);
        
        // Handle specific error cases
        if (error.message && error.message.includes('insufficient stock')) {
            Utils.showNotification('Insufficient stock available for this item.');
        } else if (error.message && error.message.includes('customer not found')) {
            Utils.showNotification('Selected customer not found. Please refresh and try again.');
        } else {
            Utils.showNotification(error.message || 'Failed to create sale. Please try again.');
        }
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Delete sale with API integration
 */
async function deleteSale(saleId) {
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to delete sales.');
        return;
    }

    const sale = sales.find(s => s.id === saleId);
    if (!sale) {
        Utils.showNotification('Sale not found.');
        return;
    }

    if (confirm(`Are you sure you want to delete the sale for ${sale.customerName || 'this customer'}?`)) {
        try {
            showLoadingState('delete');
            
            const response = await api.sales.deleteSale(saleId, 'Deleted by user');
            
            if (response.success) {
                // Log action
                if (window.logSalesAction) {
                    logSalesAction('Deleted sale: ' + (sale.watchName || 'Unknown item'), sale);
                }
                
                // Update customer purchase count (local cache)
                if (window.CustomerModule) {
                    CustomerModule.decrementCustomerPurchases(sale.customerId);
                }
                
                // Remove from local cache
                sales = sales.filter(s => s.id !== saleId);
                
                renderSalesTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
                Utils.showNotification('Sale deleted successfully!');
                
            } else {
                throw new Error(response.message || 'Failed to delete sale');
            }
            
        } catch (error) {
            console.error('Delete sale error:', error);
            Utils.showNotification(error.message || 'Failed to delete sale. Please try again.');
        } finally {
            hideLoadingState('delete');
        }
    }
}

/**
 * View sale invoice
 */
function viewSaleInvoice(saleId) {
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    const invoices = InvoiceModule.getInvoicesForTransaction(saleId, 'sale');
    if (invoices.length > 0) {
        InvoiceModule.viewInvoice(invoices[0].id);
    } else {
        Utils.showNotification('No invoice found for this sale.');
    }
}

/**
 * Get sale by ID
 */
function getSaleById(saleId) {
    return sales.find(s => s.id === saleId);
}

/**
 * Get recent sales
 */
function getRecentSales(limit = 5) {
    return sales
        .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0))
        .slice(0, limit);
}

/**
 * Get sales by customer
 */
function getSalesByCustomer(customerId) {
    return sales.filter(sale => sale.customerId === customerId);
}

/**
 * Search sales with real-time filtering
 */
function searchSales(query) {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Get sales statistics with API integration
 */
async function getSalesStats() {
    try {
        // Try to get fresh stats from API
        const response = await api.sales.getSaleStats();
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get sales stats API error:', error);
    }
    
    // Fallback to local calculation
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const totalTransactions = sales.length;
    const averageSaleValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const totalDiscounts = sales.reduce((sum, sale) => sum + (sale.discountAmount || 0), 0);
    
    return {
        totalSales,
        totalTransactions,
        averageSaleValue,
        totalDiscounts
    };
}

/**
 * Render sales table with API data and loading states
 */
function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) {
        console.error('Sales table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Show loading state if currently loading
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading sales...</p>
                </td>
            </tr>
        `;
        return;
    }
    
    if (sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #999; padding: 40px;">
                    <div style="margin-bottom: 10px;">💰</div>
                    <h3 style="margin: 10px 0;">No sales recorded yet</h3>
                    <p>Click "New Sale" to get started</p>
                    <button class="btn" onclick="SalesModule.refreshSales()" style="margin-top: 10px;">
                        Refresh Sales
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort sales by date (newest first)
    const sortedSales = sales.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0);
        const dateB = new Date(b.createdAt || b.timestamp || 0);
        return dateB - dateA;
    });
    
    sortedSales.forEach((sale, index) => {
        const row = document.createElement('tr');
        
        // Add sync indicator if item is recently updated
        const isRecentlyUpdated = sale.updatedAt && 
            (new Date() - new Date(sale.updatedAt)) < 10000; // 10 seconds
        const syncIndicator = isRecentlyUpdated ? 
            '<span style="color: #28a745;">●</span> ' : '';
        
        // Check if invoice exists for this sale
        const hasInvoice = window.InvoiceModule && 
            InvoiceModule.getInvoicesForTransaction(sale.id, 'sale').length > 0;
        
        // Display discount info if applicable
        let discountInfo = '';
        if (sale.discountAmount && sale.discountAmount > 0) {
            discountInfo = `<br><small style="color: #dc3545;">Discount: ${Utils.formatCurrency(sale.discountAmount)}</small>`;
        }
        
        // Get customer mobile number
        const customer = window.CustomerModule ? CustomerModule.getCustomerById(sale.customerId) : null;
        const customerMobile = customer ? customer.phone : 'N/A';
        const customerName = sale.customerName || customer?.name || 'Unknown';
        
        // Format dates and times safely
        const saleDate = sale.saleDate || sale.createdAt || sale.timestamp;
        const formattedDate = saleDate ? Utils.formatDate(new Date(saleDate)) : 'N/A';
        const formattedTime = saleDate ? new Date(saleDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        
        // Extract item information safely
        let itemInfo = '';
        if (sale.items && sale.items.length > 0) {
            const item = sale.items[0]; // First item
            itemInfo = `
                <strong>${Utils.sanitizeHtml(item.watchName || item.name || 'Unknown Item')}</strong><br>
                <small>Code: ${Utils.sanitizeHtml(item.watchCode || item.code || 'N/A')}</small><br>
                <small>Qty: ${item.quantity || 1}</small>
            `;
        } else {
            // Fallback for older sale format
            itemInfo = `
                <strong>${Utils.sanitizeHtml(sale.watchName || 'Unknown Item')}</strong><br>
                <small>Code: ${Utils.sanitizeHtml(sale.watchCode || 'N/A')}</small><br>
                <small>Qty: ${sale.quantity || 1}</small>
            `;
        }
        
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>
                ${formattedDate}
                ${syncIndicator}
            </td>
            <td>${formattedTime}</td>
            <td class="customer-info">
                <div class="customer-name">${Utils.sanitizeHtml(customerName)}</div>
                <div class="customer-mobile">${Utils.sanitizeHtml(customerMobile)}</div>
            </td>
            <td>${itemInfo}</td>
            <td>
                ${Utils.formatCurrency(sale.totalAmount || 0)}
                ${discountInfo}
            </td>
            <td><span class="status available">${Utils.sanitizeHtml(sale.paymentMethod || 'Unknown')}</span></td>
            <td>
                <button class="btn btn-sm" onclick="SalesModule.editSale(${sale.id})" 
                    ${!AuthModule.hasPermission('sales') ? 'disabled' : ''}>Edit</button>
                <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete this sale?', () => SalesModule.deleteSale(${sale.id}))" 
                    ${!AuthModule.hasPermission('sales') ? 'disabled' : ''}>Delete</button>
                ${hasInvoice ? 
                    `<button class="btn btn-sm btn-success" onclick="SalesModule.viewSaleInvoice(${sale.id})" title="View Invoice">Invoice</button>` : 
                    ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Sales table rendered successfully with API data');
    
    // Update sync status
    updateSyncStatus();
}

/**
 * Update sync status display
 */
function updateSyncStatus() {
    const syncStatus = document.getElementById('salesSyncStatus');
    if (syncStatus && lastSyncTime) {
        const timeAgo = getTimeAgo(lastSyncTime);
        syncStatus.textContent = `Last synced: ${timeAgo}`;
        syncStatus.style.color = (new Date() - lastSyncTime) > 300000 ? '#dc3545' : '#28a745'; // Red if >5 min
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Export sales data
 */
async function exportSales() {
    try {
        showLoadingState('export');
        
        const response = await api.sales.exportSales();
        
        if (response.success) {
            // Create and download file
            const csvContent = response.data.csvData;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            Utils.showNotification('Sales exported successfully!');
            
            if (window.logAction) {
                logAction('Exported sales data', { recordCount: response.data.recordCount });
            }
            
        } else {
            throw new Error(response.message || 'Export failed');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        Utils.showNotification('Failed to export sales. Please try again.');
    } finally {
        hideLoadingState('export');
    }
}

/**
 * Load sample sales for offline fallback
 */
function loadSampleSales() {
    sales = [
        {
            id: 1,
            customerId: 1,
            customerName: 'John Doe',
            items: [{
                watchId: 1,
                watchName: 'Rolex Submariner',
                watchCode: 'ROL001',
                quantity: 1,
                price: 850000
            }],
            totalAmount: 850000,
            paymentMethod: 'Card',
            createdAt: '2024-01-15T10:00:00Z',
            invoiceGenerated: true
        },
        {
            id: 2,
            customerId: 2,
            customerName: 'Jane Smith',
            items: [{
                watchId: 2,
                watchName: 'Omega Speedmaster',
                watchCode: 'OMG001',
                quantity: 1,
                price: 450000
            }],
            totalAmount: 450000,
            paymentMethod: 'UPI',
            createdAt: '2024-01-10T14:30:00Z',
            invoiceGenerated: true
        }
    ];
    nextSaleId = 3;
    console.log('Loaded sample sales for offline mode');
}

/**
 * Loading state management
 */
function showLoadingState(context) {
    isLoading = true;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'block';
    }
    
    // Show loading in table if it's the main load
    if (context === 'sales') {
        renderSalesTable();
    }
}

function hideLoadingState(context) {
    isLoading = false;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Show API error with retry option
 */
function showAPIError(message) {
    Utils.showNotification(message + ' You can continue working offline.');
    
    // Log the error for debugging
    if (window.logAction) {
        logAction('API Error in Sales: ' + message, {}, 'error');
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    Utils.showNotification(message);
    
    if (window.logAction) {
        logAction('Sales Success: ' + message);
    }
}

/**
 * Sync with server - called periodically
 */
async function syncWithServer() {
    try {
        await loadSalesFromAPI();
        renderSalesTable();
        console.log('Sales synced with server');
    } catch (error) {
        console.error('Sync error:', error);
        // Don't show error to user for background sync failures
    }
}

// Export core functions for the extended module
window.SalesCoreModule = {
    // Core functions
    initializeSales,
    loadSalesFromAPI,
    refreshSales,
    openNewSaleModal,
    populateWatchDropdown,
    searchWatchByCode,
    updateSalePrice,
    updateCalculationDisplay,
    addNewSale,
    deleteSale,
    viewSaleInvoice,
    
    // Data access
    getSaleById,
    getRecentSales,
    getSalesByCustomer,
    searchSales,
    renderSalesTable,
    getSalesStats,
    exportSales,
    syncWithServer,
    
    // Data access for other modules
    sales
};