const { allQuery, getQuery, runQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Invoices {
    constructor() {
        this.invoices = [];
        this.filteredInvoices = [];
        this.searchTerm = '';
        this.sortField = 'created_at';
        this.sortDirection = 'desc';
        this.currentInvoice = null;
    }

    async render() {
        return `
            <div class="invoices-container">
                <!-- Summary Cards -->
                <div class="invoice-summary">
                    <div class="summary-card">
                        <div class="summary-value" id="total-invoices">0</div>
                        <div class="summary-label">Total Invoices</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="sales-invoices">0</div>
                        <div class="summary-label">Sales Invoices</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="service-invoices">0</div>
                        <div class="summary-label">Service Invoices</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="total-revenue">₹0.00</div>
                        <div class="summary-label">Total Revenue</div>
                    </div>
                </div>

                <!-- Search and Filter Bar -->
                <div class="search-filter-bar">
                    <div class="search-box">
                        <input type="text" id="invoice-search" placeholder="Search invoices..." 
                               oninput="invoices.handleSearch(this.value)">
                    </div>
                    <div class="filter-group">
                        <select id="invoice-type-filter" onchange="invoices.applyFilters()">
                            <option value="">All Types</option>
                            <option value="sale">Sales</option>
                            <option value="service">Service</option>
                        </select>
                        <input type="date" id="date-from" onchange="invoices.applyFilters()" title="From Date">
                        <input type="date" id="date-to" onchange="invoices.applyFilters()" title="To Date">
                        <select id="sort-field" onchange="invoices.handleSort()">
                            <option value="created_at">Sort by Date</option>
                            <option value="invoice_number">Sort by Invoice #</option>
                            <option value="customer_name">Sort by Customer</option>
                            <option value="total_amount">Sort by Amount</option>
                        </select>
                        <select id="sort-direction" onchange="invoices.handleSort()">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                </div>

                <!-- Invoices List -->
                <div class="table-container">
                    <table class="table" id="invoices-table">
                        <thead>
                            <tr>
                                <th onclick="invoices.sortBy('created_at')">S.No</th>
                                <th onclick="invoices.sortBy('invoice_number')">Invoice Number</th>
                                <th onclick="invoices.sortBy('invoice_type')">Type</th>
                                <th onclick="invoices.sortBy('customer_name')">Customer</th>
                                <th onclick="invoices.sortBy('created_at')">Date</th>
                                <th onclick="invoices.sortBy('total_amount')">Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="invoices-tbody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading invoices...</div>
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
            await this.loadInvoices();
            this.updateInvoicesTable();
            this.updateSummaryCards();
        } catch (error) {
            console.error('Invoices module initialization error:', error);
            window.app.showMessage('Failed to load invoices', 'error');
        }
    }

    async loadInvoices() {
        try {
            // Load sales invoices
            const salesInvoices = await allQuery(`
                SELECT 
                    s.invoice_number,
                    'sale' as invoice_type,
                    s.total_amount,
                    s.sale_date as invoice_date,
                    s.created_at,
                    c.name as customer_name,
                    c.mobile_number,
                    c.customer_id,
                    s.payment_mode,
                    s.id as source_id,
                    s.discount_amount,
                    s.advance_amount,
                    s.balance_amount
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.invoice_number IS NOT NULL
                ORDER BY s.created_at DESC
            `);

            // Load service invoices
            const serviceInvoices = await allQuery(`
                SELECT 
                    s.invoice_number,
                    'service' as invoice_type,
                    s.total_amount,
                    s.service_date as invoice_date,
                    s.created_at,
                    c.name as customer_name,
                    c.mobile_number,
                    c.customer_id,
                    s.payment_mode,
                    s.id as source_id,
                    s.advance_amount,
                    s.balance_amount,
                    s.service_type,
                    s.brand,
                    s.issue_type,
                    s.particulars,
                    s.warranty_period
                FROM services s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.invoice_number IS NOT NULL
                ORDER BY s.created_at DESC
            `);

            // Combine and sort all invoices
            this.invoices = [...salesInvoices, ...serviceInvoices]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            this.filteredInvoices = [...this.invoices];
        } catch (error) {
            console.error('Error loading invoices:', error);
            this.invoices = [];
            this.filteredInvoices = [];
            throw error;
        }
    }

    updateInvoicesTable() {
        const tbody = document.getElementById('invoices-tbody');
        if (!tbody) return;

        if (this.filteredInvoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-4">
                        ${this.searchTerm ? 'No invoices found matching your search' : 'No invoices found'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.filteredInvoices.forEach((invoice, index) => {
            const typeClass = invoice.invoice_type === 'sale' ? 'type-sale' : 'type-service';
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${invoice.invoice_number}</strong></td>
                    <td><span class="invoice-type ${typeClass}">${Utils.capitalize(invoice.invoice_type)}</span></td>
                    <td>
                        <div><strong>${invoice.customer_name || 'Unknown'}</strong></div>
                        <small>${invoice.mobile_number || ''}</small>
                    </td>
                    <td>${Utils.formatDate(invoice.invoice_date)}</td>
                    <td>${Utils.formatCurrency(invoice.total_amount)}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="invoices.viewInvoice('${invoice.invoice_number}', '${invoice.invoice_type}')" title="View Invoice">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="invoices.printInvoice('${invoice.invoice_number}', '${invoice.invoice_type}')" title="Print Invoice">
                            🖨️
                        </button>
                        <button class="btn btn-sm btn-success" onclick="invoices.sendWhatsApp('${invoice.invoice_number}', '${invoice.invoice_type}')" title="Send WhatsApp">
                            📱
                        </button>
                        <button class="btn btn-sm btn-info" onclick="invoices.downloadPDF('${invoice.invoice_number}', '${invoice.invoice_type}')" title="Download PDF">
                            📄
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    updateSummaryCards() {
        const totalInvoices = this.invoices.length;
        const salesInvoices = this.invoices.filter(inv => inv.invoice_type === 'sale').length;
        const serviceInvoices = this.invoices.filter(inv => inv.invoice_type === 'service').length;
        const totalRevenue = this.invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

        document.getElementById('total-invoices').textContent = totalInvoices;
        document.getElementById('sales-invoices').textContent = salesInvoices;
        document.getElementById('service-invoices').textContent = serviceInvoices;
        document.getElementById('total-revenue').textContent = Utils.formatCurrency(totalRevenue);
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
        const typeFilter = document.getElementById('invoice-type-filter')?.value || '';
        const dateFrom = document.getElementById('date-from')?.value;
        const dateTo = document.getElementById('date-to')?.value;
        
        // Apply filters
        this.filteredInvoices = this.invoices.filter(invoice => {
            // Search filter
            if (this.searchTerm) {
                const searchableText = `${invoice.invoice_number} ${invoice.customer_name || ''} ${invoice.mobile_number || ''}`.toLowerCase();
                if (!searchableText.includes(this.searchTerm)) {
                    return false;
                }
            }
            
            // Type filter
            if (typeFilter && invoice.invoice_type !== typeFilter) {
                return false;
            }
            
            // Date filters
            const invoiceDate = new Date(invoice.invoice_date).toISOString().split('T')[0];
            if (dateFrom && invoiceDate < dateFrom) return false;
            if (dateTo && invoiceDate > dateTo) return false;
            
            return true;
        });

        // Apply sorting
        this.filteredInvoices.sort((a, b) => {
            let aVal = a[this.sortField];
            let bVal = b[this.sortField];

            if (this.sortField === 'created_at' || this.sortField === 'invoice_date') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (this.sortField === 'total_amount') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (typeof aVal === 'string') {
                aVal = (aVal || '').toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (this.sortDirection === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });

        this.updateInvoicesTable();
    }

    // This method will be continued in part 2
    async viewInvoice(invoiceNumber, invoiceType) {
        try {
            const invoiceData = await this.getInvoiceData(invoiceNumber, invoiceType);
            if (!invoiceData) {
                window.app.showMessage('Invoice not found', 'error');
                return;
            }

            const invoiceHtml = this.generateInvoiceHTML(invoiceData, invoiceType);
            
            window.app.showModal(`Invoice: ${invoiceNumber}`, invoiceHtml, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-primary" onclick="invoices.printInvoice('${invoiceNumber}', '${invoiceType}')">Print</button>
                <button class="btn btn-success" onclick="invoices.sendWhatsApp('${invoiceNumber}', '${invoiceType}')">Send WhatsApp</button>
            `, 'large-modal');

        } catch (error) {
            console.error('Error viewing invoice:', error);
            window.app.showMessage('Failed to load invoice', 'error');
        }
    }
}
// Part 2: Data retrieval and invoice generation methods

    async getInvoiceData(invoiceNumber, invoiceType) {
        try {
            if (invoiceType === 'sale') {
                // Get sale data with customer information
                const sale = await getQuery(`
                    SELECT s.*, c.name as customer_name, c.mobile_number, c.customer_id
                    FROM sales s
                    LEFT JOIN customers c ON s.customer_id = c.customer_id
                    WHERE s.invoice_number = ?
                `, [invoiceNumber]);

                if (!sale) return null;

                // Get sale items with inventory details
                const items = await allQuery(`
                    SELECT si.*, i.code, i.particulars, i.category, i.brand
                    FROM sale_items si
                    LEFT JOIN inventory i ON si.inventory_id = i.id
                    WHERE si.sale_id = ?
                    ORDER BY si.id
                `, [sale.id]);

                return { 
                    ...sale, 
                    items: items || [], 
                    type: 'sale',
                    subtotal: items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0)
                };

            } else if (invoiceType === 'service') {
                // Get service data with customer information
                const service = await getQuery(`
                    SELECT s.*, c.name as customer_name, c.mobile_number, c.customer_id
                    FROM services s
                    LEFT JOIN customers c ON s.customer_id = c.customer_id
                    WHERE s.invoice_number = ?
                `, [invoiceNumber]);

                if (!service) return null;

                return { 
                    ...service, 
                    type: 'service' 
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting invoice data:', error);
            return null;
        }
    }

    generateInvoiceHTML(data, type) {
        const isService = type === 'service';
        const date = Utils.formatDate(isService ? data.service_date : data.sale_date);
        
        // Company header
        let html = `
            <div class="invoice-document" id="invoice-content">
                <!-- Invoice Header -->
                <div class="invoice-header">
                    <div class="company-info">
                        <h1>ZEDSON Watchcraft</h1>
                        <p>Shop A2A, Express Food Street, Semmancheri, Chennai 600119</p>
                        <p>Mobile: +91 9345667777 | GST: 33EOJPR0534DZZZ</p>
                    </div>
                    <div class="invoice-meta">
                        <h2>INVOICE</h2>
                        <p><strong>Invoice #:</strong> ${data.invoice_number}</p>
                        <p><strong>Date:</strong> ${date}</p>
                        <p><strong>Type:</strong> ${isService ? 'Service' : 'Sales'}</p>
                    </div>
                </div>

                <!-- Customer Information -->
                <div class="customer-section">
                    <h3>Bill To:</h3>
                    <div class="customer-details">
                        <p><strong>${data.customer_name}</strong></p>
                        <p>Customer ID: ${data.customer_id}</p>
                        <p>Mobile: ${data.mobile_number}</p>
                    </div>
                </div>
        `;

        if (isService) {
            // Service Invoice Details
            html += `
                <div class="service-details">
                    <h3>Service Details:</h3>
                    <div class="service-info">
                        <div class="info-row">
                            <span>Service Type:</span>
                            <span>${Utils.capitalize(data.service_type)} Service</span>
                        </div>
                        ${data.brand ? `
                        <div class="info-row">
                            <span>Brand:</span>
                            <span>${data.brand}</span>
                        </div>` : ''}
                        ${data.category ? `
                        <div class="info-row">
                            <span>Category:</span>
                            <span>${data.category}</span>
                        </div>` : ''}
                        ${data.issue_type ? `
                        <div class="info-row">
                            <span>Issue Type:</span>
                            <span>${data.issue_type}</span>
                        </div>` : ''}
                        ${data.particulars ? `
                        <div class="info-row">
                            <span>Work Done:</span>
                            <span>${data.particulars}</span>
                        </div>` : ''}
                        ${data.warranty_period > 0 ? `
                        <div class="info-row">
                            <span>Warranty:</span>
                            <span>${data.warranty_period} months (Valid till ${Utils.formatDate(data.warranty_expiry_date)})</span>
                        </div>` : ''}
                        ${data.delivery_date ? `
                        <div class="info-row">
                            <span>Delivery Date:</span>
                            <span>${Utils.formatDate(data.delivery_date)}</span>
                        </div>` : ''}
                    </div>
                </div>
            `;
        } else {
            // Sales Invoice - Items Table
            html += `
                <div class="items-section">
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th width="8%">S.No</th>
                                <th width="15%">Code</th>
                                <th width="35%">Item Description</th>
                                <th width="10%">Qty</th>
                                <th width="16%">Rate</th>
                                <th width="16%">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.items && data.items.length > 0) {
                data.items.forEach((item, index) => {
                    const description = item.particulars || `${item.brand ? item.brand + ' ' : ''}${item.category}`;
                    html += `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td><strong>${item.code}</strong></td>
                            <td>${description}</td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">${Utils.formatCurrency(item.unit_price)}</td>
                            <td class="text-right"><strong>${Utils.formatCurrency(item.total_price)}</strong></td>
                        </tr>
                    `;
                });

                // Add empty rows if needed for better formatting
                const emptyRows = Math.max(0, 5 - data.items.length);
                for (let i = 0; i < emptyRows; i++) {
                    html += `
                        <tr class="empty-row">
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                        </tr>
                    `;
                }
            } else {
                html += `
                    <tr>
                        <td colspan="6" class="text-center">No items found</td>
                    </tr>
                `;
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Amount Summary Section
        const subtotal = isService ? data.total_amount : (data.subtotal || data.total_amount);
        const discount = data.discount_amount || 0;
        const advance = data.advance_amount || 0;
        const balance = data.balance_amount || 0;

        html += `
            <div class="amount-summary">
                <div class="summary-table">
                    ${!isService && discount > 0 ? `
                    <div class="amount-row">
                        <span>Subtotal:</span>
                        <span>${Utils.formatCurrency(subtotal + discount)}</span>
                    </div>
                    <div class="amount-row">
                        <span>Discount:</span>
                        <span>-${Utils.formatCurrency(discount)}</span>
                    </div>` : ''}
                    <div class="amount-row total-row">
                        <span><strong>Total Amount:</strong></span>
                        <span><strong>${Utils.formatCurrency(data.total_amount)}</strong></span>
                    </div>
                    ${advance > 0 ? `
                    <div class="amount-row">
                        <span>Advance Paid:</span>
                        <span>${Utils.formatCurrency(advance)}</span>
                    </div>` : ''}
                    ${balance > 0 ? `
                    <div class="amount-row balance-row">
                        <span><strong>Balance Due:</strong></span>
                        <span><strong>${Utils.formatCurrency(balance)}</strong></span>
                    </div>` : ''}
                    <div class="amount-row">
                        <span>Payment Mode:</span>
                        <span>${data.payment_mode}</span>
                    </div>
                </div>
            </div>
        `;

        // Amount in Words
        html += `
            <div class="amount-words">
                <strong>Amount in Words:</strong> ${this.numberToWords(data.total_amount)} Only
            </div>
        `;

        // Footer with Terms and Signature
        html += `
            <div class="invoice-footer">
                <div class="terms-section">
                    <h4>Terms & Conditions:</h4>
                    <ul>
                        <li>All sales are final unless defective within warranty period</li>
                        <li>Warranty terms apply as specified above</li>
                        <li>Service charges are non-refundable once work is completed</li>
                        <li>Please retain this invoice for warranty claims and service records</li>
                        <li>Goods once sold will not be taken back or exchanged</li>
                    </ul>
                </div>
                <div class="signature-section">
                    <div class="customer-signature">
                        <p>Customer Signature</p>
                        <div class="signature-line"></div>
                    </div>
                    <div class="company-signature">
                        <p>Authorized Signature</p>
                        <div class="signature-line"></div>
                        <p><strong>ZEDSON Watchcraft</strong></p>
                    </div>
                </div>
            </div>

            <!-- Thank you note -->
            <div class="thank-you">
                <p><strong>Thank you for your business!</strong></p>
                <p>Visit us again for all your timepiece needs</p>
            </div>
        </div>
        `;

        return html;
    }

    // Convert number to words for invoice
    numberToWords(amount) {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        const convertHundreds = (num) => {
            let result = '';
            if (num > 99) {
                result += ones[Math.floor(num / 100)] + ' Hundred ';
                num %= 100;
            }
            if (num > 19) {
                result += tens[Math.floor(num / 10)] + ' ';
                num %= 10;
            } else if (num > 9) {
                result += teens[num - 10] + ' ';
                return result;
            }
            if (num > 0) {
                result += ones[num] + ' ';
            }
            return result;
        };

        const rupees = Math.floor(amount);
        const paise = Math.round((amount - rupees) * 100);
        
        if (rupees === 0 && paise === 0) return 'Zero';
        
        let result = '';
        
        if (rupees > 0) {
            if (rupees >= 10000000) { // Crore
                result += convertHundreds(Math.floor(rupees / 10000000)) + 'Crore ';
                rupees %= 10000000;
            }
            if (rupees >= 100000) { // Lakh
                result += convertHundreds(Math.floor(rupees / 100000)) + 'Lakh ';
                rupees %= 100000;
            }
            if (rupees >= 1000) { // Thousand
                result += convertHundreds(Math.floor(rupees / 1000)) + 'Thousand ';
                rupees %= 1000;
            }
            if (rupees > 0) {
                result += convertHundreds(rupees);
            }
            result += 'Rupees ';
        }
        
        if (paise > 0) {
            result += convertHundreds(paise) + 'Paise ';
        }
        
        return result.trim();
    }
}
// Part 3: Print, WhatsApp, and Download methods

    async printInvoice(invoiceNumber, invoiceType) {
        try {
            const invoiceData = await this.getInvoiceData(invoiceNumber, invoiceType);
            if (!invoiceData) {
                window.app.showMessage('Invoice not found', 'error');
                return;
            }

            const invoiceHtml = this.generateInvoiceHTML(invoiceData, invoiceType);
            
            // Create print window with enhanced styling
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invoice - ${invoiceNumber}</title>
                    <meta charset="UTF-8">
                    <style>
                        /* Print-specific CSS */
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: 'Arial', sans-serif; 
                            font-size: 12px; 
                            line-height: 1.4;
                            color: #000;
                            background: white;
                        }
                        .invoice-document { 
                            max-width: 21cm; 
                            margin: 0 auto; 
                            padding: 1cm;
                        }
                        .invoice-header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: flex-start; 
                            margin-bottom: 1.5cm;
                            border-bottom: 2px solid #000;
                            padding-bottom: 0.5cm;
                        }
                        .company-info h1 { 
                            font-size: 24px; 
                            font-weight: bold; 
                            color: #000; 
                            margin-bottom: 0.3cm;
                        }
                        .company-info p { 
                            font-size: 11px; 
                            margin: 0.1cm 0; 
                            color: #333; 
                        }
                        .invoice-meta { 
                            text-align: right; 
                            border: 1px solid #000;
                            padding: 0.3cm;
                        }
                        .invoice-meta h2 { 
                            font-size: 18px; 
                            margin: 0 0 0.3cm 0; 
                            color: #000; 
                        }
                        .customer-section { 
                            margin-bottom: 1cm; 
                            border: 1px solid #ccc;
                            padding: 0.5cm;
                            background: #f9f9f9;
                        }
                        .customer-section h3 { 
                            margin-bottom: 0.3cm; 
                            color: #000; 
                            font-size: 14px;
                        }
                        .invoice-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-bottom: 1cm; 
                        }
                        .invoice-table th, .invoice-table td { 
                            border: 1px solid #000; 
                            padding: 0.3cm; 
                            text-align: left; 
                            vertical-align: top;
                        }
                        .invoice-table th { 
                            background-color: #f0f0f0; 
                            font-weight: bold;
                            font-size: 11px;
                        }
                        .invoice-table td { 
                            font-size: 10px; 
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .service-details { 
                            margin-bottom: 1cm; 
                            border: 1px solid #ccc;
                            padding: 0.5cm;
                        }
                        .service-info .info-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 0.2cm; 
                            padding: 0.1cm 0;
                        }
                        .amount-summary { 
                            margin-bottom: 1cm; 
                            float: right;
                            width: 8cm;
                            border: 1px solid #000;
                        }
                        .summary-table {
                            padding: 0.3cm;
                        }
                        .amount-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 0.2cm; 
                            padding: 0.1cm 0;
                        }
                        .total-row, .balance-row { 
                            font-weight: bold;
                            border-top: 1px solid #000; 
                            padding-top: 0.2cm; 
                            margin-top: 0.2cm; 
                        }
                        .amount-words {
                            clear: both;
                            margin: 1cm 0;
                            padding: 0.3cm;
                            border: 1px solid #ccc;
                            background: #f9f9f9;
                        }
                        .invoice-footer { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-top: 2cm; 
                            page-break-inside: avoid;
                        }
                        .terms-section { 
                            flex: 1; 
                            margin-right: 1cm; 
                        }
                        .terms-section h4 {
                            font-size: 12px;
                            margin-bottom: 0.3cm;
                        }
                        .terms-section ul { 
                            margin: 0.3cm 0; 
                            padding-left: 1cm; 
                            font-size: 10px;
                        }
                        .terms-section li {
                            margin-bottom: 0.2cm;
                        }
                        .signature-section {
                            display: flex;
                            justify-content: space-between;
                            width: 6cm;
                        }
                        .customer-signature, .company-signature { 
                            text-align: center;
                            width: 2.8cm;
                        }
                        .signature-line { 
                            border-bottom: 1px solid #000; 
                            margin: 1cm 0 0.3cm 0; 
                        }
                        .thank-you {
                            text-align: center;
                            margin-top: 1cm;
                            padding: 0.3cm;
                            border-top: 1px solid #ccc;
                        }
                        .empty-row {
                            height: 0.8cm;
                        }
                        
                        @media print {
                            body { margin: 0; }
                            .invoice-document { padding: 0.5cm; }
                            .no-print { display: none !important; }
                            @page { 
                                margin: 1cm; 
                                size: A4;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${invoiceHtml}
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 1000);
                        }
                    </script>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Log the print action
            await auditLogger.logAction('INVOICE', 'PRINT', invoiceNumber, null, {
                invoice_type: invoiceType,
                customer_name: invoiceData.customer_name,
                amount: invoiceData.total_amount
            });
            
            window.app.showMessage('Invoice sent to printer', 'success');

        } catch (error) {
            console.error('Error printing invoice:', error);
            window.app.showMessage('Failed to print invoice', 'error');
        }
    }

    async sendWhatsApp(invoiceNumber, invoiceType) {
        try {
            const invoiceData = await this.getInvoiceData(invoiceNumber, invoiceType);
            if (!invoiceData) {
                window.app.showMessage('Invoice not found', 'error');
                return;
            }

            if (!invoiceData.mobile_number) {
                window.app.showMessage('Customer mobile number not found', 'error');
                return;
            }

            // Generate appropriate message based on invoice type
            let message;
            const customerName = invoiceData.customer_name;
            const amount = Utils.formatCurrency(invoiceData.total_amount);
            const date = Utils.formatDate(invoiceType === 'service' ? invoiceData.service_date : invoiceData.sale_date);

            if (invoiceType === 'service') {
                message = `🔧 *ZEDSON Watchcraft* - Service Complete!\n\n`;
                message += `Dear ${customerName},\n\n`;
                message += `Your watch service has been completed successfully!\n\n`;
                message += `📋 *Service Details:*\n`;
                message += `Invoice: ${invoiceNumber}\n`;
                message += `Service Type: ${Utils.capitalize(invoiceData.service_type)} Service\n`;
                if (invoiceData.brand) message += `Brand: ${invoiceData.brand}\n`;
                if (invoiceData.issue_type) message += `Work Done: ${invoiceData.issue_type}\n`;
                message += `Amount: ${amount}\n`;
                message += `Date: ${date}\n`;
                
                if (invoiceData.warranty_period > 0) {
                    message += `\n🛡️ *Warranty:* ${invoiceData.warranty_period} months\n`;
                    if (invoiceData.warranty_expiry_date) {
                        message += `Valid till: ${Utils.formatDate(invoiceData.warranty_expiry_date)}\n`;
                    }
                }
                
                message += `\n✨ Thank you for trusting us with your timepiece!\n`;
                message += `Your watch is ready for pickup.\n\n`;
                
            } else {
                message = `🛍️ *ZEDSON Watchcraft* - Purchase Invoice\n\n`;
                message += `Dear ${customerName},\n\n`;
                message += `Thank you for your purchase!\n\n`;
                message += `🧾 *Purchase Details:*\n`;
                message += `Invoice: ${invoiceNumber}\n`;
                message += `Total Amount: ${amount}\n`;
                message += `Date: ${date}\n`;
                
                if (invoiceData.items && invoiceData.items.length > 0) {
                    message += `Items: ${invoiceData.items.length}\n`;
                    
                    // Add item details if reasonable number
                    if (invoiceData.items.length <= 3) {
                        message += `\n📦 *Items Purchased:*\n`;
                        invoiceData.items.forEach((item, index) => {
                            const description = item.particulars || `${item.brand ? item.brand + ' ' : ''}${item.category}`;
                            message += `${index + 1}. ${description} - ${Utils.formatCurrency(item.total_price)}\n`;
                        });
                    }
                }
                
                message += `\n🎉 Thank you for choosing us for your timepiece needs!\n`;
            }

            // Add common footer
            message += `\n📞 *Contact:* +91 9345667777\n`;
            message += `📍 *Location:* Semmancheri, Chennai\n`;
            message += `\nFor any queries or support, feel free to contact us.\n`;
            message += `\n*ZEDSON Watchcraft* - _Your Time, Our Priority_ ⌚`;

            // Open WhatsApp with the message
            Utils.sendWhatsApp(invoiceData.mobile_number, message);
            
            // Log the WhatsApp action
            await auditLogger.logAction('INVOICE', 'WHATSAPP_SENT', invoiceNumber, null, {
                invoice_type: invoiceType,
                customer_name: invoiceData.customer_name,
                mobile_number: invoiceData.mobile_number,
                amount: invoiceData.total_amount
            });
            
            window.app.showMessage('WhatsApp opened with invoice details', 'success');

        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            window.app.showMessage('Failed to send WhatsApp message', 'error');
        }
    }

    async downloadPDF(invoiceNumber, invoiceType) {
        try {
            const invoiceData = await this.getInvoiceData(invoiceNumber, invoiceType);
            if (!invoiceData) {
                window.app.showMessage('Invoice not found', 'error');
                return;
            }

            const invoiceHtml = this.generateInvoiceHTML(invoiceData, invoiceType);
            
            // Create complete HTML document for download
            const fullHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <title>Invoice - ${invoiceNumber}</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        /* Complete CSS for standalone document */
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: 'Arial', sans-serif; 
                            font-size: 14px; 
                            line-height: 1.6;
                            color: #333;
                            background: white;
                            padding: 20px;
                        }
                        .invoice-document { 
                            max-width: 800px; 
                            margin: 0 auto; 
                            background: white;
                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                            padding: 30px;
                        }
                        .invoice-header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: flex-start; 
                            margin-bottom: 30px;
                            border-bottom: 3px solid #2c3e50;
                            padding-bottom: 20px;
                        }
                        .company-info h1 { 
                            font-size: 32px; 
                            font-weight: bold; 
                            color: #2c3e50; 
                            margin-bottom: 10px;
                        }
                        .company-info p { 
                            font-size: 14px; 
                            margin: 5px 0; 
                            color: #666; 
                        }
                        .invoice-meta { 
                            text-align: right;
                            background: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                        }
                        .invoice-meta h2 { 
                            font-size: 24px; 
                            margin: 0 0 15px 0; 
                            color: #2c3e50; 
                        }
                        .invoice-meta p { 
                            margin: 5px 0; 
                            font-size: 14px;
                        }
                        .customer-section { 
                            margin-bottom: 30px; 
                            background: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                            border-left: 5px solid #3498db;
                        }
                        .customer-section h3 { 
                            margin-bottom: 15px; 
                            color: #2c3e50; 
                            font-size: 18px;
                        }
                        .invoice-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-bottom: 30px; 
                            border: 1px solid #ddd;
                        }
                        .invoice-table th, .invoice-table td { 
                            border: 1px solid #ddd; 
                            padding: 12px; 
                            text-align: left; 
                        }
                        .invoice-table th { 
                            background-color: #f8f9fa; 
                            font-weight: bold;
                            color: #2c3e50;
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .service-details { 
                            margin-bottom: 30px; 
                            background: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                        }
                        .service-details h3 {
                            color: #2c3e50;
                            margin-bottom: 15px;
                        }
                        .service-info .info-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 8px; 
                            padding: 5px 0;
                            border-bottom: 1px solid #eee;
                        }
                        .amount-summary { 
                            margin-bottom: 30px; 
                            float: right;
                            width: 350px;
                            background: #f8f9fa;
                            border: 2px solid #3498db;
                            border-radius: 8px;
                        }
                        .summary-table {
                            padding: 20px;
                        }
                        .amount-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 8px; 
                            padding: 5px 0;
                        }
                        .total-row, .balance-row { 
                            font-weight: bold;
                            font-size: 16px;
                            border-top: 2px solid #2c3e50; 
                            padding-top: 10px; 
                            margin-top: 10px; 
                            color: #2c3e50;
                        }
                        .amount-words {
                            clear: both;
                            margin: 30px 0;
                            padding: 15px;
                            background: #e8f4fd;
                            border-left: 5px solid #3498db;
                            border-radius: 4px;
                        }
                        .invoice-footer { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-top: 40px; 
                            border-top: 2px solid #eee;
                            padding-top: 30px;
                        }
                        .terms-section { 
                            flex: 1; 
                            margin-right: 30px; 
                        }
                        .terms-section h4 {
                            color: #2c3e50;
                            margin-bottom: 15px;
                        }
                        .terms-section ul { 
                            margin: 15px 0; 
                            padding-left: 20px; 
                        }
                        .terms-section li {
                            margin-bottom: 8px;
                            font-size: 13px;
                        }
                        .signature-section {
                            display: flex;
                            justify-content: space-between;
                            width: 300px;
                        }
                        .customer-signature, .company-signature { 
                            text-align: center;
                            width: 140px;
                        }
                        .signature-line { 
                            border-bottom: 2px solid #333; 
                            margin: 40px 0 10px 0; 
                        }
                        .thank-you {
                            text-align: center;
                            margin-top: 30px;
                            padding: 20px;
                            background: #e8f5e8;
                            border-radius: 8px;
                            color: #2c3e50;
                        }
                        .empty-row {
                            height: 40px;
                        }
                        
                        @media print {
                            body { padding: 0; }
                            .invoice-document { 
                                box-shadow: none; 
                                padding: 20px;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${invoiceHtml}
                </body>
                </html>
            `;

            // Create and download the file
            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice_${invoiceNumber}_${invoiceData.customer_name.replace(/\s+/g, '_')}.html`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Log the download action
            await auditLogger.logAction('INVOICE', 'DOWNLOAD', invoiceNumber, null, {
                invoice_type: invoiceType,
                customer_name: invoiceData.customer_name,
                file_format: 'HTML'
            });
            
            window.app.showMessage('Invoice downloaded successfully. You can convert to PDF using browser print > Save as PDF', 'success');

        } catch (error) {
            console.error('Error downloading invoice:', error);
            window.app.showMessage('Failed to download invoice', 'error');
        }
    }

    // Navigation and utility methods
    async showInvoice(invoiceNumber) {
        // Find invoice type from loaded data
        const invoice = this.invoices.find(inv => inv.invoice_number === invoiceNumber);
        if (invoice) {
            await this.viewInvoice(invoiceNumber, invoice.invoice_type);
        } else {
            // If not found in loaded data, try to load fresh
            await this.loadInvoices();
            const freshInvoice = this.invoices.find(inv => inv.invoice_number === invoiceNumber);
            if (freshInvoice) {
                await this.viewInvoice(invoiceNumber, freshInvoice.invoice_type);
            } else {
                window.app.showMessage('Invoice not found', 'error');
            }
        }
    }

    async refresh() {
        await this.loadInvoices();
        this.updateInvoicesTable();
        this.updateSummaryCards();
    }
}

// Make invoices instance available globally for event handlers
window.invoices = null;

// Export the class
export default Invoices;

// Set up global invoices instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'invoices') {
        window.invoices = window.app.modules.invoices;
    }
});