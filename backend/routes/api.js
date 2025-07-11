// File: backend/routes/api.js
// ZEDSON WATCHCRAFT - API Routes (Part 1)
// Developed by PULSEWARE❤️

const express = require('express');
const router = express.Router();
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

// Activity logging middleware
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

// Generic CRUD route generator
const createCRUDRoutes = (modelName, Model) => {
    // Get all documents
    router.get(`/${modelName}`, async (req, res) => {
        try {
            const documents = await Model.find({}).sort({ createdAt: -1 });
            res.json({ success: true, data: documents });
        } catch (error) {
            console.error(`Error fetching ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get single document
    router.get(`/${modelName}/one`, async (req, res) => {
        try {
            const query = req.query;
            const document = await Model.findOne(query);
            res.json({ success: true, data: document });
        } catch (error) {
            console.error(`Error fetching ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get by ID
    router.get(`/${modelName}/:id`, async (req, res) => {
        try {
            const { id } = req.params;
            const document = await Model.findOne({ id: parseInt(id) });
            
            if (!document) {
                return res.status(404).json({ error: `${modelName} not found` });
            }
            
            res.json({ success: true, data: document });
        } catch (error) {
            console.error(`Error fetching ${modelName} by ID:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create single document
    router.post(`/${modelName}`, async (req, res) => {
        try {
            const document = new Model(req.body);
            const saved = await document.save();
            
            // Log activity
            if (req.user) {
                await logActivity(req.user.username, req.user.role, `Created ${modelName}`, modelName, {
                    id: saved.id,
                    name: saved.name || saved.username || `${modelName} ${saved.id}`
                });
            }
            
            res.status(201).json({ success: true, data: saved });
        } catch (error) {
            console.error(`Error creating ${modelName}:`, error);
            if (error.code === 11000) {
                res.status(400).json({ error: 'Duplicate entry found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });

    // Create multiple documents
    router.post(`/${modelName}/batch`, async (req, res) => {
        try {
            const { documents } = req.body;
            const saved = await Model.insertMany(documents);
            
            // Log activity
            if (req.user) {
                await logActivity(req.user.username, req.user.role, `Created ${documents.length} ${modelName}`, modelName, {
                    count: documents.length
                });
            }
            
            res.status(201).json({ success: true, data: saved });
        } catch (error) {
            console.error(`Error creating multiple ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update single document
    router.put(`/${modelName}/one`, async (req, res) => {
        try {
            const { query, update } = req.body;
            const result = await Model.updateOne(query, update);
            
            // Log activity
            if (req.user && result.modifiedCount > 0) {
                await logActivity(req.user.username, req.user.role, `Updated ${modelName}`, modelName, {
                    query,
                    modifiedCount: result.modifiedCount
                });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error updating ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update by ID
    router.put(`/${modelName}/:id`, async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const result = await Model.updateOne({ id: parseInt(id) }, updateData);
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: `${modelName} not found` });
            }
            
            // Log activity
            if (req.user && result.modifiedCount > 0) {
                await logActivity(req.user.username, req.user.role, `Updated ${modelName} ${id}`, modelName, {
                    id: parseInt(id),
                    updateData
                });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error updating ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update multiple documents
    router.put(`/${modelName}`, async (req, res) => {
        try {
            const { query, update } = req.body;
            const result = await Model.updateMany(query, update);
            
            // Log activity
            if (req.user && result.modifiedCount > 0) {
                await logActivity(req.user.username, req.user.role, `Updated ${result.modifiedCount} ${modelName}`, modelName, {
                    query,
                    modifiedCount: result.modifiedCount
                });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error updating multiple ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete single document
    router.delete(`/${modelName}/one`, async (req, res) => {
        try {
            const { query } = req.body;
            const result = await Model.deleteOne(query);
            
            // Log activity
            if (req.user && result.deletedCount > 0) {
                await logActivity(req.user.username, req.user.role, `Deleted ${modelName}`, modelName, {
                    query,
                    deletedCount: result.deletedCount
                });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error deleting ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete by ID
    router.delete(`/${modelName}/:id`, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await Model.deleteOne({ id: parseInt(id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: `${modelName} not found` });
            }
            
            // Log activity
            if (req.user) {
                await logActivity(req.user.username, req.user.role, `Deleted ${modelName} ${id}`, modelName, {
                    id: parseInt(id)
                });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error deleting ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete multiple documents
    router.delete(`/${modelName}`, async (req, res) => {
        try {
            const { query } = req.body;
            const result = await Model.deleteMany(query);
            
            // Log activity
            if (req.user && result.deletedCount > 0) {
                await logActivity(req.user.username, req.user.role, `Deleted ${result.deletedCount} ${modelName}`, modelName, {
                    query,
                    deletedCount: result.deletedCount
                });
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(`Error deleting multiple ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Search documents
    router.get(`/${modelName}/search`, async (req, res) => {
        try {
            const { q, field, limit = 50 } = req.query;
            let query = {};
            
            if (q && field) {
                query[field] = { $regex: q, $options: 'i' };
            } else if (q) {
                // Search across multiple fields based on model
                const searchFields = getSearchFields(modelName);
                query = {
                    $or: searchFields.map(field => ({
                        [field]: { $regex: q, $options: 'i' }
                    }))
                };
            }
            
            const documents = await Model.find(query)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });
            
            res.json({ success: true, data: documents });
        } catch (error) {
            console.error(`Error searching ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Backup endpoint
    router.post(`/${modelName}/backup`, async (req, res) => {
        try {
            const { data } = req.body;
            
            // Clear existing data and insert backup data
            await Model.deleteMany({});
            const saved = await Model.insertMany(data);
            
            // Log activity
            if (req.user) {
                await logActivity(req.user.username, req.user.role, `Backup restored for ${modelName}`, 'system', {
                    recordCount: saved.length
                });
            }
            
            res.json({ success: true, data: saved, message: `${modelName} backup completed` });
        } catch (error) {
            console.error(`Error backing up ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Import endpoint
    router.post(`/${modelName}/import`, async (req, res) => {
        try {
            const { data } = req.body;
            
            // Clear existing data and import new data
            await Model.deleteMany({});
            const saved = await Model.insertMany(data);
            
            // Log activity
            if (req.user) {
                await logActivity(req.user.username, req.user.role, `Data imported for ${modelName}`, 'system', {
                    recordCount: saved.length
                });
            }
            
            res.json({ success: true, data: saved, message: `${modelName} import completed` });
        } catch (error) {
            console.error(`Error importing ${modelName}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
};

// Helper function to get search fields for each model
const getSearchFields = (modelName) => {
    const searchFieldMap = {
        users: ['username', 'fullName', 'email'],
        customers: ['name', 'email', 'phone'],
        inventory: ['code', 'brand', 'model', 'type', 'outlet'],
        sales: ['customerName', 'watchName', 'watchCode', 'paymentMethod'],
        services: ['customerName', 'watchName', 'brand', 'model', 'issue', 'type'],
        expenses: ['description'],
        invoices: ['invoiceNo', 'customerName', 'type'],
        logs: ['username', 'action', 'category']
    };
    
    return searchFieldMap[modelName] || ['name'];
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

module.exports = router;