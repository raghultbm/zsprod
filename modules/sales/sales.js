// Sales module for ZEDSON Watchcraft - Simple & Reliable
(function() {
    'use strict';
    
    if (typeof window.SalesModule !== 'undefined') {
        return;
    }

class SalesModule {
    constructor() {
        this.sales = [];
        this.customers = [];
        this.inventory = [];
        this.selectedItems = [];
        this.editingSale = null;
        this.searchTerm = '';
        this.filters = {};
    }

    render(container) {
        console.log('Sales module: Starting render...');
        
        container.innerHTML = this.getTemplate();
        this.loadData();
        this.setupEvents();
        this.renderSalesList();
        
        console.log('Sales module: Render completed');
    }

    getTemplate() {
        return `
            <div class="sales-container">
                <div class="sales-header">
                    <h1>Sales Management</h1>
                    <button class="btn btn-primary" id="new-sale-btn">
                        <span>+</span> New Sale
                    </button>
                </div>

                <div class="sales-toolbar">
                    <div class="search-section">
                        <input type="text" id="sales-search" class="form-input" 
                               placeholder="Search by customer, invoice...">
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="date-filter" class="form-select">
                            <option value="">All Dates</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        
                        <select id="payment-filter" class="form-select">
                            <option value="">All Payments</option>
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                        </select>
                    </div>
                </div>

                <div class="sales-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-sales">0</span>
                        <span class="stat-label">Total Sales</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="today-sales">₹0</span>
                        <span class="stat-label">Today's Revenue</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="month-sales">₹0</span>
                        <span class="stat-label">This Month</span>
                    </div>
                </div>

                <div class="sales-list-container">
                    <div id="sales-list"></div>
                </div>

                <!-- Sale Form Modal -->
                <div id="sale-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-header">
                            <h3 id="sale-modal-title">New Sale</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="sale-form" class="form">
                                <!-- Customer Selection -->
                                <div class="form-section">
                                    <h4>Customer Information</h4>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label required">Customer</label>
                                            <select name="customerId" id="customer-select" class="form-select" required>
                                                <option value="">Select Customer</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Sale Date</label>
                                            <input type="date" name="saleDate" class="form-input" required>
                                        </div>
                                    </div>
                                </div>

                                <!-- Items Selection -->
                                <div class="form-section">
                                    <h4>Items</h4>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label">Select Items</label>
                                            <select id="item-select" class="form-select">
                                                <option value="">Choose items to add</option>
                                            </select>
                                            <button type="button" class="btn btn-secondary" id="add-item-btn">Add Item</button>
                                        </div>
                                    </div>
                                    <div id="selected-items" class="selected-items"></div>
                                </div>

                                <!-- Pricing -->
                                <div class="form-section">
                                    <h4>Pricing</h4>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label">Subtotal</label>
                                            <input type="number" id="subtotal" class="form-input" readonly>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Discount Type</label>
                                            <select name="discountType" class="form-select">
                                                <option value="percentage">Percentage</option>
                                                <option value="amount">Amount</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Discount Value</label>
                                            <input type="number" name="discountValue" class="form-input" min="0" step="0.01">
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label">Advance Amount</label>
                                            <input type="number" name="advanceAmount" class="form-input" min="0" step="0.01">
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Payment Mode</label>
                                            <select name="paymentMode" class="form-select" required>
                                                <option value="">Select Payment Mode</option>
                                                <option value="UPI">UPI</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="Multiple Payment Modes">Multiple</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Total Amount</label>
                                            <input type="number" id="total-amount" class="form-input" readonly>
                                        </div>
                                    </div>
                                </div>

                                <div id="sale-form-errors" class="form-errors" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="sale-form" class="btn btn-primary" id="save-sale-btn">
                                Complete Sale
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Confirmation Modal -->
                <div id="sale-confirm-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-md">
                        <div class="modal-header">
                            <h3>Confirm Sale</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <div id="sale-summary"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Edit
                            </button>
                            <button type="button" class="btn btn-primary" id="confirm-sale-btn">
                                Confirm & Generate Invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadData() {
        // Load sales data
        app.query('SELECT s.*, c.name as customer_name, c.mobile FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY s.created_at DESC')
            .then(sales => {
                this.sales = sales || [];
                this.updateStats();
                this.renderSalesList();
            });

        // Load customers for dropdown
        app.query('SELECT id, customer_id, name, mobile FROM customers ORDER BY name')
            .then(customers => {
                this.customers = customers || [];
                this.populateCustomers();
            });

        // Load available inventory
        app.query('SELECT * FROM inventory WHERE is_sold = 0 ORDER BY category, code')
            .then(inventory => {
                this.inventory = inventory || [];
                this.populateInventory();
            });
    }

    setupEvents() {
        // New sale button
        document.getElementById('new-sale-btn').onclick = () => this.openSaleModal();

        // Search
        document.getElementById('sales-search').oninput = (e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        };

        // Clear search
        document.getElementById('clear-search').onclick = () => {
            document.getElementById('sales-search').value = '';
            this.searchTerm = '';
            this.applyFilters();
        };

        // Filters
        document.getElementById('date-filter').onchange = (e) => {
            this.filters.date = e.target.value;
            this.applyFilters();
        };

        document.getElementById('payment-filter').onchange = (e) => {
            this.filters.payment = e.target.value;
            this.applyFilters();
        };

        // Form events
        document.getElementById('sale-form').onsubmit = (e) => this.handleSaleSubmit(e);
        document.getElementById('add-item-btn').onclick = () => this.addSelectedItem();
        document.getElementById('confirm-sale-btn').onclick = () => this.confirmSale();

        // Auto-calculate totals
        const discountInputs = document.querySelectorAll('input[name="discountValue"], select[name="discountType"], input[name="advanceAmount"]');
        discountInputs.forEach(input => {
            input.oninput = () => this.calculateTotals();
        });

        // Set today's date
        document.querySelector('input[name="saleDate"]').value = Utils.getCurrentDate();
    }

    populateCustomers() {
        const select = document.getElementById('customer-select');
        select.innerHTML = '<option value="">Select Customer</option>';
        
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.customer_id}) - ${customer.mobile}`;
            select.appendChild(option);
        });
    }

    populateInventory() {
        const select = document.getElementById('item-select');
        select.innerHTML = '<option value="">Choose items to add</option>';
        
        this.inventory.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.code} - ${item.category} - ₹${item.amount}`;
            select.appendChild(option);
        });
    }

    addSelectedItem() {
        const select = document.getElementById('item-select');
        const itemId = select.value;
        
        if (!itemId) return;
        
        const item = this.inventory.find(i => i.id == itemId);
        if (!item) return;
        
        // Check if already selected
        if (this.selectedItems.find(i => i.id == itemId)) {
            alert('Item already selected');
            return;
        }
        
        this.selectedItems.push(item);
        this.renderSelectedItems();
        this.calculateTotals();
        
        // Reset selection
        select.value = '';
    }

    renderSelectedItems() {
        const container = document.getElementById('selected-items');
        
        if (this.selectedItems.length === 0) {
            container.innerHTML = '<p class="text-muted">No items selected</p>';
            return;
        }
        
        const itemsHTML = this.selectedItems.map(item => `
            <div class="selected-item">
                <div class="item-info">
                    <strong>${item.code}</strong> - ${item.category}
                    <br><small>${item.particulars || 'No details'}</small>
                </div>
                <div class="item-price">₹${item.amount}</div>
                <button type="button" class="btn btn-sm btn-error" onclick="salesModule.removeItem(${item.id})">
                    Remove
                </button>
            </div>
        `).join('');
        
        container.innerHTML = itemsHTML;
    }

    removeItem(itemId) {
        this.selectedItems = this.selectedItems.filter(item => item.id != itemId);
        this.renderSelectedItems();
        this.calculateTotals();
    }

    calculateTotals() {
        const subtotal = this.selectedItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        document.getElementById('subtotal').value = subtotal.toFixed(2);
        
        const discountType = document.querySelector('select[name="discountType"]').value;
        const discountValue = parseFloat(document.querySelector('input[name="discountValue"]').value) || 0;
        const advanceAmount = parseFloat(document.querySelector('input[name="advanceAmount"]').value) || 0;
        
        let discountAmount = 0;
        if (discountType === 'percentage') {
            discountAmount = (subtotal * discountValue) / 100;
        } else {
            discountAmount = discountValue;
        }
        
        const totalAmount = subtotal - discountAmount;
        const balanceAmount = totalAmount - advanceAmount;
        
        document.getElementById('total-amount').value = totalAmount.toFixed(2);
    }

    handleSaleSubmit(e) {
        e.preventDefault();
        
        if (this.selectedItems.length === 0) {
            this.showFormErrors({ items: 'Please select at least one item' });
            return;
        }
        
        const formData = new FormData(e.target);
        const saleData = {
            customerId: formData.get('customerId'),
            saleDate: formData.get('saleDate'),
            items: this.selectedItems,
            subtotal: parseFloat(document.getElementById('subtotal').value),
            discountType: formData.get('discountType'),
            discountValue: parseFloat(formData.get('discountValue')) || 0,
            advanceAmount: parseFloat(formData.get('advanceAmount')) || 0,
            totalAmount: parseFloat(document.getElementById('total-amount').value),
            paymentMode: formData.get('paymentMode')
        };
        
        // Validation
        if (!saleData.customerId) {
            this.showFormErrors({ customer: 'Please select a customer' });
            return;
        }
        
        if (!saleData.paymentMode) {
            this.showFormErrors({ payment: 'Please select payment mode' });
            return;
        }
        
        this.showSaleConfirmation(saleData);
    }

    showSaleConfirmation(saleData) {
        const customer = this.customers.find(c => c.id == saleData.customerId);
        
        const summaryHTML = `
            <div class="sale-summary">
                <h4>Sale Summary</h4>
                <table class="table">
                    <tr><td><strong>Customer:</strong></td><td>${customer.name} (${customer.customer_id})</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${Utils.formatDate(saleData.saleDate)}</td></tr>
                    <tr><td><strong>Items:</strong></td><td>${saleData.items.length} item(s)</td></tr>
                    <tr><td><strong>Subtotal:</strong></td><td>₹${saleData.subtotal.toFixed(2)}</td></tr>
                    <tr><td><strong>Discount:</strong></td><td>₹${this.calculateDiscountAmount(saleData).toFixed(2)}</td></tr>
                    <tr><td><strong>Total:</strong></td><td><strong>₹${saleData.totalAmount.toFixed(2)}</strong></td></tr>
                    <tr><td><strong>Advance:</strong></td><td>₹${saleData.advanceAmount.toFixed(2)}</td></tr>
                    <tr><td><strong>Balance:</strong></td><td>₹${(saleData.totalAmount - saleData.advanceAmount).toFixed(2)}</td></tr>
                    <tr><td><strong>Payment:</strong></td><td>${saleData.paymentMode}</td></tr>
                </table>
            </div>
        `;
        
        document.getElementById('sale-summary').innerHTML = summaryHTML;
        document.getElementById('sale-confirm-modal').style.display = 'block';
        
        // Store data for confirmation
        this.pendingSale = saleData;
    }

    calculateDiscountAmount(saleData) {
        if (saleData.discountType === 'percentage') {
            return (saleData.subtotal * saleData.discountValue) / 100;
        }
        return saleData.discountValue;
    }

    confirmSale() {
        const saleData = this.pendingSale;
        if (!saleData) return;
        
        // Generate invoice number
        const invoiceNumber = this.generateInvoiceNumber();
        
        // Calculate amounts
        const discountAmount = this.calculateDiscountAmount(saleData);
        const balanceAmount = saleData.totalAmount - saleData.advanceAmount;
        
        // Save sale to database
        app.run(`
            INSERT INTO sales (
                customer_id, sale_date, inventory_ids, particulars, subtotal,
                discount_type, discount_value, discount_amount, advance_amount,
                balance_amount, total_amount, payment_mode, invoice_number,
                created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            saleData.customerId,
            saleData.saleDate,
            JSON.stringify(saleData.items.map(i => i.id)),
            JSON.stringify(saleData.items),
            saleData.subtotal,
            saleData.discountType,
            saleData.discountValue,
            discountAmount,
            saleData.advanceAmount,
            balanceAmount,
            saleData.totalAmount,
            saleData.paymentMode,
            invoiceNumber,
            Auth.getCurrentUser()?.username || 'system',
            new Date().toISOString()
        ]).then(result => {
            // Mark inventory items as sold
            saleData.items.forEach(item => {
                app.run('UPDATE inventory SET is_sold = 1 WHERE id = ?', [item.id]);
            });
            
            // Log audit
            if (typeof Audit !== 'undefined') {
                Audit.logCreate('sales', result.id, saleData, `Created sale: ${invoiceNumber}`);
            }
            
            // Close modals
            document.getElementById('sale-confirm-modal').style.display = 'none';
            document.getElementById('sale-modal').style.display = 'none';
            
            // Refresh data
            this.loadData();
            
            // Show success
            Utils.showSuccess(`Sale completed successfully! Invoice: ${invoiceNumber}`);
            
            // TODO: Generate and show invoice
            this.generateInvoice(result.id, invoiceNumber, saleData);
        }).catch(error => {
            console.error('Sale creation error:', error);
            Utils.showError('Failed to create sale');
        });
    }

    generateInvoiceNumber() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const random = Math.floor(100 + Math.random() * 900);
        
        return `INVSA${year}${month}${day}1${random}`;
    }

    generateInvoice(saleId, invoiceNumber, saleData) {
        // TODO: Implement invoice generation
        console.log('Generating invoice:', invoiceNumber);
        alert(`Invoice ${invoiceNumber} generated successfully!`);
    }

    openSaleModal() {
        document.getElementById('sale-modal').style.display = 'block';
        this.selectedItems = [];
        this.renderSelectedItems();
        document.getElementById('sale-form').reset();
        document.querySelector('input[name="saleDate"]').value = Utils.getCurrentDate();
        this.calculateTotals();
    }

    applyFilters() {
        // Simple filtering logic
        let filtered = [...this.sales];
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(sale => 
                sale.customer_name?.toLowerCase().includes(term) ||
                sale.invoice_number?.toLowerCase().includes(term)
            );
        }
        
        // Date filtering
        if (this.filters.date) {
            const today = new Date();
            filtered = filtered.filter(sale => {
                const saleDate = new Date(sale.sale_date);
                switch (this.filters.date) {
                    case 'today':
                        return saleDate.toDateString() === today.toDateString();
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return saleDate >= weekAgo;
                    case 'month':
                        return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
                    default:
                        return true;
                }
            });
        }
        
        // Payment filtering
        if (this.filters.payment) {
            filtered = filtered.filter(sale => sale.payment_mode === this.filters.payment);
        }
        
        this.renderSalesList(filtered);
    }

    renderSalesList(salesData = null) {
        const sales = salesData || this.sales;
        const container = document.getElementById('sales-list');
        
        if (sales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No sales found</h3>
                    <p>Start by creating your first sale</p>
                    <button class="btn btn-primary" onclick="salesModule.openSaleModal()">
                        Create Sale
                    </button>
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map((sale, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${Utils.formatDate(sale.sale_date)}</td>
                            <td class="font-mono">${sale.invoice_number || `SALE-${sale.id}`}</td>
                            <td>${sale.customer_name || 'Unknown'}</td>
                            <td>${this.getItemsCount(sale.inventory_ids)} items</td>
                            <td class="font-semibold">₹${sale.total_amount}</td>
                            <td>${sale.payment_mode}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-info" onclick="salesModule.viewSale(${sale.id})" title="View">
                                        👁️
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="salesModule.printInvoice(${sale.id})" title="Print Invoice">
                                        🖨️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    }

    getItemsCount(inventoryIds) {
        try {
            const ids = JSON.parse(inventoryIds || '[]');
            return Array.isArray(ids) ? ids.length : 0;
        } catch {
            return 0;
        }
    }

    updateStats() {
        const totalSales = this.sales.length;
        
        // Today's sales
        const today = new Date().toDateString();
        const todaySales = this.sales.filter(sale => 
            new Date(sale.sale_date).toDateString() === today
        );
        const todayRevenue = todaySales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
        
        // This month's sales
        const thisMonth = new Date();
        const monthSales = this.sales.filter(sale => {
            const saleDate = new Date(sale.sale_date);
            return saleDate.getMonth() === thisMonth.getMonth() && 
                   saleDate.getFullYear() === thisMonth.getFullYear();
        });
        const monthRevenue = monthSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
        
        document.getElementById('total-sales').textContent = totalSales;
        document.getElementById('today-sales').textContent = Utils.formatCurrency(todayRevenue);
        document.getElementById('month-sales').textContent = Utils.formatCurrency(monthRevenue);
    }

    viewSale(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) return;
        
        alert(`Sale Details:\nInvoice: ${sale.invoice_number}\nCustomer: ${sale.customer_name}\nAmount: ₹${sale.total_amount}\nDate: ${Utils.formatDate(sale.sale_date)}`);
    }

    printInvoice(saleId) {
        // TODO: Implement invoice printing
        console.log('Printing invoice for sale:', saleId);
        alert('Invoice printing feature will be implemented');
    }

    showFormErrors(errors) {
        const errorsDiv = document.getElementById('sale-form-errors');
        const errorMessages = Object.values(errors).map(error => `<div>• ${error}</div>`).join('');
        
        errorsDiv.innerHTML = `
            <div class="alert alert-error">
                <strong>Please fix the following errors:</strong>
                ${errorMessages}
            </div>
        `;
        errorsDiv.style.display = 'block';
    }

    cleanup() {
        console.log('Cleaning up sales module...');
        this.selectedItems = [];
        this.pendingSale = null;
    }
}

// Register module
window.SalesModule = SalesModule;
const salesModule = new SalesModule();
if (typeof app !== 'undefined') {
    app.registerModule('sales', salesModule);
}

})();