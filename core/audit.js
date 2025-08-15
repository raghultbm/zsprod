class AuditLogger {
    constructor() {
        this.pendingLogs = [];
        this.processingLogs = false;
        this.batchSize = 10;
        this.flushInterval = 5000; // 5 seconds
        
        // Start periodic flush
        if (typeof window !== 'undefined') {
            setInterval(() => this.processPendingLogs(), this.flushInterval);
        }
    }

    async logAction(module, action, recordId = null, oldData = null, newData = null) {
        try {
            const currentUser = typeof authManager !== 'undefined' ? authManager.getCurrentUser() : null;
            const userName = currentUser ? currentUser.username : 'system';

            const logEntry = {
                module: module.toUpperCase(),
                action: action.toUpperCase(),
                record_id: recordId ? recordId.toString() : null,
                old_data: oldData ? JSON.stringify(oldData) : null,
                new_data: newData ? JSON.stringify(newData) : null,
                user_name: userName,
                timestamp: new Date().toISOString()
            };

            // Add to pending logs for batch processing
            this.pendingLogs.push(logEntry);

            // Process immediately if batch is full
            if (this.pendingLogs.length >= this.batchSize) {
                await this.processPendingLogs();
            }

        } catch (error) {
            console.error('Failed to log audit entry:', error);
        }
    }

    async processPendingLogs() {
        if (this.processingLogs || this.pendingLogs.length === 0) {
            return;
        }

        this.processingLogs = true;

        try {
            const { runQuery } = require('./database');
            const logsToProcess = this.pendingLogs.splice(0, this.batchSize);

            const sql = `INSERT INTO audit_log 
                        (module, action, record_id, old_data, new_data, user_name, timestamp) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;

            for (const log of logsToProcess) {
                await runQuery(sql, [
                    log.module,
                    log.action,
                    log.record_id,
                    log.old_data,
                    log.new_data,
                    log.user_name,
                    log.timestamp
                ]);
            }

        } catch (error) {
            console.error('Failed to process audit logs:', error);
            // Re-add failed logs to pending (with limit to prevent infinite growth)
            if (this.pendingLogs.length < 100) {
                this.pendingLogs.unshift(...logsToProcess);
            }
        } finally {
            this.processingLogs = false;
        }
    }

    // Convenience methods for common actions
    async logCreate(module, recordId, newData) {
        await this.logAction(module, 'CREATE', recordId, null, newData);
    }

    async logUpdate(module, recordId, oldData, newData) {
        await this.logAction(module, 'UPDATE', recordId, oldData, newData);
    }

    async logDelete(module, recordId, oldData) {
        await this.logAction(module, 'DELETE', recordId, oldData, null);
    }

    async logView(module, recordId = null) {
        await this.logAction(module, 'VIEW', recordId);
    }

    async logLogin(username) {
        await this.logAction('AUTH', 'LOGIN', username);
    }

    async logLogout(username) {
        await this.logAction('AUTH', 'LOGOUT', username);
    }

    async logSaleComplete(saleId, saleData) {
        await this.logAction('SALES', 'SALE_COMPLETE', saleId, null, saleData);
    }

    async logServiceStatusChange(serviceId, oldStatus, newStatus) {
        await this.logAction('SERVICE', 'STATUS_CHANGE', serviceId, 
            { status: oldStatus }, { status: newStatus });
    }

    async logInvoiceGenerate(invoiceNumber, invoiceData) {
        await this.logAction('INVOICE', 'GENERATE', invoiceNumber, null, invoiceData);
    }

    async logBackup() {
        await this.logAction('SYSTEM', 'BACKUP', null);
    }

    // History tracking for inventory and services
    async logHistory(module, recordId, fieldName, oldValue, newValue, comments = null) {
        try {
            const currentUser = typeof authManager !== 'undefined' ? authManager.getCurrentUser() : null;
            if (!currentUser) return;

            const { runQuery } = require('./database');

            const sql = `INSERT INTO history 
                        (module, record_id, field_name, old_value, new_value, comments, changed_by) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;

            await runQuery(sql, [
                module,
                recordId,
                fieldName,
                oldValue ? oldValue.toString() : null,
                newValue ? newValue.toString() : null,
                comments,
                currentUser.username
            ]);

        } catch (error) {
            console.error('Failed to log history entry:', error);
        }
    }

    // Get audit logs with filtering
    async getAuditLogs(filters = {}) {
        try {
            const { allQuery } = require('./database');
            
            let sql = `SELECT * FROM audit_log WHERE 1=1`;
            const params = [];

            if (filters.module) {
                sql += ` AND module = ?`;
                params.push(filters.module.toUpperCase());
            }

            if (filters.action) {
                sql += ` AND action = ?`;
                params.push(filters.action.toUpperCase());
            }

            if (filters.user_name) {
                sql += ` AND user_name = ?`;
                params.push(filters.user_name);
            }

            if (filters.startDate) {
                sql += ` AND timestamp >= ?`;
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                sql += ` AND timestamp <= ?`;
                params.push(filters.endDate);
            }

            sql += ` ORDER BY timestamp DESC`;

            if (filters.limit) {
                sql += ` LIMIT ?`;
                params.push(filters.limit);
            }

            return await allQuery(sql, params);

        } catch (error) {
            console.error('Failed to get audit logs:', error);
            return [];
        }
    }

    // Get history for a specific record
    async getRecordHistory(module, recordId) {
        try {
            const { allQuery } = require('./database');
            
            const sql = `SELECT * FROM history 
                        WHERE module = ? AND record_id = ? 
                        ORDER BY changed_at DESC`;

            return await allQuery(sql, [module, recordId]);

        } catch (error) {
            console.error('Failed to get record history:', error);
            return [];
        }
    }

    // Clean old audit logs (useful for maintenance)
    async cleanOldLogs(daysToKeep = 90) {
        try {
            const { runQuery } = require('./database');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const sql = `DELETE FROM audit_log WHERE timestamp < ?`;
            const result = await runQuery(sql, [cutoffDate.toISOString()]);

            console.log(`Cleaned ${result.changes} old audit log entries`);
            return result.changes;

        } catch (error) {
            console.error('Failed to clean old audit logs:', error);
            return 0;
        }
    }

    // Get audit statistics
    async getAuditStats(startDate = null, endDate = null) {
        try {
            const { allQuery } = require('./database');
            
            let sql = `SELECT 
                        module,
                        action,
                        COUNT(*) as count
                      FROM audit_log 
                      WHERE 1=1`;
            const params = [];

            if (startDate) {
                sql += ` AND timestamp >= ?`;
                params.push(startDate);
            }

            if (endDate) {
                sql += ` AND timestamp <= ?`;
                params.push(endDate);
            }

            sql += ` GROUP BY module, action ORDER BY count DESC`;

            return await allQuery(sql, params);

        } catch (error) {
            console.error('Failed to get audit stats:', error);
            return [];
        }
    }
}

// Create singleton instance
const auditLogger = new AuditLogger();

// Make it globally available
if (typeof window !== 'undefined') {
    window.auditLogger = auditLogger;
}