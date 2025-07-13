// ZEDSON WATCHCRAFT - Sales Extended Module (Part 2)

/**
 * Sales Transaction Management System - Extended Functions & Modal
 */

/**
 * Edit sale
 */
function editSale(saleId) {
    if (!AuthModule.hasPermission('sales')) {
        Utils.showNotification('You do not have permission to edit sales.');
        return;
    }

    const sale = window.SalesCoreModule.sales.find(s => s.id === saleId);
    if (!sale) {
        Utils.showNotification('Sale not found.');
        return;
    }

    // Create edit modal with discount fields
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editSaleModal';
    editModal.style.display = 'block';
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
                        <option value="">Select Item</option>
                    </select>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Quantity:</label>
                        <input type="number" id="editSaleQuantity" value="${sale.quantity}" required min="1" onchange="SalesModule.calculateEditTotalAmount()">
                    </div>
                    <div class="form-group">
                        <label>Price (₹):</label>
                        <input type="number" id="editSalePrice" value="${sale.price}" required min="0" step="0.01" onchange="SalesModule.calculateEditTotalAmount()">
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
                        <span id="editSaleSubtotal">${Utils.formatCurrency(sale.subtotal || sale.price * sale.quantity)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Discount:</span>
                        <span id="editSaleDiscountAmount">${Utils.formatCurrency(sale.discountAmount || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px;">
                        <span>Total Amount:</span>
                        <span id="editSaleTotalAmount">${Utils.formatCurrency(sale.totalAmount)}</span>
                    </div>
                </div>
                <button type="submit" class="btn">Update Sale</button>
                <button type="button" class="btn btn-danger" onclick="SalesModule.closeEditSaleModal()">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
    
    // Populate dropdowns
    CustomerModule.populateCustomerDropdown('editSaleCustomer');
    populateEditWatchDropdown('editSaleWatch');
    
    // Set current values
    setTimeout(() => {
        document.getElementById('editSaleCustomer').value = sale.customerId;
        document.getElementById('editSaleWatch').value = sale.watchId;
        calculateEditTotalAmount();
    }, 50);
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
 * Populate watch dropdown for edit modal
 */
function populateEditWatchDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Item</option>';
    
    if (window.InventoryModule && InventoryModule.watches) {
        InventoryModule.watches.forEach(watch => {
            select.innerHTML += `<option value="${watch.id}" data-price="${watch.price}">
                ${Utils.sanitizeHtml(watch.code)} - ${Utils.sanitizeHtml(watch.brand)} ${Utils.sanitizeHtml(watch.model)} (₹${watch.price})
            </option>`;
        });
    }
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
 * Update sale
 */
function updateSale(event, saleId) {
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
    const watch = InventoryModule.getWatchById(watchId);
    
    if (!customer || !watch) {
        Utils.showNotification('Selected customer or item not found');
        return;
    }

    // Check stock availability (considering the current sale's quantity)
    const availableStock = watch.quantity + sale.quantity;
    if (availableStock < quantity) {
        Utils.showNotification(`Insufficient stock. Only ${availableStock} available.`);
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

    // Restore previous inventory and customer counts
    InventoryModule.increaseWatchQuantity(sale.watchId, sale.quantity);
    CustomerModule.decrementCustomerPurchases(sale.customerId);

    // Update sale
    sale.customerId = customerId;
    sale.customerName = customer.name;
    sale.watchId = watchId;
    sale.watchName = `${watch.brand} ${watch.model}`;
    sale.watchCode = watch.code;
    sale.price = price;
    sale.quantity = quantity;
    sale.subtotal = subtotal;
    sale.discountType = discountType;
    sale.discountValue = discountValue;
    sale.discountAmount = discountAmount;
    sale.totalAmount = totalAmount;
    sale.paymentMethod = paymentMethod;

    // Apply new inventory and customer counts
    InventoryModule.decreaseWatchQuantity(watchId, quantity);
    CustomerModule.incrementCustomerPurchases(customerId);

    window.SalesCoreModule.renderSalesTable();
    if (window.updateDashboard) {
        updateDashboard();
    }
    closeEditSaleModal();
    Utils.showNotification('Sale updated successfully!');
}

/**
 * Get sales statistics
 */
function getSalesStats() {
    const totalSales = window.SalesCoreModule.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = window.SalesCoreModule.sales.length;
    const averageSaleValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const totalDiscounts = window.SalesCoreModule.sales.reduce((sum, sale) => sum + (sale.discountAmount || 0), 0);
    
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
    
    return window.SalesCoreModule.sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= from && saleDate <= to;
    });
}

/**
 * Filter sales by month and year
 */
function filterSalesByMonth(month, year) {
    return window.SalesCoreModule.sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate.getMonth() === parseInt(month) && saleDate.getFullYear() === parseInt(year);
    });
}

/**
 * Create Sales Modal
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
                    <button type="submit" class="btn">Record Sale</button>
                </form>
            </div>
        </div>
    `;
    
    modalsContainer.innerHTML += modalHtml;
}

/**
 * Initialize sales module with modal creation
 */
function initializeSales() {
    createSalesModal();
    window.SalesCoreModule.renderSalesTable();
    console.log('Sales module initialized');
}

// Export functions for global use
window.SalesModule = {
    // Core functions from Part 1
    openNewSaleModal: window.SalesCoreModule.openNewSaleModal,
    populateWatchDropdown: window.SalesCoreModule.populateWatchDropdown,
    searchWatchByCode: window.SalesCoreModule.searchWatchByCode,
    updateSalePrice: window.SalesCoreModule.updateSalePrice,
    updateCalculationDisplay: window.SalesCoreModule.updateCalculationDisplay,
    addNewSale: window.SalesCoreModule.addNewSale,
    deleteSale: window.SalesCoreModule.deleteSale,
    viewSaleInvoice: window.SalesCoreModule.viewSaleInvoice,
    getSaleById: window.SalesCoreModule.getSaleById,
    getRecentSales: window.SalesCoreModule.getRecentSales,
    getSalesByCustomer: window.SalesCoreModule.getSalesByCustomer,
    searchSales: window.SalesCoreModule.searchSales,
    renderSalesTable: window.SalesCoreModule.renderSalesTable,
    
    // Extended functions from Part 2
    editSale,
    updateSale,
    calculateEditTotalAmount,
    closeEditSaleModal,
    updateEditSalePrice,
    getSalesStats,
    filterSalesByDateRange,
    filterSalesByMonth,
    createSalesModal,
    initializeSales,
    
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
            SalesModule.initializeSales();
        }
    }, 100);
});