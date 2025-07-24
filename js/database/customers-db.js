// ZEDSON WATCHCRAFT - Customer Database Operations
// js/database/customers-db.js

/**
 * Customer Database Operations Module
 * Handles all database operations for customer management
 */

class CustomerDB {
    constructor(sqliteCore) {
        this.db = sqliteCore;
        this.tableName = 'customers';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Get all customers with optional filtering
     */
    async getAllCustomers(filters = {}) {
        try {
            let sql = `
                SELECT 
                    c.*,
                    COUNT(DISTINCT s.id) as actual_purchases,
                    COUNT(DISTINCT sv.id) as actual_services,
                    COALESCE(SUM(s.total_amount), 0) as total_sales_value,
                    COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0) as total_services_value,
                    (COALESCE(SUM(s.total_amount), 0) + COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0)) as calculated_net_value,
                    MAX(s.created_at) as last_purchase_date,
                    MAX(sv.created_at) as last_service_date
                FROM ${this.tableName} c
                LEFT JOIN sales s ON c.id = s.customer_id
                LEFT JOIN services sv ON c.id = sv.customer_id
            `;
            
            const params = [];
            const conditions = [];
            
            // Apply filters
            if (filters.search) {
                conditions.push('(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)');
                const searchPattern = `%${filters.search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }
            
            if (filters.minNetValue) {
                conditions.push('c.net_value >= ?');
                params.push(filters.minNetValue);
            }
            
            if (filters.hasActiveSales !== undefined) {
                if (filters.hasActiveSales) {
                    conditions.push('c.purchases > 0');
                } else {
                    conditions.push('c.purchases = 0');
                }
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            sql += ' GROUP BY c.id ORDER BY c.net_value DESC, c.name ASC';
            
            const customers = await this.db.selectAll(sql, params);
            
            console.log(`👥 Retrieved ${customers.length} customers`);
            return customers;
            
        } catch (error) {
            console.error('Failed to get customers:', error);
            throw error;
        }
    }

    /**
     * Get single customer by ID
     */
    async getCustomerById(id) {
        try {
            const cacheKey = `customer_${id}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }
            
            const sql = `
                SELECT 
                    c.*,
                    COUNT(DISTINCT s.id) as actual_purchases,
                    COUNT(DISTINCT sv.id) as actual_services,
                    COALESCE(SUM(s.total_amount), 0) as total_sales_value,
                    COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0) as total_services_value,
                    MAX(s.created_at) as last_purchase_date,
                    MAX(sv.created_at) as last_service_date
                FROM ${this.tableName} c
                LEFT JOIN sales s ON c.id = s.customer_id
                LEFT JOIN services sv ON c.id = sv.customer_id
                WHERE c.id = ?
                GROUP BY c.id
            `;
            
            const customer = await this.db.selectOne(sql, [id]);
            
            if (customer) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: customer,
                    timestamp: Date.now()
                });
            }
            
            return customer;
            
        } catch (error) {
            console.error('Failed to get customer:', error);
            throw error;
        }
    }

    /**
     * Get customer by email
     */
    async getCustomerByEmail(email) {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE email = ? LIMIT 1`;
            const customer = await this.db.selectOne(sql, [email]);
            return customer;
            
        } catch (error) {
            console.error('Failed to get customer by email:', error);
            throw error;
        }
    }

    /**
     * Get customer by phone
     */
    async getCustomerByPhone(phone) {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE phone = ? LIMIT 1`;
            const customer = await this.db.selectOne(sql, [phone]);
            return customer;
            
        } catch (error) {
            console.error('Failed to get customer by phone:', error);
            throw error;
        }
    }

    /**
     * Add new customer
     */
    async addCustomer(customerData) {
        try {
            // Validate required fields
            const required = ['name', 'email', 'phone'];
            for (const field of required) {
                if (!customerData[field]) {
                    throw new Error(`Required field '${field}' is missing`);
                }
            }
            
            // Validate email format
            if (!this.validateEmail(customerData.email)) {
                throw new Error('Invalid email format');
            }
            
            // Validate phone format
            if (!this.validatePhone(customerData.phone)) {
                throw new Error('Invalid phone format');
            }
            
            // Check if email already exists
            const existingEmail = await this.getCustomerByEmail(customerData.email);
            if (existingEmail) {
                throw new Error('A customer with this email already exists');
            }
            
            // Check if phone already exists
            const existingPhone = await this.getCustomerByPhone(customerData.phone);
            if (existingPhone) {
                throw new Error('A customer with this phone number already exists');
            }
            
            // Prepare customer data
            const customer = {
                name: customerData.name.trim(),
                email: customerData.email.toLowerCase().trim(),
                phone: customerData.phone.trim(),
                address: customerData.address ? customerData.address.trim() : '',
                purchases: 0,
                service_count: 0,
                net_value: 0.00,
                added_by: customerData.addedBy || 'system'
            };
            
            // Insert customer
            const result = await this.db.insert(this.tableName, customer);
            
            if (result.insertId) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Added customer: ${customer.name} (${customer.email})`);
                
                // Log action
                if (window.logCustomerAction) {
                    logCustomerAction(`Added new customer: ${customer.name}`, {
                        ...customer,
                        id: result.insertId
                    });
                }
                
                return { ...customer, id: result.insertId };
            }
            
            throw new Error('Failed to insert customer');
            
        } catch (error) {
            console.error('Failed to add customer:', error);
            throw error;
        }
    }

    /**
     * Update customer
     */
    async updateCustomer(id, updateData) {
        try {
            const existingCustomer = await this.getCustomerById(id);
            if (!existingCustomer) {
                throw new Error('Customer not found');
            }
            
            // Prepare update data
            const updates = {};
            const allowedFields = ['name', 'email', 'phone', 'address'];
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    if (field === 'email') {
                        const email = updateData[field].toLowerCase().trim();
                        if (!this.validateEmail(email)) {
                            throw new Error('Invalid email format');
                        }
                        // Check if email is being changed and conflicts
                        if (email !== existingCustomer.email) {
                            const existingEmail = await this.getCustomerByEmail(email);
                            if (existingEmail && existingEmail.id !== id) {
                                throw new Error('A customer with this email already exists');
                            }
                        }
                        updates[field] = email;
                    } else if (field === 'phone') {
                        const phone = updateData[field].trim();
                        if (!this.validatePhone(phone)) {
                            throw new Error('Invalid phone format');
                        }
                        // Check if phone is being changed and conflicts
                        if (phone !== existingCustomer.phone) {
                            const existingPhone = await this.getCustomerByPhone(phone);
                            if (existingPhone && existingPhone.id !== id) {
                                throw new Error('A customer with this phone number already exists');
                            }
                        }
                        updates[field] = phone;
                    } else {
                        updates[field] = updateData[field].trim();
                    }
                }
            }
            
            if (Object.keys(updates).length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Update customer
            const result = await this.db.update(this.tableName, updates, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated customer: ${id}`);
                
                // Log action
                if (window.logCustomerAction) {
                    logCustomerAction(`Updated customer: ${existingCustomer.name}`, {
                        id,
                        changes: updates,
                        oldData: existingCustomer
                    });
                }
                
                return await this.getCustomerById(id);
            }
            
            return existingCustomer;
            
        } catch (error) {
            console.error('Failed to update customer:', error);
            throw error;
        }
    }

    /**
     * Delete customer
     */
    async deleteCustomer(id) {
        try {
            const customer = await this.getCustomerById(id);
            if (!customer) {
                throw new Error('Customer not found');
            }
            
            // Check if customer has sales or services
            const salesCheck = await this.db.selectOne(
                'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
                [id]
            );
            
            if (salesCheck && salesCheck.count > 0) {
                throw new Error('Cannot delete customer with existing sales records');
            }
            
            const servicesCheck = await this.db.selectOne(
                'SELECT COUNT(*) as count FROM services WHERE customer_id = ?',
                [id]
            );
            
            if (servicesCheck && servicesCheck.count > 0) {
                throw new Error('Cannot delete customer with existing service records');
            }
            
            // Delete customer
            const result = await this.db.delete(this.tableName, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Deleted customer: ${customer.name}`);
                
                // Log action
                if (window.logCustomerAction) {
                    logCustomerAction(`Deleted customer: ${customer.name}`, customer);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to delete customer:', error);
            throw error;
        }
    }

    /**
     * Update customer purchase count
     */
    async updatePurchaseCount(customerId, increment = true) {
        try {
            const customer = await this.getCustomerById(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }
            
            const newCount = increment ? 
                customer.purchases + 1 : 
                Math.max(0, customer.purchases - 1);
            
            const result = await this.db.update(
                this.tableName,
                { purchases: newCount },
                'id = ?',
                [customerId]
            );
            
            if (result.changes > 0) {
                // Clear cache for this customer
                this.cache.delete(`customer_${customerId}`);
                
                console.log(`✅ Updated purchase count for customer ${customerId}: ${customer.purchases} → ${newCount}`);
                
                // Recalculate net value
                await this.recalculateNetValue(customerId);
                
                return newCount;
            }
            
            return customer.purchases;
            
        } catch (error) {
            console.error('Failed to update purchase count:', error);
            throw error;
        }
    }

    /**
     * Update customer service count
     */
    async updateServiceCount(customerId, increment = true) {
        try {
            const customer = await this.getCustomerById(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }
            
            const newCount = increment ? 
                customer.service_count + 1 : 
                Math.max(0, customer.service_count - 1);
            
            const result = await this.db.update(
                this.tableName,
                { service_count: newCount },
                'id = ?',
                [customerId]
            );
            
            if (result.changes > 0) {
                // Clear cache for this customer
                this.cache.delete(`customer_${customerId}`);
                
                console.log(`✅ Updated service count for customer ${customerId}: ${customer.service_count} → ${newCount}`);
                
                // Recalculate net value
                await this.recalculateNetValue(customerId);
                
                return newCount;
            }
            
            return customer.service_count;
            
        } catch (error) {
            console.error('Failed to update service count:', error);
            throw error;
        }
    }

    /**
     * Recalculate customer net value
     */
    async recalculateNetValue(customerId) {
        try {
            // Calculate total sales value
            const salesValue = await this.db.selectOne(`
                SELECT COALESCE(SUM(total_amount), 0) as total 
                FROM sales 
                WHERE customer_id = ?
            `, [customerId]);
            
            // Calculate total completed services value
            const servicesValue = await this.db.selectOne(`
                SELECT COALESCE(SUM(cost), 0) as total 
                FROM services 
                WHERE customer_id = ? AND status = 'completed'
            `, [customerId]);
            
            const newNetValue = (salesValue?.total || 0) + (servicesValue?.total || 0);
            
            // Update net value
            const result = await this.db.update(
                this.tableName,
                { net_value: newNetValue },
                'id = ?',
                [customerId]
            );
            
            if (result.changes > 0) {
                // Clear cache for this customer
                this.cache.delete(`customer_${customerId}`);
                
                console.log(`💰 Updated net value for customer ${customerId}: ₹${newNetValue}`);
                return newNetValue;
            }
            
            return 0;
            
        } catch (error) {
            console.error('Failed to recalculate net value:', error);
            throw error;
        }
    }

    /**
     * Recalculate all customers' net values
     */
    async recalculateAllNetValues() {
        try {
            console.log('🔄 Recalculating all customer net values...');
            
            const customers = await this.db.selectAll(`SELECT id FROM ${this.tableName}`);
            let updated = 0;
            
            for (const customer of customers) {
                try {
                    await this.recalculateNetValue(customer.id);
                    updated++;
                } catch (error) {
                    console.error(`Failed to recalculate net value for customer ${customer.id}:`, error);
                }
            }
            
            // Clear all cache
            this.clearCache();
            
            console.log(`✅ Recalculated net values for ${updated}/${customers.length} customers`);
            return updated;
            
        } catch (error) {
            console.error('Failed to recalculate all net values:', error);
            throw error;
        }
    }

    /**
     * Get customer purchase history
     */
    async getPurchaseHistory(customerId) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    i.code as item_code,
                    i.brand,
                    i.model,
                    i.type as item_type
                FROM sales s
                JOIN inventory i ON s.inventory_id = i.id
                WHERE s.customer_id = ?
                ORDER BY s.created_at DESC
            `;
            
            const purchases = await this.db.selectAll(sql, [customerId]);
            return purchases;
            
        } catch (error) {
            console.error('Failed to get purchase history:', error);
            throw error;
        }
    }

    /**
     * Get customer service history
     */
    async getServiceHistory(customerId) {
        try {
            const sql = `
                SELECT * FROM services
                WHERE customer_id = ?
                ORDER BY created_at DESC
            `;
            
            const services = await this.db.selectAll(sql, [customerId]);
            return services;
            
        } catch (error) {
            console.error('Failed to get service history:', error);
            throw error;
        }
    }

    /**
     * Get customer statistics
     */
    async getStatistics() {
        try {
            const stats = {};
            
            // Basic counts
            const totalCustomers = await this.db.selectOne(`SELECT COUNT(*) as count FROM ${this.tableName}`);
            stats.totalCustomers = totalCustomers ? totalCustomers.count : 0;
            
            const activeCustomers = await this.db.selectOne(
                `SELECT COUNT(*) as count FROM ${this.tableName} WHERE purchases > 0 OR service_count > 0`
            );
            stats.activeCustomers = activeCustomers ? activeCustomers.count : 0;
            
            const inactiveCustomers = stats.totalCustomers - stats.activeCustomers;
            stats.inactiveCustomers = inactiveCustomers;
            
            // Value statistics
            const netValueStats = await this.db.selectOne(`
                SELECT 
                    SUM(net_value) as total_net_value,
                    AVG(net_value) as avg_net_value,
                    MAX(net_value) as max_net_value,
                    MIN(net_value) as min_net_value
                FROM ${this.tableName}
            `);
            
            stats.totalNetValue = netValueStats?.total_net_value || 0;
            stats.averageNetValue = netValueStats?.avg_net_value || 0;
            stats.maxNetValue = netValueStats?.max_net_value || 0;
            stats.minNetValue = netValueStats?.min_net_value || 0;
            
            // Top customers by net value
            const topCustomers = await this.db.selectAll(`
                SELECT id, name, email, phone, net_value, purchases, service_count
                FROM ${this.tableName}
                WHERE net_value > 0
                ORDER BY net_value DESC
                LIMIT 10
            `);
            stats.topCustomers = topCustomers;
            
            // Customer segments
            const segments = await this.db.selectAll(`
                SELECT 
                    CASE 
                        WHEN net_value = 0 THEN 'New'
                        WHEN net_value < 50000 THEN 'Bronze'
                        WHEN net_value < 200000 THEN 'Silver'
                        WHEN net_value < 500000 THEN 'Gold'
                        ELSE 'Platinum'
                    END as segment,
                    COUNT(*) as customer_count,
                    AVG(net_value) as avg_value
                FROM ${this.tableName}
                GROUP BY segment
                ORDER BY avg_value ASC
            `);
            stats.segments = segments;
            
            // Recent activity
            const recentCustomers = await this.db.selectAll(`
                SELECT id, name, email, net_value, created_at
                FROM ${this.tableName}
                ORDER BY created_at DESC
                LIMIT 5
            `);
            stats.recentCustomers = recentCustomers;
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get customer statistics:', error);
            throw error;
        }
    }

    /**
     * Search customers
     */
    async searchCustomers(searchTerm, filters = {}) {
        try {
            let sql = `
                SELECT 
                    c.*,
                    COUNT(DISTINCT s.id) as actual_purchases,
                    COUNT(DISTINCT sv.id) as actual_services,
                    COALESCE(SUM(s.total_amount), 0) as total_sales_value,
                    COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0) as total_services_value
                FROM ${this.tableName} c
                LEFT JOIN sales s ON c.id = s.customer_id
                LEFT JOIN services sv ON c.id = sv.customer_id
                WHERE (
                    c.name LIKE ? OR 
                    c.email LIKE ? OR 
                    c.phone LIKE ? OR
                    c.address LIKE ?
                )
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const params = [searchPattern, searchPattern, searchPattern, searchPattern];
            
            // Apply additional filters
            if (filters.minNetValue) {
                sql += ' AND c.net_value >= ?';
                params.push(filters.minNetValue);
            }
            
            if (filters.maxNetValue) {
                sql += ' AND c.net_value <= ?';
                params.push(filters.maxNetValue);
            }
            
            if (filters.hasActiveSales !== undefined) {
                if (filters.hasActiveSales) {
                    sql += ' AND c.purchases > 0';
                } else {
                    sql += ' AND c.purchases = 0';
                }
            }
            
            sql += ' GROUP BY c.id ORDER BY c.net_value DESC, c.name ASC';
            
            const customers = await this.db.selectAll(sql, params);
            return customers;
            
        } catch (error) {
            console.error('Failed to search customers:', error);
            throw error;
        }
    }

    /**
     * Get customers by net value range
     */
    async getCustomersByNetValueRange(minValue, maxValue) {
        try {
            const sql = `
                SELECT * FROM ${this.tableName}
                WHERE net_value >= ? AND net_value <= ?
                ORDER BY net_value DESC
            `;
            
            const customers = await this.db.selectAll(sql, [minValue, maxValue]);
            return customers;
            
        } catch (error) {
            console.error('Failed to get customers by net value range:', error);
            throw error;
        }
    }

    /**
     * Get top customers by criteria
     */
    async getTopCustomers(criteria = 'net_value', limit = 10) {
        try {
            const validCriteria = ['net_value', 'purchases', 'service_count'];
            if (!validCriteria.includes(criteria)) {
                throw new Error('Invalid criteria');
            }
            
            const sql = `
                SELECT * FROM ${this.tableName}
                WHERE ${criteria} > 0
                ORDER BY ${criteria} DESC
                LIMIT ?
            `;
            
            const customers = await this.db.selectAll(sql, [limit]);
            return customers;
            
        } catch (error) {
            console.error('Failed to get top customers:', error);
            throw error;
        }
    }

    /**
     * Export customer data
     */
    async exportData(format = 'json', filters = {}) {
        try {
            const customers = await this.getAllCustomers(filters);
            
            if (format === 'json') {
                return JSON.stringify(customers, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(customers);
            }
            
            throw new Error('Unsupported export format');
            
        } catch (error) {
            console.error('Failed to export customer data:', error);
            throw error;
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(customers) {
        if (!customers || customers.length === 0) {
            return '';
        }
        
        const headers = [
            'ID', 'Name', 'Email', 'Phone', 'Address', 'Purchases', 
            'Services', 'Net Value', 'Created At', 'Last Purchase', 'Last Service'
        ];
        
        const csvRows = [headers.join(',')];
        
        for (const customer of customers) {
            const row = [
                customer.id,
                `"${customer.name}"`,
                `"${customer.email}"`,
                `"${customer.phone}"`,
                `"${(customer.address || '').replace(/"/g, '""')}"`,
                customer.purchases,
                customer.service_count,
                customer.net_value,
                `"${customer.created_at}"`,
                `"${customer.last_purchase_date || ''}"`,
                `"${customer.last_service_date || ''}"`
            ];
            csvRows.push(row.join(','));
        }
        
        return csvRows.join('\n');
    }

    /**
     * Bulk update customers
     */
    async bulkUpdate(customerIds, updateData) {
        try {
            const queries = [];
            
            for (const customerId of customerIds) {
                const updates = {};
                const allowedFields = ['address', 'net_value'];
                
                for (const field of allowedFields) {
                    if (updateData[field] !== undefined) {
                        updates[field] = updateData[field];
                    }
                }
                
                if (Object.keys(updates).length > 0) {
                    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
                    const values = [...Object.values(updates), customerId];
                    
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
                
                console.log(`✅ Bulk updated ${queries.length} customers`);
                
                // Log action
                if (window.logCustomerAction) {
                    logCustomerAction(`Bulk updated ${queries.length} customers`, {
                        customerCount: queries.length,
                        updates: updateData
                    });
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to bulk update customers:', error);
            throw error;
        }
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone format
     */
    validatePhone(phone) {
        const phoneRegex = /^[\+]?[0-9\-\s\(\)]{10,15}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Validate customer data
     */
    validateCustomerData(customerData) {
        const errors = [];
        
        // Required fields
        const required = ['name', 'email', 'phone'];
        for (const field of required) {
            if (!customerData[field]) {
                errors.push(`${field} is required`);
            }
        }
        
        // Email validation
        if (customerData.email && !this.validateEmail(customerData.email)) {
            errors.push('Invalid email format');
        }
        
        // Phone validation
        if (customerData.phone && !this.validatePhone(customerData.phone)) {
            errors.push('Invalid phone format');
        }
        
        // Name length
        if (customerData.name && customerData.name.length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        return errors;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Customer cache cleared');
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
     * Anonymize customer data for privacy
     */
    async anonymizeCustomer(id) {
        try {
            const customer = await this.getCustomerById(id);
            if (!customer) {
                throw new Error('Customer not found');
            }
            
            // Check if customer has recent activity (within last 2 years)
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            
            const recentActivity = await this.db.selectOne(`
                SELECT COUNT(*) as count FROM (
                    SELECT created_at FROM sales WHERE customer_id = ? AND created_at > ?
                    UNION ALL
                    SELECT created_at FROM services WHERE customer_id = ? AND created_at > ?
                ) recent
            `, [id, twoYearsAgo.toISOString(), id, twoYearsAgo.toISOString()]);
            
            if (recentActivity && recentActivity.count > 0) {
                throw new Error('Cannot anonymize customer with recent activity');
            }
            
            // Anonymize data
            const anonymizedData = {
                name: `Anonymous Customer ${id}`,
                email: `anonymous${id}@deleted.local`,
                phone: `+00-000000${String(id).padStart(4, '0')}`,
                address: 'Address Removed'
            };
            
            const result = await this.db.update(this.tableName, anonymizedData, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`🔒 Anonymized customer: ${id}`);
                
                // Log action
                if (window.logCustomerAction) {
                    logCustomerAction(`Anonymized customer data`, {
                        id,
                        originalName: customer.name
                    });
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to anonymize customer:', error);
            throw error;
        }
    }
}

// Create and export instance
let customerDB = null;

// Initialize when SQLite core is ready
document.addEventListener('DOMContentLoaded', function() {
    const initCustomerDB = () => {
        if (window.SQLiteCore && window.SQLiteCore.isReady()) {
            customerDB = new CustomerDB(window.SQLiteCore);
            window.CustomerDB = customerDB;
            console.log('👥 Customer Database module initialized');
        } else {
            setTimeout(initCustomerDB, 100);
        }
    };
    
    initCustomerDB();
});

// Export for use by other modules
window.CustomerDB = customerDB;