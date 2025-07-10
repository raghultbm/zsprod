// ZEDSON WATCHCRAFT - Invoice Management Module (FIXED)

/**
 * Complete Invoice Generation and Management System - FIXED
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
        discountAmount: saleData.discountAmount || 0
    };

    invoices.push(invoiceData);
    renderInvoiceTable();
    updateDashboard();
    
    Utils.showNotification('Sales invoice generated successfully!');
    return invoiceData;
}

/**
 * FIXED: Generate Service Completion Invoice (triggered when service is completed)
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
        
        // Service specific data with all required fields
        watchName: serviceData.watchName,
        brand: serviceData.brand,
        model: serviceData.model,
        type: serviceData.type, // FIXED: Include type field
        dialColor: serviceData.dialColor,
        movementNo: serviceData.movementNo,
        gender: serviceData.gender,
        caseType: serviceData.caseType,
        strapType: serviceData.strapType,
        issue: serviceData.issue,
        workPerformed: serviceData.completionDescription || 'Service completed as requested',
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
 * Generate Service Acknowledgement Invoice (triggered when service is initiated)
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
        subType: 'Item Received',
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
        
        // Service specific data with type
        watchName: serviceData.watchName,
        brand: serviceData.brand,
        model: serviceData.model,
        type: serviceData.type, // FIXED: Include type field
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
 * FIXED: View Invoice (Read-only) - Uses templates with proper error handling
 */
function viewInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        Utils.showNotification('Invoice not found');
        return;
    }

    let invoiceHTML = '';

    try {
        if (invoice.type === 'Sales') {
            // Use sales invoice template
            if (window.InvoiceTemplates && window.InvoiceTemplates.createSalesInvoiceHTML) {
                invoiceHTML = window.InvoiceTemplates.createSalesInvoiceHTML(invoice);
            } else {
                console.error('Sales invoice template not available');
                Utils.showNotification('Sales invoice template not available');
                return;
            }
        } else if (invoice.type === 'Service Completion') {
            // Use service completion template
            if (window.InvoiceTemplates && window.InvoiceTemplates.createServiceCompletionHTML) {
                invoiceHTML = window.InvoiceTemplates.createServiceCompletionHTML(invoice);
            } else {
                console.error('Service completion template not available');
                Utils.showNotification('Service completion template not available');
                return;
            }
        } else {
            console.error('Unknown invoice type:', invoice.type);
            Utils.showNotification('Unknown invoice type');
            return;
        }

        const previewContent = document.getElementById('invoicePreviewContent');
        const previewModal = document.getElementById('invoicePreviewModal');
        
        if (!previewContent || !previewModal) {
            console.error('Invoice preview modal elements not found');
            Utils.showNotification('Invoice preview modal not found');
            return;
        }

        previewContent.innerHTML = invoiceHTML;
        previewModal.style.display = 'block';
        
        // Log action
        if (window.logAction) {
            logAction(`Viewed ${invoice.type} invoice: ${invoice.invoiceNo}`);
        }
        
    } catch (error) {
        console.error('Error generating invoice:', error);
        Utils.showNotification('Error generating invoice. Please try again.');
    }
}

/**
 * FIXED: View Service Acknowledgement (separate from invoice list)
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

    try {
        let ackHTML = '';
        
        // Use template if available
        if (window.InvoiceTemplates && window.InvoiceTemplates.createServiceAcknowledgementHTML) {
            ackHTML = window.InvoiceTemplates.createServiceAcknowledgementHTML(acknowledgement);
        } else {
            console.error('Service acknowledgement template not available');
            Utils.showNotification('Service acknowledgement template not available');
            return;
        }
        
        const previewContent = document.getElementById('invoicePreviewContent');
        const previewModal = document.getElementById('invoicePreviewModal');
        
        if (!previewContent || !previewModal) {
            console.error('Invoice preview modal elements not found');
            Utils.showNotification('Invoice preview modal not found');
            return;
        }

        previewContent.innerHTML = ackHTML;
        previewModal.style.display = 'block';
        
        // Log action
        if (window.logAction) {
            logAction(`Viewed service acknowledgement: ${acknowledgement.invoiceNo}`);
        }
        
    } catch (error) {
        console.error('Error generating acknowledgement:', error);
        Utils.showNotification('Error generating acknowledgement. Please try again.');
    }
}

/**
 * FIXED: Print Invoice - Prevents logout issue
 */
function printInvoice() {
    const printContent = document.getElementById('invoicePreviewContent');
    if (!printContent) {
        Utils.showNotification('No invoice content to print');
        return;
    }
    
    const content = printContent.innerHTML;
    
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
                ${content}
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
            try {
                printWindow.print();
            } catch (e) {
                console.log('Auto-print failed, user can print manually');
            }
        }, 250);
        
        // Log action
        if (window.logAction) {
            logAction('Printed invoice');
        }
        
    } else {
        Utils.showNotification('Please allow pop-ups for printing functionality');
        createPrintFrame(content);
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
                if (document.body.contains(printFrame)) {
                    document.body.removeChild(printFrame);
                }
            }, 1000);
        } catch (e) {
            console.error('Print error:', e);
            Utils.showNotification('Printing failed. Please try again.');
            if (document.body.contains(printFrame)) {
                document.body.removeChild(printFrame);
            }
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
    const filterValue = document.getElementById('invoiceTypeFilter')?.value;
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