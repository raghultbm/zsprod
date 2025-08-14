const { allQuery, getQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Dashboard {
    constructor() {
        this.stats = {
            totalCustomers: 0,
            totalInventory: 0,
            inventoryByCategory: {},
            todaySales: 0,
            todayService: 0,
            recentSales: [],
            incompleteServices: []
        };
    }

    async render() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-grid">
                    <div class="stat-card" onclick="app.loadModule('customers')">
                        <div class="stat-value" id="total-customers">0</div>
                        <div class="stat-label">Total Customers</div>
                    </div>
                    
                    <div class="stat-card" onclick="dashboard.showInventoryBreakdown()">
                        <div class="stat-value" id="total-inventory">0</div>
                        <div class="stat-label">Total Inventory</div>
                    </div>
                    
                    <div class="stat-card" onclick="app.loadModule('sales')">
                        <div class="stat-value" id="today-sales">₹0</div>
                        <div class="stat-label">Today's Sales</div>
                    </div>
                    
                    <div class="stat-card" onclick="app.loadModule('service')">
                        <div class="stat-value" id="today-service">₹0</div>
                        <div class="stat-label">Today's Service</div>
                    </div>
                </div>

                <div class="dashboard-content">
                    <div class="dashboard-section">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Recent Sales</h3>
                                <button class="btn btn-sm btn-primary" onclick="app.loadModule('sales')">View All</button>
                            </div>
                            <div class="card-body">
                                <div id="recent-sales-list">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading recent sales...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Incomplete Services</h3>
                                <button class="btn btn-sm btn-primary" onclick="app.loadModule('service')">View All</button>
                            </div>
                            <div class="card-body">
                                <div id="incomplete-services-list">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading services...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            await this.loadDashboardData();
            this.updateUI();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            window.app.showMessage('Failed to load dashboard data', 'error');
        }
    }

    async loadDashboardData() {
        try {
            // Load all dashboard statistics
            await Promise.all([
                this.loadCustomerStats(),
                this.loadInventoryStats(),
                this.loadTodaysSalesStats(),
                this.loadTodaysServiceStats(),
                this.loadRecentSales(),
                this.loadIncompleteServices()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    async loadCustomerStats() {
        try {
            const result = await getQuery('SELECT COUNT(*) as count FROM customers');
            this.stats.totalCustomers = result ? result.count : 0;
        } catch (error) {
            console.error('Error loading customer stats:', error);
            this.stats.totalCustomers = 0;
        }
    }

    async loadInventoryStats() {
        try {
            // Total inventory count
            const totalResult = await getQuery('SELECT COUNT(*) as count FROM inventory WHERE is_active = 1');
            this.stats.totalInventory = totalResult ? totalResult.count : 0;

            // Inventory by category
            const categoryResults = await allQuery(`
                SELECT category, COUNT(*) as count 
                FROM inventory 
                WHERE is_active = 1 
                GROUP BY category 
                ORDER BY count DESC
            `);
            
            this.stats.inventoryByCategory = {};
            categoryResults.forEach(row => {
                this.stats.inventoryByCategory[row.category] = row.count;
            });
        } catch (error) {
            console.error('Error loading inventory stats:', error);
            this.stats.totalInventory = 0;
            this.stats.inventoryByCategory = {};
        }
    }

    async loadTodaysSalesStats() {
        try {
            const today = Utils.getCurrentDate();
            const result = await getQuery(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM sales 
                WHERE DATE(sale_date) = DATE(?) AND status = 'completed'
            `, [today]);
            
            this.stats.todaySales = result ? result.total : 0;
        } catch (error) {
            console.error('Error loading today\'s sales stats:', error);
            this.stats.todaySales = 0;
        }
    }

    async loadTodaysServiceStats() {
        try {
            const today = Utils.getCurrentDate();
            const result = await getQuery(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM services 
                WHERE DATE(service_date) = DATE(?) AND status = 'Service Completed'
            `, [today]);
            
            this.stats.todayService = result ? result.total : 0;
        } catch (error) {
            console.error('Error loading today\'s service stats:', error);
            this.stats.todayService = 0;
        }
    }

    async loadRecentSales() {
        try {
            const results = await allQuery(`
                SELECT s.*, c.name as customer_name, c.mobile_number
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.status = 'completed'
                ORDER BY s.created_at DESC
                LIMIT 10
            `);
            
            this.stats.recentSales = results || [];
        } catch (error) {
            console.error('Error loading recent sales:', error);
            this.stats.recentSales = [];
        }
    }

    async loadIncompleteServices() {
        try {
            const results = await allQuery(`
                SELECT s.*, c.name as customer_name, c.mobile_number
                FROM services s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.status NOT IN ('Service Completed', 'Delivered')
                ORDER BY s.service_date ASC
                LIMIT 10
            `);
            
            this.stats.incompleteServices = results || [];
        } catch (error) {
            console.error('Error loading incomplete services:', error);
            this.stats.incompleteServices = [];
        }
    }

    updateUI() {
        // Update stat cards
        const totalCustomersEl = document.getElementById('total-customers');
        if (totalCustomersEl) {
            totalCustomersEl.textContent = Utils.formatNumber(this.stats.totalCustomers);
        }

        const totalInventoryEl = document.getElementById('total-inventory');
        if (totalInventoryEl) {
            totalInventoryEl.textContent = Utils.formatNumber(this.stats.totalInventory);
        }

        const todaySalesEl = document.getElementById('today-sales');
        if (todaySalesEl) {
            todaySalesEl.textContent = Utils.formatCurrency(this.stats.todaySales);
        }

        const todayServiceEl = document.getElementById('today-service');
        if (todayServiceEl) {
            todayServiceEl.textContent = Utils.formatCurrency(this.stats.todayService);
        }

        // Update recent sales list
        this.updateRecentSalesList();

        // Update incomplete services list
        this.updateIncompleteServicesList();
    }

    updateRecentSalesList() {
        const container = document.getElementById('recent-sales-list');
        if (!container) return;

        if (this.stats.recentSales.length === 0) {
            container.innerHTML = '<div class="text-center p-3">No recent sales found</div>';
            return;
        }

        let html = '<div class="table-container"><table class="table">';
        html += `
            <thead>
                <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
        `;

        this.stats.recentSales.forEach(sale => {
            html += `
                <tr>
                    <td>${sale.invoice_number}</td>
                    <td>
                        <div><strong>${sale.customer_name || 'Unknown'}</strong></div>
                        <small>${sale.mobile_number || ''}</small>
                    </td>
                    <td>${Utils.formatCurrency(sale.total_amount)}</td>
                    <td>${Utils.formatDate(sale.sale_date)}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="dashboard.viewSaleDetails('${sale.id}')">
                            View
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="dashboard.printInvoice('${sale.invoice_number}')">
                            Print
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    updateIncompleteServicesList() {
        const container = document.getElementById('incomplete-services-list');
        if (!container) return;

        if (this.stats.incompleteServices.length === 0) {
            container.innerHTML = '<div class="text-center p-3">No incomplete services found</div>';
            return;
        }

        let html = '<div class="table-container"><table class="table">';
        html += `
            <thead>
                <tr>
                    <th>Service #</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Service Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
        `;

        this.stats.incompleteServices.forEach(service => {
            const statusClass = this.getServiceStatusClass(service.status);
            html += `
                <tr>
                    <td>${service.acknowledgement_number || service.id}</td>
                    <td>
                        <div><strong>${service.customer_name || 'Unknown'}</strong></div>
                        <small>${service.mobile_number || ''}</small>
                    </td>
                    <td><span class="status-badge ${statusClass}">${service.status}</span></td>
                    <td>${Utils.formatDate(service.service_date)}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="dashboard.viewServiceDetails('${service.id}')">
                            View
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="dashboard.updateServiceStatus('${service.id}')">
                            Update
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    getServiceStatusClass(status) {
        const statusClasses = {
            'Yet to Start': 'status-pending',
            'In Service Center': 'status-in-progress',
            'Yet to Send Parrys': 'status-warning',
            'In Parrys': 'status-warning',
            'To Return to Customer': 'status-info',
            'Waiting for Customer to Pickup': 'status-info',
            'Service Completed': 'status-success',
            'Delivered': 'status-success'
        };
        return statusClasses[status] || 'status-default';
    }

    showInventoryBreakdown() {
        let content = '<h4>Inventory by Category</h4>';
        
        if (Object.keys(this.stats.inventoryByCategory).length === 0) {
            content += '<p>No inventory data available</p>';
        } else {
            content += '<div class="inventory-breakdown">';
            Object.entries(this.stats.inventoryByCategory).forEach(([category, count]) => {
                content += `
                    <div class="breakdown-item">
                        <span class="category-name">${category}</span>
                        <span class="category-count">${Utils.formatNumber(count)}</span>
                    </div>
                `;
            });
            content += '</div>';
        }

        window.app.showModal('Inventory Breakdown', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            <button class="btn btn-primary" onclick="app.loadModule('inventory')">View Inventory</button>
        `);
    }

    async viewSaleDetails(saleId) {
        try {
            const sale = await getQuery(`
                SELECT s.*, c.name as customer_name, c.mobile_number
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.id = ?
            `, [saleId]);

            if (!sale) {
                window.app.showMessage('Sale not found', 'error');
                return;
            }

            const saleItems = await allQuery(`
                SELECT si.*, i.particulars, i.code
                FROM sale_items si
                LEFT JOIN inventory i ON si.inventory_id = i.id
                WHERE si.sale_id = ?
            `, [saleId]);

            let content = `
                <div class="sale-details">
                    <div class="detail-row">
                        <strong>Invoice Number:</strong> ${sale.invoice_number}
                    </div>
                    <div class="detail-row">
                        <strong>Customer:</strong> ${sale.customer_name} (${sale.mobile_number})
                    </div>
                    <div class="detail-row">
                        <strong>Sale Date:</strong> ${Utils.formatDate(sale.sale_date)}
                    </div>
                    <div class="detail-row">
                        <strong>Total Amount:</strong> ${Utils.formatCurrency(sale.total_amount)}
                    </div>
                    <div class="detail-row">
                        <strong>Payment Mode:</strong> ${sale.payment_mode}
                    </div>
                </div>
            `;

            if (saleItems.length > 0) {
                content += '<h4>Items</h4>';
                content += '<div class="table-container"><table class="table">';
                content += '<thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>';
                
                saleItems.forEach(item => {
                    content += `
                        <tr>
                            <td>${item.code}</td>
                            <td>${item.particulars}</td>
                            <td>${item.quantity}</td>
                            <td>${Utils.formatCurrency(item.total_price)}</td>
                        </tr>
                    `;
                });
                
                content += '</tbody></table></div>';
            }

            window.app.showModal('Sale Details', content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-primary" onclick="dashboard.printInvoice('${sale.invoice_number}')">Print Invoice</button>
            `);

        } catch (error) {
            console.error('Error viewing sale details:', error);
            window.app.showMessage('Failed to load sale details', 'error');
        }
    }

    async viewServiceDetails(serviceId) {
        try {
            const service = await getQuery(`
                SELECT s.*, c.name as customer_name, c.mobile_number
                FROM services s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.id = ?
            `, [serviceId]);

            if (!service) {
                window.app.showMessage('Service not found', 'error');
                return;
            }

            let content = `
                <div class="service-details">
                    <div class="detail-row">
                        <strong>Service Number:</strong> ${service.acknowledgement_number || service.id}
                    </div>
                    <div class="detail-row">
                        <strong>Customer:</strong> ${service.customer_name} (${service.mobile_number})
                    </div>
                    <div class="detail-row">
                        <strong>Service Date:</strong> ${Utils.formatDate(service.service_date)}
                    </div>
                    <div class="detail-row">
                        <strong>Status:</strong> <span class="status-badge ${this.getServiceStatusClass(service.status)}">${service.status}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Category:</strong> ${service.category || 'N/A'}
                    </div>
                    <div class="detail-row">
                        <strong>Brand:</strong> ${service.brand || 'N/A'}
                    </div>
                    <div class="detail-row">
                        <strong>Particulars:</strong> ${service.particulars || 'N/A'}
                    </div>
                    <div class="detail-row">
                        <strong>Total Amount:</strong> ${Utils.formatCurrency(service.total_amount)}
                    </div>
                </div>
            `;

            window.app.showModal('Service Details', content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-warning" onclick="dashboard.updateServiceStatus('${service.id}')">Update Status</button>
            `);

        } catch (error) {
            console.error('Error viewing service details:', error);
            window.app.showMessage('Failed to load service details', 'error');
        }
    }

    printInvoice(invoiceNumber) {
        // This would integrate with the invoice module to print
        window.app.showMessage('Print functionality will be implemented with invoice module', 'info');
    }

    updateServiceStatus(serviceId) {
        // This would integrate with the service module to update status
        window.app.showMessage('Service status update will be implemented with service module', 'info');
    }

    async refresh() {
        await this.loadDashboardData();
        this.updateUI();
    }
}

// Make dashboard instance available globally for event handlers
window.dashboard = null;

// Export the class
export default Dashboard;

// Set up global dashboard instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'dashboard') {
        window.dashboard = window.app.modules.dashboard;
    }
});