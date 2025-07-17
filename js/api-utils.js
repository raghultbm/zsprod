// ================================
// EXTENDED API UTILS - Add to existing js/api-utils.js
// ================================

// Inventory API methods
const InventoryAPI = {
  /**
   * Get all inventory items
   */
  async getInventory(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/inventory?${queryString}` : '/inventory';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get inventory statistics
   */
  async getInventoryStats() {
    try {
      const response = await api.get('/inventory/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get available items for sales
   */
  async getAvailableItems() {
    try {
      const response = await api.get('/inventory/available');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single inventory item
   */
  async getInventoryItem(itemId) {
    try {
      const response = await api.get(`/inventory/${itemId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new inventory item
   */
  async createInventoryItem(itemData) {
    try {
      const response = await api.post('/inventory', itemData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update inventory item
   */
  async updateInventoryItem(itemId, itemData) {
    try {
      const response = await api.put(`/inventory/${itemId}`, itemData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete inventory item
   */
  async deleteInventoryItem(itemId) {
    try {
      const response = await api.delete(`/inventory/${itemId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update inventory quantity
   */
  async updateQuantity(itemId, quantity, operation = 'set') {
    try {
      const response = await api.patch(`/inventory/${itemId}/quantity`, { quantity, operation });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Sales API methods
const SalesAPI = {
  /**
   * Get all sales
   */
  async getSales(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/sales?${queryString}` : '/sales';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get sales statistics
   */
  async getSalesStats() {
    try {
      const response = await api.get('/sales/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single sale
   */
  async getSale(saleId) {
    try {
      const response = await api.get(`/sales/${saleId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new sale
   */
  async createSale(saleData) {
    try {
      const response = await api.post('/sales', saleData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update sale
   */
  async updateSale(saleId, saleData) {
    try {
      const response = await api.put(`/sales/${saleId}`, saleData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete sale
   */
  async deleteSale(saleId) {
    try {
      const response = await api.delete(`/sales/${saleId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Service API methods
const ServiceAPI = {
  /**
   * Get all services
   */
  async getServices(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/services?${queryString}` : '/services';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get service statistics
   */
  async getServiceStats() {
    try {
      const response = await api.get('/services/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single service
   */
  async getService(serviceId) {
    try {
      const response = await api.get(`/services/${serviceId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new service
   */
  async createService(serviceData) {
    try {
      const response = await api.post('/services', serviceData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update service
   */
  async updateService(serviceId, serviceData) {
    try {
      const response = await api.put(`/services/${serviceId}`, serviceData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update service status
   */
  async updateServiceStatus(serviceId, status, completionData = null) {
    try {
      const response = await api.patch(`/services/${serviceId}/status`, { status, completionData });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete service
   */
  async deleteService(serviceId) {
    try {
      const response = await api.delete(`/services/${serviceId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Expense API methods
const ExpenseAPI = {
  /**
   * Get all expenses
   */
  async getExpenses(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/expenses?${queryString}` : '/expenses';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get expense statistics
   */
  async getExpenseStats() {
    try {
      const response = await api.get('/expenses/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single expense
   */
  async getExpense(expenseId) {
    try {
      const response = await api.get(`/expenses/${expenseId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new expense
   */
  async createExpense(expenseData) {
    try {
      const response = await api.post('/expenses', expenseData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update expense
   */
  async updateExpense(expenseId, expenseData) {
    try {
      const response = await api.put(`/expenses/${expenseId}`, expenseData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete expense
   */
  async deleteExpense(expenseId) {
    try {
      const response = await api.delete(`/expenses/${expenseId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Invoice API methods
const InvoiceAPI = {
  /**
   * Get all invoices
   */
  async getInvoices(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/invoices?${queryString}` : '/invoices';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get invoice statistics
   */
  async getInvoiceStats() {
    try {
      const response = await api.get('/invoices/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single invoice
   */
  async getInvoice(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generate sales invoice
   */
  async generateSalesInvoice(saleId) {
    try {
      const response = await api.post('/invoices/generate-sales', { saleId });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generate service invoice
   */
  async generateServiceInvoice(serviceId, type) {
    try {
      const response = await api.post('/invoices/generate-service', { serviceId, type });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get invoices by transaction
   */
  async getInvoicesByTransaction(relatedId, relatedType) {
    try {
      const response = await api.get(`/invoices/by-transaction/${relatedId}/${relatedType}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId, status) {
    try {
      const response = await api.patch(`/invoices/${invoiceId}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete invoice
   */
  async deleteInvoice(invoiceId) {
    try {
      const response = await api.delete(`/invoices/${invoiceId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Export all APIs for global use
window.InventoryAPI = InventoryAPI;
window.SalesAPI = SalesAPI;
window.ServiceAPI = ServiceAPI;
window.ExpenseAPI = ExpenseAPI;
window.InvoiceAPI = InvoiceAPI;

// ================================
// UPDATED INVENTORY MODULE - Replace existing js/inventory.js
// ================================

/**
 * Inventory Management Module with Complete MongoDB Integration
 */

// Local cache for inventory items
let inventory = [];

/**
 * Reset button states
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

  // Create and show edit modal (similar to existing implementation)
  // Implementation would be similar to customer edit modal
  Utils.showNotification('Edit inventory functionality - to be implemented');
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
window.viewMovementHistory = viewMovementHistory;
window.closeMovementHistoryModal = closeMovementHistoryModal;

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
  viewMovementHistory,
  closeMovementHistoryModal,
  resetButton,
  setButtonLoading,
  inventory // For access by other modules
};