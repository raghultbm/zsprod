// Customer Database Operations for ZEDSON Watchcraft
class CustomersDB {
    constructor() {
        this.tableName = 'customers';
    }

    async getAllCustomers() {
        try {
            const customers = await window.DB.all(`
                SELECT * FROM ${this.tableName} 
                WHERE is_active = 1 
                ORDER BY creation_date DESC
            `);

            // Calculate and update net values for all customers
            await this.updateAllNetValues();

            return customers;
        } catch (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }
    }

    async getCustomerById(customerId) {
        try {
            const customer = await window.DB.get(`
                SELECT * FROM ${this.tableName} 
                WHERE customer_id = ? AND is_active = 1
            `, [customerId]);

            if (customer) {
                // Update net value for this customer
                await this.updateCustomerNetValue(customerId);
                
                // Fetch updated customer data
                return await window.DB.get(`
                    SELECT * FROM ${this.tableName} 
                    WHERE customer_id = ? AND is_active = 1
                `, [customerId]);
            }

            return customer;
        } catch (error) {
            console.error('Error fetching customer by ID:', error);
            throw error;
        }
    }

    async createCustomer(customerData) {
        try {
            // Sanitize data
            const sanitizedData = window.Validators.sanitizeData(customerData);
            
            // Validate data
            const validation = window.Validators.validateCustomer(sanitizedData);
            if (!validation.isValid) {
                return { success: false, error: validation.errors.join(', ') };
            }

            // Check for duplicates
            const duplicateId = await this.customerExists('customer_id', sanitizedData.customer_id);
            if (duplicateId) {
                return { success: false, error: 'Customer ID already exists' };
            }

            const duplicateMobile = await this.customerExists('mobile_number', sanitizedData.mobile_number);
            if (duplicateMobile) {
                return { success: false, error: 'Mobile number already registered' };
            }

            const currentUser = window.Auth.getCurrentUser();
            const now = new Date().toISOString();

            const result = await window.DB.run(`
                INSERT INTO ${this.tableName} (
                    customer_id, name, mobile_number, email, address, 
                    creation_date, net_value, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                sanitizedData.customer_id,
                sanitizedData.name,
                sanitizedData.mobile_number,
                sanitizedData.email,
                sanitizedData.address,
                sanitizedData.creation_date,
                0, // Initial net value
                currentUser.username,
                now
            ]);

            // Log the creation
            await window.AuditLogger.log(this.tableName, sanitizedData.customer_id, 'INSERT', {}, sanitizedData);

            return { 
                success: true, 
                customerId: sanitizedData.customer_id,
                id: result.id 
            };

        } catch (error) {
            console.error('Error creating customer:', error);
            return { success: false, error: 'Failed to create customer' };
        }
    }

    async updateCustomer(customerId, customerData) {
        try {
            // Get existing customer data for audit log
            const existingCustomer = await this.getCustomerById(customerId);
            if (!existingCustomer) {
                return { success: false, error: 'Customer not found' };
            }

            // Sanitize data
            const sanitizedData = window.Validators.sanitizeData(customerData);
            
            // Validate data
            const validation = window.Validators.validateCustomer(sanitizedData);
            if (!validation.isValid) {
                return { success: false, error: validation.errors.join(', ') };
            }

            // Check for duplicates (excluding current customer)
            if (sanitizedData.customer_id !== existingCustomer.customer_id) {
                const duplicateId = await this.customerExists('customer_id', sanitizedData.customer_id, customerId);
                if (duplicateId) {
                    return { success: false, error: 'Customer ID already exists' };
                }
            }

            if (sanitizedData.mobile_number !== existingCustomer.mobile_number) {
                const duplicateMobile = await this.customerExists('mobile_number', sanitizedData.mobile_number, customerId);
                if (duplicateMobile) {
                    return { success: false, error: 'Mobile number already registered' };
                }
            }

            const currentUser = window.Auth.getCurrentUser();
            const now = new Date().toISOString();

            await window.DB.run(`
                UPDATE ${this.tableName} SET
                    customer_id = ?, name = ?, mobile_number = ?, 
                    email = ?, address = ?, creation_date = ?,
                    updated_by = ?, updated_at = ?
                WHERE customer_id = ?
            `, [
                sanitizedData.customer_id,
                sanitizedData.name,
                sanitizedData.mobile_number,
                sanitizedData.email,
                sanitizedData.address,
                sanitizedData.creation_date,
                currentUser.username,
                now,
                customerId
            ]);

            // Log the update
            await window.AuditLogger.log(this.tableName, customerId, 'UPDATE', existingCustomer, sanitizedData);

            // Track field changes in history
            await this.trackFieldChanges(existingCustomer, sanitizedData, customerId);

            return { success: true, customerId: sanitizedData.customer_id };

        } catch (error) {
            console.error('Error updating customer:', error);
            return { success: false, error: 'Failed to update customer' };
        }
    }

    async deleteCustomer(customerId) {
        try {
            // Get existing customer data for audit log
            const existingCustomer = await this.getCustomerById(customerId);
            if (!existingCustomer) {
                throw new Error('Customer not found');
            }

            // Check if customer has any sales or services
            const hasSales = await window.DB.get('SELECT id FROM sales WHERE customer_id = ? LIMIT 1', [customerId]);
            const hasServices = await window.DB.get('SELECT id FROM services WHERE customer_id = ? LIMIT 1', [customerId]);
            
            if (hasSales || hasServices) {
                throw new Error('Cannot delete customer with existing sales or services. Please deactivate instead.');
            }

            const currentUser = window.Auth.getCurrentUser();
            const now = new Date().toISOString();

            // Soft delete - mark as inactive
            await window.DB.run(`
                UPDATE ${this.tableName} SET 
                    is_active = 0, 
                    updated_by = ?, 
                    updated_at = ?
                WHERE customer_id = ?
            `, [currentUser.username, now, customerId]);

            // Log the deletion
            await window.AuditLogger.log(this.tableName, customerId, 'DELETE', existingCustomer, { is_active: 0 });

            return { success: true };

        } catch (error) {
            console.error('Error deleting customer:', error);
            throw error;
        }
    }

    async customerExists(field, value, excludeCustomerId = null) {
        try {
            let sql = `SELECT customer_id FROM ${this.tableName} WHERE ${field} = ? AND is_active = 1`;
            let params = [value];

            if (excludeCustomerId) {
                sql += ' AND customer_id != ?';
                params.push(excludeCustomerId);
            }

            const result = await window.DB.get(sql, params);
            return !!result;
        } catch (error) {
            console.error('Error checking customer existence:', error);
            return false;
        }
    }

    async searchCustomers(searchTerm) {
        try {
            const term = `%${searchTerm.toLowerCase()}%`;
            
            const customers = await window.DB.all(`
                SELECT * FROM ${this.tableName} 
                WHERE is_active = 1 
                AND (
                    LOWER(name) LIKE ? OR 
                    LOWER(customer_id) LIKE ? OR 
                    mobile_number LIKE ?
                )
                ORDER BY name ASC
                LIMIT 50
            `, [term, term, term]);

            return customers;
        } catch (error) {
            console.error('Error searching customers:', error);
            return [];
        }
    }

    async updateCustomerNetValue(customerId) {
        try {
            // Calculate total from sales
            const salesTotal = await window.DB.get(`
                SELECT COALESCE(SUM(total_amount), 0) as total 
                FROM sales 
                WHERE customer_id = ? AND status = 'completed'
            `, [customerId]);

            // Calculate total from services
            const servicesTotal = await window.DB.get(`
                SELECT COALESCE(SUM(total_amount), 0) as total 
                FROM services 
                WHERE customer_id = ? AND status IN ('Service Completed', 'Delivered')
            `, [customerId]);

            const netValue = (salesTotal.total || 0) + (servicesTotal.total || 0);

            // Update customer net value
            await window.DB.run(`
                UPDATE ${this.tableName} 
                SET net_value = ? 
                WHERE customer_id = ?
            `, [netValue, customerId]);

            return netValue;
        } catch (error) {
            console.error('Error updating customer net value:', error);
            return 0;
        }
    }

    async updateAllNetValues() {
        try {
            // Get all active customers
            const customers = await window.DB.all(`
                SELECT customer_id FROM ${this.tableName} 
                WHERE is_active = 1
            `);

            // Update net value for each customer
            for (const customer of customers) {
                await this.updateCustomerNetValue(customer.customer_id);
            }
        } catch (error) {
            console.error('Error updating all net values:', error);
        }
    }

    async trackFieldChanges(oldData, newData, customerId) {
        try {
            const fieldsToTrack = ['name', 'mobile_number', 'email', 'address', 'creation_date'];
            
            for (const field of fieldsToTrack) {
                if (oldData[field] !== newData[field]) {
                    await window.AuditLogger.trackFieldChange(
                        this.tableName,
                        customerId,
                        field,
                        oldData[field],
                        newData[field],
                        `Updated by ${window.Auth.getCurrentUser().username}`
                    );
                }
            }
        } catch (error) {
            console.error('Error tracking field changes:', error);
        }
    }

    async getCustomerStats() {
        try {
            // Total customers
            const totalCustomers = await window.DB.get(`
                SELECT COUNT(*) as count FROM ${this.tableName} 
                WHERE is_active = 1
            `);

            // New customers this month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            const newThisMonth = await window.DB.get(`
                SELECT COUNT(*) as count FROM ${this.tableName} 
                WHERE is_active = 1 AND creation_date >= ?
            `, [startOfMonth.toISOString().split('T')[0]]);

            // Top customers by net value
            const topCustomers = await window.DB.all(`
                SELECT customer_id, name, net_value FROM ${this.tableName} 
                WHERE is_active = 1 AND net_value > 0
                ORDER BY net_value DESC 
                LIMIT 10
            `);

            // Average net value
            const avgNetValue = await window.DB.get(`
                SELECT AVG(net_value) as avg_value FROM ${this.tableName} 
                WHERE is_active = 1 AND net_value > 0
            `);

            return {
                totalCustomers: totalCustomers.count,
                newThisMonth: newThisMonth.count,
                topCustomers,
                averageNetValue: avgNetValue.avg_value || 0
            };
        } catch (error) {
            console.error('Error getting customer stats:', error);
            return {
                totalCustomers: 0,
                newThisMonth: 0,
                topCustomers: [],
                averageNetValue: 0
            };
        }
    }

    async getCustomerHistory(customerId) {
        try {
            // Get sales history
            const sales = await window.DB.all(`
                SELECT 'sale' as type, invoice_number as reference, 
                       sale_date as date, total_amount as amount, status
                FROM sales 
                WHERE customer_id = ? 
                ORDER BY sale_date DESC
            `, [customerId]);

            // Get services history
            const services = await window.DB.all(`
                SELECT 'service' as type, 
                       COALESCE(invoice_number, acknowledgement_number) as reference,
                       service_date as date, total_amount as amount, status
                FROM services 
                WHERE customer_id = ? 
                ORDER BY service_date DESC
            `, [customerId]);

            // Combine and sort by date
            const history = [...sales, ...services].sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );

            return history;
        } catch (error) {
            console.error('Error getting customer history:', error);
            return [];
        }
    }

    async getCustomersWithRecentActivity(days = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

            const customers = await window.DB.all(`
                SELECT DISTINCT c.customer_id, c.name, c.mobile_number, c.net_value,
                       MAX(COALESCE(s.sale_date, srv.service_date)) as last_activity
                FROM ${this.tableName} c
                LEFT JOIN sales s ON c.customer_id = s.customer_id AND s.sale_date >= ?
                LEFT JOIN services srv ON c.customer_id = srv.customer_id AND srv.service_date >= ?
                WHERE c.is_active = 1 
                AND (s.customer_id IS NOT NULL OR srv.customer_id IS NOT NULL)
                GROUP BY c.customer_id, c.name, c.mobile_number, c.net_value
                ORDER BY last_activity DESC
            `, [cutoffDateStr, cutoffDateStr]);

            return customers;
        } catch (error) {
            console.error('Error getting customers with recent activity:', error);
            return [];
        }
    }
}

// Make database class globally available
window.CustomersDB = CustomersDB;