const { ipcRenderer } = require('electron');

class InvoicesModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.invoices = [];
        this.filteredInvoices = [];
        this.currentInvoice = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Search functionality
        const invoiceSearch = document.getElementById('invoiceSearch');
        if (invoiceSearch) {
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

    renderTable() {
        const tbody = document.getElementById('invoicesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredInvoices.forEach(invoice => {
            const row = document.createElement('tr');
            const invoiceDate = new Date(invoice.date || invoice.created_at).toLocaleDateString();
            const typeClass = invoice.type === 'sale' ? 'sale-invoice' : 'service-invoice';
            
            row.innerHTML = `
                <td><span class="invoice-number">${invoice.invoice_number}</span></td>
                <td><span class="invoice-type ${typeClass}">${invoice.type.toUpperCase()}</span></td>
                <td>${invoiceDate}</td>
                <td>${invoice.customer_name || 'Walk-in Customer'}</td>
                <td>₹${parseFloat(invoice.amount || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="invoicesModule().viewInvoice('${invoice.type}', ${invoice.id})">View</button>
                    <button class="btn btn-sm btn-primary" onclick="invoicesModule().printInvoice('${invoice.type}', ${invoice.id})">Print</button>
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
        
        if (title) title.textContent = `Sale Invoice - INV-S-${sale.id}`;
        if (!content) return;
        
        content.innerHTML = `
            <div class="invoice-header">
                <div class="invoice-company">
                    <h2>⌚ Watch Shop</h2>
                    <p>Professional Watch Services</p>
                </div>
                <div class="invoice-details">
                    <h3>SALE INVOICE</h3>
                    <p><strong>Invoice #:</strong> INV-S-${sale.id}</p>
                    <p><strong>Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}</p>
                </div>
            </div>

            <div class="invoice-customer">
                <h4>Bill To:</h4>
                <p><strong>${sale.customer_name || 'Walk-in Customer'}</strong></p>
                ${sale.customer_phone ? `<p>Phone: ${sale.customer_phone}</p>` : ''}
                ${sale.customer_email ? `<p>Email: ${sale.customer_email}</p>` : ''}
            </div>

            <div class="invoice-items">
                <table class="invoice-table">
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

            <div class="invoice-summary">
                <div class="invoice-summary-row">
                    <span>Subtotal:</span>
                    <span>₹${parseFloat(sale.subtotal).toFixed(2)}</span>
                </div>
                <div class="invoice-summary-row">
                    <span>Total Discount:</span>
                    <span>₹${parseFloat(sale.total_discount).toFixed(2)}</span>
                </div>
                <div class="invoice-summary-row total">
                    <span><strong>Total Amount:</strong></span>
                    <span><strong>₹${parseFloat(sale.total_amount).toFixed(2)}</strong></span>
                </div>
            </div>

            <div class="invoice-payments">
                <h4>Payment Details:</h4>
                ${payments.map(payment => `
                    <div class="payment-row">
                        <span>${payment.payment_method.toUpperCase()}: ₹${parseFloat(payment.amount).toFixed(2)}</span>
                        ${payment.payment_reference ? `<small> (Ref: ${payment.payment_reference})</small>` : ''}
                    </div>
                `).join('')}
            </div>

            ${sale.notes ? `
            <div class="invoice-notes">
                <h4>Notes:</h4>
                <p>${sale.notes}</p>
            </div>` : ''}

            <div class="invoice-footer">
                <p>Thank you for your business!</p>
            </div>
        `;
    }

    displayServiceInvoice(serviceData) {
        const { job, items } = serviceData;
        const title = document.getElementById('invoiceViewerTitle');
        const content = document.getElementById('invoiceViewerContent');
        
        if (title) title.textContent = `Service Invoice - INV-SRV-${job.id}`;
        if (!content) return;
        
        content.innerHTML = `
            <div class="invoice-header">
                <div class="invoice-company">
                    <h2>⌚ Watch Shop</h2>
                    <p>Professional Watch Services</p>
                </div>
                <div class="invoice-details">
                    <h3>SERVICE INVOICE</h3>
                    <p><strong>Invoice #:</strong> INV-SRV-${job.id}</p>
                    <p><strong>Job #:</strong> ${job.job_number}</p>
                    <p><strong>Service Date:</strong> ${new Date(job.created_at).toLocaleDateString()}</p>
                    ${job.actual_delivery_date ? `<p><strong>Completion Date:</strong> ${new Date(job.actual_delivery_date).toLocaleDateString()}</p>` : ''}
                </div>
            </div>

            <div class="invoice-customer">
                <h4>Bill To:</h4>
                <p><strong>${job.customer_name || 'Walk-in Customer'}</strong></p>
                ${job.customer_phone ? `<p>Phone: ${job.customer_phone}</p>` : ''}
                ${job.customer_email ? `<p>Email: ${job.customer_email}</p>` : ''}
            </div>

            <div class="invoice-items">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Brand</th>
                            <th>Service Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.category}</td>
                                <td>${item.brand || '-'}</td>
                                <td>${item.issue_description}</td>
                                <td>₹${(parseFloat(job.final_cost || job.estimated_cost || 0) / items.length).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="3"><strong>Total Service Cost</strong></td>
                            <td><strong>₹${parseFloat(job.final_cost || job.estimated_cost || 0).toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="invoice-summary">
                <div class="invoice-summary-row">
                    <span>Service Cost:</span>
                    <span>₹${parseFloat(job.final_cost || job.estimated_cost || 0).toFixed(2)}</span>
                </div>
                <div class="invoice-summary-row">
                    <span>Advance Paid:</span>
                    <span>₹${parseFloat(job.advance_amount || 0).toFixed(2)}</span>
                </div>
                ${job.final_payment_amount ? `
                <div class="invoice-summary-row">
                    <span>Final Payment:</span>
                    <span>₹${parseFloat(job.final_payment_amount).toFixed(2)}</span>
                </div>` : ''}
                <div class="invoice-summary-row total">
                    <span><strong>Total Paid:</strong></span>
                    <span><strong>₹${(parseFloat(job.advance_amount || 0) + parseFloat(job.final_payment_amount || 0)).toFixed(2)}</strong></span>
                </div>
                ${job.final_cost ? `
                <div class="invoice-summary-row">
                    <span>Balance Due:</span>
                    <span>₹${(parseFloat(job.final_cost) - parseFloat(job.advance_amount || 0) - parseFloat(job.final_payment_amount || 0)).toFixed(2)}</span>
                </div>` : ''}
            </div>

            ${job.comments ? `
            <div class="invoice-notes">
                <h4>Service Notes:</h4>
                <p>${job.comments}</p>
            </div>` : ''}

            <div class="invoice-footer">
                <p>Thank you for your business!</p>
                <p>Warranty: As per manufacturer's warranty terms</p>
            </div>
        `;
    }

    async printInvoice(type, id) {
        try {
            let invoiceData;
            
            if (type === 'sale') {
                invoiceData = await ipcRenderer.invoke('get-sale-details', id);
                this.printSaleInvoice(invoiceData);
            } else if (type === 'service') {
                invoiceData = await ipcRenderer.invoke('get-service-job-details', id);
                this.printServiceInvoice(invoiceData);
            }
        } catch (error) {
            console.error('Error printing invoice:', error);
            showError('Error printing invoice');
        }
    }

    printSaleInvoice(saleData) {
        const { sale, items, payments } = saleData;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sale Invoice - INV-S-${sale.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                    .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .company-tagline { font-size: 14px; color: #666; }
                    .invoice-title { font-size: 18px; font-weight: bold; margin: 15px 0; }
                    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
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
                    <div>
                        <strong>Invoice #:</strong> INV-S-${sale.id}<br>
                        <strong>Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}
                    </div>
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
                    ${payments.map(payment => `
                        ${payment.payment_method.toUpperCase()}: ₹${parseFloat(payment.amount).toFixed(2)}
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
    }

    printServiceInvoice(serviceData) {
        const { job, items } = serviceData;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Service Invoice - INV-SRV-${job.id}</title>
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
                    .total-row { font-weight: bold; background: #f0f0f0; }
                    .summary { text-align: right; margin: 20px 0; }
                    .summary-row { margin: 5px 0; }
                    .total-summary { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; }
                    .footer { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">⌚ Watch Shop</div>
                    <div class="company-tagline">Professional Watch Services</div>
                    <div class="invoice-title">SERVICE INVOICE</div>
                </div>
                
                <div class="invoice-info">
                    <strong>Invoice #:</strong> INV-SRV-${job.id}<br>
                    <strong>Job #:</strong> ${job.job_number}<br>
                    <strong>Service Date:</strong> ${new Date(job.created_at).toLocaleDateString()}<br>
                    ${job.actual_delivery_date ? `<strong>Completion Date:</strong> ${new Date(job.actual_delivery_date).toLocaleDateString()}<br>` : ''}
                </div>
                
                <div class="customer-info">
                    <strong>Bill To:</strong><br>
                    ${job.customer_name || 'Walk-in Customer'}<br>
                    ${job.customer_phone ? `Phone: ${job.customer_phone}<br>` : ''}
                    ${job.customer_email ? `Email: ${job.customer_email}` : ''}
                </div>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Brand</th>
                            <th>Service Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.category}</td>
                                <td>${item.brand || '-'}</td>
                                <td>${item.issue_description}</td>
                                <td>₹${(parseFloat(job.final_cost || job.estimated_cost || 0) / items.length).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="3"><strong>Total Service Cost</strong></td>
                            <td><strong>₹${parseFloat(job.final_cost || job.estimated_cost || 0).toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="summary">
                    <div class="summary-row">Service Cost: ₹${parseFloat(job.final_cost || job.estimated_cost || 0).toFixed(2)}</div>
                    <div class="summary-row">Advance Paid: ₹${parseFloat(job.advance_amount || 0).toFixed(2)}</div>
                    ${job.final_payment_amount ? `<div class="summary-row">Final Payment: ₹${parseFloat(job.final_payment_amount).toFixed(2)}</div>` : ''}
                    <div class="summary-row total-summary">Total Paid: ₹${(parseFloat(job.advance_amount || 0) + parseFloat(job.final_payment_amount || 0)).toFixed(2)}</div>
                    ${job.final_cost ? `<div class="summary-row">Balance Due: ₹${(parseFloat(job.final_cost) - parseFloat(job.advance_amount || 0) - parseFloat(job.final_payment_amount || 0)).toFixed(2)}</div>` : ''}
                </div>
                
                ${job.comments ? `
                <div class="notes">
                    <strong>Service Notes:</strong><br>
                    ${job.comments}
                </div>` : ''}
                
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>Warranty: As per manufacturer's warranty terms</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    printCurrentInvoice() {
        if (!this.currentInvoice) {
            showError('No invoice selected for printing');
            return;
        }
        
        this.printInvoice(this.currentInvoice.type, this.currentInvoice.id);
    }

    searchInvoices() {
        const searchTerm = document.getElementById('invoiceSearch')?.value?.trim().toLowerCase();
        
        if (searchTerm) {
            this.filteredInvoices = this.invoices.filter(invoice => 
                invoice.invoice_number.toLowerCase().includes(searchTerm) ||
                (invoice.customer_name && invoice.customer_name.toLowerCase().includes(searchTerm)) ||
                (invoice.job_number && invoice.job_number.toLowerCase().includes(searchTerm))
            );
        } else {
            this.filteredInvoices = [...this.invoices];
        }
        
        this.renderTable();
    }

    clearInvoiceSearch() {
        const searchField = document.getElementById('invoiceSearch');
        if (searchField) searchField.value = '';
        
        const typeFilter = document.getElementById('invoiceTypeFilter');
        if (typeFilter) typeFilter.value = '';
        
        this.filteredInvoices = [...this.invoices];
        this.renderTable();
    }

    filterInvoicesByType() {
        const type = document.getElementById('invoiceTypeFilter')?.value;
        
        if (type) {
            this.filteredInvoices = this.invoices.filter(invoice => invoice.type === type);
        } else {
            this.filteredInvoices = [...this.invoices];
        }
        
        this.renderTable();
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

module.exports = InvoicesModule;