// ZEDSON WATCHCRAFT - Sales Extended Module (Phase 4 - API Integration)

/**
 * Sales Transaction Management System - Extended Functions with API Integration
 * Updated to use backend APIs with optimistic updates and comprehensive error handling
 */

/**
 * Edit sale with API integration
 */
async function editSale(saleId) {
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to edit sales.');
        return;
    }

    const sale = window.SalesCoreModule.sales.find(s => s.id === saleId);
    if (!sale) {
        Utils.showNotification('Sale not found.');
        return;
    }

    // Log action
    if (window.logAction) {
        logAction('Opened edit modal for sale: ' + (sale.customerName || 'Unknown customer'));
    }

    // Create edit modal with discount fields and API integration
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editSaleModal';
    editModal.style.display = 'block';
    
    // Extract item information safely
    let watchId, watchName, watchCode, price, quantity;
    if (sale.items && sale.items.length > 0) {
        const item = sale.items[0]; // First item
        watchId = item.watchId;
        watchName = item.watchName || item.name;
        watchCode = item.watchCode || item.code;
        price = item.price;
        quantity = item.quantity;
    } else {
        // Fallback for older sale format
        watchId = sale.watchId;
        watchName = sale.watchName;
        watchCode = sale.watchCode;
        price = sale.price;
        quantity = sale.quantity;
    }
    
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="SalesModule.closeEditSaleModal()">&times;</span>
            <h2>Edit Sale</h2>
            <form onsubmit="SalesModule.updateSale(event, ${saleId})">
                <div class="form-group">
                    <label>Customer:</label>
                    <select id="editSaleCustomer" required>
                        <option value="">Select Customer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Item:</label>
                    <select id="editSaleWatch" required onchange="SalesModule.updateEditSalePrice()">
                        <option value="">Loading items...</option>
                    </select>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Quantity:</label>
                        <input type="number" id="editSaleQuantity" value="${quantity || 1}" required min="1" onchange="SalesModule.calculateEditTotalAmount()">
                    </div>
                    <div class="form-group">
                        <label>Price (₹):</label>
                        <input type="number" id="editSalePrice" value="${price || 0}" required min="0" step="0.01" onchange="SalesModule.calculateEditTotalAmount()">
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Discount Type:</label>
                        <select id="editSaleDiscountType" onchange="SalesModule.calculateEditTotalAmount()">
                            <option value="">No Discount</option>
                            <option value="percentage" ${sale.discountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                            <option value="amount" ${sale.discountType === 'amount' ? 'selected' : ''}>Amount (₹)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Discount Value:</label>
                        <input type="number" id="editSaleDiscountValue" value="${sale.discountValue || 0}" min="0" step="0.01" onchange="SalesModule.calculateEditTotalAmount()">
                    </div>
                </div>
                <div class="form-group">
                    <label>Payment Method:</label>
                    <select id="editSalePaymentMethod" required>
                        <option value="Cash" ${sale.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Card" ${sale.paymentMethod === 'Card' ? 'selected' : ''}>Card</option>
                        <option value="UPI" ${sale.paymentMethod === 'UPI' ? 'selected' : ''}>UPI</option>
                        <option value="Bank Transfer" ${sale.paymentMethod === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                    </select>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Subtotal:</span>
                        <span id="editSaleSubtotal">${Utils.formatCurrency((price || 0) * (quantity || 1))}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Discount:</span>
                        <span id="editSaleDiscountAmount">${Utils.formatCurrency(sale.discountAmount || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px;">
                        <span>Total Amount:</span>
                        <span id="editSaleTotalAmount">${Utils.formatCurrency(sale.totalAmount || 0)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-danger" onclick="SalesModule.closeEditSaleModal()">Cancel</button>
                    <button type="submit" class="btn">Update Sale</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
    
    // Populate dropdowns with API data
    await populateEditDropdowns(sale);
    
    // Set current values and calculate totals
    setTimeout(() => {
        document.getElementById('editSaleCustomer').value = sale.customerId;
        document.getElementById('editSaleWatch').value = watchId;
        calculateEditTotalAmount();
    }, 100);
}

/**
 * Populate dropdowns for edit modal with API data
 */
async function populateEditDropdowns(sale) {
    try {
        // Populate customer dropdown
        if (window.CustomerModule) {
            CustomerModule.populateCustomerDropdown('editSaleCustomer');
        }
        
        // Populate watch dropdown with all watches (not just available ones for editing)
        await populateEditWatchDropdown('editSaleWatch');
        
    } catch (error) {
        console.error('Error populating edit dropdowns:', error);
        Utils.showNotification('Error loading dropdown data. Please refresh and try again.');
    }
}

/**
 * Populate watch dropdown for edit modal with API integration
 */
async function populateEditWatchDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Loading items...</option>';
        
        // Get all watches from API (not just available ones)
        const response = await api.watches.getWatches();
        
        select.innerHTML = '<option value="">Select Item</option>';
        
        if (response.success && response.data) {
            response.data.forEach(watch => {
                const stockInfo = watch.quantity > 0 ? ` (Stock: ${watch.quantity})` : ' (Out of Stock)';
                select.innerHTML += `<option value="${watch.id}" data-price="${watch.price}" data-stock="${watch.quantity}">
                    ${Utils.sanitizeHtml(watch.code)} - ${Utils.sanitizeHtml(watch.brand)} ${Utils.sanitizeHtml(watch.model)} (₹${watch.price})${stockInfo}
                </option>`;
            });
        } else {
            // Fallback to local inventory if API fails
            if (window.InventoryModule && InventoryModule.watches) {
                InventoryModule.watches.forEach(watch => {
                    const stockInfo = watch.quantity > 0 ? ` (Stock: ${watch.quantity})` : ' (Out of Stock)';
                    select.innerHTML += `<option value="${watch.id}" data-price="${watch.price}" data-stock="${watch.quantity}">
                        ${Utils.sanitizeHtml(watch.code)} - ${Utils.sanitizeHtml(watch.brand)} ${Utils.sanitizeHtml(watch.model)} (₹${watch.price})${stockInfo}
                    </option>`;
                });
            }
        }
        
    } catch (error) {
        console.error('Populate edit watch dropdown error:', error);
        select.innerHTML = '<option value="">Error loading items</option>';
    }
}

/**
 * Calculate total amount in edit modal
 */
function calculateEditTotalAmount() {
    const price = parseFloat(document.getElementById('editSalePrice')?.value) || 0;
    const quantity = parseInt(document.getElementById('editSaleQuantity')?.value) || 1;
    const discountType = document.getElementById('editSaleDiscountType')?.value;
    const discountValue = parseFloat(document.getElementById('editSaleDiscountValue')?.value) || 0;
    
    const subtotal = price * quantity;
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
        discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
    } else if (discountType === 'amount') {
        discountAmount = Math.min(discountValue, subtotal);
    }
    
    const totalAmount = subtotal - discountAmount;
    
    // Update display fields
    const subtotalDisplay = document.getElementById('editSaleSubtotal');
    const discountDisplay = document.getElementById('editSaleDiscountAmount');
    const totalDisplay = document.getElementById('editSaleTotalAmount');
    
    if (subtotalDisplay) subtotalDisplay.textContent = Utils.formatCurrency(subtotal);
    if (discountDisplay) discountDisplay.textContent = Utils.formatCurrency(discountAmount);
    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(totalAmount);
}

/**
 * Close edit sale modal
 */
function closeEditSaleModal() {
    const modal = document.getElementById('editSaleModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Update price in edit modal when watch is selected
 */
function updateEditSalePrice() {
    const watchSelect = document.getElementById('editSaleWatch');
    const priceInput = document.getElementById('editSalePrice');
    
    if (watchSelect && priceInput) {
        const selectedOption = watchSelect.options[watchSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.price) {
            priceInput.value = selectedOption.dataset.price;
            calculateEditTotalAmount();
        }
    }
}

/**
 * Update sale with API integration and optimistic updates
 */
async function updateSale(event, saleId) {
    event.preventDefault();
    
    const sale = window.SalesCoreModule.sales.find(s => s.id === saleId);
    if (!sale) {
        Utils.showNotification('Sale not found.');
        return;
    }

    const customerId = parseInt(document.getElementById('editSaleCustomer').value);
    const watchId = parseInt(document.getElementById('editSaleWatch').value);
    const price = parseFloat(document.getElementById('editSalePrice').value);
    const quantity = parseInt(document.getElementById('editSaleQuantity').value);
    const discountType = document.getElementById('editSaleDiscountType').value;
    const discountValue = parseFloat(document.getElementById('editSaleDiscountValue').value) || 0;
    const paymentMethod = document.getElementById('editSalePaymentMethod').value;

    // Validate input
    if (!customerId || !watchId || !price || !paymentMethod || quantity <= 0) {
        Utils.showNotification('Please fill in all required fields correctly');
        return;
    }

    const customer = CustomerModule.getCustomerById(customerId);
    if (!customer) {
        Utils.showNotification('Selected customer not found');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Store original sale data for rollback
    const originalSale = { ...sale };
    
    try {
        // Show loading state
        submitBtn.textContent = 'Updating...';
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

        // Prepare update data
        const updateData = {
            customerId: customerId,
            items: [{
                watchId: watchId,
                quantity: quantity,
                price: price
            }],
            discountType: discountType,
            discountValue: discountValue,
            paymentMethod: paymentMethod
        };

        // Optimistic update - update UI immediately
        const optimisticSale = {
            ...sale,
            customerId: customerId,
            customerName: customer.name,
            items: updateData.items,
            discountType: discountType,
            discountValue: discountValue,
            discountAmount: discountAmount,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod
        };
        
        // Update local cache optimistically
        const saleIndex = window.SalesCoreModule.sales.findIndex(s => s.id === saleId);
        if (saleIndex !== -1) {
            window.SalesCoreModule.sales[saleIndex] = optimisticSale;
        }
        
        // Update UI immediately
        window.SalesCoreModule.renderSalesTable();
        if (window.updateDashboard) {
            updateDashboard();
        }

        // Call API
        const response = await api.sales.updateSale(saleId, updateData);
        
        if (response.success) {
            // Log action
            if (window.logSalesAction) {
                logSalesAction('Updated sale for ' + customer.name, response.data, customer);
            }
            
            // Update with actual API response
            window.SalesCoreModule.sales[saleIndex] = response.data;
            
            // Update customer counts if customer changed
            if (originalSale.customerId !== customerId) {
                CustomerModule.decrementCustomerPurchases(originalSale.customerId);
                CustomerModule.incrementCustomerPurchases(customerId);
            }
            
            // Final UI update
            window.SalesCoreModule.renderSalesTable();
            closeEditSaleModal();
            Utils.showNotification('Sale updated successfully!');
            
        } else {
            throw new Error(response.message || 'Failed to update sale');
        }
        
    } catch (error) {
        console.error('Update sale error:', error);
        
        // Rollback optimistic update
        const saleIndex = window.SalesCoreModule.sales.findIndex(s => s.id === saleId);
        if (saleIndex !== -1) {
            window.SalesCoreModule.sales[saleIndex] = originalSale;
        }
        window.SalesCoreModule.renderSalesTable();
        
        // Handle specific error cases
        if (error.message && error.message.includes('insufficient stock')) {
            Utils.showNotification('Insufficient stock available for the requested quantity.');
        } else if (error.message && error.message.includes('sale not found')) {
            Utils.showNotification('Sale not found. It may have been deleted by another user.');
        } else {
            Utils.showNotification(error.message || 'Failed to update sale. Please try again.');
        }
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Delete sale with API integration (override from core module)
 */
async function deleteSale(saleId) {
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to delete sales.');
        return;
    }

    const sale = window.SalesCoreModule.sales.find(s => s.id === saleId);
    if (!sale) {
        Utils.showNotification('Sale not found.');
        return;
    }

    const customerName = sale.customerName || 'this customer';
    if (confirm(`Are you sure you want to delete the sale for ${customerName}?`)) {
        
        // Store original data for rollback
        const originalSales = [...window.SalesCoreModule.sales];
        
        try {
            // Optimistic update - remove from UI immediately
            window.SalesCoreModule.sales = window.SalesCoreModule.sales.filter(s => s.id !== saleId);
            window.SalesCoreModule.renderSalesTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Call API
            const response = await api.sales.deleteSale(saleId, 'Deleted by user');
            
            if (response.success) {
                // Log action
                if (window.logSalesAction) {
                    logSalesAction('Deleted sale for ' + customerName, sale);
                }
                
                // Update customer purchase count
                if (window.CustomerModule) {
                    CustomerModule.decrementCustomerPurchases(sale.customerId);
                }
                
                Utils.showNotification('Sale deleted successfully!');
                
            } else {
                throw new Error(response.message || 'Failed to delete sale');
            }
            
        } catch (error) {
            console.error('Delete sale error:', error);
            
            // Rollback optimistic update
            window.SalesCoreModule.sales = originalSales;
            window.SalesCoreModule.renderSalesTable();
            
            Utils.showNotification(error.message || 'Failed to delete sale. Please try again.');
        }
    }
}

/**
 * Get sales statistics with API integration and server-side processing
 */
async function getSalesStats(dateFilter = {}) {
    try {
        // Try to get fresh stats from API with server-side processing
        const response = await api.sales.getSaleStats(dateFilter);
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get sales stats API error:', error);
    }
    
    // Fallback to local calculation
    let filteredSales = window.SalesCoreModule.sales;
    
    // Apply date filter if provided
    if (dateFilter.fromDate || dateFilter.toDate) {
        filteredSales = filterSalesByDateRange(dateFilter.fromDate, dateFilter.toDate);
    }
    
    const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const totalTransactions = filteredSales.length;
    const averageSaleValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const totalDiscounts = filteredSales.reduce((sum, sale) => sum + (sale.discountAmount || 0), 0);
    
    return {
        totalSales,
        totalTransactions,
        averageSaleValue,
        totalDiscounts
    };
}

/**
 * Get sales analytics with server-side processing
 */
async function getSalesAnalytics(params = {}) {
    try {
        const response = await api.sales.getSalesAnalytics(params);
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get sales analytics API error:', error);
    }
    
    // Fallback to local analytics
    return calculateLocalAnalytics(params);
}

/**
 * Calculate local analytics (fallback)
 */
function calculateLocalAnalytics(params) {
    let filteredSales = window.SalesCoreModule.sales;
    
    // Apply filters
    if (params.fromDate && params.toDate) {
        filteredSales = filterSalesByDateRange(params.fromDate, params.toDate);
    }
    
    if (params.customerId) {
        filteredSales = filteredSales.filter(s => s.customerId === params.customerId);
    }
    
    if (params.paymentMethod) {
        filteredSales = filteredSales.filter(s => s.paymentMethod === params.paymentMethod);
    }
    
    // Calculate analytics
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const totalTransactions = filteredSales.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Group by date
    const dailySales = {};
    filteredSales.forEach(sale => {
        const date = Utils.formatDate(new Date(sale.saleDate || sale.createdAt));
        if (!dailySales[date]) {
            dailySales[date] = { count: 0, amount: 0 };
        }
        dailySales[date].count++;
        dailySales[date].amount += sale.totalAmount || 0;
    });
    
    // Group by payment method
    const paymentMethodStats = {};
    filteredSales.forEach(sale => {
        const method = sale.paymentMethod || 'Unknown';
        if (!paymentMethodStats[method]) {
            paymentMethodStats[method] = { count: 0, amount: 0 };
        }
        paymentMethodStats[method].count++;
        paymentMethodStats[method].amount += sale.totalAmount || 0;
    });
    
    return {
        totalRevenue,
        totalTransactions,
        averageTransaction,
        dailySales,
        paymentMethodStats
    };
}

/**
 * Filter sales by date range
 */
function filterSalesByDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return window.SalesCoreModule.sales.filter(sale => {
        const saleDate = new Date(sale.saleDate || sale.createdAt);
        return saleDate >= from && saleDate <= to;
    });
}

/**
 * Filter sales by month and year
 */
function filterSalesByMonth(month, year) {
    return window.SalesCoreModule.sales.filter(sale => {
        const saleDate = new Date(sale.saleDate || sale.createdAt);
        return saleDate.getMonth() === parseInt(month) && saleDate.getFullYear() === parseInt(year);
    });
}

/**
 * Create Sales Modal (enhanced version)
 */
function createSalesModal() {
    if (document.getElementById('newSaleModal')) {
        return; // Modal already exists
    }
    
    const modalsContainer = document.getElementById('modals-container') || document.body;
    
    const modalHtml = `
        <!-- New Sale Modal -->
        <div id="newSaleModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="document.getElementById('newSaleModal').style.display='none'">&times;</span>
                <h2>New Sale</h2>
                <form onsubmit="SalesModule.addNewSale(event)">
                    <div class="form-group">
                        <label>Customer:</label>
                        <select id="saleCustomer" required>
                            <option value="">Select Customer</option>
                        </select>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Code:</label>
                            <input type="text" id="saleWatchCode" placeholder="Enter item code" onchange="searchWatchByCode()" style="text-transform: uppercase;">
                        </div>
                        <div class="form-group">
                            <label>Item:</label>
                            <select id="saleWatch" required onchange="updateSalePrice()">
                                <option value="">Select Item</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Quantity:</label>
                            <input type="number" id="saleQuantity" value="1" required min="1" onchange="updateCalculationDisplay()">
                        </div>
                        <div class="form-group">
                            <label>Price (₹):</label>
                            <input type="number" id="salePrice" required min="0" step="0.01" readonly style="background-color: #f0f0f0;">
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Discount Type:</label>
                            <select id="saleDiscountType" onchange="updateCalculationDisplay()">
                                <option value="">No Discount</option>
                                <option value="percentage">Percentage (%)</option>
                                <option value="amount">Amount (₹)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Discount Value:</label>
                            <input type="number" id="saleDiscountValue" value="0" min="0" step="0.01" onchange="updateCalculationDisplay()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Payment Method:</label>
                        <select id="salePaymentMethod" required>
                            <option value="">Select Payment Method</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Subtotal:</span>
                            <span id="saleSubtotal">₹0.00</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Discount:</span>
                            <span id="saleDiscountAmount">₹0.00</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px;">
                            <span>Total Amount:</span>
                            <span id="saleTotalAmount">₹0.00</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-danger" onclick="document.getElementById('newSaleModal').style.display='none'">Cancel</button>
                        <button type="submit" class="btn">Record Sale</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Sync Status Display -->
        <div id="salesSyncStatus" style="position: fixed; bottom: 100px; right: 20px; background: #f8f9fa; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #666; border: 1px solid #dee2e6; display: none;">
            Checking sync status...
        </div>
    `;
    
    modalsContainer.innerHTML += modalHtml;
}

/**
 * Initialize sales module with modal creation and API integration
 */
async function initializeSalesExtended() {
    createSalesModal();
    
    // Initialize core sales functionality
    await window.SalesCoreModule.initializeSales();
    
    // Setup automatic sync
    setupAutoSync();
    
    console.log('Sales extended module initialized with API integration');
}

/**
 * Setup automatic sync
 */
function setupAutoSync() {
    // Sync every 5 minutes
    setInterval(window.SalesCoreModule.syncWithServer, 5 * 60 * 1000);
    
    // Update sync status every 30 seconds
    setInterval(() => {
        const syncStatus = document.getElementById('salesSyncStatus');
        if (syncStatus && window.SalesCoreModule.lastSyncTime) {
            const timeAgo = getTimeAgo(window.SalesCoreModule.lastSyncTime);
            syncStatus.textContent = `Last synced: ${timeAgo}`;
            syncStatus.style.color = (new Date() - window.SalesCoreModule.lastSyncTime) > 300000 ? '#dc3545' : '#28a745';
        }
    }, 30 * 1000);
    
    // Show sync status initially
    setTimeout(() => {
        const syncStatus = document.getElementById('salesSyncStatus');
        if (syncStatus) {
            syncStatus.style.display = 'block';
        }
    }, 2000);
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

// Export functions for global use
window.SalesModule = {
    // Core functions from SalesCoreModule
    initializeSales: window.SalesCoreModule.initializeSales,
    loadSalesFromAPI: window.SalesCoreModule.loadSalesFromAPI,
    refreshSales: window.SalesCoreModule.refreshSales,
    openNewSaleModal: window.SalesCoreModule.openNewSaleModal,
    populateWatchDropdown: window.SalesCoreModule.populateWatchDropdown,
    searchWatchByCode: window.SalesCoreModule.searchWatchByCode,
    updateSalePrice: window.SalesCoreModule.updateSalePrice,
    updateCalculationDisplay: window.SalesCoreModule.updateCalculationDisplay,
    addNewSale: window.SalesCoreModule.addNewSale,
    viewSaleInvoice: window.SalesCoreModule.viewSaleInvoice,
    getSaleById: window.SalesCoreModule.getSaleById,
    getRecentSales: window.SalesCoreModule.getRecentSales,
    getSalesByCustomer: window.SalesCoreModule.getSalesByCustomer,
    searchSales: window.SalesCoreModule.searchSales,
    renderSalesTable: window.SalesCoreModule.renderSalesTable,
    exportSales: window.SalesCoreModule.exportSales,
    syncWithServer: window.SalesCoreModule.syncWithServer,
    
    // Extended functions from this module
    editSale,
    updateSale,
    deleteSale, // Override the core deleteSale with enhanced version
    calculateEditTotalAmount,
    closeEditSaleModal,
    updateEditSalePrice,
    getSalesStats,
    getSalesAnalytics,
    filterSalesByDateRange,
    filterSalesByMonth,
    createSalesModal,
    initializeSalesExtended,
    
    // Data access
    sales: window.SalesCoreModule.sales
};

// Make functions globally available for modal events
window.searchWatchByCode = function() {
    SalesModule.searchWatchByCode();
};

window.updateSalePrice = function() {
    SalesModule.updateSalePrice();
};

window.updateCalculationDisplay = function() {
    SalesModule.updateCalculationDisplay();
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.SalesModule) {
            SalesModule.initializeSalesExtended();
        }
    }, 100);
});