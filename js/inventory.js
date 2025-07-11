// ZEDSON WATCHCRAFT - Inventory Management Module with MongoDB Integration
// Developed by PULSEWARE❤️

/**
 * Inventory and Watch Management System with MongoDB Backend
 */

// Watch inventory data (local cache)
let watches = [];

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
 * Add new watch to inventory - with MongoDB integration
 */
async function addNewWatch(event) {
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
    
    // Validate input - Size is optional
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

    try {
        // Create new watch object
        const newWatch = {
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
            addedBy: AuthModule.getCurrentUser().username
        };

        // Save to MongoDB
        const response = await window.apiService.createInventoryItem(newWatch);
        
        if (response.success) {
            // Add to local cache
            watches.push(response.data);
            
            // Update display
            renderWatchTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            // Close modal and reset form
            closeModal('addWatchModal');
            event.target.reset();
            
            Utils.showNotification('Item added successfully!');
            console.log('Item added:', response.data);
        } else {
            Utils.showNotification(response.error || 'Failed to add item');
        }
    } catch (error) {
        console.error('Error adding watch:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('Item code already exists. Please use a different code.');
        } else {
            Utils.showNotification('Error adding item: ' + error.message);
        }
    }
}

/**
 * Delete watch from inventory - with MongoDB integration
 */
async function deleteWatch(watchId) {
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
        try {
            const response = await window.apiService.deleteInventoryItem(watchId);
            
            if (response.success) {
                // Remove from local cache
                watches = watches.filter(w => w.id !== watchId);
                
                renderWatchTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
                Utils.showNotification('Item deleted successfully!');
            } else {
                Utils.showNotification(response.error || 'Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting watch:', error);
            Utils.showNotification('Error deleting item: ' + error.message);
        }
    }
}

/**
 * Update watch status - with MongoDB integration
 */
async function updateWatchStatus(watchId, newStatus) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        try {
            const response = await window.apiService.updateInventoryItem(watchId, { status: newStatus });
            
            if (response.success) {
                watch.status = newStatus;
                renderWatchTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
            }
        } catch (error) {
            console.error('Error updating watch status:', error);
        }
    }
}

/**
 * Decrease watch quantity (used when selling) - with MongoDB integration
 */
async function decreaseWatchQuantity(watchId, amount = 1) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        const newQuantity = Math.max(0, watch.quantity - amount);
        const newStatus = newQuantity === 0 ? 'sold' : 'available';
        
        try {
            const response = await window.apiService.updateInventoryItem(watchId, { 
                quantity: newQuantity,
                status: newStatus
            });
            
            if (response.success) {
                watch.quantity = newQuantity;
                watch.status = newStatus;
                renderWatchTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
            }
        } catch (error) {
            console.error('Error decreasing watch quantity:', error);
        }
    }
}

/**
 * Increase watch quantity (used when returning or restocking) - with MongoDB integration
 */
async function increaseWatchQuantity(watchId, amount = 1) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        const newQuantity = watch.quantity + amount;
        const newStatus = newQuantity > 0 ? 'available' : watch.status;
        
        try {
            const response = await window.apiService.updateInventoryItem(watchId, { 
                quantity: newQuantity,
                status: newStatus
            });
            
            if (response.success) {
                watch.quantity = newQuantity;
                if (newQuantity > 0 && watch.status === 'sold') {
                    watch.status = 'available';
                }
                renderWatchTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
            }
        } catch (error) {
            console.error('Error increasing watch quantity:', error);
        }
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
 * Edit watch - with MongoDB integration
 */
async function editWatch(watchId) {
    if (!AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to edit items.');
        return;
    }

    try {
        const response = await window.apiService.getInventoryItem(watchId);
        const watch = response.data;
        
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
    } catch (error) {
        console.error('Error fetching watch for edit:', error);
        Utils.showNotification('Error loading item data: ' + error.message);
    }
}

/**
 * Update watch - with MongoDB integration
 */
async function updateWatch(event, watchId) {
    event.preventDefault();
    
    const code = document.getElementById('editWatchCode').value.trim();
    const type = document.getElementById('editWatchType').value;
    const brand = document.getElementById('editWatchBrand').value.trim();
    const model = document.getElementById('editWatchModel').value.trim();
    const size = document.getElementById('editWatchSize').value.trim();
    const price = parseFloat(document.getElementById('editWatchPrice').value);
    const quantity = parseInt(document.getElementById('editWatchQuantity').value);
    const outlet = document.getElementById('editWatchOutlet').value;
    const description = document.getElementById('editWatchDescription').value.trim();

    // Validate input - Size is optional
    if (!code || !type || !brand || !model || !price || quantity < 0 || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    if (price <= 0) {
        Utils.showNotification('Price must be greater than zero');
        return;
    }

    try {
        const updateData = {
            code,
            type,
            brand,
            model,
            size: size || '-',
            price,
            quantity,
            outlet,
            description,
            status: quantity > 0 ? 'available' : 'sold'
        };

        const response = await window.apiService.updateInventoryItem(watchId, updateData);
        
        if (response.success) {
            // Update local cache
            const watchIndex = watches.findIndex(w => w.id === watchId);
            if (watchIndex !== -1) {
                watches[watchIndex] = { ...watches[watchIndex], ...updateData };
            }
            
            renderWatchTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            closeModal('editWatchModal');
            document.getElementById('editWatchModal').remove();
            Utils.showNotification('Item updated successfully!');
        } else {
            Utils.showNotification(response.error || 'Failed to update item');
        }
    } catch (error) {
        console.error('Error updating watch:', error);
        if (error.message.includes('Duplicate')) {
            Utils.showNotification('Item code already exists. Please use a different code.');
        } else {
            Utils.showNotification('Error updating item: ' + error.message);
        }
    }
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
 * Get low stock alerts
 */
function getLowStockAlerts() {
    return watches.filter(w => w.quantity <= 2 && w.quantity > 0);
}

/**
 * Load inventory from MongoDB
 */
async function loadInventory() {
    try {
        const response = await window.apiService.getInventory();
        if (response.success) {
            watches = response.data;
            renderWatchTable();
            console.log('Inventory loaded from MongoDB:', watches.length);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        Utils.showNotification('Error loading inventory from server');
    }
}

/**
 * Initialize inventory module
 */
async function initializeInventory() {
    await loadInventory();
    renderWatchTable();
    console.log('Inventory module initialized with MongoDB integration');
}

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
    loadInventory,
    watches // For access by other modules
};