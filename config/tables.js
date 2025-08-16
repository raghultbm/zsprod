// Database table schemas for ZEDSON Watchcraft
window.Tables = {
    // Users table
    users: `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'owner', 'manager')),
        is_active INTEGER DEFAULT 1,
        permissions TEXT DEFAULT '{}',
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at DATETIME
    )`,

    // Customers table
    customers: `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        email TEXT,
        address TEXT,
        creation_date DATE NOT NULL,
        net_value DECIMAL(10,2) DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at DATETIME
    )`,

    // Inventory table
    inventory: `CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        date DATE NOT NULL,
        category TEXT NOT NULL,
        brand TEXT,
        gender TEXT,
        type TEXT,
        strap_material TEXT,
        material TEXT,
        size TEXT,
        amount DECIMAL(10,2) NOT NULL,
        warranty_period INTEGER DEFAULT 0,
        location TEXT DEFAULT 'Semmancheri',
        comments TEXT,
        is_sold INTEGER DEFAULT 0,
        sold_date DATE,
        ageing_days INTEGER DEFAULT 0,
        particulars TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at DATETIME
    )`,

    // Sales table
    sales: `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        sale_date DATE NOT NULL,
        invoice_number TEXT UNIQUE NOT NULL,
        items TEXT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount_type TEXT,
        discount_value DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        advance_amount DECIMAL(10,2) DEFAULT 0,
        balance_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_modes TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at DATETIME,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )`,

    // Services table
    services: `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        service_date DATE NOT NULL,
        delivery_date DATE,
        acknowledgement_number TEXT UNIQUE,
        invoice_number TEXT UNIQUE,
        category TEXT NOT NULL,
        brand TEXT,
        dial_colour TEXT,
        gender TEXT,
        movement_no TEXT,
        case_material TEXT,
        strap TEXT,
        particulars TEXT,
        issue_type TEXT,
        advance_amount DECIMAL(10,2) DEFAULT 0,
        balance_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_modes TEXT,
        warranty_period INTEGER DEFAULT 0,
        warranty_expiry_date DATE,
        image_path TEXT,
        inventory_used TEXT,
        status TEXT DEFAULT 'Yet to Start',
        location TEXT DEFAULT 'Semmancheri',
        service_type TEXT NOT NULL CHECK (service_type IN ('new', 'instant')),
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at DATETIME,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )`,

    // Invoices table (consolidated for both sales and services)
    invoices: `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        invoice_type TEXT NOT NULL CHECK (invoice_type IN ('sale', 'service')),
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_mobile TEXT NOT NULL,
        invoice_date DATE NOT NULL,
        items TEXT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_modes TEXT NOT NULL,
        reference_id INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )`,

    // Expenses table
    expenses: `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_mode TEXT NOT NULL,
        category TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at DATETIME
    )`,

    // Ledger table (daily summary)
    ledger: `CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE NOT NULL,
        sales_count INTEGER DEFAULT 0,
        sales_amount DECIMAL(10,2) DEFAULT 0,
        service_count INTEGER DEFAULT 0,
        service_amount DECIMAL(10,2) DEFAULT 0,
        total_revenue DECIMAL(10,2) DEFAULT 0,
        total_expenses DECIMAL(10,2) DEFAULT 0,
        net_amount DECIMAL(10,2) DEFAULT 0,
        is_closed INTEGER DEFAULT 0,
        closed_by TEXT,
        closed_at DATETIME,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at DATETIME
    )`,

    // Audit log table
    audit_log: `CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_values TEXT,
        new_values TEXT,
        user_name TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Brands table (for autocomplete)
    brands: `CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // History table (for inventory and service updates)
    history: `CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        comments TEXT,
        updated_by TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
};