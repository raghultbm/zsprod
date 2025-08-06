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
        this.showNewSaleForm = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Customer search
        const customerSearch = document.getElementById('customerSearch');
        if (customerSearch) {
            customerSearch.addEventListener('input', (e) => {
                clearTimeout(this.customerSearchTimeout);
                this.customerSearchTimeout = setTimeout(() => {
                    this.searchCustomers(e.target.value);
                }, 300);
            });

            customerSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestions = document.getElementById('customerSuggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });
        }

        // Item search
        const itemCodeSearch = document.getElementById('itemCodeSearch');
        if (itemCodeSearch) {
            itemCodeSearch.addEventListener('input', (e) => {
                clearTimeout(this.itemSearchTimeout);
                this.itemSearchTimeout = setTimeout(() => {
                    this.searchItems(e.target.value);
                }, 300);
            });

            itemCodeSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestions = document.getElementById('itemSuggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });
        }

        // Discount type change
        const discountType = document.getElementById('discountType');
        if (discountType) {
            discountType.addEventListener('change', () => this.toggleDiscountInput());
        }

        // Payment method change
        const paymentMethod = document.getElementById('paymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', () => this.toggleMultiplePayments());
        }

        // Sales search functionality
        const salesSearch = document.getElementById('salesSearch');
        if (salesSearch) {
            salesSearch.addEventListener('input', (e) => {
                this.searchSales(e.target.value);
            });
        }
    }

    async loadData() {
        try {
            this.sales = await ipcRenderer.invoke('get-sales');
            this.filteredSales = [...this.sales];
            this.renderSalesTable();
            this.renderNewSaleForm();
        } catch (error) {
            console.error('Error loading sales:', error);
            showError('Error loading sales');
        }
    }

    renderNewSaleForm() {
        const formContainer = document.getElementById('salesFormContainer');
        const newSaleButton = document.getElementById('newSaleButton');
        
        if (!formContainer) return;

        if (this.showNewSaleForm) {
            formContainer.style.display = 'block';
            if (newSaleButton) newSaleButton.textContent = 'Cancel New Sale';
        } else {
            formContainer.style.display = 'none';
            if (newSaleButton) newSaleButton.textContent = 'New Sale';
        }
    }

    toggleNewSaleForm() {
        this.showNewSaleForm = !this.showNewSaleForm;
        this.renderNewSaleForm();
        
        if (!this.showNewSaleForm) {
            this.clearSale();
        }
    }

    renderSalesTable() {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredSales.forEach(sale => {
            const row = document.createElement('tr');
            const saleDate = new Date(sale.sale_date).toLocaleDateString();
            const saleTime = new Date(sale.created_at).toLocaleTimeString();
            
            row.innerHTML = `
                <td><strong>${sale.invoice_number || `INV-S-${sale.id}`}</strong></td>
                <td><strong>${saleDate}</strong></td>
                <td><strong>${saleTime}</strong></td>
                <td><strong>${sale.customer_name || 'Walk-in'}</strong></td>
                <td><strong>${sale.items || '-'}</strong></td>
                <td><strong>₹${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                <td><strong>${sale.created_by_name || 'Unknown'}</strong></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="window.salesModule().viewSaleDetails(${sale.id})">View</button>
                    <button class="btn btn-sm btn-primary" onclick="window.salesModule().printSaleInvoice(${sale.id})">Print</button>
                    ${sale.customer_phone ? `<button class="btn btn-sm btn-success" onclick="window.salesModule().sendSaleWhatsApp(${sale.id})">WhatsApp</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    searchSales(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredSales = [...this.sales];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredSales = this.sales.filter(sale => 
                (sale.customer_name && sale.customer_name.toLowerCase().includes(term)) ||
                `INV-S-${sale.id}`.toLowerCase().includes(term) ||
                new Date(sale.sale_date).toLocaleDateString().includes(term) ||
                (sale.created_by_name && sale.created_by_name.toLowerCase().includes(term))
            );
        }
        this.renderSalesTable();
    }

    async searchCustomers(searchTerm) {
        if (searchTerm.length < 2) {
            const suggestions = document.getElementById('customerSuggestions');
            if (suggestions) suggestions.style.display = 'none';
            return;
        }

        try {
            const customers = await this.customerModule.searchCustomers(searchTerm);
            this.displayCustomerSuggestions(customers);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }

    displayCustomerSuggestions(customers) {
        const suggestionsDiv = document.getElementById('customerSuggestions');
        if (!suggestionsDiv) return;
        
        if (customers.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = customers.map(customer => 
            `<div class="suggestion-item" onclick="window.salesModule().selectCustomer(${customer.id}, '${customer.name}', '${customer.phone || ''}')">
                <strong>${customer.name}</strong>
                ${customer.phone ? `<br><small>${customer.phone}</small>` : ''}
            </div>`
        ).join('');
        
        suggestionsDiv.style.display = 'block';
    }

    selectCustomer(id, name, phone) {
        this.selectedCustomer = { id, name, phone };
        
        const selectedCustomerField = document.getElementById('selectedCustomer');
        const selectedCustomerIdField = document.getElementById('selectedCustomerId');
        const customerSearchField = document.getElementById('customerSearch');
        const suggestions = document.getElementById('customerSuggestions');
        
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

    async searchItems(searchTerm) {
        if (searchTerm.length < 2) {
            const suggestions = document.getElementById('itemSuggestions');
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
        const suggestionsDiv = document.getElementById('itemSuggestions');
        if (!suggestionsDiv) return;
        
        if (items.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = items.map(item => 
            `<div class="suggestion-item" onclick="window.salesModule().selectItemFromSuggestion(${item.id})">
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
        
        const itemCodeField = document.getElementById('itemCodeSearch');
        const itemPriceField = document.getElementById('itemPrice');
        const itemQuantityField = document.getElementById('itemQuantity');
        const suggestions = document.getElementById('itemSuggestions');
        
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
        }
    }

    clearItemSelection() {
        this.selectedItem = null;
        
        const fields = ['itemCodeSearch', 'itemPrice', 'itemQuantity', 'discountValue'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = fieldId === 'itemQuantity' ? '1' : '';
        });
        
        const discountType = document.getElementById('discountType');
        if (discountType) discountType.value = 'none';
        
        this.toggleDiscountInput();
    }

    toggleDiscountInput() {
        const discountType = document.getElementById('discountType');
        const discountValueInput = document.getElementById('discountValue');
        
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

        const quantity = parseInt(document.getElementById('itemQuantity')?.value) || 1;
        const price = parseFloat(document.getElementById('itemPrice')?.value) || 0;
        const discountType = document.getElementById('discountType')?.value || 'none';
        const discountValue = parseFloat(document.getElementById('discountValue')?.value) || 0;

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
                    <td><strong>${item.item_code}</strong></td>
                    <td><strong>${item.item_name}</strong></td>
                    <td><strong>${item.quantity}</strong></td>
                    <td><strong>₹${item.unit_price.toFixed(2)}</strong></td>
                    <td><strong>${discountText}</strong></td>
                    <td><strong>₹${item.line_total.toFixed(2)}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="window.salesModule().removeSaleItem(${index})">Remove</button>
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
        const paymentAmountEl = document.getElementById('paymentAmount');

        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
        if (totalDiscountEl) totalDiscountEl.textContent = `₹${totalDiscount.toFixed(2)}`;
        if (totalAmountEl) totalAmountEl.textContent = `₹${totalAmount.toFixed(2)}`;
        if (paymentAmountEl) paymentAmountEl.value = totalAmount.toFixed(2);
        
        this.updateMultiplePaymentsTotal();
    }

    toggleMultiplePayments() {
        const paymentMethod = document.getElementById('paymentMethod');
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
                            <select onchange="window.salesModule().updatePaymentMethod(${i}, this.value)">
                                <option value="">Select Method</option>
                                <option value="cash" ${payment.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="upi" ${payment.payment_method === 'upi' ? 'selected' : ''}>UPI</option>
                                <option value="card" ${payment.payment_method === 'card' ? 'selected' : ''}>Card</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <input type="number" step="0.01" min="0" placeholder="Amount" value="${payment.amount}"
                                   onchange="window.salesModule().updatePaymentAmount(${i}, this.value)">
                        </div>
                        <div class="form-group">
                            <input type="text" placeholder="Reference (optional)" value="${payment.payment_reference}"
                                   onchange="window.salesModule().updatePaymentReference(${i}, this.value)">
                        </div>
                        <div class="form-group">
                            <button type="button" onclick="window.salesModule().removePaymentMethod(${i})" 
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

    previewSale() {
        if (this.saleItems.length === 0) {
            showError('Please add at least one item to the sale');
            return;
        }

        const paymentMethod = document.getElementById('paymentMethod')?.value;
        
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
            const paymentAmountEl = document.getElementById('paymentAmount');
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

        // Populate confirmation modal
        this.populateConfirmationModal();
        const modal = document.getElementById('saleConfirmationModal');
        if (modal) modal.style.display = 'block';
    }

    populateConfirmationModal() {
        // Customer details
        const customerDetails = this.selectedCustomer ? 
            `${this.selectedCustomer.name} ${this.selectedCustomer.phone ? `(${this.selectedCustomer.phone})` : ''}` : 
            'Walk-in Customer';
        
        const customerDetailsEl = document.getElementById('confirmCustomerDetails');
        if (customerDetailsEl) customerDetailsEl.textContent = customerDetails;

        // Items
        const confirmItemsBody = document.getElementById('confirmItemsTableBody');
        if (confirmItemsBody) {
            confirmItemsBody.innerHTML = this.saleItems.map(item => {
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
                    </tr>
                `;
            }).join('');
        }

        // Payment details
        const confirmPaymentDetails = document.getElementById('confirmPaymentDetails');
        if (confirmPaymentDetails) {
            confirmPaymentDetails.innerHTML = this.salePayments.map(payment => `
                <div class="payment-detail-row">
                    <span>${payment.payment_method.toUpperCase()}: ₹${payment.amount.toFixed(2)}</span>
                    ${payment.payment_reference ? `<small>Ref: ${payment.payment_reference}</small>` : ''}
                </div>
            `).join('');
        }

        // Summary
        const summaryFields = ['confirmSubtotal', 'confirmTotalDiscount', 'confirmTotalAmount'];
        const sourceFields = ['saleSubtotal', 'saleTotalDiscount', 'saleTotalAmount'];
        
        summaryFields.forEach((confirmField, index) => {
            const confirmEl = document.getElementById(confirmField);
            const sourceEl = document.getElementById(sourceFields[index]);
            if (confirmEl && sourceEl) {
                confirmEl.textContent = sourceEl.textContent;
            }
        });
    }

    async confirmSale() {
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

            const saleData = {
                sale: {
                    sale_date: new Date().toISOString().split('T')[0],
                    customer_id: this.selectedCustomer ? this.selectedCustomer.id : null,
                    subtotal: subtotal,
                    total_discount: totalDiscount,
                    total_amount: totalAmount,
                    notes: notes,
                    created_by: this.currentUser.id
                },
                items: this.saleItems,
                payments: this.salePayments
            };

            const result = await ipcRenderer.invoke('create-sale', saleData);
            
            if (result.success) {
                showSuccess(`Sale completed successfully! Invoice: ${result.invoice_number}`);
                closeModal('saleConfirmationModal');
                this.clearSale();
                await this.loadData();
                await loadDashboardStats();
            }
        } catch (error) {
            console.error('Error completing sale:', error);
            showError('Error completing sale');
        }
    }

    clearSale() {
        this.saleItems = [];
        this.salePayments = [];
        this.selectedCustomer = null;
        this.selectedItem = null;
        
        // Clear form inputs
        const fields = [
            'customerSearch', 'selectedCustomer', 'selectedCustomerId',
            'itemCodeSearch', 'itemQuantity', 'itemPrice', 'discountValue',
            'paymentAmount', 'saleNotes'
        ];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fieldId === 'itemQuantity' ? '1' : '';
            }
        });
        
        const discountType = document.getElementById('discountType');
        const paymentMethod = document.getElementById('paymentMethod');
        
        if (discountType) discountType.value = 'none';
        if (paymentMethod) paymentMethod.value = 'cash';
        
        // Reset UI
        this.toggleDiscountInput();
        this.toggleMultiplePayments();
        this.renderSaleItems();
        this.calculateSaleTotals();
        
        // Hide suggestions
        const suggestions = ['customerSuggestions', 'itemSuggestions'];
        suggestions.forEach(suggestionId => {
            const element = document.getElementById(suggestionId);
            if (element) element.style.display = 'none';
        });
    }

    async viewSaleDetails(saleId) {
        try {
            const saleDetails = await ipcRenderer.invoke('get-sale-details', saleId);
            this.displaySaleDetails(saleDetails);
            const modal = document.getElementById('saleDetailsModal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading sale details:', error);
            showError('Error loading sale details');
        }
    }

    displaySaleDetails(saleDetails) {
        const { sale, items, payments } = saleDetails;
        const content = document.getElementById('saleDetailsContent');
        if (!content) return;
        
        content.innerHTML = `
            <div class="sale-detail-section">
                <h4><strong>Sale Information</strong></h4>
                <p><strong>Invoice Number:</strong> ${sale.invoice_number || `INV-S-${sale.id}`}</p>
                <p><strong>Sale Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}</p>
                <p><strong>Sale Time:</strong> ${new Date(sale.created_at).toLocaleTimeString()}</p>
                <p><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</p>
                ${sale.customer_phone ? `<p><strong>Phone:</strong> ${sale.customer_phone}</p>` : ''}
                ${sale.notes ? `<p><strong>Notes:</strong> ${sale.notes}</p>` : ''}
            </div>

            <div class="sale-detail-section">
                <h4><strong>Items</strong></h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th><strong>Code</strong></th>
                            <th><strong>Item</strong></th>
                            <th><strong>Qty</strong></th>
                            <th><strong>Price</strong></th>
                            <th><strong>Discount</strong></th>
                            <th><strong>Total</strong></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => {
                            const discountText = item.discount_type === 'none' ? '-' : 
                                               item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                                               `₹${item.discount_value}`;
                            return `
                                <tr>
                                    <td><strong>${item.item_code}</strong></td>
                                    <td><strong>${item.item_name}</strong></td>
                                    <td><strong>${item.quantity}</strong></td>
                                    <td><strong>₹${parseFloat(item.unit_price).toFixed(2)}</strong></td>
                                    <td><strong>${discountText}</strong></td>
                                    <td><strong>₹${parseFloat(item.line_total).toFixed(2)}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="sale-detail-section">
                <h4><strong>Payment Details</strong></h4>
                ${payments.map(payment => `
                    <div class="payment-detail-row">
                        <span><strong>${payment.payment_method.toUpperCase()}:</strong> ₹${parseFloat(payment.amount).toFixed(2)}</span>
                        ${payment.payment_reference ? `<br><small>Reference: ${payment.payment_reference}</small>` : ''}
                    </div>
                    `).join('')}
            </div>

            <div class="sale-detail-section">
                <h4><strong>Summary</strong></h4>
                <div class="sale-summary">
                    <div class="summary-row">
                        <span><strong>Subtotal:</strong></span>
                        <span><strong>₹${parseFloat(sale.subtotal).toFixed(2)}</strong></span>
                    </div>
                    <div class="summary-row">
                        <span><strong>Total Discount:</strong></span>
                        <span><strong>₹${parseFloat(sale.total_discount).toFixed(2)}</strong></span>
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
            const { sale, items, payments } = saleDetails;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Sale Invoice - ${sale.invoice_number || `INV-S-${sale.id}`}</title>
                    <style>
                        @media print {
                            body { margin: 0; }
                            @page { 
                                size: A4 portrait; 
                                margin: 0; 
                            }
                        }
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 0; 
                        }
                        .invoice-container {
                            width: 210mm;
                            min-height: 297mm;
                            margin: 0 auto;
                            padding: 20mm;
                            font-size: 12px;
                            position: relative;
                            box-sizing: border-box;
                        }
                        .invoice-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #2c3e50;
                            padding-bottom: 15px;
                        }
                        .invoice-logo {
                            flex: 1;
                        }
                        .invoice-logo img {
                            max-width: 80px;
                            max-height: 80px;
                        }
                        .invoice-title {
                            flex: 2;
                            text-align: center;
                        }
                        .shop-address {
                            flex: 1;
                            text-align: right;
                            font-size: 10px;
                            line-height: 1.4;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                            border: 1px solid #bdc3c7;
                        }
                        th, td {
                            border: 1px solid #bdc3c7;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #ecf0f1;
                            font-weight: bold;
                        }
                        .invoice-footer {
                            position: absolute;
                            bottom: 20mm;
                            left: 20mm;
                            right: 20mm;
                            text-align: center;
                            border-top: 2px solid #2c3e50;
                            padding-top: 15px;
                        }
                    </style>
                </head>
                <body>
                    <div class="invoice-container">
                        <!-- Header -->
                        <div class="invoice-header">
                            <div class="invoice-logo">
                                <img src="../assets/icon.png" alt="Logo">
                            </div>
                            <div class="invoice-title">
                                <h1 style="font-size: 28px; color: #2c3e50; margin: 0; font-weight: bold;">SALES INVOICE</h1>
                                <h3 style="color: #e74c3c; margin: 5px 0; font-weight: bold;">${sale.invoice_number || `INV-S-${sale.id}`}</h3>
                            </div>
                            <div class="shop-address">
                                <strong>ZEDSON Watchcraft</strong><br>
                                123 Watch Street<br>
                                Chennai, Tamil Nadu<br>
                                Phone: +91 98765 43210<br>
                                Email: info@zedsonwatch.com
                            </div>
                        </div>

                        <!-- Content -->
                        <div style="margin-bottom: 50px;">
                            <!-- Customer & Invoice Details -->
                            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                                <div style="flex: 1;">
                                    <h4><strong>Bill To:</strong></h4>
                                    <strong>${sale.customer_name || 'Walk-in Customer'}</strong><br>
                                    ${sale.customer_phone ? `Phone: ${sale.customer_phone}<br>` : ''}
                                    ${sale.customer_email ? `Email: ${sale.customer_email}<br>` : ''}
                                </div>
                                <div style="flex: 1; text-align: right;">
                                    <h4><strong>Invoice Details:</strong></h4>
                                    <strong>Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}<br>
                                    <strong>Time:</strong> ${new Date(sale.created_at).toLocaleTimeString()}<br>
                                </div>
                            </div>

                            <!-- Items Table -->
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Discount</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.map(item => {
                                        const discountText = item.discount_type === 'none' ? '-' : 
                                                           item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                                                           `₹${item.discount_value}`;
                                        return `
                                            <tr>
                                                <td>${item.item_code}</td>
                                                <td>${item.item_name}</td>
                                                <td style="text-align: center;">${item.quantity}</td>
                                                <td style="text-align: right;">₹${parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td style="text-align: right;">${discountText}</td>
                                                <td style="text-align: right;">₹${parseFloat(item.line_total).toFixed(2)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>

                            <!-- Totals -->
                            <div style="display: flex; justify-content: flex-end;">
                                <div style="min-width: 300px;">
                                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #bdc3c7;">
                                        <strong>Subtotal:</strong>
                                        <span>₹${parseFloat(sale.subtotal).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #bdc3c7;">
                                        <strong>Total Discount:</strong>
                                        <span>₹${parseFloat(sale.total_discount).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #2c3e50; font-size: 16px; font-weight: bold;">
                                        <strong>Total Amount:</strong>
                                        <span>₹${parseFloat(sale.total_amount).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Payment Information -->
                            <div style="margin-top: 20px;">
                                <h4><strong>Payment Details:</strong></h4>
                                ${payments.map(payment => `
                                    ${payment.payment_method.toUpperCase()}: ₹${parseFloat(payment.amount).toFixed(2)}
                                    ${payment.payment_reference ? ` (Ref: ${payment.payment_reference})` : ''}<br>
                                `).join('')}
                            </div>

                            ${sale.notes ? `
                            <div style="margin-top: 20px;">
                                <h4><strong>Notes:</strong></h4>
                                <p>${sale.notes}</p>
                            </div>` : ''}
                        </div>

                        <!-- Footer -->
                        <div class="invoice-footer">
                            <p style="margin: 10px 0; font-size: 14px; color: #2c3e50;"><strong>Thank you for your purchase!</strong></p>
                            <p style="margin: 5px 0; font-weight: bold; color: #e74c3c; font-size: 16px;">ZEDSON Watchcraft - Your Trusted Watch Partner</p>
                            <p style="margin: 5px 0; font-size: 11px; color: #7f8c8d;">📞 +91 98765 43210 | 📧 info@zedsonwatch.com | 🌐 www.zedsonwatch.com</p>
                            <p style="margin: 5px 0; font-size: 10px; color: #95a5a6;">Thank you for choosing ZEDSON Watchcraft. We appreciate your business!</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Wait for content to load then print
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } catch (error) {
            console.error('Error printing sale invoice:', error);
            showError('Error printing sale invoice');
        }
    }

        async sendSaleWhatsApp(saleId) {
        try {
            const saleDetails = await ipcRenderer.invoke('get-sale-details', saleId);
            const { sale } = saleDetails;
            
            if (!sale.customer_phone) {
                showError('Customer phone number not available');
                return;
            }

            const message = `Hello ${sale.customer_name || 'Customer'},\n\nThank you for your purchase at ZEDSON Watchcraft!\n\nInvoice: ${sale.invoice_number || `INV-S-${sale.id}`}\nDate: ${new Date(sale.sale_date).toLocaleDateString()}\nAmount: ₹${parseFloat(sale.total_amount).toFixed(2)}\n\nWe appreciate your business!\n\nZEDSON Watchcraft - Your Trusted Watch Partner\n📞 +91 98765 43210`;

            // Clean phone number
            const cleanPhone = sale.customer_phone.replace(/[^\d+]/g, '');
            
            // Create WhatsApp URL
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            
            // Open WhatsApp
            window.open(whatsappUrl, '_blank');
            
            showSuccess('WhatsApp opened successfully');
            
        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            showError('Error opening WhatsApp');
        }
    }

    printSaleReceipt() {
        // This function can be implemented to print receipts
        showSuccess('Print receipt functionality can be implemented here');
    }
}

// Global functions for HTML onclick handlers
window.addItemToSale = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.addItemToSale();
    }
};

window.previewSale = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.previewSale();
    }
};

window.confirmSale = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.confirmSale();
    }
};

window.clearSale = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.clearSale();
    }
};

window.toggleMultiplePayments = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.toggleMultiplePayments();
    }
};

window.addPaymentMethod = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.addPaymentMethod();
    }
};

window.printSaleReceipt = function() {
    const salesModule = window.salesModule();
    if (salesModule) {
        salesModule.printSaleReceipt();
    }
};

window.removeSaleItem = function(index) {
    const salesModule = window.salesModule();
    if (salesModule && salesModule.removeSaleItem) {
        salesModule.removeSaleItem(index);
    }
};

window.selectCustomerFromSales = function(id, name, phone) {
    const salesModule = window.salesModule();
    if (salesModule && salesModule.selectCustomer) {
        salesModule.selectCustomer(id, name, phone);
    }
};

window.selectItemFromSales = function(itemId) {
    const salesModule = window.salesModule();
    if (salesModule && salesModule.selectItemFromSuggestion) {
        salesModule.selectItemFromSuggestion(itemId);
    }
};

window.viewSaleDetails = function(saleId) {
    const salesModule = window.salesModule();
    if (salesModule && salesModule.viewSaleDetails) {
        salesModule.viewSaleDetails(saleId);
    }
};

window.toggleNewSaleForm = function() {
    const salesModule = window.salesModule();
    if (salesModule && salesModule.toggleNewSaleForm) {
        salesModule.toggleNewSaleForm();
    }
};

// Add new global function for WhatsApp
window.sendSaleWhatsApp = function(saleId) {
    const salesModule = window.salesModule();
    if (salesModule && salesModule.sendSaleWhatsApp) {
        salesModule.sendSaleWhatsApp(saleId);
    }
};

module.exports = SalesModule;
