// ZEDSON WATCHCRAFT - Sales Core Module with API Integration

/**
 * Sales Transaction Management System - API Integrated Core Functions
 */

// Local cache for sales (for quick access)
let sales = [];

/**
 * Reset button to original state
 */
function resetButton(button, originalText) {
    if (button) {
        button.textContent = originalText;
        button.disabled = false;
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
 * Initialize sales module with API data
 */
async function initializeSales() {
    try {
        await loadSalesFromAPI();
        renderSalesTable();
        console.log('Sales module initialized with API integration');
    } catch (error) {
        console.error('Sales initialization error:', error);
        Utils.showNotification('Failed to load sales. Please refresh the page.');
    }
}

/**
 * Load sales from API
 */
async function loadSalesFromAPI() {
    try {
        const response = await SalesAPI.getSales();
        if (response.success) {
            sales = response.data || [];
            console.log(`Loaded ${sales.length} sales from API`);
        }
    } catch (error) {
        console.error('Load sales error:', error);
        throw error;
    }
}

/**
 * Open New Sale Modal
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
        
        // Reset the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            resetButton(submitBtn, 'Record Sale');
        }
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
 * Add new sale with API integration
 */
async function addNewSale(event) {
    event.preventDefault();
    
    console.log('Adding new sale...');
    
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to create sales.');
        return;
    }

    // Get form data
    const customerId = document.getElementById('saleCustomer').value;
    const inventoryId = document.getElementById('saleWatch').value;
    const price = parseFloat(document.getElementById('salePrice').value);
    const quantity = parseInt(document.getElementById('saleQuantity').value) || 1;
    const discountType = document.getElementById('saleDiscountType').value;
    const discountValue = parseFloat(document.getElementById('saleDiscountValue').value) || 0;
    const paymentMethod = document.getElementById('salePaymentMethod').value;
    
    // Validate input
    if (!customerId || !inventoryId || !price || !paymentMethod) {
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

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Recording Sale...');

    try {
        const saleData = {
            customerId,
            inventoryId,
            price,
            quantity,
            discountType,
            discountValue,
            paymentMethod
        };

        const response = await SalesAPI.createSale(saleData);

        if (response.success) {
            // Log action
            if (window.logSalesAction) {
                logSalesAction(`Created new sale for ${response.data.customerName}`, response.data);
            }
            
            // Add to local cache
            sales.push(response.data);
            
            // Generate Sales Invoice automatically
            try {
                const invoiceResponse = await InvoiceAPI.generateSalesInvoice(response.data.id);
                if (invoiceResponse.success) {
                    response.data.invoiceGenerated = true;
                    response.data.invoiceId = invoiceResponse.data.id;
                }
            } catch (invoiceError) {
                console.error('Invoice generation error:', invoiceError);
                // Don't fail the sale if invoice generation fails
            }
            
            // Update displays
            renderSalesTable();
            updateDashboard();
            
            // Close modal and reset form
            closeModal('newSaleModal');
            event.target.reset();
            
            Utils.showNotification(`Sale recorded successfully! Sale ID: ${response.data.id}. Total: ${Utils.formatCurrency(response.data.totalAmount)}. Invoice automatically generated.`);
        }

    } catch (error) {
        console.error('Add sale error:', error);
        Utils.showNotification(error.message || 'Failed to record sale. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Record Sale');
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

    if (confirm(`Are you sure you want to delete the sale for ${sale.watchName}?`)) {
        try {
            const response = await SalesAPI.deleteSale(saleId);
            
            if (response.success) {
                // Log action
                if (window.logSalesAction) {
                    logSalesAction(`Deleted sale for ${sale.customerName}`, sale);
                }
                
                // Remove from local cache
                sales = sales.filter(s => s.id !== saleId);
                
                renderSalesTable();
                updateDashboard();
                Utils.showNotification('Sale deleted successfully!');
            }

        } catch (error) {
            console.error('Delete sale error:', error);
            Utils.showNotification(error.message || 'Failed to delete sale. Please try again.');
        }
    }
}

/**
 * View sale invoice with API integration
 */
async function viewSaleInvoice(saleId) {
    if (!window.InvoiceModule) {
        Utils.showNotification('Invoice module not available.');
        return;
    }
    
    try {
        const response = await InvoiceAPI.getInvoicesByTransaction(saleId, 'sale');
        if (response.success && response.data.length > 0) {
            const salesInvoice = response.data.find(inv => inv.type === 'Sales');
            if (salesInvoice) {
                InvoiceModule.viewInvoice(salesInvoice.id);
            } else {
                Utils.showNotification('No sales invoice found for this sale.');
            }
        } else {
            Utils.showNotification('No invoice found for this sale.');
        }
    } catch (error) {
        console.error('View sale invoice error:', error);
        Utils.showNotification('Failed to load invoice.');
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
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
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
 * Render sales table with API data
 */
function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #999; padding: 20px;">
                    No sales found. Click "New Sale" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort sales by date (newest first)
    const sortedSales = sales.sort((a, b) => 
        new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
    );
    
    sortedSales.forEach((sale, index) => {
        const row = document.createElement('tr');
        
        // Check if invoice exists for this sale
        const hasInvoice = sale.invoiceGenerated || sale.invoiceId;
        
        // Display discount info if applicable
        let discountInfo = '';
        if (sale.discountAmount && sale.discountAmount > 0) {
            discountInfo = `<br><small style="color: #dc3545;">Discount: ${Utils.formatCurrency(sale.discountAmount)}</small>`;
        }
        
        // Get customer mobile number
        const customer = window.CustomerModule ? CustomerModule.getCustomerById(sale.customerId) : null;
        const customerMobile = customer ? customer.phone : 
            (sale.customerId && sale.customerId.phone ? sale.customerId.phone : 'N/A');
        
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
                <button class="btn btn-sm" onclick="SalesModule.editSale('${sale.id}')" 
                    ${!AuthModule.hasPermission('sales') ? 'disabled' : ''}>Edit</button>
                <button class="btn btn-sm btn-danger" onclick="confirmTransaction('Are you sure you want to delete this sale?', () => SalesModule.deleteSale('${sale.id}'))" 
                    ${!AuthModule.hasPermission('sales') ? 'disabled' : ''}>Delete</button>
                ${hasInvoice ? 
                    `<button class="btn btn-sm btn-success" onclick="SalesModule.viewSaleInvoice('${sale.id}')" title="View Invoice">Invoice</button>` : 
                    ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Refresh sales from API
 */
async function refreshSales() {
    try {
        await loadSalesFromAPI();
        renderSalesTable();
        console.log('Sales refreshed from API');
    } catch (error) {
        console.error('Refresh sales error:', error);
        Utils.showNotification('Failed to refresh sales data.');
    }
}

// Export core functions for Part 2
window.SalesCoreModuleAPI = {
    initializeSales,
    loadSalesFromAPI,
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
    refreshSales,
    resetButton,
    setButtonLoading,
    sales // For access by other modules
};