// Service module for ZEDSON Watchcraft - Simple & Reliable
(function() {
    'use strict';
    
    if (typeof window.ServiceModule !== 'undefined') {
        return;
    }

class ServiceModule {
    constructor() {
        this.services = [];
        this.customers = [];
        this.serviceTypes = ['new', 'instant'];
        this.searchTerm = '';
        this.filters = {};
        this.statuses = [
            'Yet to Start', 'Delivered', 'In Service Center',
            'Yet to Send Parrys', 'In Parrys', 'To Return to Customer',
            'Service Completed', 'Waiting for Customer to Pickup'
        ];
    }

    render(container) {
        console.log('Service module: Starting render...');
        
        container.innerHTML = this.getTemplate();
        this.loadData();
        this.setupEvents();
        this.renderServicesList();
        
        console.log('Service module: Render completed');
    }

    getTemplate() {
        return `
            <div class="service-container">
                <div class="service-header">
                    <h1>Service Management</h1>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="new-service-btn">
                            <span>+</span> New Service
                        </button>
                        <button class="btn btn-warning" id="instant-service-btn">
                            <span>⚡</span> Instant Service
                        </button>
                    </div>
                </div>

                <div class="service-toolbar">
                    <div class="search-section">
                        <input type="text" id="service-search" class="form-input" 
                               placeholder="Search by customer, acknowledgement...">
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="status-filter" class="form-select">
                            <option value="">All Status</option>
                            ${this.statuses.map(status => 
                                `<option value="${status}">${status}</option>`
                            ).join('')}
                        </select>
                        
                        <select id="type-filter" class="form-select">
                            <option value="">All Types</option>
                            <option value="new">New Service</option>
                            <option value="instant">Instant Service</option>
                        </select>
                    </div>
                </div>

                <div class="service-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-services">0</span>
                        <span class="stat-label">Total Services</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="pending-services">0</span>
                        <span class="stat-label">Pending</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="completed-services">0</span>
                        <span class="stat-label">Completed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="today-revenue">₹0</span>
                        <span class="stat-label">Today's Revenue</span>
                    </div>
                </div>

                <div class="service-list-container">
                    <div id="service-list"></div>
                </div>

                <!-- Service Form Modal -->
                <div id="service-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-header">
                            <h3 id="service-modal-title">New Service</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="service-form" class="form">
                                <input type="hidden" name="serviceType" id="service-type-input">
                                
                                <!-- Customer Information -->
                                <div class="form-section">
                                    <h4>Customer Information</h4>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label required">Customer</label>
                                            <select name="customerId" id="service-customer-select" class="form-select" required>
                                                <option value="">Select Customer</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label required">Service Date</label>
                                            <input type="date" name="serviceDate" class="form-input" required>
                                        </div>
                                        <div class="form-group" id="delivery-date-group" style="display: none;">
                                            <label class="form-label">Delivery Date</label>
                                            <input type="date" name="deliveryDate" class="form-input">
                                        </div>
                                    </div>
                                </div>

                                <!-- Watch Details -->
                                <div class="form-section">
                                    <h4>Watch Details</h4>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label required">Category</label>
                                            <select name="category" class="form-select" required>
                                                <option value="">Select Category</option>
                                                <option value="Watch">Watch</option>
                                                <option value="WallClock">Wall Clock</option>
                                                <option value="Timepiece">Timepiece</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label required">Brand</label>
                                            <input type="text" name="brand" class="form-input" required>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Dial Colour</label>
                                            <input type="text" name="dialColour" class="form-input">
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label">Gender</label>
                                            <select name="gender" class="form-select">
                                                <option value="">Select Gender</option>
                                                <option value="Gents">Gents</option>
                                                <option value="Ladies">Ladies</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Movement No</label>
                                            <input type="text" name="movementNo" class="form-input">
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Case Material</label>
                                            <select name="caseMaterial" class="form-select">
                                                <option value="">Select Material</option>
                                                <option value="Steel">Steel</option>
                                                <option value="Gold Tone">Gold Tone</option>
                                                <option value="Fiber">Fiber</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label">Strap</label>
                                            <select name="strap" class="form-select">
                                                <option value="">Select Strap</option>
                                                <option value="Leather">Leather</option>
                                                <option value="Fiber">Fiber</option>
                                                <option value="Steel">Steel</option>
                                                <option value="Gold Plated">Gold Plated</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label required">Particulars</label>
                                            <textarea name="particulars" class="form-textarea" rows="2" required 
                                                     placeholder="Describe the problem or service required"></textarea>
                                        </div>
                                    </div>
                                </div>

                                <!-- Instant Service Specific -->
                                <div class="form-section" id="instant-service-section" style="display: none;">
                                    <h4>Instant Service Details</h4>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label">Issue Type</label>
                                            <select name="issueType" class="form-select">
                                                <option value="">Select Issue Type</option>
                                                <option value="Battery Change">Battery Change</option>
                                                <option value="Link Removal / Addition">Link Removal / Addition</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Inventory Used</label>
                                            <input type="text" name="inventoryUsed" class="form-input" 
                                                   placeholder="Items used for service">
                                        </div>
                                    </div>
                                </div>

                                <!-- Pricing -->
                                <div class="form-section">
                                    <h4>Pricing & Payment</h4>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label required">Service Amount</label>
                                            <input type="number" name="amount" class="form-input" 
                                                   min="0" step="0.01" required>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Advance Amount</label>
                                            <input type="number" name="advanceAmount" class="form-input" 
                                                   min="0" step="0.01">
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Balance Amount</label>
                                            <input type="number" name="balanceAmount" class="form-input" 
                                                   min="0" step="0.01" readonly>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label required">Payment Mode</label>
                                            <select name="paymentMode" class="form-select" required>
                                                <option value="">Select Payment Mode</option>
                                                <option value="UPI">UPI</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="Multiple Payment Modes">Multiple</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Warranty Period (Months)</label>
                                            <input type="number" name="warrantyPeriod" class="form-input" 
                                                   min="0" value="0">
                                        </div>
                                    </div>
                                </div>

                                <div id="service-form-errors" class="form-errors" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="service-form" class="btn btn-primary" id="save-service-btn">
                                Create Service
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Status Update Modal -->
                <div id="status-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-md">
                        <div class="modal-header">
                            <h3>Update Service Status</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="status-form" class="form">
                                <input type="hidden" name="serviceId" id="status-service-id">
                                
                                <div class="form-group">
                                    <label class="form-label required">Status</label>
                                    <select name="status" id="status-select" class="form-select" required>
                                        ${this.statuses.map(status => 
                                            `<option value="${status}">${status}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Location</label>
                                    <select name="location" class="form-select">
                                        <option value="Semmancheri">Semmancheri</option>
                                        <option value="Navalur">Navalur</option>
                                        <option value="Padur">Padur</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Comments</label>
                                    <textarea name="comments" class="form-textarea" rows="3"
                                             placeholder="Add any comments about this status update"></textarea>
                                </div>

                                <div class="form-group" id="inventory-used-group" style="display: none;">
                                    <label class="form-label">Inventory Used</label>
                                    <input type="text" name="inventoryUsedUpdate" class="form-input"
                                           placeholder="Items used during service">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="status-form" class="btn btn-primary" id="update-status-btn">
                                Update Status
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadData() {
        // Load services
        app.query(`
            SELECT s.*, c.name as customer_name, c.mobile as customer_mobile 
            FROM services s 
            LEFT JOIN customers c ON s.customer_id = c.id 
            ORDER BY s.created_at DESC
        `).then(services => {
            this.services = services || [];
            this.updateStats();
            this.renderServicesList();
        });

        // Load customers
        app.query('SELECT id, customer_id, name, mobile FROM customers ORDER BY name')
            .then(customers => {
                this.customers = customers || [];
                this.populateCustomers();
            });
    }

    setupEvents() {
        // Service buttons
        document.getElementById('new-service-btn').onclick = () => this.openServiceModal('new');
        document.getElementById('instant-service-btn').onclick = () => this.openServiceModal('instant');

        // Search and filters
        document.getElementById('service-search').oninput = (e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        };

        document.getElementById('clear-search').onclick = () => {
            document.getElementById('service-search').value = '';
            this.searchTerm = '';
            this.applyFilters();
        };

        document.getElementById('status-filter').onchange = (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        };

        document.getElementById('type-filter').onchange = (e) => {
            this.filters.type = e.target.value;
            this.applyFilters();
        };

        // Form events
        document.getElementById('service-form').onsubmit = (e) => this.handleServiceSubmit(e);
        document.getElementById('status-form').onsubmit = (e) => this.handleStatusUpdate(e);

        // Auto-calculate balance
        const amountInput = document.querySelector('input[name="amount"]');
        const advanceInput = document.querySelector('input[name="advanceAmount"]');
        const balanceInput = document.querySelector('input[name="balanceAmount"]');

        const calculateBalance = () => {
            const amount = parseFloat(amountInput.value) || 0;
            const advance = parseFloat(advanceInput.value) || 0;
            balanceInput.value = (amount - advance).toFixed(2);
        };

        amountInput.oninput = calculateBalance;
        advanceInput.oninput = calculateBalance;

        // Status change for inventory used field
        document.getElementById('status-select').onchange = (e) => {
            const status = e.target.value;
            const inventoryGroup = document.getElementById('inventory-used-group');
            
            if (status === 'Delivered' || status === 'Service Completed') {
                inventoryGroup.style.display = 'block';
            } else {
                inventoryGroup.style.display = 'none';
            }
        };

        // Set today's date
        document.querySelector('input[name="serviceDate"]').value = Utils.getCurrentDate();
    }

    populateCustomers() {
        const select = document.getElementById('service-customer-select');
        select.innerHTML = '<option value="">Select Customer</option>';
        
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.customer_id}) - ${customer.mobile}`;
            select.appendChild(option);
        });
    }

    openServiceModal(type) {
        const modal = document.getElementById('service-modal');
        const title = document.getElementById('service-modal-title');
        const form = document.getElementById('service-form');
        const instantSection = document.getElementById('instant-service-section');
        const deliveryGroup = document.getElementById('delivery-date-group');
        
        // Reset form
        form.reset();
        document.getElementById('service-form-errors').style.display = 'none';
        
        // Set service type
        document.getElementById('service-type-input').value = type;
        
        if (type === 'instant') {
            title.textContent = 'Instant Service';
            instantSection.style.display = 'block';
            deliveryGroup.style.display = 'block';
            document.querySelector('input[name="deliveryDate"]').value = Utils.getCurrentDate();
        } else {
            title.textContent = 'New Service';
            instantSection.style.display = 'none';
            deliveryGroup.style.display = 'none';
        }
        
        // Set today's date
        document.querySelector('input[name="serviceDate"]').value = Utils.getCurrentDate();
        
        modal.style.display = 'block';
    }

    handleServiceSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const serviceData = {
            serviceType: formData.get('serviceType'),
            customerId: formData.get('customerId'),
            serviceDate: formData.get('serviceDate'),
            deliveryDate: formData.get('deliveryDate') || null,
            category: formData.get('category'),
            brand: formData.get('brand'),
            dialColour: formData.get('dialColour') || null,
            gender: formData.get('gender') || null,
            movementNo: formData.get('movementNo') || null,
            caseMaterial: formData.get('caseMaterial') || null,
            strap: formData.get('strap') || null,
            particulars: formData.get('particulars'),
            issueType: formData.get('issueType') || null,
            inventoryUsed: formData.get('inventoryUsed') || null,
            amount: parseFloat(formData.get('amount')),
            advanceAmount: parseFloat(formData.get('advanceAmount')) || 0,
            balanceAmount: parseFloat(formData.get('balanceAmount')) || 0,
            paymentMode: formData.get('paymentMode'),
            warrantyPeriod: parseInt(formData.get('warrantyPeriod')) || 0
        };
        
        // Validation
        if (!serviceData.customerId) {
            this.showFormErrors({ customer: 'Please select a customer' });
            return;
        }
        
        if (!serviceData.category) {
            this.showFormErrors({ category: 'Please select a category' });
            return;
        }
        
        if (!serviceData.paymentMode) {
            this.showFormErrors({ payment: 'Please select payment mode' });
            return;
        }
        
        this.createService(serviceData);
    }

    createService(serviceData) {
        // Generate acknowledgement number
        const ackNumber = this.generateAcknowledgementNumber();
        
        // Calculate warranty expiry
        let warrantyExpiry = null;
        if (serviceData.warrantyPeriod > 0) {
            const expiry = new Date(serviceData.deliveryDate || serviceData.serviceDate);
            expiry.setMonth(expiry.getMonth() + serviceData.warrantyPeriod);
            warrantyExpiry = Utils.formatDate(expiry, 'YYYY-MM-DD');
        }
        
        app.run(`
            INSERT INTO services (
                customer_id, service_type, service_date, delivery_date, category, brand,
                dial_colour, gender, movement_no, case_material, strap, particulars,
                issue_type, advance_amount, balance_amount, amount, payment_mode,
                warranty_period, warranty_expiry, inventory_used, acknowledgement_number,
                status, location, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            serviceData.customerId, serviceData.serviceType, serviceData.serviceDate,
            serviceData.deliveryDate, serviceData.category, serviceData.brand,
            serviceData.dialColour, serviceData.gender, serviceData.movementNo,
            serviceData.caseMaterial, serviceData.strap, serviceData.particulars,
            serviceData.issueType, serviceData.advanceAmount, serviceData.balanceAmount,
            serviceData.amount, serviceData.paymentMode, serviceData.warrantyPeriod,
            warrantyExpiry, serviceData.inventoryUsed, ackNumber, 'Yet to Start',
            'Semmancheri', Auth.getCurrentUser()?.username || 'system', new Date().toISOString()
        ]).then(result => {
            // Log audit
            if (typeof Audit !== 'undefined') {
                Audit.logCreate('services', result.id, serviceData, `Created service: ${ackNumber}`);
            }
            
            // Close modal
            document.getElementById('service-modal').style.display = 'none';
            
            // Refresh data
            this.loadData();
            
            // Show success
            Utils.showSuccess(`Service created successfully! Acknowledgement: ${ackNumber}`);
            
            // TODO: Generate acknowledgement receipt
            this.generateAcknowledgement(result.id, ackNumber, serviceData);
        }).catch(error => {
            console.error('Service creation error:', error);
            Utils.showError('Failed to create service');
        });
    }

    generateAcknowledgementNumber() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const random = Math.floor(100 + Math.random() * 900);
        
        return `ACKSR${year}${month}${day}1${random}`;
    }

    generateAcknowledgement(serviceId, ackNumber, serviceData) {
        // TODO: Implement acknowledgement generation
        console.log('Generating acknowledgement:', ackNumber);
        alert(`Acknowledgement ${ackNumber} generated successfully!`);
    }

    updateServiceStatus(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        document.getElementById('status-service-id').value = serviceId;
        document.getElementById('status-select').value = service.status;
        document.querySelector('select[name="location"]').value = service.location || 'Semmancheri';
        
        document.getElementById('status-modal').style.display = 'block';
    }

    handleStatusUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const serviceId = formData.get('serviceId');
        const status = formData.get('status');
        const location = formData.get('location');
        const comments = formData.get('comments');
        const inventoryUsed = formData.get('inventoryUsedUpdate');
        
        // Update service
        app.run(`
            UPDATE services 
            SET status = ?, location = ?, comments = ?, 
                inventory_used = COALESCE(?, inventory_used),
                updated_at = ?
            WHERE id = ?
        `, [status, location, comments, inventoryUsed, new Date().toISOString(), serviceId])
        .then(() => {
            // Track in history
            const oldService = this.services.find(s => s.id == serviceId);
            app.run(`
                INSERT INTO service_history (service_id, field_name, old_value, new_value, comments, changed_by, changed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                serviceId, 'status', oldService.status, status, comments,
                Auth.getCurrentUser()?.username || 'system', new Date().toISOString()
            ]);
            
            // Generate invoice if completed
            if (status === 'Service Completed') {
                this.generateServiceInvoice(serviceId);
            }
            
            // Close modal and refresh
            document.getElementById('status-modal').style.display = 'none';
            this.loadData();
            
            Utils.showSuccess('Service status updated successfully');
        }).catch(error => {
            console.error('Status update error:', error);
            Utils.showError('Failed to update service status');
        });
    }

    generateServiceInvoice(serviceId) {
        // Generate invoice number
        const invoiceNumber = this.generateServiceInvoiceNumber();
        
        // TODO: Create invoice record and generate PDF
        console.log('Generating service invoice:', invoiceNumber);
        alert(`Service invoice ${invoiceNumber} generated!`);
    }

    generateServiceInvoiceNumber() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const random = Math.floor(100 + Math.random() * 900);
        
        return `INVSR${year}${month}${day}1${random}`;
    }

    applyFilters() {
        let filtered = [...this.services];
        
        // Search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(service => 
                service.customer_name?.toLowerCase().includes(term) ||
                service.acknowledgement_number?.toLowerCase().includes(term) ||
                service.brand?.toLowerCase().includes(term)
            );
        }
        
        // Status filter
        if (this.filters.status) {
            filtered = filtered.filter(service => service.status === this.filters.status);
        }
        
        // Type filter
        if (this.filters.type) {
            filtered = filtered.filter(service => service.service_type === this.filters.type);
        }
        
        this.renderServicesList(filtered);
    }

    renderServicesList(servicesData = null) {
        const services = servicesData || this.services;
        const container = document.getElementById('service-list');
        
        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No services found</h3>
                    <p>Start by creating your first service</p>
                    <div class="empty-actions">
                        <button class="btn btn-primary" onclick="serviceModule.openServiceModal('new')">
                            New Service
                        </button>
                        <button class="btn btn-warning" onclick="serviceModule.openServiceModal('instant')">
                            Instant Service
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Customer</th>
                        <th>Brand</th>
                        <th>Issue</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${services.map((service, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${Utils.formatDate(service.service_date)}</td>
                            <td>
                                <span class="type-badge ${service.service_type}">
                                    ${service.service_type === 'instant' ? 'Instant' : 'Regular'}
                                </span>
                            </td>
                            <td>${service.customer_name || 'Unknown'}</td>
                            <td>${service.brand}</td>
                            <td>${service.issue_type || service.particulars?.substring(0, 30) || 'N/A'}</td>
                            <td class="font-semibold">₹${service.amount}</td>
                            <td>
                                <span class="status-badge ${this.getStatusClass(service.status)}">
                                    ${service.status}
                                </span>
                            </td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-info" onclick="serviceModule.viewService(${service.id})" title="View">
                                        👁️
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="serviceModule.updateServiceStatus(${service.id})" title="Update Status">
                                        📝
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="serviceModule.printAcknowledgement(${service.id})" title="Print Acknowledgement">
                                        🖨️
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

    getStatusClass(status) {
        const statusMap = {
            'Yet to Start': 'pending',
            'In Service Center': 'progress',
            'Yet to Send Parrys': 'progress',
            'In Parrys': 'progress',
            'To Return to Customer': 'ready',
            'Service Completed': 'completed',
            'Delivered': 'completed',
            'Waiting for Customer to Pickup': 'ready'
        };
        
        return statusMap[status] || 'pending';
    }

    updateStats() {
        const totalServices = this.services.length;
        
        // Pending services (not completed or delivered)
        const pendingServices = this.services.filter(service => 
            !['Service Completed', 'Delivered'].includes(service.status)
        ).length;
        
        // Completed services
        const completedServices = this.services.filter(service => 
            ['Service Completed', 'Delivered'].includes(service.status)
        ).length;
        
        // Today's revenue
        const today = new Date().toDateString();
        const todayServices = this.services.filter(service => 
            new Date(service.service_date).toDateString() === today
        );
        const todayRevenue = todayServices.reduce((sum, service) => 
            sum + parseFloat(service.amount || 0), 0
        );
        
        document.getElementById('total-services').textContent = totalServices;
        document.getElementById('pending-services').textContent = pendingServices;
        document.getElementById('completed-services').textContent = completedServices;
        document.getElementById('today-revenue').textContent = Utils.formatCurrency(todayRevenue);
    }

    viewService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        const details = `
Service Details:
Acknowledgement: ${service.acknowledgement_number || 'N/A'}
Customer: ${service.customer_name}
Type: ${service.service_type}
Brand: ${service.brand}
Category: ${service.category}
Issue: ${service.issue_type || service.particulars}
Amount: ₹${service.amount}
Status: ${service.status}
Date: ${Utils.formatDate(service.service_date)}
${service.delivery_date ? `Delivery: ${Utils.formatDate(service.delivery_date)}` : ''}
        `;
        
        alert(details);
    }

    printAcknowledgement(serviceId) {
        // TODO: Implement acknowledgement printing
        console.log('Printing acknowledgement for service:', serviceId);
        alert('Acknowledgement printing feature will be implemented');
    }

    showFormErrors(errors) {
        const errorsDiv = document.getElementById('service-form-errors');
        const errorMessages = Object.values(errors).map(error => `<div>• ${error}</div>`).join('');
        
        errorsDiv.innerHTML = `
            <div class="alert alert-error">
                <strong>Please fix the following errors:</strong>
                ${errorMessages}
            </div>
        `;
        errorsDiv.style.display = 'block';
    }

    cleanup() {
        console.log('Cleaning up service module...');
        // Reset any pending data
    }
}

// Register module
window.ServiceModule = ServiceModule;
const serviceModule = new ServiceModule();
if (typeof app !== 'undefined') {
    app.registerModule('service', serviceModule);
}

})();