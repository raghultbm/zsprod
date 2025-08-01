const { ipcRenderer } = require('electron');

let currentUser = null;
let customers = [];
let users = [];
let inventory = [];
let filteredInventory = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const userSession = sessionStorage.getItem('currentUser');
    if (!userSession) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userSession);
    
    // Update user info in sidebar
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    
    // Hide user management for non-admin users
    if (currentUser.role !== 'admin') {
        document.getElementById('usersNav').style.display = 'none';
    }
    
    // Load initial data
    await loadDashboardStats();
    await loadCustomers();
    await loadInventory();
    if (currentUser.role === 'admin') {
        await loadUsers();
    }
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.dataset.module;
            switchModule(module);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    
    // Forms
    document.getElementById('customerForm').addEventListener('submit', handleCustomerForm);
    document.getElementById('userForm').addEventListener('submit', handleUserForm);
    document.getElementById('inventoryForm').addEventListener('submit', handleInventoryForm);
}

function switchModule(module) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-module="${module}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.module-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${module}-content`).classList.add('active');
    
    // Update page title and actions
    updatePageHeader(module);
}

function updatePageHeader(module) {
    const pageTitle = document.getElementById('pageTitle');
    const headerActions = document.getElementById('headerActions');
    
    headerActions.innerHTML = '';
    
    switch (module) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard';
            break;
        case 'customers':
            pageTitle.textContent = 'Customer Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="openCustomerModal()">Add Customer</button>';
            break;
        case 'inventory':
            pageTitle.textContent = 'Inventory Management';
            headerActions.innerHTML = '<button class="btn btn-primary" onclick="openInventoryModal()">Add Item</button>';
            break;
        case 'users':
            pageTitle.textContent = 'User Management';
            if (currentUser.role === 'admin') {
                headerActions.innerHTML = '<button class="btn btn-primary" onclick="openUserModal()">Add User</button>';
            }
            break;
        default:
            pageTitle.textContent = module.charAt(0).toUpperCase() + module.slice(1);
    }
}

async function loadDashboardStats() {
    try {
        const [customersData, usersData, inventoryData] = await Promise.all([
            ipcRenderer.invoke('get-customers'),
            ipcRenderer.invoke('get-users'),
            ipcRenderer.invoke('get-inventory')
        ]);
        
        document.getElementById('totalCustomers').textContent = customersData.length;
        document.getElementById('totalUsers').textContent = usersData.length;
        document.getElementById('totalItems').textContent = inventoryData.length;
        
        // Count low stock items
        const lowStockCount = inventoryData.filter(item => item.quantity <= item.min_stock_level).length;
        document.getElementById('lowStockItems').textContent = lowStockCount;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadCustomers() {
    try {
        customers = await ipcRenderer.invoke('get-customers');
        renderCustomersTable();
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function renderCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.id}</td>
            <td>${customer.name}</td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.email || '-'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editCustomer(${customer.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadInventory() {
    try {
        inventory = await ipcRenderer.invoke('get-inventory');
        filteredInventory = [...inventory];
        renderInventoryTable();
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

async function loadUsers() {
    try {
        users = await ipcRenderer.invoke('get-users');
        renderUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.full_name}</td>
            <td>${user.role}</td>
            <td>${user.email || '-'}</td>
            <td>
                <span class="status ${user.is_active ? 'active' : 'inactive'}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})">Edit</button>
                ${user.id !== currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Customer functions
function openCustomerModal(customer = null) {
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const title = document.getElementById('customerModalTitle');
    
    form.reset();
    
    if (customer) {
        title.textContent = 'Edit Customer';
        document.getElementById('customerId').value = customer.id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';
    } else {
        title.textContent = 'Add Customer';
        document.getElementById('customerId').value = '';
    }
    
    modal.style.display = 'block';
}

function editCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (customer) {
        openCustomerModal(customer);
    }
}

async function deleteCustomer(id) {
    if (confirm('Are you sure you want to delete this customer?')) {
        try {
            await ipcRenderer.invoke('delete-customer', id);
            await loadCustomers();
            await loadDashboardStats();
        } catch (error) {
            alert('Error deleting customer: ' + error.message);
        }
    }
}

async function handleCustomerForm(e) {
    e.preventDefault();
    
    const customerData = {
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        email: document.getElementById('customerEmail').value
    };
    
    const customerId = document.getElementById('customerId').value;
    
    try {
        if (customerId) {
            customerData.id = parseInt(customerId);
            await ipcRenderer.invoke('update-customer', customerData);
        } else {
            await ipcRenderer.invoke('add-customer', customerData);
        }
        
        closeModal('customerModal');
        await loadCustomers();
        await loadDashboardStats();
    } catch (error) {
        alert('Error saving customer: ' + error.message);
    }
}

// Inventory functions
function openInventoryModal(item = null) {
    const modal = document.getElementById('inventoryModal');
    const form = document.getElementById('inventoryForm');
    const title = document.getElementById('inventoryModalTitle');
    
    form.reset();
    
    if (item) {
        title.textContent = 'Edit Inventory Item';
        document.getElementById('inventoryId').value = item.id;
        document.getElementById('itemCode').value = item.code;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemCategory').value = item.category;
        document.getElementById('itemBrand').value = item.brand || '';
        document.getElementById('itemModel').value = item.model || '';
        document.getElementById('itemDescription').value = item.description || '';
        document.getElementById('itemCostPrice').value = item.cost_price || '';
        document.getElementById('itemSellingPrice').value = item.selling_price || '';
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemMinStock').value = item.min_stock_level;
        document.getElementById('itemSupplier').value = item.supplier || '';
        document.getElementById('itemWarranty').value = item.warranty_period || '';
        document.getElementById('itemLocation').value = item.location || '';
    } else {
        title.textContent = 'Add Inventory Item';
        document.getElementById('inventoryId').value = '';
        document.getElementById('itemQuantity').value = '0';
        document.getElementById('itemMinStock').value = '5';
    }
    
    modal.style.display = 'block';
}

function editInventoryItem(id) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        openInventoryModal(item);
    }
}

async function deleteInventoryItem(id) {
    if (confirm('Are you sure you want to delete this inventory item?')) {
        try {
            await ipcRenderer.invoke('delete-inventory-item', id);
            await loadInventory();
            await loadDashboardStats();
        } catch (error) {
            alert('Error deleting inventory item: ' + error.message);
        }
    }
}

async function handleInventoryForm(e) {
    e.preventDefault();
    
    const itemData = {
        code: document.getElementById('itemCode').value.toUpperCase().trim(),
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        brand: document.getElementById('itemBrand').value,
        model: document.getElementById('itemModel').value,
        description: document.getElementById('itemDescription').value,
        cost_price: document.getElementById('itemCostPrice').value || null,
        selling_price: document.getElementById('itemSellingPrice').value || null,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        min_stock_level: parseInt(document.getElementById('itemMinStock').value),
        supplier: document.getElementById('itemSupplier').value,
        warranty_period: document.getElementById('itemWarranty').value,
        location: document.getElementById('itemLocation').value
    };
    
    const itemId = document.getElementById('inventoryId').value;
    
    try {
        if (itemId) {
            itemData.id = parseInt(itemId);
            await ipcRenderer.invoke('update-inventory-item', itemData);
        } else {
            await ipcRenderer.invoke('add-inventory-item', itemData);
        }
        
        closeModal('inventoryModal');
        await loadInventory();
        await loadDashboardStats();
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            alert('Error: Item code already exists. Please use a different code.');
        } else {
            alert('Error saving inventory item: ' + error.message);
        }
    }
}

// Search and filter functions
async function searchInventory() {
    const searchTerm = document.getElementById('inventorySearch').value.trim();
    
    if (searchTerm) {
        try {
            filteredInventory = await ipcRenderer.invoke('search-inventory', searchTerm);
            renderInventoryTable();
        } catch (error) {
            console.error('Error searching inventory:', error);
        }
    } else {
        clearSearch();
    }
}

function clearSearch() {
    document.getElementById('inventorySearch').value = '';
    document.getElementById('categoryFilter').value = '';
    filteredInventory = [...inventory];
    renderInventoryTable();
}

function filterByCategory() {
    const category = document.getElementById('categoryFilter').value;
    
    if (category) {
        filteredInventory = inventory.filter(item => item.category === category);
    } else {
        filteredInventory = [...inventory];
    }
    
    renderInventoryTable();
}

// User functions
function openUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    const passwordGroup = document.getElementById('passwordGroup');
    const passwordField = document.getElementById('userPassword');
    
    form.reset();
    
    if (user) {
        title.textContent = 'Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userFullName').value = user.full_name;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userActive').checked = user.is_active;
        
        // Hide password field for editing
        passwordGroup.style.display = 'none';
        passwordField.removeAttribute('required');
    } else {
        title.textContent = 'Add User';
        document.getElementById('userId').value = '';
        passwordGroup.style.display = 'block';
        passwordField.setAttribute('required', 'required');
        document.getElementById('userActive').checked = true;
    }
    
    modal.style.display = 'block';
}

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        openUserModal(user);
    }
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await ipcRenderer.invoke('delete-user', id);
            await loadUsers();
            await loadDashboardStats();
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    }
}

async function handleUserForm(e) {
    e.preventDefault();
    
    const userData = {
        username: document.getElementById('userUsername').value,
        full_name: document.getElementById('userFullName').value,
        role: document.getElementById('userRole').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        is_active: document.getElementById('userActive').checked ? 1 : 0
    };
    
    const userId = document.getElementById('userId').value;
    
    if (!userId) {
        userData.password = document.getElementById('userPassword').value;
    }
    
    try {
        if (userId) {
            userData.id = parseInt(userId);
            await ipcRenderer.invoke('update-user', userData);
        } else {
            await ipcRenderer.invoke('add-user', userData);
        }
        
        closeModal('userModal');
        await loadUsers();
        await loadDashboardStats();
    } catch (error) {
        alert('Error saving user: ' + error.message);
    }
}

// Modal functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});