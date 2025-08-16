class AuthManager {
    constructor() {
        this.currentUser = null;
        this.permissions = {};
        this.isLoggedIn = false;
    }

    async initialize() {
        // Check if there's a remembered session (basic implementation)
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                const user = await window.DB.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [userData.username]);
                if (user) {
                    await this.setCurrentUser(user);
                }
            } catch (error) {
                console.error('Error restoring session:', error);
                localStorage.removeItem('currentUser');
            }
        }
    }

    async login(username, password) {
        try {
            // Simple password check (in production, use proper hashing)
            const user = await window.DB.get(
                'SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1',
                [username, password]
            );

            if (!user) {
                throw new Error('Invalid username or password');
            }

            await this.setCurrentUser(user);
            
            // Remember login (basic implementation)
            localStorage.setItem('currentUser', JSON.stringify({
                username: user.username,
                loginTime: new Date().toISOString()
            }));

            // Log the login
            await window.AuditLogger.log('users', user.id, 'LOGIN', {}, { login_time: new Date().toISOString() });

            return { success: true, user: this.getCurrentUser() };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async setCurrentUser(user) {
        this.currentUser = {
            id: user.id,
            username: user.username,
            userType: user.user_type,
            isActive: user.is_active
        };

        // Parse permissions
        try {
            this.permissions = user.permissions ? JSON.parse(user.permissions) : this.getDefaultPermissions(user.user_type);
        } catch (error) {
            this.permissions = this.getDefaultPermissions(user.user_type);
        }

        this.isLoggedIn = true;

        // Update UI
        if (document.getElementById('current-user')) {
            document.getElementById('current-user').textContent = this.currentUser.username;
        }
    }

    getDefaultPermissions(userType) {
        const allModules = ['dashboard', 'customers', 'inventory', 'sales', 'service', 'invoices', 'expense', 'ledger'];
        
        switch (userType) {
            case 'admin':
                return {
                    modules: allModules,
                    actions: {
                        create: allModules,
                        read: allModules,
                        update: allModules,
                        delete: allModules,
                        manage_users: true,
                        close_business: true
                    }
                };
            
            case 'owner':
                return {
                    modules: allModules,
                    actions: {
                        create: allModules,
                        read: allModules,
                        update: allModules,
                        delete: ['customers', 'inventory', 'expense'],
                        manage_users: false,
                        close_business: true
                    }
                };
            
            case 'manager':
                const managerModules = ['dashboard', 'customers', 'inventory', 'sales', 'service', 'invoices'];
                return {
                    modules: managerModules,
                    actions: {
                        create: managerModules,
                        read: managerModules,
                        update: ['customers', 'inventory', 'sales', 'service'],
                        delete: [],
                        manage_users: false,
                        close_business: false
                    }
                };
            
            default:
                return {
                    modules: ['dashboard'],
                    actions: {
                        create: [],
                        read: ['dashboard'],
                        update: [],
                        delete: [],
                        manage_users: false,
                        close_business: false
                    }
                };
        }
    }

    hasPermission(module, action = 'read') {
        if (!this.isLoggedIn) return false;
        if (this.currentUser.userType === 'admin') return true;

        const modulePermissions = this.permissions.modules || [];
        const actionPermissions = this.permissions.actions || {};

        // Check if user has access to the module
        if (!modulePermissions.includes(module)) return false;

        // Check specific action permission
        if (action === 'read') return true; // If they have module access, they can read
        
        const allowedActions = actionPermissions[action] || [];
        return allowedActions.includes(module);
    }

    hasSpecialPermission(permission) {
        if (!this.isLoggedIn) return false;
        if (this.currentUser.userType === 'admin') return true;

        const actionPermissions = this.permissions.actions || {};
        return actionPermissions[permission] === true;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async logout() {
        if (this.currentUser) {
            // Log the logout
            await window.AuditLogger.log('users', this.currentUser.id, 'LOGOUT', {}, { logout_time: new Date().toISOString() });
        }

        this.currentUser = null;
        this.permissions = {};
        this.isLoggedIn = false;
        
        localStorage.removeItem('currentUser');
        
        return { success: true };
    }

    async changePassword(currentPassword, newPassword) {
        if (!this.isLoggedIn) {
            return { success: false, error: 'User not logged in' };
        }

        try {
            // Verify current password
            const user = await window.DB.get(
                'SELECT * FROM users WHERE id = ? AND password_hash = ?',
                [this.currentUser.id, currentPassword]
            );

            if (!user) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // Update password
            await window.DB.run(
                'UPDATE users SET password_hash = ?, updated_by = ?, updated_at = ? WHERE id = ?',
                [newPassword, this.currentUser.username, new Date().toISOString(), this.currentUser.id]
            );

            // Log the password change
            await window.AuditLogger.log('users', this.currentUser.id, 'UPDATE', 
                { password_changed: false }, 
                { password_changed: true }
            );

            return { success: true, message: 'Password changed successfully' };
        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, error: 'Failed to change password' };
        }
    }

    // Utility method to check if current user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.userType === 'admin';
    }

    // Utility method to get user's display name
    getDisplayName() {
        return this.currentUser ? this.currentUser.username : 'Guest';
    }
}

// Global authentication manager
window.Auth = new AuthManager();