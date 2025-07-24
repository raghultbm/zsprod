// ZEDSON WATCHCRAFT - SQLite Core Database Module
// js/database/sqlite-core.js

/**
 * Core SQLite database wrapper and connection management
 * Provides database initialization, connection management, and core operations
 */

class SQLiteCore {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.dbName = 'zedson_watchcraft.db';
        this.transactionQueue = [];
        this.isTransacting = false;
        this.connectionPool = [];
        this.maxConnections = 5;
        this.errorCount = 0;
        this.maxErrors = 10;
    }

    /**
     * Initialize SQLite database
     */
    async initializeDatabase() {
        try {
            console.log('🔧 Initializing ZEDSON WATCHCRAFT SQLite Database...');
            
            // Check if SQLite is available
            if (!window.SQL) {
                throw new Error('SQLite not available. Please include sql.js library.');
            }

            // Initialize SQL.js
            const SQL = await window.initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            // Create or open database
            await this.createConnection(SQL);
            
            // Run migrations to create tables
            await this.runMigrations();
            
            // Initialize connection pool
            this.initializeConnectionPool();
            
            this.isInitialized = true;
            
            console.log('✅ SQLite Database initialized successfully');
            
            // Log initialization
            if (window.logAction) {
                logAction('SQLite database initialized successfully', {
                    dbName: this.dbName,
                    timestamp: new Date().toISOString()
                }, 'database');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.handleError('Database initialization failed', error);
            return false;
        }
    }

    /**
     * Create database connection
     */
    async createConnection(SQL) {
        try {
            // Try to load existing database from localStorage
            const savedDb = localStorage.getItem(this.dbName);
            
            if (savedDb) {
                // Load existing database
                const dbData = new Uint8Array(JSON.parse(savedDb));
                this.db = new SQL.Database(dbData);
                console.log('📂 Loaded existing database from storage');
            } else {
                // Create new database
                this.db = new SQL.Database();
                console.log('🆕 Created new database');
            }
            
            // Configure database settings
            this.configureDatabase();
            
        } catch (error) {
            console.error('Connection creation failed:', error);
            throw error;
        }
    }

    /**
     * Configure database settings for optimal performance
     */
    configureDatabase() {
        try {
            // Enable foreign keys
            this.db.run('PRAGMA foreign_keys = ON');
            
            // Set journal mode to WAL for better concurrency
            this.db.run('PRAGMA journal_mode = WAL');
            
            // Set synchronous mode for better performance
            this.db.run('PRAGMA synchronous = NORMAL');
            
            // Set cache size (in KB)
            this.db.run('PRAGMA cache_size = 10000');
            
            // Set temp store to memory
            this.db.run('PRAGMA temp_store = MEMORY');
            
            console.log('⚙️ Database configuration applied');
            
        } catch (error) {
            console.warn('Database configuration warning:', error);
        }
    }

    /**
     * Initialize connection pool
     */
    initializeConnectionPool() {
        // For SQLite, we'll manage connections through a queue system
        // since SQLite doesn't support true connection pooling
        this.connectionPool = [];
        for (let i = 0; i < this.maxConnections; i++) {
            this.connectionPool.push({
                id: i,
                busy: false,
                lastUsed: Date.now()
            });
        }
    }

    /**
     * Get available connection from pool
     */
    getConnection() {
        const available = this.connectionPool.find(conn => !conn.busy);
        if (available) {
            available.busy = true;
            available.lastUsed = Date.now();
            return available;
        }
        return null;
    }

    /**
     * Release connection back to pool
     */
    releaseConnection(connection) {
        if (connection) {
            connection.busy = false;
            connection.lastUsed = Date.now();
        }
    }

    /**
     * Run database migrations
     */
    async runMigrations() {
        try {
            console.log('🔄 Running database migrations...');
            
            // Load and execute schema
            const schemaModule = window.DatabaseSchema;
            if (schemaModule) {
                await schemaModule.createTables(this.db);
                await schemaModule.createIndexes(this.db);
                await schemaModule.insertDefaultData(this.db);
            }
            
            // Save database after migrations
            await this.saveDatabase();
            
            console.log('✅ Migrations completed successfully');
            
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    /**
     * Execute SQL query with error handling and logging
     */
    async executeQuery(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        const connection = this.getConnection();
        if (!connection) {
            throw new Error('No database connection available');
        }

        try {
            console.log('🔍 Executing query:', sql, params);
            
            let result;
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                // For SELECT queries
                const stmt = this.db.prepare(sql);
                result = stmt.getAsObject(params);
                stmt.free();
            } else {
                // For INSERT, UPDATE, DELETE queries
                result = this.db.run(sql, params);
            }
            
            // Save database after write operations
            if (!sql.trim().toUpperCase().startsWith('SELECT')) {
                await this.saveDatabase();
            }
            
            this.releaseConnection(connection);
            return result;
            
        } catch (error) {
            this.releaseConnection(connection);
            this.handleError('Query execution failed', error, { sql, params });
            throw error;
        }
    }

    /**
     * Execute multiple queries in a transaction
     */
    async executeTransaction(queries) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        const connection = this.getConnection();
        if (!connection) {
            throw new Error('No database connection available');
        }

        try {
            console.log('🔄 Starting transaction with', queries.length, 'queries');
            
            // Begin transaction
            this.db.run('BEGIN TRANSACTION');
            
            const results = [];
            
            for (const query of queries) {
                const { sql, params = [] } = query;
                
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    const stmt = this.db.prepare(sql);
                    results.push(stmt.getAsObject(params));
                    stmt.free();
                } else {
                    results.push(this.db.run(sql, params));
                }
            }
            
            // Commit transaction
            this.db.run('COMMIT');
            
            // Save database
            await this.saveDatabase();
            
            this.releaseConnection(connection);
            
            console.log('✅ Transaction completed successfully');
            return results;
            
        } catch (error) {
            // Rollback on error
            try {
                this.db.run('ROLLBACK');
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            
            this.releaseConnection(connection);
            this.handleError('Transaction failed', error, { queryCount: queries.length });
            throw error;
        }
    }

    /**
     * Get all results from a SELECT query
     */
    async selectAll(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        try {
            const stmt = this.db.prepare(sql);
            const results = [];
            
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            
            stmt.free();
            return results;
            
        } catch (error) {
            this.handleError('Select all failed', error, { sql, params });
            throw error;
        }
    }

    /**
     * Get single result from a SELECT query
     */
    async selectOne(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        try {
            const stmt = this.db.prepare(sql);
            let result = null;
            
            if (stmt.step()) {
                result = stmt.getAsObject();
            }
            
            stmt.free();
            return result;
            
        } catch (error) {
            this.handleError('Select one failed', error, { sql, params });
            throw error;
        }
    }

    /**
     * Insert record and return the inserted ID
     */
    async insert(table, data) {
        try {
            const columns = Object.keys(data);
            const placeholders = columns.map(() => '?').join(', ');
            const values = Object.values(data);
            
            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            
            const result = await this.executeQuery(sql, values);
            
            // Get last inserted row ID
            const lastId = this.db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0];
            
            return { insertId: lastId, changes: result.changes || 1 };
            
        } catch (error) {
            this.handleError('Insert failed', error, { table, data });
            throw error;
        }
    }

    /**
     * Update records
     */
    async update(table, data, whereClause, whereParams = []) {
        try {
            const columns = Object.keys(data);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            const values = [...Object.values(data), ...whereParams];
            
            const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
            
            const result = await this.executeQuery(sql, values);
            return { changes: result.changes || 0 };
            
        } catch (error) {
            this.handleError('Update failed', error, { table, data, whereClause });
            throw error;
        }
    }

    /**
     * Delete records
     */
    async delete(table, whereClause, whereParams = []) {
        try {
            const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
            const result = await this.executeQuery(sql, whereParams);
            return { changes: result.changes || 0 };
            
        } catch (error) {
            this.handleError('Delete failed', error, { table, whereClause });
            throw error;
        }
    }

    /**
     * Save database to localStorage
     */
    async saveDatabase() {
        try {
            if (this.db) {
                const data = this.db.export();
                const buffer = Array.from(data);
                localStorage.setItem(this.dbName, JSON.stringify(buffer));
                
                // Log save operation periodically
                if (Math.random() < 0.1) { // 10% chance to log
                    console.log('💾 Database saved to localStorage');
                }
            }
        } catch (error) {
            console.error('Failed to save database:', error);
            this.handleError('Database save failed', error);
        }
    }

    /**
     * Create database backup
     */
    async createBackup() {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `${this.dbName}_backup_${timestamp}`;
            
            const data = this.db.export();
            const buffer = Array.from(data);
            
            // Save backup to localStorage
            localStorage.setItem(backupName, JSON.stringify(buffer));
            
            // Also create downloadable backup
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            console.log('💾 Database backup created:', backupName);
            
            if (window.logAction) {
                logAction('Database backup created', {
                    backupName,
                    size: data.length,
                    timestamp
                }, 'database');
            }
            
            return { backupName, downloadUrl: url, size: data.length };
            
        } catch (error) {
            this.handleError('Backup creation failed', error);
            throw error;
        }
    }

    /**
     * Restore database from backup
     */
    async restoreFromBackup(backupData) {
        try {
            console.log('🔄 Restoring database from backup...');
            
            let data;
            if (typeof backupData === 'string') {
                // Restore from localStorage backup name
                const savedBackup = localStorage.getItem(backupData);
                if (!savedBackup) {
                    throw new Error('Backup not found');
                }
                data = new Uint8Array(JSON.parse(savedBackup));
            } else {
                // Restore from direct data
                data = new Uint8Array(backupData);
            }
            
            // Initialize SQL.js if needed
            if (!window.SQL) {
                const SQL = await window.initSqlJs({
                    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                });
                window.SQL = SQL;
            }
            
            // Create new database from backup
            this.db = new window.SQL.Database(data);
            this.configureDatabase();
            
            // Save restored database
            await this.saveDatabase();
            
            console.log('✅ Database restored successfully');
            
            if (window.logAction) {
                logAction('Database restored from backup', {
                    timestamp: new Date().toISOString()
                }, 'database');
            }
            
            return true;
            
        } catch (error) {
            this.handleError('Database restore failed', error);
            throw error;
        }
    }

    /**
     * Verify database integrity
     */
    async verifyIntegrity() {
        try {
            const result = await this.selectOne('PRAGMA integrity_check');
            const isValid = result && result.integrity_check === 'ok';
            
            console.log('🔍 Database integrity check:', isValid ? 'PASSED' : 'FAILED');
            
            return isValid;
            
        } catch (error) {
            this.handleError('Integrity check failed', error);
            return false;
        }
    }

    /**
     * Get database statistics
     */
    async getStatistics() {
        try {
            const stats = {
                tables: [],
                totalRecords: 0,
                databaseSize: 0,
                lastModified: new Date().toISOString()
            };
            
            // Get table information
            const tables = await this.selectAll(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );
            
            for (const table of tables) {
                const countResult = await this.selectOne(`SELECT COUNT(*) as count FROM ${table.name}`);
                const recordCount = countResult ? countResult.count : 0;
                
                stats.tables.push({
                    name: table.name,
                    records: recordCount
                });
                
                stats.totalRecords += recordCount;
            }
            
            // Calculate database size
            if (this.db) {
                const data = this.db.export();
                stats.databaseSize = data.length;
            }
            
            return stats;
            
        } catch (error) {
            this.handleError('Statistics gathering failed', error);
            return null;
        }
    }

    /**
     * Handle database errors with logging and recovery
     */
    handleError(message, error, context = {}) {
        this.errorCount++;
        
        const errorInfo = {
            message,
            error: error.message || error,
            context,
            timestamp: new Date().toISOString(),
            errorCount: this.errorCount
        };
        
        console.error('🚨 Database Error:', errorInfo);
        
        // Log error if logging is available
        if (window.logAction) {
            logAction('Database error occurred', errorInfo, 'database_error');
        }
        
        // If too many errors, suggest restart
        if (this.errorCount >= this.maxErrors) {
            console.error('🚨 Too many database errors. Consider restarting the application.');
            if (window.Utils && window.Utils.showNotification) {
                Utils.showNotification(
                    'Database experiencing issues. Please refresh the page or contact support.',
                    'error'
                );
            }
        }
        
        // Attempt recovery for certain error types
        this.attemptRecovery(error);
    }

    /**
     * Attempt error recovery
     */
    async attemptRecovery(error) {
        try {
            const errorMessage = error.message || error.toString();
            
            if (errorMessage.includes('database is locked')) {
                console.log('🔄 Attempting to resolve database lock...');
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } else if (errorMessage.includes('no such table')) {
                console.log('🔄 Attempting to recreate missing tables...');
                await this.runMigrations();
                
            } else if (errorMessage.includes('database disk image is malformed')) {
                console.log('🔄 Database corruption detected, attempting backup restore...');
                // Could implement automatic backup restore here
            }
            
        } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
        }
    }

    /**
     * Close database connection
     */
    async close() {
        try {
            if (this.db) {
                // Save before closing
                await this.saveDatabase();
                
                // Close database
                this.db.close();
                this.db = null;
                this.isInitialized = false;
                
                console.log('📴 Database connection closed');
                
                if (window.logAction) {
                    logAction('Database connection closed', {
                        timestamp: new Date().toISOString()
                    }, 'database');
                }
            }
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }

    /**
     * Check if database is ready
     */
    isReady() {
        return this.isInitialized && this.db !== null;
    }
}

// Create singleton instance
const sqliteCore = new SQLiteCore();

// Export for use by other modules
window.SQLiteCore = sqliteCore;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Wait for dependencies
        await new Promise(resolve => {
            const checkDependencies = () => {
                if (window.SQL || document.querySelector('script[src*="sql.js"]')) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
        
        // Initialize database
        await sqliteCore.initializeDatabase();
        
    } catch (error) {
        console.error('Failed to auto-initialize database:', error);
    }
});

console.log('📦 SQLite Core module loaded');