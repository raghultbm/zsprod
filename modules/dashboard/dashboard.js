// Dashboard module for ZEDSON Watchcraft
class DashboardModule {
    constructor() {
        this.data = {
            totalCustomers: 0,
            totalInventory: 0,
            inventoryByCategory: {},
            todaySales: 0,
            todayService: 0,
            recentSales: [],
            incompleteServices: []
        };
    }

    async render(container) {
        try {
            container.innerHTML = this.getTemplate();
            await this.loadData();
            this.setupEventListeners();
            this.updateUI();
        } catch (error) {
            console.error('Dashboard render error:', error);
            Utils.showError('Failed to load dashboard');
        }
    }

    getTemplate() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>Dashboard</h1>
                    <div class="dashboard-date">
                        ${Utils.formatDate(new Date(), CONSTANTS.DATE_FORMATS.DISPLAY)}
                    </div>
                </div>

                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-number" id="total-customers">0</div>
                            <div class="stat-label">Total Customers</div>
                        </div>
                    </div>

                    <div class="stat-card clickable" id="inventory-card">
                        <div class="stat-icon">📦</div>
                        <div class="stat-content">
                            <div class="stat-number" id="total-inventory">0</div>
                            <div class="stat-label">Total Inventory</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number" id="today-sales">₹0</div>
                            <div class="stat-label">Today's Sales</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">🔧</div>
                        <div class="stat-content">
                            <div class="stat-number" id="today-service">₹0</div>
                            <div class="stat-label">Today's Service</div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-details">
                    <div class="dashboard-section">
                        <div class="section-header">
                            <h3>Recent Sales</h3>
                            <button class="btn btn-sm btn-secondary" onclick="app.loadModule('sales')">
                                View All
                            </button>
                        </div>
                        <div class="recent-sales" id="recent-sales">
                            <div class="loading-placeholder">Loading recent sales...</div>
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <div class="section-header">
                            <h3>Incomplete Services</h3>
                            <button class="btn btn-sm btn-secondary" onclick="app.loadModule('service')">
                                View All
                            </button>
                        </div>
                        <div class="incomplete-services" id="incomplete-services">
                            <div class="loading-placeholder">Loading incomplete services...</div>
                        </div>
                    </div>
                </div>

                <!-- Inventory Category Modal -->
                <div id="inventory-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Inventory by Category</h3>
                            <button class="modal-close" onclick="this.closest('.modal').style.display='none'">×</button>
                        </div>
                        <div class="modal-body" id="inventory-category-list">
                            <!-- Category breakdown will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadData() {
        try {
            // Load all data in parallel
            const [
                customerCount,
                inventoryData,
                todaySalesData,
                todayServiceData,
                recentSalesData,
                incompleteServicesData
            ] = await Promise.all([
                this.loadCustomerCount(),
                this.loadInventoryData(),
                this.loadTodaySales(),
                this.loadTodayService(),
                this.loadRecentSales(),
                this.loadIncompleteServices()
            ]);

            this.data.totalCustomers = customerCount;
            this.data.totalInventory = inventoryData.total;
            this.data.inventoryByCategory = inventoryData.byCategory;
            this.data.todaySales = todaySalesData;
            this.data.todayService = todayServiceData;
            this.data.recentSales = recentSalesData;
            this.data.incompleteServices = incompleteServicesData;

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    async loadCustomerCount() {
        const result = await app.get('SELECT COUNT(*) as count FROM customers');
        return result ? result.count : 0;
    }

    async loadInventoryData() {
        const [totalResult, categoryResults] = await Promise.all([
            app.get('SELECT COUNT(*) as count FROM inventory WHERE is_sold = 0'),
            app.query(`
                SELECT category, COUNT(*) as count 
                FROM inventory 
                WHERE is_sold = 0 
                GROUP BY category 
                ORDER BY count DESC
            `)
        ]);

        return {
            total: totalResult ? totalResult.count : 0,
            byCategory: categoryResults.reduce((acc, item) => {
                acc[item.category] = item.count;
                return acc;
            }, {})
        };
    }

    async loadTodaySales() {
        const today = Utils.getCurrentDate();
        const result = await app.get(`
            SELECT COALESCE(SUM(total_amount), 0) as total 
            FROM sales 
            WHERE DATE(sale_date) = ?
        `, [today]);
        
        return result ? result.total : 0;
    }

    async loadTodayService() {
        const today = Utils.getCurrentDate();
        const result = await app.get(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM services 
            WHERE DATE(service_date) = ?
        `, [today]);
        
        return result ? result.total : 0;
    }

    async loadRecentSales() {
        const sales = await app.query(`
            SELECT s.id, s.sale_date, s.total_amount, s.invoice_number,
                   c.name as customer_name, c.mobile as customer_mobile
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            ORDER BY s.created_at DESC
            LIMIT 5
        `);

        return sales || [];
    }

    async loadIncompleteServices() {
        const services = await app.query(`
            SELECT s.id, s.service_date, s.amount, s.status, s.acknowledgement_number,
                   c.name as customer_name, c.mobile as customer_mobile,
                   s.particulars
            FROM services s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.status NOT IN ('Service Completed', 'Delivered')
            ORDER BY s.service_date ASC
            LIMIT 10
        `);

        return services || [];
    }

    setupEventListeners() {
        // Inventory card click - show category breakdown
        const inventoryCard = document.getElementById('inventory-card');
        inventoryCard.addEventListener('click', () => {
            this.showInventoryModal();
        });

        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    updateUI() {
        // Update stat numbers
        document.getElementById('total-customers').textContent = this.data.totalCustomers.toLocaleString();
        document.getElementById('total-inventory').textContent = this.data.totalInventory.toLocaleString();
        document.getElementById('today-sales').textContent = Utils.formatCurrency(this.data.todaySales);
        document.getElementById('today-service').textContent = Utils.formatCurrency(this.data.todayService);

        // Update recent sales
        this.renderRecentSales();

        // Update incomplete services
        this.renderIncompleteServices();
    }

    renderRecentSales() {
        const container = document.getElementById('recent-sales');
        
        if (this.data.recentSales.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent sales found</div>';
            return;
        }

        const salesHTML = this.data.recentSales.map(sale => `
            <div class="recent-item">
                <div class="item-header">
                    <span class="item-title">${sale.customer_name || 'Unknown Customer'}</span>
                    <span class="item-amount">${Utils.formatCurrency(sale.total_amount)}</span>
                </div>
                <div class="item-details">
                    <span class="item-date">${Utils.formatDate(sale.sale_date)}</span>
                    <span class="item-id">${sale.invoice_number || `Sale #${sale.id}`}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = salesHTML;
    }

    renderIncompleteServices() {
        const container = document.getElementById('incomplete-services');
        
        if (this.data.incompleteServices.length === 0) {
            container.innerHTML = '<div class="empty-state">No incomplete services found</div>';
            return;
        }

        const servicesHTML = this.data.incompleteServices.map(service => `
            <div class="recent-item">
                <div class="item-header">
                    <span class="item-title">${service.customer_name || 'Unknown Customer'}</span>
                    <span class="item-status status-${service.status.toLowerCase().replace(/\s+/g, '-')}">${service.status}</span>
                </div>
                <div class="item-details">
                    <span class="item-date">${Utils.formatDate(service.service_date)}</span>
                    <span class="item-id">${service.acknowledgement_number || `Service #${service.id}`}</span>
                </div>
                <div class="item-description">${service.particulars || 'No description'}</div>
            </div>
        `).join('');

        container.innerHTML = servicesHTML;
    }

    showInventoryModal() {
        const modal = document.getElementById('inventory-modal');
        const categoryList = document.getElementById('inventory-category-list');
        
        if (Object.keys(this.data.inventoryByCategory).length === 0) {
            categoryList.innerHTML = '<div class="empty-state">No inventory found</div>';
        } else {
            const categoriesHTML = Object.entries(this.data.inventoryByCategory)
                .map(([category, count]) => `
                    <div class="category-item">
                        <span class="category-name">${category}</span>
                        <span class="category-count">${count} items</span>
                    </div>
                `).join('');
            
            categoryList.innerHTML = categoriesHTML;
        }
        
        modal.style.display = 'block';
    }

    async refresh() {
        try {
            await this.loadData();
            this.updateUI();
        } catch (error) {
            console.error('Dashboard refresh error:', error);
            Utils.showError('Failed to refresh dashboard');
        }
    }
}

// Register the module
const dashboardModule = new DashboardModule();
if (typeof app !== 'undefined') {
    app.registerModule('dashboard', dashboardModule);
}