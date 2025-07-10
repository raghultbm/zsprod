// ZEDSON WATCHCRAFT - Invoice Templates Module (FIXED)

/**
 * Professional Invoice Templates with Logo Integration and Contact Details
 */

/**
 * Create Sales Invoice HTML - UNCHANGED (already has proper contact details)
 */
function createSalesInvoiceHTML(invoice) {
    // Get customer mobile number from CustomerModule
    const customer = window.CustomerModule ? CustomerModule.getCustomerById(invoice.customerId) : null;
    const customerMobile = customer ? customer.phone : invoice.customerPhone || 'N/A';
    
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background: white; color: #333;">
            <!-- Header Section with Logo -->
            <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="assets/zedson-logo.png" alt="ZEDSON WATCHCRAFT" style="height: 60px; width: auto; filter: brightness(0) invert(1);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display: none;">
                            <h1 style="margin: 0; font-size: 2.5em; font-weight: bold;">ZEDSON</h1>
                            <p style="margin: 5px 0 0 0; font-size: 1.2em; color: #ffd700; font-weight: 600; letter-spacing: 2px;">WATCHCRAFT</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 1.8em; color: #ffd700;">INVOICE</h2>
                        <p style="margin: 5px 0 0 0; font-size: 1em;"># ${Utils.sanitizeHtml(invoice.invoiceNo)}</p>
                    </div>
                </div>
            </div>

            <!-- Company Info Bar -->
            <div style="background: #f8f9fa; padding: 15px; border-left: 5px solid #ffd700; margin-bottom: 20px;">
                <div style="font-size: 0.9em; color: #666;">
                    <strong>Shop A2A, No.137/2B, Express Food Street</strong><br>
                    Semmancheri, Chennai - 600119
                </div>
            </div>

            <!-- Bill To & Invoice Details -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: #1a237e; margin-bottom: 10px; border-bottom: 2px solid #ffd700; padding-bottom: 5px;">Bill To</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <strong style="font-size: 1.1em;">${Utils.sanitizeHtml(invoice.customerName)}</strong><br>
                        <span style="color: #666;">Mobile: ${Utils.sanitizeHtml(customerMobile)}</span><br>
                        <span style="color: #666;">${Utils.sanitizeHtml(invoice.customerAddress || 'Address not provided')}</span>
                    </div>
                </div>
                <div>
                    <h3 style="color: #1a237e; margin-bottom: 10px; border-bottom: 2px solid #ffd700; padding-bottom: 5px;">Invoice Details</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Invoice Date:</span>
                            <strong>${Utils.sanitizeHtml(invoice.date)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Terms:</span>
                            <strong>Due on Receipt</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Payment Method:</span>
                            <strong>${Utils.sanitizeHtml(invoice.paymentMethod)}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #1a237e; color: white;">
                        <th style="padding: 15px; text-align: left; border: 1px solid #ddd;">#</th>
                        <th style="padding: 15px; text-align: left; border: 1px solid #ddd;">Item & Description</th>
                        <th style="padding: 15px; text-align: center; border: 1px solid #ddd;">Qty</th>
                        <th style="padding: 15px; text-align: right; border: 1px solid #ddd;">Rate</th>
                        <th style="padding: 15px; text-align: right; border: 1px solid #ddd;">Discount</th>
                        <th style="padding: 15px; text-align: right; border: 1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: #f9f9f9;">
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: center;">1</td>
                        <td style="padding: 15px; border: 1px solid #ddd;">
                            <strong style="color: #1a237e;">${Utils.sanitizeHtml(invoice.watchName)}</strong><br>
                            <small style="color: #666;">Code: ${Utils.sanitizeHtml(invoice.watchCode)}</small>
                        </td>
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: center;">${invoice.quantity}</td>
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: right;">${Utils.formatCurrency(invoice.price)}</td>
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: right; color: #dc3545;">${Utils.formatCurrency(invoice.discountAmount || 0)}</td>
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: right; background: #e8f5e8; font-weight: bold; color: #2e7d32;">${Utils.formatCurrency(invoice.amount)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Summary Section -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
                <div style="width: 300px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #1a237e;">
                        <div style="display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; color: #1a237e;">
                            <span>Total:</span>
                            <span>${Utils.formatCurrency(invoice.amount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer with Contact Details -->
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #1a237e, #283593); color: white; border-radius: 0 0 10px 10px;">
                <p style="margin: 5px 0; font-size: 1.1em; font-weight: 600;">Thank you for your business!</p>
                <p style="margin: 5px 0; font-size: 0.9em;">ZEDSON WATCHCRAFT - Your trusted watch partner</p>
                <p style="margin: 5px 0; font-size: 0.85em;">Mobile: +91-9345667717 | +91-9500661769 | Email: zedsonwatchcraft@gmail.com</p>
            </div>
        </div>
    `;
}

/**
 * FIXED: Create Service Completion Invoice HTML with logo and contact details
 */
function createServiceCompletionHTML(invoice) {
    // Get customer mobile number from CustomerModule
    const customer = window.CustomerModule ? CustomerModule.getCustomerById(invoice.customerId) : null;
    const customerMobile = customer ? customer.phone : invoice.customerPhone || 'N/A';
    const customerEmail = customer ? customer.email : 'N/A';
    
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background: white; color: #333;">
            <!-- Header Section with Logo -->
            <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="assets/zedson-logo.png" alt="ZEDSON WATCHCRAFT" style="height: 60px; width: auto; filter: brightness(0) invert(1);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display: none;">
                            <h1 style="margin: 0; font-size: 2.5em; font-weight: bold;">ZEDSON</h1>
                            <p style="margin: 5px 0 0 0; font-size: 1.2em; color: #ffd700; font-weight: 600; letter-spacing: 2px;">WATCHCRAFT</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 1.8em; color: #ffd700;">SERVICE INVOICE</h2>
                        <p style="margin: 5px 0 0 0; font-size: 1em;"># ${Utils.sanitizeHtml(invoice.invoiceNo)}</p>
                    </div>
                </div>
            </div>

            <!-- Company Info Bar -->
            <div style="background: #f8f9fa; padding: 15px; border-left: 5px solid #ffd700; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; color: #666;">
                    <div>
                        <strong>Shop A2A, No.137/2B, Express Food Street</strong><br>
                        Semmancheri, Chennai - 600119
                    </div>
                    <div style="text-align: right;">
                        <strong>Service Amount</strong><br>
                        <span style="font-size: 1.5em; color: #1a237e; font-weight: bold;">${Utils.formatCurrency(invoice.amount)}</span>
                    </div>
                </div>
            </div>

            <!-- Bill To & Service Details -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: #1a237e; margin-bottom: 10px; border-bottom: 2px solid #ffd700; padding-bottom: 5px;">Bill To</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <strong style="font-size: 1.1em;">${Utils.sanitizeHtml(invoice.customerName)}</strong><br>
                        <span style="color: #666;">Mobile: ${Utils.sanitizeHtml(customerMobile)}</span><br>
                        <span style="color: #666;">Email: ${Utils.sanitizeHtml(customerEmail)}</span><br>
                        <span style="color: #666;">${Utils.sanitizeHtml(invoice.customerAddress || 'Address not provided')}</span>
                    </div>
                </div>
                <div>
                    <h3 style="color: #1a237e; margin-bottom: 10px; border-bottom: 2px solid #ffd700; padding-bottom: 5px;">Service Details</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Completion Date:</span>
                            <strong>${Utils.sanitizeHtml(invoice.completionDate || invoice.date)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Warranty:</span>
                            <strong>${invoice.warrantyPeriod} Month${invoice.warrantyPeriod > 1 ? 's' : ''}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Terms:</span>
                            <strong>Due on Receipt</strong>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Watch Details Section -->
            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e1f5fe 100%); padding: 20px; border-radius: 10px; border: 2px solid #1a237e; margin-bottom: 30px;">
                <h3 style="color: #1a237e; margin-top: 0; text-align: center; border-bottom: 2px solid #ffd700; padding-bottom: 10px;">${invoice.type ? invoice.type.toUpperCase() : 'ITEM'} SERVICE DETAILS</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="margin-bottom: 10px;"><strong style="color: #1a237e;">${invoice.type || 'Item'}:</strong> ${Utils.sanitizeHtml(invoice.watchName)}</div>
                        <div style="margin-bottom: 10px;"><strong style="color: #1a237e;">Brand:</strong> ${Utils.sanitizeHtml(invoice.brand)}</div>
                        <div><strong style="color: #1a237e;">Model:</strong> ${Utils.sanitizeHtml(invoice.model)}</div>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        ${invoice.type === 'Watch' ? `
                        <div style="margin-bottom: 10px;"><strong style="color: #1a237e;">Dial Color:</strong> ${Utils.sanitizeHtml(invoice.dialColor)}</div>
                        <div style="margin-bottom: 10px;"><strong style="color: #1a237e;">Gender:</strong> ${Utils.sanitizeHtml(invoice.gender)}</div>
                        <div><strong style="color: #1a237e;">Case:</strong> ${Utils.sanitizeHtml(invoice.caseType)}</div>
                        ` : `
                        <div style="margin-bottom: 10px;"><strong style="color: #1a237e;">Type:</strong> ${Utils.sanitizeHtml(invoice.type || 'Service Item')}</div>
                        <div style="margin-bottom: 10px;"><strong style="color: #1a237e;">Movement No:</strong> ${Utils.sanitizeHtml(invoice.movementNo || 'N/A')}</div>
                        <div><strong style="color: #1a237e;">Service Cost:</strong> ${Utils.formatCurrency(invoice.amount)}</div>
                        `}
                    </div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="margin-bottom: 10px;"><strong style="color: #1a237e;">Work Performed:</strong></div>
                    <div style="padding: 10px; background: #f8f9fa; border-left: 4px solid #28a745; border-radius: 4px;">${Utils.sanitizeHtml(invoice.workPerformed || 'Service completed as requested')}</div>
                </div>
            </div>

            <!-- Service Charges Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #1a237e; color: white;">
                        <th style="padding: 15px; text-align: left; border: 1px solid #ddd;">#</th>
                        <th style="padding: 15px; text-align: left; border: 1px solid #ddd;">Service Description</th>
                        <th style="padding: 15px; text-align: center; border: 1px solid #ddd;">Qty</th>
                        <th style="padding: 15px; text-align: right; border: 1px solid #ddd;">Rate</th>
                        <th style="padding: 15px; text-align: right; border: 1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: #f9f9f9;">
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: center;">1</td>
                        <td style="padding: 15px; border: 1px solid #ddd;">
                            <strong style="color: #1a237e;">${invoice.type || 'Item'} Service & Repair</strong><br>
                            <small style="color: #666;">${Utils.sanitizeHtml(invoice.brand)} ${Utils.sanitizeHtml(invoice.model)}</small>
                        </td>
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: center;">1</td>
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: right;">${Utils.formatCurrency(invoice.amount)}</td>
                        <td style="padding: 15px; border: 1px solid #ddd; text-align: right; background: #e8f5e8; font-weight: bold; color: #2e7d32;">${Utils.formatCurrency(invoice.amount)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Summary Section -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
                <div style="width: 300px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #1a237e;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                            <span>Sub Total:</span>
                            <span>${Utils.formatCurrency(invoice.amount)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                            <span>Tax Rate:</span>
                            <span>0.00%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; color: #1a237e;">
                            <span>Total:</span>
                            <span>${Utils.formatCurrency(invoice.amount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Warranty Information -->
            <div style="background: linear-gradient(135deg, #d4edda, #c3e6cb); padding: 20px; border-radius: 10px; border: 2px solid #155724; margin-bottom: 20px;">
                <h4 style="color: #155724; margin-top: 0; text-align: center;">WARRANTY INFORMATION</h4>
                <p style="color: #155724; margin: 10px 0; text-align: center; font-size: 1.1em;">
                    <strong>${invoice.warrantyPeriod} Month${invoice.warrantyPeriod > 1 ? 's' : ''} Warranty</strong> on service work performed
                </p>
                <p style="color: #155724; margin: 5px 0; font-size: 0.9em; text-align: center;">
                    Warranty covers the specific work performed. Normal wear and tear not included.
                </p>
            </div>

            <!-- Footer with Contact Details -->
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #1a237e, #283593); color: white; border-radius: 0 0 10px 10px;">
                <p style="margin: 5px 0; font-size: 1.1em; font-weight: 600;">Thank you for choosing our service!</p>
                <p style="margin: 5px 0; font-size: 0.9em;">ZEDSON WATCHCRAFT - Expert watch servicing</p>
                <p style="margin: 5px 0; font-size: 0.85em;">Mobile: +91-9345667717 | +91-9500661769 | Email: zedsonwatchcraft@gmail.com</p>
            </div>
        </div>
    `;
}

/**
 * FIXED: Create Service Acknowledgement HTML with logo and contact details
 */
function createServiceAcknowledgementHTML(acknowledgement) {
    // Get customer mobile number from CustomerModule
    const customer = window.CustomerModule ? CustomerModule.getCustomerById(acknowledgement.customerId) : null;
    const customerMobile = customer ? customer.phone : acknowledgement.customerPhone || 'N/A';
    const customerEmail = customer ? customer.email : 'N/A';
    
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background: white; color: #333;">
            <!-- Header Section with Logo -->
            <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="assets/zedson-logo.png" alt="ZEDSON WATCHCRAFT" style="height: 60px; width: auto; filter: brightness(0) invert(1);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display: none;">
                            <h1 style="margin: 0; font-size: 2.5em; font-weight: bold;">ZEDSON</h1>
                            <p style="margin: 5px 0 0 0; font-size: 1.2em; color: #ffd700; font-weight: 600; letter-spacing: 2px;">WATCHCRAFT</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 1.8em; color: #ffd700;">SERVICE RECEIPT</h2>
                        <p style="margin: 5px 0 0 0; font-size: 1em;"># ${Utils.sanitizeHtml(acknowledgement.invoiceNo)}</p>
                    </div>
                </div>
            </div>

            <!-- Service Receipt Content -->
            <div style="background: #f8f9fa; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #1a237e; text-align: center; margin-bottom: 20px;">${acknowledgement.type ? acknowledgement.type.toUpperCase() : 'ITEM'} RECEIVED FOR SERVICE</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h4 style="color: #1a237e;">Customer Details</h4>
                        <p><strong>Name:</strong> ${Utils.sanitizeHtml(acknowledgement.customerName)}</p>
                        <p><strong>Mobile:</strong> ${Utils.sanitizeHtml(customerMobile)}</p>
                        <p><strong>Email:</strong> ${Utils.sanitizeHtml(customerEmail)}</p>
                        <p><strong>Address:</strong> ${Utils.sanitizeHtml(acknowledgement.customerAddress || 'Address not provided')}</p>
                    </div>
                    <div>
                        <h4 style="color: #1a237e;">Receipt Details</h4>
                        <p><strong>Receipt No:</strong> ${Utils.sanitizeHtml(acknowledgement.invoiceNo)}</p>
                        <p><strong>Date:</strong> ${Utils.sanitizeHtml(acknowledgement.date)}</p>
                        <p><strong>Estimated Cost:</strong> ${Utils.formatCurrency(acknowledgement.estimatedCost)}</p>
                        <p><strong>Type:</strong> ${Utils.sanitizeHtml(acknowledgement.type || 'Service Item')}</p>
                    </div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 5px; border: 2px solid #1a237e;">
                    <h4 style="color: #1a237e; text-align: center;">${acknowledgement.type ? acknowledgement.type.toUpperCase() : 'ITEM'} DETAILS</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p><strong>${acknowledgement.type || 'Item'}:</strong> ${Utils.sanitizeHtml(acknowledgement.watchName)}</p>
                            <p><strong>Brand:</strong> ${Utils.sanitizeHtml(acknowledgement.brand)}</p>
                            <p><strong>Model:</strong> ${Utils.sanitizeHtml(acknowledgement.model)}</p>
                        </div>
                        <div>
                            ${acknowledgement.type === 'Watch' ? `
                            <p><strong>Dial Color:</strong> ${Utils.sanitizeHtml(acknowledgement.dialColor)}</p>
                            <p><strong>Movement:</strong> ${Utils.sanitizeHtml(acknowledgement.movementNo)}</p>
                            <p><strong>Gender:</strong> ${Utils.sanitizeHtml(acknowledgement.gender)}</p>
                            ` : `
                            <p><strong>Type:</strong> ${Utils.sanitizeHtml(acknowledgement.type || 'Service Item')}</p>
                            <p><strong>Movement No:</strong> ${Utils.sanitizeHtml(acknowledgement.movementNo || 'N/A')}</p>
                            <p><strong>Estimated Cost:</strong> ${Utils.formatCurrency(acknowledgement.estimatedCost)}</p>
                            `}
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
                <p style="margin-bottom: 0; color: #856404;">Please keep this receipt safe. You will need it when collecting your ${acknowledgement.type ? acknowledgement.type.toLowerCase() : 'item'}.</p>
            </div>

            <!-- Footer with Contact Details -->
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #1a237e, #283593); color: white; border-radius: 0 0 10px 10px;">
                <p style="margin: 5px 0;">Thank you for trusting us with your timepiece!</p>
                <p style="margin: 5px 0; font-size: 0.9em;">ZEDSON WATCHCRAFT - Expert watch servicing</p>
                <p style="margin: 5px 0; font-size: 0.85em;">Mobile: +91-9345667717 | +91-9500661769 | Email: zedsonwatchcraft@gmail.com</p>
            </div>
        </div>
    `;
}

// Export functions for use in invoice module
window.InvoiceTemplates = {
    createSalesInvoiceHTML,
    createServiceCompletionHTML,
    createServiceAcknowledgementHTML
};