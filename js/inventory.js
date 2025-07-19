// ZEDSON WATCHCRAFT - Inventory Management Module (Phase 4 - API Integration)

/**
 * Inventory and Watch Management System with API Integration
 * Updated to use backend APIs instead of local data
 */

// Local cache for quick access and offline fallback
let watches = [];
let nextWatchId = 1;
let isLoading = false;
let lastSyncTime = null;

/**
 * Initialize inventory module with API data
 */
async function initializeInventory() {
    try {
        showLoadingState('inventory');
        await loadWatchesFromAPI();
        renderWatchTable();
        lastSyncTime = new Date();
        console.log('Inventory module initialized with API integration');
    } catch (error) {
        console.error('Inventory initialization error:', error);
        // Fall back to local data if API fails
        if (watches.length === 0) {
            loadSampleWatches();
        }
        renderWatchTable();
        showAPIError('Failed to load inventory from server. Using offline data.');
    } finally {
        hideLoadingState('inventory');
    }
}

/**
 * Load watches from API with caching
 */
async function loadWatchesFromAPI() {
    try {
        const response = await api.watches.getWatches();
        if (response.success) {
            watches = response.data || [];
            console.log(`Loaded ${watches.length} watches from API`);
            
            // Update nextWatchId for local operations
            if (watches.length > 0) {
                nextWatchId = Math.max(...watches.map(w => w.id || 0)) + 1;
            }
            
            // Cache the data
            cacheManager.set('watches_data', watches, 10 * 60 * 1000); // 10 minutes cache
            return watches;
        } else {
            throw new Error(response.message || 'Failed to load watches');
        }
    } catch (error) {
        console.error('Load watches API error:', error);
        
        // Try to use cached data
        const cachedWatches = cacheManager.get('watches_data');
        if (cachedWatches) {
            watches = cachedWatches;
            console.log('Using cached watch data');
            return watches;
        }
        
        throw error;
    }
}

/**
 * Refresh watches from API
 */
async function refreshWatches() {
    try {
        showLoadingState('refresh');
        cacheManager.clear('watches_data'); // Clear cache to force fresh load
        await loadWatchesFromAPI();
        renderWatchTable();
        lastSyncTime = new Date();
        showSuccessMessage('Inventory refreshed successfully');
    } catch (error) {
        console.error('Refresh watches error:', error);
        showAPIError('Failed to refresh inventory data');
    } finally {
        hideLoadingState('refresh');
    }
}

/**
 * Generate watch code automatically
 */
function generateWatchCode(brand) {
    const brandPrefix = brand.substring(0, 3).toUpperCase();
    const existingCodes = watches
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
    if (!AuthModule.hasPermission('inventory')) {
        Utils.showNotification('You do not have permission to add items.');
        return;
    }
    
    console.log('Opening Add Item Modal');
    
    // Log action
    if (window.logAction) {
        logAction('Opened add watch modal');
    }
    
    document.getElementById('addWatchModal').style.display = 'block';
}

/**
 * Auto-generate code when brand changes
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
 * Add new watch to inventory with API integration
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

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;
        
        // Prepare watch data
        const watchData = {
            code: code,
            type: type,
            brand: brand,
            model: model,
            size: size || undefined, // Don't send empty string
            price: price,
            quantity: quantity,
            outlet: outlet,
            description: description
        };

        // Call API
        const response = await api.watches.createWatch(watchData);
        
        if (response.success) {
            // Log action
            if (window.logInventoryAction) {
                logInventoryAction('Added new item: ' + brand + ' ' + model, response.data);
            }
            
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
            throw new Error(response.message || 'Failed to add item');
        }
        
    } catch (error) {
        console.error('Add watch error:', error);
        
        // Handle specific error cases
        if (error.message && error.message.includes('code already exists')) {
            Utils.showNotification('Item code already exists. Please use a different code.');
        } else {
            Utils.showNotification(error.message || 'Failed to add item. Please try again.');
        }
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Delete watch from inventory with API integration
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
            showLoadingState('delete');
            
            const response = await api.watches.deleteWatch(watchId, 'Deleted by user');
            
            if (response.success) {
                // Log action
                if (window.logInventoryAction) {
                    logInventoryAction('Deleted item: ' + watch.brand + ' ' + watch.model, watch);
                }
                
                // Remove from local cache
                watches = watches.filter(w => w.id !== watchId);
                
                renderWatchTable();
                if (window.updateDashboard) {
                    updateDashboard();
                }
                Utils.showNotification('Item deleted successfully!');
                
            } else {
                throw new Error(response.message || 'Failed to delete item');
            }
            
        } catch (error) {
            console.error('Delete watch error:', error);
            Utils.showNotification(error.message || 'Failed to delete item. Please try again.');
        } finally {
            hideLoadingState('delete');
        }
    }
}

/**
 * Update watch quantity with API integration
 */
async function updateWatchQuantity(watchId, newQuantity, reason = 'Quantity adjustment') {
    try {
        const response = await api.watches.updateQuantity(watchId, newQuantity, reason);
        
        if (response.success) {
            // Update local cache
            const watchIndex = watches.findIndex(w => w.id === watchId);
            if (watchIndex !== -1) {
                watches[watchIndex] = response.data;
            }
            
            renderWatchTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            
            return true;
        } else {
            throw new Error(response.message || 'Failed to update quantity');
        }
        
    } catch (error) {
        console.error('Update quantity error:', error);
        Utils.showNotification(error.message || 'Failed to update quantity');
        return false;
    }
}

/**
 * Decrease watch quantity (used when selling)
 */
async function decreaseWatchQuantity(watchId, amount = 1) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        const newQuantity = Math.max(0, watch.quantity - amount);
        return await updateWatchQuantity(watchId, newQuantity, `Sale - decreased by ${amount}`);
    }
    return false;
}

/**
 * Increase watch quantity (used when returning or restocking)
 */
async function increaseWatchQuantity(watchId, amount = 1) {
    const watch = watches.find(w => w.id === watchId);
    if (watch) {
        const newQuantity = watch.quantity + amount;
        return await updateWatchQuantity(watchId, newQuantity, `Restock - increased by ${amount}`);
    }
    return false;
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
 * Get watch by code
 */
function getWatchByCode(code) {
    return watches.find(w => w.code && w.code.toUpperCase() === code.toUpperCase());
}

/**
 * Search watches by code, type, brand, or model with real-time filtering
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
 * View movement history for a watch with API integration
 */
async function viewMovementHistory(watchId) {
    try {
        const watch = watches.find(w => w.id === watchId);
        if (!watch) {
            Utils.showNotification('Item not found.');
            return;
        }

        showLoadingState('history');
        
        // Get detailed watch data with movement history from API
        const response = await api.watches.getWatch(watchId);
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load movement history');
        }
        
        const watchData = response.data;
        const historyModal = document.createElement('div');
        historyModal.className = 'modal';
        historyModal.id = 'movementHistoryModal';
        historyModal.style.display = 'block';
        
        let historyHtml = '';
        if (watchData.movementHistory && watchData.movementHistory.length > 0) {
            watchData.movementHistory
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date, newest first
                .forEach(entry => {
                    historyHtml += `
                        <div class="movement-entry" style="padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; background: #f9f9f9;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                <div><strong>Date:</strong> ${Utils.formatDate(new Date(entry.date))}</div>
                                <div><strong>Moved By:</strong> ${entry.movedBy || 'System'}</div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                <div><strong>From:</strong> ${entry.fromOutlet || 'New Stock'}</div>
                                <div><strong>To:</strong> ${entry.toOutlet}</div>
                            </div>
                            <div><strong>Reason:</strong> ${entry.reason || 'Outlet change'}</div>
                        </div>
                    `;
                });
        } else {
            historyHtml = '<p style="text-align: center; color: #666; padding: 20px;">No movement history available.</p>';
        }

        historyModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close" onclick="closeMovementHistoryModal()">&times;</span>
                <h2>Movement History - ${watch.brand} ${watch.model}</h2>
                <div style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 5px;">
                    <strong>Code:</strong> ${watch.code} | 
                    <strong>Current Outlet:</strong> ${watch.outlet} | 
                    <strong>Current Stock:</strong> ${watch.quantity}
                </div>
                <div class="movement-history" style="max-height: 400px; overflow-y: auto;">
                    ${historyHtml}
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button type="button" class="btn" onclick="closeMovementHistoryModal()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(historyModal);
        
    } catch (error) {
        console.error('View movement history error:', error);
        Utils.showNotification(error.message || 'Failed to load movement history');
    } finally {
        hideLoadingState('history');
    }
}

/**
 * Close movement history modal
 */
window.closeMovementHistoryModal = function() {
    const modal = document.getElementById('movementHistoryModal');
    if (modal) {
        modal.remove();
    }
};

/**
 * Edit watch with API integration
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

    // Log action
    if (window.logAction) {
        logAction('Opened edit modal for watch: ' + watch.brand + ' ' + watch.model);
    }

    // Store original outlet for comparison
    const originalOutlet = watch.outlet;

    // Create edit modal with all necessary fields
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
                        <option value="Outlet Reorganization">Outlet Reorganization</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="editWatchDescription" rows="3">${watch.description || ''}</textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-danger" onclick="closeModal('editWatchModal')">Cancel</button>
                    <button type="submit" class="btn">Update Item</button>
                </div>
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
 * Update watch with API integration
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
    const movementDate = document.getElementById('movementDate').value;
    const movementReason = document.getElementById('movementReason').value;

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

    // Check if outlet changed and movement date is required
    if (outlet !== originalOutlet && !movementDate) {
        Utils.showNotification('Movement date is required when changing outlet');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;
        
        // Prepare update data
        const updateData = {
            code: code,
            type: type,
            brand: brand,
            model: model,
            size: size || undefined,
            price: price,
            quantity: quantity,
            outlet: outlet,
            description: description
        };
        
        // Add movement data if outlet changed
        if (outlet !== originalOutlet) {
            updateData.movementData = {
                date: movementDate,
                fromOutlet: originalOutlet,
                toOutlet: outlet,
                reason: movementReason || 'Stock Transfer'
            };
        }

        // Call API
        const response = await api.watches.updateWatch(watchId, updateData);
        
        if (response.success) {
            // Log action
            if (window.logInventoryAction) {
                const actionMsg = outlet !== originalOutlet ? 
                    `Updated and moved item from ${originalOutlet} to ${outlet}` : 
                    'Updated item details';
                logInventoryAction(actionMsg + `: ${brand} ${model}`, response.data);
            }
            
            // Update local cache
            const watchIndex = watches.findIndex(w => w.id === watchId);
            if (watchIndex !== -1) {
                watches[watchIndex] = response.data;
            }

            renderWatchTable();
            if (window.updateDashboard) {
                updateDashboard();
            }
            closeModal('editWatchModal');
            document.getElementById('editWatchModal').remove();
            
            const successMsg = outlet !== originalOutlet ? 
                `Item updated and moved from ${originalOutlet} to ${outlet} successfully!` : 
                'Item updated successfully!';
            Utils.showNotification(successMsg);
            
        } else {
            throw new Error(response.message || 'Failed to update item');
        }
        
    } catch (error) {
        console.error('Update watch error:', error);
        
        // Handle specific error cases
        if (error.message && error.message.includes('code already exists')) {
            Utils.showNotification('Item code already exists. Please use a different code.');
        } else {
            Utils.showNotification(error.message || 'Failed to update item. Please try again.');
        }
        
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Render watch table with loading states and error handling
 */
function renderWatchTable() {
    const tbody = document.getElementById('watchTableBody');
    if (!tbody) {
        console.error('Watch table body not found');
        return;
    }
    
    console.log('Rendering watch table with', watches.length, 'items');
    tbody.innerHTML = '';
    
    // Show loading state if currently loading
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading inventory...</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Show empty state if no watches
    if (watches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #999; padding: 40px;">
                    <div style="margin-bottom: 10px;">📦</div>
                    <h3 style="margin: 10px 0;">No items in inventory</h3>
                    <p>Click "Add New Item" to get started</p>
                    <button class="btn" onclick="InventoryModule.refreshWatches()" style="margin-top: 10px;">
                        Refresh Inventory
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Render watch rows
    watches.forEach((watch, index) => {
        const row = document.createElement('tr');
        
        // Add sync indicator if item is recently updated
        const isRecentlyUpdated = watch.updatedAt && 
            (new Date() - new Date(watch.updatedAt)) < 10000; // 10 seconds
        const syncIndicator = isRecentlyUpdated ? 
            '<span style="color: #28a745;">●</span> ' : '';
        
        // Status display with better visual indicators
        const statusClass = watch.status === 'available' ? 'available' : 
                           watch.status === 'sold' ? 'pending' : 'on-hold';
        
        // Low stock warning
        const lowStockWarning = watch.quantity <= 2 && watch.quantity > 0 ? 
            '<span style="color: #dc3545; font-size: 12px;">⚠️ Low Stock</span>' : '';
        
        // Creating 11 columns to match the header
        row.innerHTML = `
            <td class="serial-number">${index + 1}</td>
            <td>
                <strong>${Utils.sanitizeHtml(watch.code)}</strong>
                ${syncIndicator}
            </td>
            <td><span class="status pending">${Utils.sanitizeHtml(watch.type)}</span></td>
            <td>${Utils.sanitizeHtml(watch.brand)}</td>
            <td>${Utils.sanitizeHtml(watch.model)}</td>
            <td>${Utils.sanitizeHtml(watch.size || '-')}</td>
            <td>${Utils.formatCurrency(watch.price)}</td>
            <td>
                ${watch.quantity}
                ${lowStockWarning}
            </td>
            <td><span class="status in-progress">${Utils.sanitizeHtml(watch.outlet)}</span></td>
            <td><span class="status ${statusClass}">${watch.status}</span></td>
            <td>
                <button class="btn btn-sm" onclick="InventoryModule.editWatch(${watch.id})" 
                    ${!AuthModule.hasPermission('inventory') ? 'disabled' : ''}>
                    Edit
                </button>
                <button class="btn btn-sm" onclick="InventoryModule.viewMovementHistory(${watch.id})" 
                    title="View Movement History">
                    History
                </button>
                <button class="btn btn-sm btn-danger" onclick="InventoryModule.deleteWatch(${watch.id})" 
                    ${!AuthModule.hasPermission('inventory') ? 'disabled' : ''}>
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Watch table rendered successfully with API data');
    
    // Update last sync time display
    updateSyncStatus();
}

/**
 * Update sync status display
 */
function updateSyncStatus() {
    const syncStatus = document.getElementById('inventorySyncStatus');
    if (syncStatus && lastSyncTime) {
        const timeAgo = getTimeAgo(lastSyncTime);
        syncStatus.textContent = `Last synced: ${timeAgo}`;
        syncStatus.style.color = (new Date() - lastSyncTime) > 300000 ? '#dc3545' : '#28a745'; // Red if >5 min
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Get inventory statistics with API integration
 */
async function getInventoryStats() {
    try {
        // Try to get fresh stats from API
        const response = await api.watches.getWatchStats();
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get inventory stats API error:', error);
    }
    
    // Fallback to local calculation
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
 * Get low stock alerts with API integration
 */
async function getLowStockAlerts() {
    try {
        const response = await api.watches.getLowStock(2);
        
        if (response.success) {
            return response.data;
        }
    } catch (error) {
        console.error('Get low stock API error:', error);
    }
    
    // Fallback to local data
    return watches.filter(w => w.quantity <= 2 && w.quantity > 0);
}

/**
 * Load sample watches for offline fallback
 */
function loadSampleWatches() {
    watches = [
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
    nextWatchId = 4;
    console.log('Loaded sample watches for offline mode');
}

/**
 * Loading state management
 */
function showLoadingState(context) {
    isLoading = true;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'block';
    }
    
    // Show loading in table if it's the main load
    if (context === 'inventory') {
        renderWatchTable();
    }
}

function hideLoadingState(context) {
    isLoading = false;
    const spinner = document.getElementById(`${context}Spinner`);
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Show API error with retry option
 */
function showAPIError(message) {
    Utils.showNotification(message + ' You can continue working offline.');
    
    // Log the error for debugging
    if (window.logAction) {
        logAction('API Error in Inventory: ' + message, {}, 'error');
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    Utils.showNotification(message);
    
    if (window.logAction) {
        logAction('Inventory Success: ' + message);
    }
}

/**
 * Sync with server - called periodically
 */
async function syncWithServer() {
    try {
        await loadWatchesFromAPI();
        renderWatchTable();
        console.log('Inventory synced with server');
    } catch (error) {
        console.error('Sync error:', error);
        // Don't show error to user for background sync failures
    }
}

/**
 * Export inventory data
 */
async function exportInventory() {
    try {
        showLoadingState('export');
        
        const response = await api.watches.exportWatches();
        
        if (response.success) {
            // Create and download file
            const csvContent = response.data.csvData;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            Utils.showNotification('Inventory exported successfully!');
            
            if (window.logAction) {
                logAction('Exported inventory data', { recordCount: response.data.recordCount });
            }
            
        } else {
            throw new Error(response.message || 'Export failed');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        Utils.showNotification('Failed to export inventory. Please try again.');
    } finally {
        hideLoadingState('export');
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
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-danger" onclick="closeModal('addWatchModal')">Cancel</button>
                        <button type="submit" class="btn">Add Item</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Sync Status Display -->
        <div id="inventorySyncStatus" style="position: fixed; bottom: 20px; right: 20px; background: #f8f9fa; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #666; border: 1px solid #dee2e6; display: none;">
            Checking sync status...
        </div>
    `;
    
    // Add to modals container if it exists
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) {
        modalsContainer.innerHTML += modalHtml;
    }
}

/**
 * Setup automatic sync
 */
function setupAutoSync() {
    // Sync every 5 minutes
    setInterval(syncWithServer, 5 * 60 * 1000);
    
    // Update sync status every 30 seconds
    setInterval(updateSyncStatus, 30 * 1000);
    
    // Show sync status initially
    setTimeout(() => {
        const syncStatus = document.getElementById('inventorySyncStatus');
        if (syncStatus) {
            syncStatus.style.display = 'block';
            updateSyncStatus();
        }
    }, 2000);
}

// Auto-load modal when module loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadInventoryModal();
        setupAutoSync();
        if (window.InventoryModule) {
            InventoryModule.initializeInventory();
        }
    }, 100);
});

// Export functions for global use
window.InventoryModule = {
    // Core functions
    initializeInventory,
    loadWatchesFromAPI,
    refreshWatches,
    openAddWatchModal,
    addNewWatch,
    editWatch,
    updateWatch,
    deleteWatch,
    
    // Quantity management
    updateWatchQuantity,
    decreaseWatchQuantity,
    increaseWatchQuantity,
    
    // Data access
    getAvailableWatches,
    getWatchById,
    getWatchByCode,
    searchWatches,
    
    // UI functions
    renderWatchTable,
    updateWatchCode,
    handleOutletChange,
    handleTypeChange,
    viewMovementHistory,
    
    // Stats and utilities
    getInventoryStats,
    getLowStockAlerts,
    exportInventory,
    syncWithServer,
    
    // Data access for other modules
    watches
};