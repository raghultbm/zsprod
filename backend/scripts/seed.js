// File: backend/scripts/seed.js
// ZEDSON WATCHCRAFT - Database Seeding Script
// Developed by PULSEWARE❤️

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection function
async function connectDatabase() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';
        console.log('🔌 Connecting to MongoDB...');
        
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ MongoDB Connected for seeding');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

// Define schemas directly in this file to avoid import issues
const AutoIncrement = require('mongoose-sequence')(mongoose);

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
    id: { type: Number, unique: true },
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
    id: { type: Number, unique: true },
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

// Apply auto-increment
CustomerSchema.plugin(AutoIncrement, { inc_field: 'id' });
InventorySchema.plugin(AutoIncrement, { inc_field: 'id' });

// Create Models
let User, Customer, Inventory;

function initializeModels() {
    try {
        // Clear existing models if they exist
        if (mongoose.models.User) delete mongoose.models.User;
        if (mongoose.models.Customer) delete mongoose.models.Customer;
        if (mongoose.models.Inventory) delete mongoose.models.Inventory;
        
        User = mongoose.model('User', UserSchema);
        Customer = mongoose.model('Customer', CustomerSchema);
        Inventory = mongoose.model('Inventory', InventorySchema);
        
        console.log('📋 Models initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing models:', error.message);
        throw error;
    }
}

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        console.log('⏰ Time:', new Date().toLocaleString());
        
        // Connect to MongoDB
        await connectDatabase();
        
        // Initialize models
        initializeModels();
        
        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Customer.deleteMany({});
        await Inventory.deleteMany({});
        
        // Reset auto-increment counters
        try {
            await mongoose.connection.db.collection('counters').deleteMany({});
            console.log('🔄 Reset auto-increment counters');
        } catch (err) {
            console.log('ℹ️  No counters to reset (first run)');
        }
        
        // Create admin user
        console.log('👤 Creating admin user...');
        const hashedAdminPassword = await bcrypt.hash('admin123', 10);
        const adminUser = await User.create({
            username: 'admin',
            password: hashedAdminPassword,
            role: 'admin',
            fullName: 'System Administrator',
            email: 'admin@zedsonwatchcraft.com',
            status: 'active',
            firstLogin: false
        });
        console.log('✅ Admin user created:', adminUser.username);
        
        // Create owner user
        console.log('👤 Creating owner user...');
        const hashedOwnerPassword = await bcrypt.hash('owner123', 10);
        const ownerUser = await User.create({
            username: 'owner',
            password: hashedOwnerPassword,
            role: 'owner',
            fullName: 'Shop Owner',
            email: 'owner@zedsonwatchcraft.com',
            status: 'active',
            firstLogin: false
        });
        console.log('✅ Owner user created:', ownerUser.username);
        
        // Create staff user
        console.log('👤 Creating staff user...');
        const hashedStaffPassword = await bcrypt.hash('staff123', 10);
        const staffUser = await User.create({
            username: 'staff',
            password: hashedStaffPassword,
            role: 'staff',
            fullName: 'Staff Member',
            email: 'staff@zedsonwatchcraft.com',
            status: 'active',
            firstLogin: false
        });
        console.log('✅ Staff user created:', staffUser.username);
        
        // Create sample customers
        console.log('👥 Creating sample customers...');
        const sampleCustomers = [
            {
                name: "Amjad",
                email: "amzad@email.com",
                phone: "+91-9876543210",
                address: "123 Anna Salai, Chennai, Tamil Nadu - 600002",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            },
            {
                name: "Gnanasekaran",
                email: "sekar@email.com",
                phone: "+91-9876543211",
                address: "456 Padur Main Road, Chennai, Tamil Nadu - 600002",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            },
            {
                name: "Veena",
                email: "veenav@email.com",
                phone: "+91-9876543212",
                address: "789 Padur Main Road, Chennai, Tamil Nadu - 600002",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            },
            {
                name: "Dhinesh Kumar",
                email: "dhineshkumarg@email.com",
                phone: "+91-9876543213",
                address: "101 Metro Road Madippakkam, Chennai, Tamil Nadu - 600002",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            },
            {
                name: "Raghul",
                email: "raghulgrr@email.com",
                phone: "+91-9876543214",
                address: "202 Maxworth Nagar, Chennai, Tamil Nadu - 600002",
                purchases: 0,
                serviceCount: 0,
                netValue: 0
            }
        ];
        
        const createdCustomers = await Customer.insertMany(sampleCustomers);
        console.log(`✅ Created ${createdCustomers.length} customers`);
        
        // Create sample inventory
        console.log('⌚ Creating sample inventory...');
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
                description: "Luxury diving watch with ceramic bezel",
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
                description: "Professional chronograph, moon watch heritage",
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
                description: "Shock resistant sports watch",
                status: "available"
            },
            {
                code: "TIS001",
                type: "Watch",
                brand: "Tissot",
                model: "PRC 200",
                size: "39mm",
                price: 35000,
                quantity: 3,
                outlet: "Semmancheri",
                description: "Swiss quartz chronograph",
                status: "available"
            },
            {
                code: "SEI001",
                type: "Watch",
                brand: "Seiko",
                model: "Prospex",
                size: "42mm",
                price: 25000,
                quantity: 4,
                outlet: "Navalur",
                description: "Professional diving watch, 200m water resistance",
                status: "available"
            },
            {
                code: "CIT001",
                type: "Watch",
                brand: "Citizen",
                model: "Eco-Drive",
                size: "41mm",
                price: 18000,
                quantity: 6,
                outlet: "Padur",
                description: "Solar powered watch, never needs battery",
                status: "available"
            },
            {
                code: "FOS001",
                type: "Watch",
                brand: "Fossil",
                model: "Grant",
                size: "44mm",
                price: 12000,
                quantity: 8,
                outlet: "Semmancheri",
                description: "Fashion chronograph with leather strap",
                status: "available"
            },
            {
                code: "STR001",
                type: "Strap",
                brand: "Generic",
                model: "Leather Band",
                size: "20mm",
                price: 500,
                quantity: 20,
                outlet: "Navalur",
                description: "Genuine leather watch strap, brown color",
                status: "available"
            },
            {
                code: "STR002",
                type: "Strap",
                brand: "Generic",
                model: "Steel Bracelet",
                size: "22mm",
                price: 1200,
                quantity: 15,
                outlet: "Padur",
                description: "Stainless steel mesh bracelet",
                status: "available"
            },
            {
                code: "BAT001",
                type: "Battery",
                brand: "Energizer",
                model: "SR626SW",
                size: "-",
                price: 100,
                quantity: 50,
                outlet: "Semmancheri",
                description: "Silver oxide watch battery, 1.55V",
                status: "available"
            },
            {
                code: "BAT002",
                type: "Battery",
                brand: "Maxell",
                model: "SR920SW",
                size: "-",
                price: 120,
                quantity: 30,
                outlet: "Navalur",
                description: "Silver oxide watch battery, 1.55V",
                status: "available"
            },
            {
                code: "CLK001",
                type: "Clock",
                brand: "Seiko",
                model: "Wall Clock",
                size: "30cm",
                price: 3500,
                quantity: 3,
                outlet: "Padur",
                description: "Wooden wall clock with silent movement",
                status: "available"
            }
        ];
        
        const createdInventory = await Inventory.insertMany(sampleInventory);
        console.log(`✅ Created ${createdInventory.length} inventory items`);
        
        // Success summary
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('📊 Summary:');
        console.log(`   👤 Users: 3 (admin, owner, staff)`);
        console.log(`   👥 Customers: ${createdCustomers.length}`);
        console.log(`   ⌚ Inventory Items: ${createdInventory.length}`);
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
        console.error('Full error:', error);
        throw error;
    } finally {
        try {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
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
        initializeModels();
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to clear`);
        
        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments();
            if (count > 0) {
                await mongoose.connection.db.collection(collection.name).deleteMany({});
                console.log(`✅ Cleared collection: ${collection.name} (${count} documents)`);
            } else {
                console.log(`ℹ️  Collection ${collection.name} was already empty`);
            }
        }
        
        console.log('✅ Database cleared successfully!');
        
    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
        throw error;
    } finally {
        try {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
        } catch (closeError) {
            console.error('Error closing connection:', closeError.message);
        }
        process.exit(0);
    }
}

/**
 * Show database status
 */
async function showStatus() {
    try {
        console.log('📊 Checking database status...');
        
        await connectDatabase();
        initializeModels();
        
        const userCount = await User.countDocuments();
        const customerCount = await Customer.countDocuments();
        const inventoryCount = await Inventory.countDocuments();
        
        console.log('\n📈 Database Statistics:');
        console.log(`   👤 Users: ${userCount}`);
        console.log(`   👥 Customers: ${customerCount}`);
        console.log(`   ⌚ Inventory Items: ${inventoryCount}`);
        
        if (userCount > 0) {
            console.log('\n👤 User Accounts:');
            const users = await User.find({}, 'username role status createdAt').lean();
            users.forEach(user => {
                const created = new Date(user.createdAt).toLocaleDateString();
                console.log(`   - ${user.username} (${user.role}) - ${user.status} - Created: ${created}`);
            });
        }
        
        if (inventoryCount > 0) {
            console.log('\n⌚ Inventory Summary:');
            const inventory = await Inventory.aggregate([
                {
                    $group: {
                        _id: '$outlet',
                        count: { $sum: 1 },
                        totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
                    }
                }
            ]);
            
            inventory.forEach(outlet => {
                console.log(`   - ${outlet._id}: ${outlet.count} items, ₹${outlet.totalValue.toLocaleString('en-IN')}`);
            });
        }
        
        console.log('\n✅ Status check completed');
        
    } catch (error) {
        console.error('❌ Error checking database status:', error.message);
        throw error;
    } finally {
        try {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
        } catch (closeError) {
            console.error('Error closing connection:', closeError.message);
        }
        process.exit(0);
    }
}

// Main execution logic
async function main() {
    const command = process.argv[2];
    
    console.log('🏪 ZEDSON WATCHCRAFT - Database Management');
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