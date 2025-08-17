const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', 'data', 'watchcraft.db');
    }

    async init() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Open database connection
            this.db = new sqlite3.Database(this.dbPath);
            
            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');
            
            // Create tables
            await this.createTables();
            
            // Insert default data
            await this.insertDefaultData();
            
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    async createTables() {
        const tables = require('../config/tables');
        
        for (const tableName in tables) {
            try {
                await this.run(tables[tableName]);
                console.log(`Table ${tableName} created/verified`);
            } catch (error) {
                console.error(`Error creating table ${tableName}:`, error);
                throw error;
            }
        }
    }

    async insertDefaultData() {
        try {
            // Check if admin user exists
            const adminExists = await this.get(
                'SELECT id FROM users WHERE username = ?', 
                ['admin']
            );

            if (!adminExists) {
                const bcrypt = require('bcrypt');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                
                await this.run(`
                    INSERT INTO users (username, password, user_type, is_active, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, ['admin', hashedPassword, 'admin', 1, 'system', new Date().toISOString()]);
                
                console.log('Default admin user created');
            }

            // Insert default categories if not exist
            const categories = require('../config/categories');
            for (const category of categories.inventory) {
                const exists = await this.get(
                    'SELECT id FROM categories WHERE name = ?', 
                    [category.name]
                );
                
                if (!exists) {
                    await this.run(`
                        INSERT INTO categories (name, type, config, created_at)
                        VALUES (?, ?, ?, ?)
                    `, [category.name, 'inventory', JSON.stringify(category.config), new Date().toISOString()]);
                }
            }
            
        } catch (error) {
            console.error('Error inserting default data:', error);
        }
    }

    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    async beginTransaction() {
        await this.run('BEGIN TRANSACTION');
    }

    async commit() {
        await this.run('COMMIT');
    }

    async rollback() {
        await this.run('ROLLBACK');
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;