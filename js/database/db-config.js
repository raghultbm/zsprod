// ZEDSON WATCHCRAFT - Database Configuration
// js/database/db-config.js

/**
 * Database configuration and settings for ZEDSON WATCHCRAFT
 * Contains all database-related configuration parameters
 */

const DatabaseConfig = {
    // Database Settings
    database: {
        name: 'zedson_watchcraft.db',
        version: 1,
        description: 'ZEDSON WATCHCRAFT Management System Database',
        
        // Connection settings
        maxConnections: 5,
        connectionTimeout: 30000, // 30 seconds
        queryTimeout: 10000, // 10 seconds
        
        // Performance settings
        cacheSize: 10000, // 10MB cache
        pageSize: 4096,
        tempStore: 'MEMORY',
        journalMode: 'WAL',
        synchronous: 'NORMAL',
        
        // Auto-vacuum settings
        autoVacuum: 'INCREMENTAL',
        incrementalVacuumPages: 1000,
        
        // Security settings
        foreignKeys: true,
        recursiveTriggers: true,
        
        // Backup settings
        autoBackup: true,
        backupInterval: 3600000, // 1 hour in milliseconds
        maxBackups: 10,
        backupPrefix: 'zedson_backup_'
    },
    
    // File Paths
    paths: {
        database: './data/',
        backups: './backups/',
        exports: './exports/',
        logs: './logs/',
        temp: './temp/'
    },
    
    // Performance Tuning
    performance: {
        // Query optimization
        useIndexes: true,
        analyzeTables: true,
        optimizeQueries: true,
        
        // Memory settings
        memoryLimit: '512MB',
        tempMemoryLimit: '256MB',
        
        // Transaction settings
        transactionMode: 'IMMEDIATE',
        busyTimeout: 30000,
        
        // Connection pooling
        minConnections: 1,
        maxConnections: 10,
        connectionIdleTimeout: 300000, // 5 minutes
        
        // Query caching
        enableQueryCache: true,
        queryCacheSize: 100,
        queryCacheTTL: 300000 // 5 minutes
    },
    
    // Backup Configuration
    backup: {
        enabled: true,
        automatic: true,
        
        // Backup schedule
        schedule: {
            interval: 'hourly', // hourly, daily, weekly
            time: '02:00', // For daily backups
            dayOfWeek: 0, // For weekly backups (0 = Sunday)
            retention: {
                hours: 24, // Keep 24 hourly backups
                days: 7,   // Keep 7 daily backups
                weeks: 4   // Keep 4 weekly backups
            }
        },
        
        // Backup storage
        storage: {
            local: true,
            compression: true,
            encryption: false, // Can be enabled for production
            maxSize: '100MB'
        },
        
        // Cleanup settings
        cleanup: {
            enabled: true,
            maxAge: 30, // days
            maxCount: 50
        }
    },
    
    // Migration Settings
    migration: {
        enabled: true,
        autoMigrate: true,
        backupBeforeMigration: true,
        validateAfterMigration: true,
        rollbackOnFailure: true,
        
        // Version tracking
        versionTable: 'db_version',
        currentVersion: 1,
        targetVersion: 1
    },
    
    // Logging Configuration
    logging: {
        enabled: true,
        level: 'INFO', // DEBUG, INFO, WARN, ERROR
        
        // Log targets
        console: true,
        file: false, // Enable for production
        database: true,
        
        // Log retention
        maxLogEntries: 10000,
        maxLogAge: 30, // days
        
        // Log categories
        categories: {
            queries: false, // Enable for debugging
            errors: true,
            performance: true,
            backup: true,
            migration: true,
            authentication: true,
            transactions: true
        }
    },
    
    // Error Handling
    errorHandling: {
        maxRetries: 3,
        retryDelay: 1000, // milliseconds
        
        // Error recovery
        autoRecovery: true,
        recoveryStrategies: {
            'database is locked': 'retry',
            'no such table': 'recreate',
            'database disk image is malformed': 'restore_backup'
        },
        
        // Error notification
        notifyOnError: true,
        maxErrorsBeforeAlert: 10
    },
    
    // Security Settings
    security: {
        // Password hashing
        passwordHashing: {
            algorithm: 'bcrypt',
            saltRounds: 12
        },
        
        // Session management
        session: {
            timeout: 3600000, // 1 hour
            renewOnActivity: true,
            secureCookies: true
        },
        
        // Access control
        accessControl: {
            enforcePermissions: true,
            logAccess: true,
            maxLoginAttempts: 5,
            lockoutDuration: 900000 // 15 minutes
        },
        
        // Data protection
        dataProtection: {
            encryptSensitiveFields: false, // Can be enabled
            anonymizeOnExport: true,
            auditTrail: true
        }
    },
    
    // Development Settings
    development: {
        debugMode: false,
        verboseLogging: false,
        mockData: false,
        resetOnStart: false,
        
        // Testing
        enableTestData: false,
        testDataFile: 'test-data.json',
        
        // Performance monitoring
        enableProfiling: false,
        logSlowQueries: true,
        slowQueryThreshold: 1000 // milliseconds
    },
    
    // Production Settings
    production: {
        optimizeForProduction: true,
        enableCompression: true,
        enableCaching: true,
        
        // Monitoring
        healthChecks: true,
        performanceMetrics: true,
        alerting: true,
        
        // Maintenance
        maintenanceMode: false,
        maintenanceMessage: 'System is under maintenance. Please try again later.'
    },
    
    // Feature Flags
    features: {
        autoBackup: true,
        realTimeSync: false, // For future multi-device support
        cloudBackup: false,  // For future cloud integration
        analytics: true,
        reporting: true,
        excelExport: true,
        invoiceGeneration: true,
        imageUpload: true,
        emailNotifications: false // For future email integration
    },
    
    // Cache Configuration
    cache: {
        enabled: true,
        
        // Memory cache
        memory: {
            maxSize: '50MB',
            ttl: 300000, // 5 minutes
            checkPeriod: 60000 // 1 minute
        },
        
        // Query result cache
        queryResults: {
            enabled: true,
            maxEntries: 1000,
            ttl: 180000 // 3 minutes
        },
        
        // Static data cache
        staticData: {
            customers: 600000, // 10 minutes
            inventory: 300000, // 5 minutes
            settings: 1800000  // 30 minutes
        }
    },
    
    // Export/Import Settings
    export: {
        formats: ['json', 'csv', 'xlsx'],
        compression: true,
        encryption: false,
        
        // Size limits
        maxRows: 100000,
        maxFileSize: '50MB',
        
        // Default settings
        includeImages: false,
        dateFormat: 'YYYY-MM-DD',
        currencyFormat: '₹#,##0.00'
    },
    
    // Validation Rules
    validation: {
        strictMode: true,
        
        // Field validation
        fields: {
            email: {
                required: true,
                format: 'email',
                unique: true
            },
            phone: {
                required: true,
                format: 'phone',
                unique: true
            },
            price: {
                required: true,
                type: 'decimal',
                min: 0,
                precision: 2
            },
            quantity: {
                required: true,
                type: 'integer',
                min: 0
            }
        },
        
        // Business rules
        business: {
            maxSaleQuantity: 100,
            maxServiceCost: 1000000,
            maxDiscountPercentage: 50,
            maxWarrantyPeriod: 60 // months
        }
    },
    
    // Notification Settings
    notifications: {
        enabled: true,
        
        // Types
        types: {
            lowStock: true,
            serviceReminders: true,
            backupStatus: true,
            errors: true,
            warnings: true
        },
        
        // Thresholds
        thresholds: {
            lowStock: 5,
            criticalErrors: 10,
            diskSpace: '90%'
        }
    }
};

// Environment-specific overrides
const EnvironmentConfig = {
    development: {
        logging: {
            level: 'DEBUG',
            console: true,
            categories: {
                queries: true,
                performance: true
            }
        },
        development: {
            debugMode: true,
            verboseLogging: true,
            enableTestData: true
        },
        backup: {
            interval: 600000 // 10 minutes for testing
        }
    },
    
    production: {
        logging: {
            level: 'WARN',
            console: false,
            file: true
        },
        development: {
            debugMode: false,
            verboseLogging: false,
            enableTestData: false
        },
        security: {
            dataProtection: {
                encryptSensitiveFields: true
            }
        },
        performance: {
            enableQueryCache: true,
            analyzeTables: true
        }
    }
};

// Detect environment and merge config
function getConfig() {
    const env = (typeof process !== 'undefined' && process.env.NODE_ENV) || 'development';
    const envConfig = EnvironmentConfig[env] || EnvironmentConfig.development;
    
    // Deep merge configurations
    return deepMerge(DatabaseConfig, envConfig);
}

// Deep merge utility function
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

// Configuration validation
function validateConfig(config) {
    const errors = [];
    
    // Required settings
    if (!config.database.name) {
        errors.push('Database name is required');
    }
    
    if (config.performance.maxConnections < 1) {
        errors.push('Max connections must be at least 1');
    }
    
    if (config.backup.enabled && !config.backup.schedule.interval) {
        errors.push('Backup schedule interval is required when backup is enabled');
    }
    
    // Warn about development settings in production
    if (config.production.optimizeForProduction && config.development.debugMode) {
        console.warn('⚠️ Debug mode is enabled in production configuration');
    }
    
    if (errors.length > 0) {
        throw new Error('Configuration validation failed: ' + errors.join(', '));
    }
    
    return true;
}

// Get final configuration
const config = getConfig();

// Validate configuration
try {
    validateConfig(config);
    console.log('✅ Database configuration validated successfully');
} catch (error) {
    console.error('❌ Database configuration validation failed:', error.message);
    throw error;
}

// Export configuration
window.DatabaseConfig = config;

// Export individual sections for convenience
window.DBConfig = {
    database: config.database,
    performance: config.performance,
    backup: config.backup,
    logging: config.logging,
    security: config.security,
    cache: config.cache,
    validation: config.validation
};

// Configuration helper functions
window.DBConfigHelpers = {
    /**
     * Get database connection string
     */
    getConnectionString() {
        return config.paths.database + config.database.name;
    },
    
    /**
     * Get backup file path
     */
    getBackupPath(timestamp) {
        const ts = timestamp || new Date().toISOString().replace(/[:.]/g, '-');
        return config.paths.backups + config.backup.backupPrefix + ts + '.db';
    },
    
    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(feature) {
        return config.features[feature] === true;
    },
    
    /**
     * Get cache TTL for data type
     */
    getCacheTTL(dataType) {
        return config.cache.staticData[dataType] || config.cache.memory.ttl;
    },
    
    /**
     * Get validation rules for field
     */
    getFieldValidation(field) {
        return config.validation.fields[field] || {};
    },
    
    /**
     * Get business rule value
     */
    getBusinessRule(rule) {
        return config.validation.business[rule];
    },
    
    /**
     * Update configuration at runtime
     */
    updateConfig(path, value) {
        const keys = path.split('.');
        let current = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        console.log(`📝 Configuration updated: ${path} = ${value}`);
    }
};

console.log('⚙️ Database configuration loaded');
console.log('📊 Environment:', (typeof process !== 'undefined' && process.env.NODE_ENV) || 'development');
console.log('🗃️ Database:', config.database.name);
console.log('🔧 Features enabled:', Object.keys(config.features).filter(f => config.features[f]).join(', '));