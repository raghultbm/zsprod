// File: inject-admin-user.js
// ZEDSON WATCHCRAFT - Admin User Injection Script
// Developed by PULSEWARE❤️

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('🔐 ZEDSON WATCHCRAFT - Admin User Injection');
console.log('💝 Developed by PULSEWARE with ❤️');
console.log('══════════════════════════════════════════════');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zedson_watchcraft';

// User Schema (matching your existing schema)
const userSchema = new mongoose.Schema({
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

const User = mongoose.model('User', userSchema);

async function connectToDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB successfully');
        console.log('📍 Database:', MONGODB_URI);
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
}

async function checkExistingAdmin() {
    try {
        console.log('🔍 Checking for existing admin users...');
        
        const adminUsers = await User.find({ role: 'admin' });
        
        if (adminUsers.length > 0) {
            console.log('⚠️  Admin users already exist:');
            adminUsers.forEach((admin, index) => {
                console.log(`   ${index + 1}. Username: ${admin.username} | Email: ${admin.email} | Status: ${admin.status}`);
            });
            return true;
        } else {
            console.log('✅ No admin users found. Ready to create new admin.');
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking existing admins:', error.message);
        return false;
    }
}

async function createAdminUser() {
    try {
        console.log('👤 Creating new admin user...');
        
        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Create admin user object
        const adminUser = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            fullName: 'System Administrator',
            email: 'admin@zedsonwatchcraft.com',
            status: 'active',
            firstLogin: false,
            createdBy: 'system'
        });
        
        // Save to database
        const savedAdmin = await adminUser.save();
        
        console.log('✅ Admin user created successfully!');
        console.log('📋 Admin User Details:');
        console.log(`   Username: ${savedAdmin.username}`);
        console.log(`   Password: admin123`);
        console.log(`   Role: ${savedAdmin.role}`);
        console.log(`   Full Name: ${savedAdmin.fullName}`);
        console.log(`   Email: ${savedAdmin.email}`);
        console.log(`   Status: ${savedAdmin.status}`);
        console.log(`   Created: ${savedAdmin.createdAt}`);
        
        return savedAdmin;
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        
        if (error.code === 11000) {
            console.log('⚠️  Admin user with this username or email already exists');
        }
        
        return null;
    }
}

async function createAlternativeAdmin() {
    try {
        console.log('🔄 Creating alternative admin user...');
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const adminUser = new User({
            username: 'administrator',
            password: hashedPassword,
            role: 'admin',
            fullName: 'System Administrator',
            email: 'administrator@zedsonwatchcraft.com',
            status: 'active',
            firstLogin: false,
            createdBy: 'system'
        });
        
        const savedAdmin = await adminUser.save();
        
        console.log('✅ Alternative admin user created successfully!');
        console.log('📋 Alternative Admin Details:');
        console.log(`   Username: ${savedAdmin.username}`);
        console.log(`   Password: admin123`);
        console.log(`   Role: ${savedAdmin.role}`);
        console.log(`   Email: ${savedAdmin.email}`);
        
        return savedAdmin;
    } catch (error) {
        console.error('❌ Error creating alternative admin:', error.message);
        return null;
    }
}

async function createOwnerAndStaffUsers() {
    try {
        console.log('👥 Creating owner and staff users...');
        
        const users = [
            {
                username: 'owner',
                password: await bcrypt.hash('owner123', 10),
                role: 'owner',
                fullName: 'Shop Owner',
                email: 'owner@zedsonwatchcraft.com',
                status: 'active',
                firstLogin: false,
                createdBy: 'system'
            },
            {
                username: 'staff',
                password: await bcrypt.hash('staff123', 10),
                role: 'staff',
                fullName: 'Staff Member',
                email: 'staff@zedsonwatchcraft.com',
                status: 'active',
                firstLogin: false,
                createdBy: 'system'
            }
        ];
        
        const savedUsers = await User.insertMany(users);
        
        console.log('✅ Owner and staff users created successfully!');
        savedUsers.forEach(user => {
            console.log(`   ${user.role}: ${user.username} / ${user.role}123`);
        });
        
        return savedUsers;
    } catch (error) {
        console.error('❌ Error creating additional users:', error.message);
        return [];
    }
}

async function promptUserAction() {
    return new Promise((resolve) => {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('\n🤔 What would you like to do?');
        console.log('   1. Create admin user anyway (if none exist)');
        console.log('   2. Force create new admin user');
        console.log('   3. Create all default users (admin, owner, staff)');
        console.log('   4. Exit without changes');
        
        readline.question('\nEnter your choice (1-4): ', (answer) => {
            readline.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    try {
        // Connect to database
        const connected = await connectToDatabase();
        if (!connected) {
            process.exit(1);
        }
        
        // Check for existing admin users
        const adminExists = await checkExistingAdmin();
        
        let choice;
        if (adminExists) {
            choice = await promptUserAction();
        } else {
            choice = '1'; // Auto-create if no admin exists
        }
        
        switch (choice) {
            case '1':
                if (!adminExists) {
                    await createAdminUser();
                } else {
                    console.log('⚠️  Admin already exists. No action taken.');
                }
                break;
                
            case '2':
                let admin = await createAdminUser();
                if (!admin) {
                    admin = await createAlternativeAdmin();
                }
                break;
                
            case '3':
                await createAdminUser();
                await createOwnerAndStaffUsers();
                break;
                
            case '4':
                console.log('👋 Exiting without changes.');
                break;
                
            default:
                console.log('❌ Invalid choice. Exiting.');
                break;
        }
        
        console.log('\n🎉 Script execution completed!');
        console.log('💝 ZEDSON WATCHCRAFT - Powered by PULSEWARE❤️');
        
    } catch (error) {
        console.error('❌ Script execution failed:', error.message);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Handle script termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Script interrupted by user');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    await mongoose.connection.close();
    process.exit(1);
});

// Run the script
console.log('🚀 Starting admin user injection script...');
main();