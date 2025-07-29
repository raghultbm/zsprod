// ZEDSON WATCHCRAFT - Services Database Operations
// js/database/services-db.js

/**
 * Services Database Operations Module
 * Handles all database operations for service management
 */

class ServicesDB {
    constructor(sqliteCore) {
        this.db = sqliteCore;
        this.tableName = 'services';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Get all services with optional filtering
     */
    async getAllServices(filters = {}) {
        try {
            let sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    c.email as customer_email,
                    c.address as customer_address
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
            `;
            
            const params = [];
            const conditions = [];
            
            // Apply filters
            if (filters.customerId) {
                conditions.push('s.customer_id = ?');
                params.push(filters.customerId);
            }
            
            if (filters.status) {
                conditions.push('s.status = ?');
                params.push(filters.status);
            }
            
            if (filters.dateFrom) {
                conditions.push('s.service_date >= ?');
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                conditions.push('s.service_date <= ?');
                params.push(filters.dateTo);
            }
            
            if (filters.brand) {
                conditions.push('s.brand LIKE ?');
                params.push(`%${filters.brand}%`);
            }
            
            if (filters.model) {
                conditions.push('s.model LIKE ?');
                params.push(`%${filters.model}%`);
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            sql += ' ORDER BY s.created_at DESC';
            
            const services = await this.db.selectAll(sql, params);
            
            console.log(`🔧 Retrieved ${services.length} services`);
            return services;
            
        } catch (error) {
            console.error('Failed to get services:', error);
            throw error;
        }
    }

    /**
     * Get single service by ID
     */
    async getServiceById(id) {
        try {
            const cacheKey = `service_${id}`;
            
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
                    c.address as customer_address
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                WHERE s.id = ?
            `;
            
            const service = await this.db.selectOne(sql, [id]);
            
            if (service) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: service,
                    timestamp: Date.now()
                });
            }
            
            return service;
            
        } catch (error) {
            console.error('Failed to get service:', error);
            throw error;
        }
    }

    /**
     * Add new service
     */
    async addService(serviceData) {
        try {
            // Validate required fields
            const required = [
                'customer_id', 'watch_name', 'brand', 'model', 'dial_color', 
                'movement_no', 'gender', 'case_type', 'strap_type', 'issue', 'cost'
            ];
            
            for (const field of required) {
                if (!serviceData[field]) {
                    throw new Error(`Required field '${field}' is missing`);
                }
            }
            
            // Validate business rules
            if (serviceData.cost < 0) {
                throw new Error('Service cost cannot be negative');
            }
            
            if (serviceData.warranty_period && (serviceData.warranty_period < 0 || serviceData.warranty_period > 60)) {
                throw new Error('Warranty period must be between 0 and 60 months');
            }
            
            // Check if customer exists
            const customer = await this.db.selectOne('SELECT id, name FROM customers WHERE id = ?', [serviceData.customer_id]);
            if (!customer) {
                throw new Error('Customer not found');
            }
            
            // Prepare service data
            const service = {
                customer_id: serviceData.customer_id,
                watch_name: serviceData.watch_name,
                brand: serviceData.brand,
                model: serviceData.model,
                dial_color: serviceData.dial_color,
                movement_no: serviceData.movement_no,
                gender: serviceData.gender,
                case_type: serviceData.case_type,
                strap_type: serviceData.strap_type,
                issue: serviceData.issue,
                cost: parseFloat(serviceData.cost),
                status: serviceData.status || 'pending',
                estimated_delivery: serviceData.estimated_delivery || null,
                actual_delivery: serviceData.actual_delivery || null,
                completion_image: serviceData.completion_image || null,
                completion_description: serviceData.completion_description || null,
                warranty_period: parseInt(serviceData.warranty_period || 0),
                service_date: serviceData.service_date || new Date().toISOString().split('T')[0],
                service_time: serviceData.service_time || new Date().toTimeString().split(' ')[0],
                created_by: serviceData.created_by || 'system',
                started_at: serviceData.started_at || null,
                completed_at: serviceData.completed_at || null,
                held_at: serviceData.held_at || null,
                acknowledgement_generated: serviceData.acknowledgement_generated || 0,
                completion_invoice_generated: serviceData.completion_invoice_generated || 0,
                acknowledgement_invoice_id: serviceData.acknowledgement_invoice_id || null,
                completion_invoice_id: serviceData.completion_invoice_id || null
            };
            
            // Start transaction
            const queries = [
                // Insert service
                {
                    sql: `INSERT INTO ${this.tableName} (${Object.keys(service).join(', ')}) VALUES (${Object.keys(service).map(() => '?').join(', ')})`,
                    params: Object.values(service)
                },
                // Update customer service count
                {
                    sql: 'UPDATE customers SET service_count = service_count + 1 WHERE id = ?',
                    params: [service.customer_id]
                }
            ];
            
            const results = await this.db.executeTransaction(queries);
            
            if (results[0].insertId) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Added service: Customer ${customer.name}, Watch ${service.brand} ${service.model}, Cost ₹${service.cost}`);
                
                // Log action
                if (window.logServiceAction) {
                    logServiceAction(`Added new service: ${customer.name} - ${service.brand} ${service.model}`, {
                        ...service,
                        id: results[0].insertId,
                        customer_name: customer.name
                    });
                }
                
                return { ...service, id: results[0].insertId };
            }
            
            throw new Error('Failed to insert service');
            
        } catch (error) {
            console.error('Failed to add service:', error);
            throw error;
        }
    }

    /**
     * Update service
     */
    async updateService(id, updateData) {
        try {
            const existingService = await this.getServiceById(id);
            if (!existingService) {
                throw new Error('Service not found');
            }
            
            // Prepare update data
            const updates = {};
            const allowedFields = [
                'customer_id', 'watch_name', 'brand', 'model', 'dial_color', 'movement_no',
                'gender', 'case_type', 'strap_type', 'issue', 'cost', 'status',
                'estimated_delivery', 'actual_delivery', 'completion_image', 'completion_description',
                'warranty_period', 'started_at', 'completed_at', 'held_at',
                'acknowledgement_generated', 'completion_invoice_generated',
                'acknowledgement_invoice_id', 'completion_invoice_id'
            ];
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            }
            
            if (Object.keys(updates).length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Validate business rules
            if (updates.cost !== undefined && updates.cost < 0) {
                throw new Error('Service cost cannot be negative');
            }
            
            if (updates.warranty_period !== undefined && (updates.warranty_period < 0 || updates.warranty_period > 60)) {
                throw new Error('Warranty period must be between 0 and 60 months');
            }
            
            const queries = [];
            
            // If customer changed, adjust customer counts
            if (updates.customer_id !== undefined && updates.customer_id !== existingService.customer_id) {
                // Decrease old customer count
                queries.push({
                    sql: 'UPDATE customers SET service_count = service_count - 1 WHERE id = ? AND service_count > 0',
                    params: [existingService.customer_id]
                });
                
                // Increase new customer count
                queries.push({
                    sql: 'UPDATE customers SET service_count = service_count + 1 WHERE id = ?',
                    params: [updates.customer_id]
                });
            }
            
            // Update service
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            queries.push({
                sql: `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                params: [...Object.values(updates), id]
            });
            
            const results = await this.db.executeTransaction(queries);
            
            if (results[results.length - 1].changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated service: ${id}`);
                
                // Log action
                if (window.logServiceAction) {
                    logServiceAction(`Updated service: ${id}`, {
                        id,
                        changes: updates
                    });
                }
                
                return await this.getServiceById(id);
            }
            
            return existingService;
            
        } catch (error) {
            console.error('Failed to update service:', error);
            throw error;
        }
    }

    /**
     * Delete service
     */
    async deleteService(id) {
        try {
            const service = await this.getServiceById(id);
            if (!service) {
                throw new Error('Service not found');
            }
            
            // Start transaction to adjust customer count
            const queries = [
                // Decrease customer service count
                {
                    sql: 'UPDATE customers SET service_count = service_count - 1 WHERE id = ? AND service_count > 0',
                    params: [service.customer_id]
                },
                // Delete service
                {
                    sql: `DELETE FROM ${this.tableName} WHERE id = ?`,
                    params: [id]
                }
            ];
            
            const results = await this.db.executeTransaction(queries);
            
            if (results[1].changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Deleted service: ${id}`);
                
                // Log action
                if (window.logServiceAction) {
                    logServiceAction(`Deleted service: ${service.customer_name} - ${service.brand} ${service.model}`, service);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to delete service:', error);
            throw error;
        }
    }

    /**
     * Update service status
     */
    async updateServiceStatus(id, newStatus, additionalData = {}) {
        try {
            const service = await this.getServiceById(id);
            if (!service) {
                throw new Error('Service not found');
            }
            
            const validStatuses = ['pending', 'in-progress', 'on-hold', 'completed'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error('Invalid service status');
            }
            
            const updates = { status: newStatus };
            
            // Add timestamp based on status
            if (newStatus === 'in-progress' && service.status === 'pending') {
                updates.started_at = new Date().toISOString();
            } else if (newStatus === 'completed') {
                updates.completed_at = new Date().toISOString();
                if (!service.actual_delivery) {
                    updates.actual_delivery = new Date().toISOString().split('T')[0];
                }
            } else if (newStatus === 'on-hold') {
                updates.held_at = new Date().toISOString();
            }
            
            // Add any additional data (like completion details)
            Object.assign(updates, additionalData);
            
            const result = await this.updateService(id, updates);
            
            console.log(`✅ Updated service ${id} status to: ${newStatus}`);
            
            // Log action
            if (window.logServiceAction) {
                logServiceAction(`Changed service status: ${service.customer_name} - ${service.brand} ${service.model} from ${service.status} to ${newStatus}`, {
                    id,
                    oldStatus: service.status,
                    newStatus: newStatus
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('Failed to update service status:', error);
            throw error;
        }
    }

    /**
     * Complete service with details
     */
    async completeService(id, completionData) {
        try {
            const service = await this.getServiceById(id);
            if (!service) {
                throw new Error('Service not found');
            }
            
            if (service.status === 'completed') {
                throw new Error('Service is already completed');
            }
            
            // Prepare completion data
            const updates = {
                status: 'completed',
                completed_at: new Date().toISOString(),
                actual_delivery: completionData.actual_delivery || new Date().toISOString().split('T')[0],
                completion_description: completionData.completion_description || '',
                completion_image: completionData.completion_image || null,
                warranty_period: parseInt(completionData.warranty_period || 0)
            };
            
            // Update final cost if provided
            if (completionData.final_cost !== undefined) {
                updates.cost = parseFloat(completionData.final_cost);
            }
            
            const result = await this.updateService(id, updates);
            
            console.log(`✅ Completed service: ${service.customer_name} - ${service.brand} ${service.model}`);
            
            // Log action
            if (window.logServiceAction) {
                logServiceAction(`Completed service: ${service.customer_name} - ${service.brand} ${service.model}`, {
                    id,
                    finalCost: updates.cost || service.cost,
                    warrantyPeriod: updates.warranty_period
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('Failed to complete service:', error);
            throw error;
        }
    }

    /**
     * Get services by customer
     */
    async getServicesByCustomer(customerId) {
        try {
            const sql = `
                SELECT * FROM ${this.tableName}
                WHERE customer_id = ?
                ORDER BY created_at DESC
            `;
            
            const services = await this.db.selectAll(sql, [customerId]);
            return services;
            
        } catch (error) {
            console.error('Failed to get services by customer:', error);
            throw error;
        }
    }

    /**
     * Get services by status
     */
    async getServicesByStatus(status) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                WHERE s.status = ?
                ORDER BY s.created_at DESC
            `;
            
            const services = await this.db.selectAll(sql, [status]);
            return services;
            
        } catch (error) {
            console.error('Failed to get services by status:', error);
            throw error;
        }
    }

    /**
     * Get incomplete services
     */
    async getIncompleteServices(limit = 10) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                WHERE s.status != 'completed'
                ORDER BY s.created_at ASC
                LIMIT ?
            `;
            
            const services = await this.db.selectAll(sql, [limit]);
            return services;
            
        } catch (error) {
            console.error('Failed to get incomplete services:', error);
            throw error;
        }
    }

    /**
     * Get services by date range
     */
    async getServicesByDateRange(fromDate, toDate) {
        try {
            const sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                WHERE s.service_date >= ? AND s.service_date <= ?
                ORDER BY s.service_date DESC, s.service_time DESC
            `;
            
            const services = await this.db.selectAll(sql, [fromDate, toDate]);
            return services;
            
        } catch (error) {
            console.error('Failed to get services by date range:', error);
            throw error;
        }
    }

    /**
     * Get service statistics
     */
    async getStatistics() {
        try {
            const stats = {};
            
            // Basic counts
            const totalServices = await this.db.selectOne(`SELECT COUNT(*) as count FROM ${this.tableName}`);
            stats.totalServices = totalServices ? totalServices.count : 0;
            
            // Status breakdown
            const statusStats = await this.db.selectAll(`
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(cost) as avg_cost,
                    SUM(cost) as total_cost
                FROM ${this.tableName}
                GROUP BY status
            `);
            
            stats.pendingServices = 0;
            stats.inProgressServices = 0;
            stats.onHoldServices = 0;
            stats.completedServices = 0;
            
            statusStats.forEach(stat => {
                switch(stat.status) {
                    case 'pending':
                        stats.pendingServices = stat.count;
                        break;
                    case 'in-progress':
                        stats.inProgressServices = stat.count;
                        break;
                    case 'on-hold':
                        stats.onHoldServices = stat.count;
                        break;
                    case 'completed':
                        stats.completedServices = stat.count;
                        stats.completedRevenue = stat.total_cost || 0;
                        break;
                }
            });
            
            stats.incompleteServices = stats.totalServices - stats.completedServices;
            
            // Revenue calculations
            const revenueStats = await this.db.selectOne(`
                SELECT 
                    SUM(CASE WHEN status = 'completed' THEN cost ELSE 0 END) as completed_revenue,
                    SUM(cost) as total_estimated_revenue,
                    AVG(cost) as avg_service_cost,
                    MAX(cost) as max_service_cost,
                    MIN(cost) as min_service_cost
                FROM ${this.tableName}
            `);
            
            stats.totalEstimatedRevenue = revenueStats?.total_estimated_revenue || 0;
            stats.completedRevenue = revenueStats?.completed_revenue || 0;
            stats.averageServiceCost = revenueStats?.avg_service_cost || 0;
            stats.maxServiceCost = revenueStats?.max_service_cost || 0;
            stats.minServiceCost = revenueStats?.min_service_cost || 0;
            
            // Today's services
            const today = new Date().toISOString().split('T')[0];
            const todayStats = await this.db.selectOne(`
                SELECT 
                    COUNT(*) as count,
                    SUM(CASE WHEN status = 'completed' THEN cost ELSE 0 END) as revenue
                FROM ${this.tableName}
                WHERE service_date = ?
            `, [today]);
            
            stats.todayServicesCount = todayStats?.count || 0;
            stats.todayRevenue = todayStats?.revenue || 0;
            
            // Popular watch brands for service
            const brandStats = await this.db.selectAll(`
                SELECT 
                    brand,
                    COUNT(*) as service_count,
                    AVG(cost) as avg_cost
                FROM ${this.tableName}
                GROUP BY brand
                ORDER BY service_count DESC
                LIMIT 10
            `);
            stats.popularBrands = brandStats;
            
            // Average completion time (for completed services)
            const completionStats = await this.db.selectOne(`
                SELECT 
                    AVG(julianday(completed_at) - julianday(created_at)) as avg_completion_days
                FROM ${this.tableName}
                WHERE status = 'completed' AND completed_at IS NOT NULL
            `);
            stats.averageCompletionDays = completionStats?.avg_completion_days || 0;
            
            // Monthly service trend (last 12 months)
            const monthlyServices = await this.db.selectAll(`
                SELECT 
                    strftime('%Y-%m', service_date) as month,
                    COUNT(*) as service_count,
                    SUM(CASE WHEN status = 'completed' THEN cost ELSE 0 END) as revenue
                FROM ${this.tableName}
                WHERE service_date >= date('now', '-12 months')
                GROUP BY strftime('%Y-%m', service_date)
                ORDER BY month
            `);
            stats.monthlyServices = monthlyServices;
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get service statistics:', error);
            throw error;
        }
    }

    /**
     * Search services
     */
    async searchServices(searchTerm, filters = {}) {
        try {
            let sql = `
                SELECT 
                    s.*,
                    c.name as customer_name,
                    c.phone as customer_phone
                FROM ${this.tableName} s
                JOIN customers c ON s.customer_id = c.id
                WHERE (
                    c.name LIKE ? OR 
                    c.phone LIKE ? OR 
                    s.brand LIKE ? OR 
                    s.model LIKE ? OR 
                    s.watch_name LIKE ? OR
                    s.issue LIKE ?
                )
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
            
            // Apply additional filters
            if (filters.status) {
                sql += ' AND s.status = ?';
                params.push(filters.status);
            }
            
            if (filters.dateFrom) {
                sql += ' AND s.service_date >= ?';
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                sql += ' AND s.service_date <= ?';
                params.push(filters.dateTo);
            }
            
            if (filters.brand) {
                sql += ' AND s.brand = ?';
                params.push(filters.brand);
            }
            
            sql += ' ORDER BY s.created_at DESC';
            
            const services = await this.db.selectAll(sql, params);
            return services;
            
        } catch (error) {
            console.error('Failed to search services:', error);
            throw error;
        }
    }

    /**
     * Export services data
     */
    async exportData(format = 'json', filters = {}) {
        try {
            const services = await this.getAllServices(filters);
            
            if (format === 'json') {
                return JSON.stringify(services, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(services);
            }
            
            throw new Error('Unsupported export format');
            
        } catch (error) {
            console.error('Failed to export services data:', error);
            throw error;
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(services) {
        if (!services || services.length === 0) {
            return '';
        }
        
        const headers = [
            'ID', 'Service Date', 'Time', 'Customer', 'Phone', 'Watch Name', 'Brand', 'Model',
            'Dial Color', 'Movement No', 'Gender', 'Case Type', 'Strap Type', 'Issue',
            'Cost', 'Status', 'Warranty (Months)', 'Estimated Delivery', 'Actual Delivery'
        ];
        
        const csvRows = [headers.join(',')];
        
        for (const service of services) {
            const row = [
                service.id,
                service.service_date,
                service.service_time,
                `"${service.customer_name}"`,
                service.customer_phone,
                `"${service.watch_name}"`,
                service.brand,
                service.model,
                service.dial_color,
                service.movement_no,
                service.gender,
                service.case_type,
                service.strap_type,
                `"${service.issue.replace(/"/g, '""')}"`,
                service.cost,
                service.status,
                service.warranty_period || 0,
                service.estimated_delivery || '',
                service.actual_delivery || ''
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
        console.log('🧹 Services cache cleared');
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
let servicesDB = null;

// Initialize when SQLite core is ready
document.addEventListener('DOMContentLoaded', function() {
    const initServicesDB = () => {
        if (window.SQLiteCore && window.SQLiteCore.isReady()) {
            servicesDB = new ServicesDB(window.SQLiteCore);
            window.ServicesDB = servicesDB;
            console.log('🔧 Services Database module initialized');
        } else {
            setTimeout(initServicesDB, 100);
        }
    };
    
    initServicesDB();
});

// Export for use by other modules
window.ServicesDB = servicesDB;