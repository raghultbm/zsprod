// src/modules/sales.js - FIXED VERSION
const { ipcRenderer } = require('electron');

class SalesModule {
    constructor(currentUser, customerModule, inventoryModule) {
        this.currentUser = currentUser;
        this.customerModule = customerModule;
        this.inventoryModule = inventoryModule;
        this.saleItems = [];
        this.salePayments = [];
        this.selectedCustomer = null;
        this.selectedItem = null;
        this.sales = [];
        this.filteredSales = [];
        this.isInitialized = false;
        this.customerSearchTimeout = null;
        this.itemSearchTimeout = null;
        this.isCreatingNewSale = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.renderInitialView();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Customer search
        const customerSearch = document.getElementById('saleCustomerSearch');
        if (customerSearch) {
            customerSearch.addEventListener('input', (e) => {
                clearTimeout(this.customerSearchTimeout);
                this.customerSearchTimeout = setTimeout(() => {
                    this.searchCustomers(e.target.value);
                }, 300);
            });

            customerSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestions = document.getElementById('saleCustomerSuggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });

            customerSearch.addEventListener('focus', () => {
                if (customerSearch.value.trim().length >= 2) {
                    this.searchCustomers(customerSearch.value.trim());
                }
            });
        }

        // Item search
        const itemCodeSearch = document.getElementById('saleItemCodeSearch');
        if (itemCodeSearch) {
            itemCodeSearch.addEventListener('input', (e) => {
                clearTimeout(this.itemSearchTimeout);
                this.itemSearchTimeout = setTimeout(() => {
                    this.searchItems(e.target.value);
                }, 300);
            });

            itemCodeSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestions = document.getElementById('saleItemSuggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });

            itemCodeSearch.addEventListener('focus', () => {
                if (itemCodeSearch.value.trim().length >= 2) {
                    this.searchItems(itemCodeSearch.value.trim());
                }
            });
        }

        // Discount type change
        const discountType = document.getElementById('saleDiscountType');
        if (discountType) {
            discountType.addEventListener('change', () => this.toggleDiscountInput());
        }

        // Payment method change
        const paymentMethod = document.getElementById('salePaymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', () => this.toggleMultiplePayments());
        }
    }

    renderInitialView() {
        const contentBody = document.getElementById('sales-content');
        if (!contentBody) return;

        contentBody.innerHTML = `
            <div class="sales-main-container">
                <div class="sales-controls">
                    <div class="search-container">
                        <input type="text" id="salesSearch" placeholder="Search by invoice number, customer name, mobile..." class="search-input">
                        <button onclick="searchSales()" class="btn btn-secondary">Search</button>
                        <button onclick="clearSalesSearch()" class="btn btn-secondary">Clear</button>
                    </div>
                    <div class="filter-container">
                        <input type="date" id="salesDateFrom" placeholder="From Date">
                        <input type="date" id="salesDateTo" placeholder="To Date">
                        <button onclick="filterSales()" class="btn btn-secondary">Filter</button>
                    </div>
                </div>
                
                <div class="data-table-container">
                    <table class="data-table sales-table" id="salesTable">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Invoice #</th>
                                <th>Date & Time</th>
                                <th>Customer</th>
                                <th>Mobile</th>
                                <th>Items</th>
                                <th>Payment Mode</th>
                                <th>Total Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="salesTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- New Sale Modal -->
            <div id="newSaleModal" class="modal">
                <div class="modal-content extra-large-modal responsive-modal">
                    <div class="modal-header">
                        <h3>Create New Sale</h3>
                        <span class="close-btn" onclick="closeModal('newSaleModal')">&times;</span>
                    </div>
                    <form id="saleForm" class="modal-form">
                        <!-- Customer Selection -->
                        <div class="form-section">
                            <h4>Customer Details</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="saleCustomerSearch">Search Customer</label>
                                    <div class="search-input-container">
                                        <input type="text" id="saleCustomerSearch" placeholder="Search by name or phone number">
                                        <div id="saleCustomerSuggestions" class="suggestions-dropdown"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="saleSelectedCustomer">Selected Customer</label>
                                    <input type="text" id="saleSelectedCustomer" readonly placeholder="No customer selected (Walk-in Customer)">
                                    <input type="hidden" id="saleSelectedCustomerId">
                                </div>
                            </div>
                        </div>

                        <!-- Item Selection -->
                        <div class="form-section">
                            <h4>Add Items</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="saleItemCodeSearch">Item Code</label>
                                    <div class="search-input-container">
                                        <input type="text" id="saleItemCodeSearch" placeholder="Enter or search item code">
                                        <div id="saleItemSuggestions" class="suggestions-dropdown"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="saleItemQuantity">Quantity</label>
                                    <input type="number" id="saleItemQuantity" min="1" value="1">
                                </div>
                                <div class="form-group">
                                    <label for="saleItemPrice">Price</label>
                                    <input type="number" id="saleItemPrice" step="0.01" min="0">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="saleDiscountType">Discount Type</label>
                                    <select id="saleDiscountType">
                                        <option value="none">No Discount</option>
                                        <option value="percentage">Percentage</option>
                                        <option value="amount">Amount</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="saleDiscountValue">Discount Value</label>
                                    <input type="number" id="saleDiscountValue" step="0.01" min="0" disabled>
                                </div>
                                <div class="form-group align-end">
                                    <button type="button" onclick="addItemToSale()" class="btn btn-primary">Add Item</button>
                                </div>
                            </div>
                        </div>

                        <!-- Selected Items -->
                        <div class="form-section">
                            <h4>Sale Items</h4>
                            <div class="sale-items-container">
                                <table class="sale-items-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Item</th>
                                            <th>Qty</th>
                                            <th>Price</th>
                                            <th>Discount</th>
                                            <th>Total</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="saleItemsTableBody">
                                        <!-- Dynamic content -->
                                    </tbody>
                                </table>
                                <div id="noItemsMessage" class="no-items-message">
                                    No items added to sale
                                </div>
                            </div>
                        </div>

                        <!-- Sale Summary -->
                        <div class="form-section">
                            <h4>Sale Summary</h4>
                            <div class="sale-summary">
                                <div class="summary-row">
                                    <span>Subtotal:</span>
                                    <span id="saleSubtotal">₹0.00</span>
                                </div>
                                <div class="summary-row">
                                    <span>Total Discount:</span>
                                    <span id="saleTotalDiscount">₹0.00</span>
                                </div>
                                <div class="summary-row total-row">
                                    <span>Total Amount:</span>
                                    <span id="saleTotalAmount">₹0.00</span>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Method -->
                        <div class="form-section">
                            <h4>Payment Method</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="salePaymentMethod">Payment Method</label>
                                    <select id="salePaymentMethod">
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="card">Card</option>
                                        <option value="multiple">Multiple Payment Methods</option>
                                    </select>
                                </div>
                                <div class="form-group" id="singlePaymentAmount">
                                    <label for="salePaymentAmount">Payment Amount</label>
                                    <input type="number" id="salePaymentAmount" step="0.01" min="0" readonly>
                                </div>
                            </div>

                            <!-- Multiple Payments -->
                            <div id="multiplePaymentsSection" class="multiple-payments" style="display: none;">
                                <h5>Payment Breakdown</h5>
                                <div id="paymentBreakdown">
                                    <!-- Dynamic payment inputs -->
                                </div>
                                <button type="button" onclick="addPaymentMethod()" class="btn btn-secondary">Add Payment Method</button>
                            </div>
                        </div>

                        <!-- Notes -->
                        <div class="form-section">
                            <div class="form-group">
                                <label for="saleNotes">Notes (Optional)</label>
                                <textarea id="saleNotes" rows="3" placeholder="Add any additional notes for this sale"></textarea>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="button" onclick="closeModal('newSaleModal')" class="btn btn-secondary">Cancel</button>
                            <button type="button" onclick="clearSaleForm()" class="btn btn-secondary">Clear</button>
                            <button type="button" onclick="completeSale()" class="btn btn-primary" id="completeSaleBtn">Complete Sale</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Re-setup event listeners for the new DOM elements
        this.setupEventListeners();
        this.renderSalesTable();
    }

    async loadData() {
        try {
            this.sales = await ipcRenderer.invoke('get-sales');
            this.filteredSales = [...this.sales];
            this.renderSalesTable();
        } catch (error) {
            console.error('Error loading sales:', error);
            showError('Error loading sales');
        }
    }

    renderSalesTable() {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredSales.forEach((sale, index) => {
            const row = document.createElement('tr');
            const saleDateTime = new Date(sale.created_at).toLocaleString();
            const customerMobile = sale.customer_phone || '-';
            
            // Format items list
            let itemsDisplay = '-';
            if (sale.items && sale.items > 0) {
                itemsDisplay = `${sale.items} item(s)`;
            }
            
            // Get payment methods from sale payments
            let paymentModeDisplay = 'Cash'; // Default
            if (sale.payment_methods) {
                paymentModeDisplay = sale.payment_methods;
            }
            
            row.innerHTML = `
                <td class="serial-number">${index + 1}</td>
                <td><span class="invoice-number">${sale.invoice_number || 'N/A'}</span></td>
                <td class="date-time">${saleDateTime}</td>
                <td class="customer-name">${sale.customer_name || 'Walk-in Customer'}</td>
                <td class="customer-mobile">${customerMobile}</td>
                <td class="items-count">${itemsDisplay}</td>
                <td class="payment-mode"><span class="payment-mode-badge ${paymentModeDisplay.toLowerCase().replace(' ', '-')}">${paymentModeDisplay}</span></td>
                <td class="total-amount">₹${parseFloat(sale.total_amount).toFixed(2)}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="salesModule().viewSaleDetails(${sale.id})">View</button>
                    <button class="btn btn-sm btn-primary" onclick="salesModule().printSaleInvoice(${sale.id})">Print</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    openNewSaleModal() {
        this.isCreatingNewSale = true;
        this.clearSaleForm();
        
        const modal = document.getElementById('newSaleModal');
        if (modal) modal.style.display = 'block';
        
        // Focus on customer search
        setTimeout(() => {
            const customerSearch = document.getElementById('saleCustomerSearch');
            if (customerSearch) customerSearch.focus();
        }, 300);
    }

    async searchCustomers(searchTerm) {
        if (searchTerm.length < 2) {
            const suggestions = document.getElementById('saleCustomerSuggestions');
            if (suggestions) suggestions.style.display = 'none';
            return;
        }

        try {
            const customers = await this.customerModule.searchCustomersForOtherModules(searchTerm);
            this.displayCustomerSuggestions(customers);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }

    displayCustomerSuggestions(customers) {
        const suggestionsDiv = document.getElementById('saleCustomerSuggestions');
        if (!suggestionsDiv) return;
        
        if (customers.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = customers.map(customer => 
            `<div class="suggestion-item" onclick="salesModule().selectCustomer(${customer.id}, '${customer.name}', '${customer.phone || ''}')">
                <strong>${customer.name}</strong>
                ${customer.phone ? `<br><small>${customer.phone}</small>` : ''}
            </div>`
        ).join('');
        
        suggestionsDiv.style.display = 'block';
    }

    selectCustomer(id, name, phone) {
        this.selectedCustomer = { id, name, phone };
        
        const selectedCustomerField = document.getElementById('saleSelectedCustomer');
        const selectedCustomerIdField = document.getElementById('saleSelectedCustomerId');
        const customerSearchField = document.getElementById('saleCustomerSearch');
        const suggestions = document.getElementById('saleCustomerSuggestions');
        
        if (selectedCustomerField) {
            selectedCustomerField.value = `${name} ${phone ? `(${phone})` : ''}`;
        }
        if (selectedCustomerIdField) {
            selectedCustomerIdField.value = id;
        }
        if (customerSearchField) {
            customerSearchField.value = '';
        }
        if (suggestions) {
            suggestions.style.display = 'none';
        }
        
        showSuccess(`Customer selected: ${name}`);
    }

    async searchItems(searchTerm) {
        if (searchTerm.length < 2) {
            const suggestions = document.getElementById('saleItemSuggestions');
            if (suggestions) suggestions.style.display = 'none';
            return;
        }

        try {
            // First try to get exact match by code
            const exactMatch = await this.inventoryModule.getByCode(searchTerm.toUpperCase());
            if (exactMatch) {
                this.selectItem(exactMatch);
                return;
            }

            // Otherwise search for partial matches
            const items = await this.inventoryModule.searchForSale(searchTerm);
            this.displayItemSuggestions(items);
        } catch (error) {
            console.error('Error searching items:', error);
        }
    }

    displayItemSuggestions(items) {
        const suggestionsDiv = document.getElementById('saleItemSuggestions');
        if (!suggestionsDiv) return;
        
        if (items.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = items.map(item => 
            `<div class="suggestion-item" onclick="salesModule().selectItemFromSuggestion(${item.id})">
                <strong>${item.item_code}</strong> - ${item.brand || 'No Brand'}
                <br><small>Stock: ${item.quantity} | Price: ₹${item.price || 0}</small>
            </div>`
        ).join('');
        
        suggestionsDiv.style.display = 'block';
    }

    async selectItemFromSuggestion(itemId) {
        try {
            const selectedItem = this.inventoryModule.getItemById(itemId);
            if (selectedItem) {
                this.selectItem(selectedItem);
            }
        } catch (error) {
            console.error('Error selecting item:', error);
        }
    }

    selectItem(item) {
        this.selectedItem = item;
        
        const itemCodeField = document.getElementById('saleItemCodeSearch');
        const itemPriceField = document.getElementById('saleItemPrice');
        const itemQuantityField = document.getElementById('saleItemQuantity');
        const suggestions = document.getElementById('saleItemSuggestions');
        
        if (itemCodeField) itemCodeField.value = item.item_code;
        if (itemPriceField) itemPriceField.value = item.price || 0;
        if (suggestions) suggestions.style.display = 'none';
        
        // Set max quantity to available stock
        if (itemQuantityField) {
            itemQuantityField.max = item.quantity;
        }
        
        if (item.quantity === 0) {
            showError('This item is out of stock');
            this.clearItemSelection();
        } else {
            showSuccess(`Item selected: ${item.item_code}`);
        }
    }

    clearItemSelection() {
        this.selectedItem = null;
        
        const fields = ['saleItemCodeSearch', 'saleItemPrice', 'saleItemQuantity', 'saleDiscountValue'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = fieldId === 'saleItemQuantity' ? '1' : '';
        });
        
        const discountType = document.getElementById('saleDiscountType');
        if (discountType) discountType.value = 'none';
        
        this.toggleDiscountInput();
    }

    toggleDiscountInput() {
        const discountType = document.getElementById('saleDiscountType');
        const discountValueInput = document.getElementById('saleDiscountValue');
        
        if (!discountType || !discountValueInput) return;
        
        if (discountType.value === 'none') {
            discountValueInput.disabled = true;
            discountValueInput.value = '';
        } else {
            discountValueInput.disabled = false;
        }
    }

    addItemToSale() {
        if (!this.selectedItem) {
            showError('Please select an item first');
            return;
        }

        const quantity = parseInt(document.getElementById('saleItemQuantity')?.value) || 1;
        const price = parseFloat(document.getElementById('saleItemPrice')?.value) || 0;
        const discountType = document.getElementById('saleDiscountType')?.value || 'none';
        const discountValue = parseFloat(document.getElementById('saleDiscountValue')?.value) || 0;

        if (quantity <= 0 || quantity > this.selectedItem.quantity) {
            showError(`Invalid quantity. Available stock: ${this.selectedItem.quantity}`);
            return;
        }

        if (price <= 0) {
            showError('Price must be greater than 0');
            return;
        }

        // Calculate line total
        const subtotal = quantity * price;
        let discount = 0;
        
        if (discountType === 'percentage') {
            discount = (subtotal * discountValue) / 100;
        } else if (discountType === 'amount') {
            discount = discountValue;
        }
        
        const lineTotal = subtotal - discount;

        // Check if item already exists in sale
        const existingItemIndex = this.saleItems.findIndex(item => item.inventory_id === this.selectedItem.id);
        
        if (existingItemIndex >= 0) {
            // Update existing item
            const existingItem = this.saleItems[existingItemIndex];
            const newQuantity = existingItem.quantity + quantity;
            
            if (newQuantity > this.selectedItem.quantity) {
                showError(`Cannot add more. Total would exceed stock (${this.selectedItem.quantity})`);
                return;
            }
            
            existingItem.quantity = newQuantity;
            existingItem.line_total = (existingItem.quantity * existingItem.unit_price) - 
                                      (existingItem.discount_type === 'percentage' ? 
                                       (existingItem.quantity * existingItem.unit_price * existingItem.discount_value / 100) :
                                       existingItem.discount_value);
        } else {
            // Add new item
            this.saleItems.push({
                inventory_id: this.selectedItem.id,
                item_code: this.selectedItem.item_code,
                item_name: `${this.selectedItem.brand || ''} ${this.selectedItem.category}`.trim(),
                quantity: quantity,
                unit_price: price,
                discount_type: discountType,
                discount_value: discountValue,
                discount_amount: discount,
                line_total: lineTotal,
                available_stock: this.selectedItem.quantity
            });
        }

        this.renderSaleItems();
        this.calculateSaleTotals();
        this.clearItemSelection();
        showSuccess('Item added to sale');
    }

    renderSaleItems() {
        const tbody = document.getElementById('saleItemsTableBody');
        const noItemsMessage = document.getElementById('noItemsMessage');
        
        if (!tbody) return;
        
        if (this.saleItems.length === 0) {
            tbody.innerHTML = '';
            if (noItemsMessage) noItemsMessage.style.display = 'block';
            return;
        }

        if (noItemsMessage) noItemsMessage.style.display = 'none';
        
        tbody.innerHTML = this.saleItems.map((item, index) => {
            const discountText = item.discount_type === 'none' ? '-' : 
                               item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                               `₹${item.discount_value}`;
            
            return `
                <tr>
                    <td>${item.item_code}</td>
                    <td>${item.item_name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unit_price.toFixed(2)}</td>
                    <td>${discountText}</td>
                    <td>₹${item.line_total.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="salesModule().removeSaleItem(${index})">Remove</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    removeSaleItem(index) {
        this.saleItems.splice(index, 1);
        this.renderSaleItems();
        this.calculateSaleTotals();
    }

    calculateSaleTotals() {
        const subtotal = this.saleItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const totalDiscount = this.saleItems.reduce((sum, item) => sum + item.discount_amount, 0);
        const totalAmount = subtotal - totalDiscount;

        const subtotalEl = document.getElementById('saleSubtotal');
        const totalDiscountEl = document.getElementById('saleTotalDiscount');
        const totalAmountEl = document.getElementById('saleTotalAmount');
        const paymentAmountEl = document.getElementById('salePaymentAmount');

        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
        if (totalDiscountEl) totalDiscountEl.textContent = `₹${totalDiscount.toFixed(2)}`;
        if (totalAmountEl) totalAmountEl.textContent = `₹${totalAmount.toFixed(2)}`;
        if (paymentAmountEl) paymentAmountEl.value = totalAmount.toFixed(2);
        
        this.updateMultiplePaymentsTotal();
    }

    toggleMultiplePayments() {
        const paymentMethod = document.getElementById('salePaymentMethod');
        const singlePaymentSection = document.getElementById('singlePaymentAmount');
        const multiplePaymentsSection = document.getElementById('multiplePaymentsSection');
        
        if (!paymentMethod) return;
        
        if (paymentMethod.value === 'multiple') {
            if (singlePaymentSection) singlePaymentSection.style.display = 'none';
            if (multiplePaymentsSection) multiplePaymentsSection.style.display = 'block';
            this.initializeMultiplePayments();
        } else {
            if (singlePaymentSection) singlePaymentSection.style.display = 'block';
            if (multiplePaymentsSection) multiplePaymentsSection.style.display = 'none';
            this.salePayments = [];
        }
    }

    initializeMultiplePayments() {
        this.salePayments = [];
        const paymentBreakdown = document.getElementById('paymentBreakdown');
        if (paymentBreakdown) {
            paymentBreakdown.innerHTML = '';
            this.addPaymentMethod();
        }
    }

    addPaymentMethod() {
        const paymentBreakdown = document.getElementById('paymentBreakdown');
        if (!paymentBreakdown) return;
        
        const paymentIndex = this.salePayments.length;
        
        const paymentDiv = document.createElement('div');
        paymentDiv.className = 'payment-method-row';
        paymentDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <select onchange="salesModule().updatePaymentMethod(${paymentIndex}, this.value)">
                        <option value="">Select Method</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="number" step="0.01" min="0" placeholder="Amount" 
                           onchange="salesModule().updatePaymentAmount(${paymentIndex}, this.value)">
                </div>
                <div class="form-group">
                    <input type="text" placeholder="Reference (optional)" 
                           onchange="salesModule().updatePaymentReference(${paymentIndex}, this.value)">
                </div>
                <div class="form-group">
                    <button type="button" onclick="salesModule().removePaymentMethod(${paymentIndex})" 
                            class="btn btn-sm btn-danger">Remove</button>
                </div>
            </div>
        `;
        
        paymentBreakdown.appendChild(paymentDiv);
        this.salePayments.push({ payment_method: '', amount: 0, payment_reference: '' });
    }

    updatePaymentMethod(index, method) {
        if (this.salePayments[index]) {
            this.salePayments[index].payment_method = method;
        }
        this.validatePayments();
    }

    updatePaymentAmount(index, amount) {
        if (this.salePayments[index]) {
            this.salePayments[index].amount = parseFloat(amount) || 0;
        }
        this.validatePayments();
    }

    updatePaymentReference(index, reference) {
        if (this.salePayments[index]) {
            this.salePayments[index].payment_reference = reference;
        }
    }

    removePaymentMethod(index) {
        this.salePayments.splice(index, 1);
        
        // Re-render payment breakdown
        const paymentBreakdown = document.getElementById('paymentBreakdown');
        if (paymentBreakdown) {
            paymentBreakdown.innerHTML = '';
            
            this.salePayments.forEach((payment, i) => {
                const paymentDiv = document.createElement('div');
                paymentDiv.className = 'payment-method-row';
                paymentDiv.innerHTML = `
                    <div class="form-row">
                        <div class="form-group">
                            <select onchange="salesModule().updatePaymentMethod(${i}, this.value)">
                                <option value="">Select Method</option>
                                <option value="cash" ${payment.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="upi" ${payment.payment_method === 'upi' ? 'selected' : ''}>UPI</option>
                                <option value="card" ${payment.payment_method === 'card' ? 'selected' : ''}>Card</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <input type="number" step="0.01" min="0" placeholder="Amount" value="${payment.amount}"
                                   onchange="salesModule().updatePaymentAmount(${i}, this.value)">
                        </div>
                        <div class="form-group">
                            <input type="text" placeholder="Reference (optional)" value="${payment.payment_reference}"
                                   onchange="salesModule().updatePaymentReference(${i}, this.value)">
                        </div>
                        <div class="form-group">
                            <button type="button" onclick="salesModule().removePaymentMethod(${i})" 
                                    class="btn btn-sm btn-danger">Remove</button>
                        </div>
                    </div>
                `;
                paymentBreakdown.appendChild(paymentDiv);
            });
        }
        
        this.validatePayments();
    }

    updateMultiplePaymentsTotal() {
        // This function can be used to show remaining amount in multiple payments
        const totalAmountEl = document.getElementById('saleTotalAmount');
        if (!totalAmountEl) return;
        
        const totalAmount = parseFloat(totalAmountEl.textContent.replace('₹', ''));
        const totalPaid = this.salePayments.reduce((sum, payment) => sum + payment.amount, 0);
        const remaining = totalAmount - totalPaid;
        
        // You can add a remaining amount display if needed
    }

    validatePayments() {
        const totalAmountEl = document.getElementById('saleTotalAmount');
        const completeSaleBtn = document.getElementById('completeSaleBtn');
        
        if (!totalAmountEl || !completeSaleBtn) return;
        
        const totalAmount = parseFloat(totalAmountEl.textContent.replace('₹', ''));
        const totalPaid = this.salePayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        if (Math.abs(totalAmount - totalPaid) < 0.01) {
            completeSaleBtn.disabled = false;
            completeSaleBtn.textContent = 'Complete Sale';
        } else {
            completeSaleBtn.disabled = true;
            completeSaleBtn.textContent = `Complete Sale (₹${(totalAmount - totalPaid).toFixed(2)} remaining)`;
        }
    }

    async completeSale() {
        if (this.saleItems.length === 0) {
            showError('Please add at least one item to the sale');
            return;
        }

        const paymentMethod = document.getElementById('salePaymentMethod')?.value;
        
        // Validate payments
        if (paymentMethod === 'multiple') {
            const totalAmountEl = document.getElementById('saleTotalAmount');
            if (!totalAmountEl) return;
            
            const totalAmount = parseFloat(totalAmountEl.textContent.replace('₹', ''));
            const totalPaid = this.salePayments.reduce((sum, payment) => sum + payment.amount, 0);
            
            if (Math.abs(totalAmount - totalPaid) > 0.01) {
                showError('Payment amounts do not match the total amount');
                return;
            }
            
            const incompletePayments = this.salePayments.filter(p => !p.payment_method || p.amount <= 0);
            if (incompletePayments.length > 0) {
                showError('Please complete all payment method details');
                return;
            }
        } else {
            // Single payment method
            const paymentAmountEl = document.getElementById('salePaymentAmount');
            const totalAmountEl = document.getElementById('saleTotalAmount');
            
            if (!paymentAmountEl || !totalAmountEl) return;
            
            const paymentAmount = parseFloat(paymentAmountEl.value);
            const totalAmount = parseFloat(totalAmountEl.textContent.replace('₹', ''));
            
            if (Math.abs(paymentAmount - totalAmount) > 0.01) {
                showError('Payment amount does not match total amount');
                return;
            }
            
            this.salePayments = [{
                payment_method: paymentMethod,
                amount: paymentAmount,
                payment_reference: ''
            }];
        }

        try {
            const subtotalEl = document.getElementById('saleSubtotal');
            const totalDiscountEl = document.getElementById('saleTotalDiscount');
            const totalAmountEl = document.getElementById('saleTotalAmount');
            const notesEl = document.getElementById('saleNotes');
            
            if (!subtotalEl || !totalDiscountEl || !totalAmountEl) return;
            
            const subtotal = parseFloat(subtotalEl.textContent.replace('₹', ''));
            const totalDiscount = parseFloat(totalDiscountEl.textContent.replace('₹', ''));
            const totalAmount = parseFloat(totalAmountEl.textContent.replace('₹', ''));
            const notes = notesEl ? notesEl.value : '';

            // Generate invoice number with random digits
            const invoiceNumber = this.generateInvoiceNumber();

            const saleData = {
                sale: {
                    sale_date: new Date().toISOString().split('T')[0],
                    customer_id: this.selectedCustomer ? this.selectedCustomer.id : null,
                    subtotal: subtotal,
                    total_discount: totalDiscount,
                    total_amount: totalAmount,
                    invoice_number: invoiceNumber,
                    notes: notes,
                    created_by: this.currentUser.id
                },
                items: this.saleItems,
                payments: this.salePayments
            };

            const result = await ipcRenderer.invoke('create-sale', saleData);
            
            if (result.success) {
                showSuccess(`Sale completed successfully! Invoice: ${invoiceNumber}`);
                closeModal('newSaleModal');
                this.clearSaleForm();
                await this.loadData();
                await loadDashboardStats();
                
                // Refresh customer net value if applicable
                if (this.selectedCustomer && this.customerModule) {
                    await this.customerModule.refreshCustomerNetValue(this.selectedCustomer.id);
                }
            }
        } catch (error) {
            console.error('Error completing sale:', error);
            showError('Error completing sale: ' + (error.message || 'Unknown error'));
        }
    }

    generateInvoiceNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        
        // Generate 4 random digits instead of characters
        let randomDigits = '';
        for (let i = 0; i < 4; i++) {
            randomDigits += Math.floor(Math.random() * 10).toString();
        }
        
        return `INVSA${year}${month}${day}${randomDigits}`;
    }

    clearSaleForm() {
        this.saleItems = [];
        this.salePayments = [];
        this.selectedCustomer = null;
        this.selectedItem = null;
        
        // Clear form inputs
        const fields = [
            'saleCustomerSearch', 'saleSelectedCustomer', 'saleSelectedCustomerId',
            'saleItemCodeSearch', 'saleItemQuantity', 'saleItemPrice', 'saleDiscountValue',
            'salePaymentAmount', 'saleNotes'
        ];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fieldId === 'saleItemQuantity' ? '1' : '';
            }
        });
        
        const discountType = document.getElementById('saleDiscountType');
        const paymentMethod = document.getElementById('salePaymentMethod');
        
        if (discountType) discountType.value = 'none';
        if (paymentMethod) paymentMethod.value = 'cash';
        
        // Reset UI
        this.toggleDiscountInput();
        this.toggleMultiplePayments();
        this.renderSaleItems();
        this.calculateSaleTotals();
        
        // Hide suggestions
        const suggestions = ['saleCustomerSuggestions', 'saleItemSuggestions'];
        suggestions.forEach(suggestionId => {
            const element = document.getElementById(suggestionId);
            if (element) element.style.display = 'none';
        });
    }

    searchSales() {
        const searchTerm = document.getElementById('salesSearch')?.value?.trim().toLowerCase();
        
        if (searchTerm) {
            this.filteredSales = this.sales.filter(sale => 
                (sale.invoice_number && sale.invoice_number.toLowerCase().includes(searchTerm)) ||
                (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm)) ||
                (sale.customer_phone && sale.customer_phone.includes(searchTerm))
            );
        } else {
            this.filteredSales = [...this.sales];
        }
        
        this.renderSalesTable();
    }

    clearSalesSearch() {
        const searchField = document.getElementById('salesSearch');
        const dateFromField = document.getElementById('salesDateFrom');
        const dateToField = document.getElementById('salesDateTo');
        
        if (searchField) searchField.value = '';
        if (dateFromField) dateFromField.value = '';
        if (dateToField) dateToField.value = '';
        
        this.filteredSales = [...this.sales];
        this.renderSalesTable();
    }

    filterSales() {
        const dateFrom = document.getElementById('salesDateFrom')?.value;
        const dateTo = document.getElementById('salesDateTo')?.value;
        
        this.filteredSales = this.sales.filter(sale => {
            const saleDate = new Date(sale.sale_date);
            let matchesDateRange = true;
            
            if (dateFrom) {
                matchesDateRange = matchesDateRange && saleDate >= new Date(dateFrom);
            }
            
            if (dateTo) {
                matchesDateRange = matchesDateRange && saleDate <= new Date(dateTo + 'T23:59:59');
            }
            
            return matchesDateRange;
        });
        
        this.renderSalesTable();
    }

    async viewSaleDetails(saleId) {
        try {
            const saleDetails = await ipcRenderer.invoke('get-sale-details', saleId);
            this.displaySaleDetails(saleDetails);
            const modal = document.getElementById('saleDetailsModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                // Create modal if it doesn't exist
                this.createSaleDetailsModal();
                setTimeout(() => {
                    this.displaySaleDetails(saleDetails);
                    const newModal = document.getElementById('saleDetailsModal');
                    if (newModal) newModal.style.display = 'block';
                }, 100);
            }
        } catch (error) {
            console.error('Error loading sale details:', error);
            showError('Error loading sale details');
        }
    }

    createSaleDetailsModal() {
        const modalHTML = `
            <div id="saleDetailsModal" class="modal">
                <div class="modal-content large-modal responsive-modal">
                    <div class="modal-header">
                        <h3>Sale Details</h3>
                        <span class="close-btn" onclick="closeModal('saleDetailsModal')">&times;</span>
                    </div>
                    <div class="modal-body" id="saleDetailsContent">
                        <!-- Dynamic content -->
                    </div>
                    <div class="modal-actions">
                        <button type="button" onclick="closeModal('saleDetailsModal')" class="btn btn-secondary">Close</button>
                        <button type="button" onclick="salesModule().printCurrentSale()" class="btn btn-primary" id="printSaleBtn">Print Invoice</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    displaySaleDetails(saleDetails) {
        const { sale, items, payments } = saleDetails;
        const content = document.getElementById('saleDetailsContent');
        if (!content) return;
        
        // Store current sale for printing
        this.currentSaleDetails = saleDetails;
        
        content.innerHTML = `
            <div class="sale-detail-section">
                <h4>Sale Information</h4>
                <p><strong>Invoice Number:</strong> ${sale.invoice_number || 'N/A'}</p>
                <p><strong>Sale Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}</p>
                <p><strong>Sale Time:</strong> ${new Date(sale.created_at).toLocaleString()}</p>
                <p><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</p>
                ${sale.customer_phone ? `<p><strong>Phone:</strong> ${sale.customer_phone}</p>` : ''}
                ${sale.notes ? `<p><strong>Notes:</strong> ${sale.notes}</p>` : ''}
            </div>

            <div class="sale-detail-section">
                <h4>Items Sold</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Code</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Discount</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => {
                            const discountText = item.discount_type === 'none' ? '-' : 
                                               item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                                               `₹${item.discount_value}`;
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.item_code}</td>
                                    <td>${item.item_name}</td>
                                    <td>${item.quantity}</td>
                                    <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                                    <td>${discountText}</td>
                                    <td>₹${parseFloat(item.line_total).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="sale-detail-section">
                <h4>Payment Details</h4>
                ${payments.map((payment, index) => `
                    <div class="payment-detail-row">
                        <span><strong>Payment ${index + 1} - ${payment.payment_method.toUpperCase()}:</strong> ₹${parseFloat(payment.amount).toFixed(2)}</span>
                        ${payment.payment_reference ? `<br><small>Reference: ${payment.payment_reference}</small>` : ''}
                    </div>
                `).join('')}
            </div>

            <div class="sale-detail-section">
                <h4>Summary</h4>
                <div class="sale-summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>₹${parseFloat(sale.subtotal).toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Discount:</span>
                        <span>₹${parseFloat(sale.total_discount).toFixed(2)}</span>
                    </div>
                    <div class="summary-row total-row">
                        <span>Total Amount:</span>
                        <span>₹${parseFloat(sale.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    printCurrentSale() {
        if (this.currentSaleDetails) {
            this.printSaleInvoice(this.currentSaleDetails.sale.id);
        }
    }

    async printSaleInvoice(saleId) {
        try {
            let saleDetails;
            if (this.currentSaleDetails && this.currentSaleDetails.sale.id === saleId) {
                saleDetails = this.currentSaleDetails;
            } else {
                saleDetails = await ipcRenderer.invoke('get-sale-details', saleId);
            }
            
            const { sale, items, payments } = saleDetails;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Sale Invoice - ${sale.invoice_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                        .company-tagline { font-size: 14px; color: #666; }
                        .invoice-title { font-size: 18px; font-weight: bold; margin: 15px 0; }
                        .invoice-info { margin-bottom: 20px; }
                        .customer-info { margin-bottom: 20px; }
                        .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
                        .table th { background: #f0f0f0; font-weight: bold; }
                        .summary { text-align: right; margin: 20px 0; }
                        .summary-row { margin: 5px 0; }
                        .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; }
                        .footer { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-name">⌚ Watch Shop</div>
                        <div class="company-tagline">Professional Watch Services</div>
                        <div class="invoice-title">SALE INVOICE</div>
                    </div>
                    
                    <div class="invoice-info">
                        <strong>Invoice #:</strong> ${sale.invoice_number}<br>
                        <strong>Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}<br>
                        <strong>Time:</strong> ${new Date(sale.created_at).toLocaleString()}
                    </div>
                    
                    <div class="customer-info">
                        <strong>Bill To:</strong><br>
                        ${sale.customer_name || 'Walk-in Customer'}<br>
                        ${sale.customer_phone ? `Phone: ${sale.customer_phone}<br>` : ''}
                        ${sale.customer_email ? `Email: ${sale.customer_email}` : ''}
                    </div>
                    
                    <table class="table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Item Code</th>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Discount</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, index) => {
                                const discountText = item.discount_type === 'none' ? '-' : 
                                                   item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                                                   `₹${item.discount_value}`;
                                return `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.item_code}</td>
                                        <td>${item.item_name}</td>
                                        <td>${item.quantity}</td>
                                        <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                                        <td>${discountText}</td>
                                        <td>₹${parseFloat(item.line_total).toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <div class="summary">
                        <div class="summary-row">Subtotal: ₹${parseFloat(sale.subtotal).toFixed(2)}</div>
                        <div class="summary-row">Total Discount: ₹${parseFloat(sale.total_discount).toFixed(2)}</div>
                        <div class="summary-row total-row">Total Amount: ₹${parseFloat(sale.total_amount).toFixed(2)}</div>
                    </div>
                    
                    <div class="payment-info">
                        <strong>Payment Details:</strong><br>
                        ${payments.map((payment, index) => `
                            Payment ${index + 1} - ${payment.payment_method.toUpperCase()}: ₹${parseFloat(payment.amount).toFixed(2)}
                            ${payment.payment_reference ? ` (Ref: ${payment.payment_reference})` : ''}<br>
                        `).join('')}
                    </div>
                    
                    ${sale.notes ? `
                    <div class="notes">
                        <strong>Notes:</strong><br>
                        ${sale.notes}
                    </div>` : ''}
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            console.error('Error printing sale invoice:', error);
            showError('Error printing invoice');
        }
    }

    // Method to be called when pre-selecting customer from customer module
    selectCustomer(id, name, phone) {
        this.selectedCustomer = { id, name, phone };
        
        const selectedCustomerField = document.getElementById('saleSelectedCustomer');
        const selectedCustomerIdField = document.getElementById('saleSelectedCustomerId');
        const customerSearchField = document.getElementById('saleCustomerSearch');
        const suggestions = document.getElementById('saleCustomerSuggestions');
        
        if (selectedCustomerField) {
            selectedCustomerField.value = `${name} ${phone ? `(${phone})` : ''}`;
        }
        if (selectedCustomerIdField) {
            selectedCustomerIdField.value = id;
        }
        if (customerSearchField) {
            customerSearchField.value = '';
        }
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }

    // Get sales for reporting
    getSales() {
        return this.sales;
    }

    // Get sales by date range
    getSalesByDateRange(startDate, endDate) {
        return this.sales.filter(sale => {
            const saleDate = new Date(sale.sale_date);
            return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
        });
    }

    // Get total sales for a period
    getTotalSales(startDate = null, endDate = null) {
        let filteredSales = this.sales;
        
        if (startDate && endDate) {
            filteredSales = this.getSalesByDateRange(startDate, endDate);
        }
        
        return filteredSales.reduce((total, sale) => total + parseFloat(sale.total_amount), 0);
    }
}

// Global functions for HTML onclick handlers
window.openNewSaleModal = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.openNewSaleModal();
    }
};

window.addItemToSale = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.addItemToSale();
    }
};

window.clearSaleForm = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.clearSaleForm();
    }
};

window.completeSale = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.completeSale();
    }
};

window.addPaymentMethod = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.addPaymentMethod();
    }
};

window.searchSales = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.searchSales();
    }
};

window.clearSalesSearch = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.clearSalesSearch();
    }
};

window.filterSales = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.filterSales();
    }
};

module.exports = SalesModule;