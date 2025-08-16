class AuditLogger {
    constructor() {
        this.enableLogging = true;
        this.logQueue = [];
        this.isProcessing = false;
    }

    async log(tableName, recordId, action, oldValues = {}, newValues = {}) {
        if (!this.enableLogging) return;

        const currentUser = window.Auth?.getCurrentUser();
        if (!currentUser) return;

        const auditEntry = {
            table_name: tableName,
            record_id: recordId.toString(),
            action: action.toUpperCase(),
            old_values: JSON.stringify(oldValues),
            new_values: JSON.stringify(newValues),
            user_name: currentUser.username,
            timestamp: new Date().toISOString()
        };

        // Add to queue for batch processing
        this.logQueue.push(auditEntry);
        
        // Process queue if not already processing
        if (!this.isProcessing) {
            await this.processQueue();
        }
    }

    async processQueue() {
        if (this.logQueue.length === 0) return;

        this.isProcessing = true;
        
        try {
            while (this.logQueue.length > 0) {
                const entry = this.logQueue.shift();
                await this.writeToDatabase(entry);
            }
        } catch (error) {
            console.error('Error processing audit queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async writeToDatabase(entry) {
        try {
            await window.DB.run(`
                INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_name, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                entry.table_name,
                entry.record_id,
                entry.action,
                entry.old_values,
                entry.new_values,
                entry.user_name,
                entry.timestamp
            ]);
        } catch (error) {
            console.error('Error writing audit log:', error);
            // Re-add to queue for retry
            this.logQueue.unshift(entry);
        }
    }

    async getAuditTrail(tableName, recordId, limit = 50) {
        try {
            const logs = await window.DB.all(`
                SELECT * FROM audit_log 
                WHERE table_name = ? AND record_id = ?
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [tableName, recordId.toString(), limit]);

            return logs.map(log => ({
                ...log,
                old_values: this.parseJSON(log.old_values),
                new_values: this.parseJSON(log.new_values),
                formatted_timestamp: this.formatTimestamp(log.timestamp)
            }));
        } catch (error) {
            console.error('Error fetching audit trail:', error);
            return [];
        }
    }

    async getRecentActivity(limit = 20) {
        try {
            const logs = await window.DB.all(`
                SELECT * FROM audit_log 
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [limit]);

            return logs.map(log => ({
                ...log,
                old_values: this.parseJSON(log.old_values),
                new_values: this.parseJSON(log.new_values),
                formatted_timestamp: this.formatTimestamp(log.timestamp),
                description: this.generateDescription(log)
            }));
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            return [];
        }
    }

    parseJSON(jsonString) {
        try {
            return jsonString ? JSON.parse(jsonString) : {};
        } catch (error) {
            return {};
        }
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    generateDescription(log) {
        const { table_name, action, user_name } = log;
        const tableName = table_name.replace('_', ' ').toUpperCase();
        
        switch (action) {
            case 'INSERT':
                return `${user_name} created a new ${tableName} record`;
            case 'UPDATE':
                return `${user_name} updated ${tableName} record`;
            case 'DELETE':
                return `${user_name} deleted ${tableName} record`;
            case 'LOGIN':
                return `${user_name} logged into the system`;
            case 'LOGOUT':
                return `${user_name} logged out of the system`;
            default:
                return `${user_name} performed ${action} on ${tableName}`;
        }
    }

    async getActivityByUser(username, limit = 50) {
        try {
            const logs = await window.DB.all(`
                SELECT * FROM audit_log 
                WHERE user_name = ?
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [username, limit]);

            return logs.map(log => ({
                ...log,
                old_values: this.parseJSON(log.old_values),
                new_values: this.parseJSON(log.new_values),
                formatted_timestamp: this.formatTimestamp(log.timestamp)
            }));
        } catch (error) {
            console.error('Error fetching user activity:', error);
            return [];
        }
    }

    async getActivityByDate(date, limit = 100) {
        try {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            const logs = await window.DB.all(`
                SELECT * FROM audit_log 
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [startDate.toISOString(), endDate.toISOString(), limit]);

            return logs.map(log => ({
                ...log,
                old_values: this.parseJSON(log.old_values),
                new_values: this.parseJSON(log.new_values),
                formatted_timestamp: this.formatTimestamp(log.timestamp)
            }));
        } catch (error) {
            console.error('Error fetching activity by date:', error);
            return [];
        }
    }

    // Method to track field changes for history table
    async trackFieldChange(tableName, recordId, fieldName, oldValue, newValue, comments = '') {
        if (!window.Auth?.getCurrentUser()) return;

        try {
            await window.DB.run(`
                INSERT INTO history (table_name, record_id, field_name, old_value, new_value, comments, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tableName,
                recordId,
                fieldName,
                oldValue?.toString() || '',
                newValue?.toString() || '',
                comments,
                window.Auth.getCurrentUser().username,
                new Date().toISOString()
            ]);
        } catch (error) {
            console.error('Error tracking field change:', error);
        }
    }

    async getFieldHistory(tableName, recordId, fieldName = null) {
        try {
            let sql = `
                SELECT * FROM history 
                WHERE table_name = ? AND record_id = ?
            `;
            let params = [tableName, recordId];

            if (fieldName) {
                sql += ` AND field_name = ?`;
                params.push(fieldName);
            }

            sql += ` ORDER BY updated_at DESC`;

            const history = await window.DB.all(sql, params);
            
            return history.map(entry => ({
                ...entry,
                formatted_timestamp: this.formatTimestamp(entry.updated_at)
            }));
        } catch (error) {
            console.error('Error fetching field history:', error);
            return [];
        }
    }

    // Toggle logging on/off
    toggleLogging(enable) {
        this.enableLogging = enable;
    }

    // Get logging status
    isLoggingEnabled() {
        return this.enableLogging;
    }
}

// Global audit logger instance
window.AuditLogger = new AuditLogger();