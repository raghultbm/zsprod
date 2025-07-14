// ZEDSON WATCHCRAFT - Sales Core Module (Part 1)

/**
 * Sales Transaction Management System - Core Functions
 */

// Sales database
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
 * Add new sale
 */
function addNewSale(event) {
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

    // Create sale object with time and discount details
    const now = new Date();
    const newSale = {
        id: nextSaleId++,
        date: Utils.formatDate(now),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Utils.getCurrentTimestamp(),
        customerId: customerId,
        customerName: customer.name,
        watchId: watchId,
        watchName: `${watch.brand} ${watch.model}`,
        watchCode: watch.code,
        price: price,
        quantity: quantity,
        subtotal: subtotal,
        discountType: discountType,
        discountValue: discountValue,
        discountAmount: discountAmount,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        status: 'completed',
        createdBy: AuthModule.getCurrentUser().username,
        invoiceGenerated: false,
        notes: []
    };

    // Add to sales array
    sales.push(newSale);
    
    // Update inventory (decrease quantity)
    InventoryModule.decreaseWatchQuantity(watchId, quantity);
    
    // Update customer purchase count
    CustomerModule.incrementCustomerPurchases(customerId);
    
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
    
    Utils.showNotification(`Sale recorded successfully! Sale ID: ${newSale.id}. Total: ${Utils.formatCurrency(totalAmount)}. Invoice automatically generated.`);
    console.log('Sale added:', newSale);
}

/**
 * Delete sale
 */
function deleteSale(saleId) {
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
        // Restore inventory and customer counts
        InventoryModule.increaseWatchQuantity(sale.watchId, sale.quantity);
        CustomerModule.decrementCustomerPurchases(sale.customerId);
        
        // Remove from sales array
        sales = sales.filter(s => s.id !== saleId);
        
        renderSalesTable();
        if (window.updateDashboard) {
            updateDashboard();
        }
        Utils.showNotification('Sale deleted successfully!');
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
 * Render sales table
 */
function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort sales by date (newest first)
    const sortedSales = sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
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
            <td>${Utils.sanitizeHtml(sale.date)}</td>
            <td>${Utils.sanitizeHtml(sale.time)}</td>
            <td class="customer-info">
                <div class="customer-name">${Utils.sanitizeHtml(sale.customerName)}</div>
                <div class="customer-mobile">${Utils.sanitizeHtml(customerMobile)}</div>
            </td>
            <td>
                <strong>${Utils.sanitizeHtml(sale.watchName)}</strong><br>
                <small>Code: ${Utils.sanitizeHtml(sale.watchCode)}</small><br>
                <small>Qty: ${sale.quantity}</small>
            </td>
            <td>
                ${Utils.formatCurrency(sale.totalAmount)}
                ${discountInfo}
            </td>
            <td><span class="status available">${Utils.sanitizeHtml(sale.paymentMethod)}</span></td>
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
    sales // For access by other modules
};