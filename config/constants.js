// Application Constants
const CONSTANTS = {
    // Company Information
    COMPANY: {
        NAME: 'ZEDSON Watchcraft',
        DEFAULT_LOCATION: 'Semmancheri',
        ADDRESS: 'Shop A2A, Express Food Street, Semmancheri, Chennai 600119',
        MOBILE: '+91 9345667777',
        GST_NUMBER: '33EOJPR0534DZZZ'
    },

    // Locations
    LOCATIONS: ['Semmancheri', 'Navalur', 'Padur'],

    // Payment Modes
    PAYMENT_MODES: ['UPI', 'Cash', 'Card', 'Multiple Payment Modes'],

    // User Types
    USER_TYPES: {
        ADMIN: 'admin',
        OWNER: 'owner',
        MANAGER: 'manager'
    },

    // Inventory Categories
    INVENTORY_CATEGORIES: {
        WATCH: {
            name: 'Watch',
            code: 'W',
            fields: ['brand', 'gender', 'type', 'strap'],
            options: {
                gender: ['Gents', 'Ladies'],
                type: ['Analog', 'Digital'],
                strap: ['Leather', 'Chain', 'Fiber']
            }
        },
        WALLCLOCKS: {
            name: 'WallClocks',
            code: 'C',
            fields: ['brand', 'type'],
            options: {
                type: ['Analog', 'Digital']
            }
        },
        TIMEPIECES: {
            name: 'Timepieces',
            code: 'T',
            fields: ['brand', 'type'],
            options: {
                type: ['Analog', 'Digital']
            }
        },
        STRAP: {
            name: 'Strap',
            code: 'S',
            fields: ['brand', 'material', 'size'],
            options: {
                material: ['Leather', 'Chain', 'Fiber'],
                size: generateSizes()
            }
        },
        SPRING_BAR: {
            name: 'Spring Bar',
            code: 'B',
            fields: ['size'],
            options: {
                size: generateSizes()
            }
        },
        LOOP: {
            name: 'Loop',
            code: 'L',
            fields: ['size', 'material'],
            options: {
                size: generateSizes(),
                material: ['Leather', 'Fiber']
            }
        },
        BUCKLE: {
            name: 'Buckle',
            code: 'K',
            fields: ['size'],
            options: {
                size: generateSizes()
            }
        }
    },

    // Service Status Options
    SERVICE_STATUS: [
        'Yet to Start',
        'Delivered',
        'In Service Center',
        'Yet to Send Parrys',
        'In Parrys',
        'To Return to Customer',
        'Service Completed',
        'Waiting for Customer to Pickup'
    ],

    // Service Types
    SERVICE_TYPES: {
        NEW: 'new',
        INSTANT: 'instant'
    },

    // Instant Service Issue Types
    INSTANT_SERVICE_ISSUES: [
        {
            type: 'Battery Change',
            requiresInventory: true,
            displayName: 'Battery Change'
        },
        {
            type: 'Link Removal / Addition',
            requiresInventory: false,
            displayName: 'Link Removal / Addition'
        },
        {
            type: 'Other',
            requiresInventory: false,
            displayName: 'Other'
        }
    ],

    // Case Materials
    CASE_MATERIALS: ['Steel', 'Gold Tone', 'Fiber'],

    // Strap Materials for Services
    SERVICE_STRAP_MATERIALS: ['Leather', 'Fiber', 'Steel', 'Gold Plated'],

    // Invoice Prefixes
    INVOICE_PREFIXES: {
        SALE: 'INVSA',
        SERVICE: 'INVSR',
        ACKNOWLEDGEMENT: 'ACKSR'
    },

    // Default Settings
    DEFAULTS: {
        WARRANTY_PERIOD: 0, // months
        DISCOUNT_TYPE: 'Percentage',
        CURRENCY: '₹',
        DATE_FORMAT: 'DD MMM YYYY',
        DATETIME_FORMAT: 'DD MMM YYYY HH:mm'
    },

    // Permissions
    PERMISSIONS: {
        DASHBOARD: 'dashboard',
        CUSTOMERS: 'customers',
        INVENTORY: 'inventory',
        SALES: 'sales',
        SERVICE: 'service',
        INVOICES: 'invoices',
        EXPENSE: 'expense',
        LEDGER: 'ledger',
        USERS: 'users',
        ALL_ACCESS: 'all_access'
    },

    // Validation Rules
    VALIDATION: {
        CUSTOMER_ID_LENGTH: 6,
        MOBILE_MIN_LENGTH: 10,
        MOBILE_MAX_LENGTH: 15,
        PASSWORD_MIN_LENGTH: 6,
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif']
    },

    // WhatsApp Messages
    WHATSAPP_MESSAGES: {
        SALE_INVOICE: 'Thank you for your purchase from ZEDSON Watchcraft! Your invoice is attached. For any queries, contact us at +91 9345667777.',
        SERVICE_INVOICE: 'Your watch service is completed at ZEDSON Watchcraft! Your invoice is attached. Thank you for choosing us. Contact: +91 9345667777.',
        SERVICE_ACKNOWLEDGEMENT: 'Thank you for choosing ZEDSON Watchcraft for your watch service. Your acknowledgement receipt is attached. We will keep you updated on the progress.'
    },

    // Database Settings
    DATABASE: {
        BATCH_SIZE: 10,
        MAX_CONNECTIONS: 5,
        TIMEOUT: 30000, // 30 seconds
        BACKUP_RETENTION_DAYS: 30
    },

    // Session Settings
    SESSION: {
        TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
        REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
        WARNING_TIME: 10 * 60 * 1000 // 10 minutes before timeout
    },

    // UI Settings
    UI: {
        ITEMS_PER_PAGE: 50,
        SEARCH_DEBOUNCE: 300, // milliseconds
        TOAST_DURATION: 3000, // milliseconds
        LOADING_DELAY: 100 // milliseconds
    },

    // Audit Settings
    AUDIT: {
        RETENTION_DAYS: 365,
        BATCH_SIZE: 10,
        BATCH_TIMEOUT: 5000, // milliseconds
        CRITICAL_ACTIONS: [
            'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE',
            'USER_CREATE', 'USER_DELETE', 'PERMISSION_CHANGE'
        ]
    }
};

// Helper function to generate sizes
function generateSizes() {
    const sizes = [];
    for (let i = 8; i <= 28; i += 2) {
        sizes.push(`${i}MM`);
    }
    return sizes;
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.CONSTANTS = CONSTANTS;
}