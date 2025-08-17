// Inventory module for ZEDSON Watchcraft - Complete Module
class InventoryModule {
    constructor() {
        this.inventory = [];
        this.editingItem = null;
    }

    async render(container) {
        try {
            container.innerHTML = this.getTemplate();
            await this.loadInventory();
            this.setupEvents();
            this.showInventoryList();
        } catch (error) {
            console.error('Inventory render error:', error);
            container.innerHTML = '<div class="error">Failed to load inventory</div>';
        }
    }

    getTemplate() {
        return `
            <div class="inventory-container">
                <div class="inventory-header">
                    <h1>Inventory Management</h1>
                    <button class="btn btn-primary" id="add-item-btn">+ Add Item</button>
                </div>

                <div class="inventory-stats">
                    <div class="stat-card">
                        <span class="stat-number" id="total-items">0</span>
                        <span class="stat-label">Total Items</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" id="total-value">₹0</span>
                        <span class="stat-label">Total Value</span>
                    </div>
                </div>

                <div class="search-bar">
                    <input type="text" id="search-box" placeholder="Search items..." class="form-input">
                </div>

                <div id="inventory-table">
                    Loading...
                </div>

                <!-- Add/Edit Modal -->
                <div id="item-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modal-title">Add Item</h3>
                            <span class="close" id="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <form id="item-form">
                                <div class="form-group">
                                    <label>Code:</label>
                                    <input type="text" id="item-code" required>
                                </div>
                                <div class="form-group">
                                    <label>Date:</label>
                                    <input type="date" id="item-date" required>
                                </div>
                                <div class="form-group">
                                    <label>Category:</label>
                                    <select id="item-category" required>
                                        <option value="">Select Category</option>
                                        <option value="Watch">Watch</option>
                                        <option value="WallClocks">WallClocks</option>
                                        <option value="Timepieces">Timepieces</option>
                                        <option value="Strap">Strap</option>
                                        <option value="Spring Bar">Spring Bar</option>
                                        <option value="Loop">Loop</option>
                                        <option value="Buckle">Buckle</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Amount:</label>
                                    <input type="number" id="item-amount" min="0" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label>Location:</label>
                                    <select id="item-location">
                                        <option value="Semmancheri">Semmancheri</option>
                                        <option value="Navalur">Navalur</option>
                                        <option value="Padur">Padur</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Warranty (months):</label>
                                    <input type="number" id="item-warranty" value="0" min="0">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                            <button type="button" class="btn btn-primary" id="save-btn">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadInventory() {
        try {
            this.inventory = await app.query('SELECT * FROM inventory ORDER BY created_at DESC');
            this.updateStats();
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.inventory = [];
        }
    }

    setupEvents() {
        const addBtn = document.getElementById('add-item-btn');
        if (addBtn) {
            addBtn.onclick = () => this.openModal();
        }

        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            searchBox.oninput = (e) => this.filterItems(e.target.value);
        }

        const closeModal = document.getElementById('close-modal');
        if (closeModal) {
            closeModal.onclick = () => this.closeModal();
        }

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeModal();
        }

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveItem();
        }

        const modal = document.getElementById('item-modal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            };
        }
    }

    updateStats() {
        const totalItems = this.inventory.length;
        const totalValue = this.inventory.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        const totalItemsEl = document.getElementById('total-items');
        const totalValueEl = document.getElementById('total-value');

        if (totalItemsEl) {
            totalItemsEl.textContent = totalItems;
        }
        if (totalValueEl) {
            totalValueEl.textContent = Utils.formatCurrency(totalValue);
        }
    }

    showInventoryList(items = null) {
        const container = document.getElementById('inventory-table');
        const itemsToShow = items || this.inventory;

        if (itemsToShow.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No inventory items found</h3>
                    <button class="btn btn-primary" onclick="inventoryModule.openModal()">Add First Item</button>
                </div>
            `;
            return;
        }

        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Location</th>
                        <th>Warranty</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        itemsToShow.forEach(item => {
            html += `
                <tr>
                    <td>${item.code || ''}</td>
                    <td>${item.date || ''}</td>
                    <td>${item.category || ''}</td>
                    <td>${Utils.formatCurrency(item.amount || 0)}</td>
                    <td>${item.location || ''}</td>
                    <td>${item.warranty_period || 0} months</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="inventoryModule.editItem(${item.id})">Edit</button>
                        <button class="btn btn-sm btn-error" onclick="inventoryModule.deleteItem(${item.id})">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    filterItems(searchTerm) {
        if (!searchTerm) {
            this.showInventoryList();
            return;
        }

        const filtered = this.inventory.filter(item => 
            (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.showInventoryList(filtered);
    }

    openModal(item = null) {
        this.editingItem = item;
        const modal = document.getElementById('item-modal');
        const title = document.getElementById('modal-title');

        if (item) {
            title.textContent = 'Edit Item';
            this.populateForm(item);
        } else {
            title.textContent = 'Add Item';
            this.clearForm();
        }

        modal.style.display = 'block';
    }

    closeModal() {
        const modal = document.getElementById('item-modal');
        modal.style.display = 'none';
        this.editingItem = null;
    }

    populateForm(item) {
        document.getElementById('item-code').value = item.code || '';
        document.getElementById('item-date').value = item.date || '';
        document.getElementById('item-category').value = item.category || '';
        document.getElementById('item-amount').value = item.amount || '';
        document.getElementById('item-location').value = item.location || 'Semmancheri';
        document.getElementById('item-warranty').value = item.warranty_period || 0;
    }

    clearForm() {
        document.getElementById('item-code').value = '';
        document.getElementById('item-date').value = Utils.getCurrentDate();
        document.getElementById('item-category').value = '';
        document.getElementById('item-amount').value = '';
        document.getElementById('item-location').value = 'Semmancheri';
        document.getElementById('item-warranty').value = '0';
    }

    async saveItem() {
        try {
            const code = document.getElementById('item-code').value.trim();
            const date = document.getElementById('item-date').value;
            const category = document.getElementById('item-category').value;
            const amount = document.getElementById('item-amount').value;
            const location = document.getElementById('item-location').value;
            const warranty = document.getElementById('item-warranty').value || 0;

            if (!code || !date || !category || !amount) {
                alert('Please fill in all required fields');
                return;
            }

            const saveBtn = document.getElementById('save-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const currentUser = await Auth.getCurrentUser();
            const username = currentUser ? currentUser.username : 'system';

            if (this.editingItem) {
                await app.run(`
                    UPDATE inventory 
                    SET code = ?, date = ?, category = ?, amount = ?, location = ?, warranty_period = ?, updated_at = ?
                    WHERE id = ?
                `, [code, date, category, amount, location, warranty, new Date().toISOString(), this.editingItem.id]);
            } else {
                await app.run(`
                    INSERT INTO inventory (code, date, category, amount, location, warranty_period, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [code, date, category, amount, location, warranty, username, new Date().toISOString()]);
            }

            await this.loadInventory();
            this.showInventoryList();
            this.closeModal();
            
            Utils.showSuccess(this.editingItem ? 'Item updated successfully' : 'Item created successfully');

        } catch (error) {
            console.error('Save error:', error);
            Utils.showError('Failed to save item');
        } finally {
            const saveBtn = document.getElementById('save-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        }
    }

    editItem(id) {
        const item = this.inventory.find(i => i.id === id);
        if (item) {
            this.openModal(item);
        }
    }

    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            await app.run('DELETE FROM inventory WHERE id = ?', [id]);
            await this.loadInventory();
            this.showInventoryList();
            Utils.showSuccess('Item deleted successfully');
        } catch (error) {
            console.error('Delete error:', error);
            Utils.showError('Failed to delete item');
        }
    }
}

const inventoryModule = new InventoryModule();
if (typeof app !== 'undefined') {
    app.registerModule('inventory', inventoryModule);
}="form-label">Date</label>
                                    <input type="date" name="date" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category</label>
                                    <select name="category" class="form-select" required>
                                        <option value="">Select Category</option>
                                        <option value="Watch">Watch</option>
                                        <option value="WallClocks">WallClocks</option>
                                        <option value="Strap">Strap</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Amount</label>
                                    <input type="number" name="amount" class="form-input" min="0" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Location</label>
                                    <select name="location" class="form-select">
                                        <option value="Semmancheri">Semmancheri</option>
                                        <option value="Navalur">Navalur</option>
                                        <option value="Padur">Padur</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('inventory-modal').style.display='none'">Cancel</button>
                            <button type="button" class="btn btn-primary" id="save-btn">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadData() {
        try {
            this.inventory = await app.query('SELECT * FROM inventory ORDER BY created_at DESC');
            this.applyFilters();
            this.updateStats();
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.inventory = [];
            this.renderList();
        }
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-inventory-btn');
        const searchInput = document.getElementById('search-input');
        const categoryFilter = document.getElementById('category-filter');
        const saveBtn = document.getElementById('save-btn');
        const form = document.getElementById('inventory-form');

        if (addBtn) {
            addBtn.onclick = () => this.openModal();
        }

        if (searchInput) {
            searchInput.oninput = (e) => {
                this.searchTerm = e.target.value;
                this.applyFilters();
            };
        }

        if (categoryFilter) {
            categoryFilter.onchange = (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => this.saveItem();
        }
    }

    applyFilters() {
        let filtered = [...this.inventory];

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                (item.code && item.code.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term))
            );
        }

        if (this.filters.category) {
            filtered = filtered.filter(item => item.category === this.filters.category);
        }

        this.filteredInventory = filtered;
        this.renderList();
    }

    renderList() {
        const container = document.getElementById('inventory-list');
        
        if (!this.filteredInventory || this.filteredInventory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No inventory items found</h3>
                    <button class="btn btn-primary" onclick="inventoryModule.openModal()">Add First Item</button>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredInventory.map(item => `
                        <tr>
                            <td>${item.code || ''}</td>
                            <td>${item.category || ''}</td>
                            <td>${item.date || ''}</td>
                            <td>${Utils.formatCurrency(item.amount || 0)}</td>
                            <td>${item.location || ''}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="inventoryModule.editItem(${item.id})">Edit</button>
                                <button class="btn btn-sm btn-error" onclick="inventoryModule.deleteItem(${item.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    updateStats() {
        const totalCount = this.inventory.length;
        const totalValue = this.inventory.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        const totalItemsEl = document.getElementById('total-items');
        const totalValueEl = document.getElementById('total-value');

        if (totalItemsEl) totalItemsEl.textContent = totalCount;
        if (totalValueEl) totalValueEl.textContent = Utils.formatCurrency(totalValue);
    }

    openModal(item = null) {
        this.editingItem = item;
        const modal = document.getElementById('inventory-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('inventory-form');

        if (item) {
            title.textContent = 'Edit Item';
            form.code.value = item.code || '';
            form.date.value = item.date || '';
            form.category.value = item.category || '';
            form.amount.value = item.amount || '';
            form.location.value = item.location || 'Semmancheri';
        } else {
            title.textContent = 'Add Item';
            form.reset();
            form.date.value = Utils.getCurrentDate();
            form.location.value = 'Semmancheri';
        }

        modal.style.display = 'block';
    }

    async saveItem() {
        try {
            const form = document.getElementById('inventory-form');
            const formData = {
                code: form.code.value.trim(),
                date: form.date.value,
                category: form.category.value,
                amount: parseFloat(form.amount.value) || 0,
                location: form.location.value
            };

            if (!formData.code || !formData.category) {
                Utils.showError('Code and Category are required');
                return;
            }

            const saveBtn = document.getElementById('save-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            if (this.editingItem) {
                await this.updateItem(this.editingItem.id, formData);
            } else {
                await this.createItem(formData);
            }

            document.getElementById('inventory-modal').style.display = 'none';
            await this.loadData();
            Utils.showSuccess('Item saved successfully');

        } catch (error) {
            console.error('Save error:', error);
            Utils.showError('Failed to save item');
        } finally {
            const saveBtn = document.getElementById('save-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        }
    }

    async createItem(data) {
        const currentUser = await Auth.getCurrentUser();
        const username = currentUser ? currentUser.username : 'system';
        
        await app.run(`
            INSERT INTO inventory (code, date, category, amount, location, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            data.code, data.date, data.category, data.amount, data.location,
            username, new Date().toISOString()
        ]);
    }

    async updateItem(id, data) {
        await app.run(`
            UPDATE inventory 
            SET code = ?, date = ?, category = ?, amount = ?, location = ?, updated_at = ?
            WHERE id = ?
        `, [
            data.code, data.date, data.category, data.amount, data.location,
            new Date().toISOString(), id
        ]);
    }

    editItem(id) {
        const item = this.inventory.find(i => i.id === id);
        if (item) {
            this.openModal(item);
        }
    }

    async deleteItem(id) {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                await app.run('DELETE FROM inventory WHERE id = ?', [id]);
                await this.loadData();
                Utils.showSuccess('Item deleted successfully');
            } catch (error) {
                console.error('Delete error:', error);
                Utils.showError('Failed to delete item');
            }
        }
    }
}

// Register the module
const inventoryModule = new InventoryModule();
if (typeof app !== 'undefined') {
    app.registerModule('inventory', inventoryModule);
}
}

// Register the module
const inventoryModule = new InventoryModule();
if (typeof app !== 'undefined') {
    app.registerModule('inventory', inventoryModule);
}// Inventory module for ZEDSON Watchcraft
class InventoryModule {
    constructor() {
        this.inventory = [];
        this.filteredInventory = [];
        this.categories = {};
        this.brands = [];
        this.currentSort = { field: 'created_at', direction: 'desc' };
        this.searchTerm = '';
        this.filters = {};
        this.editingItem = null;
    }

    async render(container) {
        try {
            container.innerHTML = this.getTemplate();
            await this.loadData();
            this.setupEventListeners();
            this.renderInventoryList();
        } catch (error) {
            console.error('Inventory render error:', error);
            Utils.showError('Failed to load inventory module');
        }
    }

    getTemplate() {
        return `
            <div class="inventory-container">
                <div class="inventory-header">
                    <h1>Inventory Management</h1>
                    <button class="btn btn-primary" id="add-inventory-btn">
                        <span>+</span> New Item
                    </button>
                </div>

                <div class="inventory-toolbar">
                    <div class="search-section">
                        <div class="search-input">
                            <input type="text" id="inventory-search" class="form-input" 
                                   placeholder="Search by code, category, brand...">
                        </div>
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="category-filter" class="form-select">
                            <option value="">All Categories</option>
                        </select>
                        
                        <select id="location-filter" class="form-select">
                            <option value="">All Locations</option>
                            <option value="Semmancheri">Semmancheri</option>
                            <option value="Navalur">Navalur</option>
                            <option value="Padur">Padur</option>
                        </select>
                        
                        <select id="sort-by" class="form-select">
                            <option value="created_at-desc">Newest First</option>
                            <option value="created_at-asc">Oldest First</option>
                            <option value="date-desc">Latest Date</option>
                            <option value="date-asc">Earliest Date</option>
                            <option value="category-asc">Category A-Z</option>
                            <option value="amount-desc">Highest Amount</option>
                            <option value="amount-asc">Lowest Amount</option>
                        </select>
                    </div>
                </div>

                <div class="inventory-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-items-count">0</span>
                        <span class="stat-label">Total Items</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="total-inventory-value">₹0</span>
                        <span class="stat-label">Total Value</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="available-items-count">0</span>
                        <span class="stat-label">Available Items</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="categories-count">0</span>
                        <span class="stat-label">Categories</span>
                    </div>
                </div>

                <div class="inventory-list-container">
                    <div id="inventory-list" class="table-responsive">
                        <div class="loading-placeholder">Loading inventory...</div>
                    </div>
                </div>

                <!-- Inventory Form Modal -->
                <div id="inventory-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-header">
                            <h3 class="modal-title" id="modal-title">Add New Item</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="inventory-form" class="form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Code</label>
                                        <input type="text" name="code" class="form-input" required>
                                        <small class="form-help">Item code for identification</small>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label required">Date</label>
                                        <input type="date" name="date" class="form-input" required>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Category</label>
                                        <select name="category" id="category-select" class="form-select" required>
                                            <option value="">Select Category</option>
                                            <option value="Watch">Watch</option>
                                            <option value="WallClocks">WallClocks</option>
                                            <option value="Timepieces">Timepieces</option>
                                            <option value="Strap">Strap</option>
                                            <option value="Spring Bar">Spring Bar</option>
                                            <option value="Loop">Loop</option>
                                            <option value="Buckle">Buckle</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Dynamic fields based on category -->
                                <div id="dynamic-fields"></div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Amount (₹)</label>
                                        <input type="number" name="amount" class="form-input" min="0" step="0.01" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Warranty Period (Months)</label>
                                        <input type="number" name="warrantyPeriod" class="form-input" min="0" value="0">
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Location</label>
                                        <select name="location" class="form-select" required>
                                            <option value="Semmancheri">Semmancheri</option>
                                            <option value="Navalur">Navalur</option>
                                            <option value="Padur">Padur</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Comments</label>
                                        <textarea name="comments" class="form-input form-textarea" rows="3"></textarea>
                                    </div>
                                </div>

                                <div id="form-errors" class="form-errors" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="inventory-form" class="btn btn-primary" id="save-inventory-btn">
                                Save Item
                            </button>
                        </div>
                    </div>
                </div>

                <!-- History Modal -->
                <div id="history-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-md">
                        <div class="modal-header">
                            <h3 class="modal-title">Item History</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <div id="history-content">
                                <div class="loading-placeholder">Loading history...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Confirmation Modal -->
                <div id="confirm-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-sm confirm-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Confirm Action</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="confirm-icon warning">⚠️</div>
                            <p id="confirm-message">Are you sure you want to delete this item?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="button" class="btn btn-error" id="confirm-action-btn">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadData() {
        try {
            // Load inventory items
            this.inventory = await app.query(`
                SELECT * FROM inventory 
                ORDER BY created_at DESC
            `);

            // Load categories configuration from global categories data
            this.categories = {};
            const categoriesConfig = [
                {
                    name: 'Watch',
                    config: {
                        fields: ['brand', 'gender', 'type', 'strap'],
                        brand: { type: 'autocomplete', required: true },
                        gender: { type: 'select', options: ['Gents', 'Ladies'], required: true },
                        type: { type: 'select', options: ['Analog', 'Digital'], required: true },
                        strap: { type: 'select', options: ['Leather', 'Chain', 'Fiber'], required: true }
                    }
                },
                {
                    name: 'WallClocks',
                    config: {
                        fields: ['brand', 'type'],
                        brand: { type: 'autocomplete', required: true },
                        type: { type: 'select', options: ['Analog', 'Digital'], required: true }
                    }
                },
                {
                    name: 'Timepieces',
                    config: {
                        fields: ['brand', 'type'],
                        brand: { type: 'autocomplete', required: true },
                        type: { type: 'select', options: ['Analog', 'Digital'], required: true }
                    }
                },
                {
                    name: 'Strap',
                    config: {
                        fields: ['brand', 'material', 'size'],
                        brand: { type: 'autocomplete', required: true },
                        material: { type: 'select', options: ['Leather', 'Chain', 'Fiber'], required: true },
                        size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true }
                    }
                },
                {
                    name: 'Spring Bar',
                    config: {
                        fields: ['size'],
                        size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true }
                    }
                },
                {
                    name: 'Loop',
                    config: {
                        fields: ['size', 'material'],
                        size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true },
                        material: { type: 'select', options: ['Leather', 'Fiber'], required: true }
                    }
                },
                {
                    name: 'Buckle',
                    config: {
                        fields: ['size'],
                        size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true }
                    }
                }
            ];

            // Convert to object format
            categoriesConfig.forEach(cat => {
                this.categories[cat.name] = cat.config;
            });

            // Extract unique brands for autocomplete
            this.brands = [...new Set(this.inventory.map(item => item.brand).filter(Boolean))];

            this.applyFilters();
            this.updateStats();
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Error loading inventory data:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Remove existing listeners
        const addBtn = document.getElementById('add-inventory-btn');
        const searchInput = document.getElementById('inventory-search');
        const clearBtn = document.getElementById('clear-search');
        const categoryFilter = document.getElementById('category-filter');
        const locationFilter = document.getElementById('location-filter');
        const sortBy = document.getElementById('sort-by');
        const form = document.getElementById('inventory-form');
        const categorySelect = document.getElementById('category-select');

        // Clone to remove listeners
        addBtn.replaceWith(addBtn.cloneNode(true));
        searchInput.replaceWith(searchInput.cloneNode(true));
        clearBtn.replaceWith(clearBtn.cloneNode(true));
        categoryFilter.replaceWith(categoryFilter.cloneNode(true));
        locationFilter.replaceWith(locationFilter.cloneNode(true));
        sortBy.replaceWith(sortBy.cloneNode(true));
        categorySelect.replaceWith(categorySelect.cloneNode(true));

        // Get fresh references
        const newAddBtn = document.getElementById('add-inventory-btn');
        const newSearchInput = document.getElementById('inventory-search');
        const newClearBtn = document.getElementById('clear-search');
        const newCategoryFilter = document.getElementById('category-filter');
        const newLocationFilter = document.getElementById('location-filter');
        const newSortBy = document.getElementById('sort-by');
        const newCategorySelect = document.getElementById('category-select');

        // Add item button
        newAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openInventoryModal();
        });

        // Search functionality
        newSearchInput.addEventListener('input', Utils.debounce((e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        }, 300));

        // Clear search
        newClearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            newSearchInput.value = '';
            this.searchTerm = '';
            this.applyFilters();
        });

        // Filters
        newCategoryFilter.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        newLocationFilter.addEventListener('change', (e) => {
            this.filters.location = e.target.value;
            this.applyFilters();
        });

        newSortBy.addEventListener('change', (e) => {
            const [field, direction] = e.target.value.split('-');
            this.currentSort = { field, direction };
            this.applyFilters();
        });

        // Category change for dynamic fields
        newCategorySelect.addEventListener('change', (e) => {
            this.updateDynamicFields(e.target.value);
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });

        // Modal close on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                e.target.style.display = 'none';
            }
        });
    }

    updateDynamicFields(category) {
        const dynamicFields = document.getElementById('dynamic-fields');
        
        if (!category || !this.categories[category]) {
            dynamicFields.innerHTML = '';
            return;
        }

        const config = this.categories[category];
        let fieldsHTML = '<div class="dynamic-fields-section"><h4>Category Details</h4>';

        config.fields.forEach(fieldName => {
            const fieldConfig = config[fieldName];
            
            fieldsHTML += '<div class="form-group">';
            fieldsHTML += `<label class="form-label${fieldConfig.required ? ' required' : ''}">${this.capitalizeFirst(fieldName)}</label>`;
            
            if (fieldConfig.type === 'select') {
                fieldsHTML += `<select name="${fieldName}" class="form-select"${fieldConfig.required ? ' required' : ''}>`;
                fieldsHTML += '<option value="">Select...</option>';
                fieldConfig.options.forEach(option => {
                    fieldsHTML += `<option value="${option}">${option}</option>`;
                });
                fieldsHTML += '</select>';
            } else if (fieldConfig.type === 'autocomplete') {
                fieldsHTML += `<input type="text" name="${fieldName}" class="form-input autocomplete-input" 
                             list="${fieldName}-list"${fieldConfig.required ? ' required' : ''}>`;
                fieldsHTML += `<datalist id="${fieldName}-list">`;
                if (fieldName === 'brand') {
                    this.brands.forEach(brand => {
                        fieldsHTML += `<option value="${brand}">`;
                    });
                }
                fieldsHTML += '</datalist>';
            } else {
                fieldsHTML += `<input type="text" name="${fieldName}" class="form-input"${fieldConfig.required ? ' required' : ''}>`;
            }
            
            fieldsHTML += '</div>';
        });

        fieldsHTML += '</div>';
        dynamicFields.innerHTML = fieldsHTML;
    }

    applyFilters() {
        let filtered = [...this.inventory];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.code.toLowerCase().includes(term) ||
                item.category.toLowerCase().includes(term) ||
                (item.brand && item.brand.toLowerCase().includes(term)) ||
                (item.particulars && item.particulars.toLowerCase().includes(term))
            );
        }

        // Apply category filter
        if (this.filters.category) {
            filtered = filtered.filter(item => item.category === this.filters.category);
        }

        // Apply location filter
        if (this.filters.location) {
            filtered = filtered.filter(item => item.location === this.filters.location);
        }

        // Apply sorting
        filtered = Utils.sortBy(filtered, this.currentSort.field, this.currentSort.direction);

        this.filteredInventory = filtered;
        this.renderInventoryList();
    }

    renderInventoryList() {
        const container = document.getElementById('inventory-list');
        
        if (this.filteredInventory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>No inventory items found</h3>
                    <p>Start by adding your first inventory item</p>
                    <button class="btn btn-primary" onclick="document.getElementById('add-inventory-btn').click()">
                        Add Item
                    </button>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th class="sortable" data-field="date">Date</th>
                        <th class="sortable" data-field="code">Code</th>
                        <th class="sortable" data-field="category">Category</th>
                        <th>Particulars</th>
                        <th class="sortable" data-field="warranty_period">Warranty</th>
                        <th class="sortable" data-field="amount">Amount</th>
                        <th>Ageing</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredInventory.map((item, index) => `
                        <tr${item.is_sold ? ' class="sold-item"' : ''}>
                            <td>${index + 1}</td>
                            <td>${Utils.formatDate(item.date)}</td>
                            <td class="font-mono">${item.code}</td>
                            <td><span class="category-badge">${item.category}</span></td>
                            <td>${this.buildParticulars(item)}</td>
                            <td>${item.warranty_period} months</td>
                            <td class="font-semibold">${Utils.formatCurrency(item.amount)}</td>
                            <td>${this.calculateAgeing(item.date)}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="inventoryModule.editItem(${item.id})" title="Edit">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="inventoryModule.showHistory(${item.id})" title="History">
                                        📋
                                    </button>
                                    <button class="btn btn-sm btn-error" onclick="inventoryModule.deleteItem(${item.id})" title="Delete">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;

        // Add sort click handlers
        container.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-field');
                const direction = this.currentSort.field === field && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                
                this.currentSort = { field, direction };
                this.applyFilters();
                
                // Update UI indicators
                container.querySelectorAll('th').forEach(header => header.classList.remove('sorted-asc', 'sorted-desc'));
                th.classList.add(`sorted-${direction}`);
            });
        });
    }

    buildParticulars(item) {
        const parts = [];
        if (item.brand) parts.push(item.brand);
        if (item.gender) parts.push(item.gender);
        if (item.type) parts.push(item.type);
        if (item.strap) parts.push(item.strap);
        if (item.material) parts.push(item.material);
        if (item.size) parts.push(item.size);
        return parts.join(', ') || 'N/A';
    }

    calculateAgeing(date) {
        const itemDate = new Date(date);
        const today = new Date();
        const diffTime = Math.abs(today - itemDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day';
        if (diffDays < 30) return `${diffDays} days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
        return `${Math.floor(diffDays / 365)} years`;
    }

    updateStats() {
        const totalCount = this.inventory.length;
        const totalValue = this.inventory.reduce((sum, item) => sum + (item.amount || 0), 0);
        const availableCount = this.inventory.filter(item => !item.is_sold).length;
        const categoriesCount = new Set(this.inventory.map(item => item.category)).size;

        document.getElementById('total-items-count').textContent = totalCount.toLocaleString();
        document.getElementById('total-inventory-value').textContent = Utils.formatCurrency(totalValue);
        document.getElementById('available-items-count').textContent = availableCount.toLocaleString();
        document.getElementById('categories-count').textContent = categoriesCount.toLocaleString();
    }

    populateCategoryFilter() {
        const filter = document.getElementById('category-filter');
        const categories = [...new Set(this.inventory.map(item => item.category))];
        
        // Clear existing options except "All Categories"
        while (filter.children.length > 1) {
            filter.removeChild(filter.lastChild);
        }
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filter.appendChild(option);
        });
    }

    openInventoryModal(item = null) {
        if (document.getElementById('inventory-modal').style.display === 'block') {
            return;
        }
        
        this.editingItem = item;
        const modal = document.getElementById('inventory-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('inventory-form');
        const saveBtn = document.getElementById('save-inventory-btn');

        // Clear form errors
        document.getElementById('form-errors').style.display = 'none';
        document.getElementById('dynamic-fields').innerHTML = '';

        if (item) {
            // Edit mode
            title.textContent = 'Edit Item';
            saveBtn.textContent = 'Update Item';
            
            // Populate form fields
            form.querySelector('input[name="code"]').value = item.code || '';
            form.querySelector('input[name="date"]').value = item.date || '';
            form.querySelector('select[name="category"]').value = item.category || '';
            form.querySelector('input[name="amount"]').value = item.amount || '';
            form.querySelector('input[name="warrantyPeriod"]').value = item.warranty_period || 0;
            form.querySelector('select[name="location"]').value = item.location || 'Semmancheri';
            form.querySelector('textarea[name="comments"]').value = item.comments || '';
            
            // Update dynamic fields and populate them
            this.updateDynamicFields(item.category);
            setTimeout(() => {
                if (item.brand) form.querySelector('input[name="brand"]')?.value = item.brand;
                if (item.gender) form.querySelector('select[name="gender"]')?.value = item.gender;
                if (item.type) form.querySelector('select[name="type"]')?.value = item.type;
                if (item.strap) form.querySelector('select[name="strap"]')?.value = item.strap;
                if (item.material) form.querySelector('select[name="material"]')?.value = item.material;
                if (item.size) form.querySelector('select[name="size"]')?.value = item.size;
            }, 100);
            
        } else {
            // Add mode
            form.reset();
            title.textContent = 'Add New Item';
            saveBtn.textContent = 'Save Item';
            
            // Set default values
            form.querySelector('input[name="date"]').value = Utils.getCurrentDate();
            form.querySelector('select[name="location"]').value = 'Semmancheri';
            form.querySelector('input[name="warrantyPeriod"]').value = '0';
        }

        modal.style.display = 'block';
        form.querySelector('input[name="code"]').focus();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const formData = this.collectFormData(form);
            
            // Basic validation
            if (!formData.code || !formData.category || !formData.amount) {
                this.showFormErrors({ general: 'Code, Category, and Amount are required' });
                return;
            }

            if (parseFloat(formData.amount) <= 0) {
                this.showFormErrors({ general: 'Amount must be greater than 0' });
                return;
            }

            // Disable save button
            const saveBtn = document.getElementById('save-inventory-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            if (this.editingItem) {
                await this.updateItem(this.editingItem.id, formData);
            } else {
                await this.createItem(formData);
            }

            document.getElementById('inventory-modal').style.display = 'none';
            await this.loadData();
            
            Utils.showSuccess(this.editingItem ? 'Item updated successfully' : 'Item created successfully');
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showFormErrors({ general: 'Failed to save item. Please try again.' });
        } finally {
            const saveBtn = document.getElementById('save-inventory-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = this.editingItem ? 'Update Item' : 'Save Item';
            }
        }
    }

    collectFormData(form) {
        const data = {
            code: form.querySelector('input[name="code"]').value.trim(),
            date: form.querySelector('input[name="date"]').value,
            category: form.querySelector('select[name="category"]').value,
            amount: form.querySelector('input[name="amount"]').value,
            warrantyPeriod: form.querySelector('input[name="warrantyPeriod"]').value || 0,
            location: form.querySelector('select[name="location"]').value,
            comments: form.querySelector('textarea[name="comments"]').value.trim()
        };

        // Collect dynamic fields
        const dynamicFields = document.getElementById('dynamic-fields');
        if (dynamicFields) {
            const inputs = dynamicFields.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.value) {
                    data[input.name] = input.value;
                }
            });
        }

        return data;
    }

    async createItem(data) {
        const currentUser = await Auth.getCurrentUser();
        const username = currentUser ? currentUser.username : 'system';
        
        const result = await app.run(`
            INSERT INTO inventory (
                code, date, category, brand, gender, type, strap, material, size,
                particulars, amount, warranty_period, location, comments, 
                created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.code, data.date, data.category, data.brand || null, data.gender || null,
            data.type || null, data.strap || null, data.material || null, data.size || null,
            this.buildParticularsFromData(data), data.amount, data.warrantyPeriod,
            data.location, data.comments, username, new Date().toISOString()
        ]);

        await Audit.logCreate('inventory', result.id, data, `Created inventory item: ${data.code} (${data.category})`);
        return result;
    }

    async updateItem(id, data) {
        const oldData = this.inventory.find(item => item.id === id);
        
        await app.run(`
            UPDATE inventory 
            SET code = ?, date = ?, category = ?, brand = ?, gender = ?, type = ?, 
                strap = ?, material = ?, size = ?, particulars = ?, amount = ?, 
                warranty_period = ?, location = ?, comments = ?, updated_at = ?
            WHERE id = ?
        `, [
            data.code, data.date, data.category, data.brand || null, data.gender || null,
            data.type || null, data.strap || null, data.material || null, data.size || null,
            this.buildParticularsFromData(data), data.amount, data.warrantyPeriod,
            data.location, data.comments, new Date().toISOString(), id
        ]);

        // Log history for significant changes
        await this.logItemHistory(id, oldData, data);
        await Audit.logUpdate('inventory', id, oldData, data, `Updated inventory item: ${data.code} (${data.category})`);
        return true;
    }

    async logItemHistory(itemId, oldData, newData) {
        const changes = [];
        
        ['location', 'amount', 'warranty_period', 'comments'].forEach(field => {
            if (oldData[field] !== newData[field]) {
                changes.push({
                    field: field,
                    oldValue: oldData[field],
                    newValue: newData[field]
                });
            }
        });

        for (const change of changes) {
            await app.run(`
                INSERT INTO inventory_history 
                (inventory_id, field_name, old_value, new_value, comments, changed_by, changed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                itemId, change.field, change.oldValue, change.newValue,
                `Updated ${change.field} from "${change.oldValue}" to "${change.newValue}"`,
                (await Auth.getCurrentUser())?.username || 'system',
                new Date().toISOString()
            ]);
        }
    }

    buildParticularsFromData(data) {
        const parts = [];
        if (data.brand) parts.push(data.brand);
        if (data.gender) parts.push(data.gender);
        if (data.type) parts.push(data.type);
        if (data.strap) parts.push(data.strap);
        if (data.material) parts.push(data.material);
        if (data.size) parts.push(data.size);
        return parts.join(', ') || null;
    }

    editItem(id) {
        const item = this.inventory.find(item => item.id === id);
        if (item) {
            this.openInventoryModal(item);
        }
    }

    async showHistory(id) {
        const modal = document.getElementById('history-modal');
        const content = document.getElementById('history-content');
        
        content.innerHTML = '<div class="loading-placeholder">Loading history...</div>';
        modal.style.display = 'block';

        try {
            const history = await app.query(`
                SELECT * FROM inventory_history 
                WHERE inventory_id = ? 
                ORDER BY changed_at DESC
            `, [id]);

            if (history.length === 0) {
                content.innerHTML = '<div class="empty-state">No history found for this item</div>';
                return;
            }

            const historyHTML = `
                <div class="history-list">
                    ${history.map(entry => `
                        <div class="history-entry">
                            <div class="history-header">
                                <strong>${this.capitalizeFirst(entry.field_name.replace('_', ' '))}</strong>
                                <span class="history-date">${Utils.formatDate(entry.changed_at)}</span>
                            </div>
                            <div class="history-details">
                                <span class="old-value">From: ${entry.old_value || 'Empty'}</span>
                                <span class="new-value">To: ${entry.new_value || 'Empty'}</span>
                            </div>
                            <div class="history-meta">
                                Changed by: ${entry.changed_by} • ${entry.comments}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            content.innerHTML = historyHTML;
        } catch (error) {
            console.error('Error loading history:', error);
            content.innerHTML = '<div class="error-state">Failed to load history</div>';
        }
    }

    deleteItem(id) {
        const item = this.inventory.find(item => item.id === id);
        if (!item) return;

        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-action-btn');

        message.textContent = `Are you sure you want to delete "${item.code}" (${item.category})? This action cannot be undone.`;
        
        confirmBtn.onclick = async () => {
            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Deleting...';
                
                await app.run('DELETE FROM inventory WHERE id = ?', [id]);
                await app.run('DELETE FROM inventory_history WHERE inventory_id = ?', [id]);
                await Audit.logDelete('inventory', id, item, `Deleted inventory item: ${item.code} (${item.category})`);
                
                modal.style.display = 'none';
                await this.loadData();
                Utils.showSuccess('Item deleted successfully');
                
            } catch (error) {
                console.error('Delete error:', error);
                Utils.showError('Failed to delete item');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete';
            }
        };

        modal.style.display = 'block';
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showFormErrors(errors) {
        const errorsDiv = document.getElementById('form-errors');
        const errorMessages = Object.values(errors).map(error => `<div class="error-item">• ${error}</div>`).join('');
        
        errorsDiv.innerHTML = `
            <div class="alert alert-error">
                <strong>Please fix the following errors:</strong>
                ${errorMessages}
            </div>
        `;
        errorsDiv.style.display = 'block';
    }

    async refresh() {
        try {
            await this.loadData();
        } catch (error) {
            console.error('Inventory refresh error:', error);
            Utils.showError('Failed to refresh inventory');
        }
    }
}

// Register the module
const inventoryModule = new InventoryModule();
if (typeof app !== 'undefined') {
    app.registerModule('inventory', inventoryModule);
}