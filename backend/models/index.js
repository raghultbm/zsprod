// File: backend/models/index.js
// ZEDSON WATCHCRAFT - MongoDB Models
// Developed by PULSEWARE❤️

const mongoose = require('mongoose');

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
    timestamps: true
});

// Inventory Schema
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
    timestamps: true
});

// Sales Schema
const SalesSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
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
}, {
    timestamps: true
});

// Service Schema
const ServiceSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
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
}, {
    timestamps: true
});

// Expense Schema
const ExpenseSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    date: { type: String, required: true },
    formattedDate: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: String, required: true },
    createdBy: { type: String },
}, {
    timestamps: true
});

// Invoice Schema
const InvoiceSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
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
    // Additional fields for different invoice types
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
}, {
    timestamps: true
});

// Activity Log Schema
const ActivityLogSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    timestamp: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    username: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    category: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    sessionId: { type: String },
}, {
    timestamps: true
});

// Auto-increment plugin for ID fields
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Apply auto-increment to schemas
CustomerSchema.plugin(AutoIncrement, {inc_field: 'id'});
InventorySchema.plugin(AutoIncrement, {inc_field: 'id'});
SalesSchema.plugin(AutoIncrement, {inc_field: 'id'});
ServiceSchema.plugin(AutoIncrement, {inc_field: 'id'});
ExpenseSchema.plugin(AutoIncrement, {inc_field: 'id'});
InvoiceSchema.plugin(AutoIncrement, {inc_field: 'id'});
ActivityLogSchema.plugin(AutoIncrement, {inc_field: 'id'});

// Create Models
const User = mongoose.model('User', UserSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);
const Sales = mongoose.model('Sales', SalesSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

module.exports = {
    User,
    Customer,
    Inventory,
    Sales,
    Service,
    Expense,
    Invoice,
    ActivityLog
};