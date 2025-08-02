const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

// Initialize database with proper configuration
function initDatabase() {
  db = new sqlite3.Database('./watchshop.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
      // Enable WAL mode for better concurrency
      db.run('PRAGMA journal_mode = WAL;');
      db.run('PRAGMA synchronous = NORMAL;');
      db.run('PRAGMA cache_size = 1000;');
      db.run('PRAGMA temp_store = MEMORY;');
      db.run('PRAGMA busy_timeout = 30000;'); // 30 second timeout
    }
  });
  
  // Create/migrate tables
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'staff')),
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    )`);

    // Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sales tables
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_date DATE NOT NULL,
      customer_id INTEGER,
      subtotal DECIMAL(10,2) NOT NULL,
      total_discount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      sale_status TEXT DEFAULT 'completed' CHECK(sale_status IN ('completed', 'cancelled', 'refunded')),
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      inventory_id INTEGER NOT NULL,
      item_code TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      discount_type TEXT CHECK(discount_type IN ('percentage', 'amount', 'none')),
      discount_value DECIMAL(10,2) DEFAULT 0,
      line_total DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sale_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('upi', 'card', 'cash')),
      amount DECIMAL(10,2) NOT NULL,
      payment_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )`);

    // Service Jobs table
    db.run(`CREATE TABLE IF NOT EXISTS service_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      estimated_cost DECIMAL(10,2),
      advance_amount DECIMAL(10,2) DEFAULT 0,
      advance_payment_method TEXT CHECK(advance_payment_method IN ('cash', 'upi', 'card')),
      advance_payment_reference TEXT,
      final_cost DECIMAL(10,2),
      final_payment_amount DECIMAL(10,2) DEFAULT 0,
      final_payment_method TEXT CHECK(final_payment_method IN ('cash', 'upi', 'card')),
      final_payment_reference TEXT,
      approximate_delivery_date DATE,
      actual_delivery_date DATE,
      location TEXT NOT NULL CHECK(location IN ('semmancheri', 'navalur', 'padur')),
      status TEXT DEFAULT 'yet_to_start' CHECK(status IN ('yet_to_start', 'in_service_center', 'service_completed', 'delivered', 'returned_to_customer', 'to_be_returned_to_customer')),
      comments TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Service Items table
    db.run(`CREATE TABLE IF NOT EXISTS service_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_job_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('watch', 'wallclock', 'timepiece')),
      brand TEXT,
      gender TEXT CHECK(gender IN ('gents', 'ladies') OR gender IS NULL),
      case_material TEXT CHECK(case_material IN ('steel', 'gold_tone', 'fiber', 'other') OR case_material IS NULL),
      strap_material TEXT CHECK(strap_material IN ('leather', 'fiber', 'steel', 'gold_plated') OR strap_material IS NULL),
      machine_change BOOLEAN,
      movement_no TEXT,
      issue_description TEXT NOT NULL,
      product_image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_job_id) REFERENCES service_jobs(id) ON DELETE CASCADE
    )`);

    // Service Status History table
    db.run(`CREATE TABLE IF NOT EXISTS service_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_job_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      location TEXT NOT NULL,
      comments TEXT,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_job_id) REFERENCES service_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )`);

    // Service Comments table
    db.run(`CREATE TABLE IF NOT EXISTS service_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_job_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      added_by INTEGER,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_job_id) REFERENCES service_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (added_by) REFERENCES users(id)
    )`);

    // NEW: Expenses table
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_date DATE NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi', 'card')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Check if inventory table exists and migrate it
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
      if (err) {
        console.error('Error checking inventory table:', err);
        return;
      }

      if (row) {
        // Table exists, check if it has the new schema
        db.all("PRAGMA table_info(inventory)", (err, columns) => {
          if (err) {
            console.error('Error getting table info:', err);
            return;
          }

          const columnNames = columns.map(col => col.name);
          const hasNewSchema = columnNames.includes('item_code') && 
                              columnNames.includes('date_added') && 
                              columnNames.includes('outlet');

          if (!hasNewSchema) {
            console.log('Migrating inventory table to new schema...');
            migrateInventoryTable();
          } else {
            console.log('Inventory table already has new schema');
          }
        });
      } else {
        // Table doesn't exist, create it with new schema
        console.log('Creating new inventory table...');
        createNewInventoryTable();
      }
    });

    // Create default admin user if not exists
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
      } else if (row && row.count === 0) {
        db.run(`INSERT INTO users (username, password, full_name, role, email) 
                VALUES ('admin', 'admin123', 'Administrator', 'admin', 'admin@watchshop.com')`, (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Default admin user created');
          }
        });
      }
    });
  });
}

function createNewInventoryTable() {
  db.run(`CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT UNIQUE NOT NULL,
    date_added DATE NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('watch', 'clock', 'timepiece', 'strap', 'battery')),
    brand TEXT,
    type TEXT,
    gender TEXT CHECK(gender IN ('gents', 'ladies') OR gender IS NULL),
    material TEXT CHECK(material IN ('leather', 'fiber', 'chain') OR material IS NULL),
    size_mm INTEGER,
    battery_code TEXT,
    quantity INTEGER DEFAULT 0,
    warranty_months INTEGER,
    price DECIMAL(10,2),
    outlet TEXT NOT NULL CHECK(outlet IN ('semmanchery', 'navalur', 'padur')),
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating inventory table:', err);
    } else {
      console.log('New inventory table created successfully');
    }
  });
}

function migrateInventoryTable() {
  db.serialize(() => {
    // Step 1: Rename old table
    db.run(`ALTER TABLE inventory RENAME TO inventory_old`, (err) => {
      if (err) {
        console.error('Error renaming old table:', err);
        return;
      }

      // Step 2: Create new table with updated schema
      db.run(`CREATE TABLE inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_code TEXT UNIQUE NOT NULL,
        date_added DATE NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('watch', 'clock', 'timepiece', 'strap', 'battery')),
        brand TEXT,
        type TEXT,
        gender TEXT CHECK(gender IN ('gents', 'ladies') OR gender IS NULL),
        material TEXT CHECK(material IN ('leather', 'fiber', 'chain') OR material IS NULL),
        size_mm INTEGER,
        battery_code TEXT,
        quantity INTEGER DEFAULT 0,
        warranty_months INTEGER,
        price DECIMAL(10,2),
        outlet TEXT NOT NULL CHECK(outlet IN ('semmanchery', 'navalur', 'padur')),
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating new inventory table:', err);
          return;
        }

        // Step 3: Check if old table has data to migrate
        db.get("SELECT COUNT(*) as count FROM inventory_old", (err, row) => {
          if (err) {
            console.error('Error checking old data:', err);
            // Drop old table even if we can't check data
            db.run("DROP TABLE IF EXISTS inventory_old");
            return;
          }

          if (row && row.count > 0) {
            // Step 4: Migrate existing data (if any)
            console.log(`Migrating ${row.count} existing inventory items...`);
            
            // Get column info from old table
            db.all("PRAGMA table_info(inventory_old)", (err, oldColumns) => {
              if (err) {
                console.error('Error getting old table info:', err);
                db.run("DROP TABLE IF EXISTS inventory_old");
                return;
              }

              const oldColumnNames = oldColumns.map(col => col.name);
              
              // Map old data to new structure
              db.all("SELECT * FROM inventory_old", (err, rows) => {
                if (err) {
                  console.error('Error reading old data:', err);
                  db.run("DROP TABLE IF EXISTS inventory_old");
                  return;
                }

                // Migrate each row
                let migrated = 0;
                rows.forEach((row, index) => {
                  // Create item_code from old data (use code or generate one)
                  const item_code = row.code || row.name?.replace(/\s+/g, '').substring(0, 10).toUpperCase() || `ITEM${row.id}`;
                  
                  // Map old category names to new ones
                  let category = 'watch'; // default
                  if (row.category) {
                    const oldCat = row.category.toLowerCase();
                    if (['watch'].includes(oldCat)) category = 'watch';
                    else if (['wallclock', 'clock'].includes(oldCat)) category = 'clock';
                    else if (['timepiece'].includes(oldCat)) category = 'timepiece';
                    else if (['strap'].includes(oldCat)) category = 'strap';
                    else if (['battery'].includes(oldCat)) category = 'battery';
                  }

                  // Use existing data or defaults
                  const date_added = row.created_at ? row.created_at.split(' ')[0] : new Date().toISOString().split('T')[0];
                  const outlet = 'semmanchery'; // default outlet
                  const warranty_months = row.warranty_period ? parseInt(row.warranty_period) : null;

                  db.run(`INSERT INTO inventory (
                    item_code, date_added, category, brand, type, gender, 
                    material, size_mm, battery_code, quantity, warranty_months, 
                    price, outlet, comments, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    `${item_code}_${index}`, // Make unique
                    date_added,
                    category,
                    row.brand || null,
                    null, // type
                    null, // gender  
                    null, // material
                    null, // size_mm
                    null, // battery_code
                    row.quantity || 0,
                    warranty_months,
                    row.selling_price || row.price || null,
                    outlet,
                    row.description || row.comments || null,
                    row.created_at || new Date().toISOString(),
                    row.updated_at || new Date().toISOString()
                  ], (err) => {
                    if (err) {
                      console.error(`Error migrating item ${index}:`, err);
                    } else {
                      migrated++;
                    }

                    // If this is the last item, clean up
                    if (index === rows.length - 1) {
                      console.log(`Successfully migrated ${migrated} items`);
                      // Drop old table
                      db.run("DROP TABLE inventory_old", (err) => {
                        if (err) {
                          console.error('Error dropping old table:', err);
                        } else {
                          console.log('Migration completed successfully');
                        }
                      });
                    }
                  });
                });
              });
            });
          } else {
            // No data to migrate, just drop old table
            console.log('No data to migrate, dropping old table...');
            db.run("DROP TABLE inventory_old", (err) => {
              if (err) {
                console.error('Error dropping old table:', err);
              } else {
                console.log('Migration completed - no data to migrate');
              }
            });
          }
        });
      });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add your icon
    show: false
  });

  mainWindow.loadFile('src/login.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Helper function to run database queries with retry logic
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const maxRetries = 3;
    let retries = 0;

    function attemptQuery() {
      db.run(sql, params, function(err) {
        if (err) {
          if (err.code === 'SQLITE_BUSY' && retries < maxRetries) {
            retries++;
            console.log(`Database busy, retrying... (${retries}/${maxRetries})`);
            setTimeout(attemptQuery, 100 * retries); // Exponential backoff
          } else {
            console.error('Database error:', err);
            reject(err);
          }
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    }

    attemptQuery();
  });
}

// Helper function to get data with retry logic
function getData(sql, params = []) {
  return new Promise((resolve, reject) => {
    const maxRetries = 3;
    let retries = 0;

    function attemptQuery() {
      db.all(sql, params, (err, rows) => {
        if (err) {
          if (err.code === 'SQLITE_BUSY' && retries < maxRetries) {
            retries++;
            console.log(`Database busy, retrying... (${retries}/${maxRetries})`);
            setTimeout(attemptQuery, 100 * retries);
          } else {
            console.error('Database error:', err);
            reject(err);
          }
        } else {
          resolve(rows);
        }
      });
    }

    attemptQuery();
  });
}

// Helper function to get single row with retry logic
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    const maxRetries = 3;
    let retries = 0;

    function attemptQuery() {
      db.get(sql, params, (err, row) => {
        if (err) {
          if (err.code === 'SQLITE_BUSY' && retries < maxRetries) {
            retries++;
            console.log(`Database busy, retrying... (${retries}/${maxRetries})`);
            setTimeout(attemptQuery, 100 * retries);
          } else {
            console.error('Database error:', err);
            reject(err);
          }
        } else {
          resolve(row);
        }
      });
    }

    attemptQuery();
  });
}

// Generate unique job number for service jobs
function generateJobNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  return `SRV${year}${month}${timestamp}`;
}

// IPC handlers with improved error handling
ipcMain.handle('login', async (event, { username, password }) => {
  try {
    const row = await getRow(
      "SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1",
      [username, password]
    );
    
    if (row) {
      return { 
        success: true, 
        user: { 
          id: row.id, 
          username: row.username, 
          full_name: row.full_name, 
          role: row.role 
        } 
      };
    } else {
      return { success: false, message: 'Invalid credentials' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Login failed. Please try again.' };
  }
});

ipcMain.handle('get-customers', async () => {
  try {
    return await getData("SELECT * FROM customers ORDER BY created_at DESC");
  } catch (error) {
    console.error('Get customers error:', error);
    throw error;
  }
});

ipcMain.handle('add-customer', async (event, customer) => {
  try {
    const { name, phone, email } = customer;
    const result = await runQuery(
      "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
      [name, phone, email]
    );
    return { id: result.id, ...customer };
  } catch (error) {
    console.error('Add customer error:', error);
    throw error;
  }
});

ipcMain.handle('update-customer', async (event, customer) => {
  try {
    const { id, name, phone, email } = customer;
    await runQuery(
      "UPDATE customers SET name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, phone, email, id]
    );
    return customer;
  } catch (error) {
    console.error('Update customer error:', error);
    throw error;
  }
});

ipcMain.handle('delete-customer', async (event, id) => {
  try {
    await runQuery("DELETE FROM customers WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    console.error('Delete customer error:', error);
    throw error;
  }
});

ipcMain.handle('get-users', async () => {
  try {
    return await getData("SELECT id, username, full_name, role, email, phone, created_at, is_active FROM users ORDER BY created_at DESC");
  } catch (error) {
    console.error('Get users error:', error);
    throw error;
  }
});

ipcMain.handle('add-user', async (event, user) => {
  try {
    const { username, password, full_name, role, email, phone } = user;
    const result = await runQuery(
      "INSERT INTO users (username, password, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
      [username, password, full_name, role, email, phone]
    );
    return { id: result.id, username, full_name, role, email, phone, is_active: 1 };
  } catch (error) {
    console.error('Add user error:', error);
    throw error;
  }
});

ipcMain.handle('update-user', async (event, user) => {
  try {
    const { id, username, full_name, role, email, phone, is_active } = user;
    await runQuery(
      "UPDATE users SET username = ?, full_name = ?, role = ?, email = ?, phone = ?, is_active = ? WHERE id = ?",
      [username, full_name, role, email, phone, is_active, id]
    );
    return user;
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
});

ipcMain.handle('delete-user', async (event, id) => {
  try {
    await runQuery("DELETE FROM users WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
});

// Updated Inventory IPC handlers
ipcMain.handle('get-inventory', async () => {
  try {
    return await getData("SELECT * FROM inventory ORDER BY created_at DESC");
  } catch (error) {
    console.error('Get inventory error:', error);
    throw error;
  }
});

ipcMain.handle('add-inventory-item', async (event, item) => {
  try {
    const { 
      item_code, date_added, category, brand, type, gender, 
      material, size_mm, battery_code, quantity, warranty_months, 
      price, outlet, comments 
    } = item;
    
    const result = await runQuery(
      `INSERT INTO inventory (
        item_code, date_added, category, brand, type, gender, 
        material, size_mm, battery_code, quantity, warranty_months, 
        price, outlet, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item_code, date_added, category, brand, type, gender,
        material, size_mm, battery_code, quantity, warranty_months,
        price, outlet, comments
      ]
    );
    
    return { id: result.id, ...item };
  } catch (error) {
    console.error('Add inventory item error:', error);
    throw error;
  }
});

ipcMain.handle('update-inventory-item', async (event, item) => {
  try {
    const { 
      id, item_code, date_added, category, brand, type, gender,
      material, size_mm, battery_code, quantity, warranty_months,
      price, outlet, comments
    } = item;
    
    await runQuery(
      `UPDATE inventory SET 
        item_code = ?, date_added = ?, category = ?, brand = ?, type = ?, 
        gender = ?, material = ?, size_mm = ?, battery_code = ?, quantity = ?, 
        warranty_months = ?, price = ?, outlet = ?, comments = ?, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        item_code, date_added, category, brand, type, gender,
        material, size_mm, battery_code, quantity, warranty_months,
        price, outlet, comments, id
      ]
    );
    
    return item;
  } catch (error) {
    console.error('Update inventory item error:', error);
    throw error;
  }
});

ipcMain.handle('delete-inventory-item', async (event, id) => {
  try {
    await runQuery("DELETE FROM inventory WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    console.error('Delete inventory item error:', error);
    throw error;
  }
});

ipcMain.handle('search-inventory', async (event, searchTerm) => {
  try {
    const term = `%${searchTerm}%`;
    return await getData(
      `SELECT * FROM inventory WHERE 
       item_code LIKE ? OR brand LIKE ? OR battery_code LIKE ? OR comments LIKE ?
       ORDER BY date_added DESC`,
      [term, term, term, term]
    );
  } catch (error) {
    console.error('Search inventory error:', error);
    throw error;
  }
});

// Sales IPC handlers
ipcMain.handle('get-sales', async () => {
  try {
    return await getData(`
      SELECT s.*, c.name as customer_name, u.full_name as created_by_name,
             COUNT(si.id) as items
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
  } catch (error) {
    console.error('Get sales error:', error);
    throw error;
  }
});

ipcMain.handle('search-customers', async (event, searchTerm) => {
  try {
    const term = `%${searchTerm}%`;
    return await getData(
      "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name LIMIT 10",
      [term, term]
    );
  } catch (error) {
    console.error('Search customers error:', error);
    throw error;
  }
});

ipcMain.handle('search-inventory-for-sale', async (event, searchTerm) => {
  try {
    const term = `%${searchTerm}%`;
    return await getData(
      `SELECT * FROM inventory 
       WHERE (item_code LIKE ? OR brand LIKE ? OR comments LIKE ?) 
       AND quantity > 0 
       ORDER BY item_code LIMIT 20`,
      [term, term, term]
    );
  } catch (error) {
    console.error('Search inventory for sale error:', error);
    throw error;
  }
});

ipcMain.handle('get-inventory-by-code', async (event, itemCode) => {
  try {
    return await getRow(
      "SELECT * FROM inventory WHERE item_code = ? AND quantity > 0",
      [itemCode]
    );
  } catch (error) {
    console.error('Get inventory by code error:', error);
    throw error;
  }
});

ipcMain.handle('create-sale', async (event, saleData) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        const { sale, items, payments } = saleData;

        // Insert main sale record
        db.run(`INSERT INTO sales (
          sale_date, customer_id, subtotal, total_discount, total_amount, 
          notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          sale.sale_date,
          sale.customer_id || null,
          sale.subtotal,
          sale.total_discount,
          sale.total_amount,
          sale.notes || null,
          sale.created_by
        ], function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          const saleId = this.lastID;
          let itemsProcessed = 0;
          let paymentsProcessed = 0;
          const totalItems = items.length;
          const totalPayments = payments.length;

          // Insert sale items
          items.forEach((item, index) => {
            db.run(`INSERT INTO sale_items (
              sale_id, inventory_id, item_code, item_name, quantity, 
              unit_price, discount_type, discount_value, line_total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
              saleId,
              item.inventory_id,
              item.item_code,
              item.item_name,
              item.quantity,
              item.unit_price,
              item.discount_type,
              item.discount_value,
              item.line_total
            ], (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              // Update inventory quantity
              db.run(
                "UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [item.quantity, item.inventory_id],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }

                  itemsProcessed++;
                  checkCompletion();
                }
              );
            });
          });

          // Insert payments
          payments.forEach((payment) => {
            db.run(`INSERT INTO sale_payments (
              sale_id, payment_method, amount, payment_reference
            ) VALUES (?, ?, ?, ?)`, [
              saleId,
              payment.payment_method,
              payment.amount,
              payment.payment_reference || null
            ], (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              paymentsProcessed++;
              checkCompletion();
            });
          });

          function checkCompletion() {
            if (itemsProcessed === totalItems && paymentsProcessed === totalPayments) {
              db.run('COMMIT', (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve({ id: saleId, success: true });
                }
              });
            }
          }
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
});

ipcMain.handle('get-sale-details', async (event, saleId) => {
  try {
    const sale = await getRow(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [saleId]);

    const items = await getData(`
      SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id
    `, [saleId]);

    const payments = await getData(`
      SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY id
    `, [saleId]);

    return { sale, items, payments };
  } catch (error) {
    console.error('Get sale details error:', error);
    throw error;
  }
});

// Service IPC handlers
ipcMain.handle('get-service-jobs', async () => {
  try {
    return await getData(`
      SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
             COUNT(si.id) as items_count
      FROM service_jobs sj
      LEFT JOIN customers c ON sj.customer_id = c.id
      LEFT JOIN users u ON sj.created_by = u.id
      LEFT JOIN service_items si ON sj.id = si.service_job_id
      GROUP BY sj.id
      ORDER BY sj.created_at DESC
    `);
  } catch (error) {
    console.error('Get service jobs error:', error);
    throw error;
  }
});

ipcMain.handle('create-service-job', async (event, serviceData) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        const { job, items, productImages } = serviceData;
        const jobNumber = generateJobNumber();

        // Insert main service job record
        db.run(`INSERT INTO service_jobs (
          job_number, customer_id, estimated_cost, advance_amount, advance_payment_method,
          advance_payment_reference, approximate_delivery_date, location, status, comments, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          jobNumber,
          job.customer_id || null,
          job.estimated_cost,
          job.advance_amount,
          job.advance_payment_method || null,
          job.advance_payment_reference || null,
          job.approximate_delivery_date,
          job.location,
          'yet_to_start',
          job.comments || null,
          job.created_by
        ], function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          const serviceJobId = this.lastID;
          let itemsProcessed = 0;
          const totalItems = items.length;

          // Insert service items
          items.forEach((item, index) => {
            db.run(`INSERT INTO service_items (
              service_job_id, category, brand, gender, case_material, strap_material,
              machine_change, movement_no, issue_description, product_image_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
              serviceJobId,
              item.category,
              item.brand || null,
              item.gender || null,
              item.case_material || null,
              item.strap_material || null,
              item.machine_change || null,
              item.movement_no || null,
              item.issue_description,
              item.product_image_path || null
            ], (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              itemsProcessed++;
              
              if (itemsProcessed === totalItems) {
                // Insert initial status history
                db.run(`INSERT INTO service_status_history (
                  service_job_id, status, location, comments, changed_by
                ) VALUES (?, ?, ?, ?, ?)`, [
                  serviceJobId,
                  'yet_to_start',
                  job.location,
                  'Service job created',
                  job.created_by
                ], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                  } else {
                    db.run('COMMIT', (err) => {
                      if (err) {
                        reject(err);
                      } else {
                        resolve({ id: serviceJobId, job_number: jobNumber, success: true });
                      }
                    });
                  }
                });
              }
            });
          });
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
});

ipcMain.handle('get-service-job-details', async (event, jobId) => {
  try {
    const job = await getRow(`
      SELECT sj.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM service_jobs sj
      LEFT JOIN customers c ON sj.customer_id = c.id
      WHERE sj.id = ?
    `, [jobId]);

    const items = await getData(`
      SELECT * FROM service_items WHERE service_job_id = ? ORDER BY id
    `, [jobId]);

    const statusHistory = await getData(`
      SELECT ssh.*, u.full_name as changed_by_name
      FROM service_status_history ssh
      LEFT JOIN users u ON ssh.changed_by = u.id
      WHERE ssh.service_job_id = ?
      ORDER BY ssh.changed_at DESC
    `, [jobId]);

    const comments = await getData(`
      SELECT sc.*, u.full_name as added_by_name
      FROM service_comments sc
      LEFT JOIN users u ON sc.added_by = u.id
      WHERE sc.service_job_id = ?
      ORDER BY sc.added_at DESC
    `, [jobId]);

    return { job, items, statusHistory, comments };
  } catch (error) {
    console.error('Get service job details error:', error);
    throw error;
  }
});

ipcMain.handle('update-service-status', async (event, { jobId, status, location, comments, changedBy }) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Update main job status
      db.run(`UPDATE service_jobs SET status = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
        [status, location, jobId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
          return;
        }

        // Insert status history
        db.run(`INSERT INTO service_status_history (
          service_job_id, status, location, comments, changed_by
        ) VALUES (?, ?, ?, ?, ?)`, [
          jobId, status, location, comments, changedBy
        ], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            db.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve({ success: true });
              }
            });
          }
        });
      });
    });
  });
});

ipcMain.handle('add-service-comment', async (event, { jobId, comment, addedBy }) => {
  try {
    await runQuery(`INSERT INTO service_comments (service_job_id, comment, added_by) VALUES (?, ?, ?)`, 
      [jobId, comment, addedBy]);
    return { success: true };
  } catch (error) {
    console.error('Add service comment error:', error);
    throw error;
  }
});

ipcMain.handle('complete-service', async (event, { jobId, finalCost, finalPaymentAmount, finalPaymentMethod, finalPaymentReference, actualDeliveryDate, completedBy }) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Update job with final details
      db.run(`UPDATE service_jobs SET 
        final_cost = ?, final_payment_amount = ?, final_payment_method = ?, 
        final_payment_reference = ?, actual_delivery_date = ?, status = 'service_completed',
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`, [
        finalCost, finalPaymentAmount, finalPaymentMethod, finalPaymentReference, 
        actualDeliveryDate, jobId
      ], (err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
          return;
        }

        // Insert status history
        db.run(`INSERT INTO service_status_history (
          service_job_id, status, location, comments, changed_by
        ) VALUES (?, ?, ?, ?, ?)`, [
          jobId, 'service_completed', 'semmancheri', 'Service completed', completedBy
        ], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            db.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve({ success: true });
              }
            });
          }
        });
      });
    });
  });
});

ipcMain.handle('search-service-jobs', async (event, searchTerm) => {
  try {
    const term = `%${searchTerm}%`;
    return await getData(`
      SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name
      FROM service_jobs sj
      LEFT JOIN customers c ON sj.customer_id = c.id
      LEFT JOIN users u ON sj.created_by = u.id
      WHERE sj.job_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?
      ORDER BY sj.created_at DESC
    `, [term, term, term]);
  } catch (error) {
    console.error('Search service jobs error:', error);
    throw error;
  }
});

// NEW: Expenses IPC handlers
ipcMain.handle('get-expenses', async () => {
  try {
    return await getData(`
      SELECT e.*, u.full_name as created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      ORDER BY e.expense_date DESC, e.created_at DESC
    `);
  } catch (error) {
    console.error('Get expenses error:', error);
    throw error;
  }
});

ipcMain.handle('add-expense', async (event, expense) => {
  try {
    const { expense_date, description, amount, payment_mode, created_by } = expense;
    const result = await runQuery(
      "INSERT INTO expenses (expense_date, description, amount, payment_mode, created_by) VALUES (?, ?, ?, ?, ?)",
      [expense_date, description, amount, payment_mode, created_by]
    );
    return { id: result.id, ...expense };
  } catch (error) {
    console.error('Add expense error:', error);
    throw error;
  }
});

ipcMain.handle('update-expense', async (event, expense) => {
  try {
    const { id, expense_date, description, amount, payment_mode } = expense;
    await runQuery(
      "UPDATE expenses SET expense_date = ?, description = ?, amount = ?, payment_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [expense_date, description, amount, payment_mode, id]
    );
    return expense;
  } catch (error) {
    console.error('Update expense error:', error);
    throw error;
  }
});

ipcMain.handle('delete-expense', async (event, id) => {
  try {
    await runQuery("DELETE FROM expenses WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    console.error('Delete expense error:', error);
    throw error;
  }
});

ipcMain.handle('search-expenses', async (event, searchTerm) => {
  try {
    const term = `%${searchTerm}%`;
    return await getData(`
      SELECT e.*, u.full_name as created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.description LIKE ? OR e.payment_mode LIKE ?
      ORDER BY e.expense_date DESC, e.created_at DESC
    `, [term, term]);
  } catch (error) {
    console.error('Search expenses error:', error);
    throw error;
  }
});

// NEW: Get all invoices (sales + service)
ipcMain.handle('get-all-invoices', async () => {
  try {
    // Get sales invoices
    const salesInvoices = await getData(`
      SELECT 
        'sale' as type,
        s.id,
        s.sale_date as date,
        s.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        s.total_amount as amount,
        s.created_at,
        'INV-S-' || s.id as invoice_number
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.sale_status = 'completed'
      ORDER BY s.created_at DESC
    `);

    // Get service invoices (only completed services)
    const serviceInvoices = await getData(`
      SELECT 
        'service' as type,
        sj.id,
        sj.actual_delivery_date as date,
        sj.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        sj.final_cost as amount,
        sj.created_at,
        'INV-SRV-' || sj.id as invoice_number,
        sj.job_number
      FROM service_jobs sj
      LEFT JOIN customers c ON sj.customer_id = c.id
      WHERE sj.status = 'service_completed' OR sj.status = 'delivered'
      ORDER BY sj.created_at DESC
    `);

    // Combine and sort by date
    const allInvoices = [...salesInvoices, ...serviceInvoices].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return allInvoices;
  } catch (error) {
    console.error('Get all invoices error:', error);
    throw error;
  }
});

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
});