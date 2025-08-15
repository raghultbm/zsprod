class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
        this.sessionTimer = null;
    }

    async login(username, password) {
        try {
            const { getQuery, runQuery } = require('./database');
            
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
            const { getQuery, runQuery } = require('./database');
            
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

    saveSession() {
        if (this.currentUser) {
            const sessionData = {
                user: this.currentUser,
                timestamp: Date.now()
            };
            
            try {
                localStorage.setItem('watchshop_session', JSON.stringify(sessionData));
            } catch (error) {
                console.warn('Failed to save session:', error);
            }
        }
    }

    loadSession() {
        try {
            const sessionData = localStorage.getItem('watchshop_session');
            if (!sessionData) return false;

            const parsed = JSON.parse(sessionData);
            const sessionAge = Date.now() - parsed.timestamp;

            // Check if session is still valid (8 hours)
            if (sessionAge > this.sessionTimeout) {
                this.clearSession();
                return false;
            }

            this.currentUser = parsed.user;
            this.startSessionTimer();
            return true;

        } catch (error) {
            console.warn('Failed to load session:', error);
            this.clearSession();
            return false;
        }
    }

    clearSession() {
        try {
            localStorage.removeItem('watchshop_session');
        } catch (error) {
            console.warn('Failed to clear session:', error);
        }
    }

    getPermissionsList() {
        return {
            dashboard: 'Dashboard Access',
            customers: 'Customer Management',
            inventory: 'Inventory Management',
            sales: 'Sales & Billing',
            service: 'Service Management',
            invoices: 'Invoice Generation',
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

// Make it globally available
if (typeof window !== 'undefined') {
    window.authManager = authManager;
}