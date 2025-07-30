// ZEDSON WATCHCRAFT - SQLite Core Database Module (FIXED)
// js/database/sqlite-core.js

/**
 * Fixed SQLite Core Database Module with proper initialization
 */

class SQLiteCore {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.dbName = 'zedson_watchcraft.db';
        this.isReady = false;
        this.initPromise = null;
    }

    /**
     * Initialize SQLite database with proper async handling
     */
    async initializeDatabase() {
        // Prevent multiple initializations
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        try {
            console.log('🔧 Initializing SQLite Database...');
            
            // Wait for SQL.js to be available
            await this.waitForSQLJS();

            // Create or load database
            await this.createConnection();
            
            // Create tables if they don't exist
            await this.createTables();
            
            this.isInitialized = true;
            this.isReady = true;
            
            console.log('✅ SQLite Database initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.isReady = false;
            throw error;
        }
    }

    /**
     * Wait for SQL.js library to load with proper error handling
     */
    async waitForSQLJS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds timeout
            
            const checkSQL = () => {
                // Check if initSqlJs is available globally
                if (typeof window !== 'undefined' && window.initSqlJs) {
                    resolve();
                    return;
                }
                
                // Check if SQL is already initialized
                if (typeof window !== 'undefined' && window.SQL) {
                    resolve();
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    reject(new Error('SQL.js library failed to load after 5 seconds'));
                } else {
                    setTimeout(checkSQL, 100);
                }
            };
            
            checkSQL();
        });
    }

    /**
     * Create database connection with better error handling
     */
    async createConnection() {
        try {
            // Initialize SQL.js if not already done
            if (!window.SQL) {
                if (window.initSqlJs) {
                    console.log('📚 Initializing SQL.js...');
                    window.SQL = await window.initSqlJs({
                        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                    });
                } else {
                    throw new Error('initSqlJs function not available');
                }
            }

            // Try to load existing database from localStorage
            const savedDb = localStorage.getItem(this.dbName);
            
            if (savedDb) {
                try {
                    const dbData = new Uint8Array(JSON.parse(savedDb));
                    this.db = new window.SQL.Database(dbData);
                    console.log('📂 Loaded existing database from storage');
                } catch (error) {
                    console.warn('⚠️ Failed to load saved database, creating new one:', error);
                    this.db = new window.SQL.Database();
                }
            } else {
                this.db = new window.SQL.Database();
                console.log('🆕 Created new database');
            }

            // Configure database
            this.configureDatabase();
            
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    /**
     * Configure database settings
     */
    configureDatabase() {
        try {
            this.db.run('PRAGMA foreign_keys = ON');
            this.db.run('PRAGMA journal_mode = WAL');
            this.db.run('PRAGMA synchronous = NORMAL');
            console.log('⚙️ Database configured');
        } catch (error) {
            console.warn('Database configuration warning:', error);
        }
    }

    /**
     * Create all required tables with proper error handling
     */
    async createTables() {
        const tables = [
            // Customers table
            `CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                address TEXT,
                purchases INTEGER DEFAULT 0,
                service_count INTEGER DEFAULT 0,
                net_value DECIMAL(10,2) DEFAULT 0.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT
            )`,
            
            // Inventory table
            `CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                size TEXT DEFAULT '-',
                price DECIMAL(10,2) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                outlet TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'available',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT
            )`,
            
            // Sales table
            `CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                inventory_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                price DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                discount_type TEXT,
                discount_value DECIMAL(10,2) DEFAULT 0.00,
                discount_amount DECIMAL(10,2) DEFAULT 0.00,
                total_amount DECIMAL(10,2) NOT NULL,
                payment_method TEXT NOT NULL,
                sale_date DATE NOT NULL,
                sale_time TIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (inventory_id) REFERENCES inventory(id)
            )`,
            
            // Services table
            `CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                watch_name TEXT NOT NULL,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                dial_color TEXT NOT NULL,
                movement_no TEXT NOT NULL,
                gender TEXT NOT NULL,
                case_type TEXT NOT NULL,
                strap_type TEXT NOT NULL,
                issue TEXT NOT NULL,
                cost DECIMAL(10,2) NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                estimated_delivery DATE,
                actual_delivery DATE,
                completion_description TEXT,
                warranty_period INTEGER DEFAULT 0,
                service_date DATE NOT NULL,
                service_time TIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`,
            
            // Expenses table
            `CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
            )`
        ];

        for (const tableSQL of tables) {
            try {
                this.db.run(tableSQL);
            } catch (error) {
                console.error('Error creating table:', error);
                throw error;
            }
        }

        // Create indexes for better performance
        this.createIndexes();
        
        console.log('📋 All tables created successfully');
    }

    /**
     * Create database indexes
     */
    createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
            'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
            'CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(code)',
            'CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)',
            'CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)'
        ];

        indexes.forEach(indexSQL => {
            try {
                this.db.run(indexSQL);
            } catch (error) {
                console.warn('Index creation warning:', error);
            }
        });
    }

    /**
     * Execute SELECT query and return all results
     */
    selectAll(sql, params = []) {
        try {
            if (!this.db) throw new Error('Database not initialized');
            
            const stmt = this.db.prepare(sql);
            const results = [];
            
            stmt.bind(params);
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            
            return results;
        } catch (error) {
            console.error('Select all failed:', error);
            throw error;
        }
    }

    /**
     * Execute SELECT query and return first result
     */
    selectOne(sql, params = []) {
        try {
            if (!this.db) throw new Error('Database not initialized');
            
            const stmt = this.db.prepare(sql);
            stmt.bind(params);
            
            let result = null;
            if (stmt.step()) {
                result = stmt.getAsObject();
            }
            stmt.free();
            
            return result;
        } catch (error) {
            console.error('Select one failed:', error);
            throw error;
        }
    }

    /**
     * Insert record and return the inserted ID
     */
    insert(table, data) {
        try {
            if (!this.db) throw new Error('Database not initialized');
            
            const columns = Object.keys(data);
            const placeholders = columns.map(() => '?').join(', ');
            const values = Object.values(data);
            
            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            
            this.db.run(sql, values);
            
            // Get last inserted row ID
            const result = this.db.exec('SELECT last_insert_rowid() as id');
            const insertId = result[0]?.values[0]?.[0] || null;
            
            // Save database after insert
            this.saveDatabase();
            
            return { insertId, changes: 1 };
        } catch (error) {
            console.error('Insert failed:', error);
            throw error;
        }
    }

    /**
     * Update records
     */
    update(table, data, whereClause, whereParams = []) {
        try {
            if (!this.db) throw new Error('Database not initialized');
            
            const columns = Object.keys(data);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            const values = [...Object.values(data), ...whereParams];
            
            const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
            
            const info = this.db.run(sql, values);
            
            // Save database after update
            this.saveDatabase();
            
            return { changes: info.changes || 0 };
        } catch (error) {
            console.error('Update failed:', error);
            throw error;
        }
    }

    /**
     * Delete records
     */
    delete(table, whereClause, whereParams = []) {
        try {
            if (!this.db) throw new Error('Database not initialized');
            
            const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
            const info = this.db.run(sql, whereParams);
            
            // Save database after delete
            this.saveDatabase();
            
            return { changes: info.changes || 0 };
        } catch (error) {
            console.error('Delete failed:', error);
            throw error;
        }
    }

    /**
     * Save database to localStorage with error handling
     */
    saveDatabase() {
        try {
            if (this.db) {
                const data = this.db.export();
                const buffer = Array.from(data);
                localStorage.setItem(this.dbName, JSON.stringify(buffer));
            }
        } catch (error) {
            console.error('Failed to save database:', error);
        }
    }

    /**
     * Check if database is ready
     */
    isDBReady() {
        return this.isReady && this.db !== null;
    }

    /**
     * Get database statistics
     */
    getStats() {
        if (!this.isDBReady()) return null;

        try {
            const tables = ['customers', 'inventory', 'sales', 'services', 'expenses'];
            const stats = {};

            tables.forEach(table => {
                try {
                    const result = this.selectOne(`SELECT COUNT(*) as count FROM ${table}`);
                    stats[table] = result ? result.count : 0;
                } catch (error) {
                    stats[table] = 0;
                }
            });

            return stats;
        } catch (error) {
            console.error('Failed to get database stats:', error);
            return null;
        }
    }
}

// Create singleton instance
const sqliteCore = new SQLiteCore();

// Auto-initialize when script loads
(async function() {
    try {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        console.log('🚀 Starting SQLite initialization...');
        await sqliteCore.initializeDatabase();
        
        // Trigger app initialization after database is ready
        if (window.initializeAppWithDatabase) {
            setTimeout(() => {
                window.initializeAppWithDatabase();
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ SQLite initialization failed:', error);
        // Show user-friendly error
        alert('Database initialization failed. Please refresh the page and try again.');
    }
})();

// Export for global use
window.SQLiteCore = sqliteCore;

console.log('📦 SQLite Core module loaded');