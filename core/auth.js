const { getQuery, runQuery } = require('./database');

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
        this.sessionTimer = null;
    }

    async login(username, password) {
        try {
            // Simple password verification (in production, use proper hashing)
            const passwordHash = Buffer.from(password).toString('base64');
            
            const user = await getQuery(
                `SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1`,
                [username, passwordHash]
            );

            if (!user) {
                throw new Error('Invalid username or password');
            }

            // Parse permissions
            let permissions = {};
            try {
                permissions = JSON.parse(user.permissions || '{}');
            } catch (e) {
                console.warn('Error parsing user permissions:', e);
                permissions = {};
            }

            this.currentUser = {
                id: user.id,
                username: user.username,
                userType: user.user_type,
                permissions: permissions,
                loginTime: new Date()
            };

            // Update last login
            await runQuery(
                `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [user.id]
            );

            this.startSessionTimer();
            this.saveSession();
            
            return {
                success: true,
                user: this.getCurrentUser(),
                message: 'Login successful'
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    }

    logout() {
        this.clearSession();
        this.currentUser = null;
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        return { success: true, message: 'Logged out successfully' };
    }

    getCurrentUser() {
        return this.currentUser ? {
            id: this.currentUser.id,
            username: this.currentUser.username,
            userType: this.currentUser.userType,
            permissions: this.currentUser.permissions,
            loginTime: this.currentUser.loginTime
        } : null;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    hasPermission(module) {
        if (!this.currentUser) return false;
        
        const permissions = this.currentUser.permissions;
        
        // Admin has all permissions
        if (this.currentUser.userType === 'admin') return true;
        
        // Check specific permission
        return permissions[module] === true || permissions.all_access === true;
    }

    hasAnyPermission(modules = []) {
        if (!this.currentUser) return false;
        return modules.some(module => this.hasPermission(module));
    }

    requirePermission(module) {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required');
        }
        
        if (!this.hasPermission(module)) {
            throw new Error(`Access denied. Required permission: ${module}`);
        }
        
        return true;
    }

    async changePassword(oldPassword, newPassword) {
        if (!this.currentUser) {
            return { success: false, message: 'Not authenticated' };
        }

        try {
            // Verify old password
            const oldHash = Buffer.from(oldPassword).toString('base64');
            const user = await getQuery(
                `SELECT id FROM users WHERE id = ? AND password_hash = ?`,
                [this.currentUser.id, oldHash]
            );

            if (!user) {
                return { success: false, message: 'Current password is incorrect' };
            }

            // Update password
            const newHash = Buffer.from(newPassword).toString('base64');
            await runQuery(
                `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
                [newHash, this.currentUser.username, this.currentUser.id]
            );

            return { success: true, message: 'Password changed successfully' };

        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, message: 'Failed to change password' };
        }
    }

    startSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }

        this.sessionTimer = setTimeout(() => {
            this.logout();
            // Notify about session expiry
            if (window.app) {
                window.app.showMessage('Session expired. Please login again.', 'warning');
                window.app.showLogin();
            }
        }, this.sessionTimeout);
    }

    refreshSession() {
        if (this.currentUser) {
            this.startSessionTimer();
            this.saveSession();
        }
    }

    saveSession() {
        if (this.currentUser && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('zedson_session', JSON.stringify({
                    user: this.currentUser,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('Failed to save session:', e);
            }
        }
    }

    loadSession() {
        if (typeof localStorage === 'undefined') return false;
        
        try {
            const sessionData = localStorage.getItem('zedson_session');
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);
            const sessionAge = Date.now() - session.timestamp;

            // Check if session is still valid (within timeout period)
            if (sessionAge > this.sessionTimeout) {
                this.clearSession();
                return false;
            }

            this.currentUser = session.user;
            this.startSessionTimer();
            return true;

        } catch (e) {
            console.warn('Failed to load session:', e);
            this.clearSession();
            return false;
        }
    }

    clearSession() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('zedson_session');
            } catch (e) {
                console.warn('Failed to clear session:', e);
            }
        }
    }

    getPermissionsList() {
        return {
            dashboard: 'Dashboard Access',
            customers: 'Customer Management',
            inventory: 'Inventory Management',
            sales: 'Sales Operations',
            service: 'Service Operations',
            invoices: 'Invoice Management',
            expense: 'Expense Tracking',
            ledger: 'Ledger & Reports',
            users: 'User Management',
            all_access: 'Full System Access'
        };
    }

    // Utility method to get user display info
    getUserDisplayInfo() {
        if (!this.currentUser) return null;
        
        return {
            username: this.currentUser.username,
            userType: this.currentUser.userType,
            displayName: this.currentUser.username.charAt(0).toUpperCase() + 
                        this.currentUser.username.slice(1),
            typeLabel: this.getUserTypeLabel(this.currentUser.userType),
            loginTime: this.currentUser.loginTime
        };
    }

    getUserTypeLabel(userType) {
        const labels = {
            'admin': 'Administrator',
            'owner': 'Owner',
            'manager': 'Manager'
        };
        return labels[userType] || userType;
    }
}

// Create singleton instance
const authManager = new AuthManager();

module.exports = authManager;