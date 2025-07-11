// File: backend/routes/special.js
// ZEDSON WATCHCRAFT - Special API Routes (Part 2)
// Developed by PULSEWARE❤️

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
    User, 
    Customer, 
    Inventory, 
    Sales, 
    Service, 
    Expense, 
    Invoice, 
    ActivityLog 
} = require('../models');

// Activity logging function
const logActivity = async (username, userRole, action, category, details = {}) => {
    try {
        const now = new Date();
        const newLog = new ActivityLog({
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('en-IN'),
            time: now.toLocaleTimeString('en-IN'),
            username,
            userRole,
            action,
            category,
            details,
            sessionId: 'session_' + Date.now()
        });
        await newLog.save();
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

// Authentication Routes
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            await logActivity(username, 'unknown', 'Failed login attempt - user not found', 'authentication');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            await logActivity(username, user.role, 'Failed login attempt - account inactive', 'authentication');
            return res.status(401).json({ error: 'Account is inactive' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            await logActivity(username, user.role, 'Failed login attempt - wrong password', 'authentication');
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

        await logActivity(username, user.role, 'User logged in successfully', 'authentication');

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

// Dashboard Statistics
router.get('/dashboard/stats', async (req, res) => {
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
router.get('/export/all', async (req, res) => {
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
router.post('/init/admin', async (req, res) => {
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
router.post('/init/sample-data', async (req, res) => {
    try {
        // Clear existing data
        await Customer.deleteMany({});
        await Inventory.deleteMany({});

        // Sample customers
        const sampleCustomers = [
            {
                name: "Raj Kumar",
                email: "raj@email.com",
                phone: "+91-9876543210",
                address: "Chennai, Tamil Nadu",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            },
            {
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

// Revenue Analytics endpoint
router.get('/analytics/revenue', async (req, res) => {
    try {
        const { fromDate, toDate, type = 'all', includeExpenses = false } = req.query;
        
        let salesQuery = {};
        let servicesQuery = { status: 'completed' };
        let expensesQuery = {};
        
        if (fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            
            salesQuery.createdAt = { $gte: from, $lte: to };
            servicesQuery.createdAt = { $gte: from, $lte: to };
            expensesQuery.createdAt = { $gte: from, $lte: to };
        }
        
        let sales = [];
        let services = [];
        let expenses = [];
        
        if (type === 'all' || type === 'sales') {
            sales = await Sales.find(salesQuery);
        }
        
        if (type === 'all' || type === 'services') {
            services = await Service.find(servicesQuery);
        }
        
        if (includeExpenses === 'true') {
            expenses = await Expense.find(expensesQuery);
        }
        
        const salesRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const servicesRevenue = services.reduce((sum, service) => sum + service.cost, 0);
        const expensesAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalRevenue = salesRevenue + servicesRevenue;
        const netAmount = totalRevenue - expensesAmount;
        
        res.json({
            success: true,
            data: {
                sales,
                services,
                expenses,
                analytics: {
                    salesRevenue,
                    servicesRevenue,
                    totalRevenue,
                    expensesAmount,
                    netAmount,
                    totalTransactions: sales.length + services.length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customer analytics
router.get('/analytics/customers', async (req, res) => {
    try {
        const customers = await Customer.find({});
        const sales = await Sales.find({});
        const services = await Service.find({ status: 'completed' });
        
        // Calculate net values for customers
        const customerAnalytics = customers.map(customer => {
            const customerSales = sales.filter(sale => sale.customerId === customer.id);
            const customerServices = services.filter(service => service.customerId === customer.id);
            
            const salesValue = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const servicesValue = customerServices.reduce((sum, service) => sum + service.cost, 0);
            const netValue = salesValue + servicesValue;
            
            return {
                ...customer.toObject(),
                calculatedNetValue: netValue,
                salesCount: customerSales.length,
                servicesCount: customerServices.length
            };
        });
        
        // Sort by net value
        customerAnalytics.sort((a, b) => b.calculatedNetValue - a.calculatedNetValue);
        
        res.json({
            success: true,
            data: {
                customers: customerAnalytics,
                topCustomers: customerAnalytics.slice(0, 10),
                totalCustomers: customers.length,
                activeCustomers: customerAnalytics.filter(c => c.calculatedNetValue > 0).length
            }
        });
    } catch (error) {
        console.error('Error fetching customer analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Inventory analytics
router.get('/analytics/inventory', async (req, res) => {
    try {
        const inventory = await Inventory.find({});
        const sales = await Sales.find({});
        
        // Calculate inventory analytics
        const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const availableItems = inventory.filter(item => item.status === 'available').length;
        const soldItems = inventory.filter(item => item.status === 'sold').length;
        const lowStockItems = inventory.filter(item => item.quantity <= 2 && item.quantity > 0).length;
        
        // Brand analytics
        const brandAnalytics = {};
        inventory.forEach(item => {
            if (!brandAnalytics[item.brand]) {
                brandAnalytics[item.brand] = {
                    count: 0,
                    value: 0,
                    sales: 0
                };
            }
            brandAnalytics[item.brand].count++;
            brandAnalytics[item.brand].value += item.price * item.quantity;
        });
        
        // Add sales data to brand analytics
        sales.forEach(sale => {
            const item = inventory.find(inv => inv.id === sale.watchId);
            if (item && brandAnalytics[item.brand]) {
                brandAnalytics[item.brand].sales += sale.totalAmount;
            }
        });
        
        // Outlet analytics
        const outletAnalytics = {};
        inventory.forEach(item => {
            if (!outletAnalytics[item.outlet]) {
                outletAnalytics[item.outlet] = {
                    count: 0,
                    value: 0
                };
            }
            outletAnalytics[item.outlet].count++;
            outletAnalytics[item.outlet].value += item.price * item.quantity;
        });
        
        res.json({
            success: true,
            data: {
                summary: {
                    totalItems: inventory.length,
                    totalValue,
                    availableItems,
                    soldItems,
                    lowStockItems
                },
                brandAnalytics,
                outletAnalytics,
                lowStockItems: inventory.filter(item => item.quantity <= 2 && item.quantity > 0)
            }
        });
    } catch (error) {
        console.error('Error fetching inventory analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;