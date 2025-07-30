// ZEDSON WATCHCRAFT - Sales Core Module (FIXED with Database Integration)

/**
 * Sales Transaction Management System - Fully integrated with SQLite database
 */

// Sales database - Now managed by DatabaseAdapter
let sales = [];
let nextSaleId = 1;

/**
 * Open New Sale Modal - FIXED
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
    
    // Populate watch dropdown
    populateWatchDropdown('saleWatch');
    
    // Reset form
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
    
    // Reset calculation displays
    updateCalculationDisplay();
    
    modal.style.display = 'block';
}

/**
 * Populate watch dropdown with available watches
 */
function populateWatchDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Item</option>';
    
    if (window.InventoryModule && InventoryModule.watches) {
        const availableWatches = InventoryModule.getAvailableWatches();
        availableWatches.forEach(watch => {
            select.innerHTML += `<option value="${watch.id}" data-price="${watch.price}" data-code="${watch.code}">
                ${Utils.sanitizeHtml(watch.code)} - ${Utils.sanitizeHtml(watch.brand)} ${Utils.sanitizeHtml(watch.model)} (₹${watch.price})
            </option>`;
        });
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
 * Add new sale - FIXED to use database
 */
async function addNewSale(event) {
    event.preventDefault();
    
    console.log('Adding new sale...');
    
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

    // Get customer and watch details
    const customer = CustomerModule.getCustomerById(customerId);
    const watch = InventoryModule.getWatchById(watchId);
    
    if (!customer) {
        Utils.showNotification('Selected customer not found');
        return;
    }

    if (!watch) {
        Utils.showNotification('Selected item not found');
        return;
    }

    if (watch.quantity < quantity) {
        Utils.showNotification(`Insufficient stock. Only ${watch.quantity} available.`);
        return;
    }

    // Calculate amounts
    const subtotal = price * quantity;
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
        discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
    } else if (discountType === 'amount') {
        discountAmount = Math.min(discountValue, subtotal);
    }
    
    const totalAmount = subtotal - discountAmount;

    // Create sale object
    const now = new Date();
    const saleData = {
        customerId: customerId,
        watchId: watchId,
        price: price,
        quantity: quantity,
        subtotal: subtotal,
        discountType: discountType,
        discountValue: discountValue,
        discountAmount: discountAmount,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        date: Utils.formatDate(now),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        createdBy: AuthModule.getCurrentUser().username
    };

    try {
        // Use database adapter to add sale
        await window.DatabaseAdapter.addSale(saleData);

        Utils.showNotification(`Sale recorded successfully! Total: ${Utils.formatCurrency(totalAmount)}`);
        
        // Close modal and reset form
        document.getElementById('newSaleModal').style.display = 'none';
        event.target.reset();
        
        // Log action
        if (window.logSalesAction) {
            logSalesAction('Added new sale: ' + customer.name + ' - ' + watch.brand + ' ' + watch.model, {
                customerId: customerId,
                customerName: customer.name,
                watchName: watch.brand + ' ' + watch.model,
                totalAmount: totalAmount
            });
        }
        
    } catch (error) {
        console.error('Failed to add sale:', error);
        Utils.showNotification('Failed to record sale: ' + error.message);
    }
}

/**
 * Delete sale - FIXED to use database
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

    if (confirm(`Are you sure you want to delete the sale for ${sale.watchName}?`)) {
        try {
            // Use database adapter to delete sale
            await window.DatabaseAdapter.deleteSale(saleId);
            
            Utils.showNotification('Sale deleted successfully!');
            
            // Log action
            if (window.logSalesAction) {
                logSalesAction('Deleted sale: ' + sale.customerName + ' - ' + sale.watchName, sale);
            }
            
        } catch (error) {
            console.error('Failed to delete sale:', error);
            Utils.showNotification('Failed to delete sale: ' + error.message);
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
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
}

/**
 * Get sales by customer
 */
function getSalesByCustomer(customerId) {
    return sales.filter(sale => sale.customerId === customerId);
}

/**
 * Search sales
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
 * Render sales table - UPDATED for database integration
 */
function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Use sales from global array (populated by DatabaseAdapter)
    if (!sales || sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #999; padding: 20px;">
                    No sales yet. Click "New Sale" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort sales by date (newest first)
    const sortedSales = sales.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
    
    sortedSales.forEach((sale, index) => {
        const row = document.createElement('tr');
        
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
        
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>${Utils.sanitizeHtml(sale.date || sale.sale_date)}</td>
            <td>${Utils.sanitizeHtml(sale.time || sale.sale_time)}</td>
            <td class="customer-info">
                <div class="customer-name">${Utils.sanitizeHtml(sale.customerName || sale.customer_name)}</div>
                <div class="customer-mobile">${Utils.sanitizeHtml(customerMobile)}</div>
            </td>
            <td>
                <strong>${Utils.sanitizeHtml(sale.watchName || sale.watch_name)}</strong><br>
                <small>Code: ${Utils.sanitizeHtml(sale.watchCode || sale.watch_code)}</small><br>
                <small>Qty: ${sale.quantity}</small>
            </td>
            <td>
                ${Utils.formatCurrency(sale.totalAmount || sale.total_amount)}
                ${discountInfo}
            </td>
            <td><span class="status available">${Utils.sanitizeHtml(sale.paymentMethod || sale.payment_method)}</span></td>
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
}

/**
 * Get sales statistics
 */
function getSalesStats() {
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || sale.total_amount || 0), 0);
    const totalTransactions = sales.length;
    const averageSaleValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const totalDiscounts = sales.reduce((sum, sale) => sum + (sale.discountAmount || sale.discount_amount || 0), 0);
    
    return {
        totalSales,
        totalTransactions,
        averageSaleValue,
        totalDiscounts
    };
}

/**
 * Filter sales by date range
 */
function filterSalesByDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return sales.filter(sale => {
        const saleDate = new Date(sale.timestamp || sale.created_at);
        return saleDate >= from && saleDate <= to;
    });
}

/**
 * Filter sales by month and year
 */
function filterSalesByMonth(month, year) {
    return sales.filter(sale => {
        const saleDate = new Date(sale.timestamp || sale.created_at);
        return saleDate.getMonth() === parseInt(month) && saleDate.getFullYear() === parseInt(year);
    });
}

/**
 * Initialize sales module
 */
function initializeSales() {
    renderSalesTable();
    console.log('Sales core module initialized');
}

// Export core functions for Part 2
window.SalesCoreModule = {
    openNewSaleModal,
    populateWatchDropdown,
    searchWatchByCode,
    updateSalePrice,
    updateCalculationDisplay,
    addNewSale,
    deleteSale,
    viewSaleInvoice,
    getSaleById,
    getRecentSales,
    getSalesByCustomer,
    searchSales,
    renderSalesTable,
    getSalesStats,
    filterSalesByDateRange,
    filterSalesByMonth,
    initializeSales,
    sales // For access by other modules
};