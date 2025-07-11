// File: backend/scripts/reset-and-seed.js
// ZEDSON WATCHCRAFT - Complete Database Reset and Seeding
// Developed by PULSEWARE❤️

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('🏪 ZEDSON WATCHCRAFT - Complete Database Reset');
console.log('💝 Developed by PULSEWARE with ❤️');
console.log('══════════════════════════════════════════════');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';

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

async function dropDatabase() {
    try {
        console.log('💥 Dropping entire database...');
        await mongoose.connection.db.dropDatabase();
        console.log('✅ Database dropped completely');
        return true;
    } catch (error) {
        console.error('❌ Error dropping database:', error.message);
        return false;
    }
}

async function createModelsAndSeed() {
    try {
        console.log('📋 Creating fresh models...');
        
        // Define schemas WITHOUT manual id fields
        const { Schema } = mongoose;
        
        // User Schema (no auto-increment needed)
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

        // Sales Schema
        const SalesSchema = new Schema({
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
        }, { timestamps: true });

        // Service Schema
        const ServiceSchema = new Schema({
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
        }, { timestamps: true });

        // Expense Schema
        const ExpenseSchema = new Schema({
            date: { type: String, required: true },
            formattedDate: { type: String, required: true },
            description: { type: String, required: true },
            amount: { type: Number, required: true },
            timestamp: { type: String, required: true },
            createdBy: { type: String },
        }, { timestamps: true });

        // Invoice Schema
        const InvoiceSchema = new Schema({
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
        }, { timestamps: true });

        // Activity Log Schema
        const ActivityLogSchema = new Schema({
            timestamp: { type: String, required: true },
            date: { type: String, required: true },
            time: { type: String, required: true },
            username: { type: String, required: true },
            userRole: { type: String, required: true },
            action: { type: String, required: true },
            category: { type: String, required: true },
            details: { type: Schema.Types.Mixed },
            sessionId: { type: String },
        }, { timestamps: true });

        // Apply auto-increment plugin with unique identifiers
        const AutoIncrement = require('mongoose-sequence')(mongoose);
        CustomerSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'customer_counter'});
        InventorySchema.plugin(AutoIncrement, {inc_field: 'id', id: 'inventory_counter'});
        SalesSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'sales_counter'});
        ServiceSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'service_counter'});
        ExpenseSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'expense_counter'});
        InvoiceSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'invoice_counter'});
        ActivityLogSchema.plugin(AutoIncrement, {inc_field: 'id', id: 'activity_log_counter'});

        // Create models
        const User = mongoose.model('User', UserSchema);
        const Customer = mongoose.model('Customer', CustomerSchema);
        const Inventory = mongoose.model('Inventory', InventorySchema);
        const Sales = mongoose.model('Sales', SalesSchema);
        const Service = mongoose.model('Service', ServiceSchema);
        const Expense = mongoose.model('Expense', ExpenseSchema);
        const Invoice = mongoose.model('Invoice', InvoiceSchema);
        const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

        console.log('✅ Models created successfully');

        // Now seed the data
        console.log('🌱 Seeding data...');

        // Create Users
        console.log('👥 Creating users...');
        const users = await User.insertMany([
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
        ]);
        console.log(`✅ Created ${users.length} users`);

        // Create Customers
        console.log('👤 Creating customers...');
        const customers = await Customer.insertMany([
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
        ]);
        console.log(`✅ Created ${customers.length} customers`);

        // Create Inventory
        console.log('⌚ Creating inventory...');
        const inventory = await Inventory.insertMany([
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
        ]);
        console.log(`✅ Created ${inventory.length} inventory items`);

        console.log('');
        console.log('✅ Database reset and seeding completed successfully!');
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
    } catch (error) {
        console.error('❌ Error during seeding:', error.message);
        return false;
    }
}

async function main() {
    let success = false;
    
    try {
        // Connect to database
        const connected = await connectToDatabase();
        if (!connected) return;

        // Drop entire database
        const dropped = await dropDatabase();
        if (!dropped) return;

        // Create models and seed data
        success = await createModelsAndSeed();
        
    } catch (error) {
        console.error('❌ Script error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Connection closed');
        process.exit(success ? 0 : 1);
    }
}

// Run the script
main();