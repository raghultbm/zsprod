// ZEDSON WATCHCRAFT - Invoice Management Module (Fixed)

/**
 * Complete Invoice Generation and Management System
 * Note: Service Acknowledgements are removed from invoice display
 */

// Invoice database
let invoices = [];
let nextInvoiceId = 1;

/**
 * Generate Sales Invoice (triggered after sale completion)
 */
function generateSalesInvoice(saleData) {
    const customer = CustomerModule.getCustomerById(saleData.customerId);
    const watch = InventoryModule.getWatchById(saleData.watchId);
    
    if (!customer || !watch) {
        Utils.showNotification('Customer or item data not found for invoice generation');
        return null;
    }

    const invoiceData = {
        id: nextInvoiceId++,
        invoiceNo: Utils.generateBillNumber('Sales'),
        type: 'Sales',
        subType: 'Sales Invoice',
        date: Utils.formatDate(new Date()),
        timestamp: Utils.getCurrentTimestamp(),
        customerId: saleData.customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address || '',
        relatedId: saleData.id,
        relatedType: 'sale',
        amount: saleData.totalAmount,
        status: 'generated',
        createdBy: AuthModule.getCurrentUser().username,
        
        // Sales specific data
        watchName: saleData.watchName,
        watchCode: saleData.watchCode,
        quantity: saleData.quantity,
        price: saleData.price,
        paymentMethod: saleData.paymentMethod,
        discount: 0
    };

    invoices.push(invoiceData);
    renderInvoiceTable();
    updateDashboard();
    
    Utils.showNotification('Sales invoice generated successfully!');
    return invoiceData;
}

/**
 * Generate Service Acknowledgement Invoice (triggered when service is initiated)
 * Note: This is for internal tracking only, not displayed in invoice list
 */
function generateServiceAcknowledgement(serviceData) {
    const customer = CustomerModule.getCustomerById(serviceData.customerId);
    
    if (!customer) {
        Utils.showNotification('Customer data not found for acknowledgement generation');
        return null;
    }

    // Create acknowledgement data for internal tracking
    const acknowledgementData = {
        id: nextInvoiceId++,
        invoiceNo: Utils.generateBillNumber('ACK'),
        type: 'Service Acknowledgement',
        subType: 'Watch Received',
        date: Utils.formatDate(new Date()),
        timestamp: Utils.getCurrentTimestamp(),
        customerId: serviceData.customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address || '',
        relatedId: serviceData.id,
        relatedType: 'service',
        amount: 0, // No amount for acknowledgement
        status: 'generated',
        createdBy: AuthModule.getCurrentUser().username,
        
        // Service specific data
        watchName: serviceData.watchName,
        brand: serviceData.brand,
        model: serviceData.model,
        dialColor: serviceData.dialColor,
        movementNo: serviceData.movementNo,
        gender: serviceData.gender,
        caseType: serviceData.caseType,
        strapType: serviceData.strapType,
        issue: serviceData.issue,
        estimatedCost: serviceData.cost,
        isAcknowledgement: true // Flag to identify acknowledgements
    };

    // Store acknowledgement separately (not in main invoice list)
    if (!window.serviceAcknowledgements) {
        window.serviceAcknowledgements = [];
    }
    window.serviceAcknowledgements.push(acknowledgementData);
    
    Utils.showNotification('Service acknowledgement generated successfully!');
    return acknowledgementData;
}

/**
 * Generate Service Completion Invoice (triggered when service is completed)
 */
function generateServiceCompletionInvoice(serviceData) {
    const customer = CustomerModule.getCustomerById(serviceData.customerId);
    
    if (!customer) {
        Utils.showNotification('Customer data not found for completion invoice generation');
        return null;
    }

    const invoiceData = {
        id: nextInvoiceId++,
        invoiceNo: Utils.generateBillNumber('SVC'),
        type: 'Service Completion',
        subType: 'Service Bill',
        date: Utils.formatDate(new Date()),
        timestamp: Utils.getCurrentTimestamp(),
        customerId: serviceData.customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address || '',
        relatedId: serviceData.id,
        relatedType: 'service',
        amount: serviceData.cost,
        status: 'generated',
        createdBy: AuthModule.getCurrentUser().username,
        
        // Service specific data
        watchName: serviceData.watchName,
        brand: serviceData.brand,
        model: serviceData.model,
        dialColor: serviceData.dialColor,
        movementNo: serviceData.movementNo,
        gender: serviceData.gender,
        caseType: serviceData.caseType,
        strapType: serviceData.strapType,
        issue: serviceData.issue,
        workPerformed: serviceData.completionDescription || '',
        warrantyPeriod: serviceData.warrantyPeriod || 0,
        completionDate: serviceData.actualDelivery || Utils.formatDate(new Date())
    };

    invoices.push(invoiceData);
    renderInvoiceTable();
    updateDashboard();
    
    Utils.showNotification('Service completion invoice generated successfully!');
    return invoiceData;
}

/**
 * View Invoice (Read-only) - Uses new templates
 */
function viewInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        Utils.showNotification('Invoice not found');
        return;
    }

    let invoiceHTML = '';

    if (invoice.type === 'Sales') {
        // Use new sales invoice template
        if (window.InvoiceTemplates && window.InvoiceTemplates.createSalesInvoiceHTML) {
            invoiceHTML = window.InvoiceTemplates.createSalesInvoiceHTML(invoice);
        } else {
            Utils.showNotification('Invoice template not available');
            return;
        }
    } else if (invoice.type === 'Service Completion') {
        // Use new service completion template
        if (window.InvoiceTemplates && window.InvoiceTemplates.createServiceCompletionHTML) {
            invoiceHTML = window.InvoiceTemplates.createServiceCompletionHTML(invoice);
        } else {
            Utils.showNotification('Invoice template not available');
            return;
        }
    }

    document.getElementById('invoicePreviewContent').innerHTML = invoiceHTML;
    document.getElementById('invoicePreviewModal').style.display = 'block';
}

/**
 * View Service Acknowledgement (separate from invoice list)
 */
function viewServiceAcknowledgement(serviceId) {
    if (!window.serviceAcknowledgements) {
        Utils.showNotification('No acknowledgement found for this service.');
        return;
    }

    const acknowledgement = window.serviceAcknowledgements.find(ack => ack.relatedId === serviceId);
    if (!acknowledgement) {
        Utils.showNotification('No acknowledgement found for this service.');
        return;
    }

    // Create simple acknowledgement view
    const ackHTML = createServiceAcknowledgementHTML(acknowledgement);
    document.getElementById('invoicePreviewContent').innerHTML = ackHTML;
    document.getElementById('invoicePreviewModal').style.display = 'block';
}

/**
 * Create Service Acknowledgement HTML (for separate viewing)
 */
function createServiceAcknowledgementHTML(acknowledgement) {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background: white; color: #333;">
            <!-- Header Section -->
            <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="margin: 0; font-size: 2.5em; font-weight: bold;">ZEDSON</h1>
                        <p style="margin: 5px 0 0 0; font-size: 1.2em; color: #ffd700; font-weight: 600; letter-spacing: 2px;">WATCHCRAFT</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 1.8em; color: #ffd700;">SERVICE RECEIPT</h2>
                        <p style="margin: 5px 0 0 0; font-size: 1em;"># ${Utils.sanitizeHtml(acknowledgement.invoiceNo)}</p>
                    </div>
                </div>
            </div>

            <!-- Service Receipt Content -->
            <div style="background: #f8f9fa; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #1a237e; text-align: center; margin-bottom: 20px;">WATCH RECEIVED FOR SERVICE</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h4 style="color: #1a237e;">Customer Details</h4>
                        <p><strong>Name:</strong> ${Utils.sanitizeHtml(acknowledgement.customerName)}</p>
                        <p><strong>Phone:</strong> ${Utils.sanitizeHtml(acknowledgement.customerPhone)}</p>
                        <p><strong>Address:</strong> ${Utils.sanitizeHtml(acknowledgement.customerAddress)}</p>
                    </div>
                    <div>
                        <h4 style="color: #1a237e;">Receipt Details</h4>
                        <p><strong>Receipt No:</strong> ${Utils.sanitizeHtml(acknowledgement.invoiceNo)}</p>
                        <p><strong>Date:</strong> ${Utils.sanitizeHtml(acknowledgement.date)}</p>
                        <p><strong>Estimated Cost:</strong> ${Utils.formatCurrency(acknowledgement.estimatedCost)}</p>
                    </div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 5px; border: 2px solid #1a237e;">
                    <h4 style="color: #1a237e; text-align: center;">WATCH DETAILS</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p><strong>Watch:</strong> ${Utils.sanitizeHtml(acknowledgement.watchName)}</p>
                            <p><strong>Dial Color:</strong> ${Utils.sanitizeHtml(acknowledgement.dialColor)}</p>
                            <p><strong>Movement:</strong> ${Utils.sanitizeHtml(acknowledgement.movementNo)}</p>
                        </div>
                        <div>
                            <p><strong>Gender:</strong> ${Utils.sanitizeHtml(acknowledgement.gender)}</p>
                            <p><strong>Case:</strong> ${Utils.sanitizeHtml(acknowledgement.caseType)}</p>
                            <p><strong>Strap:</strong> ${Utils.sanitizeHtml(acknowledgement.strapType)}</p>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <p><strong>Issue:</strong> ${Utils.sanitizeHtml(acknowledgement.issue)}</p>
                    </div>
                </div>
            </div>

            <!-- Important Note -->
            <div style="background: #fff3cd; border: 1px solid #ffd700; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #856404;">IMPORTANT</h4>
                <p style="margin-bottom: 0; color: #856404;">Please keep this receipt safe. You will need it when collecting your watch.</p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #1a237e, #283593); color: white; border-radius: 0 0 10px 10px;">
                <p style="margin: 5px 0;">Thank you for trusting us with your timepiece!</p>
                <p style="margin: 5px 0; font-size: 0.9em;">ZEDSON WATCHCRAFT - Expert watch servicing</p>
            </div>
        </div>
    `;
}

/**
 * Print Invoice - Fixed to prevent logout
 */
function printInvoice() {
    const printContent = document.getElementById('invoicePreviewContent').innerHTML;
    
    // Create a new window for printing instead of replacing body content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ZEDSON WATCHCRAFT - Invoice</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: white;
                    }
                    @media print {
                        body { margin: 0; padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print(); window.close();" style="padding: 10px 20px; background: #1a237e; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
                    <button onclick="window.close();" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Optional: Auto-print after a short delay
        setTimeout(() => {
            printWindow.print();
        }, 250);
        
    } else {
        Utils.showNotification('Please allow pop-ups for printing functionality');
        createPrintFrame(printContent);
    }
}

/**
 * Alternative print method using iframe (fallback)
 */
function createPrintFrame(content) {
    const existingFrame = document.getElementById('printFrame');
    if (existingFrame) {
        existingFrame.remove();
    }
    
    const printFrame = document.createElement('iframe');
    printFrame.id = 'printFrame';
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    
    document.body.appendChild(printFrame);
    
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZEDSON WATCHCRAFT - Invoice</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                @media print {
                    body { margin: 0; padding: 10px; }
                }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `);
    frameDoc.close();
    
    setTimeout(() => {
        try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            
            setTimeout(() => {
                document.body.removeChild(printFrame);
            }, 1000);
        } catch (e) {
            console.error('Print error:', e);
            Utils.showNotification('Printing failed. Please try again.');
            document.body.removeChild(printFrame);
        }
    }, 250);
}

/**
 * Search Invoices
 */
function searchInvoices(query) {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Filter Invoices by Type (excludes Service Acknowledgements)
 */
function filterInvoicesByType() {
    const filterValue = document.getElementById('invoiceTypeFilter').value;
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const typeCell = row.cells[2]; // Type column
        if (typeCell) {
            const typeText = typeCell.textContent.trim();
            if (!filterValue || typeText === filterValue) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

/**
 * Get Invoice Statistics (excludes Service Acknowledgements)
 */
function getInvoiceStats() {
    const totalInvoices = invoices.length;
    const salesInvoices = invoices.filter(inv => inv.type === 'Sales').length;
    const serviceCompletions = invoices.filter(inv => inv.type === 'Service Completion').length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    return {
        totalInvoices,
        salesInvoices,
        serviceCompletions,
        totalRevenue
    };
}

/**
 * Get invoices for a specific sale or service
 */
function getInvoicesForTransaction(transactionId, transactionType) {
    return invoices.filter(inv => inv.relatedId === transactionId && inv.relatedType === transactionType);
}

/**
 * Render Invoice Table (excludes Service Acknowledgements)
 */
function renderInvoiceTable() {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Filter out Service Acknowledgements and sort by date (newest first)
    const displayInvoices = invoices
        .filter(inv => inv.type !== 'Service Acknowledgement')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    displayInvoices.forEach((invoice, index) => {
        const row = document.createElement('tr');
        
        let details = '';
        if (invoice.type === 'Sales') {
            details = `${invoice.watchName} (${invoice.watchCode})`;
        } else {
            details = `${invoice.watchName} - ${invoice.brand} ${invoice.model}`;
        }
        
        const statusClass = invoice.status === 'generated' ? 'completed' : 'pending';
        
        // Get customer mobile number
        const customer = window.CustomerModule ? CustomerModule.getCustomerById(invoice.customerId) : null;
        const customerMobile = customer ? customer.phone : 'N/A';
        
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td><strong>${Utils.sanitizeHtml(invoice.invoiceNo)}</strong></td>
            <td><span class="status ${invoice.type.toLowerCase().replace(' ', '-')}">${Utils.sanitizeHtml(invoice.type)}</span></td>
            <td>${Utils.sanitizeHtml(invoice.date)}</td>
            <td class="customer-info">
                <div class="customer-name">${Utils.sanitizeHtml(invoice.customerName)}</div>
                <div class="customer-mobile">${Utils.sanitizeHtml(customerMobile)}</div>
            </td>
            <td>${Utils.sanitizeHtml(details)}</td>
            <td>${invoice.amount > 0 ? Utils.formatCurrency(invoice.amount) : '-'}</td>
            <td><span class="status ${statusClass}">${Utils.sanitizeHtml(invoice.status)}</span></td>
            <td>
                <button class="btn btn-sm" onclick="viewInvoice(${invoice.id})" title="View Invoice">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Initialize Invoice Module
 */
function initializeInvoices() {
    renderInvoiceTable();
    console.log('Invoice module initialized');
}

// Export functions for global use
window.InvoiceModule = {
    generateSalesInvoice,
    generateServiceAcknowledgement,
    generateServiceCompletionInvoice,
    viewInvoice,
    viewServiceAcknowledgement,
    printInvoice,
    searchInvoices,
    filterInvoicesByType,
    getInvoiceStats,
    getInvoicesForTransaction,
    renderInvoiceTable,
    initializeInvoices,
    invoices // For access by other modules
};

// Make functions globally available
window.viewInvoice = function(invoiceId) {
    InvoiceModule.viewInvoice(invoiceId);
};

window.printInvoice = function() {
    InvoiceModule.printInvoice();
};

window.searchInvoices = function(query) {
    InvoiceModule.searchInvoices(query);
};

window.filterInvoicesByType = function() {
    InvoiceModule.filterInvoicesByType();
};

window.viewServiceAcknowledgement = function(serviceId) {
    InvoiceModule.viewServiceAcknowledgement(serviceId);
};