const { ipcRenderer } = require('electron');

class InventoryModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.inventory = [];
        this.filteredInventory = [];
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Inventory form submission
        const inventoryForm = document.getElementById('inventoryForm');
        if (inventoryForm) {
            inventoryForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Category change handler
        const categorySelect = document.getElementById('itemCategory');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => this.toggleCategoryFields());
        }

        // Search functionality
        const searchInput = document.getElementById('inventorySearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.searchInventory();
                }
            });
        }

        // Filter functionality
        const categoryFilter = document.getElementById('categoryFilter');
        const outletFilter = document.getElementById('outletFilter');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterInventory());
        }
        
        if (outletFilter) {
            outletFilter.addEventListener('change', () => this.filterInventory());
        }
    }

    async loadData() {
        try {
            this.inventory = await ipcRenderer.invoke('get-inventory');
            this.filteredInventory = [...this.inventory];
            this.renderTable();
        } catch (error) {
            console.error('Error loading inventory:', error);
            showError('Error loading inventory');
        }
    }

    renderTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredInventory.forEach(item => {
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
            
            // Format price - Fixed: Ensure price is properly displayed
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
                    <button class="btn btn-sm btn-secondary" onclick="window.inventoryModule().edit(${item.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="window.inventoryModule().delete(${item.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    openModal(item = null) {
        const modal = document.getElementById('inventoryModal');
        const form = document.getElementById('inventoryForm');
        const title = document.getElementById('inventoryModalTitle');
        
        if (!modal || !form || !title) return;

        form.reset();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const dateField = document.getElementById('dateAdded');
        if (dateField) {
            dateField.value = today;
        }
        
        if (item) {
            title.textContent = 'Edit Inventory Item';
            this.populateForm(item);
            this.toggleCategoryFields();
        } else {
            title.textContent = 'Add Inventory Item';
            document.getElementById('inventoryId').value = '';
            document.getElementById('itemQuantity').value = '0';
            this.toggleCategoryFields();
        }
        
        modal.style.display = 'block';
    }

    populateForm(item) {
        const fields = [
            'inventoryId', 'itemCode', 'dateAdded', 'itemCategory', 'itemBrand', 
            'itemType', 'itemGender', 'itemMaterial', 'itemSize', 'itemBatteryCode',
            'itemQuantity', 'itemWarranty', 'itemPrice', 'itemOutlet', 'itemComments'
        ];

        // Map item properties to form fields
        const mapping = {
            inventoryId: item.id,
            itemCode: item.item_code,
            dateAdded: item.date_added,
            itemCategory: item.category,
            itemBrand: item.brand || '',
            itemType: item.type || '',
            itemGender: item.gender || '',
            itemMaterial: item.material || '',
            itemSize: item.size_mm || '',
            itemBatteryCode: item.battery_code || '',
            itemQuantity: item.quantity,
            itemWarranty: item.warranty_months || '',
            itemPrice: item.price || '',
            itemOutlet: item.outlet,
            itemComments: item.comments || ''
        };

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element && mapping[fieldId] !== undefined) {
                element.value = mapping[fieldId];
            }
        });
    }

    toggleCategoryFields() {
        const category = document.getElementById('itemCategory')?.value;
        
        // Hide all category-specific fields
        const watchClockFields = document.getElementById('watchClockFields');
        const strapFields = document.getElementById('strapFields');
        const batteryFields = document.getElementById('batteryFields');
        const genderField = document.getElementById('genderField');
        
        if (watchClockFields) watchClockFields.style.display = 'none';
        if (strapFields) strapFields.style.display = 'none';
        if (batteryFields) batteryFields.style.display = 'none';
        if (genderField) genderField.style.display = 'none';
        
        // Clear all conditional fields
        const conditionalFields = ['itemType', 'itemGender', 'itemMaterial', 'itemSize', 'itemBatteryCode'];
        conditionalFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) element.value = '';
        });
        
        // Show relevant fields based on category
        if (category === 'watch') {
            if (watchClockFields) watchClockFields.style.display = 'block';
            if (genderField) genderField.style.display = 'block';
        } else if (category === 'clock' || category === 'timepiece') {
            if (watchClockFields) watchClockFields.style.display = 'block';
        } else if (category === 'strap') {
            if (strapFields) strapFields.style.display = 'block';
        } else if (category === 'battery') {
            if (batteryFields) batteryFields.style.display = 'block';
        }
    }

    edit(id) {
        const item = this.inventory.find(i => i.id === id);
        if (item) {
            this.openModal(item);
        }
    }

    async delete(id) {
        if (confirm('Are you sure you want to delete this inventory item?')) {
            try {
                await ipcRenderer.invoke('delete-inventory-item', id);
                await this.loadData();
                await loadDashboardStats();
                showSuccess('Inventory item deleted successfully');
            } catch (error) {
                console.error('Error deleting inventory item:', error);
                showError('Error deleting inventory item');
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const itemData = this.collectFormData();
        
        // Basic required field validation
        if (!itemData.item_code || !itemData.category || !itemData.date_added || !itemData.outlet) {
            showError('Please fill in all required fields (Item Code, Category, Date, Outlet)');
            return;
        }

        // Fixed: Improved price validation
        if (!itemData.price || itemData.price <= 0) {
            const priceField = document.getElementById('itemPrice');
            const priceFieldValue = priceField ? priceField.value : 'N/A';
            
            showError(`Please enter a valid price greater than 0. Current value: "${priceFieldValue}"`);
            
            if (priceField) {
                priceField.focus();
                priceField.select();
            }
            return;
        }
        
        const itemId = document.getElementById('inventoryId').value;
        
        try {
            if (itemId) {
                itemData.id = parseInt(itemId);
                await ipcRenderer.invoke('update-inventory-item', itemData);
                showSuccess('Inventory item updated successfully');
            } else {
                await ipcRenderer.invoke('add-inventory-item', itemData);
                showSuccess('Inventory item added successfully');
            }
            
            closeModal('inventoryModal');
            await this.loadData();
            await loadDashboardStats();
        } catch (error) {
            console.error('Error saving inventory item:', error);
            if (error.message.includes('UNIQUE constraint failed')) {
                showError('Item code already exists. Please use a different code.');
            } else {
                showError('Error saving inventory item: ' + error.message);
            }
        }
    }

    collectFormData() {
        // Get all form field values
        const itemCode = document.getElementById('itemCode')?.value?.toUpperCase().trim();
        const dateAdded = document.getElementById('dateAdded')?.value;
        const category = document.getElementById('itemCategory')?.value;
        const brand = document.getElementById('itemBrand')?.value || null;
        const type = document.getElementById('itemType')?.value || null;
        const gender = document.getElementById('itemGender')?.value || null;
        const material = document.getElementById('itemMaterial')?.value || null;
        const sizeValue = document.getElementById('itemSize')?.value;
        const batteryCode = document.getElementById('itemBatteryCode')?.value || null;
        const quantityValue = document.getElementById('itemQuantity')?.value;
        const warrantyValue = document.getElementById('itemWarranty')?.value;
        const priceValue = document.getElementById('itemPrice')?.value;
        const outlet = document.getElementById('itemOutlet')?.value;
        const comments = document.getElementById('itemComments')?.value || null;
        
        // Parse numeric values with proper validation
        const size_mm = sizeValue ? parseInt(sizeValue) : null;
        const quantity = quantityValue ? parseInt(quantityValue) : 0;
        const warranty_months = warrantyValue ? parseInt(warrantyValue) : null;
        
        // Fixed: Better price parsing and validation
        let price = null;
        if (priceValue && priceValue.trim() !== '') {
            const parsedPrice = parseFloat(priceValue.trim());
            if (!isNaN(parsedPrice) && parsedPrice > 0) {
                price = parsedPrice;
            }
        }
        
        return {
            item_code: itemCode,
            date_added: dateAdded,
            category: category,
            brand: brand,
            type: type,
            gender: gender,
            material: material,
            size_mm: size_mm,
            battery_code: batteryCode,
            quantity: quantity,
            warranty_months: warranty_months,
            price: price,
            outlet: outlet,
            comments: comments
        };
    }

    async searchInventory() {
        const searchTerm = document.getElementById('inventorySearch')?.value?.trim();
        
        if (searchTerm) {
            try {
                this.filteredInventory = await ipcRenderer.invoke('search-inventory', searchTerm);
                this.renderTable();
            } catch (error) {
                console.error('Error searching inventory:', error);
                showError('Error searching inventory');
            }
        } else {
            this.clearSearch();
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('inventorySearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const outletFilter = document.getElementById('outletFilter');
        
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (outletFilter) outletFilter.value = '';
        
        this.filteredInventory = [...this.inventory];
        this.renderTable();
    }

    filterInventory() {
        const category = document.getElementById('categoryFilter')?.value;
        const outlet = document.getElementById('outletFilter')?.value;
        
        this.filteredInventory = this.inventory.filter(item => {
            const matchesCategory = !category || item.category === category;
            const matchesOutlet = !outlet || item.outlet === outlet;
            return matchesCategory && matchesOutlet;
        });
        
        this.renderTable();
    }

    // Methods for other modules
    async searchForSale(searchTerm) {
        try {
            return await ipcRenderer.invoke('search-inventory-for-sale', searchTerm);
        } catch (error) {
            console.error('Error searching inventory for sale:', error);
            return [];
        }
    }

    async getByCode(itemCode) {
        try {
            return await ipcRenderer.invoke('get-inventory-by-code', itemCode);
        } catch (error) {
            console.error('Error getting inventory by code:', error);
            return null;
        }
    }

    getItemById(id) {
        return this.inventory.find(item => item.id === id);
    }
}

// Global functions for HTML onclick handlers
window.searchInventory = function() {
    const inventoryModule = window.inventoryModule();
    if (inventoryModule) {
        inventoryModule.searchInventory();
    }
};

window.clearSearch = function() {
    const inventoryModule = window.inventoryModule();
    if (inventoryModule) {
        inventoryModule.clearSearch();
    }
};

window.filterByCategory = function() {
    const inventoryModule = window.inventoryModule();
    if (inventoryModule) {
        inventoryModule.filterInventory();
    }
};

window.filterByOutlet = function() {
    const inventoryModule = window.inventoryModule();
    if (inventoryModule) {
        inventoryModule.filterInventory();
    }
};

window.toggleCategoryFields = function() {
    const inventoryModule = window.inventoryModule();
    if (inventoryModule) {
        inventoryModule.toggleCategoryFields();
    }
};

module.exports = InventoryModule;