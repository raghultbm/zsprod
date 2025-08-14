const { runQuery } = require('./database');
const authManager = require('./auth');

class AuditLogger {
    constructor() {
        this.pendingLogs = [];
        this.batchSize = 10;
        this.batchTimeout = 5000; // 5 seconds
        this.batchTimer = null;
    }

    async logAction(module, action, recordId = null, oldData = null, newData = null) {
        try {
            const currentUser = authManager.getCurrentUser();
            if (!currentUser) {
                console.warn('Audit log attempted without authenticated user');
                return;
            }

            const logEntry = {
                module: module,
                action: action,
                record_id: recordId ? recordId.toString() : null,
                old_data: oldData ? JSON.stringify(oldData) : null,
                new_data: newData ? JSON.stringify(newData) : null,
                user_name: currentUser.username,
                timestamp: new Date().toISOString()
            };

            // Add to pending logs for batch processing
            this.pendingLogs.push(logEntry);

            // Process immediately for critical actions
            if (this.isCriticalAction(action)) {
                await this.processPendingLogs();
            } else {
                this.scheduleBatchProcess();
            }

        } catch (error) {
            console.error('Audit logging error:', error);
        }
    }

    isCriticalAction(action) {
        const criticalActions = [
            'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE',
            'USER_CREATE', 'USER_DELETE', 'PERMISSION_CHANGE'
        ];
        return criticalActions.includes(action.toUpperCase());
    }

    scheduleBatchProcess() {
        if (this.batchTimer) return;

        this.batchTimer = setTimeout(async () => {
            await this.processPendingLogs();
        }, this.batchTimeout);

        // Process if batch size reached
        if (this.pendingLogs.length >= this.batchSize) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
            await this.processPendingLogs();
        }
    }

    async processPendingLogs() {
        if (this.pendingLogs.length === 0) return;

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        const logsToProcess = [...this.pendingLogs];
        this.pendingLogs = [];

        try {
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
            const currentUser = authManager.getCurrentUser();
            if (!currentUser) return;

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
            console.error('History logging error:', error);
        }
    }

    // Method to get audit trail for a specific record
    async getAuditTrail(module, recordId = null, limit = 50) {
        try {
            let sql = `SELECT * FROM audit_log WHERE module = ?`;
            let params = [module];

            if (recordId) {
                sql += ` AND record_id = ?`;
                params.push(recordId.toString());
            }

            sql += ` ORDER BY timestamp DESC LIMIT ?`;
            params.push(limit);

            const { allQuery } = require('./database');
            return await allQuery(sql, params);

        } catch (error) {
            console.error('Error getting audit trail:', error);
            return [];
        }
    }

    // Method to get history for a specific record
    async getHistory(module, recordId, limit = 20) {
        try {
            const sql = `SELECT * FROM history 
                        WHERE module = ? AND record_id = ? 
                        ORDER BY changed_at DESC LIMIT ?`;

            const { allQuery } = require('./database');
            return await allQuery(sql, [module, recordId, limit]);

        } catch (error) {
            console.error('Error getting history:', error);
            return [];
        }
    }

    // Generate activity summary
    async getActivitySummary(startDate, endDate = null) {
        try {
            let sql = `SELECT module, action, COUNT(*) as count, 
                             MIN(timestamp) as first_action,
                             MAX(timestamp) as last_action
                      FROM audit_log 
                      WHERE DATE(timestamp) >= DATE(?)`;
            
            let params = [startDate];

            if (endDate) {
                sql += ` AND DATE(timestamp) <= DATE(?)`;
                params.push(endDate);
            }

            sql += ` GROUP BY module, action ORDER BY module, count DESC`;

            const { allQuery } = require('./database');
            return await allQuery(sql, params);

        } catch (error) {
            console.error('Error getting activity summary:', error);
            return [];
        }
    }

    // Clean old audit logs (maintenance)
    async cleanOldLogs(daysToKeep = 365) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const sql = `DELETE FROM audit_log WHERE DATE(timestamp) < DATE(?)`;
            const result = await runQuery(sql, [cutoffDate.toISOString().split('T')[0]]);

            console.log(`Cleaned ${result.changes} old audit log entries`);
            await this.logAction('SYSTEM', 'AUDIT_CLEANUP', null, null, { 
                cleaned_count: result.changes, 
                cutoff_date: cutoffDate.toISOString() 
            });

            return result.changes;

        } catch (error) {
            console.error('Error cleaning old logs:', error);
            return 0;
        }
    }
}

// Create singleton instance
const auditLogger = new AuditLogger();

module.exports = auditLogger;