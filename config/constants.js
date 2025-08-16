// Application constants for ZEDSON Watchcraft
window.Constants = {
    // Shop Information
    SHOP_INFO: {
        name: 'ZEDSON Watchcraft',
        defaultLocation: 'Semmancheri',
        address: 'Shop A2A, Express Food Street, Semmancheri, Chennai 600119',
        mobile: '+91 9345667777',
        gst: '33EOJPR0534DZZZ',
        email: 'info@zedsonwatchcraft.com'
    },

    // User Types
    USER_TYPES: {
        ADMIN: 'admin',
        OWNER: 'owner',
        MANAGER: 'manager'
    },

    // Locations
    LOCATIONS: [
        'Semmancheri',
        'Navalur',
        'Padur'
    ],

    // Payment Modes
    PAYMENT_MODES: [
        'UPI',
        'Cash',
        'Card',
        'Multiple Payment Modes'
    ],

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

    // Invoice Types
    INVOICE_TYPES: {
        SALE: 'sale',
        SERVICE: 'service'
    },

    // Discount Types
    DISCOUNT_TYPES: [
        'Percentage',
        'Amount'
    ],

    // Watch Genders
    GENDERS: [
        'Gents',
        'Ladies'
    ],

    // Watch Types
    WATCH_TYPES: [
        'Analog',
        'Digital'
    ],

    // Strap Materials
    STRAP_MATERIALS: [
        'Leather',
        'Chain',
        'Fiber'
    ],

    // Case Materials
    CASE_MATERIALS: [
        'Steel',
        'Gold Tone',
        'Fiber'
    ],

    // Strap Types for Service
    SERVICE_STRAP_TYPES: [
        'Leather',
        'Fiber',
        'Steel',
        'Gold Plated'
    ],

    // Size Options (8MM to 28MM)
    SIZES: (() => {
        const sizes = [];
        for (let i = 8; i <= 28; i += 2) {
            sizes.push(`${i}MM`);
        }
        return sizes;
    })(),

    // Instant Service Issue Types
    INSTANT_SERVICE_ISSUES: [
        'Battery Change',
        'Link Removal / Addition',
        'Other'
    ],

    // Database Table Names
    TABLES: {
        USERS: 'users',
        CUSTOMERS: 'customers',
        INVENTORY: 'inventory',
        SALES: 'sales',
        SERVICES: 'services',
        INVOICES: 'invoices',
        EXPENSES: 'expenses',
        LEDGER: 'ledger',
        AUDIT_LOG: 'audit_log',
        BRANDS: 'brands',
        HISTORY: 'history'
    },

    // Audit Actions
    AUDIT_ACTIONS: {
        INSERT: 'INSERT',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT'
    },

    // Date Formats
    DATE_FORMATS: {
        DISPLAY: 'DD MMM YYYY',
        INPUT: 'YYYY-MM-DD',
        SLASH: 'DD/MM/YYYY',
        TIMESTAMP: 'DD MMM YYYY, hh:mm A'
    },

    // Pagination
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 20,
        PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
    },

    // File Upload
    FILE_UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif']
    },

    // WhatsApp Integration
    WHATSAPP: {
        BASE_URL: 'https://wa.me/',
        SALE_MESSAGE: 'Thank you for your purchase from ZEDSON Watchcraft! Please find your invoice attached.',
        SERVICE_MESSAGE: 'Thank you for choosing ZEDSON Watchcraft for your service needs! Your service invoice is attached.'
    },

    // Export Options
    EXPORT_FORMATS: [
        'CSV',
        'Excel',
        'PDF'
    ],

    // Dashboard Refresh Intervals (in milliseconds)
    REFRESH_INTERVALS: {
        DASHBOARD: 30000, // 30 seconds
        NOTIFICATIONS: 60000, // 1 minute
        ACTIVITY: 120000 // 2 minutes
    },

    // Validation Rules
    VALIDATION: {
        CUSTOMER_ID_LENGTH: 6,
        MOBILE_LENGTH: 10,
        GST_LENGTH: 15,
        MAX_DESCRIPTION_LENGTH: 500,
        MAX_COMMENTS_LENGTH: 1000,
        MIN_PASSWORD_LENGTH: 6
    },

    // Default Values
    DEFAULTS: {
        WARRANTY_PERIOD: 0,
        LOCATION: 'Semmancheri',
        CURRENCY: '₹',
        DISCOUNT_VALUE: 0,
        ADVANCE_AMOUNT: 0
    },

    // UI Constants
    UI: {
        MAX_LINES_PER_MODULE: 600,
        SIDEBAR_WIDTH: '250px',
        HEADER_HEIGHT: '60px',
        TOAST_DURATION: 3000,
        DEBOUNCE_DELAY: 300
    },

    // Module Names (for permissions)
    MODULES: {
        DASHBOARD: 'dashboard',
        CUSTOMERS: 'customers',
        INVENTORY: 'inventory',
        SALES: 'sales',
        SERVICE: 'service',
        INVOICES: 'invoices',
        EXPENSE: 'expense',
        LEDGER: 'ledger',
        USERS: 'users'
    },

    // Actions (for permissions)
    ACTIONS: {
        CREATE: 'create',
        READ: 'read',
        UPDATE: 'update',
        DELETE: 'delete'
    },

    // Special Permissions
    SPECIAL_PERMISSIONS: {
        MANAGE_USERS: 'manage_users',
        CLOSE_BUSINESS: 'close_business',
        VIEW_AUDIT: 'view_audit',
        EXPORT_DATA: 'export_data'
    }
};