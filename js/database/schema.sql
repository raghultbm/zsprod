-- ZEDSON WATCHCRAFT - Database Schema Definition
-- js/database/schema.sql

-- =====================================================
-- TABLE DEFINITIONS
-- =====================================================

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
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
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
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
);

-- Inventory/Watches table
CREATE TABLE IF NOT EXISTS inventory (
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
);

-- Inventory movement history
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    movement_date DATE NOT NULL,
    from_outlet TEXT,
    to_outlet TEXT NOT NULL,
    reason TEXT DEFAULT 'Stock Transfer',
    moved_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
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
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
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
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
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
    invoice_data TEXT, -- JSON data for invoice details
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Action logs table for audit trail
CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    user_role TEXT,
    action TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    details TEXT, -- JSON data
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Database version table for migrations
CREATE TABLE IF NOT EXISTS db_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(code);
CREATE INDEX IF NOT EXISTS idx_inventory_brand ON inventory(brand);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory(type);
CREATE INDEX IF NOT EXISTS idx_inventory_outlet ON inventory(outlet);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_inventory ON sales(inventory_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_date ON services(service_date);
CREATE INDEX IF NOT EXISTS idx_services_brand ON services(brand);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_no ON invoices(invoice_no);

-- Action logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_username ON action_logs(username);
CREATE INDEX IF NOT EXISTS idx_logs_category ON action_logs(category);
CREATE INDEX IF NOT EXISTS idx_logs_created ON action_logs(created_at);

-- Movement history indexes
CREATE INDEX IF NOT EXISTS idx_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON inventory_movements(movement_date);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamps trigger for customers
CREATE TRIGGER IF NOT EXISTS update_customers_timestamp 
    AFTER UPDATE ON customers
BEGIN
    UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for inventory
CREATE TRIGGER IF NOT EXISTS update_inventory_timestamp 
    AFTER UPDATE ON inventory
BEGIN
    UPDATE inventory SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for services
CREATE TRIGGER IF NOT EXISTS update_services_timestamp 
    AFTER UPDATE ON services
BEGIN
    UPDATE services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for expenses
CREATE TRIGGER IF NOT EXISTS update_expenses_timestamp 
    AFTER UPDATE ON expenses
BEGIN
    UPDATE expenses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-update customer net value when sales change
CREATE TRIGGER IF NOT EXISTS update_customer_net_value_on_sale_insert
    AFTER INSERT ON sales
BEGIN
    UPDATE customers 
    SET net_value = (
        SELECT COALESCE(SUM(s.total_amount), 0) + COALESCE(SUM(sv.cost), 0)
        FROM sales s
        LEFT JOIN services sv ON sv.customer_id = s.customer_id AND sv.status = 'completed'
        WHERE s.customer_id = NEW.customer_id
    ),
    purchases = purchases + 1
    WHERE id = NEW.customer_id;
END;

-- Auto-update customer net value when sales are deleted
CREATE TRIGGER IF NOT EXISTS update_customer_net_value_on_sale_delete
    AFTER DELETE ON sales
BEGIN
    UPDATE customers 
    SET net_value = (
        SELECT COALESCE(SUM(s.total_amount), 0) + COALESCE(SUM(sv.cost), 0)
        FROM sales s
        LEFT JOIN services sv ON sv.customer_id = s.customer_id AND sv.status = 'completed'
        WHERE s.customer_id = OLD.customer_id
    ),
    purchases = CASE WHEN purchases > 0 THEN purchases - 1 ELSE 0 END
    WHERE id = OLD.customer_id;
END;

-- Auto-update customer net value when services complete
CREATE TRIGGER IF NOT EXISTS update_customer_net_value_on_service_complete
    AFTER UPDATE ON services
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    UPDATE customers 
    SET net_value = (
        SELECT COALESCE(SUM(s.total_amount), 0) + COALESCE(SUM(sv.cost), 0)
        FROM sales s
        LEFT JOIN services sv ON sv.customer_id = s.customer_id AND sv.status = 'completed'
        WHERE s.customer_id = NEW.customer_id
    ),
    service_count = service_count + 1
    WHERE id = NEW.customer_id;
END;

-- Auto-update inventory status based on quantity
CREATE TRIGGER IF NOT EXISTS update_inventory_status_on_quantity_change
    AFTER UPDATE ON inventory
    WHEN NEW.quantity != OLD.quantity
BEGIN
    UPDATE inventory 
    SET status = CASE 
        WHEN NEW.quantity > 0 THEN 'available'
        ELSE 'sold'
    END
    WHERE id = NEW.id;
END;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Customer summary view
CREATE VIEW IF NOT EXISTS customer_summary AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.purchases,
    c.service_count,
    c.net_value,
    c.created_at,
    COALESCE(SUM(s.total_amount), 0) as total_sales,
    COALESCE(SUM(CASE WHEN sv.status = 'completed' THEN sv.cost ELSE 0 END), 0) as total_services,
    COUNT(s.id) as actual_purchases,
    COUNT(sv.id) as actual_services
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id
LEFT JOIN services sv ON c.id = sv.customer_id
GROUP BY c.id, c.name, c.email, c.phone, c.address, c.purchases, c.service_count, c.net_value, c.created_at;

-- Inventory summary view
CREATE VIEW IF NOT EXISTS inventory_summary AS
SELECT 
    i.id,
    i.code,
    i.type,
    i.brand,
    i.model,
    i.size,
    i.price,
    i.quantity,
    i.outlet,
    i.status,
    i.created_at,
    COALESCE(SUM(s.quantity), 0) as total_sold,
    COALESCE(SUM(s.total_amount), 0) as total_revenue
FROM inventory i
LEFT JOIN sales s ON i.id = s.inventory_id
GROUP BY i.id, i.code, i.type, i.brand, i.model, i.size, i.price, i.quantity, i.outlet, i.status, i.created_at;

-- Sales summary view
CREATE VIEW IF NOT EXISTS sales_summary AS
SELECT 
    s.id,
    s.sale_date,
    s.sale_time,
    c.name as customer_name,
    c.phone as customer_phone,
    i.code as item_code,
    i.brand || ' ' || i.model as item_name,
    s.quantity,
    s.price,
    s.discount_amount,
    s.total_amount,
    s.payment_method,
    s.created_at,
    s.created_by
FROM sales s
JOIN customers c ON s.customer_id = c.id
JOIN inventory i ON s.inventory_id = i.id;

-- Service summary view
CREATE VIEW IF NOT EXISTS service_summary AS
SELECT 
    sv.id,
    sv.service_date,
    sv.service_time,
    c.name as customer_name,
    c.phone as customer_phone,
    sv.watch_name,
    sv.brand,
    sv.model,
    sv.status,
    sv.cost,
    sv.warranty_period,
    sv.created_at,
    sv.completed_at,
    sv.created_by
FROM services sv
JOIN customers c ON sv.customer_id = c.id;

-- Revenue summary view
CREATE VIEW IF NOT EXISTS revenue_summary AS
SELECT 
    DATE(created_at) as revenue_date,
    'Sales' as revenue_type,
    SUM(total_amount) as amount,
    COUNT(*) as transaction_count
FROM sales
GROUP BY DATE(created_at)
UNION ALL
SELECT 
    DATE(completed_at) as revenue_date,
    'Services' as revenue_type,
    SUM(cost) as amount,
    COUNT(*) as transaction_count
FROM services
WHERE status = 'completed' AND completed_at IS NOT NULL
GROUP BY DATE(completed_at)
ORDER BY revenue_date DESC;

-- =====================================================
-- DEFAULT DATA INSERTION
-- =====================================================

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (
    username, password_hash, role, full_name, email, status, first_login
) VALUES (
    'admin', 
    'admin123_hashed', -- This will be properly hashed by the application
    'admin', 
    'System Administrator', 
    'admin@zedsonwatchcraft.com', 
    'active', 
    0
);

-- Insert sample customers
INSERT OR IGNORE INTO customers (
    name, email, phone, address, purchases, service_count, net_value
) VALUES 
(
    'Raj Kumar',
    'raj@email.com',
    '+91-9876543210',
    'Chennai, Tamil Nadu',
    0,
    0,
    0.00
),
(
    'Priya Sharma',
    'priya@email.com',
    '+91-9876543211',
    'Mumbai, Maharashtra',
    0,
    0,
    0.00
);

-- Insert sample inventory
INSERT OR IGNORE INTO inventory (
    code, type, brand, model, size, price, quantity, outlet, description, status
) VALUES 
(
    'ROL001',
    'Watch',
    'Rolex',
    'Submariner',
    '40mm',
    850000.00,
    2,
    'Semmancheri',
    'Luxury diving watch',
    'available'
),
(
    'OMG001',
    'Watch',
    'Omega',
    'Speedmaster',
    '42mm',
    450000.00,
    1,
    'Navalur',
    'Professional chronograph',
    'available'
),
(
    'CAS001',
    'Watch',
    'Casio',
    'G-Shock',
    '44mm',
    15000.00,
    5,
    'Padur',
    'Sports watch',
    'available'
);

-- Insert initial movement history for sample inventory
INSERT OR IGNORE INTO inventory_movements (
    inventory_id, movement_date, from_outlet, to_outlet, reason, moved_by
) VALUES 
(1, '2024-01-15', NULL, 'Semmancheri', 'Initial stock', 'admin'),
(2, '2024-01-10', NULL, 'Navalur', 'Initial stock', 'admin'),
(3, '2024-01-05', NULL, 'Padur', 'Initial stock', 'admin');

-- Insert database version
INSERT OR IGNORE INTO db_version (version, description) VALUES 
(1, 'Initial database schema with all tables, indexes, triggers, and views');

-- =====================================================
-- UTILITY FUNCTIONS (SQLite does not support stored procedures, 
-- but these can be implemented in JavaScript)
-- =====================================================

/*
-- Function to calculate customer net value (implemented in JS)
-- Function to get low stock items (implemented in JS)
-- Function to get revenue by date range (implemented in JS)
-- Function to backup database (implemented in JS)
-- Function to generate reports (implemented in JS)
*/