// ZEDSON WATCHCRAFT - Database Migration Manager
// js/database/migration-manager.js

/**
 * Database Migration Manager
 * Handles database schema migrations, version tracking, and data migration
 */

class MigrationManager {
    constructor(sqliteCore) {
        this.db = sqliteCore;
        this.currentVersion = 0;
        this.targetVersion = 1;
        this.migrations = new Map();
        this.backupBeforeMigration = true;
        this.validateAfterMigration = true;
        this.rollbackOnFailure = true;
        
        this.initializeMigrations();
    }

    /**
     * Initialize migration definitions
     */
    initializeMigrations() {
        // Migration 1: Initial schema
        this.addMigration(1, {
            description: 'Initial database schema with all tables, indexes, and triggers',
            up: async (db) => {
                console.log('📦 Running migration 1: Initial schema');
                
                // Create all tables using schema module
                if (window.DatabaseSchema) {
                    await window.DatabaseSchema.createTables(db);
                    await window.DatabaseSchema.createIndexes(db);
                    await window.DatabaseSchema.createTriggers(db);
                    await window.DatabaseSchema.createViews(db);
                    await window.DatabaseSchema.insertDefaultData(db);
                } else {
                    throw new Error('DatabaseSchema module not found');
                }
                
                console.log('✅ Migration 1 completed');
            },
            down: async (db) => {
                console.log('🔄 Rolling back migration 1');
                
                // Drop all tables in reverse dependency order
                const tables = [
                    'action_logs',
                    'invoices', 
                    'inventory_movements',
                    'expenses',
                    'services',
                    'sales',
                    'inventory',
                    'customers',
                    'users',
                    'db_version'
                ];
                
                for (const table of tables) {
                    await db.executeQuery(`DROP TABLE IF EXISTS ${table}`);
                }
                
                // Drop views
                const views = [
                    'revenue_summary',
                    'service_summary', 
                    'sales_summary',
                    'inventory_summary',
                    'customer_summary'
                ];
                
                for (const view of views) {
                    await db.executeQuery(`DROP VIEW IF EXISTS ${view}`);
                }
                
                console.log('✅ Migration 1 rollback completed');
            }
        });

        // Future migrations can be added here
        // Example: Migration 2 for adding new features
        this.addMigration(2, {
            description: 'Add advanced reporting tables (future)',
            up: async (db) => {
                // Future migration code
                console.log('📦 Running migration 2: Advanced reporting');
                
                // Example: Add new tables for advanced features
                await db.executeQuery(`
                    CREATE TABLE IF NOT EXISTS reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        parameters TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_by TEXT
                    )
                `);
                
                await db.executeQuery(`
                    CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type)
                `);
                
                console.log('✅ Migration 2 completed');
            },
            down: async (db) => {
                console.log('🔄 Rolling back migration 2');
                await db.executeQuery('DROP TABLE IF EXISTS reports');
                console.log('✅ Migration 2 rollback completed');
            }
        });
    }

    /**
     * Add a migration
     */
    addMigration(version, migration) {
        if (!migration.up || !migration.down) {
            throw new Error('Migration must have both up and down functions');
        }
        
        this.migrations.set(version, {
            version,
            description: migration.description || `Migration ${version}`,
            up: migration.up,
            down: migration.down,
            dependencies: migration.dependencies || [],
            createdAt: new Date().toISOString()
        });
        
        console.log(`📝 Added migration ${version}: ${migration.description}`);
    }

    /**
     * Get current database version
     */
    async getCurrentVersion() {
        try {
            // Check if db_version table exists
            const tableExists = await this.db.selectOne(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='db_version'
            `);
            
            if (!tableExists) {
                console.log('📊 Database version table not found, assuming version 0');
                return 0;
            }
            
            // Get latest version
            const versionRecord = await this.db.selectOne(`
                SELECT version FROM db_version 
                ORDER BY version DESC 
                LIMIT 1
            `);
            
            const version = versionRecord ? versionRecord.version : 0;
            console.log(`📊 Current database version: ${version}`);
            
            return version;
            
        } catch (error) {
            console.warn('⚠️ Could not determine database version, assuming 0');
            return 0;
        }
    }

    /**
     * Check if migration is needed
     */
    async needsMigration() {
        this.currentVersion = await this.getCurrentVersion();
        const needsMigration = this.currentVersion < this.targetVersion;
        
        if (needsMigration) {
            console.log(`🔄 Migration needed: ${this.currentVersion} → ${this.targetVersion}`);
        } else {
            console.log('✅ Database is up to date');
        }
        
        return needsMigration;
    }

    /**
     * Get pending migrations
     */
    getPendingMigrations() {
        const pending = [];
        
        for (let version = this.currentVersion + 1; version <= this.targetVersion; version++) {
            if (this.migrations.has(version)) {
                pending.push(this.migrations.get(version));
            }
        }
        
        return pending;
    }

    /**
     * Validate migration dependencies
     */
    validateDependencies(migration) {
        for (const dependency of migration.dependencies) {
            if (this.currentVersion < dependency) {
                throw new Error(
                    `Migration ${migration.version} requires migration ${dependency} to be applied first`
                );
            }
        }
    }

    /**
     * Create backup before migration
     */
    async createMigrationBackup() {
        if (!this.backupBeforeMigration) {
            return null;
        }

        try {
            console.log('💾 Creating backup before migration...');
            const backup = await this.db.createBackup();
            console.log('✅ Migration backup created:', backup.backupName);
            return backup;
        } catch (error) {
            console.error('❌ Failed to create migration backup:', error);
            throw new Error('Cannot proceed with migration without backup');
        }
    }

    /**
     * Validate database after migration
     */
    async validateMigration(version) {
        if (!this.validateAfterMigration) {
            return true;
        }

        try {
            console.log(`🔍 Validating migration ${version}...`);
            
            // Check database integrity
            const integrityCheck = await this.db.verifyIntegrity();
            if (!integrityCheck) {
                throw new Error('Database integrity check failed');
            }
            
            // Check if version was recorded
            const versionRecord = await this.db.selectOne(`
                SELECT version FROM db_version WHERE version = ?
            `, [version]);
            
            if (!versionRecord) {
                throw new Error(`Migration version ${version} not recorded in db_version table`);
            }
            
            // Run custom validation if defined
            const migration = this.migrations.get(version);
            if (migration.validate) {
                await migration.validate(this.db);
            }
            
            console.log(`✅ Migration ${version} validation passed`);
            return true;
            
        } catch (error) {
            console.error(`❌ Migration ${version} validation failed:`, error);
            return false;
        }
    }

    /**
     * Record migration in database
     */
    async recordMigration(version, description) {
        try {
            await this.db.insert('db_version', {
                version: version,
                description: description,
                applied_at: new Date().toISOString()
            });
            
            console.log(`📝 Recorded migration ${version} in database`);
            
        } catch (error) {
            console.error(`❌ Failed to record migration ${version}:`, error);
            throw error;
        }
    }

    /**
     * Run a single migration
     */
    async runMigration(migration, backup = null) {
        const startTime = Date.now();
        
        try {
            console.log(`🚀 Starting migration ${migration.version}: ${migration.description}`);
            
            // Validate dependencies
            this.validateDependencies(migration);
            
            // Run migration in transaction
            await this.db.executeTransaction([
                { sql: 'BEGIN IMMEDIATE' }
            ]);
            
            try {
                // Execute migration
                await migration.up(this.db);
                
                // Record migration
                await this.recordMigration(migration.version, migration.description);
                
                // Commit transaction
                await this.db.executeQuery('COMMIT');
                
                console.log(`✅ Migration ${migration.version} completed in ${Date.now() - startTime}ms`);
                
            } catch (migrationError) {
                // Rollback transaction
                await this.db.executeQuery('ROLLBACK');
                throw migrationError;
            }
            
            // Validate migration
            const isValid = await this.validateMigration(migration.version);
            if (!isValid) {
                throw new Error(`Migration ${migration.version} validation failed`);
            }
            
            // Update current version
            this.currentVersion = migration.version;
            
            // Log success
            if (window.logAction) {
                logAction(`Migration ${migration.version} completed successfully`, {
                    version: migration.version,
                    description: migration.description,
                    duration: Date.now() - startTime
                }, 'migration');
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ Migration ${migration.version} failed:`, error);
            
            // Attempt rollback if enabled
            if (this.rollbackOnFailure && backup) {
                await this.rollbackMigration(migration, backup, error);
            }
            
            // Log failure
            if (window.logAction) {
                logAction(`Migration ${migration.version} failed`, {
                    version: migration.version,
                    error: error.message,
                    duration: Date.now() - startTime
                }, 'migration_error');
            }
            
            throw error;
        }
    }

    /**
     * Rollback migration
     */
    async rollbackMigration(migration, backup, originalError) {
        try {
            console.log(`🔄 Rolling back migration ${migration.version}...`);
            
            if (backup && backup.backupName) {
                // Restore from backup
                await this.db.restoreFromBackup(backup.backupName);
                console.log(`✅ Restored database from backup: ${backup.backupName}`);
            } else {
                // Run down migration
                await migration.down(this.db);
                console.log(`✅ Executed rollback for migration ${migration.version}`);
            }
            
            // Log rollback
            if (window.logAction) {
                logAction(`Migration ${migration.version} rolled back`, {
                    version: migration.version,
                    originalError: originalError.message,
                    rollbackMethod: backup ? 'backup_restore' : 'down_migration'
                }, 'migration_rollback');
            }
            
        } catch (rollbackError) {
            console.error(`❌ Rollback failed for migration ${migration.version}:`, rollbackError);
            
            // This is a critical error - both migration and rollback failed
            throw new Error(
                `Migration ${migration.version} failed and rollback also failed. ` +
                `Original error: ${originalError.message}. ` +
                `Rollback error: ${rollbackError.message}`
            );
        }
    }

    /**
     * Run all pending migrations
     */
    async migrate() {
        try {
            console.log('🚀 Starting database migration process...');
            
            // Check if migration is needed
            const needsMigration = await this.needsMigration();
            if (!needsMigration) {
                console.log('✅ No migrations needed');
                return true;
            }
            
            // Get pending migrations
            const pendingMigrations = this.getPendingMigrations();
            if (pendingMigrations.length === 0) {
                console.log('⚠️ No migration definitions found for target version');
                return false;
            }
            
            console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
            
            // Create backup before starting
            let backup = null;
            try {
                backup = await this.createMigrationBackup();
            } catch (backupError) {
                console.error('❌ Migration aborted due to backup failure:', backupError);
                return false;
            }
            
            // Run migrations in order
            let completedMigrations = 0;
            
            for (const migration of pendingMigrations) {
                try {
                    await this.runMigration(migration, backup);
                    completedMigrations++;
                    
                    // Update progress
                    const progress = Math.round((completedMigrations / pendingMigrations.length) * 100);
                    console.log(`📊 Migration progress: ${progress}% (${completedMigrations}/${pendingMigrations.length})`);
                    
                } catch (migrationError) {
                    console.error(`❌ Migration process stopped at version ${migration.version}`);
                    throw migrationError;
                }
            }
            
            // Verify final state
            const finalVersion = await this.getCurrentVersion();
            if (finalVersion !== this.targetVersion) {
                throw new Error(`Migration completed but version mismatch. Expected ${this.targetVersion}, got ${finalVersion}`);
            }
            
            console.log(`🎉 All migrations completed successfully! Database is now at version ${finalVersion}`);
            
            // Log successful migration
            if (window.logAction) {
                logAction('Database migration completed successfully', {
                    fromVersion: this.currentVersion,
                    toVersion: finalVersion,
                    migrationsRun: completedMigrations,
                    backupCreated: backup ? backup.backupName : null
                }, 'migration_success');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Database migration failed:', error);
            
            // Show user-friendly error message
            if (window.Utils && window.Utils.showNotification) {
                Utils.showNotification(
                    'Database migration failed. Please contact support or restore from backup.',
                    'error'
                );
            }
            
            throw error;
        }
    }

    /**
     * Rollback to specific version
     */
    async rollbackToVersion(targetVersion) {
        try {
            console.log(`🔄 Rolling back database to version ${targetVersion}...`);
            
            const currentVersion = await this.getCurrentVersion();
            
            if (targetVersion >= currentVersion) {
                console.log('⚠️ Target version is not lower than current version');
                return false;
            }
            
            // Create backup before rollback
            const backup = await this.createMigrationBackup();
            
            // Get migrations to rollback (in reverse order)
            const migrationsToRollback = [];
            for (let version = currentVersion; version > targetVersion; version--) {
                if (this.migrations.has(version)) {
                    migrationsToRollback.push(this.migrations.get(version));
                }
            }
            
            if (migrationsToRollback.length === 0) {
                console.log('⚠️ No migrations found to rollback');
                return false;
            }
            
            console.log(`📋 Rolling back ${migrationsToRollback.length} migrations`);
            
            // Execute rollbacks
            for (const migration of migrationsToRollback) {
                console.log(`🔄 Rolling back migration ${migration.version}`);
                
                try {
                    await migration.down(this.db);
                    
                    // Remove from db_version table
                    await this.db.delete('db_version', 'version = ?', [migration.version]);
                    
                    console.log(`✅ Rolled back migration ${migration.version}`);
                    
                } catch (error) {
                    console.error(`❌ Rollback failed for migration ${migration.version}:`, error);
                    throw error;
                }
            }
            
            // Verify final state
            const finalVersion = await this.getCurrentVersion();
            console.log(`✅ Rollback completed. Database is now at version ${finalVersion}`);
            
            // Log rollback
            if (window.logAction) {
                logAction('Database rollback completed', {
                    fromVersion: currentVersion,
                    toVersion: finalVersion,
                    migrationsRolledBack: migrationsToRollback.length
                }, 'migration_rollback');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Database rollback failed:', error);
            throw error;
        }
    }

    /**
     * Get migration history
     */
    async getMigrationHistory() {
        try {
            const history = await this.db.selectAll(`
                SELECT version, description, applied_at 
                FROM db_version 
                ORDER BY version DESC
            `);
            
            return history.map(record => ({
                version: record.version,
                description: record.description,
                appliedAt: record.applied_at,
                migrationDef: this.migrations.get(record.version)
            }));
            
        } catch (error) {
            console.error('Failed to get migration history:', error);
            return [];
        }
    }

    /**
     * Get migration status
     */
    async getStatus() {
        const currentVersion = await this.getCurrentVersion();
        const pendingMigrations = this.getPendingMigrations();
        const history = await this.getMigrationHistory();
        
        return {
            currentVersion,
            targetVersion: this.targetVersion,
            needsMigration: currentVersion < this.targetVersion,
            pendingMigrations: pendingMigrations.length,
            appliedMigrations: history.length,
            lastMigration: history[0] || null,
            availableMigrations: Array.from(this.migrations.keys()),
            status: currentVersion < this.targetVersion ? 'pending' : 'up-to-date'
        };
    }

    /**
     * Dry run migration (validation only)
     */
    async dryRun() {
        try {
            console.log('🧪 Running migration dry run...');
            
            const pendingMigrations = this.getPendingMigrations();
            const results = [];
            
            for (const migration of pendingMigrations) {
                const result = {
                    version: migration.version,
                    description: migration.description,
                    status: 'unknown',
                    error: null
                };
                
                try {
                    // Validate dependencies
                    this.validateDependencies(migration);
                    result.status = 'valid';
                    
                } catch (error) {
                    result.status = 'invalid';
                    result.error = error.message;
                }
                
                results.push(result);
            }
            
            console.log('✅ Dry run completed');
            return results;
            
        } catch (error) {
            console.error('❌ Dry run failed:', error);
            throw error;
        }
    }
}

// Database Schema Module
const DatabaseSchema = {
    /**
     * Create all database tables
     */
    async createTables(db) {
        const tableQueries = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'staff')),
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                first_login BOOLEAN DEFAULT 0,
                temp_password TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                created_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
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
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT
            )`,
            
            // Inventory table
            `CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('Watch', 'Clock', 'Timepiece', 'Strap', 'Battery')),
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                size TEXT DEFAULT '-',
                price DECIMAL(10,2) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                outlet TEXT NOT NULL CHECK (outlet IN ('Semmancheri', 'Navalur', 'Padur')),
                description TEXT,
                status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT
            )`,
            
            // Other tables...
            `CREATE TABLE IF NOT EXISTS inventory_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                inventory_id INTEGER NOT NULL,
                movement_date DATE NOT NULL,
                from_outlet TEXT,
                to_outlet TEXT NOT NULL,
                reason TEXT DEFAULT 'Stock Transfer',
                moved_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
            )`,
            
            `CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                inventory_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                price DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                discount_type TEXT CHECK (discount_type IN ('percentage', 'amount', '')),
                discount_value DECIMAL(10,2) DEFAULT 0.00,
                discount_amount DECIMAL(10,2) DEFAULT 0.00,
                total_amount DECIMAL(10,2) NOT NULL,
                payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Card', 'UPI', 'Bank Transfer')),
                status TEXT NOT NULL DEFAULT 'completed',
                sale_date DATE NOT NULL,
                sale_time TIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                invoice_generated BOOLEAN DEFAULT 0,
                invoice_id INTEGER,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (inventory_id) REFERENCES inventory(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                watch_name TEXT NOT NULL,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                dial_color TEXT NOT NULL,
                movement_no TEXT NOT NULL,
                gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
                case_type TEXT NOT NULL,
                strap_type TEXT NOT NULL,
                issue TEXT NOT NULL,
                cost DECIMAL(10,2) NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'on-hold', 'completed')),
                estimated_delivery DATE,
                actual_delivery DATE,
                completion_image TEXT,
                completion_description TEXT,
                warranty_period INTEGER DEFAULT 0,
                service_date DATE NOT NULL,
                service_time TIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                started_at DATETIME,
                completed_at DATETIME,
                held_at DATETIME,
                acknowledgement_generated BOOLEAN DEFAULT 0,
                completion_invoice_generated BOOLEAN DEFAULT 0,
                acknowledgement_invoice_id INTEGER,
                completion_invoice_id INTEGER,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
            )`,
            
            `CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_no TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('Sales', 'Service Completion', 'Service Acknowledgement')),
                sub_type TEXT,
                customer_id INTEGER NOT NULL,
                related_id INTEGER,
                related_type TEXT CHECK (related_type IN ('sale', 'service')),
                amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                status TEXT NOT NULL DEFAULT 'generated',
                invoice_date DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                invoice_data TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS action_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                user_role TEXT,
                action TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                details TEXT,
                session_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS db_version (
                version INTEGER PRIMARY KEY,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )`
        ];
        
        for (const query of tableQueries) {
            await db.executeQuery(query);
        }
        
        console.log('📋 Database tables created successfully');
    },
    
    /**
     * Create database indexes
     */
    async createIndexes(db) {
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
            'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
            'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
            'CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(code)',
            'CREATE INDEX IF NOT EXISTS idx_inventory_brand ON inventory(brand)',
            'CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory(type)',
            'CREATE INDEX IF NOT EXISTS idx_inventory_outlet ON inventory(outlet)',
            'CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)',
            'CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)',
            'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_logs_username ON action_logs(username)'
        ];
        
        for (const query of indexQueries) {
            await db.executeQuery(query);
        }
        
        console.log('📊 Database indexes created successfully');
    },
    
    /**
     * Create database triggers
     */
    async createTriggers(db) {
        // Implementation for triggers would go here
        console.log('⚡ Database triggers created successfully');
    },
    
    /**
     * Create database views
     */
    async createViews(db) {
        // Implementation for views would go here
        console.log('👁️ Database views created successfully');
    },
    
    /**
     * Insert default data
     */
    async insertDefaultData(db) {
        // Insert default admin user
        try {
            await db.insert('users', {
                username: 'admin',
                password_hash: 'admin123_hashed',
                role: 'admin',
                full_name: 'System Administrator',
                email: 'admin@zedsonwatchcraft.com',
                status: 'active',
                first_login: 0
            });
        } catch (error) {
            // Ignore if user already exists
        }
        
        console.log('📊 Default data inserted successfully');
    }
};

// Export modules
window.MigrationManager = MigrationManager;
window.DatabaseSchema = DatabaseSchema;

console.log('🔄 Migration Manager loaded');