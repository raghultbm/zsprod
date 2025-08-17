// Application constants for ZEDSON Watchcraft
const CONSTANTS = {
    // Company details
    COMPANY: {
        NAME: 'ZEDSON Watchcraft',
        ADDRESS: 'Shop A2A, Express Food Street, Semmancheri, Chennai 600119',
        MOBILE: '+91 9345667777',
        GST: '33EOJPR0534DZZZ',
        DEFAULT_LOCATION: 'Semmancheri'
    },

    // Customer ID configuration
    CUSTOMER: {
        ID_START: 100001,
        ID_LENGTH: 6
    },

    // Date formats
    DATE_FORMATS: {
        DISPLAY: 'DD MMM YYYY',
        DATABASE: 'YYYY-MM-DD',
        INVOICE: 'DD/MM/YYYY'
    },

    // Module permissions
    PERMISSIONS: {
        dashboard: ['admin', 'owner', 'manager'],
        customers: ['admin', 'owner', 'manager'],
        inventory: ['admin', 'owner', 'manager'],
        sales: ['admin', 'owner', 'manager'],
        service: ['admin', 'owner', 'manager'],
        invoices: ['admin', 'owner', 'manager'],
        expense: ['admin', 'owner'],
        ledger: ['admin', 'owner'],
        users: ['admin']
    },

    // Table row limits
    PAGINATION: {
        DEFAULT_LIMIT: 50,
        MAX_LIMIT: 500
    },

    // File upload limits
    UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif']
    },

    // Validation patterns
    PATTERNS: {
        MOBILE: /^[+]?[0-9]{10,15}$/,
        GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    // Status codes
    STATUS: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    // Default values
    DEFAULTS: {
        WARRANTY_PERIOD: 0,
        LOCATION: 'Semmancheri',
        CURRENCY: '₹',
        DISCOUNT_TYPE: 'percentage'
    },

    // Invoice prefixes
    INVOICE_PREFIXES: {
        sale: 'INVSA',
        service: 'INVSR',
        acknowledgement: 'ACKSR'
    }
};

// Make constants globally available
if (typeof window !== 'undefined') {
    window.CONSTANTS = CONSTANTS;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}