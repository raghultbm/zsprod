// ZEDSON WATCHCRAFT - Inventory Database Operations
// js/database/inventory-db.js

/**
 * Inventory Database Operations Module
 * Handles all database operations for inventory/watches management
 */

class InventoryDB {
    constructor(sqliteCore) {
        this.db = sqliteCore;
        this.tableName = 'inventory';
        this.movementTableName = 'inventory_movements';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Get all inventory items with optional filtering
     */
    async getAllItems(filters = {}) {
        try {
            let sql = `
                SELECT 
                    i.*,
                    COUNT(im.id) as movement_count,
                    MAX(im.movement_date) as last_movement_date
                FROM ${this.tableName} i
                LEFT JOIN ${this.movementTableName} im ON i.id = im.inventory_id
            `;
            
            const params = [];
            const conditions = [];
            
            // Apply filters
            if (filters.outlet) {
                conditions.push('i.outlet = ?');
                params.push(filters.outlet);
            }
            
            if (filters.type) {
                conditions.push('i.type = ?');
                params.push(filters.type);
            }
            
            if (filters.status) {
                conditions.push('i.status = ?');
                params.push(filters.status);
            }
            
            if (filters.brand) {
                conditions.push('i.brand LIKE ?');
                params.push(`%${filters.brand}%`);
            }
            
            if (filters.lowStock) {
                conditions.push('i.quantity <= ?');
                params.push(filters.lowStock || 5);
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            sql += ' GROUP BY i.id ORDER BY i.created_at DESC';
            
            const items = await this.db.selectAll(sql, params);
            
            console.log(`📦 Retrieved ${items.length} inventory items`);
            return items;
            
        } catch (error) {
            console.error('Failed to get inventory items:', error);
            throw error;
        }
    }

    /**
     * Get single inventory item by ID
     */
    async getItemById(id) {
        try {
            const cacheKey = `item_${id}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }
            
            const sql = `
                SELECT i.*, 
                       COUNT(s.id) as total_sold,
                       COALESCE(SUM(s.total_amount), 0) as total_revenue
                FROM ${this.tableName} i
                LEFT JOIN sales s ON i.id = s.inventory_id
                WHERE i.id = ?
                GROUP BY i.id
            `;
            
            const item = await this.db.selectOne(sql, [id]);
            
            if (item) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: item,
                    timestamp: Date.now()
                });
            }
            
            return item;
            
        } catch (error) {
            console.error('Failed to get inventory item:', error);
            throw error;
        }
    }

    /**
     * Get inventory item by code
     */
    async getItemByCode(code) {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE code = ? LIMIT 1`;
            const item = await this.db.selectOne(sql, [code]);
            return item;
            
        } catch (error) {
            console.error('Failed to get inventory item by code:', error);
            throw error;
        }
    }

    /**
     * Get available items for sale
     */
    async getAvailableItems() {
        try {
            const sql = `
                SELECT * FROM ${this.tableName} 
                WHERE status = 'available' AND quantity > 0 
                ORDER BY brand, model
            `;
            
            const items = await this.db.selectAll(sql);
            return items;
            
        } catch (error) {
            console.error('Failed to get available items:', error);
            throw error;
        }
    }

    /**
     * Add new inventory item
     */
    async addItem(itemData) {
        try {
            // Validate required fields
            const required = ['code', 'type', 'brand', 'model', 'price', 'quantity', 'outlet'];
            for (const field of required) {
                if (!itemData[field]) {
                    throw new Error(`Required field '${field}' is missing`);
                }
            }
            
            // Check if code already exists
            const existing = await this.getItemByCode(itemData.code);
            if (existing) {
                throw new Error(`Item with code '${itemData.code}' already exists`);
            }
            
            // Prepare item data
            const item = {
                code: itemData.code,
                type: itemData.type,
                brand: itemData.brand,
                model: itemData.model,
                size: itemData.size || '-',
                price: parseFloat(itemData.price),
                quantity: parseInt(itemData.quantity),
                outlet: itemData.outlet,
                description: itemData.description || '',
                status: parseInt(itemData.quantity) > 0 ? 'available' : 'sold',
                added_by: itemData.addedBy || 'system'
            };
            
            // Insert item
            const result = await this.db.insert(this.tableName, item);
            
            if (result.insertId) {
                // Create initial movement record
                await this.addMovementRecord({
                    inventory_id: result.insertId,
                    movement_date: new Date().toISOString().split('T')[0],
                    from_outlet: null,
                    to_outlet: item.outlet,
                    reason: 'Initial stock',
                    moved_by: item.added_by
                });
                
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Added inventory item: ${item.code}`);
                
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction(`Added new inventory item: ${item.brand} ${item.model}`, {
                        ...item,
                        id: result.insertId
                    });
                }
                
                return { ...item, id: result.insertId };
            }
            
            throw new Error('Failed to insert inventory item');
            
        } catch (error) {
            console.error('Failed to add inventory item:', error);
            throw error;
        }
    }

    /**
     * Update inventory item
     */
    async updateItem(id, updateData) {
        try {
            const existingItem = await this.getItemById(id);
            if (!existingItem) {
                throw new Error('Inventory item not found');
            }
            
            // Check if code is being changed and if it conflicts
            if (updateData.code && updateData.code !== existingItem.code) {
                const existingCode = await this.getItemByCode(updateData.code);
                if (existingCode && existingCode.id !== id) {
                    throw new Error(`Item with code '${updateData.code}' already exists`);
                }
            }
            
            // Prepare update data
            const updates = {};
            const allowedFields = ['code', 'type', 'brand', 'model', 'size', 'price', 'quantity', 'outlet', 'description', 'status'];
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            }
            
            // Auto-update status based on quantity
            if (updates.quantity !== undefined) {
                updates.status = parseInt(updates.quantity) > 0 ? 'available' : 'sold';
            }
            
            if (Object.keys(updates).length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Handle outlet change - create movement record
            if (updates.outlet && updates.outlet !== existingItem.outlet) {
                await this.addMovementRecord({
                    inventory_id: id,
                    movement_date: updateData.movementDate || new Date().toISOString().split('T')[0],
                    from_outlet: existingItem.outlet,
                    to_outlet: updates.outlet,
                    reason: updateData.movementReason || 'Stock Transfer',
                    moved_by: updateData.movedBy || 'system'
                });
            }
            
            // Update item
            const result = await this.db.update(this.tableName, updates, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated inventory item: ${id}`);
                
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction(`Updated inventory item: ${existingItem.brand} ${existingItem.model}`, {
                        id,
                        changes: updates
                    });
                }
                
                return await this.getItemById(id);
            }
            
            return existingItem;
            
        } catch (error) {
            console.error('Failed to update inventory item:', error);
            throw error;
        }
    }

    /**
     * Delete inventory item
     */
    async deleteItem(id) {
        try {
            const item = await this.getItemById(id);
            if (!item) {
                throw new Error('Inventory item not found');
            }
            
            // Check if item has been sold (has sales records)
            const salesCheck = await this.db.selectOne(
                'SELECT COUNT(*) as count FROM sales WHERE inventory_id = ?',
                [id]
            );
            
            if (salesCheck && salesCheck.count > 0) {
                throw new Error('Cannot delete item that has sales records. Consider marking as discontinued instead.');
            }
            
            // Delete movement records first (foreign key constraint)
            await this.db.delete(this.movementTableName, 'inventory_id = ?', [id]);
            
            // Delete item
            const result = await this.db.delete(this.tableName, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Deleted inventory item: ${item.code}`);
                
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction(`Deleted inventory item: ${item.brand} ${item.model}`, item);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to delete inventory item:', error);
            throw error;
        }
    }

    /**
     * Update item quantity (for sales/returns)
     */
    async updateQuantity(id, quantityChange, reason = 'Quantity adjustment') {
        try {
            const item = await this.getItemById(id);
            if (!item) {
                throw new Error('Inventory item not found');
            }
            
            const newQuantity = Math.max(0, item.quantity + quantityChange);
            const newStatus = newQuantity > 0 ? 'available' : 'sold';
            
            const result = await this.db.update(
                this.tableName,
                { quantity: newQuantity, status: newStatus },
                'id = ?',
                [id]
            );
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated quantity for item ${id}: ${item.quantity} → ${newQuantity}`);
                
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction(`${reason}: ${item.brand} ${item.model}`, {
                        id,
                        oldQuantity: item.quantity,
                        newQuantity,
                        change: quantityChange
                    }, quantityChange);
                }
                
                return await this.getItemById(id);
            }
            
            return item;
            
        } catch (error) {
            console.error('Failed to update item quantity:', error);
            throw error;
        }
    }

    /**
     * Add movement record
     */
    async addMovementRecord(movementData) {
        try {
            const movement = {
                inventory_id: movementData.inventory_id,
                movement_date: movementData.movement_date,
                from_outlet: movementData.from_outlet,
                to_outlet: movementData.to_outlet,
                reason: movementData.reason || 'Stock Transfer',
                moved_by: movementData.moved_by || 'system'
            };
            
            const result = await this.db.insert(this.movementTableName, movement);
            
            if (result.insertId) {
                console.log(`📋 Added movement record for item ${movement.inventory_id}`);
                return { ...movement, id: result.insertId };
            }
            
            throw new Error('Failed to insert movement record');
            
        } catch (error) {
            console.error('Failed to add movement record:', error);
            throw error;
        }
    }

    /**
     * Get movement history for an item
     */
    async getMovementHistory(inventoryId) {
        try {
            const sql = `
                SELECT * FROM ${this.movementTableName}
                WHERE inventory_id = ?
                ORDER BY movement_date DESC, created_at DESC
            `;
            
            const movements = await this.db.selectAll(sql, [inventoryId]);
            return movements;
            
        } catch (error) {
            console.error('Failed to get movement history:', error);
            throw error;
        }
    }

    /**
     * Get low stock items
     */
    async getLowStockItems(threshold = 5) {
        try {
            const sql = `
                SELECT * FROM ${this.tableName}
                WHERE quantity <= ? AND quantity > 0 AND status = 'available'
                ORDER BY quantity ASC, brand, model
            `;
            
            const items = await this.db.selectAll(sql, [threshold]);
            return items;
            
        } catch (error) {
            console.error('Failed to get low stock items:', error);
            throw error;
        }
    }

    /**
     * Get inventory statistics
     */
    async getStatistics() {
        try {
            const stats = {};
            
            // Basic counts
            const totalItems = await this.db.selectOne(`SELECT COUNT(*) as count FROM ${this.tableName}`);
            stats.totalItems = totalItems ? totalItems.count : 0;
            
            const availableItems = await this.db.selectOne(
                `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'available'`
            );
            stats.availableItems = availableItems ? availableItems.count : 0;
            
            const soldItems = await this.db.selectOne(
                `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'sold'`
            );
            stats.soldItems = soldItems ? soldItems.count : 0;
            
            // Value calculations
            const totalValue = await this.db.selectOne(
                `SELECT SUM(price * quantity) as value FROM ${this.tableName}`
            );
            stats.totalValue = totalValue ? (totalValue.value || 0) : 0;
            
            // Low stock count
            const lowStock = await this.db.selectOne(
                `SELECT COUNT(*) as count FROM ${this.tableName} WHERE quantity <= 5 AND quantity > 0`
            );
            stats.lowStockItems = lowStock ? lowStock.count : 0;
            
            // By outlet
            const outletStats = await this.db.selectAll(`
                SELECT 
                    outlet,
                    COUNT(*) as item_count,
                    SUM(quantity) as total_quantity,
                    SUM(price * quantity) as total_value
                FROM ${this.tableName}
                GROUP BY outlet
                ORDER BY outlet
            `);
            stats.byOutlet = outletStats;
            
            // By type
            const typeStats = await this.db.selectAll(`
                SELECT 
                    type,
                    COUNT(*) as item_count,
                    SUM(quantity) as total_quantity,
                    AVG(price) as avg_price
                FROM ${this.tableName}
                GROUP BY type
                ORDER BY item_count DESC
            `);
            stats.byType = typeStats;
            
            // Top brands
            const brandStats = await this.db.selectAll(`
                SELECT 
                    brand,
                    COUNT(*) as item_count,
                    SUM(quantity) as total_quantity,
                    AVG(price) as avg_price
                FROM ${this.tableName}
                GROUP BY brand
                ORDER BY item_count DESC
                LIMIT 10
            `);
            stats.topBrands = brandStats;
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get inventory statistics:', error);
            throw error;
        }
    }

    /**
     * Search inventory items
     */
    async searchItems(searchTerm, filters = {}) {
        try {
            let sql = `
                SELECT i.*, 
                       COUNT(s.id) as sales_count,
                       COALESCE(SUM(s.total_amount), 0) as total_sales_value
                FROM ${this.tableName} i
                LEFT JOIN sales s ON i.id = s.inventory_id
                WHERE (
                    i.code LIKE ? OR 
                    i.brand LIKE ? OR 
                    i.model LIKE ? OR 
                    i.description LIKE ?
                )
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const params = [searchPattern, searchPattern, searchPattern, searchPattern];
            
            // Apply additional filters
            if (filters.outlet) {
                sql += ' AND i.outlet = ?';
                params.push(filters.outlet);
            }
            
            if (filters.type) {
                sql += ' AND i.type = ?';
                params.push(filters.type);
            }
            
            if (filters.status) {
                sql += ' AND i.status = ?';
                params.push(filters.status);
            }
            
            sql += ' GROUP BY i.id ORDER BY i.brand, i.model';
            
            const items = await this.db.selectAll(sql, params);
            return items;
            
        } catch (error) {
            console.error('Failed to search inventory items:', error);
            throw error;
        }
    }

    /**
     * Get items by outlet
     */
    async getItemsByOutlet(outlet) {
        try {
            const sql = `
                SELECT i.*, 
                       COUNT(s.id) as sales_count,
                       COALESCE(SUM(s.total_amount), 0) as revenue
                FROM ${this.tableName} i
                LEFT JOIN sales s ON i.id = s.inventory_id
                WHERE i.outlet = ?
                GROUP BY i.id
                ORDER BY i.brand, i.model
            `;
            
            const items = await this.db.selectAll(sql, [outlet]);
            return items;
            
        } catch (error) {
            console.error('Failed to get items by outlet:', error);
            throw error;
        }
    }

    /**
     * Generate next item code for a brand
     */
    async generateNextCode(brand) {
        try {
            const brandPrefix = brand.substring(0, 3).toUpperCase();
            
            const sql = `
                SELECT code FROM ${this.tableName}
                WHERE code LIKE ?
                ORDER BY code DESC
                LIMIT 1
            `;
            
            const lastItem = await this.db.selectOne(sql, [`${brandPrefix}%`]);
            
            if (lastItem) {
                const lastNumber = parseInt(lastItem.code.substring(3)) || 0;
                const nextNumber = lastNumber + 1;
                return `${brandPrefix}${nextNumber.toString().padStart(3, '0')}`;
            } else {
                return `${brandPrefix}001`;
            }
            
        } catch (error) {
            console.error('Failed to generate next code:', error);
            throw error;
        }
    }

    /**
     * Transfer item between outlets
     */
    async transferItem(id, toOutlet, movementDate, reason = 'Stock Transfer', movedBy = 'system') {
        try {
            const item = await this.getItemById(id);
            if (!item) {
                throw new Error('Inventory item not found');
            }
            
            if (item.outlet === toOutlet) {
                throw new Error('Item is already at the target outlet');
            }
            
            // Update item outlet
            const result = await this.db.update(
                this.tableName,
                { outlet: toOutlet },
                'id = ?',
                [id]
            );
            
            if (result.changes > 0) {
                // Add movement record
                await this.addMovementRecord({
                    inventory_id: id,
                    movement_date: movementDate,
                    from_outlet: item.outlet,
                    to_outlet: toOutlet,
                    reason: reason,
                    moved_by: movedBy
                });
                
                // Clear cache
                this.clearCache();
                
                console.log(`🚚 Transferred item ${id} from ${item.outlet} to ${toOutlet}`);
                
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction(`Transferred item from ${item.outlet} to ${toOutlet}`, {
                        id,
                        item: `${item.brand} ${item.model}`,
                        fromOutlet: item.outlet,
                        toOutlet: toOutlet,
                        reason: reason
                    });
                }
                
                return await this.getItemById(id);
            }
            
            throw new Error('Failed to transfer item');
            
        } catch (error) {
            console.error('Failed to transfer item:', error);
            throw error;
        }
    }

    /**
     * Bulk update items
     */
    async bulkUpdate(items, updateData) {
        try {
            const queries = [];
            
            for (const itemId of items) {
                const updates = {};
                const allowedFields = ['price', 'quantity', 'outlet', 'status', 'description'];
                
                for (const field of allowedFields) {
                    if (updateData[field] !== undefined) {
                        updates[field] = updateData[field];
                    }
                }
                
                if (Object.keys(updates).length > 0) {
                    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
                    const values = [...Object.values(updates), itemId];
                    
                    queries.push({
                        sql: `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
                        params: values
                    });
                }
            }
            
            if (queries.length > 0) {
                await this.db.executeTransaction(queries);
                
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Bulk updated ${queries.length} items`);
                
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction(`Bulk updated ${queries.length} items`, {
                        itemCount: queries.length,
                        updates: updateData
                    });
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to bulk update items:', error);
            throw error;
        }
    }

    /**
     * Export inventory data
     */
    async exportData(format = 'json', filters = {}) {
        try {
            const items = await this.getAllItems(filters);
            
            if (format === 'json') {
                return JSON.stringify(items, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(items);
            }
            
            throw new Error('Unsupported export format');
            
        } catch (error) {
            console.error('Failed to export inventory data:', error);
            throw error;
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(items) {
        if (!items || items.length === 0) {
            return '';
        }
        
        const headers = [
            'ID', 'Code', 'Type', 'Brand', 'Model', 'Size', 'Price', 
            'Quantity', 'Outlet', 'Status', 'Description', 'Created At'
        ];
        
        const csvRows = [headers.join(',')];
        
        for (const item of items) {
            const row = [
                item.id,
                `"${item.code}"`,
                `"${item.type}"`,
                `"${item.brand}"`,
                `"${item.model}"`,
                `"${item.size}"`,
                item.price,
                item.quantity,
                `"${item.outlet}"`,
                `"${item.status}"`,
                `"${(item.description || '').replace(/"/g, '""')}"`,
                `"${item.created_at}"`
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
        console.log('🧹 Inventory cache cleared');
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

    /**
     * Validate item data
     */
    validateItemData(itemData) {
        const errors = [];
        
        // Required fields
        const required = ['code', 'type', 'brand', 'model', 'price', 'quantity', 'outlet'];
        for (const field of required) {
            if (!itemData[field]) {
                errors.push(`${field} is required`);
            }
        }
        
        // Data type validation
        if (itemData.price && (isNaN(itemData.price) || parseFloat(itemData.price) < 0)) {
            errors.push('Price must be a positive number');
        }
        
        if (itemData.quantity && (isNaN(itemData.quantity) || parseInt(itemData.quantity) < 0)) {
            errors.push('Quantity must be a non-negative integer');
        }
        
        // Business rules
        const validTypes = ['Watch', 'Clock', 'Timepiece', 'Strap', 'Battery'];
        if (itemData.type && !validTypes.includes(itemData.type)) {
            errors.push('Invalid item type');
        }
        
        const validOutlets = ['Semmancheri', 'Navalur', 'Padur'];
        if (itemData.outlet && !validOutlets.includes(itemData.outlet)) {
            errors.push('Invalid outlet');
        }
        
        // Size validation for strap type
        if (itemData.type === 'Strap' && !itemData.size) {
            errors.push('Size is required for Strap type items');
        }
        
        return errors;
    }
}

// Create and export instance
let inventoryDB = null;

// Initialize when SQLite core is ready
document.addEventListener('DOMContentLoaded', function() {
    const initInventoryDB = () => {
        if (window.SQLiteCore && window.SQLiteCore.isReady()) {
            inventoryDB = new InventoryDB(window.SQLiteCore);
            window.InventoryDB = inventoryDB;
            console.log('📦 Inventory Database module initialized');
        } else {
            setTimeout(initInventoryDB, 100);
        }
    };
    
    initInventoryDB();
});

// Export for use by other modules
window.InventoryDB = inventoryDB;