// ZEDSON WATCHCRAFT - Node.js Backend for MongoDB Integration
// Developed by PULSEWARE❤️
// File: server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('🚀 ZEDSON WATCHCRAFT Backend - Powered by PULSEWARE❤️');
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error);
});

// ==================== MONGOOSE SCHEMAS ====================

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'owner', 'staff'], required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    firstLogin: { type: Boolean, default: false },
    tempPassword: { type: String },
    lastLogin: { type: Date },
    createdBy: { type: String },
}, {
    timestamps: true
});

// Customer Schema
const CustomerSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String },
    purchases: { type: Number, default: 0 },
    serviceCount: { type: Number, default: 0 },
    netValue: { type: Number, default: 0 },
    addedBy: { type: String },
}, {
    timestamps: true
});

// Inventory Schema
const InventorySchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    size: { type: String, default: '-' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    outlet: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['available', 'sold'], default: 'available' },
    addedBy: { type: String },
}, {
    timestamps: true
});

// Sales Schema
const SalesSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    timestamp: { type: String, required: true },
    customerId: { type: Number, required: true },
    customerName: { type: String, required: true },
    watchId: { type: Number, required: true },
    watchName: { type: String, required: true },
    watchCode: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    discountType: { type: String, default: '' },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: { type: String, default: 'completed' },
    invoiceGenerated: { type: Boolean, default: false },
    invoiceId: { type: Number },
    createdBy: { type: String },
    notes: [{ type: String }],
}, {
    timestamps: true
});

// Service Schema
const ServiceSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    timestamp: { type: String, required: true },
    customerId: { type: Number, required: true },
    customerName: { type: String, required: true },
    type: { type: String, required: true },
    watchName: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    dialColor: { type: String, default: 'N/A' },
    movementNo: { type: String, required: true },
    gender: { type: String, default: 'N/A' },
    caseType: { type: String, default: 'N/A' },
    strapType: { type: String, default: 'N/A' },
    issue: { type: String, required: true },
    cost: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'in-progress', 'on-hold', 'completed'], default: 'pending' },
    estimatedDelivery: { type: String },
    actualDelivery: { type: String },
    completionImage: { type: String },
    completionDescription: { type: String },
    warrantyPeriod: { type: Number, default: 0 },
    acknowledgementGenerated: { type: Boolean, default: false },
    completionInvoiceGenerated: { type: Boolean, default: false },
    acknowledgementInvoiceId: { type: Number },
    completionInvoiceId: { type: Number },
    createdBy: { type: String },
    notes: [{ type: String }],
}, {
    timestamps: true
});

// Expense Schema
const ExpenseSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    date: { type: String, required: true },
    formattedDate: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: String, required: true },
    createdBy: { type: String },
}, {
    timestamps: true
});

// Invoice Schema
const InvoiceSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    invoiceNo: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    subType: { type: String, required: true },
    date: { type: String, required: true },
    timestamp: { type: String, required: true },
    customerId: { type: Number, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerAddress: { type: String },
    relatedId: { type: Number, required: true },
    relatedType: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'generated' },
    createdBy: { type: String },
    // Additional fields for different invoice types
    watchName: { type: String },
    watchCode: { type: String },
    brand: { type: String },
    model: { type: String },
    quantity: { type: Number },
    price: { type: Number },
    paymentMethod: { type: String },
    discountAmount: { type: Number },
    workPerformed: { type: String },
    warrantyPeriod: { type: Number },
    completionDate: { type: String },
}, {
    timestamps: true
});

// Activity Log Schema
const ActivityLogSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    timestamp: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    username: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    category: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    sessionId: { type: String },
}, {
    timestamps: true
});

// Create Models
const User = mongoose.model('User', UserSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);
const Sales = mongoose.model('Sales', SalesSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// ==================== MIDDLEWARE ====================

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'zedson_watchcraft_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Logging middleware
const logActivity = async (username, userRole, action, category, details) => {
    try {
        const logCount = await ActivityLog.countDocuments();
        const now = new Date();
        const newLog = new ActivityLog({
            id: logCount + 1,
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('en-IN'),
            time: now.toLocaleTimeString('en-IN'),
            username,
            userRole,
            action,
            category,
            details: details || {},
            sessionId: 'session_' + Date.now()
        });
        await newLog.save();
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

// ==================== ROUTES ====================

// Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ZEDSON WATCHCRAFT Backend is running',
        developer: 'PULSEWARE❤️',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(401).json({ error: 'Account is inactive' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'zedson_watchcraft_secret',
            { expiresIn: '24h' }
        );

        await logActivity(username, user.role, 'User logged in', 'authentication', {});

        res.json({
            success: true,
            token,
            user: {
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generic CRUD Routes for all collections
const createCRUDRoutes = (modelName, Model) => {
    // Get all documents
    app.get(`/api/${modelName}`, async (req, res) => {
        try {
            const documents = await Model.find({});
            res.json({ success: true, data: documents });
        } catch (error) {
            console.error(`Error fetching ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get single document
    app.get(`/api/${modelName}/one`, async (req, res) => {
        try {
            const query = req.query;
            const document = await Model.findOne(query);
            res.json({ success: true, data: document });
        } catch (error) {
            console.error(`Error fetching ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create single document
    app.post(`/api/${modelName}`, async (req, res) => {
        try {
            const document = new Model(req.body);
            const saved = await document.save();
            
            res.status(201).json({ success: true, data: saved });
        } catch (error) {
            console.error(`Error creating ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create multiple documents
    app.post(`/api/${modelName}/batch`, async (req, res) => {
        try {
            const { documents } = req.body;
            const saved = await Model.insertMany(documents);
            
            res.status(201).json({ success: true, data: saved });
        } catch (error) {
            console.error(`Error creating multiple ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update single document
    app.put(`/api/${modelName}/one`, async (req, res) => {
        try {
            const { query, update } = req.body;
            const result = await Model.updateOne(query, update);
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error updating ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update multiple documents
    app.put(`/api/${modelName}`, async (req, res) => {
        try {
            const { query, update } = req.body;
            const result = await Model.updateMany(query, update);
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error updating multiple ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete single document
    app.delete(`/api/${modelName}/one`, async (req, res) => {
        try {
            const { query } = req.body;
            const result = await Model.deleteOne(query);
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error deleting ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete multiple documents
    app.delete(`/api/${modelName}`, async (req, res) => {
        try {
            const { query } = req.body;
            const result = await Model.deleteMany(query);
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error deleting multiple ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Backup endpoint
    app.post(`/api/${modelName}/backup`, async (req, res) => {
        try {
            const { data } = req.body;
            
            // Clear existing data and insert backup data
            await Model.deleteMany({});
            const saved = await Model.insertMany(data);
            
            res.json({ success: true, data: saved, message: `${modelName} backup completed` });
        } catch (error) {
            console.error(`Error backing up ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Import endpoint
    app.post(`/api/${modelName}/import`, async (req, res) => {
        try {
            const { data } = req.body;
            
            // Clear existing data and import new data
            await Model.deleteMany({});
            const saved = await Model.insertMany(data);
            
            res.json({ success: true, data: saved, message: `${modelName} import completed` });
        } catch (error) {
            console.error(`Error importing ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
};

// Create CRUD routes for all models
createCRUDRoutes('users', User);
createCRUDRoutes('customers', Customer);
createCRUDRoutes('inventory', Inventory);
createCRUDRoutes('sales', Sales);
createCRUDRoutes('services', Service);
createCRUDRoutes('expenses', Expense);
createCRUDRoutes('invoices', Invoice);
createCRUDRoutes('logs', ActivityLog);

// ==================== SPECIAL ROUTES ====================

// Dashboard Statistics
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalWatches = await Inventory.countDocuments();
        const totalCustomers = await Customer.countDocuments();
        const totalSales = await Sales.countDocuments();
        const totalServices = await Service.countDocuments();
        const incompleteServices = await Service.countDocuments({ status: { $ne: 'completed' } });
        const totalInvoices = await Invoice.countDocuments();
        
        // Today's revenue
        const today = new Date().toLocaleDateString('en-IN');
        
        const todaySales = await Sales.find({ date: today });
        const todayServices = await Service.find({
            status: 'completed',
            actualDelivery: today
        });
        
        const todayRevenue = 
            todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
            todayServices.reduce((sum, service) => sum + service.cost, 0);
        
        res.json({
            success: true,
            data: {
                totalWatches,
                totalCustomers,
                totalSales,
                totalServices,
                incompleteServices,
                totalInvoices,
                todayRevenue
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export all data
app.get('/api/export/all', async (req, res) => {
    try {
        const exportData = {
            users: await User.find({}, { password: 0 }), // Exclude passwords
            customers: await Customer.find({}),
            inventory: await Inventory.find({}),
            sales: await Sales.find({}),
            services: await Service.find({}),
            expenses: await Expense.find({}),
            invoices: await Invoice.find({}),
            logs: await ActivityLog.find({}).limit(1000), // Last 1000 logs
            exportDate: new Date().toISOString(),
            version: '2.0',
            source: 'ZEDSON WATCHCRAFT - MongoDB Backend'
        };
        
        res.json({ success: true, data: exportData });
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize default admin user
app.post('/api/init/admin', async (req, res) => {
    try {
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin user already exists' });
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            fullName: 'System Administrator',
            email: 'admin@zedsonwatchcraft.com',
            status: 'active',
            firstLogin: false
        });

        await admin.save();
        
        res.json({ 
            success: true,
            message: 'Admin user created successfully',
            username: 'admin',
            password: 'admin123' // Only show in initialization
        });
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize sample data
app.post('/api/init/sample-data', async (req, res) => {
    try {
        // Clear existing data
        await Customer.deleteMany({});
        await Inventory.deleteMany({});

        // Sample customers
        const sampleCustomers = [
            {
                id: 1,
                name: "Raj Kumar",
                email: "raj@email.com",
                phone: "+91-9876543210",
                address: "Chennai, Tamil Nadu",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            },
            {
                id: 2,
                name: "Priya Sharma",
                email: "priya@email.com",
                phone: "+91-9876543211",
                address: "Mumbai, Maharashtra",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            }
        ];

        // Sample inventory
        const sampleInventory = [
            {
                id: 1,
                code: "ROL001",
                type: "Watch",
                brand: "Rolex",
                model: "Submariner",
                size: "40mm",
                price: 850000,
                quantity: 2,
                outlet: "Semmancheri",
                description: "Luxury diving watch",
                status: "available"
            },
            {
                id: 2,
                code: "OMG001",
                type: "Watch",
                brand: "Omega",
                model: "Speedmaster",
                size: "42mm",
                price: 450000,
                quantity: 1,
                outlet: "Navalur",
                description: "Professional chronograph",
                status: "available"
            },
            {
                id: 3,
                code: "CAS001",
                type: "Watch",
                brand: "Casio",
                model: "G-Shock",
                size: "44mm",
                price: 15000,
                quantity: 5,
                outlet: "Padur",
                description: "Sports watch",
                status: "available"
            }
        ];

        // Insert sample data
        await Customer.insertMany(sampleCustomers);
        await Inventory.insertMany(sampleInventory);

        res.json({
            success: true,
            message: 'Sample data initialized successfully',
            data: {
                customers: sampleCustomers.length,
                inventory: sampleInventory.length
            }
        });
    } catch (error) {
        console.error('Error initializing sample data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        message: 'ZEDSON WATCHCRAFT API - Developed by PULSEWARE❤️'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong on our end'
    });
});

// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
    console.log(`🚀 ZEDSON WATCHCRAFT Backend running on port ${PORT}`);
    console.log(`💝 Developed by PULSEWARE with ❤️`);
    console.log(`📊 MongoDB Integration Active`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    console.log('👋 Goodbye from PULSEWARE❤️');
    process.exit(0);
});

module.exports = app;