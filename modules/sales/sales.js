const { allQuery, getQuery, runQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Sales {
    constructor() {
        this.sales = [];
        this.filteredSales = [];
        this.searchTerm = '';
        this.sortField = 'sale_date';
        this.sortDirection = 'desc';
        this.currentSale = null;
        this.cart = {
            customer: null,
            items: [],
            discountType: 'Percentage',
            discountValue: 0,
            advanceAmount: 0
        };
    }

    async render() {
        return `
            <div class="sales-container">
                <!-- Action Bar -->
                <div class="search-filter-bar">
                    <div class="search-box">
                        <input type="text" id="sales-search" placeholder="Search sales..." 
                               oninput="sales.handleSearch(this.value)">
                    </div>
                    <div class="filter-group">
                        <input type="date" id="date-from" onchange="sales.applyFilters()" title="From Date">
                        <input type="date" id="date-to" onchange="sales.applyFilters()" title="To Date">
                        <select id="sort-field" onchange="sales.handleSort()">
                            <option value="sale_date">Sort by Date</option>
                            <option value="invoice_number">Sort by Invoice</option>
                            <option value="customer_name">Sort by Customer</option>
                            <option value="total_amount">Sort by Amount</option>
                        </select>
                        <select id="sort-direction" onchange="sales.handleSort()">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="sales.showNewSaleForm()">
                        <span>+</span> New Sale
                    </button>
                </div>

                <!-- Sales List -->
                <div class="table-container">
                    <table class="table" id="sales-table">
                        <thead>
                            <tr>
                                <th onclick="sales.sortBy('sale_date')">S.No</th>
                                <th onclick="sales.sortBy('invoice_number')">Invoice Number</th>
                                <th onclick="sales.sortBy('customer_name')">Customer</th>
                                <th onclick="sales.sortBy('sale_date')">Sale Date</th>
                                <th onclick="sales.sortBy('total_amount')">Total Amount</th>
                                <th onclick="sales.sortBy('payment_mode')">Payment Mode</th>
                                <th onclick="sales.sortBy('status')">Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="sales-tbody">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading sales...</div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            await this.loadSales();
            this.updateSalesTable();
        } catch (error) {
            console.error('Sales module initialization error:', error);
            window.app.showMessage('Failed to load sales', 'error');
        }
    }

    async loadSales() {
        try {
            this.sales = await allQuery(`
                SELECT s.*, c.name as customer_name, c.mobile_number
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                ORDER BY s.sale_date DESC, s.created_at DESC
            `);
            
            this.filteredSales = [...this.sales];
        } catch (error) {
            console.error('Error loading sales:', error);
            this.sales = [];
            this.filteredSales = [];
            throw error;
        }
    }

    updateSalesTable() {
        const tbody = document.getElementById('sales-tbody');
        if (!tbody) return;

        if (this.filteredSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center p-4">
                        ${this.searchTerm ? 'No sales found matching your search' : 'No sales found'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.filteredSales.forEach((sale, index) => {
            const statusClass = sale.status === 'completed' ? 'status-success' : 'status-warning';
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${sale.invoice_number}</strong></td>
                    <td>
                        <div><strong>${sale.customer_name || 'Unknown'}</strong></div>
                        <small>${sale.mobile_number || ''}</small>
                    </td>
                    <td>${Utils.formatDate(sale.sale_date)}</td>
                    <td>${Utils.formatCurrency(sale.total_amount)}</td>
                    <td>${sale.payment_mode}</td>
                    <td><span class="status-badge ${statusClass}">${Utils.capitalize(sale.status)}</span></td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="sales.viewSaleDetails('${sale.id}')" title="View Details">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="sales.printInvoice('${sale.invoice_number}')" title="Print Invoice">
                            🖨️
                        </button>
                        <button class="btn btn-sm btn-success" onclick="sales.sendWhatsApp('${sale.id}')" title="Send WhatsApp">
                            📱
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    handleSort() {
        const sortField = document.getElementById('sort-field').value;
        const sortDirection = document.getElementById('sort-direction').value;
        
        this.sortField = sortField;
        this.sortDirection = sortDirection;
        this.applyFilters();
    }

    sortBy(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        document.getElementById('sort-field').value = this.sortField;
        document.getElementById('sort-direction').value = this.sortDirection;
        
        this.applyFilters();
    }

    applyFilters() {
        const dateFrom = document.getElementById('date-from')?.value;
        const dateTo = document.getElementById('date-to')?.value;
        
        // Apply filters
        this.filteredSales = this.sales.filter(sale => {
            // Search filter
            if (this.searchTerm) {
                const searchableText = `${sale.invoice_number} ${sale.customer_name || ''} ${sale.mobile_number || ''}`.toLowerCase();
                if (!searchableText.includes(this.searchTerm)) {
                    return false;
                }
            }
            
            // Date filters
            const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
            if (dateFrom && saleDate < dateFrom) return false;
            if (dateTo && saleDate > dateTo) return false;
            
            return true;
        });

        // Apply sorting
        this.filteredSales.sort((a, b) => {
            let aVal = a[this.sortField];
            let bVal = b[this.sortField];

            if (this.sortField === 'sale_date') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (this.sortField === 'total_amount') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (this.sortDirection === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });

        this.updateSalesTable();
    }

    showNewSaleForm() {
        this.resetCart();
        
        const content = `
            <form id="sale-form" class="sale-form">
                <!-- Customer Section -->
                <div class="form-section">
                    <h4>Customer Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-search">Customer</label>
                            <input type="text" id="customer-search" placeholder="Search customer..." 
                                   oninput="sales.searchCustomers(this.value)">
                            <div id="customer-suggestions" class="suggestions-dropdown"></div>
                        </div>
                        <div class="form-group">
                            <label for="sale-date">Sale Date</label>
                            <input type="date" id="sale-date" name="sale_date" value="${Utils.getCurrentDate()}">
                        </div>
                    </div>
                    <div id="selected-customer" class="selected-customer hidden">
                        <div class="customer-info">
                            <strong id="customer-name"></strong>
                            <span id="customer-id"></span>
                            <span id="customer-mobile"></span>
                        </div>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="sales.clearCustomer()">Change</button>
                    </div>
                </div>

                <!-- Items Section -->
                <div class="form-section">
                    <h4>Items</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-search">Search Item by Code</label>
                            <input type="text" id="item-search" placeholder="Enter item code..." 
                                   oninput="sales.searchInventory(this.value)">
                            <div id="item-suggestions" class="suggestions-dropdown"></div>
                        </div>
                    </div>
                    <div id="cart-items" class="cart-items">
                        <div class="empty-cart">No items added yet</div>
                    </div>
                </div>

                <!-- Pricing Section -->
                <div class="form-section">
                    <h4>Pricing</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="discount-type">Discount Type</label>
                            <select id="discount-type" onchange="sales.updatePricing()">
                                <option value="Percentage">Percentage</option>
                                <option value="Amount">Amount</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="discount-value">Discount Value</label>
                            <input type="number" id="discount-value" step="0.01" min="0" 
                                   value="0" oninput="sales.updatePricing()">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="advance-amount">Advance Amount</label>
                            <input type="number" id="advance-amount" step="0.01" min="0" 
                                   value="0" oninput="sales.updatePricing()">
                        </div>
                        <div class="form-group">
                            <label for="payment-mode">Payment Mode</label>
                            <select id="payment-mode">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Multiple Payment Modes">Multiple Payment Modes</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Summary Section -->
                <div class="form-section">
                    <div class="pricing-summary">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span id="subtotal">₹0.00</span>
                        </div>
                        <div class="summary-row">
                            <span>Discount:</span>
                            <span id="discount-amount">₹0.00</span>
                        </div>
                        <div class="summary-row total-row">
                            <span><strong>Total Amount:</strong></span>
                            <span id="total-amount"><strong>₹0.00</strong></span>
                        </div>
                        <div class="summary-row">
                            <span>Advance:</span>
                            <span id="advance-display">₹0.00</span>
                        </div>
                        <div class="summary-row">
                            <span><strong>Balance:</strong></span>
                            <span id="balance-amount"><strong>₹0.00</strong></span>
                        </div>
                    </div>
                </div>
            </form>
        `;

        window.app.showModal('New Sale', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="sales.showSaleConfirmation()" id="confirm-sale-btn" disabled>Confirm Sale</button>
        `, 'large-modal');
    }

    async searchCustomers(searchTerm) {
        const suggestionsDiv = document.getElementById('customer-suggestions');
        if (!suggestionsDiv) return;

        if (searchTerm.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.remove('show');
            return;
        }

        try {
            const customers = await allQuery(`
                SELECT * FROM customers 
                WHERE name LIKE ? OR customer_id LIKE ? OR mobile_number LIKE ?
                ORDER BY name
                LIMIT 10
            `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);

            if (customers.length === 0) {
                suggestionsDiv.innerHTML = '<div class="suggestion-item">No customers found</div>';
            } else {
                let html = '';
                customers.forEach(customer => {
                    html += `
                        <div class="suggestion-item" onclick="sales.selectCustomer('${customer.id}')">
                            <div><strong>${customer.name}</strong> - ${customer.customer_id}</div>
                            <small>${customer.mobile_number}</small>
                        </div>
                    `;
                });
                suggestionsDiv.innerHTML = html;
            }
            
            suggestionsDiv.classList.add('show');
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }

    async selectCustomer(customerId) {
        try {
            const customer = await getQuery('SELECT * FROM customers WHERE id = ?', [customerId]);
            if (!customer) return;

            this.cart.customer = customer;
            
            // Update UI
            document.getElementById('customer-search').value = '';
            document.getElementById('customer-suggestions').classList.remove('show');
            
            document.getElementById('customer-name').textContent = customer.name;
            document.getElementById('customer-id').textContent = customer.customer_id;
            document.getElementById('customer-mobile').textContent = customer.mobile_number;
            
            document.getElementById('selected-customer').classList.remove('hidden');
            
            this.validateSaleForm();
        } catch (error) {
            console.error('Error selecting customer:', error);
        }
    }

    clearCustomer() {
        this.cart.customer = null;
        document.getElementById('selected-customer').classList.add('hidden');
        document.getElementById('customer-search').value = '';
        this.validateSaleForm();
    }

    async searchInventory(searchTerm) {
        const suggestionsDiv = document.getElementById('item-suggestions');
        if (!suggestionsDiv) return;

        if (searchTerm.length < 1) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.remove('show');
            return;
        }

        try {
            const items = await allQuery(`
                SELECT * FROM inventory 
                WHERE code LIKE ? AND is_active = 1
                ORDER BY code
                LIMIT 10
            `, [`%${searchTerm}%`]);

            if (items.length === 0) {
                suggestionsDiv.innerHTML = '<div class="suggestion-item">No items found</div>';
            } else {
                let html = '';
                items.forEach(item => {
                    html += `
                        <div class="suggestion-item" onclick="sales.addItemToCart('${item.id}')">
                            <div><strong>${item.code}</strong> - ${item.category}</div>
                            <small>${item.particulars} - ${Utils.formatCurrency(item.amount)}</small>
                        </div>
                    `;
                });
                suggestionsDiv.innerHTML = html;
            }
            
            suggestionsDiv.classList.add('show');
        } catch (error) {
            console.error('Error searching inventory:', error);
        }
    }

    async addItemToCart(itemId) {
        try {
            const item = await getQuery('SELECT * FROM inventory WHERE id = ?', [itemId]);
            if (!item) return;

            // Check if item already in cart
            const existingIndex = this.cart.items.findIndex(cartItem => cartItem.id === item.id);
            
            if (existingIndex >= 0) {
                // Increase quantity
                this.cart.items[existingIndex].quantity += 1;
                this.cart.items[existingIndex].totalPrice = 
                    this.cart.items[existingIndex].quantity * this.cart.items[existingIndex].unitPrice;
            } else {
                // Add new item
                this.cart.items.push({
                    id: item.id,
                    code: item.code,
                    particulars: item.particulars,
                    category: item.category,
                    unitPrice: item.amount,
                    quantity: 1,
                    totalPrice: item.amount
                });
            }

            // Clear search
            document.getElementById('item-search').value = '';
            document.getElementById('item-suggestions').classList.remove('show');
            
            this.updateCartDisplay();
            this.updatePricing();
            this.validateSaleForm();
        } catch (error) {
            console.error('Error adding item to cart:', error);
        }
    }

    updateCartDisplay() {
        const cartDiv = document.getElementById('cart-items');
        if (!cartDiv) return;

        if (this.cart.items.length === 0) {
            cartDiv.innerHTML = '<div class="empty-cart">No items added yet</div>';
            return;
        }

        let html = '<div class="cart-table">';
        html += '<div class="cart-header"><span>Item</span><span>Qty</span><span>Price</span><span>Total</span><span>Action</span></div>';
        
        this.cart.items.forEach((item, index) => {
            html += `
                <div class="cart-item">
                    <div class="item-details">
                        <strong>${item.code}</strong><br>
                        <small>${item.particulars}</small>
                    </div>
                    <div class="quantity-control">
                        <button type="button" onclick="sales.updateQuantity(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button type="button" onclick="sales.updateQuantity(${index}, 1)">+</button>
                    </div>
                    <div>${Utils.formatCurrency(item.unitPrice)}</div>
                    <div>${Utils.formatCurrency(item.totalPrice)}</div>
                    <div>
                        <button type="button" class="btn btn-sm btn-danger" onclick="sales.removeFromCart(${index})">×</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        cartDiv.innerHTML = html;
    }

    updateQuantity(index, change) {
        if (index < 0 || index >= this.cart.items.length) return;
        
        const newQuantity = this.cart.items[index].quantity + change;
        if (newQuantity <= 0) {
            this.removeFromCart(index);
            return;
        }
        
        this.cart.items[index].quantity = newQuantity;
        this.cart.items[index].totalPrice = newQuantity * this.cart.items[index].unitPrice;
        
        this.updateCartDisplay();
        this.updatePricing();
    }

    removeFromCart(index) {
        if (index < 0 || index >= this.cart.items.length) return;
        
        this.cart.items.splice(index, 1);
        this.updateCartDisplay();
        this.updatePricing();
        this.validateSaleForm();
    }

    updatePricing() {
        const discountType = document.getElementById('discount-type')?.value || 'Percentage';
        const discountValue = parseFloat(document.getElementById('discount-value')?.value || 0);
        const advanceAmount = parseFloat(document.getElementById('advance-amount')?.value || 0);

        // Calculate subtotal
        const subtotal = this.cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Calculate discount
        let discountAmount = 0;
        if (discountType === 'Percentage') {
            discountAmount = (subtotal * discountValue) / 100;
        } else {
            discountAmount = discountValue;
        }
        
        // Ensure discount doesn't exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal);
        
        // Calculate totals
        const totalAmount = subtotal - discountAmount;
        const balanceAmount = totalAmount - advanceAmount;

        // Update cart object
        this.cart.discountType = discountType;
        this.cart.discountValue = discountValue;
        this.cart.advanceAmount = advanceAmount;

        // Update UI
        document.getElementById('subtotal').textContent = Utils.formatCurrency(subtotal);
        document.getElementById('discount-amount').textContent = Utils.formatCurrency(discountAmount);
        document.getElementById('total-amount').textContent = Utils.formatCurrency(totalAmount);
        document.getElementById('advance-display').textContent = Utils.formatCurrency(advanceAmount);
        document.getElementById('balance-amount').textContent = Utils.formatCurrency(balanceAmount);
    }

    validateSaleForm() {
        const isValid = this.cart.customer && this.cart.items.length > 0;
        const confirmBtn = document.getElementById('confirm-sale-btn');
        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
        }
    }

    showSaleConfirmation() {
        if (!this.cart.customer || this.cart.items.length === 0) {
            window.app.showMessage('Please select customer and add items', 'error');
            return;
        }

        const subtotal = this.cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const discountAmount = this.cart.discountType === 'Percentage' 
            ? (subtotal * this.cart.discountValue) / 100 
            : this.cart.discountValue;
        const totalAmount = subtotal - Math.min(discountAmount, subtotal);
        const balanceAmount = totalAmount - this.cart.advanceAmount;
        const paymentMode = document.getElementById('payment-mode')?.value || 'Cash';

        let itemsHtml = '';
        this.cart.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.code}</td>
                    <td>${item.particulars}</td>
                    <td>${item.quantity}</td>
                    <td>${Utils.formatCurrency(item.unitPrice)}</td>
                    <td>${Utils.formatCurrency(item.totalPrice)}</td>
                </tr>
            `;
        });

        const content = `
            <div class="sale-confirmation">
                <h4>Customer: ${this.cart.customer.name} (${this.cart.customer.customer_id})</h4>
                <h5>Sale Date: ${Utils.formatDate(document.getElementById('sale-date')?.value)}</h5>
                
                <table class="table">
                    <thead>
                        <tr><th>Code</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                
                <div class="confirmation-summary">
                    <div>Subtotal: ${Utils.formatCurrency(subtotal)}</div>
                    <div>Discount (${this.cart.discountType}): ${Utils.formatCurrency(discountAmount)}</div>
                    <div><strong>Total: ${Utils.formatCurrency(totalAmount)}</strong></div>
                    <div>Advance: ${Utils.formatCurrency(this.cart.advanceAmount)}</div>
                    <div><strong>Balance: ${Utils.formatCurrency(balanceAmount)}</strong></div>
                    <div>Payment Mode: ${paymentMode}</div>
                </div>
            </div>
        `;

        window.app.showModal('Confirm Sale', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Edit</button>
            <button class="btn btn-primary" onclick="sales.processSale()">Confirm & Generate Invoice</button>
        `);
    }

    async processSale() {
        try {
            const subtotal = this.cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
            const discountAmount = this.cart.discountType === 'Percentage' 
                ? (subtotal * this.cart.discountValue) / 100 
                : this.cart.discountValue;
            const totalAmount = subtotal - Math.min(discountAmount, subtotal);
            const balanceAmount = totalAmount - this.cart.advanceAmount;
            const saleDate = document.getElementById('sale-date')?.value || Utils.getCurrentDate();
            const paymentMode = document.getElementById('payment-mode')?.value || 'Cash';

            // Generate invoice number
            const invoiceNumber = Utils.generateInvoiceNumber('SA', this.cart.items[0]?.category);

            // Create sale record
            const saleResult = await runQuery(`
                INSERT INTO sales (customer_id, sale_date, invoice_number, total_amount, 
                                 discount_type, discount_value, discount_amount, advance_amount, 
                                 balance_amount, payment_mode, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                this.cart.customer.customer_id,
                saleDate,
                invoiceNumber,
                totalAmount,
                this.cart.discountType,
                this.cart.discountValue,
                Math.min(discountAmount, subtotal),
                this.cart.advanceAmount,
                balanceAmount,
                paymentMode,
                'completed',
                Utils.getCurrentUser()
            ]);

            // Create sale items
            for (const item of this.cart.items) {
                await runQuery(`
                    INSERT INTO sale_items (sale_id, inventory_id, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?)
                `, [saleResult.id, item.id, item.quantity, item.unitPrice, item.totalPrice]);
            }

            // Update customer net value
            await runQuery(`
                UPDATE customers 
                SET net_value = net_value + ?, updated_at = CURRENT_TIMESTAMP 
                WHERE customer_id = ?
            `, [totalAmount, this.cart.customer.customer_id]);

            // Log the sale
            await auditLogger.logSaleComplete(saleResult.id, {
                invoice_number: invoiceNumber,
                customer_id: this.cart.customer.customer_id,
                total_amount: totalAmount,
                items_count: this.cart.items.length
            });

            // Close modals and show success
            document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
            window.app.showMessage(`Sale completed! Invoice: ${invoiceNumber}`, 'success');
            
            // Refresh sales list
            await this.loadSales();
            this.updateSalesTable();
            
            // Reset cart
            this.resetCart();

        } catch (error) {
            console.error('Error processing sale:', error);
            window.app.showMessage('Failed to process sale', 'error');
        }
    }

    resetCart() {
        this.cart = {
            customer: null,
            items: [],
            discountType: 'Percentage',
            discountValue: 0,
            advanceAmount: 0
        };
    }

    async newSale(customerId = null) {
        if (customerId) {
            // Pre-populate customer if called from customer module
            const customer = await getQuery('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
            if (customer) {
                this.cart.customer = customer;
            }
        }
        this.showNewSaleForm();
        
        // If customer is pre-selected, update the UI
        if (this.cart.customer) {
            setTimeout(() => {
                this.selectCustomer(this.cart.customer.id);
            }, 100);
        }
    }

    async viewSaleDetails(saleId) {
        // This will be implemented with invoice module
        window.app.showMessage('Sale details will be available with invoice module', 'info');
    }

    async printInvoice(invoiceNumber) {
        // This will be implemented with invoice module
        window.app.showMessage('Print functionality will be available with invoice module', 'info');
    }

    async sendWhatsApp(saleId) {
        // This will be implemented with invoice module
        window.app.showMessage('WhatsApp integration will be available with invoice module', 'info');
    }

    async refresh() {
        await this.loadSales();
        this.updateSalesTable();
    }
}

// Make sales instance available globally for event handlers
window.sales = null;

// Export the class
export default Sales;

// Set up global sales instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'sales') {
        window.sales = window.app.modules.sales;
    }
});