// Updated src/modules/invoices.js - Enhanced with dropdown search, WhatsApp integration, and PDF printing

const { ipcRenderer } = require('electron');

class InvoicesModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.invoices = [];
        this.filteredInvoices = [];
        this.currentInvoice = null;
        this.isInitialized = false;
        this.searchDropdownTimeout = null;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.renderInvoicesContent();
        this.isInitialized = true;
    }

    renderInvoicesContent() {
        const invoicesContent = document.getElementById('invoices-content');
        if (!invoicesContent) return;

        invoicesContent.innerHTML = `
            <div class="invoices-container">
                <h3><strong>All Invoices</strong></h3>
                
                <div class="invoices-controls">
                    <div class="search-container">
                        <input type="text" id="invoiceSearch" placeholder="Search by invoice number, customer name, job number..." class="search-input">
                        <div id="invoiceSearchDropdown" class="suggestions-dropdown"></div>
                        <button onclick="invoicesModule().searchInvoices()" class="btn btn-secondary">Search</button>
                        <button onclick="invoicesModule().clearInvoiceSearch()" class="btn btn-secondary">Clear</button>
                    </div>
                    <div class="filter-container">
                        <select id="invoiceTypeFilter" onchange="invoicesModule().filterInvoicesByType()">
                            <option value="">All Types</option>
                            <option value="sale">Sales Invoices</option>
                            <option value="service">Service Invoices</option>
                        </select>
                        <select id="invoiceSortFilter" onchange="invoicesModule().sortInvoices()">
                            <option value="date_desc">Date (Newest First)</option>
                            <option value="date_asc">Date (Oldest First)</option>
                            <option value="amount_desc">Amount (High to Low)</option>
                            <option value="amount_asc">Amount (Low to High)</option>
                            <option value="customer_asc">Customer (A-Z)</option>
                            <option value="customer_desc">Customer (Z-A)</option>
                        </select>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table" id="invoicesTable">
                        <thead>
                            <tr>
                                <th><strong>Invoice #</strong></th>
                                <th><strong>Type</strong></th>
                                <th><strong>Date</strong></th>
                                <th><strong>Customer</strong></th>
                                <th><strong>Phone</strong></th>
                                <th><strong>Amount</strong></th>
                                <th><strong>Actions</strong></th>
                            </tr>
                        </thead>
                        <tbody id="invoicesTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Invoice Viewer Modal -->
            <div id="invoiceViewerModal" class="modal">
                <div class="modal-content extra-large-modal responsive-modal">
                    <div class="modal-header">
                        <h3 id="invoiceViewerTitle">Invoice Details</h3>
                        <span class="close-btn" onclick="invoicesModule().closeModal('invoiceViewerModal')">&times;</span>
                    </div>
                    <div class="modal-body" id="invoiceViewerContent">
                        <!-- Dynamic content -->
                    </div>
                    <div class="modal-actions">
                        <button type="button" onclick="invoicesModule().closeModal('invoiceViewerModal')" class="btn btn-secondary">Close</button>
                        <button type="button" onclick="invoicesModule().printCurrentInvoice()" class="btn btn-primary" id="printCurrentInvoiceBtn">Print/Save PDF</button>
                        <button type="button" onclick="invoicesModule().sendWhatsApp()" class="btn btn-success" id="sendWhatsAppBtn">Send WhatsApp</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search with dropdown functionality
        const invoiceSearch = document.getElementById('invoiceSearch');
        if (invoiceSearch) {
            invoiceSearch.addEventListener('input', (e) => {
                clearTimeout(this.searchDropdownTimeout);
                this.searchDropdownTimeout = setTimeout(() => {
                    this.showSearchDropdown(e.target.value);
                }, 300);
            });

            invoiceSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    const dropdown = document.getElementById('invoiceSearchDropdown');
                    if (dropdown) dropdown.style.display = 'none';
                }, 200);
            });

            invoiceSearch.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.searchInvoices();
                }
            });
        }

        // Filter functionality
        const invoiceTypeFilter = document.getElementById('invoiceTypeFilter');
        if (invoiceTypeFilter) {
            invoiceTypeFilter.addEventListener('change', () => this.filterInvoicesByType());
        }

        const invoiceSortFilter = document.getElementById('invoiceSortFilter');
        if (invoiceSortFilter) {
            invoiceSortFilter.addEventListener('change', () => this.sortInvoices());
        }
    }

    async loadData() {
        try {
            this.invoices = await ipcRenderer.invoke('get-all-invoices');
            this.filteredInvoices = [...this.invoices];
            this.renderTable();
        } catch (error) {
            console.error('Error loading invoices:', error);
            showError('Error loading invoices');
        }
    }

    showSearchDropdown(searchTerm) {
        const dropdown = document.getElementById('invoiceSearchDropdown');
        if (!dropdown || searchTerm.length < 2) {
            if (dropdown) dropdown.style.display = 'none';
            return;
        }

        const filteredResults = this.invoices.filter(invoice => 
            (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (invoice.customer_name && invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (invoice.job_number && invoice.job_number.toLowerCase().includes(searchTerm.toLowerCase()))
        ).slice(0, 10);

        if (filteredResults.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = filteredResults.map(invoice => `
            <div class="suggestion-item" onclick="invoicesModule().selectFromDropdown('${invoice.invoice_number || invoice.job_number}')">
                <strong>${invoice.invoice_number || invoice.job_number}</strong> - ${invoice.customer_name || 'Walk-in Customer'}
                <br><small>${invoice.type.toUpperCase()} - ₹${parseFloat(invoice.amount || 0).toFixed(2)}</small>
            </div>
        `).join('');

        dropdown.style.display = 'block';
    }

    selectFromDropdown(searchValue) {
        const searchField = document.getElementById('invoiceSearch');
        const dropdown = document.getElementById('invoiceSearchDropdown');
        
        if (searchField) searchField.value = searchValue;
        if (dropdown) dropdown.style.display = 'none';
        
        this.searchInvoices();
    }

    renderTable() {
        const tbody = document.getElementById('invoicesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredInvoices.forEach(invoice => {
            const row = document.createElement('tr');
            const invoiceDate = new Date(invoice.date || invoice.created_at).toLocaleDateString();
            const typeClass = invoice.type === 'sale' ? 'sale-invoice' : 'service-invoice';
            
            row.innerHTML = `
                <td><span class="invoice-number"><strong>${invoice.invoice_number || invoice.job_number}</strong></span></td>
                <td><span class="invoice-type ${typeClass}"><strong>${invoice.type.toUpperCase()}</strong></span></td>
                <td><strong>${invoiceDate}</strong></td>
                <td><strong>${invoice.customer_name || 'Walk-in Customer'}</strong></td>
                <td><strong>${invoice.customer_phone || '-'}</strong></td>
                <td><strong>₹${parseFloat(invoice.amount || 0).toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="invoicesModule().viewInvoice('${invoice.type}', ${invoice.id})">View</button>
                    <button class="btn btn-sm btn-primary" onclick="invoicesModule().printInvoice('${invoice.type}', ${invoice.id})">Print</button>
                    ${invoice.customer_phone ? `<button class="btn btn-sm btn-success" onclick="invoicesModule().sendWhatsAppDirect('${invoice.type}', ${invoice.id})">WhatsApp</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async viewInvoice(type, id) {
        try {
            let invoiceData;
            
            if (type === 'sale') {
                invoiceData = await ipcRenderer.invoke('get-sale-details', id);
                this.displaySaleInvoice(invoiceData);
            } else if (type === 'service') {
                invoiceData = await ipcRenderer.invoke('get-service-job-details', id);
                this.displayServiceInvoice(invoiceData);
            }
            
            this.currentInvoice = { type, id, data: invoiceData };
            
            const modal = document.getElementById('invoiceViewerModal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading invoice details:', error);
            showError('Error loading invoice details');
        }
    }

    displaySaleInvoice(saleData) {
        const { sale, items, payments } = saleData;
        const title = document.getElementById('invoiceViewerTitle');
        const content = document.getElementById('invoiceViewerContent');
        
        if (title) title.textContent = `Sale Invoice - ${sale.invoice_number || `INV-S-${sale.id}`}`;
        if (!content) return;
        
        content.innerHTML = this.generateSaleInvoiceHTML(saleData, false);
    }

    displayServiceInvoice(serviceData) {
        const { job, items } = serviceData;
        const title = document.getElementById('invoiceViewerTitle');
        const content = document.getElementById('invoiceViewerContent');
        
        if (title) title.textContent = `Service Invoice - ${job.invoice_number || `INV-SRV-${job.id}`}`;
        if (!content) return;
        
        content.innerHTML = this.generateServiceInvoiceHTML(serviceData, false);
    }

    generateSaleInvoiceHTML(saleData, isPrint = false) {
        const { sale, items, payments } = saleData;
        const logoPath = isPrint ? '../assets/icon.png' : '../assets/icon.png';
        
        return `
            <div class="invoice-container" style="${isPrint ? 'width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; font-size: 12px; position: relative;' : ''}">
                <!-- Header -->
                <div class="invoice-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 15px;">
                    <div class="invoice-logo" style="flex: 1;">
                        <img src="${logoPath}" alt="Logo" style="max-width: 80px; max-height: 80px;">
                    </div>
                    <div class="invoice-title" style="flex: 2; text-align: center;">
                        <h1 style="font-size: 28px; color: #2c3e50; margin: 0; font-weight: bold;">SALES INVOICE</h1>
                        <h3 style="color: #e74c3c; margin: 5px 0; font-weight: bold;">${sale.invoice_number || `INV-S-${sale.id}`}</h3>
                    </div>
                    <div class="shop-address" style="flex: 1; text-align: right; font-size: 10px; line-height: 1.4;">
                        <strong>ZEDSON Watchcraft</strong><br>
                        123 Watch Street<br>
                        Chennai, Tamil Nadu<br>
                        Phone: +91 98765 43210<br>
                        Email: info@zedsonwatch.com
                    </div>
                </div>

                <!-- Content -->
                <div class="invoice-content" style="margin-bottom: 50px;">
                    <!-- Customer & Invoice Details -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div class="customer-details" style="flex: 1;">
                            <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Bill To:</strong></h4>
                            <strong>${sale.customer_name || 'Walk-in Customer'}</strong><br>
                            ${sale.customer_phone ? `Phone: ${sale.customer_phone}<br>` : ''}
                            ${sale.customer_email ? `Email: ${sale.customer_email}<br>` : ''}
                            ${sale.customer_address ? `${sale.customer_address}<br>` : ''}
                        </div>
                        <div class="invoice-details" style="flex: 1; text-align: right;">
                            <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Invoice Details:</strong></h4>
                            <strong>Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}<br>
                            <strong>Time:</strong> ${new Date(sale.created_at).toLocaleTimeString()}<br>
                            <strong>Cashier:</strong> ${sale.created_by_name || 'N/A'}<br>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #bdc3c7;">
                        <thead style="background-color: #ecf0f1;">
                            <tr>
                                <th style="border: 1px solid #bdc3c7; padding: 10px; text-align: left; font-weight: bold;">Item Code</th>
                                <th style="border: 1px solid #bdc3c7; padding: 10px; text-align: left; font-weight: bold;">Item Name</th>
                                <th style="border: 1px solid #bdc3c7; padding: 10px; text-align: center; font-weight: bold;">Qty</th>
                                <th style="border: 1px solid #bdc3c7; padding: 10px; text-align: right; font-weight: bold;">Unit Price</th>
                                <th style="border: 1px solid #bdc3c7; padding: 10px; text-align: right; font-weight: bold;">Discount</th>
                                <th style="border: 1px solid #bdc3c7; padding: 10px; text-align: right; font-weight: bold;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td style="border: 1px solid #bdc3c7; padding: 8px;">${item.item_code}</td>
                                    <td style="border: 1px solid #bdc3c7; padding: 8px;">${item.item_name}</td>
                                    <td style="border: 1px solid #bdc3c7; padding: 8px; text-align: center;">${item.quantity}</td>
                                    <td style="border: 1px solid #bdc3c7; padding: 8px; text-align: right;">₹${parseFloat(item.unit_price).toFixed(2)}</td>
                                    <td style="border: 1px solid #bdc3c7; padding: 8px; text-align: right;">
                                        ${item.discount_value > 0 ? 
                                            (item.discount_type === 'percentage' ? `${item.discount_value}%` : `₹${parseFloat(item.discount_value).toFixed(2)}`)
                                            : '-'}
                                    </td>
                                    <td style="border: 1px solid #bdc3c7; padding: 8px; text-align: right; font-weight: bold;">₹${parseFloat(item.line_total).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Totals -->
                    <div style="display: flex; justify-content: flex-end;">
                        <div style="min-width: 300px;">
                            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #bdc3c7;">
                                <strong>Subtotal:</strong>
                                <span>₹${parseFloat(sale.subtotal).toFixed(2)}</span>
                            </div>
                            ${sale.total_discount > 0 ? `
                                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #bdc3c7; color: #e74c3c;">
                                    <strong>Total Discount:</strong>
                                    <span>-₹${parseFloat(sale.total_discount).toFixed(2)}</span>
                                </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #2c3e50; font-size: 16px; font-weight: bold; color: #2c3e50;">
                                <strong>Total Amount:</strong>
                                <span>₹${parseFloat(sale.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Payment Information -->
                    <div style="margin-top: 20px;">
                        <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Payment Information:</strong></h4>
                        ${payments.map(payment => `
                            <div style="padding: 5px 0;">
                                <strong>${payment.payment_method.toUpperCase()}:</strong> ₹${parseFloat(payment.amount).toFixed(2)}
                                ${payment.payment_reference ? ` (Ref: ${payment.payment_reference})` : ''}
                            </div>
                        `).join('')}
                    </div>

                    ${sale.notes ? `
                        <div style="margin-top: 20px;">
                            <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Notes:</strong></h4>
                            <p style="background-color: #f8f9fa; padding: 10px; border-left: 4px solid #3498db;">${sale.notes}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="invoice-footer" style="${isPrint ? 'position: absolute; bottom: 20mm; left: 20mm; right: 20mm;' : 'margin-top: 40px;'} text-align: center; border-top: 2px solid #2c3e50; padding-top: 15px;">
                    <p style="margin: 10px 0; font-size: 14px; color: #2c3e50;"><strong>Thank you for your purchase!</strong></p>
                    <p style="margin: 5px 0; font-weight: bold; color: #e74c3c; font-size: 16px;">ZEDSON Watchcraft - Your Trusted Watch Partner</p>
                    <p style="margin: 5px 0; font-size: 11px; color: #7f8c8d;">📞 +91 98765 43210 | 📧 info@zedsonwatch.com | 🌐 www.zedsonwatch.com</p>
                    <p style="margin: 5px 0; font-size: 10px; color: #95a5a6;">Thank you for choosing ZEDSON Watchcraft. We appreciate your business!</p>
                </div>
            </div>
        `;
    }

    generateServiceInvoiceHTML(serviceData, isPrint = false) {
        const { job, items } = serviceData;
        const logoPath = isPrint ? '../assets/icon.png' : '../assets/icon.png';
        
        return `
            <div class="invoice-container" style="${isPrint ? 'width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm; font-family: Arial, sans-serif; font-size: 12px; position: relative;' : ''}">
                <!-- Header -->
                <div class="invoice-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 15px;">
                    <div class="invoice-logo" style="flex: 1;">
                        <img src="${logoPath}" alt="Logo" style="max-width: 80px; max-height: 80px;">
                    </div>
                    <div class="invoice-title" style="flex: 2; text-align: center;">
                        <h1 style="font-size: 28px; color: #2c3e50; margin: 0; font-weight: bold;">SERVICE INVOICE</h1>
                        <h3 style="color: #e74c3c; margin: 5px 0; font-weight: bold;">${job.invoice_number || `INV-SRV-${job.id}`}</h3>
                        <h4 style="color: #3498db; margin: 5px 0; font-weight: bold;">Job: ${job.job_number}</h4>
                    </div>
                    <div class="shop-address" style="flex: 1; text-align: right; font-size: 10px; line-height: 1.4;">
                        <strong>ZEDSON Watchcraft</strong><br>
                        123 Watch Street<br>
                        Chennai, Tamil Nadu<br>
                        Phone: +91 98765 43210<br>
                        Email: info@zedsonwatch.com
                    </div>
                </div>

                <!-- Content -->
                <div class="invoice-content" style="margin-bottom: 50px;">
                    <!-- Customer & Job Details -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div class="customer-details" style="flex: 1;">
                            <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Customer Details:</strong></h4>
                            <strong>${job.customer_name || 'Walk-in Customer'}</strong><br>
                            ${job.customer_phone ? `Phone: ${job.customer_phone}<br>` : ''}
                            ${job.customer_email ? `Email: ${job.customer_email}<br>` : ''}
                            ${job.customer_address ? `${job.customer_address}<br>` : ''}
                        </div>
                        <div class="job-details" style="flex: 1; text-align: right;">
                            <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Service Details:</strong></h4>
                            <strong>Job Date:</strong> ${new Date(job.created_at).toLocaleDateString()}<br>
                            <strong>Delivery Date:</strong> ${job.actual_delivery_date ? new Date(job.actual_delivery_date).toLocaleDateString() : 'Pending'}<br>
                            <strong>Location:</strong> ${job.location.charAt(0).toUpperCase() + job.location.slice(1)}<br>
                            <strong>Status:</strong> ${job.status.replace(/_/g, ' ').toUpperCase()}<br>
                            <strong>Technician:</strong> ${job.created_by_name || 'N/A'}<br>
                        </div>
                    </div>

                    <!-- Service Items -->
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Service Items:</strong></h4>
                        ${items.map((item, index) => `
                            <div style="border: 1px solid #bdc3c7; padding: 15px; margin-bottom: 10px; background-color: #f8f9fa;">
                                <h5 style="color: #2c3e50; margin: 0 0 10px 0;"><strong>Item ${index + 1}</strong></h5>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                                    <div><strong>Category:</strong> ${item.category}</div>
                                    <div><strong>Brand:</strong> ${item.brand || 'N/A'}</div>
                                    <div><strong>Gender:</strong> ${item.gender || 'N/A'}</div>
                                    <div><strong>Case Material:</strong> ${item.case_material || 'N/A'}</div>
                                    <div><strong>Strap Material:</strong> ${item.strap_material || 'N/A'}</div>
                                    <div><strong>Movement No:</strong> ${item.movement_no || 'N/A'}</div>
                                </div>
                                ${item.machine_change ? `<div style="margin-top: 10px;"><strong>Machine Change:</strong> ${item.machine_change}</div>` : ''}
                                <div style="margin-top: 10px;"><strong>Issue Description:</strong></div>
                                <div style="background-color: white; padding: 8px; border-left: 4px solid #3498db; margin-top: 5px; font-style: italic;">${item.issue_description}</div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Service Charges -->
                    <div style="display: flex; justify-content: flex-end;">
                        <div style="min-width: 300px;">
                            ${job.estimated_cost ? `
                                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #bdc3c7;">
                                    <strong>Estimated Cost:</strong>
                                    <span>₹${parseFloat(job.estimated_cost).toFixed(2)}</span>
                                </div>
                            ` : ''}
                            ${job.advance_amount > 0 ? `
                                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #bdc3c7; color: #27ae60;">
                                    <strong>Advance Paid:</strong>
                                    <span>₹${parseFloat(job.advance_amount).toFixed(2)}</span>
                                </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #2c3e50; font-size: 16px; font-weight: bold; color: #2c3e50;">
                                <strong>Final Cost:</strong>
                                <span>₹${parseFloat(job.final_cost || job.estimated_cost || 0).toFixed(2)}</span>
                            </div>
                            ${(job.final_cost || job.estimated_cost) && job.advance_amount ? `
                                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; font-weight: bold; color: ${(job.final_cost || job.estimated_cost) - job.advance_amount > 0 ? '#e74c3c' : '#27ae60'};">
                                    <strong>Balance Due:</strong>
                                    <span>₹${(parseFloat(job.final_cost || job.estimated_cost || 0) - parseFloat(job.advance_amount || 0)).toFixed(2)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Payment Information -->
                    <div style="margin-top: 20px;">
                        <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Payment Information:</strong></h4>
                        ${job.advance_amount > 0 ? `
                            <div style="padding: 5px 0;">
                                <strong>Advance (${job.advance_payment_method ? job.advance_payment_method.toUpperCase() : 'CASH'}):</strong> ₹${parseFloat(job.advance_amount).toFixed(2)}
                                ${job.advance_payment_reference ? ` (Ref: ${job.advance_payment_reference})` : ''}
                            </div>
                        ` : ''}
                        ${job.final_payment_amount > 0 ? `
                            <div style="padding: 5px 0;">
                                <strong>Final Payment (${job.final_payment_method ? job.final_payment_method.toUpperCase() : 'CASH'}):</strong> ₹${parseFloat(job.final_payment_amount).toFixed(2)}
                                ${job.final_payment_reference ? ` (Ref: ${job.final_payment_reference})` : ''}
                            </div>
                        ` : ''}
                    </div>

                    ${job.comments ? `
                        <div style="margin-top: 20px;">
                            <h4 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;"><strong>Service Notes:</strong></h4>
                            <p style="background-color: #f8f9fa; padding: 10px; border-left: 4px solid #3498db;">${job.comments}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="invoice-footer" style="${isPrint ? 'position: absolute; bottom: 20mm; left: 20mm; right: 20mm;' : 'margin-top: 40px;'} text-align: center; border-top: 2px solid #2c3e50; padding-top: 15px;">
                    <p style="margin: 10px 0; font-size: 14px; color: #2c3e50;"><strong>Thank you for trusting us with your timepiece!</strong></p>
                    <p style="margin: 5px 0; font-weight: bold; color: #e74c3c; font-size: 16px;">ZEDSON Watchcraft - Your Trusted Watch Partner</p>
                    <p style="margin: 5px 0; font-size: 11px; color: #7f8c8d;">📞 +91 98765 43210 | 📧 info@zedsonwatch.com | 🌐 www.zedsonwatch.com</p>
                    <p style="margin: 5px 0; font-size: 10px; color: #95a5a6;">Quality service and genuine parts guaranteed. Visit us again!</p>
                </div>
            </div>
        `;
    }

    async printCurrentInvoice() {
        if (!this.currentInvoice) {
            showError('No invoice selected');
            return;
        }

        await this.printInvoice(this.currentInvoice.type, this.currentInvoice.id);
    }

    async printInvoice(type, id) {
        try {
            let invoiceData;
            let htmlContent;
            
            if (type === 'sale') {
                invoiceData = await ipcRenderer.invoke('get-sale-details', id);
                htmlContent = this.generateSaleInvoiceHTML(invoiceData, true);
            } else if (type === 'service') {
                invoiceData = await ipcRenderer.invoke('get-service-job-details', id);
                htmlContent = this.generateServiceInvoiceHTML(invoiceData, true);
            }

            // Open print window
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invoice - ${type === 'sale' ? invoiceData.sale.invoice_number : invoiceData.job.invoice_number}</title>
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
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `);
            printWindow.document.close();
            
            // Wait for content to load then print
            setTimeout(() => {
                printWindow.print();
            }, 500);
            
        } catch (error) {
            console.error('Error printing invoice:', error);
            showError('Error generating invoice for printing');
        }
    }

    async sendWhatsApp() {
        if (!this.currentInvoice) {
            showError('No invoice selected');
            return;
        }

        await this.sendWhatsAppDirect(this.currentInvoice.type, this.currentInvoice.id);
    }

    async sendWhatsAppDirect(type, id) {
        try {
            let invoiceData;
            let phone;
            let message;
            
            if (type === 'sale') {
                invoiceData = await ipcRenderer.invoke('get-sale-details', id);
                const { sale } = invoiceData;
                phone = sale.customer_phone;
                message = `Hello ${sale.customer_name || 'Customer'},\n\nThank you for your purchase at ZEDSON Watchcraft!\n\nInvoice: ${sale.invoice_number || `INV-S-${sale.id}`}\nDate: ${new Date(sale.sale_date).toLocaleDateString()}\nAmount: ₹${parseFloat(sale.total_amount).toFixed(2)}\n\nWe appreciate your business!\n\nZEDSON Watchcraft - Your Trusted Watch Partner\n📞 +91 98765 43210`;
            } else if (type === 'service') {
                invoiceData = await ipcRenderer.invoke('get-service-job-details', id);
                const { job } = invoiceData;
                phone = job.customer_phone;
                message = `Hello ${job.customer_name || 'Customer'},\n\nYour watch service is ${job.status === 'delivered' ? 'completed and delivered' : job.status.replace(/_/g, ' ')} at ZEDSON Watchcraft!\n\nJob: ${job.job_number}\nInvoice: ${job.invoice_number || `INV-SRV-${job.id}`}\nService Cost: ₹${parseFloat(job.final_cost || job.estimated_cost || 0).toFixed(2)}\n\nThank you for trusting us with your timepiece!\n\nZEDSON Watchcraft - Your Trusted Watch Partner\n📞 +91 98765 43210`;
            }

            if (!phone) {
                showError('Customer phone number not available');
                return;
            }

            // Clean phone number (remove any non-digits except +)
            const cleanPhone = phone.replace(/[^\d+]/g, '');
            
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

    searchInvoices() {
        const searchTerm = document.getElementById('invoiceSearch')?.value?.toLowerCase() || '';
        
        if (!searchTerm) {
            this.filteredInvoices = [...this.invoices];
        } else {
            this.filteredInvoices = this.invoices.filter(invoice => 
                (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(searchTerm)) ||
                (invoice.customer_name && invoice.customer_name.toLowerCase().includes(searchTerm)) ||
                (invoice.job_number && invoice.job_number.toLowerCase().includes(searchTerm)) ||
                (invoice.customer_phone && invoice.customer_phone.includes(searchTerm))
            );
        }
        
        this.renderTable();
    }

    clearInvoiceSearch() {
        const searchField = document.getElementById('invoiceSearch');
        if (searchField) searchField.value = '';
        
        this.filteredInvoices = [...this.invoices];
        this.renderTable();
    }

    filterInvoicesByType() {
        const typeFilter = document.getElementById('invoiceTypeFilter')?.value || '';
        const searchTerm = document.getElementById('invoiceSearch')?.value?.toLowerCase() || '';
        
        let filtered = [...this.invoices];
        
        // Apply type filter
        if (typeFilter) {
            filtered = filtered.filter(invoice => invoice.type === typeFilter);
        }
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(invoice => 
                (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(searchTerm)) ||
                (invoice.customer_name && invoice.customer_name.toLowerCase().includes(searchTerm)) ||
                (invoice.job_number && invoice.job_number.toLowerCase().includes(searchTerm)) ||
                (invoice.customer_phone && invoice.customer_phone.includes(searchTerm))
            );
        }
        
        this.filteredInvoices = filtered;
        this.renderTable();
    }

    sortInvoices() {
        const sortBy = document.getElementById('invoiceSortFilter')?.value || 'date_desc';
        
        this.filteredInvoices.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc':
                    return new Date(b.date || b.created_at) - new Date(a.date || a.created_at);
                case 'date_asc':
                    return new Date(a.date || a.created_at) - new Date(b.date || b.created_at);
                case 'amount_desc':
                    return parseFloat(b.amount || 0) - parseFloat(a.amount || 0);
                case 'amount_asc':
                    return parseFloat(a.amount || 0) - parseFloat(b.amount || 0);
                case 'customer_asc':
                    return (a.customer_name || 'Walk-in').localeCompare(b.customer_name || 'Walk-in');
                case 'customer_desc':
                    return (b.customer_name || 'Walk-in').localeCompare(a.customer_name || 'Walk-in');
                default:
                    return 0;
            }
        });
        
        this.renderTable();
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Get invoices for reporting
    getInvoices() {
        return this.invoices;
    }

    // Get invoices by type
    getInvoicesByType(type) {
        return this.invoices.filter(invoice => invoice.type === type);
    }

    // Get invoices by date range
    getInvoicesByDateRange(startDate, endDate) {
        return this.invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date || invoice.created_at);
            return invoiceDate >= new Date(startDate) && invoiceDate <= new Date(endDate);
        });
    }

    // Get total revenue for a period
    getTotalRevenue(startDate = null, endDate = null, type = null) {
        let filteredInvoices = this.invoices;
        
        if (startDate && endDate) {
            filteredInvoices = this.getInvoicesByDateRange(startDate, endDate);
        }
        
        if (type) {
            filteredInvoices = filteredInvoices.filter(invoice => invoice.type === type);
        }
        
        return filteredInvoices.reduce((total, invoice) => total + parseFloat(invoice.amount || 0), 0);
    }
}

// Global functions for HTML onclick handlers
window.searchInvoices = function() {
    const invoicesModule = window.invoicesModule();
    if (invoicesModule) {
        invoicesModule.searchInvoices();
    }
};

window.clearInvoiceSearch = function() {
    const invoicesModule = window.invoicesModule();
    if (invoicesModule) {
        invoicesModule.clearInvoiceSearch();
    }
};

window.filterInvoicesByType = function() {
    const invoicesModule = window.invoicesModule();
    if (invoicesModule) {
        invoicesModule.filterInvoicesByType();
    }
};

window.printCurrentInvoice = function() {
    const invoicesModule = window.invoicesModule();
    if (invoicesModule) {
        invoicesModule.printCurrentInvoice();
    }
};

window.invoicesModule = function() {
    return window.invoicesModuleInstance;
};

module.exports = InvoicesModule;