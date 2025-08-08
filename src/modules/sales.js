// src/modules/sales.js - Fixed version with all issues resolved
const { ipcRenderer } = require('electron');

class SalesModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.sales = [];
        this.filteredSales = [];
        this.saleItems = [];
        this.customerModule = null;
        this.inventoryModule = null;
        this.isInitialized = false;
        this.customerSearchTimeout = null;
        this.itemSearchTimeout = null;
        this.currentSaleDetails = null;
        this.isCreatingNewSale = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        // Get references to other modules
        this.customerModule = window.customerModule;
        this.inventoryModule = window.inventoryModule;
        
        this.renderInitialView();
        this.setupEventListeners();
        await this.loadData();
        this.isInitialized = true;
    }

    renderInitialView() {
        const contentBody = document.getElementById('contentBody');
        if (!contentBody) return;

        contentBody.innerHTML = `
            <div id="sales-content" class="module-content active">
                <div class="sales-main-container">
                    <!-- Sales Controls -->
                    <div class="sales-controls">
                        <div class="search-container">
                            <input type="text" id="salesSearch" placeholder="Search by invoice, customer name, mobile..." class="search-input">
                            <button onclick="searchSales()" class="btn btn-primary">Search</button>
                            <button onclick="clearSalesSearch()" class="btn btn-secondary">Clear</button>
                        </div>
                        
                        <div class="filter-container">
                            <select id="salesCategoryFilter" onchange="filterSales()" class="form-control">
                                <option value="">All Categories</option>
                                <option value="watch">Watch</option>
                                <option value="clock">Clock</option>
                                <option value="timepiece">Timepiece</option>
                                <option value="strap">Strap</option>
                                <option value="battery">Battery</option>
                            </select>
                            
                            <input type="date" id="salesDateFrom" onchange="filterSales()" placeholder="From Date">
                            <input type="date" id="salesDateTo" onchange="filterSales()" placeholder="To Date">
                            <button onclick="filterSales()" class="btn btn-primary">Filter</button>
                        </div>
                    </div>

                    <!-- Sales Table -->
                    <div class="data-table-container">
                        <table class="data-table" id="salesTable">
                            <thead>
                                <tr>
                                    <th>S.NO</th>
                                    <th>Invoice #</th>
                                    <th>Date & Time</th>
                                    <th>Customer</th>
                                    <th>Mobile</th>
                                    <th>Items Sold</th>
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

                        <!-- Item Addition -->
                        <div class="form-section">
                            <h4>Add Items</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="saleItemSearch">Item Code</label>
                                    <div class="search-input-container">
                                        <input type="text" id="saleItemSearch" placeholder="Enter or search item code">
                                        <div id="saleItemSuggestions" class="suggestions-dropdown"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="saleItemQuantity">Quantity</label>
                                    <input type="number" id="saleItemQuantity" min="1" value="1">
                                </div>
                                <div class="form-group">
                                    <label for="saleItemPrice">Price</label>
                                    <input type="number" id="saleItemPrice" step="0.01" placeholder="0.00">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="saleDiscountType">Discount Type</label>
                                    <select id="saleDiscountType" onchange="salesModule().toggleDiscountInput()">
                                        <option value="none">No Discount</option>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="amount">Amount (₹)</option>
                                    </select>
                                </div>
                                <div class="form-group" id="saleDiscountValueGroup" style="display: none;">
                                    <label for="saleDiscountValue">Discount Value</label>
                                    <input type="number" id="saleDiscountValue" step="0.01" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <button type="button" onclick="addItemToSale()" class="btn btn-primary">Add Item</button>
                                </div>
                            </div>
                        </div>

                        <!-- Sale Items List -->
                        <div class="form-section">
                            <h4>Sale Items</h4>
                            <div class="sale-items-container">
                                <table class="sale-items-table" id="saleItemsTable">
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
                                        <tr class="no-items-row">
                                            <td colspan="7" style="text-align: center; color: #666; font-style: italic;">No items added to sale</td>
                                        </tr>
                                    </tbody>
                                </table>
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
                                    <span><strong>Total Amount:</strong></span>
                                    <span id="saleTotalAmount"><strong>₹0.00</strong></span>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Details -->
                        <div class="form-section">
                            <h4>Payment Details</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="salePaymentMethod">Payment Method</label>
                                    <select id="salePaymentMethod" onchange="salesModule().toggleMultiplePayments()">
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="card">Card</option>
                                        <option value="multiple">Multiple Methods</option>
                                    </select>
                                </div>
                                <div class="form-group" id="salePaymentReferenceGroup" style="display: none;">
                                    <label for="salePaymentReference">Reference Number</label>
                                    <input type="text" id="salePaymentReference" placeholder="Transaction ID">
                                </div>
                            </div>
                            
                            <div id="multiplePaymentsContainer" style="display: none;">
                                <h5>Payment Methods</h5>
                                <div id="paymentMethodsList">
                                    <!-- Dynamic payment methods -->
                                </div>
                                <button type="button" onclick="addPaymentMethod()" class="btn btn-secondary btn-sm">Add Payment Method</button>
                            </div>
                        </div>

                        <!-- Notes -->
                        <div class="form-section">
                            <div class="form-group">
                                <label for="saleNotes">Notes (Optional)</label>
                                <textarea id="saleNotes" rows="3" placeholder="Any additional notes for this sale"></textarea>
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
            // Load sales with items count
            this.sales = await ipcRenderer.invoke('get-sales-with-items');
            this.filteredSales = [...this.sales];
            this.renderSalesTable();
        } catch (error) {
            console.error('Error loading sales:', error);
            if (window.showError) {
                window.showError('Error loading sales');
            } else {
                alert('Error loading sales');
            }
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
            
            // Format items list - FIXED: Show actual items sold
            let itemsDisplay = '-';
            if (sale.items_sold && sale.items_sold.length > 0) {
                const itemsList = sale.items_sold.map(item => {
                    const category = item.category ? `[${item.category.toUpperCase()}]` : '';
                    const brand = item.brand ? ` ${item.brand}` : '';
                    const type = item.type ? ` ${item.type}` : '';
                    return `${category}${brand}${type} (Qty: ${item.quantity})`;
                }).join(', ');
                itemsDisplay = itemsList;
            } else if (sale.items_count > 0) {
                itemsDisplay = `${sale.items_count} item(s)`;
            }
            
            // Get payment methods from sale payments
            let paymentModeDisplay = 'Cash'; // Default
            if (sale.payment_methods && sale.payment_methods.length > 0) {
                const methods = sale.payment_methods.map(p => p.payment_method.toUpperCase()).join(', ');
                paymentModeDisplay = methods;
            }
            
            row.innerHTML = `
                <td class="serial-number">${index + 1}</td>
                <td><span class="invoice-number">${sale.invoice_number || 'N/A'}</span></td>
                <td class="date-time">${saleDateTime}</td>
                <td class="customer-name">${sale.customer_name || 'Walk-in Customer'}</td>
                <td class="customer-mobile">${customerMobile}</td>
                <td class="items-count" style="max-width: 200px; word-wrap: break-word; font-size: 12px;">${itemsDisplay}</td>
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
        }

        // Item search
        const itemSearch = document.getElementById('saleItemSearch');
        if (itemSearch) {
            itemSearch.addEventListener('input', (e) => {
                clearTimeout(this.itemSearchTimeout);
                this.itemSearchTimeout = setTimeout(() => {
                    this.searchItems(e.target.value);
                }, 300);
            });

            itemSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestions = document.getElementById('saleItemSuggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });
        }

        // Payment method change
        const paymentMethod = document.getElementById('salePaymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', () => this.toggleMultiplePayments());
        }

        // Discount type change
        const discountType = document.getElementById('saleDiscountType');
        if (discountType) {
            discountType.addEventListener('change', () => this.toggleDiscountInput());
        }

        // Search functionality
        const searchInput = document.getElementById('salesSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.searchSales();
                }
            });
        }
    }

    // Customer selection methods
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
                ${customer.phone ? `<small>${customer.phone}</small>` : ''}
            </div>`
        ).join('');
        
        suggestionsDiv.style.display = 'block';
    }

    // FIXED: Customer selection now properly populates the field
    selectCustomer(id, name, phone) {
        const selectedCustomerField = document.getElementById('saleSelectedCustomer');
        const selectedCustomerIdField = document.getElementById('saleSelectedCustomerId');
        const customerSearchField = document.getElementById('saleCustomerSearch');
        const suggestions = document.getElementById('saleCustomerSuggestions');
        
        if (selectedCustomerField) {
            selectedCustomerField.value = `${name}${phone ? ` (${phone})` : ''}`;
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

    // Item search and selection
    async searchItems(searchTerm) {
        if (searchTerm.length < 2) {
            const suggestions = document.getElementById('saleItemSuggestions');
            if (suggestions) suggestions.style.display = 'none';
            return;
        }

        try {
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
            `<div class="suggestion-item" onclick="salesModule().selectItem('${item.item_code}', '${item.brand || ''}', '${item.type || ''}', ${item.price || 0}, ${item.quantity || 0}, '${item.category || ''}')">
                <strong>${item.item_code}</strong>
                <small>${item.brand || ''} ${item.type || ''} - ₹${item.price || 0} (Stock: ${item.quantity || 0})</small>
            </div>`
        ).join('');
        
        suggestionsDiv.style.display = 'block';
    }

    selectItem(itemCode, brand, type, price, stock, category) {
        const itemSearchField = document.getElementById('saleItemSearch');
        const itemPriceField = document.getElementById('saleItemPrice');
        const suggestions = document.getElementById('saleItemSuggestions');
        
        if (itemSearchField) itemSearchField.value = itemCode;
        if (itemPriceField) itemPriceField.value = price;
        if (suggestions) suggestions.style.display = 'none';
        
        // Store item details for later use
        this.selectedItemDetails = { itemCode, brand, type, price, stock, category };
    }

    // Sale item management
    addItemToSale() {
        const itemCode = document.getElementById('saleItemSearch')?.value.trim();
        const quantity = parseInt(document.getElementById('saleItemQuantity')?.value) || 1;
        const price = parseFloat(document.getElementById('saleItemPrice')?.value) || 0;
        const discountType = document.getElementById('saleDiscountType')?.value || 'none';
        const discountValue = parseFloat(document.getElementById('saleDiscountValue')?.value) || 0;

        if (!itemCode) {
            alert('Please enter item code');
            return;
        }

        if (price <= 0) {
            alert('Please enter valid price');
            return;
        }

        // Check if item already exists in sale
        const existingItemIndex = this.saleItems.findIndex(item => item.itemCode === itemCode);
        if (existingItemIndex > -1) {
            alert('Item already added to sale. Please remove it first if you want to add again.');
            return;
        }

        // Calculate discount and total
        let discountAmount = 0;
        if (discountType === 'percentage') {
            discountAmount = (price * quantity * discountValue) / 100;
        } else if (discountType === 'amount') {
            discountAmount = discountValue;
        }

        const lineTotal = (price * quantity) - discountAmount;

        // Add item to sale items
        const saleItem = {
            itemCode,
            brand: this.selectedItemDetails?.brand || '',
            type: this.selectedItemDetails?.type || '',
            category: this.selectedItemDetails?.category || '',
            quantity,
            price,
            discountType,
            discountValue,
            discountAmount,
            lineTotal,
            stock: this.selectedItemDetails?.stock || 0
        };

        this.saleItems.push(saleItem);
        this.renderSaleItems();
        this.calculateSaleTotals();
        this.clearItemForm();
    }

    renderSaleItems() {
        const tbody = document.getElementById('saleItemsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.saleItems.length === 0) {
            tbody.innerHTML = `
                <tr class="no-items-row">
                    <td colspan="7" style="text-align: center; color: #666; font-style: italic;">No items added to sale</td>
                </tr>
            `;
            return;
        }

        this.saleItems.forEach((item, index) => {
            const row = document.createElement('tr');
            
            const discountText = item.discountType === 'none' ? '-' : 
                               item.discountType === 'percentage' ? `${item.discountValue}%` : 
                               `₹${item.discountValue}`;
            
            row.innerHTML = `
                <td>${item.itemCode}</td>
                <td>${item.brand} ${item.type}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>${discountText}</td>
                <td>₹${item.lineTotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="salesModule().removeItemFromSale(${index})">Remove</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    removeItemFromSale(index) {
        this.saleItems.splice(index, 1);
        this.renderSaleItems();
        this.calculateSaleTotals();
    }

    calculateSaleTotals() {
        const subtotal = this.saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalDiscount = this.saleItems.reduce((sum, item) => sum + item.discountAmount, 0);
        const totalAmount = subtotal - totalDiscount;

        document.getElementById('saleSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('saleTotalDiscount').textContent = `₹${totalDiscount.toFixed(2)}`;
        document.getElementById('saleTotalAmount').textContent = `₹${totalAmount.toFixed(2)}`;
    }

    clearItemForm() {
        const fields = ['saleItemSearch', 'saleItemQuantity', 'saleItemPrice', 'saleDiscountValue'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fieldId === 'saleItemQuantity' ? '1' : '';
            }
        });
        
        const discountType = document.getElementById('saleDiscountType');
        if (discountType) discountType.value = 'none';
        
        this.toggleDiscountInput();
        this.selectedItemDetails = null;
    }

    toggleDiscountInput() {
        const discountType = document.getElementById('saleDiscountType')?.value;
        const discountGroup = document.getElementById('saleDiscountValueGroup');
        
        if (discountGroup) {
            discountGroup.style.display = discountType === 'none' ? 'none' : 'block';
        }
    }

    toggleMultiplePayments() {
        const paymentMethod = document.getElementById('salePaymentMethod')?.value;
        const referenceGroup = document.getElementById('salePaymentReferenceGroup');
        const multipleContainer = document.getElementById('multiplePaymentsContainer');
        
        if (referenceGroup) {
            referenceGroup.style.display = ['upi', 'card'].includes(paymentMethod) ? 'block' : 'none';
        }
        
        if (multipleContainer) {
            multipleContainer.style.display = paymentMethod === 'multiple' ? 'block' : 'none';
        }
    }

    // Sale completion
    async completeSale() {
        if (this.saleItems.length === 0) {
            alert('Please add at least one item to the sale');
            return;
        }

        const customerId = document.getElementById('saleSelectedCustomerId')?.value || null;
        const paymentMethod = document.getElementById('salePaymentMethod')?.value;
        const paymentReference = document.getElementById('salePaymentReference')?.value || null;
        const notes = document.getElementById('saleNotes')?.value || null;

        // Prepare sale data
        const subtotal = this.saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalDiscount = this.saleItems.reduce((sum, item) => sum + item.discountAmount, 0);
        const totalAmount = subtotal - totalDiscount;

        const saleData = {
            sale: {
                customer_id: customerId,
                subtotal: subtotal,
                total_discount: totalDiscount,
                total_amount: totalAmount,
                notes: notes,
                created_by: this.currentUser.id
            },
            items: this.saleItems.map(item => ({
                item_code: item.itemCode,
                item_name: `${item.brand} ${item.type}`.trim(),
                quantity: item.quantity,
                unit_price: item.price,
                discount_type: item.discountType,
                discount_value: item.discountValue,
                line_total: item.lineTotal,
                category: item.category
            })),
            payments: [{
                payment_method: paymentMethod,
                amount: totalAmount,
                payment_reference: paymentReference
            }]
        };

        try {
            const result = await ipcRenderer.invoke('create-sale', saleData);
            
            if (result.success) {
                alert(`Sale completed successfully! Invoice: ${result.invoice_number}`);
                this.closeModal('newSaleModal');
                this.clearSaleForm();
                await this.loadData();
                
                // Refresh dashboard if available
                if (window.loadDashboardStats) {
                    await window.loadDashboardStats();
                }
            } else {
                alert('Error completing sale');
            }
        } catch (error) {
            console.error('Error completing sale:', error);
            alert('Error completing sale: ' + error.message);
        }
    }

    // Form management
    clearSaleForm() {
        // Clear customer selection
        const customerFields = ['saleCustomerSearch', 'saleSelectedCustomer', 'saleSelectedCustomerId'];
        customerFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });
        
        // Clear item fields
        this.clearItemForm();
        
        // Clear sale items
        this.saleItems = [];
        this.renderSaleItems();
        this.calculateSaleTotals();
        
        // Clear other fields
        const otherFields = ['salePaymentReference', 'saleNotes'];
        otherFields.forEach(fieldId => {
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

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    // Search and filtering methods
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
        const categoryField = document.getElementById('salesCategoryFilter');
        const dateFromField = document.getElementById('salesDateFrom');
        const dateToField = document.getElementById('salesDateTo');
        
        if (searchField) searchField.value = '';
        if (categoryField) categoryField.value = '';
        if (dateFromField) dateFromField.value = '';
        if (dateToField) dateToField.value = '';
        
        this.filteredSales = [...this.sales];
        this.renderSalesTable();
    }

    filterSales() {
        const category = document.getElementById('salesCategoryFilter')?.value;
        const dateFrom = document.getElementById('salesDateFrom')?.value;
        const dateTo = document.getElementById('salesDateTo')?.value;
        
        this.filteredSales = this.sales.filter(sale => {
            // Category filter - check if any sold item matches the category
            let matchesCategory = true;
            if (category) {
                matchesCategory = sale.items_sold && 
                    sale.items_sold.some(item => item.category === category);
            }
            
            // Date range filter
            const saleDate = new Date(sale.sale_date || sale.created_at);
            let matchesDateRange = true;
            
            if (dateFrom) {
                matchesDateRange = matchesDateRange && saleDate >= new Date(dateFrom);
            }
            
            if (dateTo) {
                matchesDateRange = matchesDateRange && saleDate <= new Date(dateTo + 'T23:59:59');
            }
            
            return matchesCategory && matchesDateRange;
        });
        
        this.renderSalesTable();
    }

    // Sale details and printing
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
            if (window.showError) {
                window.showError('Error loading sale details');
            } else {
                alert('Error loading sale details');
            }
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
                            <th>Category</th>
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
                                    <td class="category-badge">${(item.category || '').toUpperCase()}</td>
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
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Payment Method</th>
                            <th>Amount</th>
                            <th>Reference</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr>
                                <td>${payment.payment_method.toUpperCase()}</td>
                                <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
                                <td>${payment.payment_reference || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="sale-detail-section">
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
                        <span><strong>Total Amount:</strong></span>
                        <span><strong>₹${parseFloat(sale.total_amount).toFixed(2)}</strong></span>
                    </div>
                </div>
            </div>
        `;
    }

    async printSaleInvoice(saleId) {
        try {
            const saleDetails = await ipcRenderer.invoke('get-sale-details', saleId);
            this.currentSaleDetails = saleDetails;
            this.printCurrentSale();
        } catch (error) {
            console.error('Error loading sale for printing:', error);
            alert('Error loading sale for printing');
        }
    }

    printCurrentSale() {
        if (!this.currentSaleDetails) {
            alert('No sale data available for printing');
            return;
        }

        // Create print window
        const printWindow = window.open('', '_blank');
        const { sale, items, payments } = this.currentSaleDetails;
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice - ${sale.invoice_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .invoice-details { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #f5f5f5; }
                    .total-section { text-align: right; margin-top: 20px; }
                    .total-row { font-weight: bold; font-size: 1.1em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>PULSEWARE - Outlet Management System</h2>
                    <p>Invoice</p>
                </div>
                
                <div class="invoice-details">
                    <p><strong>Invoice Number:</strong> ${sale.invoice_number}</p>
                    <p><strong>Date:</strong> ${new Date(sale.created_at).toLocaleString()}</p>
                    <p><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</p>
                    ${sale.customer_phone ? `<p><strong>Phone:</strong> ${sale.customer_phone}</p>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Item Code</th>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.item_code}</td>
                                <td>${item.item_name}</td>
                                <td>${item.quantity}</td>
                                <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                                <td>₹${parseFloat(item.line_total).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <p>Subtotal: ₹${parseFloat(sale.subtotal).toFixed(2)}</p>
                    <p>Discount: ₹${parseFloat(sale.total_discount).toFixed(2)}</p>
                    <p class="total-row">Total: ₹${parseFloat(sale.total_amount).toFixed(2)}</p>
                </div>

                <div style="margin-top: 30px;">
                    <p><strong>Payment Method(s):</strong></p>
                    ${payments.map(payment => 
                        `<p>${payment.payment_method.toUpperCase()}: ₹${parseFloat(payment.amount).toFixed(2)}${payment.payment_reference ? ` (${payment.payment_reference})` : ''}</p>`
                    ).join('')}
                </div>

                ${sale.notes ? `<div style="margin-top: 20px;"><p><strong>Notes:</strong> ${sale.notes}</p></div>` : ''}
                
                <div style="margin-top: 40px; text-align: center;">
                    <p>Thank you for your business!</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    // Utility methods
    addPaymentMethod() {
        // Implementation for multiple payment methods
        console.log('Add payment method functionality');
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