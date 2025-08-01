const { ipcRenderer } = require('electron');

class UsersModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.users = [];
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // User form submission
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async loadData() {
        try {
            this.users = await ipcRenderer.invoke('get-users');
            this.renderTable();
        } catch (error) {
            console.error('Error loading users:', error);
            showError('Error loading users');
        }
    }

    renderTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>${user.role}</td>
                <td>${user.email || '-'}</td>
                <td>
                    <span class="status ${user.is_active ? 'active' : 'inactive'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="usersModule().edit(${user.id})">Edit</button>
                    ${user.id !== this.currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="usersModule().delete(${user.id})">Delete</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    openModal(user = null) {
        const modal = document.getElementById('userModal');
        const form = document.getElementById('userForm');
        const title = document.getElementById('userModalTitle');
        const passwordGroup = document.getElementById('passwordGroup');
        const passwordField = document.getElementById('userPassword');
        
        if (!modal || !form || !title) return;

        form.reset();
        
        if (user) {
            title.textContent = 'Edit User';
            this.populateForm(user);
            
            // Hide password field for editing
            if (passwordGroup) passwordGroup.style.display = 'none';
            if (passwordField) passwordField.removeAttribute('required');
        } else {
            title.textContent = 'Add User';
            document.getElementById('userId').value = '';
            
            // Show password field for new user
            if (passwordGroup) passwordGroup.style.display = 'block';
            if (passwordField) passwordField.setAttribute('required', 'required');
            
            // Set default values
            const activeCheckbox = document.getElementById('userActive');
            if (activeCheckbox) activeCheckbox.checked = true;
        }
        
        modal.style.display = 'block';
    }

    populateForm(user) {
        const fields = {
            userId: user.id,
            userUsername: user.username,
            userFullName: user.full_name,
            userRole: user.role,
            userEmail: user.email || '',
            userPhone: user.phone || '',
            userActive: user.is_active
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
    }

    edit(id) {
        const user = this.users.find(u => u.id === id);
        if (user) {
            this.openModal(user);
        }
    }

    async delete(id) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await ipcRenderer.invoke('delete-user', id);
                await this.loadData();
                await loadDashboardStats();
                showSuccess('User deleted successfully');
            } catch (error) {
                console.error('Error deleting user:', error);
                showError('Error deleting user');
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const userData = {
            username: document.getElementById('userUsername')?.value?.trim(),
            full_name: document.getElementById('userFullName')?.value?.trim(),
            role: document.getElementById('userRole')?.value,
            email: document.getElementById('userEmail')?.value?.trim(),
            phone: document.getElementById('userPhone')?.value?.trim(),
            is_active: document.getElementById('userActive')?.checked ? 1 : 0
        };

        // Validation
        if (!userData.username || !userData.full_name || !userData.role) {
            showError('Please fill in all required fields');
            return;
        }

        const userId = document.getElementById('userId')?.value;
        
        if (!userId) {
            const password = document.getElementById('userPassword')?.value;
            if (!password) {
                showError('Password is required for new users');
                return;
            }
            userData.password = password;
        }
        
        try {
            if (userId) {
                userData.id = parseInt(userId);
                await ipcRenderer.invoke('update-user', userData);
                showSuccess('User updated successfully');
            } else {
                await ipcRenderer.invoke('add-user', userData);
                showSuccess('User added successfully');
            }
            
            closeModal('userModal');
            await this.loadData();
            await loadDashboardStats();
        } catch (error) {
            console.error('Error saving user:', error);
            if (error.message.includes('UNIQUE constraint failed')) {
                showError('Username already exists. Please choose a different username.');
            } else {
                showError('Error saving user');
            }
        }
    }

    // Get users for reporting (used by other modules)
    getUsers() {
        return this.users;
    }

    // Get users by role
    getUsersByRole(role) {
        return this.users.filter(user => user.role === role);
    }

    // Get active users
    getActiveUsers() {
        return this.users.filter(user => user.is_active);
    }

    // Get user by ID
    getUserById(id) {
        return this.users.find(user => user.id === id);
    }
}

module.exports = UsersModule;