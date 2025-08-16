const path = require('path');
const fs = require('fs');
const os = require('os');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.dbPath = null;
        this.sqlite3 = null;
    }

    getUserDataPath() {
        // Get user data path without using app.getPath()
        const platform = process.platform;
        const homeDir = os.homedir();
        
        let userDataPath;
        if (platform === 'win32') {
            userDataPath = path.join(homeDir, 'AppData', 'Roaming', 'zedson-watchcraft');
        } else if (platform === 'darwin') {
            userDataPath = path.join(homeDir, 'Library', 'Application Support', 'zedson-watchcraft');
        } else {
            userDataPath = path.join(homeDir, '.config', 'zedson-watchcraft');
        }
        
        // Ensure directory exists
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        
        return userDataPath;
    }

    async initialize() {
        if (this.isInitialized) return this.db;
        
        try {
            // Try to load sqlite3, fallback to JSON storage if it fails
            try {
                this.sqlite3 = require('sqlite3').verbose();
            } catch (error) {
                console.warn('SQLite3 not available, falling back to JSON storage');
                return this.initializeJSONStorage();
            }
            
            this.dbPath = path.join(this.getUserDataPath(), 'zedson_watchcraft.db');
            
            return new Promise((resolve, reject) => {
                this.db = new this.sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.warn('SQLite failed, falling back to JSON storage:', err);
                        this.initializeJSONStorage().then(resolve).catch(reject);
                        return;
                    }
                    
                    console.log('Connected to SQLite database at:', this.dbPath);
                    this.isInitialized = true;
                    this.createTables().then(() => resolve(this.db)).catch(reject);
                });
            });
        } catch (error) {
            console.warn('Database initialization failed, using JSON storage:', error);
            return this.initializeJSONStorage();
        }
    }

    async initializeJSONStorage() {
        console.log('Initializing JSON-based storage...');
        this.dbPath = path.join(this.getUserDataPath(), 'zedson_watchcraft.json');
        
        // Create a simple JSON-based database
        this.db = {
            data: {},
            isJSON: true
        };
        
        // Load existing data if available
        if (fs.existsSync(this.dbPath)) {
            try {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.db.data = JSON.parse(data);
            } catch (error) {
                console.warn('Could not load existing JSON data:', error);
                this.db.data = {};
            }
        }
        
        // Initialize tables
        if (!this.db.data.users) {
            this.db.data.users = [];
        }
        if (!this.db.data.customers) {
            this.db.data.customers = [];
        }
        
        // Create default admin user
        await this.createDefaultUser();
        this.saveJSONData();
        
        this.isInitialized = true;
        console.log('JSON storage initialized successfully');
        return this.db;
    }

    saveJSONData() {
        if (this.db && this.db.isJSON) {
            try {
                const dir = path.dirname(this.dbPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(this.dbPath, JSON.stringify(this.db.data, null, 2));
            } catch (error) {
                console.error('Error saving JSON data:', error);
            }
        }
    }

    async createTables() {
        if (this.db.isJSON) {
            // JSON storage doesn't need table creation
            return;
        }
        
        const tables = window.Tables || {};
        
        for (const [tableName, tableSchema] of Object.entries(tables)) {
            await this.run(tableSchema);
        }

        await this.createDefaultUser();
        console.log('Database tables created successfully');
    }

    async createDefaultUser() {
        try {
            const adminExists = await this.get('SELECT id FROM users WHERE username = ?', ['admin']);
            
            if (!adminExists) {
                await this.run(`
                    INSERT INTO users (username, password_hash, user_type, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `, ['admin', 'admin123', 'admin', 'system', new Date().toISOString()]);
                console.log('Default admin user created');
            }
        } catch (error) {
            console.error('Error creating default user:', error);
        }
    }

    async run(sql, params = []) {
        if (this.db.isJSON) {
            return this.runJSON(sql, params);
        }
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('SQL Error:', err, 'Query:', sql);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        if (this.db.isJSON) {
            return this.getJSON(sql, params);
        }
        
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('SQL Error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        if (this.db.isJSON) {
            return this.allJSON(sql, params);
        }
        
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('SQL Error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Simple JSON-based query implementations
    runJSON(sql, params = []) {
        const sqlLower = sql.toLowerCase().trim();
        
        if (sqlLower.includes('create table')) {
            return { id: null, changes: 0 };
        }
        
        if (sqlLower.includes('insert into users')) {
            const user = {
                id: Date.now(),
                username: params[0],
                password_hash: params[1],
                user_type: params[2],
                created_by: params[3],
                created_at: params[4],
                is_active: 1
            };
            this.db.data.users.push(user);
            this.saveJSONData();
            return { id: user.id, changes: 1 };
        }
        
        if (sqlLower.includes('insert into customers')) {
            const customer = {
                id: Date.now(),
                customer_id: params[0],
                name: params[1],
                mobile_number: params[2],
                email: params[3],
                address: params[4],
                creation_date: params[5],
                net_value: params[6] || 0,
                created_by: params[7],
                created_at: params[8],
                is_active: 1
            };
            this.db.data.customers.push(customer);
            this.saveJSONData();
            return { id: customer.id, changes: 1 };
        }
        
        return { id: null, changes: 0 };
    }

    getJSON(sql, params = []) {
        const sqlLower = sql.toLowerCase().trim();
        
        if (sqlLower.includes('select') && sqlLower.includes('users')) {
            if (params[0] === 'admin') {
                return this.db.data.users.find(u => u.username === 'admin');
            }
        }
        
        return null;
    }

    allJSON(sql, params = []) {
        const sqlLower = sql.toLowerCase().trim();
        
        if (sqlLower.includes('customers') && sqlLower.includes('is_active = 1')) {
            return this.db.data.customers.filter(c => c.is_active === 1);
        }
        
        if (sqlLower.includes('users')) {
            return this.db.data.users.filter(u => u.is_active === 1);
        }
        
        return [];
    }

    async getNextSequence(tableName, field = 'id') {
        if (this.db.isJSON) {
            const data = this.db.data[tableName] || [];
            const maxId = data.reduce((max, item) => Math.max(max, item[field] || 0), 0);
            return maxId + 1;
        }
        
        const result = await this.get(`SELECT MAX(${field}) as max_id FROM ${tableName}`);
        return (result?.max_id || 0) + 1;
    }

    async transaction(callback) {
        try {
            if (this.db.isJSON) {
                const result = await callback();
                this.saveJSONData();
                return result;
            }
            
            await this.run('BEGIN TRANSACTION');
            const result = await callback();
            await this.run('COMMIT');
            return result;
        } catch (error) {
            if (!this.db.isJSON) {
                await this.run('ROLLBACK');
            }
            throw error;
        }
    }

    close() {
        if (this.db && !this.db.isJSON) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        } else if (this.db && this.db.isJSON) {
            this.saveJSONData();
            console.log('JSON storage saved and closed');
        }
    }
}

// Global database instance
window.DB = new DatabaseManager();