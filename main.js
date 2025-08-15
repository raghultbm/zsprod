const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDatabase, closeDatabase } = require('./core/database');

let mainWindow;
let databaseReady = false;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        show: false,
        titleBarStyle: 'default'
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Send database status to renderer
        if (databaseReady) {
            mainWindow.webContents.send('database-status', true);
        }
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC handlers
ipcMain.handle('is-database-ready', () => {
    return databaseReady;
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-app-path', (event, name) => {
    return app.getPath(name);
});

// App event handlers
app.whenReady().then(async () => {
    try {
        console.log('Initializing database...');
        await initDatabase();
        databaseReady = true;
        console.log('Database initialized successfully');
        
        createWindow();
        
        // Notify renderer if window already exists
        if (mainWindow) {
            mainWindow.webContents.send('database-status', true);
        }
        
    } catch (error) {
        console.error('Failed to initialize database:', error);
        databaseReady = false;
        
        // Still create window to show error
        createWindow();
        
        if (mainWindow) {
            mainWindow.webContents.send('database-error', error.message);
        }
    }
});

app.on('window-all-closed', async () => {
    // Close database connection
    try {
        await closeDatabase();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error closing database:', error);
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', async () => {
    try {
        await closeDatabase();
    } catch (error) {
        console.error('Error closing database on quit:', error);
    }
});

// Handle app crashes gracefully
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});