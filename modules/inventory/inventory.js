// Inventory module for ZEDSON Watchcraft
(function() {
    'use strict';
    
    // Prevent redeclaration
    if (typeof window.InventoryModule !== 'undefined') {
        console.log('InventoryModule already exists, skipping redeclaration');
        return;
    }

class InventoryModule {
    constructor() {
        this.items = [];
        this.filteredItems = [];
        this.currentSort = { field: 'created_at', direction: 'desc' };
        this.searchTerm = '';
        this.filters = {};
        this.editingItem = null;
        // Use global categories configuration
        this.categories = window.categories?.inventory || [
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
    }

    async render(container) {
        try {
            console.log('Inventory module: Starting render...');
            
            // Check if required dependencies are available
            if (typeof app === 'undefined') {
                throw new Error('App instance not available');
            }
            
            if (typeof Utils === 'undefined') {
                throw new Error('Utils not available');
            }
            
            if (typeof Auth === 'undefined') {
                throw new Error('Auth not available');
            }
            
            console.log('Inventory module: Dependencies check passed');
            
            container.innerHTML = this.getTemplate();
            console.log('Inventory module: Template rendered');
            
            await this.loadInventory();
            console.log('Inventory module: Data loaded');
            
            this.setupEventListeners();
            console.log('Inventory module: Event listeners setup');
            
            this.renderInventoryList();
            console.log('Inventory module: List rendered');
            
        } catch (error) {
            console.error('Inventory render error:', error);
            console.error('Error stack:', error.stack);
            
            // Show a more detailed error message
            container.innerHTML = `
                <div class="error-container" style="padding: 2rem; text-align: center; color: #dc2626;">
                    <h2>Failed to Load Inventory Module</h2>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>Please check the browser console for more details.</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        Reload Application
                    </button>
                </div>
            `;
            
            if (typeof Utils !== 'undefined' && Utils.showError) {
                Utils.showError(`Failed to load inventory module: ${error.message}`);
            } else {
                alert(`Failed to load inventory module: ${error.message}`);
            }
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
                                   placeholder="Search by code, brand, category...">
                        </div>
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="category-filter" class="form-select">
                            <option value="">All Categories</option>
                            ${this.categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
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
                            <option value="code-asc">Code A-Z</option>
                            <option value="code-desc">Code Z-A</option>
                            <option value="category-asc">Category A-Z</option>
                            <option value="amount-desc">Price High-Low</option>
                            <option value="amount-asc">Price Low-High</option>
                        </select>
                    </div>
                </div>

                <div class="inventory-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-items-count">0</span>
                        <span class="stat-label">Total Items</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="total-value">₹0</span>
                        <span class="stat-label">Total Value</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="sold-items-count">0</span>
                        <span class="stat-label">Sold Items</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="available-items-count">0</span>
                        <span class="stat-label">Available Items</span>
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
                                        <input type="text" name="code" class="form-input" maxlength="50" required>
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
                                            ${this.categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>

                                <!-- Dynamic fields based on category -->
                                <div id="dynamic-fields"></div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Amount (₹)</label>
                                        <input type="number" name="amount" class="form-input" step="0.01" min="0" required>
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
                                            <option value="Semmancheri" selected>Semmancheri</option>
                                            <option value="Navalur">Navalur</option>
                                            <option value="Padur">Padur</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Comments</label>
                                        <textarea name="comments" class="form-textarea" rows="3" maxlength="500"></textarea>
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
                    <div class="modal-dialog modal-lg">
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

    async loadInventory() {
        try {
            this.items = await app.query(`
                SELECT *,
                ROUND(
                    CASE 
                        WHEN JULIANDAY('now') - JULIANDAY(date) >= 0
                        THEN JULIANDAY('now') - JULIANDAY(date)
                        ELSE 0
                    END
                ) as ageing
                FROM inventory 
                ORDER BY created_at DESC
            `);

            this.applyFilters();
            this.updateStats();
        } catch (error) {
            console.error('Error loading inventory:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Add item button
        document.getElementById('add-inventory-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.openInventoryModal();
        });

        // Search functionality
        document.getElementById('inventory-search').addEventListener('input', Utils.debounce((e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        }, 300));

        // Clear search
        document.getElementById('clear-search').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('inventory-search').value = '';
            this.searchTerm = '';
            this.applyFilters();
        });

        // Filters
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('location-filter').addEventListener('change', (e) => {
            this.filters.location = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sort-by').addEventListener('change', (e) => {
            const [field, direction] = e.target.value.split('-');
            this.currentSort = { field, direction };
            this.applyFilters();
        });

        // Form submission
        document.getElementById('inventory-form').addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });

        // Category change for dynamic fields
        document.getElementById('category-select').addEventListener('change', (e) => {
            this.renderDynamicFields(e.target.value);
        });

        // Set today's date as default
        document.querySelector('input[name="date"]').value = Utils.getCurrentDate();

        // Modal close on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                e.target.style.display = 'none';
            }
        });
    }

    renderDynamicFields(categoryName) {
        const dynamicFieldsContainer = document.getElementById('dynamic-fields');
        const category = this.categories.find(cat => cat.name === categoryName);
        
        if (!category) {
            dynamicFieldsContainer.innerHTML = '';
            return;
        }

        const fields = category.config.fields || [];
        let fieldsHTML = '';

        fields.forEach(fieldName => {
            const fieldConfig = category.config[fieldName];
            if (!fieldConfig) return;

            if (fieldConfig.type === 'select') {
                fieldsHTML += `
                    <div class="form-group">
                        <label class="form-label ${fieldConfig.required ? 'required' : ''}">${Utils.capitalizeFirst(fieldName)}</label>
                        <select name="${fieldName}" class="form-select" ${fieldConfig.required ? 'required' : ''}>
                            <option value="">Select ${fieldName}</option>
                            ${fieldConfig.options.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    </div>
                `;
            } else if (fieldConfig.type === 'autocomplete') {
                fieldsHTML += `
                    <div class="form-group">
                        <label class="form-label ${fieldConfig.required ? 'required' : ''}">${Utils.capitalizeFirst(fieldName)}</label>
                        <input type="text" name="${fieldName}" class="form-input" 
                               list="${fieldName}-list" ${fieldConfig.required ? 'required' : ''}>
                        <datalist id="${fieldName}-list">
                            <!-- Options will be populated dynamically from existing data -->
                        </datalist>
                    </div>
                `;
            }
        });

        dynamicFieldsContainer.innerHTML = `
            <div class="dynamic-fields-section">
                <h4>Category Details</h4>
                <div class="form-row">
                    ${fieldsHTML}
                </div>
            </div>
        `;

        // Populate autocomplete options
        this.populateAutocompleteOptions(categoryName);
    }

    async populateAutocompleteOptions(categoryName) {
        try {
            const existingValues = await app.query(`
                SELECT DISTINCT brand, gender, type, strap, material, size
                FROM inventory 
                WHERE category = ?
            `, [categoryName]);

            // Populate brand autocomplete
            const brandDatalist = document.getElementById('brand-list');
            if (brandDatalist) {
                const brands = [...new Set(existingValues.map(item => item.brand).filter(Boolean))];
                brandDatalist.innerHTML = brands.map(brand => `<option value="${brand}">`).join('');
            }
        } catch (error) {
            console.error('Error populating autocomplete options:', error);
        }
    }

    applyFilters() {
        let filtered = [...this.items];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.code.toLowerCase().includes(term) ||
                (item.brand && item.brand.toLowerCase().includes(term)) ||
                item.category.toLowerCase().includes(term) ||
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

        this.filteredItems = filtered;
        this.renderInventoryList();
    }

    renderInventoryList() {
        const container = document.getElementById('inventory-list');
        
        if (this.filteredItems.length === 0) {
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
                        <th class="sortable" data-field="ageing">Ageing</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredItems.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${Utils.formatDate(item.date)}</td>
                            <td class="font-mono">${item.code}</td>
                            <td>${item.category}</td>
                            <td>${this.buildParticulars(item)}</td>
                            <td>${item.warranty_period} months</td>
                            <td class="font-semibold">${Utils.formatCurrency(item.amount)}</td>
                            <td>${item.ageing} days</td>
                            <td>
                                <span class="status-badge ${item.is_sold ? 'sold' : 'available'}">
                                    ${item.is_sold ? 'Sold' : 'Available'}
                                </span>
                            </td>
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
        if (item.particulars) parts.push(item.particulars);
        
        return parts.join(' | ') || 'No details';
    }

    updateStats() {
        const totalItems = this.items.length;
        const totalValue = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const soldItems = this.items.filter(item => item.is_sold).length;
        const availableItems = totalItems - soldItems;

        document.getElementById('total-items-count').textContent = totalItems.toLocaleString();
        document.getElementById('total-value').textContent = Utils.formatCurrency(totalValue);
        document.getElementById('sold-items-count').textContent = soldItems.toLocaleString();
        document.getElementById('available-items-count').textContent = availableItems.toLocaleString();
    }

    openInventoryModal(item = null) {
        this.editingItem = item;
        const modal = document.getElementById('inventory-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('inventory-form');
        const saveBtn = document.getElementById('save-inventory-btn');

        // Clear form errors
        document.getElementById('form-errors').style.display = 'none';

        if (item) {
            // Edit mode
            title.textContent = 'Edit Inventory Item';
            saveBtn.textContent = 'Update Item';
            
            // Populate form fields
            form.querySelector('input[name="code"]').value = item.code || '';
            form.querySelector('input[name="date"]').value = item.date || '';
            form.querySelector('select[name="category"]').value = item.category || '';
            form.querySelector('input[name="amount"]').value = item.amount || '';
            form.querySelector('input[name="warrantyPeriod"]').value = item.warranty_period || 0;
            form.querySelector('select[name="location"]').value = item.location || 'Semmancheri';
            form.querySelector('textarea[name="comments"]').value = item.comments || '';

            // Render dynamic fields for the category
            this.renderDynamicFields(item.category);
            
            // Populate dynamic fields
            setTimeout(() => {
                const brandField = form.querySelector('input[name="brand"]');
                if (brandField) brandField.value = item.brand || '';
                
                const genderField = form.querySelector('select[name="gender"]');
                if (genderField) genderField.value = item.gender || '';
                
                const typeField = form.querySelector('select[name="type"]');
                if (typeField) typeField.value = item.type || '';
                
                const strapField = form.querySelector('select[name="strap"]');
                if (strapField) strapField.value = item.strap || '';
                
                const materialField = form.querySelector('select[name="material"]');
                if (materialField) materialField.value = item.material || '';
                
                const sizeField = form.querySelector('select[name="size"]');
                if (sizeField) sizeField.value = item.size || '';
            }, 100);
        } else {
            // Add mode
            form.reset();
            title.textContent = 'Add New Inventory Item';
            saveBtn.textContent = 'Save Item';
            document.querySelector('input[name="date"]').value = Utils.getCurrentDate();
            document.getElementById('dynamic-fields').innerHTML = '';
        }

        modal.style.display = 'block';
        form.querySelector('input[name="code"]').focus();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = this.collectFormData(e.target);
            
            // Basic validation
            const validation = this.validateFormData(formData);
            if (!validation.isValid) {
                this.showFormErrors(validation.errors);
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
            await this.loadInventory();
            
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
        const data = {};
        const formData = new FormData(form);
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    validateFormData(data) {
        const errors = {};
        
        if (!data.code?.trim()) errors.code = 'Code is required';
        if (!data.date) errors.date = 'Date is required';
        if (!data.category) errors.category = 'Category is required';
        if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) < 0) {
            errors.amount = 'Valid amount is required';
        }
        if (!data.location) errors.location = 'Location is required';
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    async createItem(data) {
        const currentUser = await Auth.getCurrentUser();
        const username = currentUser ? currentUser.username : 'system';
        
        // Build particulars from dynamic fields
        const particulars = this.buildParticularsFromData(data);
        
        const result = await app.run(`
            INSERT INTO inventory (
                code, date, category, brand, gender, type, strap, material, size,
                particulars, amount, warranty_period, location, comments, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.code, data.date, data.category, data.brand || null, data.gender || null,
            data.type || null, data.strap || null, data.material || null, data.size || null,
            particulars, parseFloat(data.amount), parseInt(data.warrantyPeriod) || 0,
            data.location, data.comments || null, username, new Date().toISOString()
        ]);

        await Audit.logCreate('inventory', result.id, data, `Created inventory item: ${data.code}`);
        return result;
    }

    async updateItem(id, data) {
        const oldData = this.items.find(item => item.id === id);
        const particulars = this.buildParticularsFromData(data);
        
        await app.run(`
            UPDATE inventory 
            SET code = ?, date = ?, category = ?, brand = ?, gender = ?, type = ?, 
                strap = ?, material = ?, size = ?, particulars = ?, amount = ?, 
                warranty_period = ?, location = ?, comments = ?, updated_at = ?
            WHERE id = ?
        `, [
            data.code, data.date, data.category, data.brand || null, data.gender || null,
            data.type || null, data.strap || null, data.material || null, data.size || null,
            particulars, parseFloat(data.amount), parseInt(data.warrantyPeriod) || 0,
            data.location, data.comments || null, new Date().toISOString(), id
        ]);

        // Track history for significant changes
        await this.trackChanges(id, oldData, data);

        await Audit.logUpdate('inventory', id, oldData, data, `Updated inventory item: ${data.code}`);
        return true;
    }

    buildParticularsFromData(data) {
        const parts = [];
        if (data.brand) parts.push(data.brand);
        if (data.gender) parts.push(data.gender);
        if (data.type) parts.push(data.type);
        if (data.strap) parts.push(data.strap);
        if (data.material) parts.push(data.material);
        if (data.size) parts.push(data.size);
        
        return parts.join(' | ');
    }

    async trackChanges(inventoryId, oldData, newData) {
        const currentUser = await Auth.getCurrentUser();
        const username = currentUser ? currentUser.username : 'system';
        
        const fieldsToTrack = ['location', 'amount', 'warranty_period', 'comments'];
        
        for (const field of fieldsToTrack) {
            if (oldData[field] !== newData[field]) {
                await app.run(`
                    INSERT INTO inventory_history (inventory_id, field_name, old_value, new_value, changed_by, changed_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    inventoryId, field, oldData[field], newData[field], username, new Date().toISOString()
                ]);
            }
        }
    }

    editItem(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            this.openInventoryModal(item);
        }
    }

    async showHistory(id) {
        const modal = document.getElementById('history-modal');
        const content = document.getElementById('history-content');
        
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
                        <div class="history-item">
                            <div class="history-header">
                                <span class="history-field">${entry.field_name}</span>
                                <span class="history-date">${Utils.formatDate(entry.changed_at)}</span>
                            </div>
                            <div class="history-changes">
                                <span class="old-value">From: ${entry.old_value || 'Empty'}</span>
                                <span class="new-value">To: ${entry.new_value || 'Empty'}</span>
                            </div>
                            <div class="history-user">Changed by: ${entry.changed_by}</div>
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
        const item = this.items.find(item => item.id === id);
        if (!item) return;

        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-action-btn');

        message.textContent = `Are you sure you want to delete item "${item.code}"? This action cannot be undone.`;
        
        confirmBtn.onclick = async () => {
            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Deleting...';
                
                await app.run('DELETE FROM inventory WHERE id = ?', [id]);
                await Audit.logDelete('inventory', id, item, `Deleted inventory item: ${item.code}`);
                
                modal.style.display = 'none';
                await this.loadInventory();
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
            await this.loadInventory();
        } catch (error) {
            console.error('Inventory refresh error:', error);
            Utils.showError('Failed to refresh inventory');
        }
    }
}

// Register the module (prevent duplicate registration)
if (typeof window !== 'undefined') {
    window.InventoryModule = InventoryModule;
}

const inventoryModule = new InventoryModule();
if (typeof app !== 'undefined') {
    app.registerModule('inventory', inventoryModule);
} else {
    // Wait for app to be available
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof app !== 'undefined') {
            app.registerModule('inventory', inventoryModule);
        }
    });
}

})(); // End IIFE