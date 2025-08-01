const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

// Initialize database
function initDatabase() {
  db = new sqlite3.Database('./watchshop.db');
  
  // Create tables
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

    // Inventory table
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('watch', 'wallclock', 'timepiece', 'strap', 'chain', 'battery', 'other')),
      brand TEXT,
      model TEXT,
      description TEXT,
      cost_price DECIMAL(10,2),
      selling_price DECIMAL(10,2),
      quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 5,
      supplier TEXT,
      warranty_period TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin user if not exists
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", (err, row) => {
      if (row.count === 0) {
        db.run(`INSERT INTO users (username, password, full_name, role, email) 
                VALUES ('admin', 'admin123', 'Administrator', 'admin', 'admin@watchshop.com')`);
      }
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

// IPC handlers
ipcMain.handle('login', async (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1",
      [username, password],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({ success: true, user: { id: row.id, username: row.username, full_name: row.full_name, role: row.role } });
        } else {
          resolve({ success: false, message: 'Invalid credentials' });
        }
      }
    );
  });
});

ipcMain.handle('get-customers', async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM customers ORDER BY created_at DESC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-customer', async (event, customer) => {
  return new Promise((resolve, reject) => {
    const { name, phone, email } = customer;
    db.run(
      "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
      [name, phone, email],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...customer });
      }
    );
  });
});

ipcMain.handle('update-customer', async (event, customer) => {
  return new Promise((resolve, reject) => {
    const { id, name, phone, email } = customer;
    db.run(
      "UPDATE customers SET name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, phone, email, id],
      function(err) {
        if (err) reject(err);
        else resolve(customer);
      }
    );
  });
});

ipcMain.handle('delete-customer', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM customers WHERE id = ?", [id], function(err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

ipcMain.handle('get-users', async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT id, username, full_name, role, email, phone, created_at, is_active FROM users ORDER BY created_at DESC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-user', async (event, user) => {
  return new Promise((resolve, reject) => {
    const { username, password, full_name, role, email, phone } = user;
    db.run(
      "INSERT INTO users (username, password, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
      [username, password, full_name, role, email, phone],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, username, full_name, role, email, phone, is_active: 1 });
      }
    );
  });
});

ipcMain.handle('update-user', async (event, user) => {
  return new Promise((resolve, reject) => {
    const { id, username, full_name, role, email, phone, is_active } = user;
    let query = "UPDATE users SET username = ?, full_name = ?, role = ?, email = ?, phone = ?, is_active = ? WHERE id = ?";
    let params = [username, full_name, role, email, phone, is_active, id];
    
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(user);
    });
  });
});

ipcMain.handle('delete-user', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// Inventory IPC handlers
ipcMain.handle('get-inventory', async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM inventory ORDER BY created_at DESC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-inventory-item', async (event, item) => {
  return new Promise((resolve, reject) => {
    const { code, name, category, brand, model, description, cost_price, selling_price, quantity, min_stock_level, supplier, warranty_period, location } = item;
    db.run(
      `INSERT INTO inventory (code, name, category, brand, model, description, cost_price, selling_price, quantity, min_stock_level, supplier, warranty_period, location) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, category, brand, model, description, cost_price, selling_price, quantity, min_stock_level, supplier, warranty_period, location],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...item });
      }
    );
  });
});

ipcMain.handle('update-inventory-item', async (event, item) => {
  return new Promise((resolve, reject) => {
    const { id, code, name, category, brand, model, description, cost_price, selling_price, quantity, min_stock_level, supplier, warranty_period, location } = item;
    db.run(
      `UPDATE inventory SET code = ?, name = ?, category = ?, brand = ?, model = ?, description = ?, cost_price = ?, selling_price = ?, quantity = ?, min_stock_level = ?, supplier = ?, warranty_period = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [code, name, category, brand, model, description, cost_price, selling_price, quantity, min_stock_level, supplier, warranty_period, location, id],
      function(err) {
        if (err) reject(err);
        else resolve(item);
      }
    );
  });
});

ipcMain.handle('delete-inventory-item', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM inventory WHERE id = ?", [id], function(err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

ipcMain.handle('search-inventory', async (event, searchTerm) => {
  return new Promise((resolve, reject) => {
    const term = `%${searchTerm}%`;
    db.all(
      `SELECT * FROM inventory WHERE code LIKE ? OR name LIKE ? OR brand LIKE ? OR model LIKE ? ORDER BY name`,
      [term, term, term, term],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
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
    if (db) db.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) db.close();
});