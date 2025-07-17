// ================================
// UPDATED SALES MODULE - Replace existing js/sales-core.js and js/sales-extended.js
// ================================

/**
 * Sales Management Module with Complete MongoDB Integration
 */

// Local cache for sales
let sales = [];

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
 * Initialize sales module with API integration
 */
async function initializeSales() {
  try {
    await loadSalesFromAPI();
    renderSalesTable();
    console.log('Sales module initialized with API integration');
  } catch (error) {
    console.error('Sales initialization error:', error);
    Utils.showNotification('Failed to load sales. Please refresh the page.');
  }
}

/**
 * Load sales from API
 */
async function loadSalesFromAPI() {
  try {
    const response = await SalesAPI.getSales();
    if (response.success) {
      sales = response.data || [];
      console.log(`Loaded ${sales.length} sales from API`);
    }
  } catch (error) {
    console.error('Load sales error:', error);
    throw error;
  }
}

/**
 * Open New Sale Modal
 */
function openNewSaleModal() {
  if (!AuthModule.hasPermission('sales')) {
    Utils.showNotification('You do not have permission to create sales.');
    return;
  }
  
  const modal = document.getElementById('newSaleModal');
  if (!modal) {
    Utils.showNotification('Sales modal not found. Please refresh the page.');
    return;
  }
  
  // Populate customer dropdown
  if (window.CustomerModule) {
    CustomerModule.populateCustomerDropdown('saleCustomer');
  }
  
  // Populate item dropdown
  if (window.InventoryModule) {
    InventoryModule.populateItemDropdown('saleItem');
  }
  
  // Reset form
  const form = modal.querySelector('form');
  if (form) {
    form.reset();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      resetButton(submitBtn, 'Record Sale');
    }
  }
  
  // Reset calculation displays
  updateCalculationDisplay();
  
  modal.style.display = 'block';
}

/**
 * Search item by code and auto-populate
 */
function searchItemByCode() {
  const codeInput = document.getElementById('saleItemCode');
  const itemSelect = document.getElementById('saleItem');
  const priceInput = document.getElementById('salePrice');
  
  if (!codeInput || !itemSelect || !priceInput) return;
  
  const enteredCode = codeInput.value.trim().toUpperCase();
  
  if (!enteredCode) {
    itemSelect.value = '';
    priceInput.value = '';
    updateCalculationDisplay();
    return;
  }
  
  // Find item by code
  const itemOption = Array.from(itemSelect.options).find(option => 
    option.dataset.code && option.dataset.code.toUpperCase() === enteredCode
  );
  
  if (itemOption) {
    itemSelect.value = itemOption.value;
    priceInput.value = itemOption.dataset.price;
    updateCalculationDisplay();
  } else {
    itemSelect.value = '';
    priceInput.value = '';
    updateCalculationDisplay();
    Utils.showNotification('Item with this code not found or not available');
  }
}

/**
 * Update price when item is selected
 */
function updateSalePrice() {
  const itemSelect = document.getElementById('saleItem');
  const priceInput = document.getElementById('salePrice');
  const codeInput = document.getElementById('saleItemCode');
  
  if (itemSelect && priceInput) {
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.price) {
      priceInput.value = selectedOption.dataset.price;
      if (codeInput && selectedOption.dataset.code) {
        codeInput.value = selectedOption.dataset.code;
      }
    } else {
      priceInput.value = '';
      if (codeInput) codeInput.value = '';
    }
    updateCalculationDisplay();
  }
}

/**
 * Update calculation display
 */
function updateCalculationDisplay() {
  const price = parseFloat(document.getElementById('salePrice')?.value) || 0;
  const quantity = parseInt(document.getElementById('saleQuantity')?.value) || 1;
  const discountType = document.getElementById('saleDiscountType')?.value || '';
  const discountValue = parseFloat(document.getElementById('saleDiscountValue')?.value) || 0;
  
  const subtotal = price * quantity;
  let discountAmount = 0;
  
  if (discountType === 'percentage') {
    discountAmount = Math.min((subtotal * discountValue) / 100, subtotal);
  } else if (discountType === 'amount') {
    discountAmount = Math.min(discountValue, subtotal);
  }
  
  const totalAmount = subtotal - discountAmount;
  
  // Update display fields
  const subtotalDisplay = document.getElementById('saleSubtotal');
  const discountDisplay = document.getElementById('saleDiscountAmount');
  const totalDisplay = document.getElementById('saleTotalAmount');
  
  if (subtotalDisplay) subtotalDisplay.textContent = Utils.formatCurrency(subtotal);
  if (discountDisplay) discountDisplay.textContent = Utils.formatCurrency(discountAmount);
  if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(totalAmount);
}

/**
 * Add new sale with API integration
 */
async function addNewSale(event) {
  event.preventDefault();
  
  if (!AuthModule.hasPermission('sales')) {
    Utils.showNotification('You do not have permission to create sales.');
    return;
  }

  const customerId = document.getElementById('saleCustomer').value;
  const itemId = document.getElementById('saleItem').value;
  const price = parseFloat(document.getElementById('salePrice').value);
  const quantity = parseInt(document.getElementById('saleQuantity').value) || 1;
  const discountType = document.getElementById('saleDiscountType').value;
  const discountValue = parseFloat(document.getElementById('saleDiscountValue').value) || 0;
  const paymentMethod = document.getElementById('salePaymentMethod').value;
  
  // Validation
  if (!customerId || !itemId || !price || !paymentMethod) {
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

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = setButtonLoading(submitBtn, 'Recording Sale...');

  try {
    const saleData = {
      customerId,
      itemId,
      quantity,
      price,
      discountType: discountType || '',
      discountValue,
      paymentMethod
    };

    const response = await SalesAPI.createSale(saleData);

    if (response.success) {
      sales.push(response.data);
      
      // Generate invoice automatically
      try {
        await InvoiceAPI.generateSalesInvoice(response.data.id);
      } catch (invoiceError) {
        console.warn('Failed to generate invoice automatically:', invoiceError);
      }
      
      renderSalesTable();
      if (window.updateDashboard) {
        updateDashboard();
      }
      
      // Refresh inventory to update quantities
      if (window.InventoryModule) {
        InventoryModule.refreshInventory();
      }
      
      closeModal('newSaleModal');
      event.target.reset();
      
      const customer = response.data.customerId;
      const item = response.data.itemId;
      Utils.showNotification(`Sale recorded successfully! Customer: ${customer.name}, Item: ${item.brand} ${item.model}, Total: ${Utils.formatCurrency(response.data.totalAmount)}`);
    }

  } catch (error) {
    console.error('Add sale error:', error);
    Utils.showNotification(error.message || 'Failed to record sale. Please try again.');
  } finally {
    resetButton(submitBtn, originalText || 'Record Sale');
  }
}

/**
 * Edit sale
 */
function editSale(saleId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot edit sales.');
    return;
  }
  
  Utils.showNotification('Edit sale functionality - to be implemented');
}

/**
 * Delete sale
 */
async function deleteSale(saleId) {
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  if (isStaff) {
    Utils.showNotification('Staff users cannot delete sales.');
    return;
  }

  const sale = sales.find(s => s.id === saleId);
  if (!sale) {
    Utils.showNotification('Sale not found.');
    return;
  }

  if (confirm(`Are you sure you want to delete the sale for ${sale.itemId.brand} ${sale.itemId.model}?`)) {
    try {
      const response = await SalesAPI.deleteSale(saleId);
      
      if (response.success) {
        sales = sales.filter(s => s.id !== saleId);
        renderSalesTable();
        if (window.updateDashboard) {
          updateDashboard();
        }
        
        // Refresh inventory to update quantities
        if (window.InventoryModule) {
          InventoryModule.refreshInventory();
        }
        
        Utils.showNotification('Sale deleted successfully!');
      }

    } catch (error) {
      console.error('Delete sale error:', error);
      Utils.showNotification(error.message || 'Failed to delete sale. Please try again.');
    }
  }
}

/**
 * View sale invoice
 */
async function viewSaleInvoice(saleId) {
  try {
    const response = await InvoiceAPI.getInvoicesByTransaction(saleId, 'sale');
    if (response.success && response.data.length > 0) {
      const invoice = response.data.find(inv => inv.type === 'Sales');
      if (invoice && window.InvoiceModule) {
        InvoiceModule.viewInvoice(invoice.id);
      } else {
        Utils.showNotification('Sales invoice not found for this sale.');
      }
    } else {
      Utils.showNotification('No invoice found for this sale.');
    }
  } catch (error) {
    console.error('View sale invoice error:', error);
    Utils.showNotification('Failed to view invoice.');
  }
}

/**
 * Search sales
 */
function searchSales(query) {
  const tbody = document.getElementById('salesTableBody');
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
 * Get sales statistics
 */
async function getSalesStats() {
  try {
    const response = await SalesAPI.getSalesStats();
    if (response.success) {
      return response.data;
    }
  } catch (error) {
    console.error('Get sales stats error:', error);
  }
  
  // Fallback to local calculation
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = sales.length;
  const averageSaleValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  const totalDiscounts = sales.reduce((sum, sale) => sum + (sale.discountAmount || 0), 0);
  
  return {
    totalSales,
    totalTransactions,
    averageSaleValue,
    totalDiscounts
  };
}

/**
 * Get recent sales
 */
function getRecentSales(limit = 5) {
  return sales
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

/**
 * Render sales table
 */
function renderSalesTable() {
  const tbody = document.getElementById('salesTableBody');
  if (!tbody) {
    console.error('Sales table body not found');
    return;
  }
  
  const currentUser = AuthModule.getCurrentUser();
  const isStaff = currentUser && currentUser.role === 'staff';
  
  tbody.innerHTML = '';
  
  if (sales.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #999; padding: 20px;">
          No sales recorded yet. Click "New Sale" to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort sales by date (newest first)
  const sortedSales = [...sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  sortedSales.forEach((sale, index) => {
    const row = document.createElement('tr');
    
    let actionButtons = '';
    
    // Check if invoice exists for this sale
    const hasInvoice = true; // Assume invoice exists for now
    
    if (!isStaff) {
      actionButtons = `
        <button class="btn btn-sm" onclick="editSale('${sale.id}')" title="Edit Sale">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteSale('${sale.id}')" title="Delete Sale">Delete</button>
      `;
    }
    
    if (hasInvoice) {
      actionButtons += `
        <button class="btn btn-sm btn-success" onclick="viewSaleInvoice('${sale.id}')" title="View Invoice">Invoice</button>
      `;
    }
    
    // Display discount info if applicable
    let discountInfo = '';
    if (sale.discountAmount && sale.discountAmount > 0) {
      discountInfo = `<br><small style="color: #dc3545;">Discount: ${Utils.formatCurrency(sale.discountAmount)}</small>`;
    }
    
    const date = new Date(sale.createdAt);
    const formattedDate = date.toLocaleDateString('en-IN');
    const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    
    row.innerHTML = `
      <td class="serial-number">${index + 1}</td>
      <td>${formattedDate}</td>
      <td>${formattedTime}</td>
      <td class="customer-info">
        <div class="customer-name">${Utils.sanitizeHtml(sale.customerId.name)}</div>
        <div class="customer-mobile">${Utils.sanitizeHtml(sale.customerId.phone)}</div>
      </td>
      <td>
        <strong>${Utils.sanitizeHtml(sale.itemId.brand)} ${Utils.sanitizeHtml(sale.itemId.model)}</strong><br>
        <small>Code: ${Utils.sanitizeHtml(sale.itemId.code)}</small><br>
        <small>Qty: ${sale.quantity}</small>
      </td>
      <td>
        ${Utils.formatCurrency(sale.totalAmount)}
        ${discountInfo}
      </td>
      <td><span class="status available">${Utils.sanitizeHtml(sale.paymentMethod)}</span></td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(row);
  });
  
  console.log('Sales table rendered successfully with API data');
}

/**
 * Refresh sales from API
 */
async function refreshSales() {
  try {
    await loadSalesFromAPI();
    renderSalesTable();
    console.log('Sales refreshed from API');
  } catch (error) {
    console.error('Refresh sales error:', error);
    Utils.showNotification('Failed to refresh sales data.');
  }
}

// Make functions globally available
window.searchItemByCode = searchItemByCode;
window.updateSalePrice = updateSalePrice;
window.updateCalculationDisplay = updateCalculationDisplay;

// Export functions for global use
window.SalesModule = {
  initializeSales,
  loadSalesFromAPI,
  openNewSaleModal,
  addNewSale,
  editSale,
  deleteSale,
  viewSaleInvoice,
  searchSales,
  getSalesStats,
  getRecentSales,
  renderSalesTable,
  refreshSales,
  resetButton,
  setButtonLoading,
  sales // For access by other modules
};