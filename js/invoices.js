// ZEDSON WATCHCRAFT - Invoice Management Module (Phase 4 - API Integration)

/**
 * Complete Invoice Generation and Management System with API Integration
 * Updated to use backend APIs instead of local data
 */

// Local cache for invoices and offline fallback
let invoices = [];
let nextInvoiceId = 1;
let isLoading = false;
let lastSyncTime = null;

/**
 * Initialize invoice module with API integration
 */
async function initializeInvoices() {
    try {
        showLoadingState('invoices');
        await loadInvoicesFromAPI();
        renderInvoiceTable();
        lastSyncTime = new Date();
        console.log('Invoice module initialized with API integration');
    } catch (error) {
        console.error('Invoice initialization error:', error);
        // Fall back to local data if API fails
        if (invoices.length === 0) {
            loadSampleInvoices();
        }
        renderInvoiceTable();
        showAPIError('Failed to load invoices from server. Using offline data.');
    } finally {
        hideLoadingState('invoices');
    }
}

/**
 * Load invoices from API with caching
 */
async function loadInvoicesFromAPI() {
    try {
        const response = await api.invoices.getInvoices();
        if (response.success) {
            invoices = response.data || [];
            console.log(`Loaded ${invoices.length} invoices from API`);
            
            // Update nextInvoiceId for local operations
            if (invoices.length > 0) {
                nextInvoiceId = Math.max(...invoices.map(i => i.id || 0)) + 1;
            }
            
            // Cache the data
            cacheManager.set('invoices_data', invoices, 10 * 60 * 1000); // 10 minutes cache
            return invoices;
        } else {
            throw new Error(response.message || 'Failed to load invoices');
        }
    } catch (error) {
        console.error('Load invoices API error:', error);
        
        // Try to use cached data
        const cachedInvoices = cacheManager.get('invoices_data');
        if (cachedInvoices) {
            invoices = cachedInvoices;
            console.log('Using cached invoice data');
            return invoices;
        }
        
        throw error;
    }
}

/**
 * Refresh invoices from API
 */
async function refreshInvoices() {
    try {
        showLoadingState('refresh');
        cacheManager.clear('invoices_data'); // Clear cache to force fresh load
        await loadInvoicesFromAPI();
        renderInvoiceTable();
        lastSyncTime = new Date();
        showSuccessMessage('Invoices refreshed successfully');
    } catch (error) {
        console.error('Refresh invoices error:', error);
        showAPIError('Failed to refresh invoice data');
    } finally {
        hideLoadingState('refresh');
    }
}

/**
 * Generate Sales Invoice with API integration (triggered after sale completion)
 */
async function generateSalesInvoice(saleData) {
    try {
        const response = await api.invoices.createSalesInvoice(saleData.id);
        
        if (response.success) {
            const invoiceData = response.data;
            
            // Add to local cache
            invoices.push(invoiceData);
            renderInvoiceTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Log action
            if (window.logInvoiceAction) {
                logInvoiceAction('Generated sales invoice for sale ID: ' + saleData.id, invoiceData);
            }
            
            showSuccessMessage('Sales invoice generated successfully!');
            return invoiceData;
            
        } else {
            throw new Error(response.message || 'Failed to generate sales invoice');
        }
        
    } catch (error) {
        console.error('Generate sales invoice error:', error);
        
        // Fallback to local generation if API fails
        return generateLocalSalesInvoice(saleData);
    }
}

/**
 * Generate Service Acknowledgement with API integration (triggered when service is initiated)
 */
async function generateServiceAcknowledgement(serviceData) {
    try {
        const response = await api.invoices.createServiceAcknowledgement(serviceData.id);
        
        if (response.success) {
            const acknowledgementData = response.data;
            
            // Store acknowledgement separately (not in main invoice list for display)
            if (!window.serviceAcknowledgements) {
                window.serviceAcknowledgements = [];
            }
            window.serviceAcknowledgements.push(acknowledgementData);
            
            // Log action
            if (window.logInvoiceAction) {
                logInvoiceAction('Generated service acknowledgement for service ID: ' + serviceData.id, acknowledgementData);
            }
            
            showSuccessMessage('Service acknowledgement generated successfully!');
            return acknowledgementData;
            
        } else {
            throw new Error(response.message || 'Failed to generate service acknowledgement');
        }
        
    } catch (error) {
        console.error('Generate service acknowledgement error:', error);
        
        // Fallback to local generation if API fails
        return generateLocalServiceAcknowledgement(serviceData);
    }
}

/**
 * Generate Service Completion Invoice with API integration (triggered when service is completed)
 */
async function generateServiceCompletionInvoice(serviceData) {
    try {
        const response = await api.invoices.createServiceCompletionInvoice(serviceData.id);
        
        if (response.success) {
            const invoiceData = response.data;
            
            // Add to local cache
            invoices.push(invoiceData);
            renderInvoiceTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Log action
            if (window.logInvoiceAction) {
                logInvoiceAction('Generated service completion invoice for service ID: ' + serviceData.id, invoiceData);
            }
            
            showSuccessMessage('Service completion invoice generated successfully!');
            return invoiceData;
            
        } else {
            throw new Error(response.message || 'Failed to generate service completion invoice');
        }
        
    } catch (error) {
        console.error('Generate service completion invoice error:', error);
        
        // Fallback to local generation if API fails
        return generateLocalServiceCompletionInvoice(serviceData);
    }
}

/**
 * Fallback: Generate local sales invoice
 */
function generateLocalSalesInvoice(saleData) {
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
    if (window.updateDashboard) {
        updateDashboard();
    }
    
    Utils.showNotification('Sales invoice generated successfully! (Local mode)');
    return invoiceData;
}

/**
 * Fallback: Generate local service acknowledgement
 */
function generateLocalServiceAcknowledgement(serviceData) {
    const customer = CustomerModule.getCustomerById(serviceData.customerId);
    
    if (!customer) {
        Utils.showNotification('Customer data not found for acknowledgement generation');
        return null;
    }

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
        amount: 0,
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
        isAcknowledgement: true
    };

    if (!window.serviceAcknowledgements) {
        window.serviceAcknowledgements = [];
    }
    window.serviceAcknowledgements.push(acknowledgementData);
    
    Utils.showNotification('Service acknowledgement generated successfully! (Local mode)');
    return acknowledgementData;
}

/**
 * Fallback: Generate local service completion invoice
 */
function generateLocalServiceCompletionInvoice(serviceData) {
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
    if (window.updateDashboard) {
        updateDashboard();
    }
    
    Utils.showNotification('Service completion invoice generated successfully! (Local mode)');
    return invoiceData;
}

/**
 * View Invoice (Read-only) with API integration
 */
async function viewInvoice(invoiceId) {
    try {
        // Get detailed invoice data from API
        const response = await api.invoices.getInvoice(invoiceId);
        
        let invoice;
        if (response.success) {
            invoice = response.data;
        } else {
            // Fallback to local cache
            invoice = invoices.find(inv => inv.id === invoiceId);
        }
        
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
        
        // Log action
        if (window.logAction) {
            logAction('Viewed invoice: ' + invoice.invoiceNo);
        }
        
    } catch (error) {
        console.error('View invoice error:', error);
        Utils.showNotification('Failed to load invoice details. Please try again.');
    }
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

    // Create simple acknowledgement view using template
    let ackHTML;
    if (window.InvoiceTemplates && window.InvoiceTemplates.createServiceAcknowledgementHTML) {
        ackHTML = window.InvoiceTemplates.createServiceAcknowledgementHTML(acknowledgement);
    } else {
        ackHTML = createServiceAcknowledgementHTML(acknowledgement);
    }
    
    document.getElementById('invoicePreviewContent').innerHTML = ackHTML;
    document.getElementById('invoicePreviewModal').style.display = 'block';
    
    // Log action
    if (window.logAction) {
        logAction('Viewed service acknowledgement for service ID: ' + serviceId);
    }
}

/**
 * Create Service Acknowledgement HTML (fallback template)
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
                <p style="margin: 5px 0; font-size: 0.85em;">Contact: +91-9345667717 | 9500661769 | Email: zedsonwatchcraft@gmail.com</p>
            </div>
        </div>
    `;
}

/**
 * Update invoice status with API integration
 */
async function updateInvoiceStatus(invoiceId, newStatus, reason = '') {
    try {
        const response = await api.invoices.updateInvoiceStatus(invoiceId, newStatus, reason);
        
        if (response.success) {
            // Update local cache
            const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);
            if (invoiceIndex !== -1) {
                invoices[invoiceIndex] = response.data;
            }
            
            renderInvoiceTable();
            Utils.showNotification(`Invoice status updated to: ${newStatus}`);
            
            // Log action
            if (window.logInvoiceAction) {
                logInvoiceAction(`Updated invoice ${invoiceId} status to ${newStatus}`, response.data);
            }
            
        } else {
            throw new Error(response.message || 'Failed to update invoice status');
        }
        
    } catch (error) {
        console.error('Update invoice status error:', error);
        Utils.showNotification(error.message || 'Failed to update invoice status. Please try again.');
    }
}

/**
 * Delete invoice with API integration
 */
async function deleteInvoice(invoiceId, reason = '') {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        Utils.showNotification('Invoice not found.');
        return;
    }

    if (confirm(`Are you sure you want to delete invoice "${invoice.invoiceNo}"?`)) {
        try {
            showLoadingState('delete');
            
            const response = await api.invoices.deleteInvoice(invoiceId, reason);
            
            if (response.success) {
                // Log action
                if (window.logInvoiceAction) {
                    logInvoiceAction('Deleted invoice: ' + invoice.invoiceNo, invoice);
                }
                
                // Remove from local cache
                invoices = invoices.filter(inv => inv.id !== invoiceId);
                
                renderInvoiceTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
                Utils.showNotification('Invoice deleted successfully!');
                
            } else {
                throw new Error(response.message || 'Failed to delete invoice');
            }
            
        } catch (error) {
            console.error('Delete invoice error:', error);
            Utils.showNotification(error.message || 'Failed to delete invoice. Please try again.');
        } finally {
            hideLoadingState('delete');
        }
    }
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
 * Search Invoices with real-time filtering
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
 * Get Invoice Statistics with API integration (excludes Service Acknowledgements)
 */
async function getInvoiceStats() {
    try {
        // Try to get fresh stats from API
        const response = await api.invoices.getInvoiceStats();
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get invoice stats API error:', error);
    }
    
    // Fallback to local calculation
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
 * Export invoices data
 */
async function exportInvoices() {
    try {
        showLoadingState('export');
        
        const response = await api.invoices.exportInvoices();
        
        if (response.success) {
            // Create and download file
            const csvContent = response.data.csvData;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            Utils.showNotification('Invoices exported successfully!');
            
            if (window.logAction) {
                logAction('Exported invoice data', { recordCount: response.data.recordCount });
            }
            
        } else {
            throw new Error(response.message || 'Export failed');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        Utils.showNotification('Failed to export invoices. Please try again.');
    } finally {
        hideLoadingState('export');
    }
}

/**
 * Render Invoice Table with API data and loading states (excludes Service Acknowledgements)
 */
function renderInvoiceTable() {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) {
        console.error('Invoice table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Show loading state if currently loading
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading invoices...</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Filter out Service Acknowledgements and sort by date (newest first)
    const displayInvoices = invoices
        .filter(inv => inv.type !== 'Service Acknowledgement')
        .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
    
    if (displayInvoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #999; padding: 40px;">
                    <div style="margin-bottom: 10px;">📄</div>
                    <h3 style="margin: 10px 0;">No invoices generated yet</h3>
                    <p>Invoices will appear here when you create sales or complete services</p>
                    <button class="btn" onclick="InvoiceModule.refreshInvoices()" style="margin-top: 10px;">
                        Refresh Invoices
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    displayInvoices.forEach((invoice, index) => {
        const row = document.createElement('tr');
        
        // Add sync indicator if item is recently updated
        const isRecentlyUpdated = invoice.updatedAt && 
            (new Date() - new Date(invoice.updatedAt)) < 10000; // 10 seconds
        const syncIndicator = isRecentlyUpdated ? 
            '<span style="color: #28a745;">●</span> ' : '';
        
        let details = '';
        if (invoice.type === 'Sales') {
            details = `${invoice.watchName || 'Unknown Item'} (${invoice.watchCode || 'N/A'})`;
        } else {
            details = `${invoice.watchName || 'Unknown Watch'} - ${invoice.brand || ''} ${invoice.model || ''}`;
        }
        
        const statusClass = invoice.status === 'generated' ? 'completed' : 
                           invoice.status === 'sent' ? 'in-progress' : 
                           invoice.status === 'paid' ? 'available' : 'pending';
        
        // Get customer mobile number
        const customer = window.CustomerModule ? CustomerModule.getCustomerById(invoice.customerId) : null;
        const customerMobile = customer ? customer.phone : invoice.customerPhone || 'N/A';
        
        // Format date safely
        const invoiceDate = invoice.invoiceDate || invoice.date || invoice.createdAt;
        const formattedDate = invoiceDate ? Utils.formatDate(new Date(invoiceDate)) : 'N/A';
        
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>
                <strong>${Utils.sanitizeHtml(invoice.invoiceNo || invoice.invoiceNumber || 'N/A')}</strong>
                ${syncIndicator}
            </td>
            <td><span class="status ${invoice.type.toLowerCase().replace(' ', '-')}">${Utils.sanitizeHtml(invoice.type)}</span></td>
            <td>${formattedDate}</td>
            <td class="customer-info">
                <div class="customer-name">${Utils.sanitizeHtml(invoice.customerName || 'Unknown')}</div>
                <div class="customer-mobile">${Utils.sanitizeHtml(customerMobile)}</div>
            </td>
            <td>${Utils.sanitizeHtml(details)}</td>
            <td>${invoice.amount > 0 ? Utils.formatCurrency(invoice.amount) : '-'}</td>
            <td><span class="status ${statusClass}">${Utils.sanitizeHtml(invoice.status || 'generated')}</span></td>
            <td>
                <button class="btn btn-sm" onclick="viewInvoice(${invoice.id})" title="View Invoice">View</button>
                ${invoice.status !== 'paid' ? `
                    <button class="btn btn-sm" onclick="InvoiceModule.updateInvoiceStatus(${invoice.id}, 'paid')" title="Mark as Paid">Mark Paid</button>
                ` : ''}
                <button class="btn btn-sm btn-danger" onclick="InvoiceModule.deleteInvoice(${invoice.id})" title="Delete Invoice">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Invoice table rendered successfully with API data');
    
    // Update sync status
    updateSyncStatus();
}

/**
 * Update sync status display
 */
function updateSyncStatus() {
    const syncStatus = document.getElementById('invoiceSyncStatus');
    if (syncStatus && lastSyncTime) {
        const timeAgo = getTimeAgo(lastSyncTime);
        syncStatus.textContent = `Last synced: ${timeAgo}`;
        syncStatus.style.color = (new Date() - lastSyncTime) > 300000 ? '#dc3545' : '#28a745'; // Red if >5 min
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Load sample invoices for offline fallback
 */
function loadSampleInvoices() {
    invoices = [
        {
            id: 1,
            invoiceNo: 'SI-123456',
            type: 'Sales',
            customerId: 1,
            customerName: 'John Doe',
            customerPhone: '+91-9876543210',
            watchName: 'Rolex Submariner',
            watchCode: 'ROL001',
            amount: 850000,
            status: 'generated',
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z'
        },
        {
            id: 2,
            invoiceNo: 'SVC-789012',
            type: 'Service Completion',
            customerId: 2,
            customerName: 'Jane Smith',
            customerPhone: '+91-9876543211',
            watchName: 'Omega Speedmaster',
            brand: 'Omega',
            model: 'Speedmaster',
            amount: 3500,
            status: 'generated',
            date: '2024-01-10',
            createdAt: '2024-01-10T14:30:00Z'
        }
    ];
    nextInvoiceId = 3;
    console.log('Loaded sample invoices for offline mode');
}

/**
 * Loading state management
 */
function showLoadingState(context) {
    isLoading = true;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'block';
    }
    
    // Show loading in table if it's the main load
    if (context === 'invoices') {
        renderInvoiceTable();
    }
}

function hideLoadingState(context) {
    isLoading = false;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Show API error with retry option
 */
function showAPIError(message) {
    Utils.showNotification(message + ' You can continue working offline.');
    
    // Log the error for debugging
    if (window.logAction) {
        logAction('API Error in Invoices: ' + message, {}, 'error');
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    Utils.showNotification(message);
    
    if (window.logAction) {
        logAction('Invoice Success: ' + message);
    }
}

/**
 * Sync with server - called periodically
 */
async function syncWithServer() {
    try {
        await loadInvoicesFromAPI();
        renderInvoiceTable();
        console.log('Invoices synced with server');
    } catch (error) {
        console.error('Sync error:', error);
        // Don't show error to user for background sync failures
    }
}

/**
 * Setup automatic sync
 */
function setupAutoSync() {
    // Sync every 5 minutes
    setInterval(syncWithServer, 5 * 60 * 1000);
    
    // Update sync status every 30 seconds
    setInterval(updateSyncStatus, 30 * 1000);
    
    // Show sync status initially
    setTimeout(() => {
        const syncStatus = document.getElementById('invoiceSyncStatus');
        if (syncStatus) {
            syncStatus.style.display = 'block';
            updateSyncStatus();
        }
    }, 2000);
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupAutoSync();
        if (window.InvoiceModule) {
            InvoiceModule.initializeInvoices();
        }
    }, 100);
});

// Export functions for global use
window.InvoiceModule = {
    // Core functions
    initializeInvoices,
    loadInvoicesFromAPI,
    refreshInvoices,
    
    // Invoice generation functions
    generateSalesInvoice,
    generateServiceAcknowledgement,
    generateServiceCompletionInvoice,
    
    // Viewing functions
    viewInvoice,
    viewServiceAcknowledgement,
    printInvoice,
    
    // Management functions
    updateInvoiceStatus,
    deleteInvoice,
    searchInvoices,
    filterInvoicesByType,
    exportInvoices,
    syncWithServer,
    
    // Data functions
    getInvoiceStats,
    getInvoicesForTransaction,
    renderInvoiceTable,
    
    // Data access for other modules
    invoices
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