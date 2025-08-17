// Invoices module for ZEDSON Watchcraft - Simple & Reliable
(function() {
    'use strict';
    
    if (typeof window.InvoicesModule !== 'undefined') {
        return;
    }

class InvoicesModule {
    constructor() {
        this.invoices = [];
        this.searchTerm = '';
        this.filters = {};
    }

    render(container) {
        console.log('Invoices module: Starting render...');
        
        container.innerHTML = this.getTemplate();
        this.loadData();
        this.setupEvents();
        this.renderInvoicesList();
        
        console.log('Invoices module: Render completed');
    }

    getTemplate() {
        return `
            <div class="invoices-container">
                <div class="invoices-header">
                    <h1>Invoice Management</h1>
                    <div class="header-actions">
                        <button class="btn btn-info" id="export-invoices-btn">
                            📊 Export CSV
                        </button>
                    </div>
                </div>

                <div class="invoices-toolbar">
                    <div class="search-section">
                        <input type="text" id="invoices-search" class="form-input" 
                               placeholder="Search by invoice number, customer...">
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="type-filter" class="form-select">
                            <option value="">All Types</option>
                            <option value="sale">Sales Invoice</option>
                            <option value="service">Service Invoice</option>
                        </select>
                        
                        <select id="date-filter" class="form-select">
                            <option value="">All Dates</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        
                        <select id="status-filter" class="form-select">
                            <option value="">All Status</option>
                            <option value="1">Sent</option>
                            <option value="0">Not Sent</option>
                        </select>
                    </div>
                </div>

                <div class="invoices-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-invoices">0</span>
                        <span class="stat-label">Total Invoices</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="sales-invoices">0</span>
                        <span class="stat-label">Sales Invoices</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="service-invoices">0</span>
                        <span class="stat-label">Service Invoices</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="total-value">₹0</span>
                        <span class="stat-label">Total Value</span>
                    </div>
                </div>

                <div class="invoices-list-container">
                    <div id="invoices-list"></div>
                </div>

                <!-- Invoice Preview Modal -->
                <div id="invoice-preview-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-header">
                            <h3 id="preview-title">Invoice Preview</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <div id="invoice-preview-content" class="invoice-preview">
                                <!-- Invoice content will be generated here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Close
                            </button>
                            <button type="button" class="btn btn-primary" id="print-invoice-btn">
                                🖨️ Print
                            </button>
                            <button type="button" class="btn btn-success" id="send-whatsapp-btn">
                                📱 Send WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadData() {
        // Load invoices from sales and services
        Promise.all([
            this.loadSalesInvoices(),
            this.loadServiceInvoices()
        ]).then(() => {
            this.updateStats();
            this.renderInvoicesList();
        });
    }

    loadSalesInvoices() {
        return app.query(`
            SELECT 
                'sale' as type,
                s.id as reference_id,
                s.invoice_number,
                s.sale_date as date,
                s.total_amount as amount,
                c.name as customer_name,
                c.mobile as customer_mobile,
                c.customer_id,
                s.created_at,
                0 as is_sent
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.invoice_number IS NOT NULL
            ORDER BY s.created_at DESC
        `).then(salesInvoices => {
            this.invoices = [...(this.invoices || []), ...(salesInvoices || [])];
        }).catch(error => {
            console.error('Error loading sales invoices:', error);
        });
    }

    loadServiceInvoices() {
        return app.query(`
            SELECT 
                'service' as type,
                s.id as reference_id,
                s.invoice_number,
                s.service_date as date,
                s.amount,
                c.name as customer_name,
                c.mobile as customer_mobile,
                c.customer_id,
                s.created_at,
                0 as is_sent
            FROM services s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.invoice_number IS NOT NULL
            ORDER BY s.created_at DESC
        `).then(serviceInvoices => {
            this.invoices = [...(this.invoices || []), ...(serviceInvoices || [])];
            // Sort all invoices by date
            this.invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }).catch(error => {
            console.error('Error loading service invoices:', error);
        });
    }

    setupEvents() {
        // Search functionality
        document.getElementById('invoices-search').oninput = (e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        };

        // Clear search
        document.getElementById('clear-search').onclick = () => {
            document.getElementById('invoices-search').value = '';
            this.searchTerm = '';
            this.applyFilters();
        };

        // Filters
        document.getElementById('type-filter').onchange = (e) => {
            this.filters.type = e.target.value;
            this.applyFilters();
        };

        document.getElementById('date-filter').onchange = (e) => {
            this.filters.date = e.target.value;
            this.applyFilters();
        };

        document.getElementById('status-filter').onchange = (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        };

        // Export button
        document.getElementById('export-invoices-btn').onclick = () => this.exportInvoices();

        // Modal actions
        document.getElementById('print-invoice-btn').onclick = () => this.printCurrentInvoice();
        document.getElementById('send-whatsapp-btn').onclick = () => this.sendWhatsApp();
    }

    applyFilters() {
        let filtered = [...this.invoices];
        
        // Search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(invoice => 
                invoice.invoice_number?.toLowerCase().includes(term) ||
                invoice.customer_name?.toLowerCase().includes(term) ||
                invoice.customer_id?.toLowerCase().includes(term)
            );
        }
        
        // Type filter
        if (this.filters.type) {
            filtered = filtered.filter(invoice => invoice.type === this.filters.type);
        }
        
        // Date filter
        if (this.filters.date) {
            const today = new Date();
            filtered = filtered.filter(invoice => {
                const invoiceDate = new Date(invoice.date);
                switch (this.filters.date) {
                    case 'today':
                        return invoiceDate.toDateString() === today.toDateString();
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return invoiceDate >= weekAgo;
                    case 'month':
                        return invoiceDate.getMonth() === today.getMonth() && 
                               invoiceDate.getFullYear() === today.getFullYear();
                    default:
                        return true;
                }
            });
        }
        
        // Status filter
        if (this.filters.status !== '') {
            filtered = filtered.filter(invoice => 
                invoice.is_sent.toString() === this.filters.status
            );
        }
        
        this.renderInvoicesList(filtered);
    }

    renderInvoicesList(invoicesData = null) {
        const invoices = invoicesData || this.invoices;
        const container = document.getElementById('invoices-list');
        
        if (invoices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3>No invoices found</h3>
                    <p>Invoices will appear here when sales or services are completed</p>
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Invoice Number</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoices.map((invoice, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td class="font-mono">${invoice.invoice_number}</td>
                            <td>
                                <span class="type-badge ${invoice.type}">
                                    ${invoice.type === 'sale' ? 'Sales' : 'Service'}
                                </span>
                            </td>
                            <td>${Utils.formatDate(invoice.date)}</td>
                            <td>
                                <div class="customer-info">
                                    <strong>${invoice.customer_name || 'Unknown'}</strong>
                                    <br><small>${invoice.customer_mobile || 'No mobile'}</small>
                                </div>
                            </td>
                            <td class="font-semibold">₹${parseFloat(invoice.amount).toFixed(2)}</td>
                            <td>
                                <span class="status-badge ${invoice.is_sent ? 'sent' : 'not-sent'}">
                                    ${invoice.is_sent ? 'Sent' : 'Not Sent'}
                                </span>
                            </td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-info" onclick="invoicesModule.viewInvoice('${invoice.type}', ${invoice.reference_id})" title="View">
                                        👁️
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="invoicesModule.printInvoice('${invoice.type}', ${invoice.reference_id})" title="Print">
                                        🖨️
                                    </button>
                                    <button class="btn btn-sm btn-success" onclick="invoicesModule.sendInvoiceWhatsApp('${invoice.type}', ${invoice.reference_id})" title="Send WhatsApp">
                                        📱
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

    updateStats() {
        const totalInvoices = this.invoices.length;
        const salesInvoices = this.invoices.filter(inv => inv.type === 'sale').length;
        const serviceInvoices = this.invoices.filter(inv => inv.type === 'service').length;
        const totalValue = this.invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        
        document.getElementById('total-invoices').textContent = totalInvoices;
        document.getElementById('sales-invoices').textContent = salesInvoices;
        document.getElementById('service-invoices').textContent = serviceInvoices;
        document.getElementById('total-value').textContent = Utils.formatCurrency(totalValue);
    }

    viewInvoice(type, referenceId) {
        this.currentInvoice = { type, referenceId };
        
        if (type === 'sale') {
            this.loadSaleInvoice(referenceId);
        } else {
            this.loadServiceInvoice(referenceId);
        }
    }

    loadSaleInvoice(saleId) {
        app.get(`
            SELECT s.*, c.name as customer_name, c.mobile as customer_mobile, 
                   c.customer_id
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.id = ?
        `, [saleId]).then(sale => {
            if (sale) {
                this.generateSaleInvoicePreview(sale);
            }
        });
    }

    loadServiceInvoice(serviceId) {
        app.get(`
            SELECT s.*, c.name as customer_name, c.mobile as customer_mobile, 
                   c.customer_id
            FROM services s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.id = ?
        `, [serviceId]).then(service => {
            if (service) {
                this.generateServiceInvoicePreview(service);
            }
        });
    }

    generateSaleInvoicePreview(sale) {
        const invoiceHTML = `
            <div class="invoice-template">
                <div class="invoice-header">
                    <div class="company-info">
                        <h1>ZEDSON Watchcraft</h1>
                        <p>Shop A2A, Express Food Street, Semmancheri, Chennai 600119</p>
                        <p>Mobile: +91 9345667777 | GST: 33EOJPR0534DZZZ</p>
                    </div>
                    <div class="invoice-details">
                        <h2>SALES INVOICE</h2>
                        <p><strong>Invoice No:</strong> ${sale.invoice_number}</p>
                        <p><strong>Date:</strong> ${Utils.formatDate(sale.sale_date, 'DD/MM/YYYY')}</p>
                    </div>
                </div>
                
                <div class="customer-details">
                    <h3>Bill To:</h3>
                    <p><strong>${sale.customer_name}</strong></p>
                    <p>Customer ID: ${sale.customer_id}</p>
                    <p>Mobile: ${sale.customer_mobile}</p>
                </div>
                
                <div class="invoice-items">
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Items as per details</td>
                                <td>₹${parseFloat(sale.subtotal || sale.total_amount).toFixed(2)}</td>
                            </tr>
                            ${sale.discount_amount > 0 ? `
                                <tr>
                                    <td>Discount (${sale.discount_type === 'percentage' ? sale.discount_value + '%' : 'Amount'})</td>
                                    <td>-₹${parseFloat(sale.discount_amount).toFixed(2)}</td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
                
                <div class="invoice-totals">
                    <table class="totals-table">
                        <tr>
                            <td><strong>Total Amount:</strong></td>
                            <td><strong>₹${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                        </tr>
                        ${sale.advance_amount > 0 ? `
                            <tr>
                                <td>Advance Paid:</td>
                                <td>₹${parseFloat(sale.advance_amount).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Balance:</td>
                                <td>₹${parseFloat(sale.balance_amount).toFixed(2)}</td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td>Payment Mode:</td>
                            <td>${sale.payment_mode}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="invoice-footer">
                    <p><strong>Thank you for your business!</strong></p>
                    <p>This is a computer generated invoice.</p>
                </div>
            </div>
        `;
        
        document.getElementById('invoice-preview-content').innerHTML = invoiceHTML;
        document.getElementById('preview-title').textContent = `Sales Invoice - ${sale.invoice_number}`;
        document.getElementById('invoice-preview-modal').style.display = 'block';
    }

    generateServiceInvoicePreview(service) {
        const invoiceHTML = `
            <div class="invoice-template">
                <div class="invoice-header">
                    <div class="company-info">
                        <h1>ZEDSON Watchcraft</h1>
                        <p>Shop A2A, Express Food Street, Semmancheri, Chennai 600119</p>
                        <p>Mobile: +91 9345667777 | GST: 33EOJPR0534DZZZ</p>
                    </div>
                    <div class="invoice-details">
                        <h2>SERVICE INVOICE</h2>
                        <p><strong>Invoice No:</strong> ${service.invoice_number}</p>
                        <p><strong>Date:</strong> ${Utils.formatDate(service.service_date, 'DD/MM/YYYY')}</p>
                        ${service.delivery_date ? `<p><strong>Delivery:</strong> ${Utils.formatDate(service.delivery_date, 'DD/MM/YYYY')}</p>` : ''}
                    </div>
                </div>
                
                <div class="customer-details">
                    <h3>Bill To:</h3>
                    <p><strong>${service.customer_name}</strong></p>
                    <p>Customer ID: ${service.customer_id}</p>
                    <p>Mobile: ${service.customer_mobile}</p>
                </div>
                
                <div class="service-details">
                    <h3>Service Details:</h3>
                    <table class="items-table">
                        <tr>
                            <td><strong>Category:</strong></td>
                            <td>${service.category}</td>
                        </tr>
                        <tr>
                            <td><strong>Brand:</strong></td>
                            <td>${service.brand}</td>
                        </tr>
                        ${service.issue_type ? `
                            <tr>
                                <td><strong>Service Type:</strong></td>
                                <td>${service.issue_type}</td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td><strong>Particulars:</strong></td>
                            <td>${service.particulars}</td>
                        </tr>
                        ${service.warranty_period > 0 ? `
                            <tr>
                                <td><strong>Warranty:</strong></td>
                                <td>${service.warranty_period} months (Until: ${Utils.formatDate(service.warranty_expiry, 'DD/MM/YYYY')})</td>
                            </tr>
                        ` : ''}
                    </table>
                </div>
                
                <div class="invoice-totals">
                    <table class="totals-table">
                        <tr>
                            <td><strong>Service Amount:</strong></td>
                            <td><strong>₹${parseFloat(service.amount).toFixed(2)}</strong></td>
                        </tr>
                        ${service.advance_amount > 0 ? `
                            <tr>
                                <td>Advance Paid:</td>
                                <td>₹${parseFloat(service.advance_amount).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Balance:</td>
                                <td>₹${parseFloat(service.balance_amount).toFixed(2)}</td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td>Payment Mode:</td>
                            <td>${service.payment_mode}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="invoice-footer">
                    <p><strong>Thank you for choosing our service!</strong></p>
                    <p>This is a computer generated invoice.</p>
                </div>
            </div>
        `;
        
        document.getElementById('invoice-preview-content').innerHTML = invoiceHTML;
        document.getElementById('preview-title').textContent = `Service Invoice - ${service.invoice_number}`;
        document.getElementById('invoice-preview-modal').style.display = 'block';
    }

    printInvoice(type, referenceId) {
        this.viewInvoice(type, referenceId);
        setTimeout(() => {
            this.printCurrentInvoice();
        }, 500);
    }

    printCurrentInvoice() {
        const printContent = document.getElementById('invoice-preview-content').innerHTML;
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .invoice-template { max-width: 800px; margin: 0 auto; }
                        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                        .company-info h1 { margin: 0; color: #2563eb; }
                        .invoice-details h2 { margin: 0; text-align: right; }
                        .customer-details { margin: 20px 0; }
                        .items-table, .totals-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        .items-table th, .items-table td, .totals-table td { padding: 10px; border: 1px solid #ddd; }
                        .items-table th { background: #f5f5f5; }
                        .totals-table { width: 300px; margin-left: auto; }
                        .invoice-footer { text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    sendInvoiceWhatsApp(type, referenceId) {
        const invoice = this.invoices.find(inv => 
            inv.type === type && inv.reference_id === referenceId
        );
        
        if (!invoice || !invoice.customer_mobile) {
            Utils.showError('Customer mobile number not found');
            return;
        }
        
        const message = this.generateWhatsAppMessage(invoice);
        const phoneNumber = invoice.customer_mobile.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        
        // Mark as sent (optional - you can implement this in database)
        Utils.showSuccess('WhatsApp message opened. Invoice will be marked as sent after message is sent.');
    }

    generateWhatsAppMessage(invoice) {
        const customerName = invoice.customer_name || 'Valued Customer';
        const invoiceType = invoice.type === 'sale' ? 'Sales' : 'Service';
        
        return `Dear ${customerName},

Thank you for choosing ZEDSON Watchcraft! 

Your ${invoiceType} Invoice Details:
📋 Invoice: ${invoice.invoice_number}
📅 Date: ${Utils.formatDate(invoice.date, 'DD/MM/YYYY')}
💰 Amount: ₹${parseFloat(invoice.amount).toFixed(2)}

We appreciate your business and look forward to serving you again.

Best regards,
ZEDSON Watchcraft
📍 Semmancheri, Chennai
📱 +91 9345667777`;
    }

    sendWhatsApp() {
        if (this.currentInvoice) {
            this.sendInvoiceWhatsApp(this.currentInvoice.type, this.currentInvoice.referenceId);
        }
    }

    exportInvoices() {
        if (this.invoices.length === 0) {
            Utils.showError('No invoices to export');
            return;
        }
        
        const exportData = this.invoices.map(invoice => ({
            'Invoice Number': invoice.invoice_number,
            'Type': invoice.type === 'sale' ? 'Sales' : 'Service',
            'Date': Utils.formatDate(invoice.date),
            'Customer Name': invoice.customer_name || 'Unknown',
            'Customer ID': invoice.customer_id || 'N/A',
            'Mobile': invoice.customer_mobile || 'N/A',
            'Amount': parseFloat(invoice.amount).toFixed(2),
            'Status': invoice.is_sent ? 'Sent' : 'Not Sent',
            'Created Date': Utils.formatDate(invoice.created_at)
        }));
        
        Utils.exportToCSV(exportData, 'invoices');
        Utils.showSuccess('Invoices exported successfully');
    }

    cleanup() {
        console.log('Cleaning up invoices module...');
        this.currentInvoice = null;
    }
}

// Register module
window.InvoicesModule = InvoicesModule;
const invoicesModule = new InvoicesModule();
if (typeof app !== 'undefined') {
    app.registerModule('invoices', invoicesModule);
}

})();