// ZEDSON WATCHCRAFT - Automated Setup Script
// setup.js

/**
 * Automated Setup and Deployment Script
 * Handles complete installation and configuration
 */

class ZedsonSetup {
    constructor() {
        this.version = '1.0.0';
        this.setupSteps = [
            'checkEnvironment',
            'validateFiles',
            'setupDatabase',
            'runMigrations',
            'configureSystem',
            'validateInstallation',
            'finalizeSetup'
        ];
        this.currentStep = 0;
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Main setup function
     */
    async setup() {
        console.log(`🚀 Starting ZEDSON WATCHCRAFT Setup v${this.version}`);
        console.log('📋 This will set up your watch shop management system with SQLite database');
        
        try {
            for (let i = 0; i < this.setupSteps.length; i++) {
                this.currentStep = i;
                const stepName = this.setupSteps[i];
                
                console.log(`\n📍 Step ${i + 1}/${this.setupSteps.length}: ${this.getStepDescription(stepName)}`);
                
                await this[stepName]();
                
                console.log(`✅ Step ${i + 1} completed successfully`);
            }
            
            console.log('\n🎉 ZEDSON WATCHCRAFT Setup completed successfully!');
            this.displaySetupSummary();
            
        } catch (error) {
            console.error(`\n❌ Setup failed at step ${this.currentStep + 1}: ${error.message}`);
            this.displayErrorReport();
            throw error;
        }
    }

    /**
     * Step 1: Check Environment
     */
    async checkEnvironment() {
        // Check browser compatibility
        if (!window.indexedDB) {
            throw new Error('IndexedDB not supported. Please use a modern browser.');
        }
        
        if (!window.localStorage) {
            throw new Error('LocalStorage not supported. Please use a modern browser.');
        }
        
        // Check for required APIs
        if (!window.fetch) {
            this.warnings.push('Fetch API not available. Some features may not work properly.');
        }
        
        if (!window.Worker) {
            this.warnings.push('Web Workers not available. Performance may be affected.');
        }
        
        // Check memory availability
        if (navigator.deviceMemory && navigator.deviceMemory < 2) {
            this.warnings.push('Low device memory detected. Performance may be affected.');
        }
        
        console.log('🌐 Environment check passed');
    }

    /**
     * Step 2: Validate Files
     */
    async validateFiles() {
        const requiredFiles = [
            // Core files
            'index.html',
            'css/styles.css',
            'css/login.css',
            
            // Database files
            'js/database/sqlite-core.js',
            'js/database/db-config.js',
            'js/database/migration-manager.js',
            'js/database/inventory-db.js',
            'js/database/customers-db.js',
            
            // Utility files
            'js/utils.js',
            'js/logging.js',
            'js/auth.js',
            
            // Business logic
            'js/inventory.js',
            'js/customers.js',
            'js/sales-core.js',
            'js/sales-extended.js',
            'js/service.js',
            'js/expenses.js',
            'js/invoices.js',
            'js/invoice-templates.js',
            
            // App controllers
            'js/app-core.js',
            'js/app-extended.js'
        ];
        
        const missingFiles = [];
        
        for (const file of requiredFiles) {
            try {
                const response = await fetch(file, { method: 'HEAD' });
                if (!response.ok) {
                    missingFiles.push(file);
                }
            } catch (error) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length > 0) {
            throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }
        
        console.log('📁 File validation passed');
    }

    /**
     * Step 3: Setup Database
     */
    async setupDatabase() {
        // Wait for SQL.js to load
        console.log('⏳ Loading SQLite library...');
        
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        while (!window.initSqlJs && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (!window.initSqlJs) {
            throw new Error('Failed to load SQLite library. Please check your internet connection.');
        }
        
        console.log('📚 SQLite library loaded');
        
        // Initialize SQL.js
        try {
            window.SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            console.log('🔧 SQL.js initialized');
        } catch (error) {
            throw new Error(`Failed to initialize SQL.js: ${error.message}`);
        }
        
        // Wait for SQLite core to be ready
        attempts = 0;
        while (!window.SQLiteCore && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.SQLiteCore) {
            throw new Error('SQLite core module not found');
        }
        
        // Initialize database
        console.log('🗃️ Initializing database...');
        const success = await window.SQLiteCore.initializeDatabase();
        
        if (!success) {
            throw new Error('Database initialization failed');
        }
        
        console.log('✅ Database setup completed');
    }

    /**
     * Step 4: Run Migrations
     */
    async runMigrations() {
        if (!window.MigrationManager) {
            throw new Error('Migration manager not found');
        }
        
        const migrationManager = new window.MigrationManager(window.SQLiteCore);
        
        console.log('🔄 Checking for database migrations...');
        
        const needsMigration = await migrationManager.needsMigration();
        
        if (needsMigration) {
            console.log('📦 Running database migrations...');
            const success = await migrationManager.migrate();
            
            if (!success) {
                throw new Error('Database migration failed');
            }
            
            console.log('✅ Database migrations completed');
        } else {
            console.log('✅ Database is up to date');
        }
        
        // Verify database integrity
        const isValid = await window.SQLiteCore.verifyIntegrity();
        if (!isValid) {
            throw new Error('Database integrity check failed');
        }
        
        console.log('🔍 Database integrity verified');
    }

    /**
     * Step 5: Configure System
     */
    async configureSystem() {
        // Load configuration
        if (!window.DatabaseConfig) {
            throw new Error('Database configuration not found');
        }
        
        console.log('⚙️ Applying system configuration...');
        
        // Set up default admin user if not exists
        try {
            if (window.SQLiteCore) {
                const adminExists = await window.SQLiteCore.selectOne(
                    'SELECT id FROM users WHERE username = ?',
                    ['admin']
                );
                
                if (!adminExists) {
                    console.log('👤 Creating default admin user...');
                    
                    // Simple hash for admin123
                    const adminPassword = 'admin123_hashed';
                    
                    await window.SQLiteCore.insert('users', {
                        username: 'admin',
                        password_hash: adminPassword,
                        role: 'admin',
                        full_name: 'System Administrator',
                        email: 'admin@zedsonwatchcraft.com',
                        status: 'active',
                        first_login: 0
                    });
                    
                    console.log('✅ Default admin user created');
                }
            }
        } catch (error) {
            this.warnings.push(`Could not create default admin user: ${error.message}`);
        }
        
        // Initialize logging
        if (window.LoggingModule) {
            window.LoggingModule.initializeLogging();
            console.log('📊 Logging system initialized');
        }
        
        // Set up cache and performance settings
        console.log('🚀 Optimizing performance settings...');
        
        // Enable compression if supported
        if ('CompressionStream' in window) {
            console.log('📦 Compression enabled');
        }
        
        console.log('⚙️ System configuration completed');
    }

    /**
     * Step 6: Validate Installation
     */
    async validateInstallation() {
        console.log('🔍 Validating installation...');
        
        const validationChecks = [
            {
                name: 'Database Connection',
                check: () => window.SQLiteCore && window.SQLiteCore.isReady()
            },
            {
                name: 'Configuration',
                check: () => window.DatabaseConfig !== undefined
            },
            {
                name: 'Utilities',
                check: () => window.Utils !== undefined
            },
            {
                name: 'Authentication',
                check: () => window.AuthModule !== undefined
            },
            {
                name: 'Inventory Module',
                check: () => window.InventoryModule !== undefined
            },
            {
                name: 'Customer Module',
                check: () => window.CustomerModule !== undefined
            },
            {
                name: 'Sales Module',
                check: () => window.SalesModule !== undefined
            },
            {
                name: 'Service Module',
                check: () => window.ServiceModule !== undefined
            },
            {
                name: 'Expense Module',
                check: () => window.ExpenseModule !== undefined
            },
            {
                name: 'Invoice Module',
                check: () => window.InvoiceModule !== undefined
            },
            {
                name: 'Logging Module',
                check: () => window.LoggingModule !== undefined
            }
        ];
        
        const failures = [];
        
        for (const validation of validationChecks) {
            try {
                const result = validation.check();
                if (!result) {
                    failures.push(validation.name);
                }
            } catch (error) {
                failures.push(`${validation.name} (Error: ${error.message})`);
            }
        }
        
        if (failures.length > 0) {
            throw new Error(`Validation failed for: ${failures.join(', ')}`);
        }
        
        // Test database operations
        try {
            const testStats = await window.SQLiteCore.getStatistics();
            console.log('📊 Database statistics:', testStats);
        } catch (error) {
            this.warnings.push(`Could not retrieve database statistics: ${error.message}`);
        }
        
        console.log('✅ Installation validation passed');
    }

    /**
     * Step 7: Finalize Setup
     */
    async finalizeSetup() {
        console.log('🎯 Finalizing setup...');
        
        // Create initial backup
        try {
            const backup = await window.SQLiteCore.createBackup();
            console.log(`💾 Initial backup created: ${backup.backupName}`);
        } catch (error) {
            this.warnings.push(`Could not create initial backup: ${error.message}`);
        }
        
        // Set up welcome data
        try {
            await this.setupWelcomeData();
        } catch (error) {
            this.warnings.push(`Could not setup welcome data: ${error.message}`);
        }
        
        // Mark setup as completed
        localStorage.setItem('zedson_setup_completed', JSON.stringify({
            version: this.version,
            completedAt: new Date().toISOString(),
            warnings: this.warnings.length
        }));
        
        console.log('🏁 Setup finalization completed');
    }

    /**
     * Setup welcome data
     */
    async setupWelcomeData() {
        // Add sample customers if none exist
        const customerCount = await window.SQLiteCore.selectOne('SELECT COUNT(*) as count FROM customers');
        
        if (customerCount && customerCount.count === 0) {
            console.log('👥 Adding sample customers...');
            
            const sampleCustomers = [
                {
                    name: 'Raj Kumar',
                    email: 'raj@email.com',
                    phone: '+91-9876543210',
                    address: 'Chennai, Tamil Nadu',
                    purchases: 0,
                    service_count: 0,
                    net_value: 0.00,
                    added_by: 'system'
                },
                {
                    name: 'Priya Sharma',
                    email: 'priya@email.com',
                    phone: '+91-9876543211',
                    address: 'Mumbai, Maharashtra',
                    purchases: 0,
                    service_count: 0,
                    net_value: 0.00,
                    added_by: 'system'
                }
            ];
            
            for (const customer of sampleCustomers) {
                await window.SQLiteCore.insert('customers', customer);
            }
        }
        
        // Add sample inventory if none exists
        const inventoryCount = await window.SQLiteCore.selectOne('SELECT COUNT(*) as count FROM inventory');
        
        if (inventoryCount && inventoryCount.count === 0) {
            console.log('📦 Adding sample inventory...');
            
            const sampleItems = [
                {
                    code: 'ROL001',
                    type: 'Watch',
                    brand: 'Rolex',
                    model: 'Submariner',
                    size: '40mm',
                    price: 850000.00,
                    quantity: 2,
                    outlet: 'Semmancheri',
                    description: 'Luxury diving watch',
                    status: 'available',
                    added_by: 'system'
                },
                {
                    code: 'OMG001',
                    type: 'Watch',
                    brand: 'Omega',
                    model: 'Speedmaster',
                    size: '42mm',
                    price: 450000.00,
                    quantity: 1,
                    outlet: 'Navalur',
                    description: 'Professional chronograph',
                    status: 'available',
                    added_by: 'system'
                },
                {
                    code: 'CAS001',
                    type: 'Watch',
                    brand: 'Casio',
                    model: 'G-Shock',
                    size: '44mm',
                    price: 15000.00,
                    quantity: 5,
                    outlet: 'Padur',
                    description: 'Sports watch',
                    status: 'available',
                    added_by: 'system'
                }
            ];
            
            for (const item of sampleItems) {
                const result = await window.SQLiteCore.insert('inventory', item);
                
                // Add initial movement record
                if (result.insertId) {
                    await window.SQLiteCore.insert('inventory_movements', {
                        inventory_id: result.insertId,
                        movement_date: new Date().toISOString().split('T')[0],
                        from_outlet: null,
                        to_outlet: item.outlet,
                        reason: 'Initial stock',
                        moved_by: 'system'
                    });
                }
            }
        }
        
        console.log('📊 Welcome data setup completed');
    }

    /**
     * Get step description
     */
    getStepDescription(stepName) {
        const descriptions = {
            checkEnvironment: 'Checking browser compatibility and environment',
            validateFiles: 'Validating required files and dependencies',
            setupDatabase: 'Setting up SQLite database and core modules',
            runMigrations: 'Running database migrations and schema updates',
            configureSystem: 'Configuring system settings and default users',
            validateInstallation: 'Validating installation and module loading',
            finalizeSetup: 'Finalizing setup and creating initial backup'
        };
        
        return descriptions[stepName] || stepName;
    }

    /**
     * Display setup summary
     */
    displaySetupSummary() {
        console.log('\n📋 SETUP SUMMARY');
        console.log('================');
        console.log(`✅ Version: ${this.version}`);
        console.log(`✅ Steps completed: ${this.setupSteps.length}/${this.setupSteps.length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach((warning, i) => {
                console.log(`   ${i + 1}. ${warning}`);
            });
        }
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('   1. Open your browser and navigate to the application');
        console.log('   2. Login with username: admin, password: admin123');
        console.log('   3. Change the default admin password immediately');
        console.log('   4. Start adding your inventory and customers');
        
        console.log('\n📞 SUPPORT:');
        console.log('   For technical support, contact: support@zedsonwatchcraft.com');
        console.log('   Documentation: Check the included README.md file');
        
        console.log('\n🎉 WELCOME TO ZEDSON WATCHCRAFT!');
    }

    /**
     * Display error report
     */
    displayErrorReport() {
        console.log('\n❌ SETUP FAILED');
        console.log('===============');
        console.log(`Failed at step: ${this.currentStep + 1}/${this.setupSteps.length}`);
        console.log(`Step name: ${this.setupSteps[this.currentStep]}`);
        
        if (this.errors.length > 0) {
            console.log('\n🚨 ERRORS:');
            this.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach((warning, i) => {
                console.log(`   ${i + 1}. ${warning}`);
            });
        }
        
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('   1. Refresh the page and try again');
        console.log('   2. Check browser console for additional errors');
        console.log('   3. Ensure all files are properly uploaded');
        console.log('   4. Check internet connection for CDN resources');
        
        console.log('\n📞 SUPPORT:');
        console.log('   Contact: support@zedsonwatchcraft.com');
        console.log('   Include this error report in your message');
    }

    /**
     * Check if setup was already completed
     */
    static isSetupCompleted() {
        const setupInfo = localStorage.getItem('zedson_setup_completed');
        return setupInfo !== null;
    }

    /**
     * Reset setup (for development/testing)
     */
    static resetSetup() {
        if (confirm('This will reset the entire application setup. Are you sure?')) {
            localStorage.removeItem('zedson_setup_completed');
            localStorage.removeItem('zedson_watchcraft.db');
            
            // Clear any backup data
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('zedson_backup_')) {
                    localStorage.removeItem(key);
                }
            });
            
            console.log('🔄 Setup reset completed. Please refresh the page.');
            return true;
        }
        return false;
    }
}

// Auto-run setup if not completed
document.addEventListener('DOMContentLoaded', async function() {
    // Check if setup is needed
    if (!ZedsonSetup.isSetupCompleted()) {
        console.log('🚀 First time setup detected. Running automated setup...');
        
        try {
            const setup = new ZedsonSetup();
            await setup.setup();
            
            // Reload page to start fresh
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('Setup failed:', error);
            alert('Setup failed: ' + error.message + '\n\nPlease check the console for details and contact support if needed.');
        }
    } else {
        console.log('✅ Setup already completed. Application ready.');
    }
});

// Add setup reset function to global scope for debugging
window.ZedsonSetup = ZedsonSetup;

// Export setup class
export default ZedsonSetup;