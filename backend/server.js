const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'zedson_watchcraft';

let db;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
MongoClient.connect(MONGODB_URI, {
    useUnifiedTopology: true,
})
.then(client => {
    console.log('Connected to MongoDB');
    db = client.db(DATABASE_NAME);
    
    // Initialize default admin user if not exists
    initializeDefaultData();
})
.catch(error => {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
});

// Initialize default admin user
async function initializeDefaultData() {
    try {
        const usersCollection = db.collection('users');
        const adminExists = await usersCollection.findOne({ username: 'admin' });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const defaultAdmin = {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@zedsonwatchcraft.com',
                status: 'active',
                created: new Date().toISOString().split('T')[0],
                lastLogin: 'Never',
                firstLogin: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            await usersCollection.insertOne(defaultAdmin);
            console.log('Default admin user created');
        }
        
        // Create indexes for better performance
        await createIndexes();
        
        console.log('Database initialization completed');
    } catch (error) {
        console.error('Error initializing default data:', error);
    }
}

// Create database indexes
async function createIndexes() {
    try {
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('customers').createIndex({ email: 1 }, { unique: true });
        await db.collection('customers').createIndex({ phone: 1 }, { unique: true });
        await db.collection('inventory').createIndex({ code: 1 }, { unique: true });
        await db.collection('sales').createIndex({ createdAt: -1 });
        await db.collection('services').createIndex({ createdAt: -1 });
        await db.collection('expenses').createIndex({ createdAt: -1 });
        await db.collection('invoices').createIndex({ createdAt: -1 });
        await db.collection('logs').createIndex({ timestamp: -1 });
        console.log('Database indexes created');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ZEDSON WATCHCRAFT Backend is running',
        timestamp: new Date().toISOString(),
        database: db ? 'Connected' : 'Disconnected'
    });
});

// API Routes

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (user.status !== 'active') {
            return res.status(401).json({ error: 'Account is inactive' });
        }
        
        // Handle first login with temporary password
        if (user.firstLogin && user.tempPassword) {
            if (user.tempPassword === password) {
                return res.json({ 
                    success: true, 
                    user: {
                        username: user.username,
                        role: user.role,
                        fullName: user.fullName,
                        email: user.email
                    },
                    firstLogin: true
                });
            } else {
                return res.status(401).json({ error: 'Invalid temporary password' });
            }
        }
        
        // Regular login
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await db.collection('users').updateOne(
            { _id: user._id },
            { 
                $set: { 
                    lastLogin: new Date().toISOString(),
                    updatedAt: new Date()
                }
            }
        );
        
        res.json({ 
            success: true, 
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

app.post('/api/auth/set-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await db.collection('users').updateOne(
            { username },
            { 
                $set: { 
                    password: hashedPassword,
                    firstLogin: false,
                    updatedAt: new Date()
                },
                $unset: { tempPassword: 1 }
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Set password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Users Routes
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.collection('users').find({}, {
            projection: { password: 0, tempPassword: 0 }
        }).toArray();
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const userData = req.body;
        const tempPassword = generateTempPassword();
        
        userData.tempPassword = tempPassword;
        userData.password = null;
        userData.firstLogin = true;
        userData.createdAt = new Date();
        userData.updatedAt = new Date();
        
        const result = await db.collection('users').insertOne(userData);
        
        res.json({ 
            success: true, 
            userId: result.insertedId,
            tempPassword: tempPassword
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            res.status(400).json({ error: `${field} already exists` });
        } else {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.put('/api/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const updateData = req.body;
        updateData.updatedAt = new Date();
        
        const result = await db.collection('users').updateOne(
            { username },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const result = await db.collection('users').deleteOne({ username });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customers Routes
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await db.collection('customers').find({}).sort({ createdAt: -1 }).toArray();
        res.json(customers);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const customerData = req.body;
        customerData.createdAt = new Date();
        customerData.updatedAt = new Date();
        
        const result = await db.collection('customers').insertOne(customerData);
        
        res.json({ 
            success: true, 
            customerId: result.insertedId,
            customer: { ...customerData, _id: result.insertedId }
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            res.status(400).json({ error: `${field} already exists` });
        } else {
            console.error('Create customer error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        updateData.updatedAt = new Date();
        
        const result = await db.collection('customers').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.collection('customers').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Inventory Routes
app.get('/api/inventory', async (req, res) => {
    try {
        const inventory = await db.collection('inventory').find({}).sort({ createdAt: -1 }).toArray();
        res.json(inventory);
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/inventory', async (req, res) => {
    try {
        const itemData = req.body;
        itemData.createdAt = new Date();
        itemData.updatedAt = new Date();
        
        const result = await db.collection('inventory').insertOne(itemData);
        
        res.json({ 
            success: true, 
            itemId: result.insertedId,
            item: { ...itemData, _id: result.insertedId }
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'Item code already exists' });
        } else {
            console.error('Create inventory error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.put('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        updateData.updatedAt = new Date();
        
        const result = await db.collection('inventory').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.collection('inventory').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sales Routes
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await db.collection('sales').find({}).sort({ createdAt: -1 }).toArray();
        res.json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        const saleData = req.body;
        saleData.createdAt = new Date();
        saleData.updatedAt = new Date();
        
        const result = await db.collection('sales').insertOne(saleData);
        
        res.json({ 
            success: true, 
            saleId: result.insertedId,
            sale: { ...saleData, _id: result.insertedId }
        });
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/sales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        updateData.updatedAt = new Date();
        
        const result = await db.collection('sales').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update sale error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/sales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.collection('sales').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete sale error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Services Routes
app.get('/api/services', async (req, res) => {
    try {
        const services = await db.collection('services').find({}).sort({ createdAt: -1 }).toArray();
        res.json(services);
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/services', async (req, res) => {
    try {
        const serviceData = req.body;
        serviceData.createdAt = new Date();
        serviceData.updatedAt = new Date();
        
        const result = await db.collection('services').insertOne(serviceData);
        
        res.json({ 
            success: true, 
            serviceId: result.insertedId,
            service: { ...serviceData, _id: result.insertedId }
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        updateData.updatedAt = new Date();
        
        const result = await db.collection('services').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.collection('services').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Expenses Routes
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await db.collection('expenses').find({}).sort({ createdAt: -1 }).toArray();
        res.json(expenses);
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const expenseData = req.body;
        expenseData.createdAt = new Date();
        expenseData.updatedAt = new Date();
        
        const result = await db.collection('expenses').insertOne(expenseData);
        
        res.json({ 
            success: true, 
            expenseId: result.insertedId,
            expense: { ...expenseData, _id: result.insertedId }
        });
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        updateData.updatedAt = new Date();
        
        const result = await db.collection('expenses').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.collection('expenses').deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Invoices Routes
app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await db.collection('invoices').find({}).sort({ createdAt: -1 }).toArray();
        res.json(invoices);
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/invoices', async (req, res) => {
    try {
        const invoiceData = req.body;
        invoiceData.createdAt = new Date();
        invoiceData.updatedAt = new Date();
        
        const result = await db.collection('invoices').insertOne(invoiceData);
        
        res.json({ 
            success: true, 
            invoiceId: result.insertedId,
            invoice: { ...invoiceData, _id: result.insertedId }
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logs Routes
app.post('/api/logs', async (req, res) => {
    try {
        const logData = req.body;
        logData.createdAt = new Date();
        
        await db.collection('logs').insertOne(logData);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Create log error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const logs = await db.collection('logs')
            .find({})
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .toArray();
        res.json(logs);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Utility function to generate temporary password
function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`ZEDSON WATCHCRAFT Backend Server`);
    console.log(`Server running on: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API endpoint: http://localhost:${PORT}/api`);
    console.log(`========================================\n`);
});

module.exports = app;