// ZEDSON WATCHCRAFT - Sales Database Operations
// js/database/sales-db.js

/**
 * Sales Database Operations Module
 * Handles all database operations for sales management
 */

class SalesDB {
    constructor(sqliteCore) {
        this.db = sqliteCore;
        this.tableName = 'sales';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Get all sales with optional filtering
     */
    async getAllSales(filters = {}) {
        try {
            let sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    c.email as customer_email,
                    i.code as item_code,
                    i.brand || ' ' || i.model as item_name,
                    i.brand,
                    i.model,
                    i.type as item_type
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                JOIN inventory i ON s.inventory_id = i.id
            `;
            
            const params = [];
            const conditions = [];
            
            // Apply filters
            if (filters.customerId) {
                conditions.push('s.customer_id = ?');
                params.push(filters.customerId);
            }
            
            if (filters.dateFrom) {
                conditions.push('s.sale_date >= ?');
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                conditions.push('s.sale_date <= ?');
                params.push(filters.dateTo);
            }
            
            if (filters.paymentMethod) {
                conditions.push('s.payment_method = ?');
                params.push(filters.paymentMethod);
            }
            
            if (filters.minAmount) {
                conditions.push('s.total_amount >= ?');
                params.push(filters.minAmount);
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            sql += ' ORDER BY s.created_at DESC';
            
            const sales = await this.db.selectAll(sql, params);
            
            console.log(`💰 Retrieved ${sales.length} sales`);
            return sales;
            
        } catch (error) {
            console.error('Failed to get sales:', error);
            throw error;
        }
    }

    /**
     * Get single sale by ID
     */
    async getSaleById(id) {
        try {
            const cacheKey = `sale_${id}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }
            
            const sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    c.email as customer_email,
                    c.address as customer_address,
                    i.code as item_code,
                    i.brand || ' ' || i.model as item_name,
                    i.brand,
                    i.model,
                    i.type as item_type,
                    i.size
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                JOIN inventory i ON s.inventory_id = i.id
                WHERE s.id = ?
            `;
            
            const sale = await this.db.selectOne(sql, [id]);
            
            if (sale) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: sale,
                    timestamp: Date.now()
                });
            }
            
            return sale;
            
        } catch (error) {
            console.error('Failed to get sale:', error);
            throw error;
        }
    }

    /**
     * Add new sale
     */
    async addSale(saleData) {
        try {
            // Validate required fields
            const required = ['customer_id', 'inventory_id', 'quantity', 'price', 'total_amount', 'payment_method'];
            for (const field of required) {
                if (!saleData[field]) {
                    throw new Error(`Required field '${field}' is missing`);
                }
            }
            
            // Validate business rules
            if (saleData.quantity <= 0) {
                throw new Error('Quantity must be greater than 0');
            }
            
            if (saleData.price <= 0) {
                throw new Error('Price must be greater than 0');
            }
            
            if (saleData.total_amount <= 0) {
                throw new Error('Total amount must be greater than 0');
            }
            
            // Check if customer exists
            const customer = await this.db.selectOne('SELECT id, name FROM customers WHERE id = ?', [saleData.customer_id]);
            if (!customer) {
                throw new Error('Customer not found');
            }
            
            // Check if inventory item exists and has sufficient stock
            const item = await this.db.selectOne('SELECT id, code, brand, model, quantity FROM inventory WHERE id = ?', [saleData.inventory_id]);
            if (!item) {
                throw new Error('Inventory item not found');
            }
            
            if (item.quantity < saleData.quantity) {
                throw new Error(`Insufficient stock. Only ${item.quantity} available`);
            }
            
            // Prepare sale data
            const sale = {
                customer_id: saleData.customer_id,
                inventory_id: saleData.inventory_id,
                quantity: parseInt(saleData.quantity),
                price: parseFloat(saleData.price),
                subtotal: parseFloat(saleData.subtotal || saleData.price * saleData.quantity),
                discount_type: saleData.discount_type || '',
                discount_value: parseFloat(saleData.discount_value || 0),
                discount_amount: parseFloat(saleData.discount_amount || 0),
                total_amount: parseFloat(saleData.total_amount),
                payment_method: saleData.payment_method,
                status: saleData.status || 'completed',
                sale_date: saleData.sale_date || new Date().toISOString().split('T')[0],
                sale_time: saleData.sale_time || new Date().toTimeString().split(' ')[0],
                created_by: saleData.created_by || 'system',
                invoice_generated: saleData.invoice_generated || 0,
                invoice_id: saleData.invoice_id || null
            };
            
            // Start transaction
            const queries = [
                // Insert sale
                {
                    sql: `INSERT INTO ${this.tableName} (${Object.keys(sale).join(', ')}) VALUES (${Object.keys(sale).map(() => '?').join(', ')})`,
                    params: Object.values(sale)
                },
                // Update inventory quantity
                {
                    sql: 'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
                    params: [sale.quantity, sale.inventory_id]
                },
                // Update customer purchase count
                {
                    sql: 'UPDATE customers SET purchases = purchases + 1 WHERE id = ?',
                    params: [sale.customer_id]
                }
            ];
            
            const results = await this.db.executeTransaction(queries);
            
            if (results[0].insertId) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Added sale: Customer ${customer.name}, Item ${item.brand} ${item.model}, Amount ₹${sale.total_amount}`);
                
                // Log action
                if (window.logSalesAction) {
                    logSalesAction(`Added new sale: ${customer.name} - ${item.brand} ${item.model}`, {
                        ...sale,
                        id: results[0].insertId,
                        customer_name: customer.name,
                        item_name: `${item.brand} ${item.model}`
                    });
                }
                
                return { ...sale, id: results[0].insertId };
            }
            
            throw new Error('Failed to insert sale');
            
        } catch (error) {
            console.error('Failed to add sale:', error);
            throw error;
        }
    }

    /**
     * Update sale
     */
    async updateSale(id, updateData) {
        try {
            const existingSale = await this.getSaleById(id);
            if (!existingSale) {
                throw new Error('Sale not found');
            }
            
            // Start transaction to handle inventory adjustments
            const queries = [];
            
            // If quantity or inventory item changed, adjust inventory
            if (updateData.quantity !== undefined || updateData.inventory_id !== undefined) {
                const newQuantity = updateData.quantity || existingSale.quantity;
                const newInventoryId = updateData.inventory_id || existingSale.inventory_id;
                
                // Restore original inventory
                queries.push({
                    sql: 'UPDATE inventory SET quantity = quantity + ? WHERE id = ?',
                    params: [existingSale.quantity, existingSale.inventory_id]
                });
                
                // Check new inventory availability
                const newItem = await this.db.selectOne('SELECT quantity FROM inventory WHERE id = ?', [newInventoryId]);
                if (!newItem) {
                    throw new Error('New inventory item not found');
                }
                
                if (newItem.quantity < newQuantity) {
                    throw new Error(`Insufficient stock in new item. Only ${newItem.quantity} available`);
                }
                
                // Deduct from new inventory
                queries.push({
                    sql: 'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
                    params: [newQuantity, newInventoryId]
                });
            }
            
            // If customer changed, adjust customer counts
            if (updateData.customer_id !== undefined && updateData.customer_id !== existingSale.customer_id) {
                // Decrease old customer count
                queries.push({
                    sql: 'UPDATE customers SET purchases = purchases - 1 WHERE id = ?',
                    params: [existingSale.customer_id]
                });
                
                // Increase new customer count
                queries.push({
                    sql: 'UPDATE customers SET purchases = purchases + 1 WHERE id = ?',
                    params: [updateData.customer_id]
                });
            }
            
            // Prepare update data
            const updates = {};
            const allowedFields = [
                'customer_id', 'inventory_id', 'quantity', 'price', 'subtotal',
                'discount_type', 'discount_value', 'discount_amount', 'total_amount',
                'payment_method', 'sale_date', 'sale_time'
            ];
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            }
            
            if (Object.keys(updates).length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Add update query
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            queries.push({
                sql: `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
                params: [...Object.values(updates), id]
            });
            
            // Execute transaction
            const results = await this.db.executeTransaction(queries);
            
            if (results[results.length - 1].changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated sale: ${id}`);
                
                // Log action
                if (window.logSalesAction) {
                    logSalesAction(`Updated sale: ${id}`, {
                        id,
                        changes: updates
                    });
                }
                
                return await this.getSaleById(id);
            }
            
            return existingSale;
            
        } catch (error) {
            console.error('Failed to update sale:', error);
            throw error;
        }
    }

    /**
     * Delete sale
     */
    async deleteSale(id) {
        try {
            const sale = await this.getSaleById(id);
            if (!sale) {
                throw new Error('Sale not found');
            }
            
            // Start transaction to restore inventory and adjust customer count
            const queries = [
                // Restore inventory quantity
                {
                    sql: 'UPDATE inventory SET quantity = quantity + ? WHERE id = ?',
                    params: [sale.quantity, sale.inventory_id]
                },
                // Decrease customer purchase count
                {
                    sql: 'UPDATE customers SET purchases = purchases - 1 WHERE id = ? AND purchases > 0',
                    params: [sale.customer_id]
                },
                // Delete sale
                {
                    sql: `DELETE FROM ${this.tableName} WHERE id = ?`,
                    params: [id]
                }
            ];
            
            const results = await this.db.executeTransaction(queries);
            
            if (results[2].changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Deleted sale: ${id}`);
                
                // Log action
                if (window.logSalesAction) {
                    logSalesAction(`Deleted sale: ${sale.customer_name} - ${sale.item_name}`, sale);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to delete sale:', error);
            throw error;
        }
    }

    /**
     * Get sales by customer
     */
    async getSalesByCustomer(customerId) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    i.code as item_code,
                    i.brand || ' ' || i.model as item_name
                FROM ${this.tableName} s
                JOIN inventory i ON s.inventory_id = i.id
                WHERE s.customer_id = ?
                ORDER BY s.created_at DESC
            `;
            
            const sales = await this.db.selectAll(sql, [customerId]);
            return sales;
            
        } catch (error) {
            console.error('Failed to get sales by customer:', error);
            throw error;
        }
    }

    /**
     * Get sales by date range
     */
    async getSalesByDateRange(fromDate, toDate) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    i.code as item_code,
                    i.brand || ' ' || i.model as item_name
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                JOIN inventory i ON s.inventory_id = i.id
                WHERE s.sale_date >= ? AND s.sale_date <= ?
                ORDER BY s.sale_date DESC, s.sale_time DESC
            `;
            
            const sales = await this.db.selectAll(sql, [fromDate, toDate]);
            return sales;
            
        } catch (error) {
            console.error('Failed to get sales by date range:', error);
            throw error;
        }
    }

    /**
     * Get sales statistics
     */
    async getStatistics() {
        try {
            const stats = {};
            
            // Basic counts
            const totalSales = await this.db.selectOne(`SELECT COUNT(*) as count FROM ${this.tableName}`);
            stats.totalSales = totalSales ? totalSales.count : 0;
            
            // Revenue calculations
            const revenueStats = await this.db.selectOne(`
                SELECT 
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as avg_sale_value,
                    MAX(total_amount) as max_sale_value,
                    MIN(total_amount) as min_sale_value,
                    SUM(discount_amount) as total_discounts
                FROM ${this.tableName}
            `);
            
            stats.totalRevenue = revenueStats?.total_revenue || 0;
            stats.averageSaleValue = revenueStats?.avg_sale_value || 0;
            stats.maxSaleValue = revenueStats?.max_sale_value || 0;
            stats.minSaleValue = revenueStats?.min_sale_value || 0;
            stats.totalDiscounts = revenueStats?.total_discounts || 0;
            
            // Today's sales
            const today = new Date().toISOString().split('T')[0];
            const todayStats = await this.db.selectOne(`
                SELECT 
                    COUNT(*) as count,
                    SUM(total_amount) as revenue
                FROM ${this.tableName}
                WHERE sale_date = ?
            `, [today]);
            
            stats.todaySalesCount = todayStats?.count || 0;
            stats.todayRevenue = todayStats?.revenue || 0;
            
            // Payment method breakdown
            const paymentMethods = await this.db.selectAll(`
                SELECT 
                    payment_method,
                    COUNT(*) as count,
                    SUM(total_amount) as total_amount
                FROM ${this.tableName}
                GROUP BY payment_method
                ORDER BY total_amount DESC
            `);
            stats.paymentMethods = paymentMethods;
            
            // Top selling items
            const topItems = await this.db.selectAll(`
                SELECT 
                    i.brand || ' ' || i.model as item_name,
                    i.code,
                    COUNT(*) as sales_count,
                    SUM(s.quantity) as total_quantity,
                    SUM(s.total_amount) as total_revenue
                FROM ${this.tableName} s
                JOIN inventory i ON s.inventory_id = i.id
                GROUP BY s.inventory_id
                ORDER BY total_revenue DESC
                LIMIT 10
            `);
            stats.topSellingItems = topItems;
            
            // Monthly sales trend (last 12 months)
            const monthlySales = await this.db.selectAll(`
                SELECT 
                    strftime('%Y-%m', sale_date) as month,
                    COUNT(*) as sales_count,
                    SUM(total_amount) as revenue
                FROM ${this.tableName}
                WHERE sale_date >= date('now', '-12 months')
                GROUP BY strftime('%Y-%m', sale_date)
                ORDER BY month
            `);
            stats.monthlySales = monthlySales;
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get sales statistics:', error);
            throw error;
        }
    }

    /**
     * Search sales
     */
    async searchSales(searchTerm, filters = {}) {
        try {
            let sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    i.code as item_code,
                    i.brand || ' ' || i.model as item_name
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                JOIN inventory i ON s.inventory_id = i.id
                WHERE (
                    c.name LIKE ? OR 
                    c.phone LIKE ? OR 
                    i.code LIKE ? OR 
                    i.brand LIKE ? OR 
                    i.model LIKE ?
                )
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
            
            // Apply additional filters
            if (filters.dateFrom) {
                sql += ' AND s.sale_date >= ?';
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                sql += ' AND s.sale_date <= ?';
                params.push(filters.dateTo);
            }
            
            if (filters.paymentMethod) {
                sql += ' AND s.payment_method = ?';
                params.push(filters.paymentMethod);
            }
            
            sql += ' ORDER BY s.created_at DESC';
            
            const sales = await this.db.selectAll(sql, params);
            return sales;
            
        } catch (error) {
            console.error('Failed to search sales:', error);
            throw error;
        }
    }

    /**
     * Get recent sales
     */
    async getRecentSales(limit = 10) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    i.code as item_code,
                    i.brand || ' ' || i.model as item_name
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                JOIN inventory i ON s.inventory_id = i.id
                ORDER BY s.created_at DESC
                LIMIT ?
            `;
            
            const sales = await this.db.selectAll(sql, [limit]);
            return sales;
            
        } catch (error) {
            console.error('Failed to get recent sales:', error);
            throw error;
        }
    }

    /**
     * Export sales data
     */
    async exportData(format = 'json', filters = {}) {
        try {
            const sales = await this.getAllSales(filters);
            
            if (format === 'json') {
                return JSON.stringify(sales, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(sales);
            }
            
            throw new Error('Unsupported export format');
            
        } catch (error) {
            console.error('Failed to export sales data:', error);
            throw error;
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(sales) {
        if (!sales || sales.length === 0) {
            return '';
        }
        
        const headers = [
            'ID', 'Date', 'Time', 'Customer', 'Phone', 'Item Code', 'Item Name', 
            'Quantity', 'Price', 'Subtotal', 'Discount', 'Total Amount', 'Payment Method'
        ];
        
        const csvRows = [headers.join(',')];
        
        for (const sale of sales) {
            const row = [
                sale.id,
                sale.sale_date,
                sale.sale_time,
                `"${sale.customer_name}"`,
                sale.customer_phone,
                sale.item_code,
                `"${sale.item_name}"`,
                sale.quantity,
                sale.price,
                sale.subtotal,
                sale.discount_amount || 0,
                sale.total_amount,
                sale.payment_method
            ];
            csvRows.push(row.join(','));
        }
        
        return csvRows.join('\n');
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Sales cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Create and export instance
let salesDB = null;

// Initialize when SQLite core is ready
document.addEventListener('DOMContentLoaded', function() {
    const initSalesDB = () => {
        if (window.SQLiteCore && window.SQLiteCore.isReady()) {
            salesDB = new SalesDB(window.SQLiteCore);
            window.SalesDB = salesDB;
            console.log('💰 Sales Database module initialized');
        } else {
            setTimeout(initSalesDB, 100);
        }
    };
    
    initSalesDB();
});

// Export for use by other modules
window.SalesDB = salesDB;