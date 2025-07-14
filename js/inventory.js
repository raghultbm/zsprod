// ZEDSON WATCHCRAFT - Inventory Management Module (Enhanced with Movement Date Tracking)

/**
 * Inventory and Watch Management System
 */

// Watch inventory data - Updated with OUTLET field and movement history
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
        status: "available",
        movementHistory: [
            { date: "2024-01-15", fromOutlet: null, toOutlet: "Semmancheri", reason: "Initial stock" }
        ]
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
        status: "available",
        movementHistory: [
            { date: "2024-01-10", fromOutlet: null, toOutlet: "Navalur", reason: "Initial stock" }
        ]
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
        status: "available",
        movementHistory: [
            { date: "2024-01-05", fromOutlet: null, toOutlet: "Padur", reason: "Initial stock" }
        ]
    }
];

let nextWatchId = 4;

/**
 * Generate watch code automatically - UPDATED to not override manually entered codes
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
 * Auto-generate code when brand changes - UPDATED to check if code field is empty
 */
function updateWatchCode() {
    const brandInput = document.getElementById('watchBrand');
    const codeInput = document.getElementById('watchCode');
    
    if (brandInput && codeInput && brandInput.value.trim()) {
        // Only auto-generate if the code field is empty
        if (!codeInput.value.trim()) {
            const suggestedCode = generateWatchCode(brandInput.value.trim());
            codeInput.value = suggestedCode;
        }
    }
}

/**
 * Handle type change to show/hide size requirement - NEW FUNCTION
 */
function handleTypeChange() {
    const typeSelect = document.getElementById('watchType') || document.getElementById('editWatchType');
    const sizeInput = document.getElementById('watchSize') || document.getElementById('editWatchSize');
    const sizeLabel = sizeInput ? sizeInput.closest('.form-group').querySelector('label') : null;
    
    if (typeSelect && sizeInput && sizeLabel) {
        const selectedType = typeSelect.value;
        
        if (selectedType === 'Strap') {
            // Make size mandatory for Strap type
            sizeInput.required = true;
            sizeLabel.innerHTML = 'Size: <span style="color: red;">*</span>';
            sizeInput.placeholder = 'Size is required for straps';
        } else {
            // Make size optional for other types
            sizeInput.required = false;
            sizeLabel.innerHTML = 'Size (Optional):';
            sizeInput.placeholder = 'e.g., 40mm, 42mm (optional)';
        }
    }
}

/**
 * Add new watch to inventory - UPDATED size validation based on type
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
    const size = document.getElementById('watchSize').value.trim();
    const price = parseFloat(document.getElementById('watchPrice').value);
    const quantity = parseInt(document.getElementById('watchQuantity').value);
    const outlet = document.getElementById('watchOutlet').value;
    const description = document.getElementById('watchDescription').value.trim();
    
    // Validate input - Size is mandatory only for Strap type
    if (!code || !type || !brand || !model || !price || !quantity || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    // Check size requirement based on type
    if (type === 'Strap' && !size) {
        Utils.showNotification('Size is required for Strap type items');
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

    // Create new watch object - Size can be empty for non-strap items
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
        addedBy: AuthModule.getCurrentUser().username,
        movementHistory: [
            { 
                date: Utils.getCurrentTimestamp().split(' ')[0], 
                fromOutlet: null, 
                toOutlet: outlet, 
                reason: "Initial stock",
                movedBy: AuthModule.getCurrentUser().username
            }
        ]
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
                <button class="btn btn-sm" onclick="viewMovementHistory(${watch.id})" 
                    title="View Movement History">
                    History
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
 * Handle outlet change detection in edit form
 */
function handleOutletChange(selectElement, originalOutlet) {
    const newOutlet = selectElement.value;
    
    if (newOutlet !== originalOutlet) {
        // Show movement date input
        const movementDateContainer = document.getElementById('movementDateContainer');
        if (movementDateContainer) {
            movementDateContainer.style.display = 'block';
            document.getElementById('movementDate').required = true;
        }
    } else {
        // Hide movement date input
        const movementDateContainer = document.getElementById('movementDateContainer');
        if (movementDateContainer) {
            movementDateContainer.style.display = 'none';
            document.getElementById('movementDate').required = false;
        }
    }
}

/**
 * View movement history for a watch
 */
function viewMovementHistory(watchId) {
    const watch = watches.find(w => w.id === watchId);
    if (!watch) {
        Utils.showNotification('Item not found.');
        return;
    }

    const historyModal = document.createElement('div');
    historyModal.className = 'modal';
    historyModal.id = 'movementHistoryModal';
    historyModal.style.display = 'block';
    
    let historyHtml = '';
    if (watch.movementHistory && watch.movementHistory.length > 0) {
        watch.movementHistory.forEach(entry => {
            historyHtml += `
                <div class="movement-entry">
                    <strong>Date:</strong> ${entry.date}<br>
                    <strong>From:</strong> ${entry.fromOutlet || 'New Stock'}<br>
                    <strong>To:</strong> ${entry.toOutlet}<br>
                    <strong>Reason:</strong> ${entry.reason || 'Outlet change'}<br>
                    <strong>Moved By:</strong> ${entry.movedBy || 'System'}<br>
                    <hr>
                </div>
            `;
        });
    } else {
        historyHtml = '<p>No movement history available.</p>';
    }

    historyModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('movementHistoryModal')">&times;</span>
            <h2>Movement History - ${watch.brand} ${watch.model}</h2>
            <div class="movement-history">
                ${historyHtml}
            </div>
            <button type="button" class="btn" onclick="closeModal('movementHistoryModal')">Close</button>
        </div>
    `;
    
    document.body.appendChild(historyModal);
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
 * Edit watch - UPDATED to handle optional size and movement tracking
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

    // Store original outlet for comparison
    const originalOutlet = watch.outlet;

    // Create edit modal with Type and Outlet fields, Size is optional based on type
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editWatchModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editWatchModal')">&times;</span>
            <h2>Edit Item</h2>
            <form onsubmit="InventoryModule.updateWatch(event, ${watchId}, '${originalOutlet}')">
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Code:</label>
                        <input type="text" id="editWatchCode" value="${watch.code}" required>
                    </div>
                    <div class="form-group">
                        <label>Type:</label>
                        <select id="editWatchType" required onchange="InventoryModule.handleTypeChange()">
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
                        <label>Size ${watch.type === 'Strap' ? '<span style="color: red;">*</span>' : '(Optional)'}:</label>
                        <input type="text" id="editWatchSize" value="${watch.size === '-' ? '' : watch.size}" 
                               placeholder="${watch.type === 'Strap' ? 'Size is required for straps' : 'e.g., 40mm, 42mm (optional)'}"
                               ${watch.type === 'Strap' ? 'required' : ''}>
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
                        <select id="editWatchOutlet" onchange="InventoryModule.handleOutletChange(this, '${originalOutlet}')" required>
                            <option value="Semmancheri" ${watch.outlet === 'Semmancheri' ? 'selected' : ''}>Semmancheri</option>
                            <option value="Navalur" ${watch.outlet === 'Navalur' ? 'selected' : ''}>Navalur</option>
                            <option value="Padur" ${watch.outlet === 'Padur' ? 'selected' : ''}>Padur</option>
                        </select>
                    </div>
                </div>
                <div id="movementDateContainer" class="form-group" style="display: none;">
                    <label>Movement Date:</label>
                    <input type="date" id="movementDate" max="${new Date().toISOString().split('T')[0]}">
                    <small>Required when outlet is changed</small>
                </div>
                <div class="form-group">
                    <label>Movement Reason:</label>
                    <select id="movementReason" style="display: none;">
                        <option value="">Select Reason</option>
                        <option value="Stock Transfer">Stock Transfer</option>
                        <option value="Customer Request">Customer Request</option>
                    </select>
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

    // Add event listener to show/hide movement reason field when movement date container is shown
    const movementDateContainer = document.getElementById('movementDateContainer');
    const movementReasonField = document.getElementById('movementReason');
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (movementDateContainer.style.display === 'block') {
                    movementReasonField.style.display = 'block';
                } else {
                    movementReasonField.style.display = 'none';
                }
            }
        });
    });
    
    observer.observe(movementDateContainer, { attributes: true });
    
    // Set initial size requirement based on current type
    handleTypeChange();
}

/**
 * Update watch - UPDATED to handle optional size based on type and movement tracking
 */
function updateWatch(event, watchId, originalOutlet) {
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
    const size = document.getElementById('editWatchSize').value.trim();
    const price = parseFloat(document.getElementById('editWatchPrice').value);
    const quantity = parseInt(document.getElementById('editWatchQuantity').value);
    const outlet = document.getElementById('editWatchOutlet').value;
    const description = document.getElementById('editWatchDescription').value.trim();
    const movementDate = document.getElementById('movementDate').value;
    const movementReason = document.getElementById('movementReason').value;

    // Validate input - Size is mandatory only for Strap type
    if (!code || !type || !brand || !model || !price || quantity < 0 || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    // Check size requirement based on type
    if (type === 'Strap' && !size) {
        Utils.showNotification('Size is required for Strap type items');
        return;
    }

    // Check if outlet changed and movement date is required
    if (outlet !== originalOutlet && !movementDate) {
        Utils.showNotification('Movement date is required when changing outlet');
        return;
    }

    // Check if code already exists (excluding current watch)
    if (watches.find(w => w.code === code && w.id !== watchId)) {
        Utils.showNotification('Item code already exists. Please use a different code.');
        return;
    }

    // Update watch - Size can be empty for non-strap items
    watch.code = code;
    watch.type = type;
    watch.brand = brand;
    watch.model = model;
    watch.size = size || '-'; // Use '-' if size is empty
    watch.price = price;
    watch.quantity = quantity;
    watch.description = description;
    watch.status = quantity > 0 ? 'available' : 'sold';

    // Handle outlet change and movement tracking
    if (outlet !== originalOutlet) {
        watch.outlet = outlet;
        
        // Initialize movement history if it doesn't exist
        if (!watch.movementHistory) {
            watch.movementHistory = [];
        }
        
        // Add movement record
        watch.movementHistory.push({
            date: movementDate,
            fromOutlet: originalOutlet,
            toOutlet: outlet,
            reason: movementReason || 'Stock Transfer',
            movedBy: AuthModule.getCurrentUser().username,
            timestamp: Utils.getCurrentTimestamp()
        });
    }

    renderWatchTable();
    updateDashboard();
    closeModal('editWatchModal');
    document.getElementById('editWatchModal').remove();
    
    if (outlet !== originalOutlet) {
        Utils.showNotification(`Item updated and moved from ${originalOutlet} to ${outlet} successfully!`);
    } else {
        Utils.showNotification('Item updated successfully!');
    }
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
 * Load modal template for inventory with Type and Outlet fields - UPDATED with size validation
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
                            <input type="text" id="watchCode" required placeholder="Enter code or leave blank for auto-generation">
                        </div>
                        <div class="form-group">
                            <label>Type:</label>
                            <select id="watchType" required onchange="InventoryModule.handleTypeChange()">
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
                            <input type="text" id="watchSize" placeholder="e.g., 40mm, 42mm (optional)">
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
    handleOutletChange,
    handleTypeChange, // NEW FUNCTION
    viewMovementHistory,
    watches // For access by other modules
};