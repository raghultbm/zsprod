// Audit logging system for ZEDSON Watchcraft
const Audit = {
    // Log an audit entry
    async log(action, tableName, recordId, details) {
        try {
            const currentUser = Auth.getCurrentUser();
            const userName = currentUser ? currentUser.username : 'system';
            
            await app.run(`
                INSERT INTO audit_log (action, table_name, record_id, details, user_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                action,
                tableName,
                recordId,
                details,
                userName,
                new Date().toISOString()
            ]);
            
            console.log(`Audit log: ${action} on ${tableName} by ${userName}`);
        } catch (error) {
            console.error('Audit logging error:', error);
            // Don't throw error as this shouldn't break the main operation
        }
    },

    // Log CREATE operations
    async logCreate(tableName, recordId, data, customMessage = null) {
        const details = customMessage || `Created new ${tableName} record with data: ${JSON.stringify(data)}`;
        await this.log('CREATE', tableName, recordId, details);
    },

    // Log UPDATE operations
    async logUpdate(tableName, recordId, oldData, newData, customMessage = null) {
        const changes = this.getChanges(oldData, newData);
        const details = customMessage || `Updated ${tableName} record. Changes: ${JSON.stringify(changes)}`;
        await this.log('UPDATE', tableName, recordId, details);
    },

    // Log DELETE operations
    async logDelete(tableName, recordId, data, customMessage = null) {
        const details = customMessage || `Deleted ${tableName} record: ${JSON.stringify(data)}`;
        await this.log('DELETE', tableName, recordId, details);
    },

    // Log custom actions
    async logAction(action, tableName, recordId, details) {
        await this.log(action, tableName, recordId, details);
    },

    // Get changes between old and new data
    getChanges(oldData, newData) {
        const changes = {};
        
        // Check for modified fields
        for (const key in newData) {
            if (oldData[key] !== newData[key]) {
                changes[key] = {
                    from: oldData[key],
                    to: newData[key]
                };
            }
        }
        
        // Check for removed fields
        for (const key in oldData) {
            if (!(key in newData)) {
                changes[key] = {
                    from: oldData[key],
                    to: null
                };
            }
        }
        
        return changes;
    },

    // Get audit trail for a specific record
    async getAuditTrail(tableName, recordId) {
        try {
            const auditEntries = await app.query(`
                SELECT action, details, user_name, created_at
                FROM audit_log
                WHERE table_name = ? AND record_id = ?
                ORDER BY created_at DESC
            `, [tableName, recordId]);
            
            return auditEntries.map(entry => ({
                ...entry,
                created_at: Utils.formatDate(entry.created_at, CONSTANTS.DATE_FORMATS.DISPLAY),
                details: this.tryParseJSON(entry.details)
            }));
        } catch (error) {
            console.error('Error fetching audit trail:', error);
            return [];
        }
    },

    // Get audit logs with filters
    async getAuditLogs(filters = {}) {
        try {
            let query = 'SELECT * FROM audit_log WHERE 1=1';
            const params = [];
            
            if (filters.tableName) {
                query += ' AND table_name = ?';
                params.push(filters.tableName);
            }
            
            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }
            
            if (filters.userName) {
                query += ' AND user_name = ?';
                params.push(filters.userName);
            }
            
            if (filters.dateFrom) {
                query += ' AND DATE(created_at) >= ?';
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                query += ' AND DATE(created_at) <= ?';
                params.push(filters.dateTo);
            }
            
            query += ' ORDER BY created_at DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            const logs = await app.query(query, params);
            
            return logs.map(log => ({
                ...log,
                created_at: Utils.formatDate(log.created_at, CONSTANTS.DATE_FORMATS.DISPLAY),
                details: this.tryParseJSON(log.details)
            }));
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
    },

    // Helper to try parsing JSON details
    tryParseJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return jsonString;
        }
    },

    // Get audit statistics
    async getAuditStats(dateFrom, dateTo) {
        try {
            let query = `
                SELECT 
                    action,
                    table_name,
                    COUNT(*) as count
                FROM audit_log
                WHERE 1=1
            `;
            const params = [];
            
            if (dateFrom) {
                query += ' AND DATE(created_at) >= ?';
                params.push(dateFrom);
            }
            
            if (dateTo) {
                query += ' AND DATE(created_at) <= ?';
                params.push(dateTo);
            }
            
            query += ' GROUP BY action, table_name ORDER BY count DESC';
            
            const stats = await app.query(query, params);
            
            // Get user activity stats
            let userQuery = `
                SELECT 
                    user_name,
                    COUNT(*) as activity_count,
                    COUNT(DISTINCT table_name) as tables_accessed
                FROM audit_log
                WHERE 1=1
            `;
            
            if (dateFrom) {
                userQuery += ' AND DATE(created_at) >= ?';
            }
            
            if (dateTo) {
                userQuery += ' AND DATE(created_at) <= ?';
            }
            
            userQuery += ' GROUP BY user_name ORDER BY activity_count DESC';
            
            const userStats = await app.query(userQuery, params);
            
            return {
                actionStats: stats,
                userStats: userStats
            };
        } catch (error) {
            console.error('Error fetching audit statistics:', error);
            return { actionStats: [], userStats: [] };
        }
    },

    // Clean old audit logs (keep only last N days)
    async cleanOldLogs(daysToKeep = 365) {
        try {
            if (!Auth.isAdmin()) {
                throw new Error('Only admin users can clean audit logs');
            }
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const result = await app.run(`
                DELETE FROM audit_log 
                WHERE created_at < ?
            `, [cutoffDate.toISOString()]);
            
            await this.log('SYSTEM', 'audit_log', null, `Cleaned ${result.changes} old audit log entries older than ${daysToKeep} days`);
            
            return result.changes;
        } catch (error) {
            console.error('Error cleaning old audit logs:', error);
            throw error;
        }
    },

    // Export audit logs to CSV
    async exportLogs(filters = {}) {
        try {
            const logs = await this.getAuditLogs(filters);
            
            const exportData = logs.map(log => ({
                'Date & Time': log.created_at,
                'User': log.user_name,
                'Action': log.action,
                'Table': log.table_name,
                'Record ID': log.record_id,
                'Details': typeof log.details === 'object' ? JSON.stringify(log.details) : log.details
            }));
            
            Utils.exportToCSV(exportData, 'audit_logs');
        } catch (error) {
            console.error('Error exporting audit logs:', error);
            throw error;
        }
    }
};

// Make Audit globally available
if (typeof window !== 'undefined') {
    window.Audit = Audit;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Audit;
}