// src/modules/dashboard-enhanced.js - Enhanced Dashboard functionality
const { ipcRenderer } = require('electron');

class DashboardEnhanced {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.dashboardData = {
            stats: {},
            recentSales: [],
            incompleteServices: [],
            categoryBreakdown: {},
            todaysSummary: {}
        };
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadEnhancedData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Add click handlers for stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const statType = this.getStatTypeFromElement(card);
            if (statType) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => this.handleStatCardClick(statType));
            }
        });

        // Handle modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('stat-modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    getStatTypeFromElement(element) {
        if (element.querySelector('#totalItems')) return 'items';
        if (element.querySelector('#todaysSales')) return 'todaysSales';
        if (element.querySelector('#incompleteServices')) return 'incompleteServices';
        if (element.querySelector('#totalCustomers')) return 'customers';
        if (element.querySelector('#totalInvoices')) return 'invoices';
        return null;
    }

    async loadEnhancedData() {
        try {
            // Load all data in parallel for better performance
            const [
                customers,
                inventory,
                sales,
                serviceJobs,
                invoices
            ] = await Promise.all([
                ipcRenderer.invoke('get-customers'),
                ipcRenderer.invoke('get-inventory'),
                ipcRenderer.invoke('get-sales'),
                ipcRenderer.invoke('get-service-jobs'),
                ipcRenderer.invoke('get-all-invoices')
            ]);

            // Process and store data
            this.processEnhancedStats(customers, inventory, sales, serviceJobs, invoices);
            this.updateEnhancedUI();
            
        } catch (error) {
            console.error('Error loading enhanced dashboard data:', error);
            showError('Error loading dashboard data');
        }
    }

    processEnhancedStats(customers, inventory, sales, serviceJobs, invoices) {
        const today = new Date().toISOString().split('T')[0];

        // Basic stats
        this.dashboardData.stats = {
            totalCustomers: customers.length,
            totalItems: inventory.length,
            totalInvoices: invoices.length,
            lowStockItems: inventory.filter(item => item.quantity <= 5).length
        };

        // Category breakdown
        this.dashboardData.categoryBreakdown = inventory.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {});

        // Today's sales and services
        const todaysSales = sales.filter(sale => sale.sale_date === today);
        const todaysServices = serviceJobs.filter(job => 
            job.created_at && job.created_at.split('T')[0] === today
        );

        const todaysSalesTotal = todaysSales.reduce((sum, sale) => 
            sum + parseFloat(sale.total_amount || 0), 0
        );
        
        const todaysServicesTotal = todaysServices.reduce((sum, job) => 
            sum + parseFloat(job.final_cost || job.estimated_cost || 0), 0
        );

        this.dashboardData.stats.todaysSales = todaysSalesTotal + todaysServicesTotal;
        this.dashboardData.todaysSummary = {
            salesCount: todaysSales.length,
            salesAmount: todaysSalesTotal,
            servicesCount: todaysServices.length,
            servicesAmount: todaysServicesTotal,
            totalAmount: todaysSalesTotal + todaysServicesTotal
        };

        // Incomplete services
        const incompleteStatuses = ['yet_to_start', 'in_service_center'];
        this.dashboardData.incompleteServices = serviceJobs.filter(job => 
            incompleteStatuses.includes(job.status)
        );
        this.dashboardData.stats.incompleteServices = this.dashboardData.incompleteServices.length;

        // Recent sales (last 5)
        this.dashboardData.recentSales = sales
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
    }

    updateEnhancedUI() {
        // Update stat numbers
        const updates = {
            'totalCustomers': this.dashboardData.stats.totalCustomers,
            'totalItems': this.dashboardData.stats.totalItems,
            'lowStockItems': this.dashboardData.stats.lowStockItems,
            'totalUsers': document.getElementById('totalUsers')?.textContent || '0' // Keep existing
        };

        // Add new stat cards if they don't exist
        this.addNewStatCards();

        // Update all stat numbers
        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Update new stat cards
        const todaysSalesEl = document.getElementById('todaysSales');
        const incompleteServicesEl = document.getElementById('incompleteServices');
        const totalInvoicesEl = document.getElementById('totalInvoices');

        if (todaysSalesEl) todaysSalesEl.textContent = `₹${this.dashboardData.stats.todaysSales.toFixed(2)}`;
        if (incompleteServicesEl) incompleteServicesEl.textContent = this.dashboardData.stats.incompleteServices;
        if (totalInvoicesEl) totalInvoicesEl.textContent = this.dashboardData.stats.totalInvoices;

        // Update recent activity section
        this.updateRecentActivity();
    }

    addNewStatCards() {
        const statsGrid = document.querySelector('.stats-grid');
        if (!statsGrid) return;

        // Check if new cards already exist
        if (document.getElementById('todaysSales')) return;

        // Create new stat cards
        const newCards = [
            {
                id: 'todaysSales',
                title: "Today's Sales",
                value: `₹${this.dashboardData.stats.todaysSales.toFixed(2)}`,
                icon: '💰'
            },
            {
                id: 'incompleteServices',
                title: 'Incomplete Services',
                value: this.dashboardData.stats.incompleteServices,
                icon: '🔧'
            },
            {
                id: 'totalInvoices',
                title: 'Total Invoices',
                value: this.dashboardData.stats.totalInvoices,
                icon: '📄'
            }
        ];

        newCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'stat-card';
            cardElement.style.cursor = 'pointer';
            cardElement.innerHTML = `
                <h3>${card.icon} ${card.title}</h3>
                <div class="stat-number" id="${card.id}">${card.value}</div>
            `;
            statsGrid.appendChild(cardElement);

            // Add click handler
            cardElement.addEventListener('click', () => this.handleStatCardClick(card.id));
        });
    }

    updateRecentActivity() {
        const recentActivityEl = document.querySelector('.recent-activity');
        if (!recentActivityEl) return;

        recentActivityEl.innerHTML = `
            <h3>Recent Activity</h3>
            
            <div class="activity-section">
                <h4>📈 Recent Sales</h4>
                ${this.dashboardData.recentSales.length > 0 ? 
                    this.dashboardData.recentSales.map(sale => `
                        <div class="activity-item">
                            <div class="activity-content">
                                <span class="activity-title">
                                    <strong>INV-S-${sale.id}</strong> - ${sale.customer_name || 'Walk-in'}
                                </span>
                                <span class="activity-amount">₹${parseFloat(sale.total_amount).toFixed(2)}</span>
                            </div>
                            <div class="activity-time">${new Date(sale.created_at).toLocaleString()}</div>
                        </div>
                    `).join('') : 
                    '<p class="no-activity">No recent sales</p>'
                }
            </div>

            <div class="activity-section">
                <h4>🔧 Incomplete Services</h4>
                ${this.dashboardData.incompleteServices.length > 0 ? 
                    this.dashboardData.incompleteServices.slice(0, 5).map(job => `
                        <div class="activity-item">
                            <div class="activity-content">
                                <span class="activity-title">
                                    <strong>${job.job_number}</strong> - ${job.customer_name || 'Walk-in'}
                                </span>
                                <span class="activity-status status-${job.status.replace('_', '-')}">${job.status.replace('_', ' ')}</span>
                            </div>
                            <div class="activity-time">
                                Created: ${new Date(job.created_at).toLocaleDateString()}
                                ${job.approximate_delivery_date ? ` | Due: ${new Date(job.approximate_delivery_date).toLocaleDateString()}` : ''}
                            </div>
                        </div>
                    `).join('') : 
                    '<p class="no-activity">No incomplete services</p>'
                }
            </div>
        `;
    }

    handleStatCardClick(statType) {
        switch (statType) {
            case 'items':
            case 'totalItems':
                this.showCategoryBreakdown();
                break;
            case 'todaysSales':
                this.showTodaysSummary();
                break;
            case 'incompleteServices':
                this.showIncompleteServices();
                break;
            case 'customers':
            case 'totalCustomers':
                this.showCustomersBreakdown();
                break;
            case 'invoices':
            case 'totalInvoices':
                this.showInvoicesBreakdown();
                break;
            default:
                console.log('Stat card clicked:', statType);
        }
    }

    showCategoryBreakdown() {
        const modal = this.createStatModal('Items by Category', 'category-breakdown');
        
        const categoryData = Object.entries(this.dashboardData.categoryBreakdown)
            .sort(([,a], [,b]) => b - a);

        const content = `
            <div class="breakdown-grid">
                ${categoryData.map(([category, count]) => `
                    <div class="breakdown-item">
                        <div class="breakdown-category">
                            <span class="category-badge ${category}">${category}</span>
                        </div>
                        <div class="breakdown-count">${count} items</div>
                    </div>
                `).join('')}
            </div>
            <div class="breakdown-total">
                <strong>Total Items: ${this.dashboardData.stats.totalItems}</strong>
            </div>
        `;

        modal.querySelector('.stat-modal-content').innerHTML = content;
        modal.style.display = 'block';
    }

    showTodaysSummary() {
        const modal = this.createStatModal("Today's Business Summary", 'todays-summary');
        const summary = this.dashboardData.todaysSummary;

        const content = `
            <div class="summary-grid">
                <div class="summary-section">
                    <h4>💰 Sales Today</h4>
                    <div class="summary-details">
                        <div class="summary-row">
                            <span>Number of Sales:</span>
                            <span><strong>${summary.salesCount}</strong></span>
                        </div>
                        <div class="summary-row">
                            <span>Sales Amount:</span>
                            <span><strong>₹${summary.salesAmount.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="summary-section">
                    <h4>🔧 Services Today</h4>
                    <div class="summary-details">
                        <div class="summary-row">
                            <span>New Service Jobs:</span>
                            <span><strong>${summary.servicesCount}</strong></span>
                        </div>
                        <div class="summary-row">
                            <span>Services Value:</span>
                            <span><strong>₹${summary.servicesAmount.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="summary-total">
                    <div class="total-row">
                        <span>Total Business Today:</span>
                        <span><strong>₹${summary.totalAmount.toFixed(2)}</strong></span>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('.stat-modal-content').innerHTML = content;
        modal.style.display = 'block';
    }

    showIncompleteServices() {
        const modal = this.createStatModal('Incomplete Services', 'incomplete-services');
        
        const content = `
            <div class="services-list">
                ${this.dashboardData.incompleteServices.length > 0 ? 
                    this.dashboardData.incompleteServices.map(job => `
                        <div class="service-item">
                            <div class="service-header">
                                <span class="job-number">${job.job_number}</span>
                                <span class="service-status ${job.status.replace('_', '-')}">${job.status.replace('_', ' ')}</span>
                            </div>
                            <div class="service-details">
                                <div class="service-customer">
                                    <strong>Customer:</strong> ${job.customer_name || 'Walk-in Customer'}
                                    ${job.customer_phone ? ` (${job.customer_phone})` : ''}
                                </div>
                                <div class="service-dates">
                                    <span><strong>Created:</strong> ${new Date(job.created_at).toLocaleDateString()}</span>
                                    ${job.approximate_delivery_date ? 
                                        `<span><strong>Expected:</strong> ${new Date(job.approximate_delivery_date).toLocaleDateString()}</span>` : ''
                                    }
                                </div>
                                <div class="service-cost">
                                    <strong>Estimated Cost:</strong> ₹${parseFloat(job.estimated_cost || 0).toFixed(2)}
                                </div>
                                <div class="service-location">
                                    <strong>Location:</strong> ${job.location.charAt(0).toUpperCase() + job.location.slice(1)}
                                </div>
                            </div>
                        </div>
                    `).join('') : 
                    '<p class="no-services">No incomplete services</p>'
                }
            </div>
        `;

        modal.querySelector('.stat-modal-content').innerHTML = content;
        modal.style.display = 'block';
    }

    showCustomersBreakdown() {
        // Simple customer count breakdown - can be expanded
        const modal = this.createStatModal('Customer Information', 'customers-info');
        
        const content = `
            <div class="customers-summary">
                <div class="summary-row">
                    <span>Total Registered Customers:</span>
                    <span><strong>${this.dashboardData.stats.totalCustomers}</strong></span>
                </div>
                <div class="customers-actions">
                    <button class="btn btn-primary" onclick="switchToCustomersModule()">
                        View All Customers
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('.stat-modal-content').innerHTML = content;
        modal.style.display = 'block';
    }

    showInvoicesBreakdown() {
        const modal = this.createStatModal('Invoices Summary', 'invoices-summary');
        
        const content = `
            <div class="invoices-summary">
                <div class="summary-row">
                    <span>Total Invoices Generated:</span>
                    <span><strong>${this.dashboardData.stats.totalInvoices}</strong></span>
                </div>
                <div class="invoices-actions">
                    <button class="btn btn-primary" onclick="switchToInvoicesModule()">
                        View All Invoices
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('.stat-modal-content').innerHTML = content;
        modal.style.display = 'block';
    }

    createStatModal(title, id) {
        // Remove existing modal if present
        const existingModal = document.getElementById('statModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'statModal';
        modal.className = 'stat-modal';
        modal.innerHTML = `
            <div class="stat-modal-dialog">
                <div class="stat-modal-header">
                    <h3>${title}</h3>
                    <span class="close-btn" onclick="document.getElementById('statModal').style.display='none'">&times;</span>
                </div>
                <div class="stat-modal-body">
                    <div class="stat-modal-content">
                        <!-- Content will be inserted here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    // Public method to refresh dashboard data
    async refreshData() {
        await this.loadEnhancedData();
    }
}

// Global functions for modal navigation
window.switchToCustomersModule = function() {
    document.getElementById('statModal').style.display = 'none';
    const customersNavItem = document.querySelector('[data-module="customers"]');
    if (customersNavItem) {
        customersNavItem.click();
    }
};

window.switchToInvoicesModule = function() {
    document.getElementById('statModal').style.display = 'none';
    const invoicesNavItem = document.querySelector('[data-module="invoices"]');
    if (invoicesNavItem) {
        invoicesNavItem.click();
    }
};

module.exports = DashboardEnhanced;