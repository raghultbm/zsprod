// File: backend/scripts/seed.js
// ZEDSON WATCHCRAFT - Database Seeding Script (FINAL FIXED VERSION)
// Developed by PULSEWARE❤️

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// FIXED: Global connection and model variables
let connection = null;
let models = null;

// MongoDB connection function with better error handling
async function connectDatabase() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';
        console.log('🔌 Connecting to MongoDB...');
        console.log('   Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
        
        // FIXED: Close any existing connections first
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('   Closed existing connection');
        }
        
        connection = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            socketTimeoutMS: 45000, // 45 second socket timeout
        });
        
        console.log('✅ MongoDB Connected successfully');
        console.log('   Database:', connection.connection.db.databaseName);
        console.log('   Host:', connection.connection.host);
        console.log('   Port:', connection.connection.port);
        
        return connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        if (error.name === 'MongoServerSelectionError') {
            console.error('   Make sure MongoDB is running on the specified host and port');
        }
        throw error;
    }
}

// FIXED: Properly define and initialize models
function initializeModels() {
    try {
        console.log('📋 Initializing models...');
        
        // FIXED: Clear existing models completely
        Object.keys(mongoose.models).forEach(key => {
            delete mongoose.models[key];
        });
        Object.keys(mongoose.modelSchemas).forEach(key => {
            delete mongoose.modelSchemas[key];
        });
        
        // User Schema (no auto-increment needed)
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
            timestamps: true,
            collection: 'users' // FIXED: Explicit collection name
        });

        // Customer Schema (manual ID)
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
            timestamps: true,
            collection: 'customers' // FIXED: Explicit collection name
        });

        // Inventory Schema (manual ID)
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
            timestamps: true,
            collection: 'inventory' // FIXED: Explicit collection name
        });

        // Create Models
        const User = mongoose.model('User', UserSchema);
        const Customer = mongoose.model('Customer', CustomerSchema);
        const Inventory = mongoose.model('Inventory', InventorySchema);
        
        models = { User, Customer, Inventory };
        
        console.log('✅ Models initialized successfully');
        return models;
    } catch (error) {
        console.error('❌ Error initializing models:', error.message);
        throw error;
    }
}

/**
 * FIXED: Seed database with proper error handling and verification
 */
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        console.log('⏰ Time:', new Date().toLocaleString());
        
        // Connect to MongoDB
        await connectDatabase();
        
        // Initialize models
        const { User, Customer, Inventory } = initializeModels();
        
        // FIXED: Clear existing data with verification
        console.log('🗑️  Clearing existing data...');
        const userDeleteResult = await User.deleteMany({});
        const customerDeleteResult = await Customer.deleteMany({});
        const inventoryDeleteResult = await Inventory.deleteMany({});
        
        console.log(`   Deleted ${userDeleteResult.deletedCount} users`);
        console.log(`   Deleted ${customerDeleteResult.deletedCount} customers`);
        console.log(`   Deleted ${inventoryDeleteResult.deletedCount} inventory items`);
        
        // Clear counters if they exist
        try {
            const countersResult = await mongoose.connection.db.collection('counters').deleteMany({});
            console.log(`   Deleted ${countersResult.deletedCount} counter documents`);
        } catch (err) {
            console.log('   No counters collection to clear');
        }
        
        // Create users
        console.log('👤 Creating users...');
        const users = [
            {
                username: 'admin',
                password: await bcrypt.hash('admin123', 10),
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@zedsonwatchcraft.com',
                status: 'active',
                firstLogin: false
            },
            {
                username: 'owner',
                password: await bcrypt.hash('owner123', 10),
                role: 'owner',
                fullName: 'Shop Owner',
                email: 'owner@zedsonwatchcraft.com',
                status: 'active',
                firstLogin: false
            },
            {
                username: 'staff',
                password: await bcrypt.hash('staff123', 10),
                role: 'staff',
                fullName: 'Staff Member',
                email: 'staff@zedsonwatchcraft.com',
                status: 'active',
                firstLogin: false
            }
        ];
        
        const createdUsers = await User.insertMany(users);
        console.log(`✅ Created ${createdUsers.length} users`);
        
        // FIXED: Create customers with explicit verification
        console.log('👥 Creating customers...');
        const customers = [
            { id: 1, name: "Amjad", email: "amzad@email.com", phone: "+91-9876543210", address: "123 Anna Salai, Chennai, Tamil Nadu - 600002", purchases: 0, serviceCount: 0, netValue: 0 },
            { id: 2, name: "Gnanasekaran", email: "sekar@email.com", phone: "+91-9876543211", address: "456 Padur Main Road, Chennai, Tamil Nadu - 600002", purchases: 0, serviceCount: 0, netValue: 0 },
            { id: 3, name: "Veena", email: "veenav@email.com", phone: "+91-9876543212", address: "789 Padur Main Road, Chennai, Tamil Nadu - 600002", purchases: 0, serviceCount: 0, netValue: 0 },
            { id: 4, name: "Dhinesh Kumar", email: "dhineshkumarg@email.com", phone: "+91-9876543213", address: "101 Metro Road Madippakkam, Chennai, Tamil Nadu - 600002", purchases: 0, serviceCount: 0, netValue: 0 },
            { id: 5, name: "Raghul", email: "raghulgrr@email.com", phone: "+91-9876543214", address: "202 Maxworth Nagar, Chennai, Tamil Nadu - 600002", purchases: 0, serviceCount: 0, netValue: 0 }
        ];
        
        // FIXED: Insert customers and verify
        const createdCustomers = await Customer.insertMany(customers);
        console.log(`✅ Created ${createdCustomers.length} customers`);
        
        // Verify customers were actually saved
        const customerCount = await Customer.countDocuments();
        console.log(`   Verification: ${customerCount} customers found in database`);
        
        if (customerCount !== customers.length) {
            throw new Error(`Customer count mismatch! Expected: ${customers.length}, Found: ${customerCount}`);
        }
        
        // FIXED: Create inventory with explicit verification  
        console.log('⌚ Creating inventory...');
        const inventory = [
            { id: 1, code: "ROL001", type: "Watch", brand: "Rolex", model: "Submariner", size: "40mm", price: 850000, quantity: 2, outlet: "Semmancheri", description: "Luxury diving watch with ceramic bezel", status: "available" },
            { id: 2, code: "OMG001", type: "Watch", brand: "Omega", model: "Speedmaster", size: "42mm", price: 450000, quantity: 1, outlet: "Navalur", description: "Professional chronograph, moon watch heritage", status: "available" },
            { id: 3, code: "CAS001", type: "Watch", brand: "Casio", model: "G-Shock", size: "44mm", price: 15000, quantity: 5, outlet: "Padur", description: "Shock resistant sports watch", status: "available" },
            { id: 4, code: "TIS001", type: "Watch", brand: "Tissot", model: "PRC 200", size: "39mm", price: 35000, quantity: 3, outlet: "Semmancheri", description: "Swiss quartz chronograph", status: "available" },
            { id: 5, code: "SEI001", type: "Watch", brand: "Seiko", model: "Prospex", size: "42mm", price: 25000, quantity: 4, outlet: "Navalur", description: "Professional diving watch, 200m water resistance", status: "available" },
            { id: 6, code: "CIT001", type: "Watch", brand: "Citizen", model: "Eco-Drive", size: "41mm", price: 18000, quantity: 6, outlet: "Padur", description: "Solar powered watch, never needs battery", status: "available" },
            { id: 7, code: "FOS001", type: "Watch", brand: "Fossil", model: "Grant", size: "44mm", price: 12000, quantity: 8, outlet: "Semmancheri", description: "Fashion chronograph with leather strap", status: "available" },
            { id: 8, code: "STR001", type: "Strap", brand: "Generic", model: "Leather Band", size: "20mm", price: 500, quantity: 20, outlet: "Navalur", description: "Genuine leather watch strap, brown color", status: "available" },
            { id: 9, code: "STR002", type: "Strap", brand: "Generic", model: "Steel Bracelet", size: "22mm", price: 1200, quantity: 15, outlet: "Padur", description: "Stainless steel mesh bracelet", status: "available" },
            { id: 10, code: "BAT001", type: "Battery", brand: "Energizer", model: "SR626SW", size: "-", price: 100, quantity: 50, outlet: "Semmancheri", description: "Silver oxide watch battery, 1.55V", status: "available" },
            { id: 11, code: "BAT002", type: "Battery", brand: "Maxell", model: "SR920SW", size: "-", price: 120, quantity: 30, outlet: "Navalur", description: "Silver oxide watch battery, 1.55V", status: "available" },
            { id: 12, code: "CLK001", type: "Clock", brand: "Seiko", model: "Wall Clock", size: "30cm", price: 3500, quantity: 3, outlet: "Padur", description: "Wooden wall clock with silent movement", status: "available" }
        ];
        
        // FIXED: Insert inventory and verify
        const createdInventory = await Inventory.insertMany(inventory);
        console.log(`✅ Created ${createdInventory.length} inventory items`);
        
        // Verify inventory was actually saved
        const inventoryCount = await Inventory.countDocuments();
        console.log(`   Verification: ${inventoryCount} inventory items found in database`);
        
        if (inventoryCount !== inventory.length) {
            throw new Error(`Inventory count mismatch! Expected: ${inventory.length}, Found: ${inventoryCount}`);
        }
        
        // Final verification - check all collections
        console.log('\n🔍 Final Verification:');
        const finalUserCount = await User.countDocuments();
        const finalCustomerCount = await Customer.countDocuments();
        const finalInventoryCount = await Inventory.countDocuments();
        
        console.log(`   👤 Users in DB: ${finalUserCount}`);
        console.log(`   👥 Customers in DB: ${finalCustomerCount}`);
        console.log(`   ⌚ Inventory in DB: ${finalInventoryCount}`);
        
        // Show sample data to confirm it's there
        const sampleCustomer = await Customer.findOne({});
        const sampleInventory = await Inventory.findOne({});
        
        if (sampleCustomer) {
            console.log(`   Sample Customer: ${sampleCustomer.name} (ID: ${sampleCustomer.id})`);
        }
        if (sampleInventory) {
            console.log(`   Sample Item: ${sampleInventory.code} - ${sampleInventory.brand} ${sampleInventory.model}`);
        }
        
        // Success summary
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('📊 Summary:');
        console.log(`   👤 Users: ${finalUserCount} (admin, owner, staff)`);
        console.log(`   👥 Customers: ${finalCustomerCount}`);
        console.log(`   ⌚ Inventory Items: ${finalInventoryCount}`);
        console.log('\n🔑 Login Credentials:');
        console.log('   Admin: admin / admin123');
        console.log('   Owner: owner / owner123');
        console.log('   Staff: staff / staff123');
        console.log('\n💡 Next Steps:');
        console.log('   1. Start the server: npm run dev');
        console.log('   2. Open the frontend in a browser');
        console.log('   3. Login with any of the credentials above');
        
    } catch (error) {
        console.error('❌ Error during seeding:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        try {
            if (connection) {
                await connection.connection.close();
                console.log('🔌 Database connection closed');
            }
        } catch (closeError) {
            console.error('Error closing connection:', closeError.message);
        }
        process.exit(0);
    }
}

/**
 * Clear all data from database
 */
async function clearDatabase() {
    try {
        console.log('🗑️  Starting database cleanup...');
        
        await connectDatabase();
        const { User, Customer, Inventory } = initializeModels();
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to clear`);
        
        let totalDeleted = 0;
        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments();
            if (count > 0) {
                await mongoose.connection.db.collection(collection.name).deleteMany({});
                console.log(`✅ Cleared collection: ${collection.name} (${count} documents)`);
                totalDeleted += count;
            } else {
                console.log(`ℹ️  Collection ${collection.name} was already empty`);
            }
        }
        
        console.log(`✅ Database cleared successfully! Total documents removed: ${totalDeleted}`);
        
    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
        throw error;
    } finally {
        try {
            if (connection) {
                await connection.connection.close();
                console.log('🔌 Database connection closed');
            }
        } catch (closeError) {
            console.error('Error closing connection:', closeError.message);
        }
        process.exit(0);
    }
}

/**
 * Show database status with detailed information
 */
async function showStatus() {
    try {
        console.log('📊 Checking database status...');
        
        await connectDatabase();
        const { User, Customer, Inventory } = initializeModels();
        
        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        console.log('\n📋 Available Collections:');
        console.log(`   Found ${collections.length} collections: ${collectionNames.join(', ')}`);
        
        // Get document counts
        const userCount = await User.countDocuments();
        const customerCount = await Customer.countDocuments();
        const inventoryCount = await Inventory.countDocuments();
        
        console.log('\n📈 Database Statistics:');
        console.log(`   👤 Users: ${userCount}`);
        console.log(`   👥 Customers: ${customerCount}`);
        console.log(`   ⌚ Inventory Items: ${inventoryCount}`);
        
        if (userCount === 0 && customerCount === 0 && inventoryCount === 0) {
            console.log('\n⚠️  Database appears to be empty!');
            console.log('   💡 Run "npm run db:seed" to populate with sample data');
            return;
        }
        
        // Show user details
        if (userCount > 0) {
            console.log('\n👤 User Accounts:');
            const users = await User.find({}, 'username role status createdAt').lean();
            users.forEach(user => {
                const created = new Date(user.createdAt).toLocaleDateString();
                console.log(`   - ${user.username} (${user.role}) - ${user.status} - Created: ${created}`);
            });
        }
        
        // Show customer samples
        if (customerCount > 0) {
            console.log('\n👥 Sample Customers:');
            const customers = await Customer.find({}, 'id name email').limit(3).lean();
            customers.forEach(customer => {
                console.log(`   - ID: ${customer.id} - ${customer.name} (${customer.email})`);
            });
            if (customerCount > 3) {
                console.log(`   ... and ${customerCount - 3} more customers`);
            }
        }
        
        // Show inventory samples and summary
        if (inventoryCount > 0) {
            console.log('\n⌚ Sample Items:');
            const sampleItems = await Inventory.find({}, 'id code brand model price').limit(3).lean();
            sampleItems.forEach(item => {
                console.log(`   - ID: ${item.id} - ${item.code} (${item.brand} ${item.model}) - ₹${item.price.toLocaleString('en-IN')}`);
            });
            if (inventoryCount > 3) {
                console.log(`   ... and ${inventoryCount - 3} more items`);
            }
            
            // Inventory summary by outlet
            console.log('\n⌚ Inventory by Outlet:');
            try {
                const outletSummary = await Inventory.aggregate([
                    {
                        $group: {
                            _id: '$outlet',
                            count: { $sum: 1 },
                            totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);
                
                if (outletSummary.length > 0) {
                    outletSummary.forEach(outlet => {
                        console.log(`   - ${outlet._id}: ${outlet.count} items, ₹${outlet.totalValue.toLocaleString('en-IN')}`);
                    });
                } else {
                    console.log('   - No outlet data available');
                }
            } catch (aggregateError) {
                console.log('   - Error getting outlet summary:', aggregateError.message);
            }
        }
        
        console.log('\n✅ Status check completed');
        
    } catch (error) {
        console.error('❌ Error checking database status:', error.message);
        throw error;
    } finally {
        try {
            if (connection) {
                await connection.connection.close();
                console.log('🔌 Database connection closed');
            }
        } catch (closeError) {
            console.error('Error closing connection:', closeError.message);
        }
        process.exit(0);
    }
}

// Main execution logic
async function main() {
    const command = process.argv[2];
    
    console.log('🏪 ZEDSON WATCHCRAFT - Database Management (FINAL VERSION)');
    console.log('💝 Developed by PULSEWARE with ❤️');
    console.log('═'.repeat(50));
    
    try {
        switch (command) {
            case 'seed':
                await seedDatabase();
                break;
            case 'clear':
                await clearDatabase();
                break;
            case 'status':
                await showStatus();
                break;
            default:
                console.log('\n📖 Usage: node scripts/seed.js [command]');
                console.log('\n📋 Available Commands:');
                console.log('   seed   - Seed database with sample data');
                console.log('   clear  - Clear all data from database');
                console.log('   status - Show current database status');
                console.log('\n💡 Examples:');
                console.log('   node scripts/seed.js seed');
                console.log('   npm run db:seed');
                console.log('   npm run db:clear');
                console.log('   npm run db:status');
                process.exit(0);
        }
    } catch (error) {
        console.error('\n💥 Script failed:', error.message);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    process.exit(1);
});

// Run the main function
main();