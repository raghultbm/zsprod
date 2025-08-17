// Database table schemas for ZEDSON Watchcraft
module.exports = {
    // Users table
    users: `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'owner', 'manager')),
            permissions TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Customers table
    customers: `
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id VARCHAR(10) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            mobile VARCHAR(15) NOT NULL,
            net_value DECIMAL(10,2) DEFAULT 0,
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Categories for inventory classification
    categories: `
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(50) NOT NULL,
            type VARCHAR(20) NOT NULL,
            config TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Inventory table
    inventory: `
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            category VARCHAR(50) NOT NULL,
            brand VARCHAR(50),
            gender VARCHAR(10),
            type VARCHAR(20),
            strap VARCHAR(20),
            material VARCHAR(20),
            size VARCHAR(10),
            particulars TEXT,
            amount DECIMAL(10,2) NOT NULL,
            warranty_period INTEGER DEFAULT 0,
            location VARCHAR(50) DEFAULT 'Semmancheri',
            comments TEXT,
            is_sold BOOLEAN DEFAULT 0,
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Inventory history for tracking changes
    inventory_history: `
        CREATE TABLE IF NOT EXISTS inventory_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_id INTEGER NOT NULL,
            field_name VARCHAR(50) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            comments TEXT,
            changed_by VARCHAR(50),
            changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_id) REFERENCES inventory(id)
        )
    `,

    // Sales table
    sales: `
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            sale_date DATE NOT NULL,
            inventory_ids TEXT NOT NULL,
            particulars TEXT,
            subtotal DECIMAL(10,2) NOT NULL,
            discount_type VARCHAR(20),
            discount_value DECIMAL(10,2) DEFAULT 0,
            discount_amount DECIMAL(10,2) DEFAULT 0,
            advance_amount DECIMAL(10,2) DEFAULT 0,
            balance_amount DECIMAL(10,2) DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL,
            payment_mode VARCHAR(50),
            invoice_number VARCHAR(50) UNIQUE,
            status VARCHAR(20) DEFAULT 'completed',
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `,

    // Services table
    services: `
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('new', 'instant')),
            service_date DATE NOT NULL,
            delivery_date DATE,
            category VARCHAR(50),
            brand VARCHAR(50),
            dial_colour VARCHAR(50),
            gender VARCHAR(10),
            movement_no VARCHAR(50),
            case_material VARCHAR(50),
            strap VARCHAR(50),
            particulars TEXT,
            issue_type VARCHAR(50),
            advance_amount DECIMAL(10,2) DEFAULT 0,
            balance_amount DECIMAL(10,2) DEFAULT 0,
            amount DECIMAL(10,2) NOT NULL,
            payment_mode VARCHAR(50),
            warranty_period INTEGER DEFAULT 0,
            warranty_expiry DATE,
            inventory_used TEXT,
            image_path VARCHAR(255),
            acknowledgement_number VARCHAR(50),
            invoice_number VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Yet to Start',
            location VARCHAR(50) DEFAULT 'Semmancheri',
            comments TEXT,
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `,

    // Service history for status tracking
    service_history: `
        CREATE TABLE IF NOT EXISTS service_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER NOT NULL,
            field_name VARCHAR(50) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            comments TEXT,
            changed_by VARCHAR(50),
            changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_id) REFERENCES services(id)
        )
    `,

    // Invoices table (unified for sales and services)
    invoices: `
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('sale', 'service')),
            reference_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            date DATE NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            is_sent BOOLEAN DEFAULT 0,
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `,

    // Expenses table
    expenses: `
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            description TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_mode VARCHAR(50),
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Ledger table for daily summaries
    ledger: `
        CREATE TABLE IF NOT EXISTS ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE UNIQUE NOT NULL,
            sales_amount DECIMAL(10,2) DEFAULT 0,
            service_amount DECIMAL(10,2) DEFAULT 0,
            expense_amount DECIMAL(10,2) DEFAULT 0,
            net_amount DECIMAL(10,2) DEFAULT 0,
            is_closed BOOLEAN DEFAULT 0,
            closed_by VARCHAR(50),
            closed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Audit log table for tracking all operations
    audit_log: `
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action VARCHAR(50) NOT NULL,
            table_name VARCHAR(50) NOT NULL,
            record_id INTEGER,
            details TEXT,
            user_name VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Sequences table for auto-generated numbers
    sequences: `
        CREATE TABLE IF NOT EXISTS sequences (
            name VARCHAR(50) PRIMARY KEY,
            current_value INTEGER NOT NULL DEFAULT 0,
            prefix VARCHAR(10),
            suffix VARCHAR(10),
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `
};