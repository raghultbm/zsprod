// ZEDSON WATCHCRAFT - Simplified MongoDB Backend Server
// Developed by PULSEWARE❤️

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
    origin: ['http://localhost:3000', 'http://localhost:8000', 'http://127.0.0.1:8000'],
    credentials: true
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    initializeDefaultData();
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// Auto-increment plugin
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Schemas
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
    address: { type: String },
    purchases: { type: Number, default: 0 },
    serviceCount: { type: Number, default: 0 },
    netValue: { type: Number, default: 0 },
    addedBy: { type: String }
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
    description: { type: String },
    status: { type: String, enum: ['available', 'sold'], default: 'available' },
    addedBy: { type: String }
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
    createdBy: { type: String }
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
    estimatedDelivery: { type: String },
    actualDelivery: { type: String },
    completionDescription: { type: String },
    warrantyPeriod: { type: Number, default: 0 },
    createdBy: { type: String }
}, { timestamps: true });

const expenseSchema = new mongoose.Schema({
    date: { type: String, required: true },
    formattedDate: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: String, required: true },
    createdBy: { type: String }
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
    createdBy: { type: String }
}, { timestamps: true });

// Apply auto-increment
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
        // Check if admin user exists
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@zedsonwatchcraft.com',
                status: 'active'
            });
            console.log('✅ Default admin user created');
        }

        // Check if sample data exists
        const customerCount = await Customer.countDocuments();
        if (customerCount === 0) {
            await Customer.insertMany([
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
                }
            ]);

            await Inventory.insertMany([
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
                }
            ]);
            
            console.log('✅ Sample data created');
        }
    } catch (error) {
        console.error('Error initializing default data:', error);
    }
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'zedson_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'ZEDSON WATCHCRAFT Backend - MongoDB Connected',
        timestamp: new Date().toISOString(),
        database: 'MongoDB Local'
    });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'zedson_secret',
            { expiresIn: '24h' }
        );

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

// Generic CRUD routes for all collections
const createCRUDRoutes = (path, Model) => {
    // Get all
    app.get(`/api/${path}`, async (req, res) => {
        try {
            const documents = await Model.find({}).sort({ createdAt: -1 });
            res.json({ success: true, data: documents });
        } catch (error) {
            console.error(`Error fetching ${path}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create
    app.post(`/api/${path}`, async (req, res) => {
        try {
            const document = new Model(req.body);
            const saved = await document.save();
            res.status(201).json({ success: true, data: saved });
        } catch (error) {
            console.error(`Error creating ${path}:`, error);
            if (error.code === 11000) {
                res.status(400).json({ error: 'Duplicate entry found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });

    // Update by ID
    app.put(`/api/${path}/:id`, async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const result = await Model.updateOne({ id: parseInt(id) }, updateData);
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: `${path} not found` });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error updating ${path}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete by ID
    app.delete(`/api/${path}/:id`, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await Model.deleteOne({ id: parseInt(id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: `${path} not found` });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error deleting ${path}:`, error);
            res.status(500).json({ error: 'Internal server error' });
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

// Dashboard statistics
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

// Error handling
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ZEDSON WATCHCRAFT Backend Server Started`);
    console.log(`💝 Developed by PULSEWARE with ❤️`);
    console.log(`🔗 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log('════════════════════════════════════════════════════');
});

module.exports = app;