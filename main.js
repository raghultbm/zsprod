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