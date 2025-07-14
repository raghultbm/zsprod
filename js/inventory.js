// ZEDSON WATCHCRAFT - Inventory Management Module (API INTEGRATED)

/**
 * Inventory and Watch Management System with MongoDB Integration
 */

// Local cache for inventory items (for quick access)
let watches = [];

/**
 * Reset button to original state
 */
function resetButton(button, originalText) {
    if (button) {
        button.textContent = originalText;
        button.disabled = false;
    }
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loadingText) {
    if (button) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
        return button.dataset.originalText;
    }
    return null;
}

/**
 * Initialize inventory module with API data
 */
async function initializeInventory() {
    try {
        await loadInventoryFromAPI();
        renderWatchTable();
        console.log('Inventory module initialized with API integration');
    } catch (error) {
        console.error('Inventory initialization error:', error);
        Utils.showNotification('Failed to load inventory. Please refresh the page.');
    }
}

/**
 * Load inventory from API
 */
async function loadInventoryFromAPI() {
    try {
        const response = await InventoryAPI.getInventory();
        if (response.success) {
            watches = response.data || [];
            console.log(`Loaded ${watches.length} items from API`);
        }
    } catch (error) {
        console.error('Load inventory error:', error);
        throw error;
    }
}

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
    
    // Reset the form when opening modal
    const form = document.querySelector('#addWatchModal form');
    if (form) {
        form.reset();
        
        // Reset the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            resetButton(submitBtn, 'Add Item');
        }
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
 * Handle type change to show/hide size requirement
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
 * Add new watch to inventory - UPDATED with API integration
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
    
    // Validate input
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

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Adding Item...');

    try {
        const itemData = {
            code: code.toUpperCase(),
            type,
            brand,
            model,
            size: size || '-',
            price,
            quantity,
            outlet,
            description
        };

        const response = await InventoryAPI.createInventoryItem(itemData);

        if (response.success) {
            // Log action
            if (window.logInventoryAction) {
                logInventoryAction(`Added new item: ${brand} ${model}`, response.data);
            }
            
            // Add to local cache
            watches.push(response.data);
            
            // Update display
            renderWatchTable();
            updateDashboard();
            
            // Close modal and reset form
            closeModal('addWatchModal');
            event.target.reset();
            
            Utils.showNotification('Item added successfully!');
        }

    } catch (error) {
        console.error('Add inventory item error:', error);
        Utils.showNotification(error.message || 'Failed to add item. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Add Item');
    }
}

/**
 * Delete watch from inventory - UPDATED with API integration
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
            const response = await InventoryAPI.deleteInventoryItem(watchId);
            
            if (response.success) {
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction(`Deleted item: ${watch.brand} ${watch.model}`, watch);
                }
                
                // Remove from local cache
                watches = watches.filter(w => w.id !== watchId);
                
                renderWatchTable();
                updateDashboard();
                Utils.showNotification('Item deleted successfully!');
            }

        } catch (error) {
            console.error('Delete inventory item error:', error);
            Utils.showNotification(error.message || 'Failed to delete item. Please try again.');
        }
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
 * Decrease watch quantity (used when selling) - UPDATED with API integration
 */
async function decreaseWatchQuantity(watchId, amount = 1) {
    try {
        const response = await InventoryAPI.decreaseQuantity(watchId, amount);
        if (response.success) {
            // Update local cache
            const watchIndex = watches.findIndex(w => w.id === watchId);
            if (watchIndex !== -1) {
                watches[watchIndex] = response.data;
            }
            renderWatchTable();
            updateDashboard();
        }
    } catch (error) {
        console.error('Decrease quantity error:', error);
        throw error; // Re-throw for sales module to handle
    }
}

/**
 * Increase watch quantity (used when returning or restocking) - UPDATED with API integration
 */
async function increaseWatchQuantity(watchId, amount = 1) {
    try {
        const response = await InventoryAPI.increaseQuantity(watchId, amount);
        if (response.success) {
            // Update local cache
            const watchIndex = watches.findIndex(w => w.id === watchId);
            if (watchIndex !== -1) {
                watches[watchIndex] = response.data;
            }
            renderWatchTable();
            updateDashboard();
        }
    } catch (error) {
        console.error('Increase quantity error:', error);
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
 * Render watch table with API data
 */
function renderWatchTable() {
    const tbody = document.getElementById('watchTableBody');
    if (!tbody) {
        console.error('Watch table body not found');
        return;
    }
    
    console.log('Rendering watch table with', watches.length, 'items');
    tbody.innerHTML = '';
    
    if (watches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #999; padding: 20px;">
                    No items found. Click "Add New Item" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    const currentUser = AuthModule.getCurrentUser();
    const isStaff = currentUser && currentUser.role === 'staff';
    
    watches.forEach((watch, index) => {
        const row = document.createElement('tr');
        
        let actionButtons = '';
        
        // View movement history button (available for all users)
        actionButtons += `
            <button class="btn btn-sm" onclick="viewMovementHistory('${watch.id}')" 
                title="View Movement History">
                History
            </button>
        `;
        
        // Add edit/delete buttons only for non-staff users
        if (!isStaff) {
            actionButtons = `
                <button class="btn btn-sm" onclick="editWatch('${watch.id}')" 
                    ${!AuthModule.hasPermission('inventory') ? 'disabled' : ''}>
                    Edit
                </button>
                ${actionButtons}
                <button class="btn btn-sm btn-danger" onclick="deleteWatch('${watch.id}')" 
                    ${!AuthModule.hasPermission('inventory') ? 'disabled' : ''}>
                    Delete
                </button>
            `;
        }
        
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
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Watch table rendered successfully with API data');
}

/**
 * View movement history for a watch - UPDATED with API integration
 */
async function viewMovementHistory(watchId) {
    try {
        const response = await InventoryAPI.getMovementHistory(watchId);
        
        if (response.success) {
            const { itemInfo, movementHistory } = response.data;
            
            const historyModal = document.createElement('div');
            historyModal.className = 'modal';
            historyModal.id = 'movementHistoryModal';
            historyModal.style.display = 'block';
            
            let historyHtml = '';
            if (movementHistory && movementHistory.length > 0) {
                movementHistory.forEach(entry => {
                    const formattedDate = Utils.formatDate(new Date(entry.date));
                    const movedByName = entry.movedBy ? entry.movedBy.fullName || entry.movedBy.username : 'System';
                    
                    historyHtml += `
                        <div class="movement-entry" style="padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
                            <strong>Date:</strong> ${formattedDate}<br>
                            <strong>From:</strong> ${entry.fromOutlet || 'New Stock'}<br>
                            <strong>To:</strong> ${entry.toOutlet}<br>
                            <strong>Reason:</strong> ${entry.reason || 'Outlet change'}<br>
                            <strong>Moved By:</strong> ${movedByName}<br>
                        </div>
                    `;
                });
            } else {
                historyHtml = '<p>No movement history available.</p>';
            }

            historyModal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="closeMovementHistoryModal()">&times;</span>
                    <h2>Movement History - ${itemInfo.name}</h2>
                    <p><strong>Item Code:</strong> ${itemInfo.code}</p>
                    <div class="movement-history">
                        ${historyHtml}
                    </div>
                    <button type="button" class="btn" onclick="closeMovementHistoryModal()">Close</button>
                </div>
            `;
            
            document.body.appendChild(historyModal);
        }
        
    } catch (error) {
        console.error('View movement history error:', error);
        Utils.showNotification('Failed to load movement history.');
    }
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
 * Get inventory statistics - UPDATED with API integration
 */
async function getInventoryStats() {
    try {
        const response = await InventoryAPI.getInventoryStats();
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get inventory stats error:', error);
    }
    
    // Fallback to local calculation
    const totalWatches = watches.length;
    const availableWatches = watches.filter(w => w.status === 'available').length;
    const soldWatches = watches.filter(w => w.status === 'sold').length;
    const totalValue = watches.reduce((sum, w) => sum + (w.price * w.quantity), 0);
    const lowStockWatches = watches.filter(w => w.quantity <= 2 && w.quantity > 0).length;
    
    return {
        totalWatches,
        availableWatches,
        soldWatches,
        totalValue,
        lowStockWatches
    };
}

/**
 * Edit watch - UPDATED with API integration
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

    // Create edit modal
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.id = 'editWatchModal';
    editModal.style.display = 'block';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editWatchModal')">&times;</span>
            <h2>Edit Item</h2>
            <form onsubmit="InventoryModule.updateWatch(event, '${watchId}', '${originalOutlet}')">
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
 * Update watch - UPDATED with API integration
 */
async function updateWatch(event, watchId, originalOutlet) {
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

    // Validate input
    if (!code || !type || !brand || !model || !price || quantity < 0 || !outlet) {
        Utils.showNotification('Please fill in all required fields');
        return;
    }

    // Check size requirement based on type
    if (type === 'Strap' && !size) {
        Utils.showNotification('Size is required for Strap type items');
        return;
    }

    // Get the submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = setButtonLoading(submitBtn, 'Updating...');

    try {
        const itemData = {
            code: code.toUpperCase(),
            type,
            brand,
            model,
            size: size || '-',
            price,
            quantity,
            outlet,
            description
        };

        const response = await InventoryAPI.updateInventoryItem(watchId, itemData);

        if (response.success) {
            // Log action
            if (window.logInventoryAction) {
                logInventoryAction(`Updated item: ${watch.brand} ${watch.model} -> ${brand} ${model}`, {
                    id: watchId,
                    oldName: `${watch.brand} ${watch.model}`,
                    newName: `${brand} ${model}`,
                    outlet: outlet
                });
            }

            // Update local cache
            const watchIndex = watches.findIndex(w => w.id === watchId);
            if (watchIndex !== -1) {
                watches[watchIndex] = response.data;
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

    } catch (error) {
        console.error('Update inventory item error:', error);
        Utils.showNotification(error.message || 'Failed to update item. Please try again.');
    } finally {
        // Always reset button state
        resetButton(submitBtn, originalText || 'Update Item');
    }
}

/**
 * Get low stock alerts - UPDATED with API integration
 */
async function getLowStockAlerts() {
    try {
        const response = await InventoryAPI.getLowStockAlerts();
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get low stock alerts error:', error);
    }
    
    // Fallback to local calculation
    return watches.filter(w => w.quantity <= 2 && w.quantity > 0);
}

/**
 * Refresh inventory from API
 */
async function refreshInventory() {
    try {
        await loadInventoryFromAPI();
        renderWatchTable();
        console.log('Inventory refreshed from API');
    } catch (error) {
        console.error('Refresh inventory error:', error);
        Utils.showNotification('Failed to refresh inventory data.');
    }
}

/**
 * Close modal and reset form states
 */
function closeInventoryModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Reset any forms in the modal
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
            
            // Reset submit buttons
            const submitBtns = form.querySelectorAll('button[type="submit"]');
            submitBtns.forEach(btn => {
                if (btn.dataset.originalText) {
                    resetButton(btn, btn.dataset.originalText);
                } else {
                    btn.disabled = false;
                }
            });
        });
    }
}

// Override the global closeModal function for inventory modals
const originalCloseModal = window.closeModal;
window.closeModal = function(modalId) {
    // Check if it's an inventory modal
    if (modalId === 'addWatchModal' || modalId === 'editWatchModal') {
        closeInventoryModal(modalId);
    } else {
        // Use original close modal logic for other modals
        if (originalCloseModal) {
            originalCloseModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        }
    }
};

// Make functions globally available
window.closeMovementHistoryModal = closeMovementHistoryModal;

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
    initializeInventory,
    loadInventoryFromAPI,
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
    updateWatchCode,
    handleOutletChange,
    handleTypeChange,
    viewMovementHistory,
    refreshInventory,
    resetButton,
    setButtonLoading,
    closeInventoryModal,
    watches // For access by other modules
};