const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { initDatabase } = require('./core/database');

let mainWindow;
let databaseReady = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        show: false
    });

    mainWindow.loadFile('index.html');
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Send database ready status to renderer
        mainWindow.webContents.send('database-status', databaseReady);
        
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Backup Database',
                    click: () => {
                        mainWindow.webContents.send('backup-database');
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handler for database ready check
ipcMain.handle('is-database-ready', () => {
    return databaseReady;
});

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

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});