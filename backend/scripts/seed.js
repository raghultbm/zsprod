// File: backend/scripts/seed.js
// ZEDSON WATCHCRAFT - Simple Database Seeding Script
// Developed by PULSEWARE❤️

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('🏪 ZEDSON WATCHCRAFT - Database Seeding');
console.log('💝 Developed by PULSEWARE with ❤️');
console.log('══════════════════════════════════════');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';

// Define schemas directly in this file to avoid import issues
const { Schema } = mongoose;

// User Schema
const UserSchema = new Schema({
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
}, { timestamps: true });

// Customer Schema
const CustomerSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String },
    purchases: { type: Number, default: 0 },
    serviceCount: { type: Number, default: 0 },
    netValue: { type: Number, default: 0 },
    addedBy: { type: String },
}, { timestamps: true });

// Inventory Schema
const InventorySchema = new Schema({
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
}, { timestamps: true });

// Auto-increment setup
const AutoIncrement = require('mongoose-sequence')(mongoose);
CustomerSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'customer_counter'});
InventorySchema.plugin(AutoIncrement, {inc_field: 'id', id: 'inventory_counter'});

// Create models
const User = mongoose.model('User', UserSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);

async function connectToDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
}

async function clearDatabase() {
    try {
        console.log('🗑️ Clearing existing data...');
        
        await User.deleteMany({});
        await Customer.deleteMany({});
        await Inventory.deleteMany({});
        
        // Clear counters
        try {
            await mongoose.connection.db.collection('counters').deleteMany({});
        } catch (err) {
            // Ignore if counters collection doesn't exist
        }
        
        console.log('✅ Database cleared');
        return true;
    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
        return false;
    }
}

async function seedUsers() {
    try {
        console.log('👥 Creating users...');
        
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
        
        const result = await User.insertMany(users);
        console.log(`✅ Created ${result.length} users`);
        return result;
    } catch (error) {
        console.error('❌ Error creating users:', error.message);
        return [];
    }
}

async function seedCustomers() {
    try {
        console.log('👤 Creating customers...');
        
        const customers = [
            {
                name: 'Raj Kumar',
                email: 'raj@email.com',
                phone: '+91-9876543210',
                address: 'Chennai, Tamil Nadu',
                addedBy: 'admin'
            },
            {
                name: 'Priya Sharma',
                email: 'priya@email.com',
                phone: '+91-9876543211',
                address: 'Mumbai, Maharashtra',
                addedBy: 'admin'
            },
            {
                name: 'Amit Patel',
                email: 'amit@email.com',
                phone: '+91-9876543212',
                address: 'Ahmedabad, Gujarat',
                addedBy: 'admin'
            }
        ];
        
        const result = await Customer.insertMany(customers);
        console.log(`✅ Created ${result.length} customers`);
        return result;
    } catch (error) {
        console.error('❌ Error creating customers:', error.message);
        return [];
    }
}

async function seedInventory() {
    try {
        console.log('⌚ Creating inventory...');
        
        const inventory = [
            {
                code: 'ROL001',
                type: 'Watch',
                brand: 'Rolex',
                model: 'Submariner',
                size: '40mm',
                price: 850000,
                quantity: 2,
                outlet: 'Semmancheri',
                description: 'Luxury diving watch',
                addedBy: 'admin'
            },
            {
                code: 'OMG001',
                type: 'Watch',
                brand: 'Omega',
                model: 'Speedmaster',
                size: '42mm',
                price: 450000,
                quantity: 1,
                outlet: 'Navalur',
                description: 'Professional chronograph',
                addedBy: 'admin'
            },
            {
                code: 'CAS001',
                type: 'Watch',
                brand: 'Casio',
                model: 'G-Shock',
                size: '44mm',
                price: 15000,
                quantity: 5,
                outlet: 'Padur',
                description: 'Sports watch',
                addedBy: 'admin'
            }
        ];
        
        const result = await Inventory.insertMany(inventory);
        console.log(`✅ Created ${result.length} inventory items`);
        return result;
    } catch (error) {
        console.error('❌ Error creating inventory:', error.message);
        return [];
    }
}

async function getCollectionCounts() {
    try {
        const userCount = await User.countDocuments();
        const customerCount = await Customer.countDocuments();
        const inventoryCount = await Inventory.countDocuments();
        
        return {
            users: userCount,
            customers: customerCount,
            inventory: inventoryCount,
            total: userCount + customerCount + inventoryCount
        };
    } catch (error) {
        console.error('❌ Error getting counts:', error.message);
        return { users: 0, customers: 0, inventory: 0, total: 0 };
    }
}

async function seedDatabase() {
    console.log('🌱 Starting database seeding...');
    
    const connected = await connectToDatabase();
    if (!connected) return false;
    
    const cleared = await clearDatabase();
    if (!cleared) return false;
    
    const users = await seedUsers();
    const customers = await seedCustomers();
    const inventory = await seedInventory();
    
    console.log('');
    console.log('✅ Database seeding completed!');
    console.log('📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Inventory: ${inventory.length}`);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Owner: owner / owner123');
    console.log('   Staff: staff / staff123');
    
    return true;
}

async function checkStatus() {
    console.log('📊 Checking database status...');
    
    const connected = await connectToDatabase();
    if (!connected) return false;
    
    const counts = await getCollectionCounts();
    
    console.log('📈 Database Status:');
    console.log(`   Users: ${counts.users}`);
    console.log(`   Customers: ${counts.customers}`);
    console.log(`   Inventory: ${counts.inventory}`);
    console.log(`   Total Documents: ${counts.total}`);
    
    return true;
}

async function clearOnly() {
    console.log('🧹 Clearing database...');
    
    const connected = await connectToDatabase();
    if (!connected) return false;
    
    const cleared = await clearDatabase();
    if (cleared) {
        console.log('✅ Database cleared successfully!');
    }
    
    return cleared;
}

async function closeConnection() {
    try {
        await mongoose.connection.close();
        console.log('🔌 Connection closed');
    } catch (error) {
        console.error('❌ Error closing connection:', error.message);
    }
}

async function main() {
    const command = process.argv[2] || 'status';
    let success = false;
    
    try {
        switch (command) {
            case 'seed':
                success = await seedDatabase();
                break;
            case 'clear':
                success = await clearOnly();
                break;
            case 'status':
                success = await checkStatus();
                break;
            default:
                console.log('❌ Invalid command. Use: seed, clear, or status');
                break;
        }
    } catch (error) {
        console.error('❌ Script error:', error.message);
    } finally {
        await closeConnection();
        process.exit(success ? 0 : 1);
    }
}

// Run the script
main();