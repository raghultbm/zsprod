const { ipcRenderer } = require('electron');

let currentUser = null;
let customers = [];
let users = [];
let inventory = [];
let filteredInventory = [];

// Sales variables
let saleItems = [];
let salePayments = [];
let selectedCustomer = null;
let selectedItem = null;
let sales = [];

// Service module variables
let serviceItems = [];
let selectedServiceCustomer = null;
let serviceJobs = [];
let currentServiceJob = null;

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

    // Sales event listeners
    setupSalesEventListeners();
    
    // Service event listeners
    setupServiceEventListeners();
}

function setupSalesEventListeners() {
    // Customer search functionality
    const customerSearch = document.getElementById('customerSearch');
    if (customerSearch) {
        let customerSearchTimeout;
        customerSearch.addEventListener('input', (e) => {
            clearTimeout(customerSearchTimeout);
            customerSearchTimeout = setTimeout(() => {
                searchCustomers(e.target.value);
            }, 300);
        });

        customerSearch.addEventListener('blur', () => {
            setTimeout(() => {
                document.getElementById('customerSuggestions').style.display = 'none';
            }, 200);
        });
    }

    // Item search functionality
    const itemCodeSearch = document.getElementById('itemCodeSearch');
    if (itemCodeSearch) {
        let itemSearchTimeout;
        itemCodeSearch.addEventListener('input', (e) => {
            clearTimeout(itemSearchTimeout);
            itemSearchTimeout = setTimeout(() => {
                searchItems(e.target.value);
            }, 300);
        });

        itemCodeSearch.addEventListener('blur', () => {
            setTimeout(() => {
                document.getElementById('itemSuggestions').style.display = 'none';
            }, 200);
        });
    }

    // Discount type change
    const discountType = document.getElementById('discountType');
    if (discountType) {
        discountType.addEventListener('change', toggleDiscountInput);
    }
}

// Service module setup
function setupServiceEventListeners() {
    // Customer search functionality
    const serviceCustomerSearch = document.getElementById('serviceCustomerSearch');
    if (serviceCustomerSearch) {
        let customerSearchTimeout;
        serviceCustomerSearch.addEventListener('input', (e) => {
            clearTimeout(customerSearchTimeout);
            customerSearchTimeout = setTimeout(() => {
                searchServiceCustomers(e.target.value);
            }, 300);
        });

        serviceCustomerSearch.addEventListener('blur', () => {
            setTimeout(() => {
                document.getElementById('serviceCustomerSuggestions').style.display = 'none';
            }, 200);
        });
    }

    // Form submissions
    document.getElementById('serviceItemForm').addEventListener('submit', handleServiceItemForm);
    document.getElementById('updateServiceStatusForm').addEventListener('submit', handleUpdateServiceStatus);
    document.getElementById('completeServiceForm').addEventListener('submit', handleCompleteService);
    document.getElementById('addCommentForm').addEventListener('submit', handleAddComment);
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
    
    // Load module-specific data
    if (module === 'sales') {
        loadSales();
    } else if (module === 'service') {
        loadServiceJobs();
    }
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
        case 'sales':
            pageTitle.textContent = 'Sales Management';
            break;
        case 'service':
            pageTitle.textContent = 'Service Management';
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
        
        // Count low stock items (items with quantity <= 5)
        const lowStockCount = inventoryData.filter(item => item.quantity <= 5).length;
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

// Add service button to customer module
function addServiceTriggerToCustomers() {
    // This function should be called when customers table is rendered
    // Add a service button to each customer row
    const customerRows = document.querySelectorAll('#customersTableBody tr');
    customerRows.forEach((row, index) => {
        const actionsCell = row.lastElementChild;
        const customerId = customers[index].id;
        const serviceBtn = document.createElement('button');
        serviceBtn.className = 'btn btn-sm btn-secondary customer-service-trigger';
        serviceBtn.textContent = 'Service';
        serviceBtn.onclick = () => triggerServiceFromCustomer(customerId);
        actionsCell.appendChild(serviceBtn);
    });
}

function triggerServiceFromCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        // Switch to service module
        switchModule('service');
        
        // Pre-populate customer
        setTimeout(() => {
            selectServiceCustomer(customer.id, customer.name, customer.phone || '');
        }, 100);
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
    
    // Add service buttons after rendering
    addServiceTriggerToCustomers();
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
async function loadInventory() {
    try {
        inventory = await ipcRenderer.invoke('get-inventory');
        filteredInventory = [...inventory];
        renderInventoryTable();
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// Function to toggle category-specific fields
function toggleCategoryFields() {
    const category = document.getElementById('itemCategory').value;
    
    // Hide all category-specific fields
    document.getElementById('watchClockFields').style.display = 'none';
    document.getElementById('strapFields').style.display = 'none';
    document.getElementById('batteryFields').style.display = 'none';
    document.getElementById('genderField').style.display = 'none';
    
    // Clear all conditional fields
    document.getElementById('itemType').value = '';
    document.getElementById('itemGender').value = '';
    document.getElementById('itemMaterial').value = '';
    document.getElementById('itemSize').value = '';
    document.getElementById('itemBatteryCode').value = '';
    
    // Show relevant fields based on category
    if (category === 'watch') {
        document.getElementById('watchClockFields').style.display = 'block';
        document.getElementById('genderField').style.display = 'block';
    } else if (category === 'clock' || category === 'timepiece') {
        document.getElementById('watchClockFields').style.display = 'block';
    } else if (category === 'strap') {
        document.getElementById('strapFields').style.display = 'block';
    } else if (category === 'battery') {
        document.getElementById('batteryFields').style.display = 'block';
    }
}

// Updated inventory table rendering
function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    filteredInventory.forEach(item => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(item.date_added).toLocaleDateString();
        
        // Build details column based on category
        let details = '';
        if (item.category === 'watch') {
            details = `${item.type || ''} ${item.gender || ''}`.trim();
        } else if (item.category === 'clock' || item.category === 'timepiece') {
            details = item.type || '';
        } else if (item.category === 'strap') {
            details = `${item.material || ''} ${item.size_mm ? item.size_mm + 'mm' : ''}`.trim();
        } else if (item.category === 'battery') {
            details = item.battery_code || '';
        }
        
        // Format warranty
        const warranty = item.warranty_months ? `${item.warranty_months} months` : '-';
        
        // Format price
        const price = item.price ? `₹${parseFloat(item.price).toFixed(2)}` : '-';
        
        // Capitalize outlet name
        const outlet = item.outlet ? item.outlet.charAt(0).toUpperCase() + item.outlet.slice(1) : '-';
        
        row.innerHTML = `
            <td>${item.item_code}</td>
            <td>${date}</td>
            <td><span class="category-badge ${item.category}">${item.category}</span></td>
            <td>${item.brand || '-'}</td>
            <td>${details || '-'}</td>
            <td>${item.quantity}</td>
            <td>${warranty}</td>
            <td>${price}</td>
            <td>${outlet}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editInventoryItem(${item.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteInventoryItem(${item.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Updated open inventory modal function
function openInventoryModal(item = null) {
    const modal = document.getElementById('inventoryModal');
    const form = document.getElementById('inventoryForm');
    const title = document.getElementById('inventoryModalTitle');
    
    form.reset();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateAdded').value = today;
    
    if (item) {
        title.textContent = 'Edit Inventory Item';
        document.getElementById('inventoryId').value = item.id;
        document.getElementById('itemCode').value = item.item_code;
        document.getElementById('dateAdded').value = item.date_added;
        document.getElementById('itemCategory').value = item.category;
        document.getElementById('itemBrand').value = item.brand || '';
        document.getElementById('itemType').value = item.type || '';
        document.getElementById('itemGender').value = item.gender || '';
        document.getElementById('itemMaterial').value = item.material || '';
        document.getElementById('itemSize').value = item.size_mm || '';
        document.getElementById('itemBatteryCode').value = item.battery_code || '';
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemWarranty').value = item.warranty_months || '';
        document.getElementById('itemPrice').value = item.price || '';
        document.getElementById('itemOutlet').value = item.outlet;
        document.getElementById('itemComments').value = item.comments || '';
        
        // Show relevant fields for the category
        toggleCategoryFields();
    } else {
        title.textContent = 'Add Inventory Item';
        document.getElementById('inventoryId').value = '';
        document.getElementById('itemQuantity').value = '0';
        
        // Hide all category fields initially
        toggleCategoryFields();
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

// Updated handle inventory form function
async function handleInventoryForm(e) {
    e.preventDefault();
    
    const itemData = {
        item_code: document.getElementById('itemCode').value.toUpperCase().trim(),
        date_added: document.getElementById('dateAdded').value,
        category: document.getElementById('itemCategory').value,
        brand: document.getElementById('itemBrand').value || null,
        type: document.getElementById('itemType').value || null,
        gender: document.getElementById('itemGender').value || null,
        material: document.getElementById('itemMaterial').value || null,
        size_mm: document.getElementById('itemSize').value || null,
        battery_code: document.getElementById('itemBatteryCode').value || null,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        warranty_months: document.getElementById('itemWarranty').value || null,
        price: parseFloat(document.getElementById('itemPrice').value),
        outlet: document.getElementById('itemOutlet').value,
        comments: document.getElementById('itemComments').value || null
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
    document.getElementById('outletFilter').value = '';
    filteredInventory = [...inventory];
    renderInventoryTable();
}

function filterByCategory() {
    const category = document.getElementById('categoryFilter').value;
    const outlet = document.getElementById('outletFilter').value;
    
    filteredInventory = inventory.filter(item => {
        const matchesCategory = !category || item.category === category;
        const matchesOutlet = !outlet || item.outlet === outlet;
        return matchesCategory && matchesOutlet;
    });
    
    renderInventoryTable();
}

// Updated filter by outlet function
function filterByOutlet() {
    const outlet = document.getElementById('outletFilter').value;
    const category = document.getElementById('categoryFilter').value;
    
    filteredInventory = inventory.filter(item => {
        const matchesOutlet = !outlet || item.outlet === outlet;
        const matchesCategory = !category || item.category === category;
        return matchesOutlet && matchesCategory;
    });
    
    renderInventoryTable();
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
// Sales Module Functions
async function loadSales() {
    try {
        sales = await ipcRenderer.invoke('get-sales');
        renderSalesHistory();
    } catch (error) {
        console.error('Error loading sales:', error);
    }
}

async function searchCustomers(searchTerm) {
    if (searchTerm.length < 2) {
        document.getElementById('customerSuggestions').style.display = 'none';
        return;
    }

    try {
        const customers = await ipcRenderer.invoke('search-customers', searchTerm);
        displayCustomerSuggestions(customers);
    } catch (error) {
        console.error('Error searching customers:', error);
    }
}

function displayCustomerSuggestions(customers) {
    const suggestionsDiv = document.getElementById('customerSuggestions');
    
    if (customers.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    suggestionsDiv.innerHTML = customers.map(customer => 
        `<div class="suggestion-item" onclick="selectCustomer(${customer.id}, '${customer.name}', '${customer.phone || ''}')">
            <strong>${customer.name}</strong>
            ${customer.phone ? `<br><small>${customer.phone}</small>` : ''}
        </div>`
    ).join('');
    
    suggestionsDiv.style.display = 'block';
}

function selectCustomer(id, name, phone) {
    selectedCustomer = { id, name, phone };
    document.getElementById('selectedCustomer').value = `${name} ${phone ? `(${phone})` : ''}`;
    document.getElementById('selectedCustomerId').value = id;
    document.getElementById('customerSearch').value = '';
    document.getElementById('customerSuggestions').style.display = 'none';
}

async function searchItems(searchTerm) {
    if (searchTerm.length < 2) {
        document.getElementById('itemSuggestions').style.display = 'none';
        return;
    }

    try {
        // First try to get exact match by code
        const exactMatch = await ipcRenderer.invoke('get-inventory-by-code', searchTerm.toUpperCase());
        if (exactMatch) {
            selectItem(exactMatch);
            return;
        }

        // Otherwise search for partial matches
        const items = await ipcRenderer.invoke('search-inventory-for-sale', searchTerm);
        displayItemSuggestions(items);
    } catch (error) {
        console.error('Error searching items:', error);
    }
}

function displayItemSuggestions(items) {
    const suggestionsDiv = document.getElementById('itemSuggestions');
    
    if (items.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    suggestionsDiv.innerHTML = items.map(item => 
        `<div class="suggestion-item" onclick="selectItemFromSuggestion(${item.id})">
            <strong>${item.item_code}</strong> - ${item.brand || 'No Brand'}
            <br><small>Stock: ${item.quantity} | Price: ₹${item.price || 0}</small>
        </div>`
    ).join('');
    
    suggestionsDiv.style.display = 'block';
}

async function selectItemFromSuggestion(itemId) {
    try {
        const items = await ipcRenderer.invoke('get-inventory');
        const selectedItem = items.find(i => i.id === itemId);
        if (selectedItem) {
            selectItem(selectedItem);
        }
    } catch (error) {
        console.error('Error selecting item:', error);
    }
}

function selectItem(item) {
    selectedItem = item;
    document.getElementById('itemCodeSearch').value = item.item_code;
    document.getElementById('itemPrice').value = item.price || 0;
    document.getElementById('itemSuggestions').style.display = 'none';
    
    // Set max quantity to available stock
    const quantityInput = document.getElementById('itemQuantity');
    quantityInput.max = item.quantity;
    
    if (item.quantity === 0) {
        alert('This item is out of stock');
        clearItemSelection();
    }
}

function clearItemSelection() {
    selectedItem = null;
    document.getElementById('itemCodeSearch').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('discountType').value = 'none';
    document.getElementById('discountValue').value = '';
    toggleDiscountInput();
}

function toggleDiscountInput() {
    const discountType = document.getElementById('discountType').value;
    const discountValueInput = document.getElementById('discountValue');
    
    if (discountType === 'none') {
        discountValueInput.disabled = true;
        discountValueInput.value = '';
    } else {
        discountValueInput.disabled = false;
    }
}

function addItemToSale() {
    if (!selectedItem) {
        alert('Please select an item first');
        return;
    }

    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const price = parseFloat(document.getElementById('itemPrice').value);
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;

    if (quantity <= 0 || quantity > selectedItem.quantity) {
        alert(`Invalid quantity. Available stock: ${selectedItem.quantity}`);
        return;
    }

    if (price <= 0) {
        alert('Price must be greater than 0');
        return;
    }

    // Calculate line total
    const subtotal = quantity * price;
    let discount = 0;
    
    if (discountType === 'percentage') {
        discount = (subtotal * discountValue) / 100;
    } else if (discountType === 'amount') {
        discount = discountValue;
    }
    
    const lineTotal = subtotal - discount;

    // Check if item already exists in sale
    const existingItemIndex = saleItems.findIndex(item => item.inventory_id === selectedItem.id);
    
    if (existingItemIndex >= 0) {
        // Update existing item
        const existingItem = saleItems[existingItemIndex];
        existingItem.quantity += quantity;
        existingItem.line_total = (existingItem.quantity * existingItem.unit_price) - existingItem.discount_amount;
    } else {
        // Add new item
        saleItems.push({
            inventory_id: selectedItem.id,
            item_code: selectedItem.item_code,
            item_name: `${selectedItem.brand || ''} ${selectedItem.category}`.trim(),
            quantity: quantity,
            unit_price: price,
            discount_type: discountType,
            discount_value: discountValue,
            discount_amount: discount,
            line_total: lineTotal,
            available_stock: selectedItem.quantity
        });
    }

    renderSaleItems();
    calculateSaleTotals();
    clearItemSelection();
}

function renderSaleItems() {
    const tbody = document.getElementById('saleItemsTableBody');
    const noItemsMessage = document.getElementById('noItemsMessage');
    
    if (saleItems.length === 0) {
        tbody.innerHTML = '';
        noItemsMessage.style.display = 'block';
        return;
    }

    noItemsMessage.style.display = 'none';
    tbody.innerHTML = saleItems.map((item, index) => {
        const discountText = item.discount_type === 'none' ? '-' : 
                           item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                           `₹${item.discount_value}`;
        
        return `
            <tr>
                <td>${item.item_code}</td>
                <td>${item.item_name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unit_price.toFixed(2)}</td>
                <td>${discountText}</td>
                <td>₹${item.line_total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="removeSaleItem(${index})">Remove</button>
                </td>
            </tr>
        `;
    }).join('');
}

function removeSaleItem(index) {
    saleItems.splice(index, 1);
    renderSaleItems();
    calculateSaleTotals();
}

function calculateSaleTotals() {
    const subtotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalDiscount = saleItems.reduce((sum, item) => sum + item.discount_amount, 0);
    const totalAmount = subtotal - totalDiscount;

    document.getElementById('saleSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('saleTotalDiscount').textContent = `₹${totalDiscount.toFixed(2)}`;
    document.getElementById('saleTotalAmount').textContent = `₹${totalAmount.toFixed(2)}`;
    
    // Update payment amount for single payment
    document.getElementById('paymentAmount').value = totalAmount.toFixed(2);
    
    // Update multiple payments total
    updateMultiplePaymentsTotal();
}

function toggleMultiplePayments() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const singlePaymentSection = document.getElementById('singlePaymentAmount');
    const multiplePaymentsSection = document.getElementById('multiplePaymentsSection');
    
    if (paymentMethod === 'multiple') {
        singlePaymentSection.style.display = 'none';
        multiplePaymentsSection.style.display = 'block';
        initializeMultiplePayments();
    } else {
        singlePaymentSection.style.display = 'block';
        multiplePaymentsSection.style.display = 'none';
        salePayments = [];
    }
}

function initializeMultiplePayments() {
    salePayments = [];
    const paymentBreakdown = document.getElementById('paymentBreakdown');
    paymentBreakdown.innerHTML = '';
    addPaymentMethod();
}

function addPaymentMethod() {
    const paymentBreakdown = document.getElementById('paymentBreakdown');
    const paymentIndex = salePayments.length;
    
    const paymentDiv = document.createElement('div');
    paymentDiv.className = 'payment-method-row';
    paymentDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <select onchange="updatePaymentMethod(${paymentIndex}, this.value)">
                    <option value="">Select Method</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                </select>
            </div>
            <div class="form-group">
                <input type="number" step="0.01" min="0" placeholder="Amount" 
                       onchange="updatePaymentAmount(${paymentIndex}, this.value)">
            </div>
            <div class="form-group">
                <input type="text" placeholder="Reference (optional)" 
                       onchange="updatePaymentReference(${paymentIndex}, this.value)">
            </div>
            <div class="form-group">
                <button type="button" onclick="removePaymentMethod(${paymentIndex})" 
                        class="btn btn-sm btn-danger">Remove</button>
            </div>
        </div>
    `;
    
    paymentBreakdown.appendChild(paymentDiv);
    salePayments.push({ payment_method: '', amount: 0, payment_reference: '' });
}

function updatePaymentMethod(index, method) {
    salePayments[index].payment_method = method;
    validatePayments();
}

function updatePaymentAmount(index, amount) {
    salePayments[index].amount = parseFloat(amount) || 0;
    validatePayments();
}

function updatePaymentReference(index, reference) {
    salePayments[index].payment_reference = reference;
}

function removePaymentMethod(index) {
    salePayments.splice(index, 1);
    
    // Re-render payment breakdown
    const paymentBreakdown = document.getElementById('paymentBreakdown');
    paymentBreakdown.innerHTML = '';
    
    salePayments.forEach((payment, i) => {
        const paymentDiv = document.createElement('div');
        paymentDiv.className = 'payment-method-row';
        paymentDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <select onchange="updatePaymentMethod(${i}, this.value)">
                        <option value="">Select Method</option>
                        <option value="cash" ${payment.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
                        <option value="upi" ${payment.payment_method === 'upi' ? 'selected' : ''}>UPI</option>
                        <option value="card" ${payment.payment_method === 'card' ? 'selected' : ''}>Card</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="number" step="0.01" min="0" placeholder="Amount" value="${payment.amount}"
                           onchange="updatePaymentAmount(${i}, this.value)">
                </div>
                <div class="form-group">
                    <input type="text" placeholder="Reference (optional)" value="${payment.payment_reference}"
                           onchange="updatePaymentReference(${i}, this.value)">
                </div>
                <div class="form-group">
                    <button type="button" onclick="removePaymentMethod(${i})" 
                            class="btn btn-sm btn-danger">Remove</button>
                </div>
            </div>
        `;
        paymentBreakdown.appendChild(paymentDiv);
    });
    
    validatePayments();
}

function updateMultiplePaymentsTotal() {
    // This function can be used to show remaining amount in multiple payments
    const totalAmount = parseFloat(document.getElementById('saleTotalAmount').textContent.replace('₹', ''));
    const totalPaid = salePayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = totalAmount - totalPaid;
    
    // You can add a remaining amount display if needed
}

function validatePayments() {
    const totalAmount = parseFloat(document.getElementById('saleTotalAmount').textContent.replace('₹', ''));
    const totalPaid = salePayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const completeSaleBtn = document.getElementById('completeSaleBtn');
    if (Math.abs(totalAmount - totalPaid) < 0.01) {
        completeSaleBtn.disabled = false;
        completeSaleBtn.textContent = 'Complete Sale';
    } else {
        completeSaleBtn.disabled = true;
        completeSaleBtn.textContent = `Complete Sale (₹${(totalAmount - totalPaid).toFixed(2)} remaining)`;
    }
}
function previewSale() {
    if (saleItems.length === 0) {
        alert('Please add at least one item to the sale');
        return;
    }

    const paymentMethod = document.getElementById('paymentMethod').value;
    
    // Validate payments
    if (paymentMethod === 'multiple') {
        const totalAmount = parseFloat(document.getElementById('saleTotalAmount').textContent.replace('₹', ''));
        const totalPaid = salePayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        if (Math.abs(totalAmount - totalPaid) > 0.01) {
            alert('Payment amounts do not match the total amount');
            return;
        }
        
        const incompletePayments = salePayments.filter(p => !p.payment_method || p.amount <= 0);
        if (incompletePayments.length > 0) {
            alert('Please complete all payment method details');
            return;
        }
    } else {
        // Single payment method
        const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
        const totalAmount = parseFloat(document.getElementById('saleTotalAmount').textContent.replace('₹', ''));
        
        if (Math.abs(paymentAmount - totalAmount) > 0.01) {
            alert('Payment amount does not match total amount');
            return;
        }
        
        salePayments = [{
            payment_method: paymentMethod,
            amount: paymentAmount,
            payment_reference: ''
        }];
    }

    // Populate confirmation modal
    populateConfirmationModal();
    document.getElementById('saleConfirmationModal').style.display = 'block';
}

function populateConfirmationModal() {
    // Customer details
    const customerDetails = selectedCustomer ? 
        `${selectedCustomer.name} ${selectedCustomer.phone ? `(${selectedCustomer.phone})` : ''}` : 
        'Walk-in Customer';
    document.getElementById('confirmCustomerDetails').textContent = customerDetails;

    // Items
    const confirmItemsBody = document.getElementById('confirmItemsTableBody');
    confirmItemsBody.innerHTML = saleItems.map(item => {
        const discountText = item.discount_type === 'none' ? '-' : 
                           item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                           `₹${item.discount_value}`;
        
        return `
            <tr>
                <td>${item.item_code}</td>
                <td>${item.item_name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unit_price.toFixed(2)}</td>
                <td>${discountText}</td>
                <td>₹${item.line_total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    // Payment details
    const confirmPaymentDetails = document.getElementById('confirmPaymentDetails');
    confirmPaymentDetails.innerHTML = salePayments.map(payment => `
        <div class="payment-detail-row">
            <span>${payment.payment_method.toUpperCase()}: ₹${payment.amount.toFixed(2)}</span>
            ${payment.payment_reference ? `<small>Ref: ${payment.payment_reference}</small>` : ''}
        </div>
    `).join('');

    // Summary
    document.getElementById('confirmSubtotal').textContent = document.getElementById('saleSubtotal').textContent;
    document.getElementById('confirmTotalDiscount').textContent = document.getElementById('saleTotalDiscount').textContent;
    document.getElementById('confirmTotalAmount').textContent = document.getElementById('saleTotalAmount').textContent;
}

async function confirmSale() {
    try {
        const subtotal = parseFloat(document.getElementById('saleSubtotal').textContent.replace('₹', ''));
        const totalDiscount = parseFloat(document.getElementById('saleTotalDiscount').textContent.replace('₹', ''));
        const totalAmount = parseFloat(document.getElementById('saleTotalAmount').textContent.replace('₹', ''));
        const notes = document.getElementById('saleNotes').value;

        const saleData = {
            sale: {
                sale_date: new Date().toISOString().split('T')[0],
                customer_id: selectedCustomer ? selectedCustomer.id : null,
                subtotal: subtotal,
                total_discount: totalDiscount,
                total_amount: totalAmount,
                notes: notes,
                created_by: currentUser.id
            },
            items: saleItems,
            payments: salePayments
        };

        const result = await ipcRenderer.invoke('create-sale', saleData);
        
        if (result.success) {
            alert('Sale completed successfully!');
            closeModal('saleConfirmationModal');
            clearSale();
            await loadSales();
            await loadDashboardStats(); // Refresh dashboard stats
        }
    } catch (error) {
        console.error('Error completing sale:', error);
        alert('Error completing sale: ' + error.message);
    }
}

function clearSale() {
    saleItems = [];
    salePayments = [];
    selectedCustomer = null;
    selectedItem = null;
    
    // Clear form inputs
    document.getElementById('customerSearch').value = '';
    document.getElementById('selectedCustomer').value = '';
    document.getElementById('selectedCustomerId').value = '';
    document.getElementById('itemCodeSearch').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemPrice').value = '';
    document.getElementById('discountType').value = 'none';
    document.getElementById('discountValue').value = '';
    document.getElementById('paymentMethod').value = 'cash';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('saleNotes').value = '';
    
    // Reset UI
    toggleDiscountInput();
    toggleMultiplePayments();
    renderSaleItems();
    calculateSaleTotals();
    
    // Hide suggestions
    document.getElementById('customerSuggestions').style.display = 'none';
    document.getElementById('itemSuggestions').style.display = 'none';
}

function renderSalesHistory() {
    const tbody = document.getElementById('salesHistoryTableBody');
    tbody.innerHTML = '';
    
    sales.slice(0, 10).forEach(sale => { // Show only last 10 sales
        const row = document.createElement('tr');
        const saleDate = new Date(sale.sale_date).toLocaleDateString();
        
        row.innerHTML = `
            <td>${saleDate}</td>
            <td>${sale.customer_name || 'Walk-in'}</td>
            <td>${sale.items || '-'}</td>
            <td>₹${parseFloat(sale.total_amount).toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewSaleDetails(${sale.id})">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function viewSaleDetails(saleId) {
    try {
        const saleDetails = await ipcRenderer.invoke('get-sale-details', saleId);
        displaySaleDetails(saleDetails);
        document.getElementById('saleDetailsModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading sale details:', error);
        alert('Error loading sale details');
    }
}

function displaySaleDetails(saleDetails) {
    const { sale, items, payments } = saleDetails;
    const content = document.getElementById('saleDetailsContent');
    
    content.innerHTML = `
        <div class="sale-detail-section">
            <h4>Sale Information</h4>
            <p><strong>Sale Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</p>
            ${sale.customer_phone ? `<p><strong>Phone:</strong> ${sale.customer_phone}</p>` : ''}
            ${sale.notes ? `<p><strong>Notes:</strong> ${sale.notes}</p>` : ''}
        </div>

        <div class="sale-detail-section">
            <h4>Items</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Discount</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => {
                        const discountText = item.discount_type === 'none' ? '-' : 
                                           item.discount_type === 'percentage' ? `${item.discount_value}%` : 
                                           `₹${item.discount_value}`;
                        return `
                            <tr>
                                <td>${item.item_code}</td>
                                <td>${item.item_name}</td>
                                <td>${item.quantity}</td>
                                <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                                <td>${discountText}</td>
                                <td>₹${parseFloat(item.line_total).toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="sale-detail-section">
            <h4>Payment Details</h4>
            ${payments.map(payment => `
                <div class="payment-detail-row">
                    <span><strong>${payment.payment_method.toUpperCase()}:</strong> ₹${parseFloat(payment.amount).toFixed(2)}</span>
                    ${payment.payment_reference ? `<br><small>Reference: ${payment.payment_reference}</small>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="sale-detail-section">
            <h4>Summary</h4>
            <div class="sale-summary">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>₹${parseFloat(sale.subtotal).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Total Discount:</span>
                    <span>₹${parseFloat(sale.total_discount).toFixed(2)}</span>
                </div>
                <div class="summary-row total-row">
                    <span>Total Amount:</span>
                    <span>₹${parseFloat(sale.total_amount).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

function printSaleReceipt() {
    // This function can be implemented to print receipts
    alert('Print receipt functionality can be implemented here');
}
// Service Module Functions
// Load service jobs
async function loadServiceJobs() {
    try {
        serviceJobs = await ipcRenderer.invoke('get-service-jobs');
        renderServiceJobsTable();
    } catch (error) {
        console.error('Error loading service jobs:', error);
    }
}

// Customer search for service
async function searchServiceCustomers(searchTerm) {
    if (searchTerm.length < 2) {
        document.getElementById('serviceCustomerSuggestions').style.display = 'none';
        return;
    }

    try {
        const customers = await ipcRenderer.invoke('search-customers', searchTerm);
        displayServiceCustomerSuggestions(customers);
    } catch (error) {
        console.error('Error searching customers:', error);
    }
}

function displayServiceCustomerSuggestions(customers) {
    const suggestionsDiv = document.getElementById('serviceCustomerSuggestions');
    
    if (customers.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    suggestionsDiv.innerHTML = customers.map(customer => 
        `<div class="suggestion-item" onclick="selectServiceCustomer(${customer.id}, '${customer.name}', '${customer.phone || ''}')">
            <strong>${customer.name}</strong>
            ${customer.phone ? `<br><small>${customer.phone}</small>` : ''}
        </div>`
    ).join('');
    
    suggestionsDiv.style.display = 'block';
}

function selectServiceCustomer(id, name, phone) {
    selectedServiceCustomer = { id, name, phone };
    document.getElementById('serviceSelectedCustomer').value = `${name} ${phone ? `(${phone})` : ''}`;
    document.getElementById('serviceSelectedCustomerId').value = id;
    document.getElementById('serviceCustomerSearch').value = '';
    document.getElementById('serviceCustomerSuggestions').style.display = 'none';
}

// Service item management
function addServiceItem() {
    openServiceItemModal();
}

function openServiceItemModal(itemIndex = null) {
    const modal = document.getElementById('serviceItemModal');
    const form = document.getElementById('serviceItemForm');
    const title = document.getElementById('serviceItemModalTitle');
    
    form.reset();
    
    if (itemIndex !== null) {
        title.textContent = 'Edit Service Item';
        document.getElementById('serviceItemIndex').value = itemIndex;
        
        const item = serviceItems[itemIndex];
        document.getElementById('serviceItemCategory').value = item.category;
        document.getElementById('serviceItemBrand').value = item.brand || '';
        document.getElementById('serviceItemGender').value = item.gender || '';
        document.getElementById('serviceItemCaseMaterial').value = item.case_material || '';
        document.getElementById('serviceItemStrapMaterial').value = item.strap_material || '';
        document.getElementById('serviceItemMachineChange').value = item.machine_change || '';
        document.getElementById('serviceItemMovementNo').value = item.movement_no || '';
        document.getElementById('serviceItemIssueDescription').value = item.issue_description;
        
        toggleServiceCategoryFields();
    } else {
        title.textContent = 'Add Service Item';
        document.getElementById('serviceItemIndex').value = '';
        toggleServiceCategoryFields();
    }
    
    modal.style.display = 'block';
}

function toggleServiceCategoryFields() {
    const category = document.getElementById('serviceItemCategory').value;
    
    // Hide all category-specific fields
    document.getElementById('watchFields').style.display = 'none';
    document.getElementById('clockFields').style.display = 'none';
    
    // Clear conditional fields
    document.getElementById('serviceItemGender').value = '';
    document.getElementById('serviceItemCaseMaterial').value = '';
    document.getElementById('serviceItemStrapMaterial').value = '';
    document.getElementById('serviceItemMachineChange').value = '';
    
    // Show relevant fields based on category
    if (category === 'watch') {
        document.getElementById('watchFields').style.display = 'block';
    } else if (category === 'wallclock') {
        document.getElementById('clockFields').style.display = 'block';
    }
}

async function handleServiceItemForm(e) {
    e.preventDefault();
    
    const itemData = {
        category: document.getElementById('serviceItemCategory').value,
        brand: document.getElementById('serviceItemBrand').value || null,
        gender: document.getElementById('serviceItemGender').value || null,
        case_material: document.getElementById('serviceItemCaseMaterial').value || null,
        strap_material: document.getElementById('serviceItemStrapMaterial').value || null,
        machine_change: document.getElementById('serviceItemMachineChange').value ? 
            parseInt(document.getElementById('serviceItemMachineChange').value) : null,
        movement_no: document.getElementById('serviceItemMovementNo').value || null,
        issue_description: document.getElementById('serviceItemIssueDescription').value,
        product_image_path: null // Handle file upload separately if needed
    };
    
    const itemIndex = document.getElementById('serviceItemIndex').value;
    
    if (itemIndex !== '') {
        // Update existing item
        serviceItems[parseInt(itemIndex)] = itemData;
    } else {
        // Add new item
        serviceItems.push(itemData);
    }
    
    closeModal('serviceItemModal');
    renderServiceItems();
}

function renderServiceItems() {
    const container = document.getElementById('serviceItemsContainer');
    
    if (serviceItems.length === 0) {
        container.innerHTML = '<p class="no-items-message">No service items added yet.</p>';
        return;
    }
    
    container.innerHTML = serviceItems.map((item, index) => {
        let details = `<div class="service-item-detail"><strong>Category:</strong> ${item.category}</div>`;
        
        if (item.brand) details += `<div class="service-item-detail"><strong>Brand:</strong> ${item.brand}</div>`;
        if (item.gender) details += `<div class="service-item-detail"><strong>Gender:</strong> ${item.gender}</div>`;
        if (item.case_material) details += `<div class="service-item-detail"><strong>Case Material:</strong> ${item.case_material.replace('_', ' ')}</div>`;
        if (item.strap_material) details += `<div class="service-item-detail"><strong>Strap Material:</strong> ${item.strap_material.replace('_', ' ')}</div>`;
        if (item.machine_change !== null) details += `<div class="service-item-detail"><strong>Machine Change:</strong> ${item.machine_change ? 'Yes' : 'No'}</div>`;
        if (item.movement_no) details += `<div class="service-item-detail"><strong>Movement No:</strong> ${item.movement_no}</div>`;
        
        return `
            <div class="service-item-card">
                <div class="service-item-header">
                    <span class="service-item-category">${item.category}</span>
                    <span class="service-item-remove" onclick="removeServiceItem(${index})">&times;</span>
                </div>
                <div class="service-item-details">
                    ${details}
                </div>
                <div class="service-item-issue">
                    <strong>Issue Description:</strong>
                    <div>${item.issue_description}</div>
                </div>
            </div>
        `;
    }).join('');
}

function removeServiceItem(index) {
    if (confirm('Are you sure you want to remove this service item?')) {
        serviceItems.splice(index, 1);
        renderServiceItems();
    }
}

function editServiceItem(index) {
    openServiceItemModal(index);
}

// Create service job
async function createServiceJob() {
    if (serviceItems.length === 0) {
        alert('Please add at least one service item');
        return;
    }
    
    const estimatedCost = parseFloat(document.getElementById('estimatedCost').value);
    const advanceAmount = parseFloat(document.getElementById('advanceAmount').value) || 0;
    const approximateDeliveryDate = document.getElementById('approximateDeliveryDate').value;
    const location = document.getElementById('serviceLocation').value;
    
    if (!estimatedCost || !approximateDeliveryDate || !location) {
        alert('Please fill in all required fields');
        return;
    }
    
    const serviceData = {
        job: {
            customer_id: selectedServiceCustomer ? selectedServiceCustomer.id : null,
            estimated_cost: estimatedCost,
            advance_amount: advanceAmount,
            advance_payment_method: document.getElementById('advancePaymentMethod').value || null,
            advance_payment_reference: document.getElementById('advancePaymentReference').value || null,
            approximate_delivery_date: approximateDeliveryDate,
            location: location,
            comments: document.getElementById('serviceJobComments').value || null,
            created_by: currentUser.id
        },
        items: serviceItems
    };
    
    try {
        const result = await ipcRenderer.invoke('create-service-job', serviceData);
        
        if (result.success) {
            alert(`Service job created successfully! Job Number: ${result.job_number}`);
            clearServiceJob();
            await loadServiceJobs();
        }
    } catch (error) {
        console.error('Error creating service job:', error);
        alert('Error creating service job: ' + error.message);
    }
}

function clearServiceJob() {
    serviceItems = [];
    selectedServiceCustomer = null;
    
    // Clear form inputs
    document.getElementById('serviceCustomerSearch').value = '';
    document.getElementById('serviceSelectedCustomer').value = '';
    document.getElementById('serviceSelectedCustomerId').value = '';
    document.getElementById('estimatedCost').value = '';
    document.getElementById('advanceAmount').value = '0';
    document.getElementById('advancePaymentMethod').value = '';
    document.getElementById('advancePaymentReference').value = '';
    document.getElementById('approximateDeliveryDate').value = '';
    document.getElementById('serviceLocation').value = '';
    document.getElementById('serviceJobComments').value = '';
    
    // Reset UI
    renderServiceItems();
    
    // Hide suggestions
    document.getElementById('serviceCustomerSuggestions').style.display = 'none';
}

// Render service jobs table
function renderServiceJobsTable() {
    const tbody = document.getElementById('serviceJobsTableBody');
    tbody.innerHTML = '';
    
    serviceJobs.slice(0, 20).forEach(job => { // Show only last 20 jobs
        const row = document.createElement('tr');
        
        const statusClass = job.status.replace('_', '-');
        const locationCapitalized = job.location.charAt(0).toUpperCase() + job.location.slice(1);
        
        row.innerHTML = `
            <td><span class="job-number">${job.job_number}</span></td>
            <td>${job.customer_name || 'Walk-in'}</td>
            <td>${job.items_count || 0}</td>
            <td><span class="service-status ${statusClass}">${job.status.replace('_', ' ')}</span></td>
            <td><span class="service-location">${locationCapitalized}</span></td>
            <td>₹${parseFloat(job.estimated_cost || 0).toFixed(2)}</td>
            <td>
                <div class="service-actions">
                    <button class="btn btn-sm btn-secondary" onclick="viewServiceJobDetails(${job.id})">View</button>
                    <button class="btn btn-sm btn-primary" onclick="updateServiceStatus(${job.id})">Update</button>
                    ${job.status !== 'service_completed' ? 
                        `<button class="btn btn-sm btn-success" onclick="completeService(${job.id})">Complete</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Search service jobs
async function searchServiceJobs() {
    const searchTerm = document.getElementById('serviceJobSearch').value.trim();
    
    if (searchTerm) {
        try {
            serviceJobs = await ipcRenderer.invoke('search-service-jobs', searchTerm);
            renderServiceJobsTable();
        } catch (error) {
            console.error('Error searching service jobs:', error);
        }
    } else {
        await loadServiceJobs();
    }
}

function clearServiceSearch() {
    document.getElementById('serviceJobSearch').value = '';
    loadServiceJobs();
}
// View service job details
async function viewServiceJobDetails(jobId) {
    try {
        currentServiceJob = await ipcRenderer.invoke('get-service-job-details', jobId);
        displayServiceJobDetails(currentServiceJob);
        document.getElementById('serviceJobDetailsModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading service job details:', error);
        alert('Error loading service job details');
    }
}

function displayServiceJobDetails(serviceDetails) {
    const { job, items, statusHistory, comments } = serviceDetails;
    const content = document.getElementById('serviceJobDetailsContent');
    
    // Show/hide print invoice button
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    if (job.status === 'service_completed' || job.status === 'delivered') {
        printInvoiceBtn.style.display = 'inline-block';
    } else {
        printInvoiceBtn.style.display = 'none';
    }
    
    content.innerHTML = `
        <div class="service-job-details">
            <div class="service-job-info">
                <h4>Job Information</h4>
                <div class="job-detail-row">
                    <span class="job-detail-label">Job Number:</span>
                    <span class="job-detail-value job-number">${job.job_number}</span>
                </div>
                <div class="job-detail-row">
                    <span class="job-detail-label">Customer:</span>
                    <span class="job-detail-value">${job.customer_name || 'Walk-in Customer'}</span>
                </div>
                ${job.customer_phone ? `
                <div class="job-detail-row">
                    <span class="job-detail-label">Phone:</span>
                    <span class="job-detail-value">${job.customer_phone}</span>
                </div>` : ''}
                <div class="job-detail-row">
                    <span class="job-detail-label">Status:</span>
                    <span class="job-detail-value">
                        <span class="service-status ${job.status.replace('_', '-')}">${job.status.replace('_', ' ')}</span>
                    </span>
                </div>
                <div class="job-detail-row">
                    <span class="job-detail-label">Location:</span>
                    <span class="job-detail-value service-location">${job.location.charAt(0).toUpperCase() + job.location.slice(1)}</span>
                </div>
                <div class="job-detail-row">
                    <span class="job-detail-label">Created:</span>
                    <span class="job-detail-value">${new Date(job.created_at).toLocaleString()}</span>
                </div>
                ${job.approximate_delivery_date ? `
                <div class="job-detail-row">
                    <span class="job-detail-label">Expected Delivery:</span>
                    <span class="job-detail-value">${new Date(job.approximate_delivery_date).toLocaleDateString()}</span>
                </div>` : ''}
                ${job.actual_delivery_date ? `
                <div class="job-detail-row">
                    <span class="job-detail-label">Actual Delivery:</span>
                    <span class="job-detail-value">${new Date(job.actual_delivery_date).toLocaleDateString()}</span>
                </div>` : ''}
                ${job.comments ? `
                <div class="job-detail-row">
                    <span class="job-detail-label">Comments:</span>
                    <span class="job-detail-value">${job.comments}</span>
                </div>` : ''}
                
                <div class="cost-summary">
                    <div class="cost-row">
                        <span class="cost-label">Estimated Cost:</span>
                        <span class="cost-value">₹${parseFloat(job.estimated_cost || 0).toFixed(2)}</span>
                    </div>
                    <div class="cost-row">
                        <span class="cost-label">Advance Amount:</span>
                        <span class="cost-value">₹${parseFloat(job.advance_amount || 0).toFixed(2)}</span>
                    </div>
                    ${job.advance_payment_method ? `
                    <div class="cost-row">
                        <span class="cost-label">Advance Method:</span>
                        <span class="cost-value">${job.advance_payment_method.toUpperCase()}</span>
                    </div>` : ''}
                    ${job.final_cost ? `
                    <div class="cost-row">
                        <span class="cost-label">Final Cost:</span>
                        <span class="cost-value">₹${parseFloat(job.final_cost).toFixed(2)}</span>
                    </div>
                    <div class="cost-row">
                        <span class="cost-label">Final Payment:</span>
                        <span class="cost-value">₹${parseFloat(job.final_payment_amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="cost-row">
                        <span class="cost-label">Balance Due:</span>
                        <span class="cost-value">₹${(parseFloat(job.final_cost) - parseFloat(job.advance_amount || 0) - parseFloat(job.final_payment_amount || 0)).toFixed(2)}</span>
                    </div>` : ''}
                </div>
            </div>
            
            <div class="service-job-tracking">
                <h4>Tracking & Comments</h4>
                
                <div class="status-history">
                    <h5>Status History</h5>
                    ${statusHistory.map(history => `
                        <div class="status-history-item">
                            <div class="status-history-header">
                                <span class="status-history-status">${history.status.replace('_', ' ')}</span>
                                <span class="status-history-date">${new Date(history.changed_at).toLocaleString()}</span>
                            </div>
                            <div class="status-history-details">
                                <div class="status-history-location">Location: ${history.location.charAt(0).toUpperCase() + history.location.slice(1)}</div>
                                ${history.comments ? `<div>Comments: ${history.comments}</div>` : ''}
                                <div>Changed by: ${history.changed_by_name || 'System'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="comments-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h5>Comments</h5>
                        <button class="btn btn-sm btn-primary" onclick="addComment(${job.id})">Add Comment</button>
                    </div>
                    ${comments.length > 0 ? comments.map(comment => `
                        <div class="comment-item">
                            <div class="comment-header">
                                <span class="comment-author">${comment.added_by_name || 'Unknown'}</span>
                                <span>${new Date(comment.added_at).toLocaleString()}</span>
                            </div>
                            <div class="comment-text">${comment.comment}</div>
                        </div>
                    `).join('') : '<p>No comments added yet.</p>'}
                </div>
            </div>
        </div>
        
        <div class="service-items-display">
            <h4>Service Items</h4>
            ${items.map((item, index) => `
                <div class="service-item-display">
                    <h5>${item.category} ${item.brand ? `- ${item.brand}` : ''}</h5>
                    <div class="item-detail-grid">
                        ${item.gender ? `<div class="item-detail"><strong>Gender:</strong> ${item.gender}</div>` : ''}
                        ${item.case_material ? `<div class="item-detail"><strong>Case Material:</strong> ${item.case_material.replace('_', ' ')}</div>` : ''}
                        ${item.strap_material ? `<div class="item-detail"><strong>Strap Material:</strong> ${item.strap_material.replace('_', ' ')}</div>` : ''}
                        ${item.machine_change !== null ? `<div class="item-detail"><strong>Machine Change:</strong> ${item.machine_change ? 'Yes' : 'No'}</div>` : ''}
                        ${item.movement_no ? `<div class="item-detail"><strong>Movement No:</strong> ${item.movement_no}</div>` : ''}
                    </div>
                    <div class="item-issue-description">
                        <strong>Issue Description:</strong>
                        <div>${item.issue_description}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update service status
function updateServiceStatus(jobId) {
    document.getElementById('updateStatusJobId').value = jobId;
    document.getElementById('updateServiceStatusModal').style.display = 'block';
}

async function handleUpdateServiceStatus(e) {
    e.preventDefault();
    
    const jobId = parseInt(document.getElementById('updateStatusJobId').value);
    const status = document.getElementById('updateServiceStatus').value;
    const location = document.getElementById('updateServiceLocation').value;
    const comments = document.getElementById('updateServiceComments').value;
    
    try {
        await ipcRenderer.invoke('update-service-status', {
            jobId,
            status,
            location,
            comments,
            changedBy: currentUser.id
        });
        
        alert('Service status updated successfully!');
        closeModal('updateServiceStatusModal');
        await loadServiceJobs();
        
        // Refresh details modal if open
        if (currentServiceJob && currentServiceJob.job.id === jobId) {
            await viewServiceJobDetails(jobId);
        }
    } catch (error) {
        console.error('Error updating service status:', error);
        alert('Error updating service status: ' + error.message);
    }
}

// Complete service
function completeService(jobId) {
    document.getElementById('completeServiceJobId').value = jobId;
    
    // Set default delivery date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('actualDeliveryDate').value = today;
    
    document.getElementById('completeServiceModal').style.display = 'block';
}

async function handleCompleteService(e) {
    e.preventDefault();
    
    const jobId = parseInt(document.getElementById('completeServiceJobId').value);
    const finalCost = parseFloat(document.getElementById('finalCost').value);
    const finalPaymentAmount = parseFloat(document.getElementById('finalPaymentAmount').value);
    const finalPaymentMethod = document.getElementById('finalPaymentMethod').value;
    const finalPaymentReference = document.getElementById('finalPaymentReference').value;
    const actualDeliveryDate = document.getElementById('actualDeliveryDate').value;
    
    try {
        await ipcRenderer.invoke('complete-service', {
            jobId,
            finalCost,
            finalPaymentAmount,
            finalPaymentMethod,
            finalPaymentReference,
            actualDeliveryDate,
            completedBy: currentUser.id
        });
        
        alert('Service completed successfully!');
        closeModal('completeServiceModal');
        await loadServiceJobs();
        
        // Refresh details modal if open
        if (currentServiceJob && currentServiceJob.job.id === jobId) {
            await viewServiceJobDetails(jobId);
        }
    } catch (error) {
        console.error('Error completing service:', error);
        alert('Error completing service: ' + error.message);
    }
}

// Add comment
function addComment(jobId) {
    document.getElementById('commentJobId').value = jobId;
    document.getElementById('addCommentModal').style.display = 'block';
}

async function handleAddComment(e) {
    e.preventDefault();
    
    const jobId = parseInt(document.getElementById('commentJobId').value);
    const comment = document.getElementById('newComment').value;
    
    try {
        await ipcRenderer.invoke('add-service-comment', {
            jobId,
            comment,
            addedBy: currentUser.id
        });
        
        alert('Comment added successfully!');
        closeModal('addCommentModal');
        document.getElementById('newComment').value = '';
        
        // Refresh details modal if open
        if (currentServiceJob && currentServiceJob.job.id === jobId) {
            await viewServiceJobDetails(jobId);
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment: ' + error.message);
    }
}
// Print functions
function printServiceAcknowledgment() {
    if (!currentServiceJob) return;
    
    const { job, items } = currentServiceJob;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Service Acknowledgment - ${job.job_number}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .subtitle { font-size: 14px; color: #666; }
                .section { margin-bottom: 15px; }
                .section h4 { border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 8px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
                .table th { background: #f0f0f0; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
                .job-number { font-family: 'Courier New', monospace; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">⌚ Watch Shop</div>
                <div class="subtitle">Service Acknowledgment</div>
            </div>
            
            <div class="section">
                <h4>Job Details</h4>
                <div class="row">
                    <span>Job Number:</span>
                    <span class="job-number">${job.job_number}</span>
                </div>
                <div class="row">
                    <span>Date:</span>
                    <span>${new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                <div class="row">
                    <span>Customer:</span>
                    <span>${job.customer_name || 'Walk-in Customer'}</span>
                </div>
                ${job.customer_phone ? `
                <div class="row">
                    <span>Phone:</span>
                    <span>${job.customer_phone}</span>
                </div>` : ''}
                <div class="row">
                    <span>Location:</span>
                    <span>${job.location.charAt(0).toUpperCase() + job.location.slice(1)}</span>
                </div>
                <div class="row">
                    <span>Expected Delivery:</span>
                    <span>${new Date(job.approximate_delivery_date).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="section">
                <h4>Service Items</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Brand</th>
                            <th>Details</th>
                            <th>Issue Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.category}</td>
                                <td>${item.brand || '-'}</td>
                                <td>
                                    ${item.gender ? `Gender: ${item.gender}<br>` : ''}
                                    ${item.case_material ? `Case: ${item.case_material.replace('_', ' ')}<br>` : ''}
                                    ${item.strap_material ? `Strap: ${item.strap_material.replace('_', ' ')}<br>` : ''}
                                    ${item.movement_no ? `Movement: ${item.movement_no}` : ''}
                                </td>
                                <td>${item.issue_description}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h4>Cost Details</h4>
                <div class="row">
                    <span>Estimated Cost:</span>
                    <span>₹${parseFloat(job.estimated_cost || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span>Advance Paid:</span>
                    <span>₹${parseFloat(job.advance_amount || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span><strong>Balance (Approx):</strong></span>
                    <span><strong>₹${(parseFloat(job.estimated_cost || 0) - parseFloat(job.advance_amount || 0)).toFixed(2)}</strong></span>
                </div>
            </div>
            
            ${job.comments ? `
            <div class="section">
                <h4>Comments</h4>
                <p>${job.comments}</p>
            </div>` : ''}
            
            <div class="footer">
                <p>Thank you for choosing Watch Shop!</p>
                <p>Please keep this acknowledgment for your records.</p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

function printServiceInvoice() {
    if (!currentServiceJob) return;
    
    const { job, items } = currentServiceJob;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Service Invoice - ${job.job_number}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .subtitle { font-size: 14px; color: #666; }
                .section { margin-bottom: 15px; }
                .section h4 { border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 8px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
                .table th { background: #f0f0f0; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
                .job-number { font-family: 'Courier New', monospace; font-weight: bold; }
                .total-row { font-weight: bold; background: #f0f0f0; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">⌚ Watch Shop</div>
                <div class="subtitle">Service Invoice</div>
            </div>
            
            <div class="section">
                <h4>Invoice Details</h4>
                <div class="row">
                    <span>Job Number:</span>
                    <span class="job-number">${job.job_number}</span>
                </div>
                <div class="row">
                    <span>Service Date:</span>
                    <span>${new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                <div class="row">
                    <span>Completion Date:</span>
                    <span>${job.actual_delivery_date ? new Date(job.actual_delivery_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div class="row">
                    <span>Customer:</span>
                    <span>${job.customer_name || 'Walk-in Customer'}</span>
                </div>
                ${job.customer_phone ? `
                <div class="row">
                    <span>Phone:</span>
                    <span>${job.customer_phone}</span>
                </div>` : ''}
            </div>
            
            <div class="section">
                <h4>Service Summary</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Brand</th>
                            <th>Service Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.category}</td>
                                <td>${item.brand || '-'}</td>
                                <td>${item.issue_description}</td>
                                <td>₹${(parseFloat(job.final_cost || 0) / items.length).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="3"><strong>Total Service Cost</strong></td>
                            <td><strong>₹${parseFloat(job.final_cost || 0).toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h4>Payment Summary</h4>
                <div class="row">
                    <span>Total Service Cost:</span>
                    <span>₹${parseFloat(job.final_cost || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span>Advance Paid:</span>
                    <span>₹${parseFloat(job.advance_amount || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span>Final Payment:</span>
                    <span>₹${parseFloat(job.final_payment_amount || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span><strong>Total Paid:</strong></span>
                    <span><strong>₹${(parseFloat(job.advance_amount || 0) + parseFloat(job.final_payment_amount || 0)).toFixed(2)}</strong></span>
                </div>
                <div class="row">
                    <span><strong>Balance:</strong></span>
                    <span><strong>₹${(parseFloat(job.final_cost || 0) - parseFloat(job.advance_amount || 0) - parseFloat(job.final_payment_amount || 0)).toFixed(2)}</strong></span>
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Warranty period: As per manufacturer's warranty</p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}
