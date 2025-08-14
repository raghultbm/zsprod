const { allQuery, getQuery, runQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Ledger {
    constructor() {
        this.currentDate = Utils.getCurrentDate();
        this.selectedDate = Utils.getCurrentDate();
        this.todaysSummary = {
            sales: { count: 0, amount: 0 },
            services: { count: 0, amount: 0 },
            expenses: { count: 0, amount: 0 },
            netAmount: 0
        };
    }

    async render() {
        return `
            <div class="ledger-container">
                <!-- Date Selection -->
                <div class="date-selection-bar">
                    <div class="date-controls">
                        <label for="ledger-date">Select Date:</label>
                        <input type="date" id="ledger-date" value="${this.selectedDate}" onchange="ledger.changeDate(this.value)">
                        <button class="btn btn-secondary" onclick="ledger.changeDate('${Utils.getCurrentDate()}')">Today</button>
                        <button class="btn btn-primary" onclick="ledger.loadLedgerData()">Refresh</button>
                    </div>
                    <div class="cob-controls">
                        <button class="btn btn-success" onclick="ledger.showCOBSummary()" id="cob-btn">
                            Close of Business (COB)
                        </button>
                    </div>
                </div>

                <!-- Business Summary Cards -->
                <div class="business-summary">
                    <div class="summary-card sales-card">
                        <div class="card-header">
                            <h3>Sales</h3>
                            <span class="card-icon">💰</span>
                        </div>
                        <div class="card-body">
                            <div class="summary-value" id="sales-amount">₹0.00</div>
                            <div class="summary-detail">
                                <span id="sales-count">0</span> transactions
                            </div>
                        </div>
                    </div>

                    <div class="summary-card services-card">
                        <div class="card-header">
                            <h3>Services</h3>
                            <span class="card-icon">🔧</span>
                        </div>
                        <div class="card-body">
                            <div class="summary-value" id="services-amount">₹0.00</div>
                            <div class="summary-detail">
                                <span id="services-count">0</span> completed
                            </div>
                        </div>
                    </div>

                    <div class="summary-card expenses-card">
                        <div class="card-header">
                            <h3>Expenses</h3>
                            <span class="card-icon">💸</span>
                        </div>
                        <div class="card-body">
                            <div class="summary-value" id="expenses-amount">₹0.00</div>
                            <div class="summary-detail">
                                <span id="expenses-count">0</span> entries
                            </div>
                        </div>
                    </div>

                    <div class="summary-card net-card">
                        <div class="card-header">
                            <h3>Net Amount</h3>
                            <span class="card-icon">📊</span>
                        </div>
                        <div class="card-body">
                            <div class="summary-value" id="net-amount">₹0.00</div>
                            <div class="summary-detail" id="net-status">
                                Revenue - Expenses
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Breakdown -->
                <div class="ledger-details">
                    <!-- Sales Section -->
                    <div class="detail-section">
                        <div class="section-header">
                            <h4>Sales Transactions</h4>
                            <button class="btn btn-sm btn-secondary" onclick="ledger.exportSales()" id="export-sales-btn">
                                Export
                            </button>
                        </div>
                        <div class="table-container">
                            <table class="table" id="sales-table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Payment Mode</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody id="sales-tbody">
                                    <tr><td colspan="5" class="text-center">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Services Section -->
                    <div class="detail-section">
                        <div class="section-header">
                            <h4>Service Transactions</h4>
                            <button class="btn btn-sm btn-secondary" onclick="ledger.exportServices()" id="export-services-btn">
                                Export
                            </button>
                        </div>
                        <div class="table-container">
                            <table class="table" id="services-table">
                                <thead>
                                    <tr>
                                        <th>Service #</th>
                                        <th>Customer</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody id="services-tbody">
                                    <tr><td colspan="5" class="text-center">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Expenses Section -->
                    <div class="detail-section">
                        <div class="section-header">
                            <h4>Expenses</h4>
                            <button class="btn btn-sm btn-secondary" onclick="ledger.exportExpenses()" id="export-expenses-btn">
                                Export
                            </button>
                        </div>
                        <div class="table-container">
                            <table class="table" id="expenses-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Payment Mode</th>
                                        <th>Added By</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody id="expenses-tbody">
                                    <tr><td colspan="5" class="text-center">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            await this.loadLedgerData();
        } catch (error) {
            console.error('Ledger module initialization error:', error);
            window.app.showMessage('Failed to load ledger data', 'error');
        }
    }

    async changeDate(date) {
        this.selectedDate = date;
        document.getElementById('ledger-date').value = date;
        
        // Update COB button visibility
        const cobBtn = document.getElementById('cob-btn');
        if (cobBtn) {
            if (date === Utils.getCurrentDate()) {
                cobBtn.style.display = 'block';
                cobBtn.textContent = 'Close of Business (COB)';
            } else {
                cobBtn.style.display = 'block';
                cobBtn.textContent = `View ${Utils.formatDate(date)} Summary`;
            }
        }
        
        await this.loadLedgerData();
    }

    async loadLedgerData() {
        try {
            // Load sales for selected date
            const sales = await allQuery(`
                SELECT s.*, c.name as customer_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE DATE(s.sale_date) = DATE(?) AND s.status = 'completed'
                ORDER BY s.created_at DESC
            `, [this.selectedDate]);

            // Load services for selected date
            const services = await allQuery(`
                SELECT s.*, c.name as customer_name
                FROM services s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE DATE(s.service_date) = DATE(?) AND s.status = 'Service Completed'
                ORDER BY s.created_at DESC
            `, [this.selectedDate]);

            // Load expenses for selected date
            const expenses = await allQuery(`
                SELECT * FROM expenses
                WHERE DATE(date) = DATE(?)
                ORDER BY created_at DESC
            `, [this.selectedDate]);

            // Calculate summary
            this.todaysSummary = {
                sales: {
                    count: sales.length,
                    amount: sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0),
                    data: sales
                },
                services: {
                    count: services.length,
                    amount: services.reduce((sum, service) => sum + parseFloat(service.total_amount), 0),
                    data: services
                },
                expenses: {
                    count: expenses.length,
                    amount: expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0),
                    data: expenses
                }
            };

            this.todaysSummary.netAmount = 
                this.todaysSummary.sales.amount + 
                this.todaysSummary.services.amount - 
                this.todaysSummary.expenses.amount;

            this.updateSummaryCards();
            this.updateDetailTables();

        } catch (error) {
            console.error('Error loading ledger data:', error);
            window.app.showMessage('Failed to load ledger data', 'error');
        }
    }

    updateSummaryCards() {
        // Update sales card
        document.getElementById('sales-amount').textContent = 
            Utils.formatCurrency(this.todaysSummary.sales.amount);
        document.getElementById('sales-count').textContent = 
            this.todaysSummary.sales.count;

        // Update services card
        document.getElementById('services-amount').textContent = 
            Utils.formatCurrency(this.todaysSummary.services.amount);
        document.getElementById('services-count').textContent = 
            this.todaysSummary.services.count;

        // Update expenses card
        document.getElementById('expenses-amount').textContent = 
            Utils.formatCurrency(this.todaysSummary.expenses.amount);
        document.getElementById('expenses-count').textContent = 
            this.todaysSummary.expenses.count;

        // Update net amount card
        const netAmountEl = document.getElementById('net-amount');
        const netStatusEl = document.getElementById('net-status');
        
        netAmountEl.textContent = Utils.formatCurrency(this.todaysSummary.netAmount);
        
        if (this.todaysSummary.netAmount > 0) {
            netAmountEl.style.color = '#27ae60';
            netStatusEl.textContent = 'Profit';
            netStatusEl.style.color = '#27ae60';
        } else if (this.todaysSummary.netAmount < 0) {
            netAmountEl.style.color = '#e74c3c';
            netStatusEl.textContent = 'Loss';
            netStatusEl.style.color = '#e74c3c';
        } else {
            netAmountEl.style.color = '#666';
            netStatusEl.textContent = 'Break Even';
            netStatusEl.style.color = '#666';
        }
    }

    updateDetailTables() {
        this.updateSalesTable();
        this.updateServicesTable();
        this.updateExpensesTable();
    }

    updateSalesTable() {
        const tbody = document.getElementById('sales-tbody');
        if (!tbody) return;

        if (this.todaysSummary.sales.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No sales found</td></tr>';
            return;
        }

        let html = '';
        this.todaysSummary.sales.data.forEach(sale => {
            html += `
                <tr>
                    <td><strong>${sale.invoice_number}</strong></td>
                    <td>${sale.customer_name || 'Unknown'}</td>
                    <td>${Utils.formatCurrency(sale.total_amount)}</td>
                    <td>${sale.payment_mode}</td>
                    <td>${Utils.formatDate(sale.created_at, 'HH:mm')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    updateServicesTable() {
        const tbody = document.getElementById('services-tbody');
        if (!tbody) return;

        if (this.todaysSummary.services.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No services found</td></tr>';
            return;
        }

        let html = '';
        this.todaysSummary.services.data.forEach(service => {
            const serviceNumber = service.invoice_number || service.acknowledgement_number || service.id;
            html += `
                <tr>
                    <td><strong>${serviceNumber}</strong></td>
                    <td>${service.customer_name || 'Unknown'}</td>
                    <td>${Utils.capitalize(service.service_type)}</td>
                    <td>${Utils.formatCurrency(service.total_amount)}</td>
                    <td>${Utils.formatDate(service.created_at, 'HH:mm')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    updateExpensesTable() {
        const tbody = document.getElementById('expenses-tbody');
        if (!tbody) return;

        if (this.todaysSummary.expenses.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No expenses found</td></tr>';
            return;
        }

        let html = '';
        this.todaysSummary.expenses.data.forEach(expense => {
            html += `
                <tr>
                    <td>${expense.description}</td>
                    <td>${Utils.formatCurrency(expense.amount)}</td>
                    <td>${expense.payment_mode}</td>
                    <td>${expense.created_by}</td>
                    <td>${Utils.formatDate(expense.created_at, 'HH:mm')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async showCOBSummary() {
        const isToday = this.selectedDate === Utils.getCurrentDate();
        const title = isToday ? 'Close of Business Summary' : `Business Summary - ${Utils.formatDate(this.selectedDate)}`;
        
        const totalRevenue = this.todaysSummary.sales.amount + this.todaysSummary.services.amount;
        const totalTransactions = this.todaysSummary.sales.count + this.todaysSummary.services.count;

        const content = `
            <div class="cob-summary">
                <div class="cob-header">
                    <h3>${Utils.formatDate(this.selectedDate, 'DD MMM YYYY')}</h3>
                    <p>Business Summary Report</p>
                </div>

                <div class="cob-metrics">
                    <div class="metric-group">
                        <h4>Revenue Breakdown</h4>
                        <div class="metric-item">
                            <span>Sales Revenue:</span>
                            <span>${Utils.formatCurrency(this.todaysSummary.sales.amount)} (${this.todaysSummary.sales.count} transactions)</span>
                        </div>
                        <div class="metric-item">
                            <span>Service Revenue:</span>
                            <span>${Utils.formatCurrency(this.todaysSummary.services.amount)} (${this.todaysSummary.services.count} services)</span>
                        </div>
                        <div class="metric-item total">
                            <span><strong>Total Revenue:</strong></span>
                            <span><strong>${Utils.formatCurrency(totalRevenue)}</strong></span>
                        </div>
                    </div>

                    <div class="metric-group">
                        <h4>Expenses</h4>
                        <div class="metric-item">
                            <span>Total Expenses:</span>
                            <span>${Utils.formatCurrency(this.todaysSummary.expenses.amount)} (${this.todaysSummary.expenses.count} entries)</span>
                        </div>
                    </div>

                    <div class="metric-group">
                        <h4>Net Performance</h4>
                        <div class="metric-item ${this.todaysSummary.netAmount >= 0 ? 'positive' : 'negative'}">
                            <span><strong>Net Amount:</strong></span>
                            <span><strong>${Utils.formatCurrency(this.todaysSummary.netAmount)}</strong></span>
                        </div>
                        <div class="metric-item">
                            <span>Total Transactions:</span>
                            <span>${totalTransactions}</span>
                        </div>
                    </div>
                </div>

                <div class="cob-actions">
                    <p class="note">This summary can be exported for record keeping.</p>
                </div>
            </div>
        `;

        const actions = isToday ? `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            <button class="btn btn-info" onclick="ledger.exportCOBSummary()">Export as JPEG</button>
            <button class="btn btn-success" onclick="ledger.exportCOBExcel()">Export as Excel</button>
            <button class="btn btn-primary" onclick="ledger.confirmCOB()">Confirm COB</button>
        ` : `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            <button class="btn btn-info" onclick="ledger.exportCOBSummary()">Export as JPEG</button>
            <button class="btn btn-success" onclick="ledger.exportCOBExcel()">Export as Excel</button>
        `;

        window.app.showModal(title, content, actions, 'large-modal');
    }

    async confirmCOB() {
        if (this.selectedDate !== Utils.getCurrentDate()) {
            window.app.showMessage('COB can only be closed for today', 'error');
            return;
        }

        window.app.showConfirm(
            'Are you sure you want to close business for today? This will finalize all transactions and create a permanent record.',
            async () => {
                try {
                    // Log COB action
                    await auditLogger.logAction('LEDGER', 'COB_CLOSE', this.selectedDate, null, {
                        date: this.selectedDate,
                        sales_amount: this.todaysSummary.sales.amount,
                        sales_count: this.todaysSummary.sales.count,
                        services_amount: this.todaysSummary.services.amount,
                        services_count: this.todaysSummary.services.count,
                        expenses_amount: this.todaysSummary.expenses.amount,
                        expenses_count: this.todaysSummary.expenses.count,
                        net_amount: this.todaysSummary.netAmount
                    });

                    // Close modal and show success
                    document.querySelector('.modal-overlay').remove();
                    window.app.showMessage('Close of Business completed successfully', 'success');
                    
                } catch (error) {
                    console.error('Error confirming COB:', error);
                    window.app.showMessage('Failed to close business', 'error');
                }
            }
        );
    }

    async exportCOBSummary() {
        try {
            // Create a simple HTML summary for export
            const summaryHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2c3e50; margin-bottom: 5px;">ZEDSON Watchcraft</h1>
                        <h2 style="color: #666; margin-bottom: 20px;">Close of Business Summary</h2>
                        <h3 style="color: #2c3e50;">${Utils.formatDate(this.selectedDate, 'DD MMM YYYY')}</h3>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #2c3e50; margin-bottom: 15px;">Revenue Summary</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Sales Revenue (${this.todaysSummary.sales.count} transactions):</span>
                            <strong>${Utils.formatCurrency(this.todaysSummary.sales.amount)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Service Revenue (${this.todaysSummary.services.count} services):</span>
                            <strong>${Utils.formatCurrency(this.todaysSummary.services.amount)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
                            <span><strong>Total Revenue:</strong></span>
                            <strong>${Utils.formatCurrency(this.todaysSummary.sales.amount + this.todaysSummary.services.amount)}</strong>
                        </div>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #856404; margin-bottom: 15px;">Expenses</h3>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Total Expenses (${this.todaysSummary.expenses.count} entries):</span>
                            <strong>${Utils.formatCurrency(this.todaysSummary.expenses.amount)}</strong>
                        </div>
                    </div>
                    
                    <div style="background: ${this.todaysSummary.netAmount >= 0 ? '#d4edda' : '#f8d7da'}; padding: 20px; border-radius: 8px;">
                        <h3 style="color: ${this.todaysSummary.netAmount >= 0 ? '#155724' : '#721c24'}; margin-bottom: 15px;">Net Performance</h3>
                        <div style="display: flex; justify-content: space-between; font-size: 1.2em;">
                            <span><strong>Net Amount:</strong></span>
                            <strong style="color: ${this.todaysSummary.netAmount >= 0 ? '#155724' : '#721c24'};">${Utils.formatCurrency(this.todaysSummary.netAmount)}</strong>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; font-size: 0.9em; color: #666;">
                        <p>Generated on ${Utils.formatDate(new Date(), 'DD MMM YYYY HH:mm')}</p>
                        <p>ZEDSON Watchcraft - Semmancheri</p>
                    </div>
                </div>
            `;

            // Create HTML file for download
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>COB Summary - ${Utils.formatDate(this.selectedDate)}</title>
                    <meta charset="UTF-8">
                </head>
                <body>
                    ${summaryHtml}
                </body>
                </html>
            `;

            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `COB_Summary_${this.selectedDate}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            window.app.showMessage('COB summary exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting COB summary:', error);
            window.app.showMessage('Failed to export summary', 'error');
        }
    }

    async exportCOBExcel() {
        try {
            // Create CSV data for Excel
            const csvData = [];
            
            // Add header
            csvData.push(['ZEDSON Watchcraft - COB Summary']);
            csvData.push([`Date: ${Utils.formatDate(this.selectedDate, 'DD MMM YYYY')}`]);
            csvData.push(['']);
            
            // Revenue section
            csvData.push(['REVENUE SUMMARY']);
            csvData.push(['Type', 'Count', 'Amount']);
            csvData.push(['Sales', this.todaysSummary.sales.count, this.todaysSummary.sales.amount]);
            csvData.push(['Services', this.todaysSummary.services.count, this.todaysSummary.services.amount]);
            csvData.push(['Total Revenue', this.todaysSummary.sales.count + this.todaysSummary.services.count, this.todaysSummary.sales.amount + this.todaysSummary.services.amount]);
            csvData.push(['']);
            
            // Expenses section
            csvData.push(['EXPENSES']);
            csvData.push(['Total Expenses', this.todaysSummary.expenses.count, this.todaysSummary.expenses.amount]);
            csvData.push(['']);
            
            // Net amount
            csvData.push(['NET PERFORMANCE']);
            csvData.push(['Net Amount', '', this.todaysSummary.netAmount]);

            // Convert to CSV
            const csvContent = csvData.map(row => 
                row.map(cell => `"${cell}"`).join(',')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `COB_Summary_${this.selectedDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            window.app.showMessage('COB summary exported as CSV', 'success');

        } catch (error) {
            console.error('Error exporting to Excel:', error);
            window.app.showMessage('Failed to export to Excel', 'error');
        }
    }

    async exportSales() {
        try {
            if (this.todaysSummary.sales.data.length === 0) {
                window.app.showMessage('No sales data to export', 'info');
                return;
            }

            const salesData = this.todaysSummary.sales.data.map(sale => ({
                'Invoice Number': sale.invoice_number,
                'Customer': sale.customer_name || 'Unknown',
                'Amount': sale.total_amount,
                'Payment Mode': sale.payment_mode,
                'Sale Date': Utils.formatDate(sale.sale_date),
                'Time': Utils.formatDate(sale.created_at, 'HH:mm')
            }));

            Utils.exportToCSV(salesData, `Sales_${this.selectedDate}.csv`);
            window.app.showMessage('Sales data exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting sales:', error);
            window.app.showMessage('Failed to export sales data', 'error');
        }
    }

    async exportServices() {
        try {
            if (this.todaysSummary.services.data.length === 0) {
                window.app.showMessage('No services data to export', 'info');
                return;
            }

            const servicesData = this.todaysSummary.services.data.map(service => ({
                'Service Number': service.invoice_number || service.acknowledgement_number || service.id,
                'Customer': service.customer_name || 'Unknown',
                'Type': Utils.capitalize(service.service_type),
                'Amount': service.total_amount,
                'Service Date': Utils.formatDate(service.service_date),
                'Time': Utils.formatDate(service.created_at, 'HH:mm')
            }));

            Utils.exportToCSV(servicesData, `Services_${this.selectedDate}.csv`);
            window.app.showMessage('Services data exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting services:', error);
            window.app.showMessage('Failed to export services data', 'error');
        }
    }

    async exportExpenses() {
        try {
            if (this.todaysSummary.expenses.data.length === 0) {
                window.app.showMessage('No expenses data to export', 'info');
                return;
            }

            const expensesData = this.todaysSummary.expenses.data.map(expense => ({
                'Description': expense.description,
                'Amount': expense.amount,
                'Payment Mode': expense.payment_mode,
                'Added By': expense.created_by,
                'Date': Utils.formatDate(expense.date),
                'Time': Utils.formatDate(expense.created_at, 'HH:mm')
            }));

            Utils.exportToCSV(expensesData, `Expenses_${this.selectedDate}.csv`);
            window.app.showMessage('Expenses data exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting expenses:', error);
            window.app.showMessage('Failed to export expenses data', 'error');
        }
    }

    async getMonthlyReport(month, year) {
        try {
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            const monthlySales = await allQuery(`
                SELECT SUM(total_amount) as total, COUNT(*) as count
                FROM sales 
                WHERE DATE(sale_date) BETWEEN ? AND ? AND status = 'completed'
            `, [startDate, endDate]);

            const monthlyServices = await allQuery(`
                SELECT SUM(total_amount) as total, COUNT(*) as count
                FROM services 
                WHERE DATE(service_date) BETWEEN ? AND ? AND status = 'Service Completed'
            `, [startDate, endDate]);

            const monthlyExpenses = await allQuery(`
                SELECT SUM(amount) as total, COUNT(*) as count
                FROM expenses 
                WHERE DATE(date) BETWEEN ? AND ?
            `, [startDate, endDate]);

            return {
                sales: { amount: monthlySales[0]?.total || 0, count: monthlySales[0]?.count || 0 },
                services: { amount: monthlyServices[0]?.total || 0, count: monthlyServices[0]?.count || 0 },
                expenses: { amount: monthlyExpenses[0]?.total || 0, count: monthlyExpenses[0]?.count || 0 }
            };

        } catch (error) {
            console.error('Error getting monthly report:', error);
            return { sales: { amount: 0, count: 0 }, services: { amount: 0, count: 0 }, expenses: { amount: 0, count: 0 } };
        }
    }

    async refresh() {
        await this.loadLedgerData();
    }
}

// Make ledger instance available globally for event handlers
window.ledger = null;

// Export the class
export default Ledger;

// Set up global ledger instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'ledger') {
        window.ledger = window.app.modules.ledger;
    }
});