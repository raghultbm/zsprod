// ================================
// UPDATED INVENTORY MODULE - js/inventory.js (REPLACE EXISTING)
// ================================

/**
 * Inventory Management Module with Complete MongoDB Integration
 */

// Local cache for inventory items
let inventory = [];

/**
 * Button state management
 */
function resetButton(button, originalText) {
  if (button) {
    button.textContent = originalText;
    button.disabled = false;
  }
}

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
 * Initialize inventory module with API integration
 */
async function initializeInventory() {
  try {
    await loadInventoryFromAPI();
    renderInventoryTable();
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
      inventory = response.data || [];
      console.log(`Loaded ${inventory.length} inventory items from API`);
    }
  } catch (error) {
    console.error('Load inventory error:', error);
    throw error;
  }
}

/**
 * Open Add Item Modal
 */
function openAddInventoryModal() {
  if (!AuthModule.hasPermission('inventory')) {
    Utils.showNotification('You do not have permission to add items.');
    return;
  }
  
  const modal = document.getElementById('addInventoryModal');
  if (!modal) {
    Utils.showNotification('Add inventory modal not found');
    return;
  }
  
  // Reset form
  const form = modal.querySelector('form');
  if (form) {
    form.reset();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      resetButton(submitBtn, 'Add Item');
    }
  }
  
  modal.style.display = 'block';
}

/**
 * Generate item code automatically
 */
function generateItemCode(brand) {
  const brandPrefix = brand.substring(0, 3).toUpperCase();
  const existingCodes = inventory
    .filter(item => item.code.startsWith(brandPrefix))
    .map(item => parseInt(item.code.substring(3)))
    .filter(num => !isNaN(num));
  
  const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
  return `${brandPrefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Update item code when brand changes
 */
function updateItemCode() {
  const brandInput = document.getElementById('inventoryBrand');
  const codeInput = document.getElementById('inventoryCode');
  
  if (brandInput && codeInput && brandInput.value.trim()) {
    if (!codeInput.value.trim()) {
      const suggestedCode = generateItemCode(brandInput.value.trim());
      codeInput.value = suggestedCode;
    }
  }
}

/**
 * Handle type change to show/hide size requirement
 */
function handleTypeChange() {
  const typeSelect = document.getElementById('inventoryType');
  const sizeInput = document.getElementById('inventorySize');
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
 * Add new inventory item with API integration
 */
async function addNewInventoryItem(event) {
  event.preventDefault();
  
  if (!AuthModule.hasPermission('inventory')) {
    Utils.showNotification('You do not have permission to add items.');
    return;
  }

  const code = document.getElementById('inventoryCode').value.trim();
  const type = document.getElementById('inventoryType').value;
  const brand = document.getElementById('inventoryBrand').value.trim();
  const model = document.getElementById('inventoryModel').value.trim();
  const size = document.getElementById('inventorySize').value.trim();
  const price = parseFloat(document.getElementById('inventoryPrice').value);
  const quantity = parseInt(document.getElementById('inventoryQuantity').value);
  const outlet = document.getElementById('inventoryOutlet').value;
  const description = document.getElementById('inventoryDescription').value.trim();

  // Validation
  if (!code || !type || !brand || !model || !price || !quantity || !outlet) {
    Utils.showNotification('Please fill in all required fields');
    return;
  }

  if (type === 'Strap' && !size) {
    Utils.showNotification('Size is required for Strap type items');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = setButtonLoading(submitBtn, 'Adding Item...');

  try {
    const itemData = {
      code,
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
      inventory.push(response.data);
      renderInventoryTable();
      updateDashboard();
      
      closeModal('addInventoryModal');
      event.target.reset();
      
      Utils.showNotification('Item added successfully!');
    }

  } catch (error) {
    console.error('Add inventory item error:', error);
    Utils.showNotification(error.message || 'Failed to add item. Please try again.');
  } finally {
    resetButton(submitBtn, originalText || 'Add Item');
  }
}

/**
 * Edit inventory item
 */
function editInventoryItem(itemId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot edit inventory items.');
    return;
  }
  
  const item = inventory.find(i => i.id === itemId);
  if (!item) {
    Utils.showNotification('Item not found.');
    return;
  }

  // Create edit modal
  const editModal = document.createElement('div');
  editModal.className = 'modal';
  editModal.id = 'editInventoryModal';
  editModal.style.display = 'block';
  editModal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="closeEditInventoryModal()">&times;</span>
      <h2>Edit Item</h2>
      <form onsubmit="updateInventoryItem(event, '${itemId}')">
        <div class="grid grid-2">
          <div class="form-group">
            <label>Code:</label>
            <input type="text" id="editInventoryCode" value="${item.code}" required>
          </div>
          <div class="form-group">
            <label>Type:</label>
            <select id="editInventoryType" required onchange="handleEditTypeChange()">
              <option value="Watch" ${item.type === 'Watch' ? 'selected' : ''}>Watch</option>
              <option value="Clock" ${item.type === 'Clock' ? 'selected' : ''}>Clock</option>
              <option value="Timepiece" ${item.type === 'Timepiece' ? 'selected' : ''}>Timepiece</option>
              <option value="Strap" ${item.type === 'Strap' ? 'selected' : ''}>Strap</option>
              <option value="Battery" ${item.type === 'Battery' ? 'selected' : ''}>Battery</option>
            </select>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>Brand:</label>
            <input type="text" id="editInventoryBrand" value="${item.brand}" required>
          </div>
          <div class="form-group">
            <label>Model:</label>
            <input type="text" id="editInventoryModel" value="${item.model}" required>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>Size ${item.type === 'Strap' ? '<span style="color: red;">*</span>' : '(Optional)'}:</label>
            <input type="text" id="editInventorySize" value="${item.size === '-' ? '' : item.size}" 
                   ${item.type === 'Strap' ? 'required' : ''}>
          </div>
          <div class="form-group">
            <label>Price (₹):</label>
            <input type="number" id="editInventoryPrice" value="${item.price}" required min="0" step="0.01">
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>Quantity:</label>
            <input type="number" id="editInventoryQuantity" value="${item.quantity}" required min="0">
          </div>
          <div class="form-group">
            <label>Outlet:</label>
            <select id="editInventoryOutlet" required>
              <option value="Semmancheri" ${item.outlet === 'Semmancheri' ? 'selected' : ''}>Semmancheri</option>
              <option value="Navalur" ${item.outlet === 'Navalur' ? 'selected' : ''}>Navalur</option>
              <option value="Padur" ${item.outlet === 'Padur' ? 'selected' : ''}>Padur</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea id="editInventoryDescription" rows="3">${item.description || ''}</textarea>
        </div>
        <div class="grid grid-2">
          <button type="button" class="btn btn-danger" onclick="closeEditInventoryModal()">Cancel</button>
          <button type="submit" class="btn">Update Item</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(editModal);
}

/**
 * Handle type change in edit modal
 */
function handleEditTypeChange() {
  const typeSelect = document.getElementById('editInventoryType');
  const sizeInput = document.getElementById('editInventorySize');
  const sizeLabel = sizeInput ? sizeInput.closest('.form-group').querySelector('label') : null;
  
  if (typeSelect && sizeInput && sizeLabel) {
    const selectedType = typeSelect.value;
    
    if (selectedType === 'Strap') {
      sizeInput.required = true;
      sizeLabel.innerHTML = 'Size: <span style="color: red;">*</span>';
    } else {
      sizeInput.required = false;
      sizeLabel.innerHTML = 'Size (Optional):';
    }
  }
}

/**
 * Close edit inventory modal
 */
function closeEditInventoryModal() {
  const modal = document.getElementById('editInventoryModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Update inventory item
 */
async function updateInventoryItem(event, itemId) {
  event.preventDefault();
  
  const item = inventory.find(i => i.id === itemId);
  if (!item) {
    Utils.showNotification('Item not found.');
    return;
  }

  const code = document.getElementById('editInventoryCode').value.trim();
  const type = document.getElementById('editInventoryType').value;
  const brand = document.getElementById('editInventoryBrand').value.trim();
  const model = document.getElementById('editInventoryModel').value.trim();
  const size = document.getElementById('editInventorySize').value.trim();
  const price = parseFloat(document.getElementById('editInventoryPrice').value);
  const quantity = parseInt(document.getElementById('editInventoryQuantity').value);
  const outlet = document.getElementById('editInventoryOutlet').value;
  const description = document.getElementById('editInventoryDescription').value.trim();

  // Validation
  if (!code || !type || !brand || !model || !price || quantity < 0 || !outlet) {
    Utils.showNotification('Please fill in all required fields');
    return;
  }

  if (type === 'Strap' && !size) {
    Utils.showNotification('Size is required for Strap type items');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = setButtonLoading(submitBtn, 'Updating...');

  try {
    const itemData = {
      code,
      type,
      brand,
      model,
      size: size || '-',
      price,
      quantity,
      outlet,
      description
    };

    const response = await InventoryAPI.updateInventoryItem(itemId, itemData);

    if (response.success) {
      // Update local cache
      const itemIndex = inventory.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        inventory[itemIndex] = response.data;
      }
      
      renderInventoryTable();
      updateDashboard();
      closeEditInventoryModal();
      Utils.showNotification('Item updated successfully!');
    }

  } catch (error) {
    console.error('Update inventory item error:', error);
    Utils.showNotification(error.message || 'Failed to update item. Please try again.');
  } finally {
    resetButton(submitBtn, originalText || 'Update Item');
  }
}

/**
 * Delete inventory item
 */
async function deleteInventoryItem(itemId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot delete inventory items.');
    return;
  }

  const item = inventory.find(i => i.id === itemId);
  if (!item) {
    Utils.showNotification('Item not found.');
    return;
  }

  if (confirm(`Are you sure you want to delete "${item.brand} ${item.model}"?`)) {
    try {
      const response = await InventoryAPI.deleteInventoryItem(itemId);
      
      if (response.success) {
        inventory = inventory.filter(i => i.id !== itemId);
        renderInventoryTable();
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
 * Get available items for sales
 */
function getAvailableItems() {
  return inventory.filter(item => item.quantity > 0 && item.status === 'available');
}

/**
 * Get item by ID
 */
function getItemById(itemId) {
  return inventory.find(item => item.id === itemId);
}

/**
 * Update item quantity (for sales)
 */
async function updateItemQuantity(itemId, newQuantity, operation = 'set') {
  try {
    const response = await InventoryAPI.updateQuantity(itemId, newQuantity, operation);
    if (response.success) {
      // Update local cache
      const itemIndex = inventory.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        inventory[itemIndex] = response.data;
      }
      renderInventoryTable();
    }
  } catch (error) {
    console.error('Update item quantity error:', error);
  }
}

/**
 * Search inventory items
 */
function searchInventory(query) {
  const tbody = document.getElementById('inventoryTableBody');
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
 * Get inventory statistics
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
  const totalItems = inventory.length;
  const availableItems = inventory.filter(i => i.status === 'available' && i.quantity > 0).length;
  const soldItems = inventory.filter(i => i.status === 'sold').length;
  const totalValue = inventory.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const lowStockItems = inventory.filter(i => i.quantity <= 2 && i.quantity > 0).length;
  
  return {
    totalItems,
    availableItems,
    soldItems,
    totalValue,
    lowStockItems
  };
}

/**
 * Render inventory table
 */
function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) {
    console.error('Inventory table body not found');
    return;
  }
  
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  tbody.innerHTML = '';
  
  if (inventory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; color: #999; padding: 20px;">
          No inventory items found. Click "Add New Item" to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  inventory.forEach((item, index) => {
    const row = document.createElement('tr');
    
    let actionButtons = '';
    
    if (!isStaff) {
      actionButtons = `
        <button class="btn btn-sm" onclick="editInventoryItem('${item.id}')" title="Edit Item">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteInventoryItem('${item.id}')" title="Delete Item">Delete</button>
      `;
    }
    
    actionButtons += `
      <button class="btn btn-sm" onclick="viewMovementHistory('${item.id}')" title="View Movement History">History</button>
    `;
    
    row.innerHTML = `
      <td class="serial-number">${index + 1}</td>
      <td><strong>${Utils.sanitizeHtml(item.code)}</strong></td>
      <td><span class="status pending">${Utils.sanitizeHtml(item.type)}</span></td>
      <td>${Utils.sanitizeHtml(item.brand)}</td>
      <td>${Utils.sanitizeHtml(item.model)}</td>
      <td>${Utils.sanitizeHtml(item.size)}</td>
      <td>${Utils.formatCurrency(item.price)}</td>
      <td>${item.quantity}</td>
      <td><span class="status in-progress">${Utils.sanitizeHtml(item.outlet)}</span></td>
      <td><span class="status ${item.status}">${item.status}</span></td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(row);
  });
  
  console.log('Inventory table rendered successfully with API data');
}

/**
 * View movement history
 */
function viewMovementHistory(itemId) {
  const item = inventory.find(i => i.id === itemId);
  if (!item) {
    Utils.showNotification('Item not found.');
    return;
  }

  const historyModal = document.createElement('div');
  historyModal.className = 'modal';
  historyModal.id = 'movementHistoryModal';
  historyModal.style.display = 'block';
  
  let historyHtml = '';
  if (item.movementHistory && item.movementHistory.length > 0) {
    item.movementHistory.forEach(entry => {
      historyHtml += `
        <div class="movement-entry" style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>Date:</strong> ${Utils.formatDate(new Date(entry.date))}<br>
          <strong>From:</strong> ${entry.fromOutlet || 'New Stock'}<br>
          <strong>To:</strong> ${entry.toOutlet}<br>
          <strong>Reason:</strong> ${entry.reason || 'Outlet change'}<br>
          <strong>Moved By:</strong> ${entry.movedBy?.username || 'System'}<br>
        </div>
      `;
    });
  } else {
    historyHtml = '<p>No movement history available.</p>';
  }

  historyModal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="closeMovementHistoryModal()">&times;</span>
      <h2>Movement History - ${item.brand} ${item.model}</h2>
      <div class="movement-history">
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
 * Refresh inventory from API
 */
async function refreshInventory() {
  try {
    await loadInventoryFromAPI();
    renderInventoryTable();
    console.log('Inventory refreshed from API');
  } catch (error) {
    console.error('Refresh inventory error:', error);
    Utils.showNotification('Failed to refresh inventory data.');
  }
}

/**
 * Populate item dropdown for sales
 */
function populateItemDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select Item</option>';
  const availableItems = getAvailableItems();
  availableItems.forEach(item => {
    select.innerHTML += `<option value="${item.id}" data-price="${item.price}" data-code="${item.code}">
      ${Utils.sanitizeHtml(item.code)} - ${Utils.sanitizeHtml(item.brand)} ${Utils.sanitizeHtml(item.model)} (₹${item.price})
    </option>`;
  });
}

// Make functions globally available
window.updateItemCode = updateItemCode;
window.handleTypeChange = handleTypeChange;
window.handleEditTypeChange = handleEditTypeChange;
window.viewMovementHistory = viewMovementHistory;
window.closeMovementHistoryModal = closeMovementHistoryModal;
window.closeEditInventoryModal = closeEditInventoryModal;
window.updateInventoryItem = updateInventoryItem;

// Export functions for global use
window.InventoryModule = {
  initializeInventory,
  loadInventoryFromAPI,
  openAddInventoryModal,
  addNewInventoryItem,
  editInventoryItem,
  deleteInventoryItem,
  updateItemQuantity,
  getAvailableItems,
  getItemById,
  searchInventory,
  getInventoryStats,
  renderInventoryTable,
  refreshInventory,
  populateItemDropdown,
  generateItemCode,
  updateItemCode,
  handleTypeChange,
  viewMovementHistory,
  closeMovementHistoryModal,
  resetButton,
  setButtonLoading,
  inventory // For access by other modules
};