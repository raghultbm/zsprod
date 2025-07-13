// ZEDSON WATCHCRAFT - FIXED MongoDB Backend Server
// Developed by PULSEWARE❤️

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:8000', 
        'http://127.0.0.1:8000',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';

let isConnected = false;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
    isConnected = true;
    initializeDefaultData();
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️ Server will run in basic mode without database');
    isConnected = false;
});

// Auto-increment plugin
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Schemas with proper validation
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'owner', 'staff'], required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastLogin: { type: Date }
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    purchases: { type: Number, default: 0 },
    serviceCount: { type: Number, default: 0 },
    netValue: { type: Number, default: 0 },
    addedBy: { type: String, default: 'system' }
}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    size: { type: String, default: '-' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    outlet: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['available', 'sold'], default: 'available' },
    addedBy: { type: String, default: 'system' }
}, { timestamps: true });

const salesSchema = new mongoose.Schema({
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
    createdBy: { type: String, default: 'system' }
}, { timestamps: true });

const serviceSchema = new mongoose.Schema({
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
    estimatedDelivery: { type: String, default: '' },
    actualDelivery: { type: String, default: '' },
    completionDescription: { type: String, default: '' },
    warrantyPeriod: { type: Number, default: 0 },
    createdBy: { type: String, default: 'system' }
}, { timestamps: true });

const expenseSchema = new mongoose.Schema({
    date: { type: String, required: true },
    formattedDate: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: String, required: true },
    createdBy: { type: String, default: 'system' }
}, { timestamps: true });

const invoiceSchema = new mongoose.Schema({
    invoiceNo: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    subType: { type: String, required: true },
    date: { type: String, required: true },
    timestamp: { type: String, required: true },
    customerId: { type: Number, required: true },
    customerName: { type: String, required: true },
    relatedId: { type: Number, required: true },
    relatedType: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'generated' },
    createdBy: { type: String, default: 'system' }
}, { timestamps: true });

// Apply auto-increment with unique identifiers
customerSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'customer_counter'});
inventorySchema.plugin(AutoIncrement, {inc_field: 'id', id: 'inventory_counter'});
salesSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'sales_counter'});
serviceSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'service_counter'});
expenseSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'expense_counter'});
invoiceSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'invoice_counter'});

// Models
const User = mongoose.model('User', userSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Sales = mongoose.model('Sales', salesSchema);
const Service = mongoose.model('Service', serviceSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);

// Initialize default data
async function initializeDefaultData() {
    try {
        console.log('🌱 Initializing default data...');
        
        // Create default users
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const users = [
                {
                    username: 'admin',
                    password: await bcrypt.hash('admin123', 10),
                    role: 'admin',
                    fullName: 'System Administrator',
                    email: 'admin@zedsonwatchcraft.com',
                    status: 'active'
                },
                {
                    username: 'owner',
                    password: await bcrypt.hash('owner123', 10),
                    role: 'owner',
                    fullName: 'Shop Owner',
                    email: 'owner@zedsonwatchcraft.com',
                    status: 'active'
                },
                {
                    username: 'staff',
                    password: await bcrypt.hash('staff123', 10),
                    role: 'staff',
                    fullName: 'Staff Member',
                    email: 'staff@zedsonwatchcraft.com',
                    status: 'active'
                }
            ];
            
            await User.insertMany(users);
            console.log('✅ Default users created');
        }

        // Create sample data if none exists
        const customerCount = await Customer.countDocuments();
        if (customerCount === 0) {
            const customers = [
                {
                    name: "Raj Kumar",
                    email: "raj@email.com",
                    phone: "+91-9876543210",
                    address: "Chennai, Tamil Nadu",
                    addedBy: "admin"
                },
                {
                    name: "Priya Sharma",
                    email: "priya@email.com",
                    phone: "+91-9876543211",
                    address: "Mumbai, Maharashtra",
                    addedBy: "admin"
                },
                {
                    name: "Amit Patel",
                    email: "amit@email.com",
                    phone: "+91-9876543212",
                    address: "Ahmedabad, Gujarat",
                    addedBy: "admin"
                }
            ];

            const inventory = [
                {
                    code: "ROL001",
                    type: "Watch",
                    brand: "Rolex",
                    model: "Submariner",
                    size: "40mm",
                    price: 850000,
                    quantity: 2,
                    outlet: "Semmancheri",
                    description: "Luxury diving watch",
                    addedBy: "admin"
                },
                {
                    code: "OMG001",
                    type: "Watch",
                    brand: "Omega",
                    model: "Speedmaster",
                    size: "42mm",
                    price: 450000,
                    quantity: 1,
                    outlet: "Navalur",
                    description: "Professional chronograph",
                    addedBy: "admin"
                },
                {
                    code: "CAS001",
                    type: "Watch",
                    brand: "Casio",
                    model: "G-Shock",
                    size: "44mm",
                    price: 15000,
                    quantity: 5,
                    outlet: "Padur",
                    description: "Sports watch",
                    addedBy: "admin"
                }
            ];
            
            await Customer.insertMany(customers);
            await Inventory.insertMany(inventory);
            console.log('✅ Sample data created');
        }
        
        console.log('✅ Database initialization completed');
    } catch (error) {
        console.error('❌ Error initializing default data:', error);
    }
}

// Enhanced health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'ZEDSON WATCHCRAFT Backend - MongoDB Ready',
        developer: 'PULSEWARE❤️',
        timestamp: new Date().toISOString(),
        database: isConnected ? 'Connected' : 'Disconnected',
        mongodb: isConnected ? 'Active' : 'Inactive',
        version: '3.0.0'
    });
});

// Database status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        database: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend API is working',
        timestamp: new Date().toISOString()
    });
});

// FIXED: Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body.username);
        
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username and password are required' 
            });
        }

        if (!isConnected) {
            return res.status(503).json({ 
                success: false, 
                error: 'Database not connected' 
            });
        }

        const user = await User.findOne({ username: username.trim() });
        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }

        if (user.status !== 'active') {
            console.log('❌ User account inactive:', username);
            return res.status(401).json({ 
                success: false, 
                error: 'Account is inactive' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'zedson_watchcraft_secret_key',
            { expiresIn: '24h' }
        );

        console.log('✅ Login successful for user:', username);

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
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error during authentication' 
        });
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Access token required' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'zedson_watchcraft_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

// Generic CRUD routes for all collections
const createCRUDRoutes = (path, Model) => {
    // Get all documents
    app.get(`/api/${path}`, async (req, res) => {
        try {
            if (!isConnected) {
                return res.status(503).json({ 
                    success: false, 
                    error: 'Database not connected' 
                });
            }

            const documents = await Model.find({}).sort({ createdAt: -1 });
            res.json({ success: true, data: documents });
        } catch (error) {
            console.error(`❌ Error fetching ${path}:`, error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });

    // Get single document by ID
    app.get(`/api/${path}/:id`, async (req, res) => {
        try {
            if (!isConnected) {
                return res.status(503).json({ 
                    success: false, 
                    error: 'Database not connected' 
                });
            }

            const { id } = req.params;
            const document = await Model.findOne({ id: parseInt(id) });
            
            if (!document) {
                return res.status(404).json({ 
                    success: false, 
                    error: `${path} not found` 
                });
            }
            
            res.json({ success: true, data: document });
        } catch (error) {
            console.error(`❌ Error fetching ${path} by ID:`, error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });

    // Create new document
    app.post(`/api/${path}`, async (req, res) => {
        try {
            if (!isConnected) {
                return res.status(503).json({ 
                    success: false, 
                    error: 'Database not connected' 
                });
            }

            const document = new Model(req.body);
            const saved = await document.save();
            
            console.log(`✅ Created new ${path}:`, saved.id);
            res.status(201).json({ success: true, data: saved });
        } catch (error) {
            console.error(`❌ Error creating ${path}:`, error);
            if (error.code === 11000) {
                res.status(400).json({ 
                    success: false, 
                    error: 'Duplicate entry found' 
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    error: 'Internal server error' 
                });
            }
        }
    });

    // Update document by ID
    app.put(`/api/${path}/:id`, async (req, res) => {
        try {
            if (!isConnected) {
                return res.status(503).json({ 
                    success: false, 
                    error: 'Database not connected' 
                });
            }

            const { id } = req.params;
            const updateData = req.body;
            
            const result = await Model.updateOne({ id: parseInt(id) }, updateData);
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: `${path} not found` 
                });
            }
            
            console.log(`✅ Updated ${path}:`, id);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`❌ Error updating ${path}:`, error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });

    // Delete document by ID
    app.delete(`/api/${path}/:id`, async (req, res) => {
        try {
            if (!isConnected) {
                return res.status(503).json({ 
                    success: false, 
                    error: 'Database not connected' 
                });
            }

            const { id } = req.params;
            const result = await Model.deleteOne({ id: parseInt(id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: `${path} not found` 
                });
            }
            
            console.log(`✅ Deleted ${path}:`, id);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`❌ Error deleting ${path}:`, error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });
};

// Create CRUD routes for all models
createCRUDRoutes('customers', Customer);
createCRUDRoutes('inventory', Inventory);
createCRUDRoutes('sales', Sales);
createCRUDRoutes('services', Service);
createCRUDRoutes('expenses', Expense);
createCRUDRoutes('invoices', Invoice);

// Dashboard statistics endpoint
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(503).json({ 
                success: false, 
                error: 'Database not connected' 
            });
        }

        const totalWatches = await Inventory.countDocuments();
        const totalCustomers = await Customer.countDocuments();
        const totalSales = await Sales.countDocuments();
        const totalServices = await Service.countDocuments();
        const incompleteServices = await Service.countDocuments({ 
            status: { $ne: 'completed' } 
        });
        const totalInvoices = await Invoice.countDocuments();
        
        // Today's revenue calculation
        const today = new Date().toLocaleDateString('en-IN');
        const todaySales = await Sales.find({ date: today });
        const todayServices = await Service.find({
            status: 'completed',
            actualDelivery: today
        });
        
        const todayRevenue = 
            todaySales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) +
            todayServices.reduce((sum, service) => sum + (service.cost || 0), 0);
        
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
        console.error('❌ Error fetching dashboard stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'ZEDSON WATCHCRAFT API',
        version: '3.0.0',
        developer: 'PULSEWARE❤️',
        database: isConnected ? 'Connected' : 'Disconnected',
        status: 'Active',
        endpoints: {
            health: '/health',
            api: '/api',
            login: '/api/auth/login',
            customers: '/api/customers',
            inventory: '/api/inventory',
            sales: '/api/sales',
            services: '/api/services',
            expenses: '/api/expenses',
            invoices: '/api/invoices',
            dashboard: '/api/dashboard/stats'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Global error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'API endpoint not found',
        path: req.originalUrl 
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ZEDSON WATCHCRAFT Backend Server Started');
    console.log(`💝 Developed by PULSEWARE with ❤️`);
    console.log(`📊 MongoDB: ${isConnected ? 'Connected' : 'Will connect automatically'}`);
    console.log(`🔗 Server: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log('════════════════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    server.close(() => {
        console.log('🔌 HTTP server closed');
    });
    
    if (isConnected) {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
    
    console.log('👋 Goodbye from PULSEWARE❤️');
    process.exit(0);
});

module.exports = app;