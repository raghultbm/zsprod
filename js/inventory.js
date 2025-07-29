// ZEDSON WATCHCRAFT - Inventory Management Module (Fixed)

/**
 * Inventory and Watch Management System - Fixed for undefined variables
 */

/**
 * Generate watch code automatically
 */
function generateWatchCode(brand) {
    if (!window.watches) {
        window.watches = [];
    }
    
    const brandPrefix = brand.substring(0, 3).toUpperCase();
    const existingCodes = window.watches
        .filter(w => w.code && w.code.startsWith(brandPrefix))
        .map(w => parseInt(w.code.substring(3)))
        .filter(num => !isNaN(num));
    
    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    return `${brandPrefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Open Add Watch Modal
 */
function openAddWatchModal() {
    if (!AuthModule || !AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to add items.');
        return;
    }
    console.log('Opening Add Item Modal');
    const modal = document.getElementById('addWatchModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Add watch modal not found');
    }
}

/**
 * Auto-generate code when brand changes
 */
function updateWatchCode() {
    const brandInput = document.getElementById('watchBrand');
    const codeInput = document.getElementById('watchCode');
    
    if (brandInput && codeInput && brandInput.value.trim()) {
        if (!codeInput.value.trim()) {
            const suggestedCode = generateWatchCode(brandInput.value.trim());
            codeInput.value = suggestedCode;
        }
    }
}

/**
 * Handle type change to show/hide size requirement
 */
function handleTypeChange() {
    const typeSelect = document.getElementById('watchType') || document.getElementById('editWatchType');
    const sizeInput = document.getElementById('watchSize') || document.getElementById('editWatchSize');
    const sizeLabel = sizeInput ? sizeInput.closest('.form-group').querySelector('label') : null;
    
    if (typeSelect && sizeInput && sizeLabel) {
        const selectedType = typeSelect.value;
        
        if (selectedType === 'Strap') {
            sizeInput.required = true;
            sizeLabel.innerHTML = 'Size: <span style="color: red;">*</span>';
            sizeInput.placeholder = 'Size is required for straps';
        } else {
            sizeInput.required = false;
            sizeLabel.innerHTML = 'Size (Optional):';
            sizeInput.placeholder = 'e.g., 40mm, 42mm (optional)';
        }
    }
}

/**
 * Add new watch to inventory
 */
function addNewWatch(event) {
    event.preventDefault();
    
    if (!AuthModule || !AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to add items.');
        return;
    }

    // Ensure watches array exists
    if (!window.watches) {
        window.watches = [];
    }
    if (!window.nextWatchId) {
        window.nextWatchId = 1;
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
    
    // Validate input
    if (!code || !type || !brand || !model || !price || !quantity || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

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
    if (window.watches.find(w => w.code === code)) {
        Utils.showNotification('Item code already exists. Please use a different code.');
        return;
    }

    // Create new watch object
    const newWatch = {
        id: window.nextWatchId++,
        code: code,
        type: type,
        brand: brand,
        model: model,
        size: size || '-',
        price: price,
        quantity: quantity,
        outlet: outlet,
        description: description,
        status: 'available',
        addedDate: Utils.getCurrentTimestamp(),
        addedBy: AuthModule.getCurrentUser() ? AuthModule.getCurrentUser().username : 'admin',
        movementHistory: [
            { 
                date: Utils.getCurrentTimestamp().split(' ')[0], 
                fromOutlet: null, 
                toOutlet: outlet, 
                reason: "Initial stock",
                movedBy: AuthModule.getCurrentUser() ? AuthModule.getCurrentUser().username : 'admin'
            }
        ]
    };

    // Add to watches array
    window.watches.push(newWatch);
    
    // Update display
    renderWatchTable();
    if (window.updateDashboard) {
        updateDashboard();
    }
    
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
    if (!AuthModule || !AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to delete items.');
        return;
    }

    if (!window.watches) {
        Utils.showNotification('No items found.');
        return;
    }

    const watch = window.watches.find(w => w.id === watchId);
    if (!watch) {
        Utils.showNotification('Item not found.');
        return;
    }

    if (confirm(`Are you sure you want to delete "${watch.brand} ${watch.model}"?`)) {
        window.watches = window.watches.filter(w => w.id !== watchId);
        renderWatchTable();
        if (window.updateDashboard) {
            updateDashboard();
        }
        Utils.showNotification('Item deleted successfully!');
    }
}

/**
 * Update watch status
 */
function updateWatchStatus(watchId, newStatus) {
    if (!window.watches) return;
    
    const watch = window.watches.find(w => w.id === watchId);
    if (watch) {
        watch.status = newStatus;
        renderWatchTable();
        if (window.updateDashboard) {
            updateDashboard();
        }
    }
}

/**
 * Decrease watch quantity (used when selling)
 */
function decreaseWatchQuantity(watchId, amount = 1) {
    if (!window.watches) return;
    
    const watch = window.watches.find(w => w.id === watchId);
    if (watch) {
        watch.quantity = Math.max(0, watch.quantity - amount);
        if (watch.quantity === 0) {
            watch.status = 'sold';
        }
        renderWatchTable();
        if (window.updateDashboard) {
            updateDashboard();
        }
    }
}

/**
 * Increase watch quantity (used when returning or restocking)
 */
function increaseWatchQuantity(watchId, amount = 1) {
    if (!window.watches) return;
    
    const watch = window.watches.find(w => w.id === watchId);
    if (watch) {
        watch.quantity += amount;
        if (watch.quantity > 0 && watch.status === 'sold') {
            watch.status = 'available';
        }
        renderWatchTable();
        if (window.updateDashboard) {
            updateDashboard();
        }
    }
}

/**
 * Get available watches for sale
 */
function getAvailableWatches() {
    if (!window.watches) return [];
    return window.watches.filter(w => w.quantity > 0 && w.status === 'available');
}

/**
 * Get watch by ID
 */
function getWatchById(watchId) {
    if (!window.watches) return null;
    return window.watches.find(w => w.id === watchId);
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
 * Render watch table
 */
function renderWatchTable() {
    const tbody = document.getElementById('watchTableBody');
    if (!tbody) {
        console.error('Watch table body not found');
        return;
    }
    
    // Ensure watches array exists
    if (!window.watches) {
        window.watches = [];
    }
    
    console.log('Rendering watch table with', window.watches.length, 'items');
    tbody.innerHTML = '';
    
    if (window.watches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #999; padding: 20px;">
                    No items in inventory. Click "Add New Item" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    window.watches.forEach((watch, index) => {
        const row = document.createElement('tr');
        
        const canEdit = AuthModule && AuthModule.hasPermission('inventory');
        
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
                    ${!canEdit ? 'disabled' : ''}>
                    Edit
                </button>
                <button class="btn btn-sm" onclick="viewMovementHistory(${watch.id})" 
                    title="View Movement History">
                    History
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteWatch(${watch.id})" 
                    ${!canEdit ? 'disabled' : ''}>
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Watch table rendered successfully');
}

/**
 * View movement history for a watch
 */
function viewMovementHistory(watchId) {
    if (!window.watches) {
        Utils.showNotification('No items found.');
        return;
    }
    
    const watch = window.watches.find(w => w.id === watchId);
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
                <div class="movement-entry" style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>Date:</strong> ${entry.date}<br>
                    <strong>From:</strong> ${entry.fromOutlet || 'New Stock'}<br>
                    <strong>To:</strong> ${entry.toOutlet}<br>
                    <strong>Reason:</strong> ${entry.reason || 'Outlet change'}<br>
                    <strong>Moved By:</strong> ${entry.movedBy || 'System'}<br>
                </div>
            `;
        });
    } else {
        historyHtml = '<p>No movement history available.</p>';
    }

    historyModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeMovementHistoryModal()">&times;</span>
            <h2>Movement History - ${watch.brand} ${watch.model}</h2>
            <div class="movement-history" style="max-height: 400px; overflow-y: auto;">
                ${historyHtml}
            </div>
            <button type="button" class="btn" onclick="closeMovementHistoryModal()">Close</button>
        </div>
    `;
    
    document.body.appendChild(historyModal);
}

/**
 * Close movement history modal
 */
function closeMovementHistoryModal() {
    const modal = document.getElementById('movementHistoryModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Edit watch
 */
function editWatch(watchId) {
    if (!AuthModule || !AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to edit items.');
        return;
    }

    if (!window.watches) {
        Utils.showNotification('No items found.');
        return;
    }

    const watch = window.watches.find(w => w.id === watchId);
    if (!watch) {
        Utils.showNotification('Item not found.');
        return;
    }

    const originalOutlet = watch.outlet;

    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editWatchModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editWatchModal')">&times;</span>
            <h2>Edit Item</h2>
            <form onsubmit="updateWatch(event, ${watchId}, '${originalOutlet}')">
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Code:</label>
                        <input type="text" id="editWatchCode" value="${watch.code}" required>
                    </div>
                    <div class="form-group">
                        <label>Type:</label>
                        <select id="editWatchType" required onchange="handleTypeChange()">
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
                        <label>Size:</label>
                        <input type="text" id="editWatchSize" value="${watch.size === '-' ? '' : watch.size}">
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
    
    // Set initial size requirement based on current type
    setTimeout(handleTypeChange, 100);
}

/**
 * Update watch
 */
function updateWatch(event, watchId, originalOutlet) {
    event.preventDefault();
    
    if (!window.watches) return;
    
    const watch = window.watches.find(w => w.id === watchId);
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

    // Validate input
    if (!code || !type || !brand || !model || !price || quantity < 0 || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    if (type === 'Strap' && !size) {
        Utils.showNotification('Size is required for Strap type items');
        return;
    }

    // Check if code already exists (excluding current watch)
    if (window.watches.find(w => w.code === code && w.id !== watchId)) {
        Utils.showNotification('Item code already exists. Please use a different code.');
        return;
    }

    // Update watch
    watch.code = code;
    watch.type = type;
    watch.brand = brand;
    watch.model = model;
    watch.size = size || '-';
    watch.price = price;
    watch.quantity = quantity;
    watch.description = description;
    watch.status = quantity > 0 ? 'available' : 'sold';

    // Handle outlet change
    if (outlet !== originalOutlet) {
        watch.outlet = outlet;
        
        if (!watch.movementHistory) {
            watch.movementHistory = [];
        }
        
        watch.movementHistory.push({
            date: new Date().toISOString().split('T')[0],
            fromOutlet: originalOutlet,
            toOutlet: outlet,
            reason: 'Outlet Transfer',
            movedBy: AuthModule.getCurrentUser() ? AuthModule.getCurrentUser().username : 'admin',
            timestamp: Utils.getCurrentTimestamp()
        });
    }

    renderWatchTable();
    if (window.updateDashboard) {
        updateDashboard();
    }
    closeModal('editWatchModal');
    document.getElementById('editWatchModal').remove();
    
    Utils.showNotification('Item updated successfully!');
}

/**
 * Get inventory statistics
 */
function getInventoryStats() {
    if (!window.watches) {
        return {
            totalWatches: 0,
            availableWatches: 0,
            soldWatches: 0,
            totalValue: 0,
            lowStockWatches: 0,
            outletStats: {}
        };
    }
    
    const totalWatches = window.watches.length;
    const availableWatches = window.watches.filter(w => w.status === 'available').length;
    const soldWatches = window.watches.filter(w => w.status === 'sold').length;
    const totalValue = window.watches.reduce((sum, w) => sum + (w.price * w.quantity), 0);
    const lowStockWatches = window.watches.filter(w => w.quantity <= 2 && w.quantity > 0).length;
    
    const outletStats = {};
    window.watches.forEach(w => {
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
 * Initialize inventory module
 */
function initializeInventory() {
    renderWatchTable();
    console.log('Inventory module initialized');
}

/**
 * Close modal function
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Load modal template for inventory
 */
function loadInventoryModal() {
    const modalHtml = `
        <!-- Add Watch Modal -->
        <div id="addWatchModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addWatchModal')">&times;</span>
                <h2>Add New Item</h2>
                <form onsubmit="addNewWatch(event)">
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Code:</label>
                            <input type="text" id="watchCode" required placeholder="Enter code or leave blank for auto-generation">
                        </div>
                        <div class="form-group">
                            <label>Type:</label>
                            <select id="watchType" required onchange="handleTypeChange()">
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
                            <input type="text" id="watchBrand" required onchange="updateWatchCode()">
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
    
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) {
        modalsContainer.innerHTML += modalHtml;
    }
}

// Auto-load modal when module loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadInventoryModal();
        initializeInventory();
    }, 100);
});

// Make functions globally available
window.closeMovementHistoryModal = closeMovementHistoryModal;
window.updateWatch = updateWatch;
window.addNewWatch = addNewWatch;
window.editWatch = editWatch;
window.deleteWatch = deleteWatch;
window.viewMovementHistory = viewMovementHistory;
window.searchWatches = searchWatches;
window.openAddWatchModal = openAddWatchModal;
window.updateWatchCode = updateWatchCode;
window.handleTypeChange = handleTypeChange;

// Export functions for use by other modules
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
    initializeInventory,
    updateWatchCode,
    handleTypeChange,
    viewMovementHistory,
    watches: window.watches
};