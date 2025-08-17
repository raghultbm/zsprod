// User Management module for ZEDSON Watchcraft
(function() {
    'use strict';
    
    // Prevent redeclaration
    if (typeof window.UsersModule !== 'undefined') {
        console.log('UsersModule already exists, skipping redeclaration');
        return;
    }

class UsersModule {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentSort = { field: 'created_at', direction: 'desc' };
        this.searchTerm = '';
        this.filters = {};
        this.editingUser = null;
        this.userTypes = ['admin', 'owner', 'manager'];
        this.modulePermissions = {
            dashboard: ['admin', 'owner', 'manager'],
            customers: ['admin', 'owner', 'manager'],
            inventory: ['admin', 'owner', 'manager'],
            sales: ['admin', 'owner', 'manager'],
            service: ['admin', 'owner', 'manager'],
            invoices: ['admin', 'owner', 'manager'],
            expense: ['admin', 'owner'],
            ledger: ['admin', 'owner'],
            users: ['admin']
        };
    }

    async render(container) {
        try {
            console.log('Users module: Starting render...');
            
            // Check if current user is admin
            const currentUser = await Auth.getCurrentUser();
            if (!currentUser || currentUser.user_type !== 'admin') {
                container.innerHTML = `
                    <div class="access-denied">
                        <div class="access-denied-icon">🚫</div>
                        <h2>Access Denied</h2>
                        <p>Only administrators can access User Management.</p>
                        <button onclick="app.loadModule('dashboard')" class="btn btn-primary">
                            Return to Dashboard
                        </button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.getTemplate();
            console.log('Users module: Template rendered');
            
            await this.loadUsers();
            console.log('Users module: Data loaded');
            
            this.setupEventListeners();
            console.log('Users module: Event listeners setup');
            
            this.renderUsersList();
            console.log('Users module: List rendered');
            
        } catch (error) {
            console.error('Users render error:', error);
            container.innerHTML = `
                <div class="error-container" style="padding: 2rem; text-align: center; color: #dc2626;">
                    <h2>Failed to Load User Management</h2>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        Reload Application
                    </button>
                </div>
            `;
        }
    }

    getTemplate() {
        return `
            <div class="users-container">
                <div class="users-header">
                    <h1>User Management</h1>
                    <button class="btn btn-primary" id="add-user-btn">
                        <span>+</span> New User
                    </button>
                </div>

                <div class="users-toolbar">
                    <div class="search-section">
                        <div class="search-input">
                            <input type="text" id="user-search" class="form-input" 
                                   placeholder="Search by username or user type...">
                        </div>
                        <button class="btn btn-secondary" id="clear-search">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="usertype-filter" class="form-select">
                            <option value="">All User Types</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                        </select>
                        
                        <select id="status-filter" class="form-select">
                            <option value="">All Status</option>
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                        </select>
                        
                        <select id="sort-by" class="form-select">
                            <option value="created_at-desc">Newest First</option>
                            <option value="created_at-asc">Oldest First</option>
                            <option value="username-asc">Username A-Z</option>
                            <option value="username-desc">Username Z-A</option>
                            <option value="user_type-asc">User Type A-Z</option>
                        </select>
                    </div>
                </div>

                <div class="users-stats">
                    <div class="stat-item">
                        <span class="stat-number" id="total-users-count">0</span>
                        <span class="stat-label">Total Users</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="active-users-count">0</span>
                        <span class="stat-label">Active Users</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="admin-users-count">0</span>
                        <span class="stat-label">Administrators</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="recent-logins-count">0</span>
                        <span class="stat-label">Recent Logins</span>
                    </div>
                </div>

                <div class="users-list-container">
                    <div id="users-list" class="table-responsive">
                        <div class="loading-placeholder">Loading users...</div>
                    </div>
                </div>

                <!-- User Form Modal -->
                <div id="user-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-header">
                            <h3 class="modal-title" id="modal-title">Add New User</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="user-form" class="form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label required">Username</label>
                                        <input type="text" name="username" class="form-input" 
                                               maxlength="50" pattern="[a-zA-Z0-9_]+" required>
                                        <small class="form-help">Only letters, numbers, and underscores allowed</small>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label required">User Type</label>
                                        <select name="userType" class="form-select" required>
                                            <option value="">Select User Type</option>
                                            <option value="admin">Administrator</option>
                                            <option value="owner">Owner</option>
                                            <option value="manager">Manager</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-row" id="password-section">
                                    <div class="form-group">
                                        <label class="form-label required">Password</label>
                                        <input type="password" name="password" class="form-input" 
                                               minlength="6" required>
                                        <small class="form-help">Minimum 6 characters</small>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label required">Confirm Password</label>
                                        <input type="password" name="confirmPassword" class="form-input" 
                                               minlength="6" required>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Status</label>
                                        <select name="isActive" class="form-select">
                                            <option value="1" selected>Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Module Permissions -->
                                <div class="permissions-section">
                                    <h4>Module Permissions</h4>
                                    <p class="permissions-help">Select which modules this user can access:</p>
                                    <div id="module-permissions" class="permissions-grid">
                                        <!-- Permissions will be populated dynamically -->
                                    </div>
                                </div>

                                <div id="form-errors" class="form-errors" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="user-form" class="btn btn-primary" id="save-user-btn">
                                Save User
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Change Password Modal -->
                <div id="password-modal" class="modal-backdrop" style="display: none;">
                    <div class="modal-dialog modal-md">
                        <div class="modal-header">
                            <h3 class="modal-title">Change Password</h3>
                            <button class="modal-close" onclick="this.closest('.modal-backdrop').style.display='none'">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="password-form" class="form">
                                <input type="hidden" name="userId" id="password-user-id">
                                
                                <div class="form-group">
                                    <label class="form-label required">New Password</label>
                                    <input type="password" name="newPassword" class="form-input" 
                                           minlength="6" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label required">Confirm New Password</label>
                                    <input type="password" name="confirmNewPassword" class="form-input" 
                                           minlength="6" required>
                                </div>

                                <div id="password-form-errors" class="form-errors" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="submit" form="password-form" class="btn btn-primary" id="change-password-btn">
                                Change Password
                            </button>
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
                            <p id="confirm-message">Are you sure you want to perform this action?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').style.display='none'">
                                Cancel
                            </button>
                            <button type="button" class="btn btn-error" id="confirm-action-btn">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadUsers() {
        try {
            this.users = await app.query(`
                SELECT id, username, user_type, permissions, is_active, 
                       created_by, created_at, updated_at
                FROM users 
                ORDER BY created_at DESC
            `);

            // Parse permissions JSON
            this.users = this.users.map(user => ({
                ...user,
                permissions: user.permissions ? JSON.parse(user.permissions) : {}
            }));

            this.applyFilters();
            this.updateStats();
        } catch (error) {
            console.error('Error loading users:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Clear existing listeners to prevent duplicates
        this.removeEventListeners();
        
        // Add user button
        const addBtn = document.getElementById('add-user-btn');
        this.addBtnHandler = (e) => {
            e.preventDefault();
            this.openUserModal();
        };
        addBtn.addEventListener('click', this.addBtnHandler);

        // Search functionality
        const searchInput = document.getElementById('user-search');
        this.searchHandler = Utils.debounce((e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        }, 300);
        searchInput.addEventListener('input', this.searchHandler);

        // Clear search
        const clearBtn = document.getElementById('clear-search');
        this.clearHandler = (e) => {
            e.preventDefault();
            searchInput.value = '';
            this.searchTerm = '';
            this.applyFilters();
        };
        clearBtn.addEventListener('click', this.clearHandler);

        // Filters
        const userTypeFilter = document.getElementById('usertype-filter');
        this.userTypeFilterHandler = (e) => {
            this.filters.userType = e.target.value;
            this.applyFilters();
        };
        userTypeFilter.addEventListener('change', this.userTypeFilterHandler);

        const statusFilter = document.getElementById('status-filter');
        this.statusFilterHandler = (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        };
        statusFilter.addEventListener('change', this.statusFilterHandler);

        const sortBy = document.getElementById('sort-by');
        this.sortHandler = (e) => {
            const [field, direction] = e.target.value.split('-');
            this.currentSort = { field, direction };
            this.applyFilters();
        };
        sortBy.addEventListener('change', this.sortHandler);

        // Form submissions
        const userForm = document.getElementById('user-form');
        this.userFormHandler = (e) => {
            this.handleUserFormSubmit(e);
        };
        userForm.addEventListener('submit', this.userFormHandler);

        const passwordForm = document.getElementById('password-form');
        this.passwordFormHandler = (e) => {
            this.handlePasswordFormSubmit(e);
        };
        passwordForm.addEventListener('submit', this.passwordFormHandler);

        // User type change for permissions
        const userTypeSelect = document.querySelector('select[name="userType"]');
        this.userTypeSelectHandler = (e) => {
            this.renderModulePermissions(e.target.value);
        };
        userTypeSelect.addEventListener('change', this.userTypeSelectHandler);

        // Modal close on backdrop click
        this.modalHandler = (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                e.target.style.display = 'none';
            }
        };
        document.addEventListener('click', this.modalHandler);
    }

    removeEventListeners() {
        // Remove existing event listeners to prevent duplicates
        const addBtn = document.getElementById('add-user-btn');
        const searchInput = document.getElementById('user-search');
        const clearBtn = document.getElementById('clear-search');
        const userTypeFilter = document.getElementById('usertype-filter');
        const statusFilter = document.getElementById('status-filter');
        const sortBy = document.getElementById('sort-by');
        const userForm = document.getElementById('user-form');
        const passwordForm = document.getElementById('password-form');
        const userTypeSelect = document.querySelector('select[name="userType"]');

        if (this.addBtnHandler) addBtn?.removeEventListener('click', this.addBtnHandler);
        if (this.searchHandler) searchInput?.removeEventListener('input', this.searchHandler);
        if (this.clearHandler) clearBtn?.removeEventListener('click', this.clearHandler);
        if (this.userTypeFilterHandler) userTypeFilter?.removeEventListener('change', this.userTypeFilterHandler);
        if (this.statusFilterHandler) statusFilter?.removeEventListener('change', this.statusFilterHandler);
        if (this.sortHandler) sortBy?.removeEventListener('change', this.sortHandler);
        if (this.userFormHandler) userForm?.removeEventListener('submit', this.userFormHandler);
        if (this.passwordFormHandler) passwordForm?.removeEventListener('submit', this.passwordFormHandler);
        if (this.userTypeSelectHandler) userTypeSelect?.removeEventListener('change', this.userTypeSelectHandler);
        if (this.modalHandler) document.removeEventListener('click', this.modalHandler);
    }

    applyFilters() {
        let filtered = [...this.users];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(user => 
                user.username.toLowerCase().includes(term) ||
                user.user_type.toLowerCase().includes(term)
            );
        }

        // Apply user type filter
        if (this.filters.userType) {
            filtered = filtered.filter(user => user.user_type === this.filters.userType);
        }

        // Apply status filter
        if (this.filters.status !== undefined && this.filters.status !== '') {
            filtered = filtered.filter(user => user.is_active.toString() === this.filters.status);
        }

        // Apply sorting
        filtered = Utils.sortBy(filtered, this.currentSort.field, this.currentSort.direction);

        this.filteredUsers = filtered;
        this.renderUsersList();
    }

    renderUsersList() {
        const container = document.getElementById('users-list');
        
        if (this.filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No users found</h3>
                    <p>Create your first user account</p>
                    <button class="btn btn-primary" onclick="document.getElementById('add-user-btn').click()">
                        Add User
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
                        <th class="sortable" data-field="username">Username</th>
                        <th class="sortable" data-field="user_type">User Type</th>
                        <th class="sortable" data-field="is_active">Status</th>
                        <th>Permissions</th>
                        <th class="sortable" data-field="created_at">Created Date</th>
                        <th class="sortable" data-field="created_by">Created By</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredUsers.map((user, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td class="font-semibold">${user.username}</td>
                            <td>
                                <span class="user-type-badge ${user.user_type}">
                                    ${Utils.capitalizeFirst(user.user_type)}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                                    ${user.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="usersModule.showPermissions(${user.id})" title="View Permissions">
                                    🔐 Permissions
                                </button>
                            </td>
                            <td>${Utils.formatDate(user.created_at)}</td>
                            <td>${user.created_by || 'System'}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="usersModule.editUser(${user.id})" title="Edit">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="usersModule.changePassword(${user.id})" title="Change Password">
                                        🔑
                                    </button>
                                    <button class="btn btn-sm btn-${user.is_active ? 'error' : 'success'}" 
                                            onclick="usersModule.toggleUserStatus(${user.id})" 
                                            title="${user.is_active ? 'Deactivate' : 'Activate'}">
                                        ${user.is_active ? '🚫' : '✅'}
                                    </button>
                                    ${user.user_type !== 'admin' ? `
                                        <button class="btn btn-sm btn-error" onclick="usersModule.deleteUser(${user.id})" title="Delete">
                                            🗑️
                                        </button>
                                    ` : ''}
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

    updateStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.is_active).length;
        const adminUsers = this.users.filter(user => user.user_type === 'admin').length;
        const recentLogins = this.users.filter(user => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(user.updated_at || user.created_at) > weekAgo;
        }).length;

        document.getElementById('total-users-count').textContent = totalUsers.toLocaleString();
        document.getElementById('active-users-count').textContent = activeUsers.toLocaleString();
        document.getElementById('admin-users-count').textContent = adminUsers.toLocaleString();
        document.getElementById('recent-logins-count').textContent = recentLogins.toLocaleString();
    }

    openUserModal(user = null) {
        this.editingUser = user;
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('user-form');
        const saveBtn = document.getElementById('save-user-btn');
        const passwordSection = document.getElementById('password-section');

        // Clear form errors immediately
        document.getElementById('form-errors').style.display = 'none';

        if (user) {
            // Edit mode - populate form synchronously
            title.textContent = 'Edit User';
            saveBtn.textContent = 'Update User';
            passwordSection.style.display = 'none'; // Hide password fields in edit mode
            
            // Populate form fields immediately
            const usernameField = form.querySelector('input[name="username"]');
            usernameField.value = user.username || '';
            usernameField.readOnly = true;
            usernameField.style.backgroundColor = '#f8f9fa';
            usernameField.style.cursor = 'not-allowed';
            
            form.querySelector('select[name="userType"]').value = user.user_type || '';
            form.querySelector('select[name="isActive"]').value = user.is_active ? '1' : '0';
            
            // Render permissions immediately
            this.renderModulePermissions(user.user_type, user.permissions);
        } else {
            // Add mode - reset form
            form.reset();
            title.textContent = 'Add New User';
            saveBtn.textContent = 'Save User';
            passwordSection.style.display = 'block'; // Show password fields in add mode
            
            const usernameField = form.querySelector('input[name="username"]');
            usernameField.readOnly = false;
            usernameField.style.backgroundColor = '';
            usernameField.style.cursor = '';
            
            // Clear permissions
            document.getElementById('module-permissions').innerHTML = '';
        }

        // Show modal and focus immediately
        modal.style.display = 'block';
        
        // Focus on the first editable field
        requestAnimationFrame(() => {
            const firstInput = form.querySelector('input[name="username"]');
            if (firstInput && !firstInput.readOnly) {
                firstInput.focus();
                firstInput.select();
            } else {
                // Focus on user type if username is readonly
                const userTypeSelect = form.querySelector('select[name="userType"]');
                if (userTypeSelect) {
                    userTypeSelect.focus();
                }
            }
        });
    }

    renderModulePermissions(userType, currentPermissions = {}) {
        const container = document.getElementById('module-permissions');
        
        if (!userType) {
            container.innerHTML = '<p class="text-muted">Please select a user type first.</p>';
            return;
        }

        let permissionsHTML = '';

        Object.keys(this.modulePermissions).forEach(module => {
            const allowedTypes = this.modulePermissions[module];
            const isAvailable = allowedTypes.includes(userType);
            const isChecked = currentPermissions[module] || isAvailable;

            permissionsHTML += `
                <div class="permission-item">
                    <label class="permission-label ${!isAvailable ? 'disabled' : ''}">
                        <input type="checkbox" 
                               name="permission_${module}" 
                               value="1"
                               ${isChecked ? 'checked' : ''}
                               ${!isAvailable ? 'disabled' : ''}
                               class="permission-checkbox">
                        <span class="permission-text">${Utils.capitalizeFirst(module)}</span>
                        ${!isAvailable ? '<small class="permission-note">Not available for this user type</small>' : ''}
                    </label>
                </div>
            `;
        });

        container.innerHTML = permissionsHTML;
    }

    async handleUserFormSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = this.collectUserFormData(e.target);
            
            // Validation
            const validation = this.validateUserFormData(formData);
            if (!validation.isValid) {
                this.showFormErrors(validation.errors, 'form-errors');
                return;
            }

            // Disable save button
            const saveBtn = document.getElementById('save-user-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            if (this.editingUser) {
                await this.updateUser(this.editingUser.id, formData);
            } else {
                await this.createUser(formData);
            }

            document.getElementById('user-modal').style.display = 'none';
            await this.loadUsers();
            
            Utils.showSuccess(this.editingUser ? 'User updated successfully' : 'User created successfully');
            
        } catch (error) {
            console.error('User form submission error:', error);
            this.showFormErrors({ general: error.message || 'Failed to save user. Please try again.' }, 'form-errors');
        } finally {
            const saveBtn = document.getElementById('save-user-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = this.editingUser ? 'Update User' : 'Save User';
            }
        }
    }

    collectUserFormData(form) {
        const data = {};
        const formData = new FormData(form);
        
        for (let [key, value] of formData.entries()) {
            if (key.startsWith('permission_')) {
                const module = key.replace('permission_', '');
                data.permissions = data.permissions || {};
                data.permissions[module] = true;
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }

    validateUserFormData(data) {
        const errors = {};
        
        if (!data.username?.trim()) errors.username = 'Username is required';
        if (!data.userType) errors.userType = 'User type is required';
        
        if (!this.editingUser) { // Only validate passwords for new users
            if (!data.password) errors.password = 'Password is required';
            if (!data.confirmPassword) errors.confirmPassword = 'Confirm password is required';
            if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
                errors.confirmPassword = 'Passwords do not match';
            }
            if (data.password && data.password.length < 6) {
                errors.password = 'Password must be at least 6 characters';
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    async createUser(data) {
        const currentUser = await Auth.getCurrentUser();
        const username = currentUser ? currentUser.username : 'system';
        
        // Hash password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        const result = await app.run(`
            INSERT INTO users (username, password, user_type, permissions, is_active, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            data.username,
            hashedPassword,
            data.userType,
            JSON.stringify(data.permissions || {}),
            data.isActive === '1' ? 1 : 0,
            username,
            new Date().toISOString()
        ]);

        await Audit.logCreate('users', result.id, data, `Created user: ${data.username} (${data.userType})`);
        return result;
    }

    async updateUser(id, data) {
        const oldData = this.users.find(user => user.id === id);
        
        await app.run(`
            UPDATE users 
            SET user_type = ?, permissions = ?, is_active = ?, updated_at = ?
            WHERE id = ?
        `, [
            data.userType,
            JSON.stringify(data.permissions || {}),
            data.isActive === '1' ? 1 : 0,
            new Date().toISOString(),
            id
        ]);

        await Audit.logUpdate('users', id, oldData, data, `Updated user: ${oldData.username}`);
        return true;
    }

    editUser(id) {
        const user = this.users.find(user => user.id === id);
        if (user) {
            this.openUserModal(user);
        }
    }

    changePassword(id) {
        const user = this.users.find(user => user.id === id);
        if (!user) return;

        const modal = document.getElementById('password-modal');
        document.getElementById('password-user-id').value = id;
        document.getElementById('password-form-errors').style.display = 'none';
        document.getElementById('password-form').reset();
        
        modal.style.display = 'block';
    }

    async handlePasswordFormSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const userId = formData.get('userId');
            const newPassword = formData.get('newPassword');
            const confirmNewPassword = formData.get('confirmNewPassword');
            
            // Validation
            if (!newPassword || newPassword.length < 6) {
                this.showFormErrors({ password: 'Password must be at least 6 characters' }, 'password-form-errors');
                return;
            }
            
            if (newPassword !== confirmNewPassword) {
                this.showFormErrors({ confirm: 'Passwords do not match' }, 'password-form-errors');
                return;
            }

            // Disable button
            const changeBtn = document.getElementById('change-password-btn');
            changeBtn.disabled = true;
            changeBtn.textContent = 'Changing...';

            // Hash new password
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await app.run(`
                UPDATE users SET password = ?, updated_at = ? WHERE id = ?
            `, [hashedPassword, new Date().toISOString(), userId]);

            const user = this.users.find(u => u.id == userId);
            await Audit.logAction('PASSWORD_CHANGE', 'users', userId, `Password changed for user: ${user.username}`);

            document.getElementById('password-modal').style.display = 'none';
            Utils.showSuccess('Password changed successfully');
            
        } catch (error) {
            console.error('Password change error:', error);
            this.showFormErrors({ general: 'Failed to change password' }, 'password-form-errors');
        } finally {
            const changeBtn = document.getElementById('change-password-btn');
            if (changeBtn) {
                changeBtn.disabled = false;
                changeBtn.textContent = 'Change Password';
            }
        }
    }

    async toggleUserStatus(id) {
        const user = this.users.find(user => user.id === id);
        if (!user) return;

        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-action-btn');

        const action = user.is_active ? 'deactivate' : 'activate';
        message.textContent = `Are you sure you want to ${action} user "${user.username}"?`;
        confirmBtn.textContent = Utils.capitalizeFirst(action);
        confirmBtn.className = `btn ${user.is_active ? 'btn-error' : 'btn-success'}`;
        
        confirmBtn.onclick = async () => {
            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = `${Utils.capitalizeFirst(action)}ing...`;
                
                const newStatus = user.is_active ? 0 : 1;
                await app.run(`
                    UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?
                `, [newStatus, new Date().toISOString(), id]);

                await Audit.logAction('STATUS_CHANGE', 'users', id, 
                    `${action.charAt(0).toUpperCase() + action.slice(1)}d user: ${user.username}`);
                
                modal.style.display = 'none';
                await this.loadUsers();
                Utils.showSuccess(`User ${action}d successfully`);
                
            } catch (error) {
                console.error('Toggle status error:', error);
                Utils.showError(`Failed to ${action} user`);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = Utils.capitalizeFirst(action);
            }
        };

        modal.style.display = 'block';
    }

    async deleteUser(id) {
        const user = this.users.find(user => user.id === id);
        if (!user) return;

        // Prevent deleting admin users
        if (user.user_type === 'admin') {
            Utils.showError('Cannot delete administrator users');
            return;
        }

        const currentUser = await Auth.getCurrentUser();
        if (currentUser.id === id) {
            Utils.showError('Cannot delete your own account');
            return;
        }

        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-action-btn');

        message.textContent = `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`;
        confirmBtn.textContent = 'Delete';
        confirmBtn.className = 'btn btn-error';
        
        confirmBtn.onclick = async () => {
            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Deleting...';
                
                await app.run('DELETE FROM users WHERE id = ?', [id]);
                await Audit.logDelete('users', id, user, `Deleted user: ${user.username}`);
                
                modal.style.display = 'none';
                await this.loadUsers();
                Utils.showSuccess('User deleted successfully');
                
            } catch (error) {
                console.error('Delete error:', error);
                Utils.showError('Failed to delete user');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete';
            }
        };

        modal.style.display = 'block';
    }

    showPermissions(id) {
        const user = this.users.find(user => user.id === id);
        if (!user) return;

        const permissions = user.permissions || {};
        const allowedModules = Object.keys(permissions).filter(module => permissions[module]);
        const defaultModules = this.modulePermissions[user.user_type] || [];
        const allModules = [...new Set([...allowedModules, ...defaultModules])];

        let permissionsText = `User: ${user.username}\nUser Type: ${Utils.capitalizeFirst(user.user_type)}\n\nAllowed Modules:\n`;
        
        if (allModules.length === 0) {
            permissionsText += '• No modules assigned';
        } else {
            allModules.forEach(module => {
                const isDefault = defaultModules.includes(module);
                const isCustom = permissions[module];
                permissionsText += `• ${Utils.capitalizeFirst(module)}${isDefault ? ' (default)' : ''}${isCustom ? ' (custom)' : ''}\n`;
            });
        }

        alert(permissionsText);
    }

    showFormErrors(errors, containerId) {
        const errorsDiv = document.getElementById(containerId);
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
            await this.loadUsers();
        } catch (error) {
            console.error('Users refresh error:', error);
            Utils.showError('Failed to refresh users');
        }
    }
}

// Register the module (prevent duplicate registration)
if (typeof window !== 'undefined') {
    window.UsersModule = UsersModule;
}

const usersModule = new UsersModule();
if (typeof app !== 'undefined') {
    app.registerModule('users', usersModule);
} else {
    // Wait for app to be available
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof app !== 'undefined') {
            app.registerModule('users', usersModule);
        }
    });
}

})(); // End IIFE'