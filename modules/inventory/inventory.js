const { allQuery, getQuery, runQuery } = require('../../core/database');
const Utils = require('../../core/utils');
const auditLogger = require('../../core/audit');

class Inventory {
    constructor() {
        this.inventory = [];
        this.filteredInventory = [];
        this.searchTerm = '';
        this.sortField = 'date';
        this.sortDirection = 'desc';
        this.currentItem = null;
        this.brands = new Set();
        
        this.categories = {
            'Watch': {
                fields: ['brand', 'gender', 'type', 'strap'],
                options: {
                    gender: ['Gents', 'Ladies'],
                    type: ['Analog', 'Digital'],
                    strap: ['Leather', 'Chain', 'Fiber']
                }
            },
            'WallClocks': {
                fields: ['brand', 'type'],
                options: {
                    type: ['Analog', 'Digital']
                }
            },
            'Timepieces': {
                fields: ['brand', 'type'],
                options: {
                    type: ['Analog', 'Digital']
                }
            },
            'Strap': {
                fields: ['brand', 'material', 'size'],
                options: {
                    material: ['Leather', 'Chain', 'Fiber'],
                    size: this.generateSizes()
                }
            },
            'Spring Bar': {
                fields: ['size'],
                options: {
                    size: this.generateSizes()
                }
            },
            'Loop': {
                fields: ['size', 'material'],
                options: {
                    size: this.generateSizes(),
                    material: ['Leather', 'Fiber']
                }
            },
            'Buckle': {
                fields: ['size'],
                options: {
                    size: this.generateSizes()
                }
            }
        };
    }

    generateSizes() {
        const sizes = [];
        for (let i = 8; i <= 28; i += 2) {
            sizes.push(`${i}MM`);
        }
        return sizes;
    }

    async render() {
        return `
            <div class="inventory-container">
                <!-- Search and Filter Bar -->
                <div class="search-filter-bar">
                    <div class="search-box">
                        <input type="text" id="inventory-search" placeholder="Search inventory..." 
                               oninput="inventory.handleSearch(this.value)">
                    </div>
                    <div class="filter-group">
                        <select id="category-filter" onchange="inventory.applyFilters()">
                            <option value="">All Categories</option>
                            ${Object.keys(this.categories).map(cat => 
                                `<option value="${cat}">${cat}</option>`
                            ).join('')}
                        </select>
                        <select id="sort-field" onchange="inventory.handleSort()">
                            <option value="date">Sort by Date</option>
                            <option value="category">Sort by Category</option>
                            <option value="amount">Sort by Amount</option>
                            <option value="code">Sort by Code</option>
                        </select>
                        <select id="sort-direction" onchange="inventory.handleSort()">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="inventory.showNewItemForm()">
                        <span>+</span> New Item
                    </button>
                </div>

                <!-- Inventory List -->
                <div class="table-container">
                    <table class="table" id="inventory-table">
                        <thead>
                            <tr>
                                <th onclick="inventory.sortBy('date')">S.No</th>
                                <th onclick="inventory.sortBy('date')">Date</th>
                                <th onclick="inventory.sortBy('code')">Code</th>
                                <th onclick="inventory.sortBy('category')">Category</th>
                                <th onclick="inventory.sortBy('particulars')">Particulars</th>
                                <th onclick="inventory.sortBy('warranty_period')">Warranty</th>
                                <th onclick="inventory.sortBy('amount')">Amount</th>
                                <th>Ageing</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-tbody">
                            <tr>
                                <td colspan="9" class="text-center">
                                    <div class="loading-content">
                                        <div class="loading-spinner"></div>
                                        <div class="loading-text">Loading inventory...</div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            await this.loadInventory();
            await this.loadBrands();
            this.updateInventoryTable();
        } catch (error) {
            console.error('Inventory module initialization error:', error);
            window.app.showMessage('Failed to load inventory', 'error');
        }
    }

    async loadInventory() {
        try {
            this.inventory = await allQuery(`
                SELECT * FROM inventory 
                WHERE is_active = 1 
                ORDER BY date DESC, created_at DESC
            `);
            
            this.filteredInventory = [...this.inventory];
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.inventory = [];
            this.filteredInventory = [];
            throw error;
        }
    }

    async loadBrands() {
        try {
            const brands = await allQuery(`
                SELECT DISTINCT brand FROM inventory 
                WHERE brand IS NOT NULL AND brand != '' AND is_active = 1
                ORDER BY brand
            `);
            
            this.brands = new Set(brands.map(b => b.brand));
        } catch (error) {
            console.error('Error loading brands:', error);
            this.brands = new Set();
        }
    }

    updateInventoryTable() {
        const tbody = document.getElementById('inventory-tbody');
        if (!tbody) return;

        if (this.filteredInventory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center p-4">
                        ${this.searchTerm ? 'No inventory items found matching your search' : 'No inventory items found'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.filteredInventory.forEach((item, index) => {
            const ageing = Utils.calculateAging(item.date);
            const particulars = this.buildParticulars(item);
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${Utils.formatDate(item.date)}</td>
                    <td><strong>${item.code}</strong></td>
                    <td>${item.category}</td>
                    <td>${particulars}</td>
                    <td>${item.warranty_period} months</td>
                    <td>${Utils.formatCurrency(item.amount)}</td>
                    <td><span class="aging-badge">${ageing}</span></td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="inventory.editItem('${item.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="inventory.deleteItem('${item.id}')" title="Delete">
                            🗑️
                        </button>
                        <button class="btn btn-sm btn-info" onclick="inventory.showHistory('${item.id}')" title="History">
                            📋
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    buildParticulars(item) {
        const parts = [];
        
        if (item.brand) parts.push(item.brand);
        if (item.gender) parts.push(item.gender);
        if (item.type) parts.push(item.type);
        if (item.strap) parts.push(`${item.strap} Strap`);
        if (item.material) parts.push(item.material);
        if (item.size) parts.push(item.size);
        
        return parts.length > 0 ? parts.join(', ') : item.category;
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    handleSort() {
        const sortField = document.getElementById('sort-field').value;
        const sortDirection = document.getElementById('sort-direction').value;
        
        this.sortField = sortField;
        this.sortDirection = sortDirection;
        this.applyFilters();
    }

    sortBy(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        document.getElementById('sort-field').value = this.sortField;
        document.getElementById('sort-direction').value = this.sortDirection;
        
        this.applyFilters();
    }

    applyFilters() {
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        
        // Apply filters
        this.filteredInventory = this.inventory.filter(item => {
            // Search filter
            if (this.searchTerm) {
                const searchableText = `${item.code} ${item.category} ${item.brand || ''} ${item.particulars || ''} ${this.buildParticulars(item)}`.toLowerCase();
                if (!searchableText.includes(this.searchTerm)) {
                    return false;
                }
            }
            
            // Category filter
            if (categoryFilter && item.category !== categoryFilter) {
                return false;
            }
            
            return true;
        });

        // Apply sorting
        this.filteredInventory.sort((a, b) => {
            let aVal = a[this.sortField];
            let bVal = b[this.sortField];

            if (this.sortField === 'date') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (this.sortField === 'amount') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (this.sortField === 'particulars') {
                aVal = this.buildParticulars(a).toLowerCase();
                bVal = this.buildParticulars(b).toLowerCase();
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (this.sortDirection === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });

        this.updateInventoryTable();
    }

    showNewItemForm() {
        const content = `
            <form id="inventory-form" class="inventory-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="item-code">Code *</label>
                        <input type="text" id="item-code" name="code" required>
                        <small>Item code for identification</small>
                    </div>
                    <div class="form-group">
                        <label for="item-date">Date</label>
                        <input type="date" id="item-date" name="date" value="${Utils.getCurrentDate()}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="item-category">Category *</label>
                        <select id="item-category" name="category" required onchange="inventory.handleCategoryChange(this.value)">
                            <option value="">Select Category</option>
                            ${Object.keys(this.categories).map(cat => 
                                `<option value="${cat}">${cat}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="item-amount">Amount (₹) *</label>
                        <input type="number" id="item-amount" name="amount" step="0.01" min="0" required>
                    </div>
                </div>

                <!-- Dynamic fields will be inserted here -->
                <div id="dynamic-fields"></div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="warranty-period">Warranty Period (Months)</label>
                        <input type="number" id="warranty-period" name="warranty_period" value="0" min="0">
                    </div>
                    <div class="form-group">
                        <label for="item-location">Location</label>
                        <select id="item-location" name="location">
                            <option value="Semmancheri" selected>Semmancheri</option>
                            <option value="Navalur">Navalur</option>
                            <option value="Padur">Padur</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="item-comments">Comments</label>
                    <textarea id="item-comments" name="comments" rows="3"></textarea>
                </div>
            </form>
        `;

        window.app.showModal('New Inventory Item', content, `
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="inventory.saveItem()">Save Item</button>
        `);

        setTimeout(() => {
            document.getElementById('item-code').focus();
        }, 100);
    }

    handleCategoryChange(category) {
        const dynamicFields = document.getElementById('dynamic-fields');
        if (!dynamicFields || !category) return;

        const categoryConfig = this.categories[category];
        if (!categoryConfig) return;

        let html = '<div class="category-fields">';
        
        categoryConfig.fields.forEach(field => {
            const fieldName = field.replace('_', '-');
            const options = categoryConfig.options[field];
            
            if (field === 'brand') {
                // Brand field with autocomplete
                html += `
                    <div class="form-group">
                        <label for="item-${fieldName}">Brand</label>
                        <input type="text" id="item-${fieldName}" name="${field}" 
                               list="brands-list" placeholder="Type or select brand">
                        <datalist id="brands-list">
                            ${Array.from(this.brands).map(brand => 
                                `<option value="${brand}">`
                            ).join('')}
                        </datalist>
                    </div>
                `;
            } else if (options) {
                // Dropdown field
                html += `
                    <div class="form-group">
                        <label for="item-${fieldName}">${Utils.capitalize(field)}</label>
                        <select id="item-${fieldName}" name="${field}">
                            <option value="">Select ${Utils.capitalize(field)}</option>
                            ${options.map(option => 
                                `<option value="${option}">${option}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            } else {
                // Text field
                html += `
                    <div class="form-group">
                        <label for="item-${fieldName}">${Utils.capitalize(field)}</label>
                        <input type="text" id="item-${fieldName}" name="${field}">
                    </div>
                `;
            }
        });
        
        html += '</div>';
        dynamicFields.innerHTML = html;
    }

    async saveItem(isEdit = false) {
        try {
            const form = document.getElementById('inventory-form');
            const formData = Utils.getFormData(form);

            // Validation
            if (!formData.code.trim()) {
                window.app.showMessage('Item code is required', 'error');
                return;
            }

            if (!formData.category) {
                window.app.showMessage('Category is required', 'error');
                return;
            }

            if (!formData.amount || parseFloat(formData.amount) <= 0) {
                window.app.showMessage('Valid amount is required', 'error');
                return;
            }

            const itemData = {
                code: formData.code.trim(),
                date: formData.date || Utils.getCurrentDate(),
                category: formData.category,
                brand: formData.brand?.trim() || null,
                gender: formData.gender || null,
                type: formData.type || null,
                strap: formData.strap || null,
                material: formData.material || null,
                size: formData.size || null,
                amount: parseFloat(formData.amount),
                warranty_period: parseInt(formData.warranty_period) || 0,
                location: formData.location || 'Semmancheri',
                comments: formData.comments?.trim() || null,
                particulars: this.buildParticularsFromForm(formData),
                created_by: Utils.getCurrentUser(),
                updated_by: Utils.getCurrentUser()
            };

            let result;
            if (isEdit && this.currentItem) {
                // Update existing item
                result = await runQuery(`
                    UPDATE inventory 
                    SET code = ?, date = ?, category = ?, brand = ?, gender = ?, type = ?, 
                        strap = ?, material = ?, size = ?, amount = ?, warranty_period = ?, 
                        location = ?, comments = ?, particulars = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    itemData.code, itemData.date, itemData.category, itemData.brand,
                    itemData.gender, itemData.type, itemData.strap, itemData.material,
                    itemData.size, itemData.amount, itemData.warranty_period,
                    itemData.location, itemData.comments, itemData.particulars,
                    itemData.updated_by, this.currentItem.id
                ]);

                // Log changes to history
                await this.logItemChanges(this.currentItem, itemData);
                await auditLogger.logUpdate('INVENTORY', this.currentItem.id, this.currentItem, itemData);
                window.app.showMessage('Inventory item updated successfully', 'success');
            } else {
                // Create new item
                result = await runQuery(`
                    INSERT INTO inventory (code, date, category, brand, gender, type, strap, material, size, 
                                         amount, warranty_period, location, comments, particulars, created_by, updated_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    itemData.code, itemData.date, itemData.category, itemData.brand,
                    itemData.gender, itemData.type, itemData.strap, itemData.material,
                    itemData.size, itemData.amount, itemData.warranty_period,
                    itemData.location, itemData.comments, itemData.particulars,
                    itemData.created_by, itemData.updated_by
                ]);

                await auditLogger.logCreate('INVENTORY', result.id, itemData);
                window.app.showMessage('Inventory item created successfully', 'success');
            }

            // Add brand to our brands set if it's new
            if (itemData.brand) {
                this.brands.add(itemData.brand);
            }

            // Close modal and refresh data
            document.querySelector('.modal-overlay').remove();
            await this.loadInventory();
            this.applyFilters();

        } catch (error) {
            console.error('Error saving inventory item:', error);
            window.app.showMessage('Failed to save inventory item', 'error');
        }
    }

    buildParticularsFromForm(formData) {
        const parts = [];
        
        if (formData.brand) parts.push(formData.brand);
        if (formData.gender) parts.push(formData.gender);
        if (formData.type) parts.push(formData.type);
        if (formData.strap) parts.push(`${formData.strap} Strap`);
        if (formData.material) parts.push(formData.material);
        if (formData.size) parts.push(formData.size);
        
        return parts.length > 0 ? parts.join(', ') : formData.category;
    }

    async logItemChanges(oldItem, newItem) {
        const fields = ['code', 'date', 'category', 'brand', 'gender', 'type', 'strap', 
                       'material', 'size', 'amount', 'warranty_period', 'location', 'comments'];
        
        for (const field of fields) {
            if (oldItem[field] !== newItem[field]) {
                await auditLogger.logHistory(
                    'INVENTORY', 
                    oldItem.id, 
                    field, 
                    oldItem[field], 
                    newItem[field], 
                    newItem.comments
                );
            }
        }
    }

    async editItem(itemId) {
        try {
            const item = await getQuery('SELECT * FROM inventory WHERE id = ?', [itemId]);
            
            if (!item) {
                window.app.showMessage('Inventory item not found', 'error');
                return;
            }

            this.currentItem = item;

            const content = `
                <form id="inventory-form" class="inventory-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-code">Code *</label>
                            <input type="text" id="item-code" name="code" value="${item.code}" required>
                        </div>
                        <div class="form-group">
                            <label for="item-date">Date</label>
                            <input type="date" id="item-date" name="date" value="${item.date.split('T')[0]}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-category">Category *</label>
                            <select id="item-category" name="category" required onchange="inventory.handleCategoryChange(this.value)">
                                <option value="">Select Category</option>
                                ${Object.keys(this.categories).map(cat => 
                                    `<option value="${cat}" ${cat === item.category ? 'selected' : ''}>${cat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="item-amount">Amount (₹) *</label>
                            <input type="number" id="item-amount" name="amount" step="0.01" min="0" 
                                   value="${item.amount}" required>
                        </div>
                    </div>

                    <div id="dynamic-fields"></div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="warranty-period">Warranty Period (Months)</label>
                            <input type="number" id="warranty-period" name="warranty_period" 
                                   value="${item.warranty_period}" min="0">
                        </div>
                        <div class="form-group">
                            <label for="item-location">Location</label>
                            <select id="item-location" name="location">
                                <option value="Semmancheri" ${item.location === 'Semmancheri' ? 'selected' : ''}>Semmancheri</option>
                                <option value="Navalur" ${item.location === 'Navalur' ? 'selected' : ''}>Navalur</option>
                                <option value="Padur" ${item.location === 'Padur' ? 'selected' : ''}>Padur</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="item-comments">Comments</label>
                        <textarea id="item-comments" name="comments" rows="3">${item.comments || ''}</textarea>
                    </div>
                </form>
            `;

            window.app.showModal('Edit Inventory Item', content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="inventory.saveItem(true)">Update Item</button>
            `);

            // Load category fields after modal is created
            setTimeout(() => {
                this.handleCategoryChange(item.category);
                // Populate dynamic fields
                setTimeout(() => {
                    this.populateDynamicFields(item);
                }, 100);
            }, 100);

        } catch (error) {
            console.error('Error loading item for edit:', error);
            window.app.showMessage('Failed to load item details', 'error');
        }
    }

    populateDynamicFields(item) {
        const fields = ['brand', 'gender', 'type', 'strap', 'material', 'size'];
        fields.forEach(field => {
            const element = document.getElementById(`item-${field.replace('_', '-')}`);
            if (element && item[field]) {
                element.value = item[field];
            }
        });
    }

    async deleteItem(itemId) {
        try {
            const item = await getQuery('SELECT * FROM inventory WHERE id = ?', [itemId]);
            
            if (!item) {
                window.app.showMessage('Inventory item not found', 'error');
                return;
            }

            // Check if item is used in any sales or services
            const salesUsage = await getQuery(
                'SELECT COUNT(*) as count FROM sale_items WHERE inventory_id = ?',
                [itemId]
            );

            if (salesUsage.count > 0) {
                window.app.showMessage(
                    'Cannot delete item that has been sold. Use deactivate instead.',
                    'error'
                );
                return;
            }

            window.app.showConfirm(
                `Are you sure you want to delete item "${item.code}"? This action cannot be undone.`,
                async () => {
                    try {
                        await runQuery('UPDATE inventory SET is_active = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                                     [Utils.getCurrentUser(), itemId]);
                        await auditLogger.logDelete('INVENTORY', itemId, item);
                        
                        window.app.showMessage('Inventory item deleted successfully', 'success');
                        await this.loadInventory();
                        this.applyFilters();
                    } catch (error) {
                        console.error('Error deleting item:', error);
                        window.app.showMessage('Failed to delete item', 'error');
                    }
                }
            );

        } catch (error) {
            console.error('Error in delete item:', error);
            window.app.showMessage('Failed to delete item', 'error');
        }
    }

    async showHistory(itemId) {
        try {
            const history = await auditLogger.getHistory('INVENTORY', itemId);
            
            if (history.length === 0) {
                window.app.showMessage('No history found for this item', 'info');
                return;
            }

            let content = '<div class="history-list">';
            content += '<div class="table-container"><table class="table">';
            content += '<thead><tr><th>Date</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Changed By</th></tr></thead><tbody>';
            
            history.forEach(record => {
                content += `
                    <tr>
                        <td>${Utils.formatDate(record.changed_at, 'DD MMM YYYY HH:mm')}</td>
                        <td>${Utils.capitalize(record.field_name)}</td>
                        <td>${record.old_value || '-'}</td>
                        <td>${record.new_value || '-'}</td>
                        <td>${record.changed_by}</td>
                    </tr>
                `;
            });
            
            content += '</tbody></table></div></div>';

            window.app.showModal('Item History', content, `
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            `);

        } catch (error) {
            console.error('Error loading item history:', error);
            window.app.showMessage('Failed to load item history', 'error');
        }
    }

    async searchByCode(code) {
        const searchBox = document.getElementById('inventory-search');
        if (searchBox) {
            searchBox.value = code;
            this.handleSearch(code);
        }
    }

    async search(searchTerm) {
        // For global search integration
        return this.inventory.filter(item => {
            const searchableText = `${item.code} ${item.category} ${item.brand || ''} ${this.buildParticulars(item)}`;
            return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
        }).slice(0, 10);
    }

    async refresh() {
        await this.loadInventory();
        await this.loadBrands();
        this.applyFilters();
    }
}

// Make inventory instance available globally for event handlers
window.inventory = null;

// Export the class
export default Inventory;

// Set up global inventory instance when module loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.currentModule === 'inventory') {
        window.inventory = window.app.modules.inventory;
    }
});