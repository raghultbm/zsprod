// ZEDSON WATCHCRAFT - Inventory Management Module (Updated with Optional Size Field)

/**
 * Inventory and Watch Management System
 */

// Watch inventory data - Updated with OUTLET field
let watches = [
    { 
        id: 1, 
        code: "ROL001", 
        type: "Watch",
        brand: "Rolex", 
        model: "Submariner", 
        size: "40mm",
        price: 850000, 
        quantity: 2, 
        outlet: "Semmancheri",
        description: "Luxury diving watch", 
        status: "available" 
    },
    { 
        id: 2, 
        code: "OMG001", 
        type: "Watch",
        brand: "Omega", 
        model: "Speedmaster", 
        size: "42mm",
        price: 450000, 
        quantity: 1, 
        outlet: "Navalur",
        description: "Professional chronograph", 
        status: "available" 
    },
    { 
        id: 3, 
        code: "CAS001", 
        type: "Watch",
        brand: "Casio", 
        model: "G-Shock", 
        size: "44mm",
        price: 15000, 
        quantity: 5, 
        outlet: "Padur",
        description: "Sports watch", 
        status: "available" 
    }
];

let nextWatchId = 4;

/**
 * Generate watch code automatically
 */
function generateWatchCode(brand) {
    const brandPrefix = brand.substring(0, 3).toUpperCase();
    const existingCodes = watches
        .filter(w => w.code.startsWith(brandPrefix))
        .map(w => parseInt(w.code.substring(3)))
        .filter(num => !isNaN(num));
    
    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    return `${brandPrefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Open Add Watch Modal
 */
function openAddWatchModal() {
    if (!AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to add items.');
        return;
    }
    console.log('Opening Add Item Modal');
    document.getElementById('addWatchModal').style.display = 'block';
}

/**
 * Auto-generate code when brand changes
 */
function updateWatchCode() {
    const brandInput = document.getElementById('watchBrand');
    const codeInput = document.getElementById('watchCode');
    
    if (brandInput && codeInput && brandInput.value.trim()) {
        const suggestedCode = generateWatchCode(brandInput.value.trim());
        codeInput.value = suggestedCode;
    }
}

/**
 * Add new watch to inventory - Updated to make size optional
 */
function addNewWatch(event) {
    event.preventDefault();
    
    if (!AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to add items.');
        return;
    }

    // Get form data
    const code = document.getElementById('watchCode').value.trim();
    const type = document.getElementById('watchType').value;
    const brand = document.getElementById('watchBrand').value.trim();
    const model = document.getElementById('watchModel').value.trim();
    const size = document.getElementById('watchSize').value.trim(); // Now optional
    const price = parseFloat(document.getElementById('watchPrice').value);
    const quantity = parseInt(document.getElementById('watchQuantity').value);
    const outlet = document.getElementById('watchOutlet').value;
    const description = document.getElementById('watchDescription').value.trim();
    
    // Validate input - Size is now optional
    if (!code || !type || !brand || !model || !price || !quantity || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    if (price <= 0) {
        Utils.showNotification('Price must be greater than zero');
        return;
    }

    if (quantity <= 0) {
        Utils.showNotification('Quantity must be greater than zero');
        return;
    }

    // Check if code already exists
    if (watches.find(w => w.code === code)) {
        Utils.showNotification('Item code already exists. Please use a different code.');
        return;
    }

    // Create new watch object - Size can be empty
    const newWatch = {
        id: nextWatchId++,
        code: code,
        type: type,
        brand: brand,
        model: model,
        size: size || '-', // Use '-' if size is empty
        price: price,
        quantity: quantity,
        outlet: outlet,
        description: description,
        status: 'available',
        addedDate: Utils.getCurrentTimestamp(),
        addedBy: AuthModule.getCurrentUser().username
    };

    // Add to watches array
    watches.push(newWatch);
    
    // Update display
    renderWatchTable();
    updateDashboard();
    
    // Close modal and reset form
    closeModal('addWatchModal');
    event.target.reset();
    
    Utils.showNotification('Item added successfully!');
    console.log('Item added:', newWatch);
}

/**
 * Delete watch from inventory
 */
function deleteWatch(watchId) {
    if (!AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to delete items.');
        return;
    }

    const watch = watches.find(w => w.id === watchId);
    if (!watch) {
        Utils.showNotification('Item not found.');
        return;
    }

    if (confirm(`Are you sure you want to delete "${watch.brand} ${watch.model}"?`)) {
        watches = watches.filter(w => w.id !== watchId);
        renderWatchTable();
        updateDashboard();
        Utils.showNotification('Item deleted successfully!');
    }
}

/**
 * Update watch status
 */
function updateWatchStatus(watchId, newStatus) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        watch.status = newStatus;
        renderWatchTable();
        updateDashboard();
    }
}

/**
 * Decrease watch quantity (used when selling)
 */
function decreaseWatchQuantity(watchId, amount = 1) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        watch.quantity = Math.max(0, watch.quantity - amount);
        if (watch.quantity === 0) {
            watch.status = 'sold';
        }
        renderWatchTable();
        updateDashboard();
    }
}

/**
 * Increase watch quantity (used when returning or restocking)
 */
function increaseWatchQuantity(watchId, amount = 1) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        watch.quantity += amount;
        if (watch.quantity > 0 && watch.status === 'sold') {
            watch.status = 'available';
        }
        renderWatchTable();
        updateDashboard();
    }
}

/**
 * Get available watches for sale
 */
function getAvailableWatches() {
    return watches.filter(w => w.quantity > 0 && w.status === 'available');
}

/**
 * Get watch by ID
 */
function getWatchById(watchId) {
    return watches.find(w => w.id === watchId);
}

/**
 * Search watches by code, type, brand, or model
 */
function searchWatches(query) {
    const tbody = document.getElementById('watchTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Render watch table with S.No, Type, Size and Outlet columns
 */
function renderWatchTable() {
    const tbody = document.getElementById('watchTableBody');
    if (!tbody) {
        console.error('Watch table body not found');
        return;
    }
    
    console.log('Rendering watch table with', watches.length, 'items');
    tbody.innerHTML = '';
    
    watches.forEach((watch, index) => {
        const row = document.createElement('tr');
        // Creating 11 columns to match the header: S.No, Code, Type, Brand, Model, Size, Price, Quantity, Outlet, Status, Actions
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td><strong>${Utils.sanitizeHtml(watch.code)}</strong></td>
            <td><span class="status pending">${Utils.sanitizeHtml(watch.type)}</span></td>
            <td>${Utils.sanitizeHtml(watch.brand)}</td>
            <td>${Utils.sanitizeHtml(watch.model)}</td>
            <td>${Utils.sanitizeHtml(watch.size)}</td>
            <td>${Utils.formatCurrency(watch.price)}</td>
            <td>${watch.quantity}</td>
            <td><span class="status in-progress">${Utils.sanitizeHtml(watch.outlet)}</span></td>
            <td><span class="status ${watch.status}">${watch.status}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editWatch(${watch.id})" 
                    ${!AuthModule.hasPermission('inventory') ? 'disabled' : ''}>
                    Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteWatch(${watch.id})" 
                    ${!AuthModule.hasPermission('inventory') ? 'disabled' : ''}>
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Watch table rendered successfully with Outlet column');
}

/**
 * Get inventory statistics
 */
function getInventoryStats() {
    const totalWatches = watches.length;
    const availableWatches = watches.filter(w => w.status === 'available').length;
    const soldWatches = watches.filter(w => w.status === 'sold').length;
    const totalValue = watches.reduce((sum, w) => sum + (w.price * w.quantity), 0);
    const lowStockWatches = watches.filter(w => w.quantity <= 2 && w.quantity > 0).length;
    
    // Statistics by outlet
    const outletStats = {};
    watches.forEach(w => {
        if (!outletStats[w.outlet]) {
            outletStats[w.outlet] = { count: 0, value: 0 };
        }
        outletStats[w.outlet].count++;
        outletStats[w.outlet].value += (w.price * w.quantity);
    });
    
    return {
        totalWatches,
        availableWatches,
        soldWatches,
        totalValue,
        lowStockWatches,
        outletStats
    };
}

/**
 * Edit watch - Updated to make size optional
 */
function editWatch(watchId) {
    if (!AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to edit items.');
        return;
    }

    const watch = watches.find(w => w.id === watchId);
    if (!watch) {
        Utils.showNotification('Item not found.');
        return;
    }

    // Create edit modal with Type and Outlet fields, Size is optional
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editWatchModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editWatchModal')">&times;</span>
            <h2>Edit Item</h2>
            <form onsubmit="InventoryModule.updateWatch(event, ${watchId})">
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Code:</label>
                        <input type="text" id="editWatchCode" value="${watch.code}" required>
                    </div>
                    <div class="form-group">
                        <label>Type:</label>
                        <select id="editWatchType" required>
                            <option value="Watch" ${watch.type === 'Watch' ? 'selected' : ''}>Watch</option>
                            <option value="Clock" ${watch.type === 'Clock' ? 'selected' : ''}>Clock</option>
                            <option value="Timepiece" ${watch.type === 'Timepiece' ? 'selected' : ''}>Timepiece</option>
                            <option value="Strap" ${watch.type === 'Strap' ? 'selected' : ''}>Strap</option>
                            <option value="Battery" ${watch.type === 'Battery' ? 'selected' : ''}>Battery</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Brand:</label>
                        <input type="text" id="editWatchBrand" value="${watch.brand}" required>
                    </div>
                    <div class="form-group">
                        <label>Model:</label>
                        <input type="text" id="editWatchModel" value="${watch.model}" required>
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Size (Optional):</label>
                        <input type="text" id="editWatchSize" value="${watch.size === '-' ? '' : watch.size}" placeholder="e.g., 40mm, 42mm">
                    </div>
                    <div class="form-group">
                        <label>Price (₹):</label>
                        <input type="number" id="editWatchPrice" value="${watch.price}" required min="0" step="0.01">
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Quantity:</label>
                        <input type="number" id="editWatchQuantity" value="${watch.quantity}" required min="0">
                    </div>
                    <div class="form-group">
                        <label>Outlet:</label>
                        <select id="editWatchOutlet" required>
                            <option value="Semmancheri" ${watch.outlet === 'Semmancheri' ? 'selected' : ''}>Semmancheri</option>
                            <option value="Navalur" ${watch.outlet === 'Navalur' ? 'selected' : ''}>Navalur</option>
                            <option value="Padur" ${watch.outlet === 'Padur' ? 'selected' : ''}>Padur</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="editWatchDescription" rows="3">${watch.description || ''}</textarea>
                </div>
                <button type="submit" class="btn">Update Item</button>
                <button type="button" class="btn btn-danger" onclick="closeModal('editWatchModal')">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
}

/**
 * Update watch - Updated to handle optional size
 */
function updateWatch(event, watchId) {
    event.preventDefault();
    
    const watch = watches.find(w => w.id === watchId);
    if (!watch) {
        Utils.showNotification('Item not found.');
        return;
    }

    const code = document.getElementById('editWatchCode').value.trim();
    const type = document.getElementById('editWatchType').value;
    const brand = document.getElementById('editWatchBrand').value.trim();
    const model = document.getElementById('editWatchModel').value.trim();
    const size = document.getElementById('editWatchSize').value.trim(); // Optional
    const price = parseFloat(document.getElementById('editWatchPrice').value);
    const quantity = parseInt(document.getElementById('editWatchQuantity').value);
    const outlet = document.getElementById('editWatchOutlet').value;
    const description = document.getElementById('editWatchDescription').value.trim();

    // Validate input - Size is optional
    if (!code || !type || !brand || !model || !price || quantity < 0 || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    // Check if code already exists (excluding current watch)
    if (watches.find(w => w.code === code && w.id !== watchId)) {
        Utils.showNotification('Item code already exists. Please use a different code.');
        return;
    }

    // Update watch - Size can be empty
    watch.code = code;
    watch.type = type;
    watch.brand = brand;
    watch.model = model;
    watch.size = size || '-'; // Use '-' if size is empty
    watch.price = price;
    watch.quantity = quantity;
    watch.outlet = outlet;
    watch.description = description;
    watch.status = quantity > 0 ? 'available' : 'sold';

    renderWatchTable();
    updateDashboard();
    closeModal('editWatchModal');
    document.getElementById('editWatchModal').remove();
    Utils.showNotification('Item updated successfully!');
}

/**
 * Get low stock alerts
 */
function getLowStockAlerts() {
    return watches.filter(w => w.quantity <= 2 && w.quantity > 0);
}

/**
 * Initialize inventory module
 */
function initializeInventory() {
    renderWatchTable();
    console.log('Inventory module initialized');
}

/**
 * Load modal template for inventory with Type and Outlet fields - Size made optional
 */
function loadInventoryModal() {
    const modalHtml = `
        <!-- Add Watch Modal -->
        <div id="addWatchModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addWatchModal')">&times;</span>
                <h2>Add New Item</h2>
                <form onsubmit="InventoryModule.addNewWatch(event)">
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Code:</label>
                            <input type="text" id="watchCode" required placeholder="Auto-generated">
                        </div>
                        <div class="form-group">
                            <label>Type:</label>
                            <select id="watchType" required>
                                <option value="">Select Type</option>
                                <option value="Watch">Watch</option>
                                <option value="Clock">Clock</option>
                                <option value="Timepiece">Timepiece</option>
                                <option value="Strap">Strap</option>
                                <option value="Battery">Battery</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Brand:</label>
                            <input type="text" id="watchBrand" required onchange="InventoryModule.updateWatchCode()">
                        </div>
                        <div class="form-group">
                            <label>Model:</label>
                            <input type="text" id="watchModel" required>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Size (Optional):</label>
                            <input type="text" id="watchSize" placeholder="e.g., 40mm, 42mm">
                        </div>
                        <div class="form-group">
                            <label>Price (₹):</label>
                            <input type="number" id="watchPrice" required min="0" step="0.01">
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Quantity:</label>
                            <input type="number" id="watchQuantity" value="1" required min="1">
                        </div>
                        <div class="form-group">
                            <label>Outlet:</label>
                            <select id="watchOutlet" required>
                                <option value="">Select Outlet</option>
                                <option value="Semmancheri">Semmancheri</option>
                                <option value="Navalur">Navalur</option>
                                <option value="Padur">Padur</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="watchDescription" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn">Add Item</button>
                </form>
            </div>
        </div>
    `;
    
    // Add to modals container if it exists
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) {
        modalsContainer.innerHTML += modalHtml;
    }
}

// Auto-load modal when module loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadInventoryModal();
        if (window.InventoryModule) {
            InventoryModule.initializeInventory();
        }
    }, 100);
});

// Export functions for global use
window.InventoryModule = {
    openAddWatchModal,
    addNewWatch,
    editWatch,
    updateWatch,
    deleteWatch,
    updateWatchStatus,
    decreaseWatchQuantity,
    increaseWatchQuantity,
    getAvailableWatches,
    getWatchById,
    searchWatches,
    renderWatchTable,
    getInventoryStats,
    getLowStockAlerts,
    initializeInventory,
    updateWatchCode,
    watches // For access by other modules
};