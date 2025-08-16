// Dashboard Module for ZEDSON Watchcraft
class DashboardModule {
    constructor() {
        this.stats = {
            totalCustomers: 0,
            totalInventory: 0,
            todaySales: 0,
            todayService: 0
        };
    }

    async render() {
        const container = document.getElementById('module-container');
        container.innerHTML = this.getHTML();
        
        await this.loadStats();
        this.updateStatsDisplay();
    }

    getHTML() {
        return `
            <div class="dashboard-module">
                <div class="module-header">
                    <h2 class="module-title">
                        <i class="fas fa-tachometer-alt"></i> Dashboard
                    </h2>
                </div>

                <!-- Stats Cards -->
                <div class="stats-grid">
                    <div class="stat-card" onclick="window.App.navigateTo('customers')">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-value" id="total-customers">0</div>
                        <div class="stat-label">Total Customers</div>
                    </div>

                    <div class="stat-card" onclick="window.App.navigateTo('inventory')">
                        <div class="stat-icon">
                            <i class="fas fa-boxes"></i>
                        </div>
                        <div class="stat-value" id="total-inventory">0</div>
                        <div class="stat-label">Total Inventory</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="stat-value" id="today-sales">₹0</div>
                        <div class="stat-label">Today's Sales</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-tools"></i>
                        </div>
                        <div class="stat-value" id="today-service">₹0</div>
                        <div class="stat-label">Today's Service</div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="dashboard-row">
                    <div class="card" style="flex: 1; margin-right: 10px;">
                        <div class="card-header">Recent Sales</div>
                        <div class="card-body">
                            <div id="recent-sales">
                                <p class="text-muted">No recent sales</p>
                            </div>
                        </div>
                    </div>

                    <div class="card" style="flex: 1; margin-left: 10px;">
                        <div class="card-header">Incomplete Services</div>
                        <div class="card-body">
                            <div id="incomplete-services">
                                <p class="text-muted">No incomplete services</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="card">
                    <div class="card-header">Quick Actions</div>
                    <div class="card-body">
                        <div class="quick-actions">
                            <button class="btn btn-primary" onclick="window.App.navigateTo('customers')">
                                <i class="fas fa-user-plus"></i> Add Customer
                            </button>
                            <button class="btn btn-success" onclick="window.App.navigateTo('sales')">
                                <i class="fas fa-shopping-cart"></i> New Sale
                            </button>
                            <button class="btn btn-warning" onclick="window.App.navigateTo('service')">
                                <i class="fas fa-tools"></i> New Service
                            </button>
                            <button class="btn btn-secondary" onclick="window.App.navigateTo('inventory')">
                                <i class="fas fa-boxes"></i> Add Inventory
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .dashboard-row {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                
                .quick-actions {
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                }
                
                .text-muted {
                    color: #6c757d;
                    font-style: italic;
                }
                
                @media (max-width: 768px) {
                    .dashboard-row {
                        flex-direction: column;
                    }
                    
                    .quick-actions {
                        flex-direction: column;
                    }
                }
            </style>
        `;
    }

    async loadStats() {
        try {
            // Get total customers
            const customers = await window.DB.all(`
                SELECT COUNT(*) as count FROM customers WHERE is_active = 1
            `) || [];
            this.stats.totalCustomers = customers[0]?.count || 0;

            // Get total inventory (when inventory module is built)
            this.stats.totalInventory = 0;

            // Get today's sales (when sales module is built)
            this.stats.todaySales = 0;

            // Get today's service (when service module is built)
            this.stats.todayService = 0;

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Use default values on error
        }
    }

    updateStatsDisplay() {
        document.getElementById('total-customers').textContent = this.stats.totalCustomers;
        document.getElementById('total-inventory').textContent = this.stats.totalInventory;
        document.getElementById('today-sales').textContent = window.Utils.formatCurrency(this.stats.todaySales);
        document.getElementById('today-service').textContent = window.Utils.formatCurrency(this.stats.todayService);
    }
}

// Make module globally available
window.DashboardModule = DashboardModule;