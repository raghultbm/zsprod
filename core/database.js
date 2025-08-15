const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path - will be in app data directory
const DB_PATH = path.join(process.env.APPDATA || process.env.HOME, 'WatchShop', 'watchshop.db');

let db = null;

async function initDatabase() {
    return new Promise((resolve, reject) => {
        try {
            // Ensure directory exists
            const dbDir = path.dirname(DB_PATH);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Initialize database
            db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    return reject(err);
                }
                console.log('Connected to SQLite database');
                createTables()
                    .then(() => resolve())
                    .catch(reject);
            });

        } catch (error) {
            console.error('Database initialization error:', error);
            reject(error);
        }
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                user_type TEXT NOT NULL DEFAULT 'manager',
                permissions TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT
            )`,
            
            `CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                mobile_number TEXT NOT NULL,
                creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT
            )`,
            
            `CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL,
                date DATETIME NOT NULL,
                category TEXT NOT NULL,
                brand TEXT,
                gender TEXT,
                type TEXT,
                strap TEXT,
                material TEXT,
                size TEXT,
                amount REAL NOT NULL,
                warranty_period INTEGER DEFAULT 0,
                location TEXT DEFAULT 'Semmancheri',
                comments TEXT,
                particulars TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT
            )`,
            
            `CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id TEXT NOT NULL,
                sale_date DATETIME NOT NULL,
                invoice_number TEXT UNIQUE NOT NULL,
                total_amount REAL NOT NULL,
                discount_type TEXT,
                discount_value REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                advance_amount REAL DEFAULT 0,
                balance_amount REAL DEFAULT 0,
                payment_mode TEXT NOT NULL,
                status TEXT DEFAULT 'completed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                inventory_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales (id),
                FOREIGN KEY (inventory_id) REFERENCES inventory (id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id TEXT UNIQUE NOT NULL,
                customer_id TEXT NOT NULL,
                service_date DATETIME NOT NULL,
                category TEXT NOT NULL,
                brand TEXT,
                issue_description TEXT,
                estimated_cost REAL DEFAULT 0,
                actual_cost REAL DEFAULT 0,
                status TEXT DEFAULT 'Yet to Start',
                location TEXT DEFAULT 'Semmancheri',
                case_material TEXT,
                strap_material TEXT,
                delivery_date DATETIME,
                comments TEXT,
                is_instant INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT UNIQUE NOT NULL,
                customer_id TEXT NOT NULL,
                invoice_date DATETIME NOT NULL,
                total_amount REAL NOT NULL,
                cgst_rate REAL DEFAULT 0,
                sgst_rate REAL DEFAULT 0,
                cgst_amount REAL DEFAULT 0,
                sgst_amount REAL DEFAULT 0,
                grand_total REAL NOT NULL,
                payment_status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS invoice_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                FOREIGN KEY (invoice_id) REFERENCES invoices (id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_date DATETIME NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                payment_mode TEXT,
                receipt_number TEXT,
                comments TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
            )`,
            
            `CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module TEXT NOT NULL,
                action TEXT NOT NULL,
                record_id TEXT,
                old_data TEXT,
                new_data TEXT,
                user_name TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                comments TEXT,
                changed_by TEXT NOT NULL,
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        let completed = 0;
        let hasError = false;

        tables.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err && !hasError) {
                    hasError = true;
                    console.error(`Error creating table ${index}:`, err);
                    return reject(err);
                }
                
                completed++;
                if (completed === tables.length && !hasError) {
                    createDefaultUser()
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    });
}

function createDefaultUser() {
    return new Promise((resolve, reject) => {
        const checkUser = `SELECT COUNT(*) as count FROM users WHERE username = ?`;
        db.get(checkUser, ['admin'], (err, row) => {
            if (err) return reject(err);
            
            if (row.count === 0) {
                const insertAdmin = `INSERT INTO users (username, password_hash, user_type, permissions) VALUES (?, ?, ?, ?)`;
                const adminHash = Buffer.from('admin123').toString('base64');
                const permissions = JSON.stringify({
                    dashboard: true, customers: true, inventory: true, sales: true,
                    service: true, invoices: true, expense: true, ledger: true,
                    users: true, all_access: true
                });
                
                db.run(insertAdmin, ['admin', adminHash, 'admin', permissions], (err) => {
                    if (err) return reject(err);
                    console.log('Default admin user created');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error('Database not initialized'));
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error('Database not initialized'));
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error('Database not initialized'));
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function closeDatabase() {
    return new Promise((resolve) => {
        if (db) {
            db.close((err) => {
                if (err) console.error('Error closing database:', err);
                db = null;
                resolve();
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase,
    runQuery,
    getQuery,
    allQuery,
    DB_PATH
};