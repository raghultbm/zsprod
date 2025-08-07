// src/database.js - Fixed Database operations with proper migration
const sqlite3 = require('sqlite3').verbose();

let db;

// Initialize database with proper configuration
function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database('./watchshop.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                console.log('Connected to SQLite database');
                // Enable WAL mode for better concurrency
                db.run('PRAGMA journal_mode = WAL;');
                db.run('PRAGMA synchronous = NORMAL;');
                db.run('PRAGMA cache_size = 1000;');
                db.run('PRAGMA temp_store = MEMORY;');
                db.run('PRAGMA busy_timeout = 30000;'); // 30 second timeout
                
                createTables().then(resolve).catch(reject);
            }
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'staff')),
                email TEXT,
                phone TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )`);

            // Customers table
            db.run(`CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Sales tables - Updated with invoice_number column
            db.run(`CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_date DATE NOT NULL,
                customer_id INTEGER,
                subtotal DECIMAL(10,2) NOT NULL,
                total_discount DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                invoice_number TEXT,
                sale_status TEXT DEFAULT 'completed' CHECK(sale_status IN ('completed', 'cancelled', 'refunded')),
                notes TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                inventory_id INTEGER NOT NULL,
                item_code TEXT NOT NULL,
                item_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                discount_type TEXT CHECK(discount_type IN ('percentage', 'amount', 'none')),
                discount_value DECIMAL(10,2) DEFAULT 0,
                line_total DECIMAL(10,2) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS sale_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                payment_method TEXT NOT NULL CHECK(payment_method IN ('upi', 'card', 'cash')),
                amount DECIMAL(10,2) NOT NULL,
                payment_reference TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
            )`);

            // Service Jobs table
            db.run(`CREATE TABLE IF NOT EXISTS service_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_number TEXT UNIQUE NOT NULL,
                customer_id INTEGER,
                estimated_cost DECIMAL(10,2),
                advance_amount DECIMAL(10,2) DEFAULT 0,
                advance_payment_method TEXT CHECK(advance_payment_method IN ('cash', 'upi', 'card')),
                advance_payment_reference TEXT,
                final_cost DECIMAL(10,2),
                final_payment_amount DECIMAL(10,2) DEFAULT 0,
                final_payment_method TEXT CHECK(final_payment_method IN ('cash', 'upi', 'card')),
                final_payment_reference TEXT,
                approximate_delivery_date DATE,
                actual_delivery_date DATE,
                location TEXT NOT NULL CHECK(location IN ('semmancheri', 'navalur', 'padur')),
                status TEXT DEFAULT 'yet_to_start' CHECK(status IN ('yet_to_start', 'in_service_center', 'service_completed', 'delivered', 'returned_to_customer', 'to_be_returned_to_customer')),
                comments TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )`);

            // Service Items table
            db.run(`CREATE TABLE IF NOT EXISTS service_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_job_id INTEGER NOT NULL,
                category TEXT NOT NULL CHECK(category IN ('watch', 'wallclock', 'timepiece')),
                brand TEXT,
                gender TEXT CHECK(gender IN ('gents', 'ladies') OR gender IS NULL),
                case_material TEXT CHECK(case_material IN ('steel', 'gold_tone', 'fiber', 'other') OR case_material IS NULL),
                strap_material TEXT CHECK(strap_material IN ('leather', 'fiber', 'steel', 'gold_plated') OR strap_material IS NULL),
                machine_change BOOLEAN,
                movement_no TEXT,
                issue_description TEXT NOT NULL,
                product_image_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_job_id) REFERENCES service_jobs(id) ON DELETE CASCADE
            )`);

            // Service Status History table
            db.run(`CREATE TABLE IF NOT EXISTS service_status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_job_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                location TEXT NOT NULL,
                comments TEXT,
                changed_by INTEGER,
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_job_id) REFERENCES service_jobs(id) ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES users(id)
            )`);

            // Service Comments table
            db.run(`CREATE TABLE IF NOT EXISTS service_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_job_id INTEGER NOT NULL,
                comment TEXT NOT NULL,
                added_by INTEGER,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_job_id) REFERENCES service_jobs(id) ON DELETE CASCADE,
                FOREIGN KEY (added_by) REFERENCES users(id)
            )`);

            // Expenses table
            db.run(`CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi', 'card')),
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )`);

            // Check and migrate existing tables
            checkAndMigrateTables(resolve, reject);
        });
    });
}

function checkAndMigrateTables(resolve, reject) {
    // Check if sales table exists and needs migration
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sales'", (err, row) => {
        if (err) {
            console.error('Error checking sales table:', err);
            reject(err);
            return;
        }

        if (row) {
            // Table exists, check if it has the invoice_number column
            db.all("PRAGMA table_info(sales)", (err, columns) => {
                if (err) {
                    console.error('Error checking sales table columns:', err);
                    reject(err);
                    return;
                }

                const hasInvoiceNumber = columns.some(col => col.name === 'invoice_number');
                
                if (!hasInvoiceNumber) {
                    console.log('Migrating sales table to add invoice_number column...');
                    migrateSalesTable(resolve, reject);
                } else {
                    console.log('Sales table already has invoice_number column');
                    checkInventoryTable(resolve, reject);
                }
            });
        } else {
            // Sales table doesn't exist, it will be created with the correct schema
            checkInventoryTable(resolve, reject);
        }
    });
}

function migrateSalesTable(resolve, reject) {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Step 1: Add invoice_number column without UNIQUE constraint
        db.run("ALTER TABLE sales ADD COLUMN invoice_number TEXT", (err) => {
            if (err) {
                db.run('ROLLBACK');
                console.error('Error adding invoice_number column:', err);
                reject(err);
                return;
            }

            console.log('Added invoice_number column successfully');

            // Step 2: Generate invoice numbers for existing sales
            db.all("SELECT id, created_at FROM sales WHERE invoice_number IS NULL", (err, sales) => {
                if (err) {
                    db.run('ROLLBACK');
                    console.error('Error fetching existing sales:', err);
                    reject(err);
                    return;
                }

                if (sales.length === 0) {
                    // No existing sales, commit and continue
                    db.run('COMMIT', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log('Sales table migration completed');
                            checkInventoryTable(resolve, reject);
                        }
                    });
                    return;
                }

                let processed = 0;
                const total = sales.length;

                // Generate invoice numbers for existing sales
                sales.forEach((sale) => {
                    const invoiceNumber = generateInvoiceNumberForDate(new Date(sale.created_at), sale.id);
                    
                    db.run("UPDATE sales SET invoice_number = ? WHERE id = ?", [invoiceNumber, sale.id], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            console.error('Error updating invoice number:', err);
                            reject(err);
                            return;
                        }

                        processed++;
                        if (processed === total) {
                            // All sales updated, now create unique index
                            db.run("CREATE UNIQUE INDEX idx_sales_invoice_number ON sales(invoice_number)", (err) => {
                                if (err) {
                                    console.warn('Warning: Could not create unique index on invoice_number:', err.message);
                                    // Continue anyway, as the column is added
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        console.log('Sales table migration completed successfully');
                                        checkInventoryTable(resolve, reject);
                                    }
                                });
                            });
                        }
                    });
                });
            });
        });
    });
}

function generateInvoiceNumberForDate(date, saleId) {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Use sale ID to ensure uniqueness for existing records
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomChars = '';
    
    // Generate based on sale ID to ensure uniqueness
    const idStr = saleId.toString().padStart(4, '0');
    for (let i = 0; i < 4; i++) {
        const charIndex = parseInt(idStr[i] || '0') + (i * 7); // Add some variation
        randomChars += chars.charAt(charIndex % chars.length);
    }
    
    return `INVSA${year}${month}${day}${randomChars}`;
}

function checkInventoryTable(resolve, reject) {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
        if (err) {
            console.error('Error checking inventory table:', err);
            reject(err);
            return;
        }

        if (row) {
            // Table exists, check if it has the new schema
            db.all("PRAGMA table_info(inventory)", (err, columns) => {
                if (err) {
                    console.error('Error getting table info:', err);
                    reject(err);
                    return;
                }

                const columnNames = columns.map(col => col.name);
                const hasNewSchema = columnNames.includes('item_code') && 
                                  columnNames.includes('date_added') && 
                                  columnNames.includes('outlet');

                if (!hasNewSchema) {
                    console.log('Migrating inventory table to new schema...');
                    migrateInventoryTable(resolve, reject);
                } else {
                    console.log('Inventory table already has new schema');
                    createDefaultAdmin(resolve, reject);
                }
            });
        } else {
            // Table doesn't exist, create it with new schema
            console.log('Creating new inventory table...');
            createNewInventoryTable(resolve, reject);
        }
    });
}

function createNewInventoryTable(resolve, reject) {
    db.run(`CREATE TABLE inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_code TEXT UNIQUE NOT NULL,
        date_added DATE NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('watch', 'clock', 'timepiece', 'strap', 'battery')),
        brand TEXT,
        type TEXT,
        gender TEXT CHECK(gender IN ('gents', 'ladies') OR gender IS NULL),
        material TEXT CHECK(material IN ('leather', 'fiber', 'chain') OR material IS NULL),
        size_mm INTEGER,
        battery_code TEXT,
        quantity INTEGER DEFAULT 0,
        warranty_months INTEGER,
        price DECIMAL(10,2),
        outlet TEXT NOT NULL CHECK(outlet IN ('semmanchery', 'navalur', 'padur')),
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating inventory table:', err);
            reject(err);
        } else {
            console.log('New inventory table created successfully');
            createDefaultAdmin(resolve, reject);
        }
    });
}

function migrateInventoryTable(resolve, reject) {
    // Simplified migration - for existing installations, we'll recreate the table
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Rename old table
        db.run("ALTER TABLE inventory RENAME TO inventory_old", (err) => {
            if (err) {
                db.run('ROLLBACK');
                console.error('Error renaming old inventory table:', err);
                reject(err);
                return;
            }

            // Create new table
            db.run(`CREATE TABLE inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_code TEXT UNIQUE NOT NULL,
                date_added DATE NOT NULL,
                category TEXT NOT NULL CHECK(category IN ('watch', 'clock', 'timepiece', 'strap', 'battery')),
                brand TEXT,
                type TEXT,
                gender TEXT CHECK(gender IN ('gents', 'ladies') OR gender IS NULL),
                material TEXT CHECK(material IN ('leather', 'fiber', 'chain') OR material IS NULL),
                size_mm INTEGER,
                battery_code TEXT,
                quantity INTEGER DEFAULT 0,
                warranty_months INTEGER,
                price DECIMAL(10,2),
                outlet TEXT NOT NULL CHECK(outlet IN ('semmanchery', 'navalur', 'padur')),
                comments TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    console.error('Error creating new inventory table:', err);
                    reject(err);
                    return;
                }

                // Try to migrate data if old table has some compatible columns
                db.all("SELECT * FROM inventory_old LIMIT 1", (err, rows) => {
                    if (err || !rows || rows.length === 0) {
                        // No data to migrate or error, just drop old table and continue
                        db.run("DROP TABLE inventory_old", () => {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    console.log('Inventory table migration completed');
                                    createDefaultAdmin(resolve, reject);
                                }
                            });
                        });
                        return;
                    }

                    // Drop old table and commit
                    db.run("DROP TABLE inventory_old", (err) => {
                        if (err) {
                            console.warn('Warning: Could not drop old inventory table');
                        }
                        
                        db.run('COMMIT', (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('Inventory table migration completed');
                                createDefaultAdmin(resolve, reject);
                            }
                        });
                    });
                });
            });
        });
    });
}

function createDefaultAdmin(resolve, reject) {
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", (err, row) => {
        if (err) {
            console.error('Error checking admin user:', err);
            reject(err);
        } else if (row && row.count === 0) {
            db.run(`INSERT INTO users (username, password, full_name, role, email) 
                    VALUES ('admin', 'admin123', 'Administrator', 'admin', 'admin@watchshop.com')`, (err) => {
                if (err) {
                    console.error('Error creating admin user:', err);
                    reject(err);
                } else {
                    console.log('Default admin user created');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

// Helper functions for database operations
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        const maxRetries = 3;
        let retries = 0;

        function attemptQuery() {
            db.run(sql, params, function(err) {
                if (err) {
                    if (err.code === 'SQLITE_BUSY' && retries < maxRetries) {
                        retries++;
                        console.log(`Database busy, retrying... (${retries}/${maxRetries})`);
                        setTimeout(attemptQuery, 100 * retries);
                    } else {
                        console.error('Database error:', err);
                        reject(err);
                    }
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        }
        attemptQuery();
    });
}

function getData(sql, params = []) {
    return new Promise((resolve, reject) => {
        const maxRetries = 3;
        let retries = 0;

        function attemptQuery() {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    if (err.code === 'SQLITE_BUSY' && retries < maxRetries) {
                        retries++;
                        console.log(`Database busy, retrying... (${retries}/${maxRetries})`);
                        setTimeout(attemptQuery, 100 * retries);
                    } else {
                        console.error('Database error:', err);
                        reject(err);
                    }
                } else {
                    resolve(rows);
                }
            });
        }
        attemptQuery();
    });
}

function getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
        const maxRetries = 3;
        let retries = 0;

        function attemptQuery() {
            db.get(sql, params, (err, row) => {
                if (err) {
                    if (err.code === 'SQLITE_BUSY' && retries < maxRetries) {
                        retries++;
                        console.log(`Database busy, retrying... (${retries}/${maxRetries})`);
                        setTimeout(attemptQuery, 100 * retries);
                    } else {
                        console.error('Database error:', err);
                        reject(err);
                    }
                } else {
                    resolve(row);
                }
            });
        }
        attemptQuery();
    });
}

function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

// Generate unique job number for service jobs
function generateJobNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `SRV${year}${month}${timestamp}`;
}

module.exports = {
    initDatabase,
    closeDatabase,
    runQuery,
    getData,
    getRow,
    generateJobNumber,
    getDatabase: () => db
};