// ZEDSON WATCHCRAFT - Excel Export with Database Integration
// js/database/excel-export-db.js

/**
 * High-performance Excel Export Module
 * Database-powered exports with large dataset handling
 */

class ExcelExportDB {
    constructor() {
        this.db = null;
        this.isReady = false;
        this.exportProgress = 0;
        this.currentExport = null;
    }

    /**
     * Initialize Excel Export Module
     */
    async initialize() {
        try {
            // Wait for database to be ready
            await this.waitForDatabase();
            this.db = window.SQLiteCore;
            this.isReady = true;
            console.log('📊 Excel Export Module initialized');
            return true;
        } catch (error) {
            console.error('❌ Excel Export initialization failed:', error);
            return false;
        }
    }

    /**
     * Wait for database to be ready
     */
    async waitForDatabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkDB = () => {
                if (window.SQLiteCore && window.SQLiteCore.isDBReady()) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Database not ready'));
                } else {
                    attempts++;
                    setTimeout(checkDB, 100);
                }
            };
            
            checkDB();
        });
    }

    /**
     * Export all data to Excel
     */
    async exportAllData() {
        try {
            this.showExportProgress('Preparing comprehensive export...');
            
            const workbook = this.createWorkbook();
            
            // Export all modules
            await this.addCustomersSheet(workbook);
            await this.addInventorySheet(workbook);
            await this.addSalesSheet(workbook);
            await this.addServicesSheet(workbook);
            await this.addExpensesSheet(workbook);
            await this.addDashboardSheet(workbook);
            
            this.updateProgress(90, 'Finalizing export...');
            
            // Generate and download file
            const filename = `ZEDSON_WATCHCRAFT_Complete_Export_${this.getDateTimeString()}.xlsx`;
            await this.downloadWorkbook(workbook, filename);
            
            this.completeExport();
            Utils.showNotification('Complete data export successful!');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.hideExportProgress();
            Utils.showNotification('Export failed: ' + error.message);
        }
    }

    /**
     * Export customers data
     */
    async exportCustomers() {
        try {
            this.showExportProgress('Exporting customers...');
            
            const customers = this.db.selectAll(`
                SELECT c.*,
                       COUNT(DISTINCT s.id) as total_purchases,
                       COUNT(DISTINCT sv.id) as total_services,
                       COALESCE(SUM(s.total_amount), 0) as total_sales_value,
                       COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0) as total_services_value,
                       (COALESCE(SUM(s.total_amount), 0) + COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0)) as calculated_net_value
                FROM customers c
                LEFT JOIN sales s ON c.id = s.customer_id
                LEFT JOIN services sv ON c.id = sv.customer_id
                GROUP BY c.id
                ORDER BY calculated_net_value DESC, c.name
            `);

            const workbook = this.createWorkbook();
            this.addCustomersToWorkbook(workbook, customers);
            
            const filename = `ZEDSON_Customers_Export_${this.getDateTimeString()}.xlsx`;
            await this.downloadWorkbook(workbook, filename);
            
            this.completeExport();
            Utils.showNotification(`${customers.length} customers exported successfully!`);
            
        } catch (error) {
            console.error('Customer export failed:', error);
            this.hideExportProgress();
            Utils.showNotification('Customer export failed: ' + error.message);
        }
    }

    /**
     * Export inventory data
     */
    async exportInventory() {
        try {
            this.showExportProgress('Exporting inventory...');
            
            const inventory = this.db.selectAll(`
                SELECT i.*,
                       COUNT(s.id) as total_sold,
                       COALESCE(SUM(s.total_amount), 0) as total_revenue,
                       COALESCE(SUM(s.quantity), 0) as units_sold
                FROM inventory i
                LEFT JOIN sales s ON i.id = s.inventory_id
                GROUP BY i.id
                ORDER BY i.brand, i.model
            `);

            const workbook = this.createWorkbook();
            this.addInventoryToWorkbook(workbook, inventory);
            
            const filename = `ZEDSON_Inventory_Export_${this.getDateTimeString()}.xlsx`;
            await this.downloadWorkbook(workbook, filename);
            
            this.completeExport();
            Utils.showNotification(`${inventory.length} inventory items exported successfully!`);
            
        } catch (error) {
            console.error('Inventory export failed:', error);
            this.hideExportProgress();
            Utils.showNotification('Inventory export failed: ' + error.message);
        }
    }

    /**
     * Export sales data with date range
     */
    async exportSales(fromDate = null, toDate = null) {
        try {
            this.showExportProgress('Exporting sales data...');
            
            let whereClause = '';
            let params = [];
            
            if (fromDate && toDate) {
                whereClause = 'WHERE s.sale_date BETWEEN ? AND ?';
                params = [fromDate, toDate];
            }
            
            const sales = this.db.selectAll(`
                SELECT s.*,
                       c.name as customer_name,
                       c.phone as customer_phone,
                       c.email as customer_email,
                       i.code as item_code,
                       i.brand,
                       i.model,
                       i.type as item_type
                FROM sales s
                JOIN customers c ON s.customer_id = c.id
                JOIN inventory i ON s.inventory_id = i.id
                ${whereClause}
                ORDER BY s.sale_date DESC, s.created_at DESC
            `, params);

            const workbook = this.createWorkbook();
            this.addSalesToWorkbook(workbook, sales);
            
            const dateRange = fromDate && toDate ? `_${fromDate}_to_${toDate}` : '';
            const filename = `ZEDSON_Sales_Export${dateRange}_${this.getDateTimeString()}.xlsx`;
            await this.downloadWorkbook(workbook, filename);
            
            this.completeExport();
            Utils.showNotification(`${sales.length} sales records exported successfully!`);
            
        } catch (error) {
            console.error('Sales export failed:', error);
            this.hideExportProgress();
            Utils.showNotification('Sales export failed: ' + error.message);
        }
    }

    /**
     * Create workbook with styling
     */
    createWorkbook() {
        return {
            sheets: {},
            sheetNames: []
        };
    }

    /**
     * Add customers sheet to workbook
     */
    addCustomersToWorkbook(workbook, customers) {
        const headers = [
            'ID', 'Name', 'Email', 'Phone', 'Address', 
            'Total Purchases', 'Total Services', 'Net Value', 
            'Created Date', 'Added By'
        ];

        const data = customers.map(customer => [
            customer.id,
            customer.name,
            customer.email,
            customer.phone,
            customer.address || '',
            customer.total_purchases || 0,
            customer.total_services || 0,
            customer.calculated_net_value || 0,
            this.formatDate(customer.created_at),
            customer.added_by || ''
        ]);

        this.addSheetToWorkbook(workbook, 'Customers', headers, data);
    }

    /**
     * Add inventory sheet to workbook
     */
    addInventoryToWorkbook(workbook, inventory) {
        const headers = [
            'ID', 'Code', 'Type', 'Brand', 'Model', 'Size', 
            'Price', 'Quantity', 'Outlet', 'Status', 'Description',
            'Total Sold', 'Units Sold', 'Revenue Generated', 'Created Date'
        ];

        const data = inventory.map(item => [
            item.id,
            item.code,
            item.type,
            item.brand,
            item.model,
            item.size,
            item.price,
            item.quantity,
            item.outlet,
            item.status,
            item.description || '',
            item.total_sold || 0,
            item.units_sold || 0,
            item.total_revenue || 0,
            this.formatDate(item.created_at)
        ]);

        this.addSheetToWorkbook(workbook, 'Inventory', headers, data);
    }

    /**
     * Add sales sheet to workbook
     */
    addSalesToWorkbook(workbook, sales) {
        const headers = [
            'Sale ID', 'Date', 'Time', 'Customer Name', 'Customer Phone',
            'Item Code', 'Brand', 'Model', 'Quantity', 'Price', 
            'Subtotal', 'Discount Type', 'Discount Value', 'Discount Amount',
            'Total Amount', 'Payment Method', 'Created By'
        ];

        const data = sales.map(sale => [
            sale.id,
            sale.sale_date,
            sale.sale_time,
            sale.customer_name,
            sale.customer_phone,
            sale.item_code,
            sale.brand,
            sale.model,
            sale.quantity,
            sale.price,
            sale.subtotal,
            sale.discount_type || '',
            sale.discount_value || 0,
            sale.discount_amount || 0,
            sale.total_amount,
            sale.payment_method,
            sale.created_by || ''
        ]);

        this.addSheetToWorkbook(workbook, 'Sales', headers, data);
    }

    /**
     * Add services sheet
     */
    async addServicesSheet(workbook) {
        this.updateProgress(50, 'Processing services...');
        
        const services = this.db.selectAll(`
            SELECT s.*,
                   c.name as customer_name,
                   c.phone as customer_phone
            FROM services s
            JOIN customers c ON s.customer_id = c.id
            ORDER BY s.created_at DESC
        `);

        const headers = [
            'Service ID', 'Date', 'Customer Name', 'Customer Phone',
            'Watch Name', 'Brand', 'Model', 'Issue', 'Cost', 'Status',
            'Estimated Delivery', 'Actual Delivery', 'Warranty Period',
            'Created By'
        ];

        const data = services.map(service => [
            service.id,
            service.service_date,
            service.customer_name,
            service.customer_phone,
            service.watch_name,
            service.brand,
            service.model,
            service.issue,
            service.cost,
            service.status,
            service.estimated_delivery || '',
            service.actual_delivery || '',
            service.warranty_period || 0,
            service.created_by || ''
        ]);

        this.addSheetToWorkbook(workbook, 'Services', headers, data);
    }

    /**
     * Add expenses sheet
     */
    async addExpensesSheet(workbook) {
        this.updateProgress(60, 'Processing expenses...');
        
        const expenses = this.db.selectAll(`
            SELECT * FROM expenses
            ORDER BY expense_date DESC
        `);

        const headers = [
            'Expense ID', 'Date', 'Description', 'Amount', 'Created By'
        ];

        const data = expenses.map(expense => [
            expense.id,
            expense.expense_date,
            expense.description,
            expense.amount,
            expense.created_by || ''
        ]);

        this.addSheetToWorkbook(workbook, 'Expenses', headers, data);
    }

    /**
     * Add dashboard summary sheet
     */
    async addDashboardSheet(workbook) {
        this.updateProgress(70, 'Generating dashboard summary...');
        
        const stats = this.generateDashboardStats();
        
        const headers = ['Metric', 'Value'];
        const data = [
            ['Total Customers', stats.totalCustomers],
            ['Total Inventory Items', stats.totalItems],
            ['Total Sales', stats.totalSales],
            ['Total Sales Revenue', stats.totalSalesRevenue],
            ['Total Services', stats.totalServices],
            ['Total Service Revenue', stats.totalServiceRevenue],
            ['Total Expenses', stats.totalExpenses],
            ['Net Revenue', stats.netRevenue],
            ['Report Generated', new Date().toLocaleString()]
        ];

        this.addSheetToWorkbook(workbook, 'Dashboard Summary', headers, data);
    }

    /**
     * Generate dashboard statistics
     */
    generateDashboardStats() {
        try {
            const customerCount = this.db.selectOne('SELECT COUNT(*) as count FROM customers');
            const itemCount = this.db.selectOne('SELECT COUNT(*) as count FROM inventory');
            const salesCount = this.db.selectOne('SELECT COUNT(*) as count FROM sales');
            const salesRevenue = this.db.selectOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales');
            const serviceCount = this.db.selectOne('SELECT COUNT(*) as count FROM services');
            const serviceRevenue = this.db.selectOne('SELECT COALESCE(SUM(cost), 0) as total FROM services WHERE status = "completed"');
            const expenseTotal = this.db.selectOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses');

            const totalRevenue = (salesRevenue?.total || 0) + (serviceRevenue?.total || 0);
            const netRevenue = totalRevenue - (expenseTotal?.total || 0);

            return {
                totalCustomers: customerCount?.count || 0,
                totalItems: itemCount?.count || 0,
                totalSales: salesCount?.count || 0,
                totalSalesRevenue: salesRevenue?.total || 0,
                totalServices: serviceCount?.count || 0,
                totalServiceRevenue: serviceRevenue?.total || 0,
                totalExpenses: expenseTotal?.total || 0,
                netRevenue: netRevenue
            };
        } catch (error) {
            console.error('Failed to generate dashboard stats:', error);
            return {};
        }
    }

    /**
     * Add sheet to workbook
     */
    addSheetToWorkbook(workbook, sheetName, headers, data) {
        const ws = {
            data: [headers, ...data],
            name: sheetName
        };
        
        workbook.sheets[sheetName] = ws;
        workbook.sheetNames.push(sheetName);
    }

    /**
     * Download workbook as Excel file
     */
    async downloadWorkbook(workbook, filename) {
        try {
            // Convert to CSV format (simplified)
            let csvContent = '';
            
            for (const sheetName of workbook.sheetNames) {
                const sheet = workbook.sheets[sheetName];
                csvContent += `Sheet: ${sheetName}\n`;
                
                for (const row of sheet.data) {
                    csvContent += row.map(cell => 
                        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
                    ).join(',') + '\n';
                }
                csvContent += '\n';
            }

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename.replace('.xlsx', '.csv'));
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    /**
     * Show export progress modal
     */
    showExportProgress(message) {
        this.exportProgress = 0;
        
        const progressModal = document.createElement('div');
        progressModal.id = 'exportProgressModal';
        progressModal.className = 'modal';
        progressModal.style.display = 'block';
        progressModal.innerHTML = `
            <div class="modal-content" style="text-align: center; max-width: 400px;">
                <h3>📊 Exporting Data</h3>
                <div style="margin: 20px 0;">
                    <div style="width: 100%; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                        <div id="exportProgressBar" style="width: 0%; height: 20px; background: linear-gradient(45deg, #1a237e, #283593); transition: width 0.3s ease;"></div>
                    </div>
                    <p id="exportProgressStatus" style="margin-top: 10px; color: #666;">${message}</p>
                    <p id="exportProgressPercent" style="margin-top: 5px; font-weight: bold;">0%</p>
                </div>
                <p style="font-size: 12px; color: #999;">Please wait while we prepare your export...</p>
            </div>
        `;
        
        document.body.appendChild(progressModal);
        this.currentExport = progressModal;
    }

    /**
     * Update export progress
     */
    updateProgress(percent, message) {
        this.exportProgress = percent;
        
        const progressBar = document.getElementById('exportProgressBar');
        const statusText = document.getElementById('exportProgressStatus');
        const percentText = document.getElementById('exportProgressPercent');
        
        if (progressBar) progressBar.style.width = percent + '%';
        if (statusText) statusText.textContent = message;
        if (percentText) percentText.textContent = Math.round(percent) + '%';
    }

    /**
     * Complete export and hide progress
     */
    completeExport() {
        this.updateProgress(100, 'Export completed!');
        
        setTimeout(() => {
            this.hideExportProgress();
        }, 2000);
    }

    /**
     * Hide export progress modal
     */
    hideExportProgress() {
        if (this.currentExport) {
            this.currentExport.remove();
            this.currentExport = null;
        }
    }

    /**
     * Utility functions
     */
    getDateTimeString() {
        const now = new Date();
        return now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('en-IN');
        } catch {
            return dateString;
        }
    }
}

// Create and export instance
const excelExportDB = new ExcelExportDB();

// Auto-initialize when database is ready
document.addEventListener('DOMContentLoaded', function() {
    const initExcelExport = () => {
        if (window.SQLiteCore && window.SQLiteCore.isDBReady()) {
            excelExportDB.initialize();
        } else {
            setTimeout(initExcelExport, 100);
        }
    };
    
    initExcelExport();
});

// Global export functions
window.exportAllData = () => excelExportDB.exportAllData();
window.exportCustomers = () => excelExportDB.exportCustomers();
window.exportInventory = () => excelExportDB.exportInventory();
window.exportSales = (fromDate, toDate) => excelExportDB.exportSales(fromDate, toDate);

// Export for other modules
window.ExcelExportDB = excelExportDB;

console.log('📊 Excel Export Database module loaded');