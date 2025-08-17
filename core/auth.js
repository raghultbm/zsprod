// Authentication system for ZEDSON Watchcraft
const Auth = {
    currentUser: null,
    sessionKey: 'watchcraft_session',

    async init() {
        try {
            // Wait for app to be available
            let retries = 0;
            while ((!window.app || typeof window.app.get !== 'function') && retries < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (!window.app || typeof window.app.get !== 'function') {
                console.error('App not available for auth initialization');
                return null;
            }
            
            // Check for existing session
            const sessionData = Utils.getFromStorage(this.sessionKey);
            if (sessionData && sessionData.expires > Date.now()) {
                // Verify user still exists and is active
                const user = await app.get(
                    'SELECT id, username, user_type, permissions FROM users WHERE id = ? AND is_active = 1',
                    [sessionData.userId]
                );
                
                if (user) {
                    this.currentUser = user;
                    return user;
                }
            }
            
            // Clear invalid session
            this.clearSession();
            return null;
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.clearSession();
            return null;
        }
    },

    async login(username, password) {
        try {
            if (!username || !password) {
                throw new Error('Username and password are required');
            }

            // Get user from database
            const user = await app.get(
                'SELECT id, username, password, user_type, permissions, is_active FROM users WHERE username = ?',
                [username.trim()]
            );

            if (!user) {
                throw new Error('Invalid username or password');
            }

            if (!user.is_active) {
                throw new Error('Account is disabled');
            }

            // Verify password
            const bcrypt = require('bcrypt');
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                throw new Error('Invalid username or password');
            }

            // Create session
            const sessionData = {
                userId: user.id,
                username: user.username,
                userType: user.user_type,
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };

            Utils.saveToStorage(this.sessionKey, sessionData);

            // Remove password from user object
            delete user.password;
            this.currentUser = user;

            return user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async logout() {
        try {
            this.clearSession();
            this.currentUser = null;
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        
        // Try to restore from session
        const sessionData = Utils.getFromStorage(this.sessionKey);
        if (sessionData && sessionData.expires > Date.now()) {
            const user = await app.get(
                'SELECT id, username, user_type, permissions FROM users WHERE id = ? AND is_active = 1',
                [sessionData.userId]
            );
            
            if (user) {
                this.currentUser = user;
                return user;
            }
        }
        
        return null;
    },

    isLoggedIn() {
        return this.currentUser !== null;
    },

    hasPermission(user, module) {
        if (!user || !module) return false;
        
        const modulePermissions = CONSTANTS.PERMISSIONS[module];
        if (!modulePermissions) return false;
        
        return modulePermissions.includes(user.user_type);
    },

    hasUserType(user, userTypes) {
        if (!user) return false;
        
        const types = Array.isArray(userTypes) ? userTypes : [userTypes];
        return types.includes(user.user_type);
    },

    isAdmin(user = null) {
        const currentUser = user || this.currentUser;
        return currentUser && currentUser.user_type === 'admin';
    },

    isOwner(user = null) {
        const currentUser = user || this.currentUser;
        return currentUser && (currentUser.user_type === 'admin' || currentUser.user_type === 'owner');
    },

    clearSession() {
        try {
            localStorage.removeItem(this.sessionKey);
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    },

    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            if (!currentPassword || !newPassword) {
                throw new Error('Current password and new password are required');
            }

            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters long');
            }

            // Verify current password
            const user = await app.get(
                'SELECT password FROM users WHERE id = ?',
                [this.currentUser.id]
            );

            const bcrypt = require('bcrypt');
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Update password in database
            await app.run(
                'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
                [hashedNewPassword, new Date().toISOString(), this.currentUser.id]
            );

            return true;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    },

    async createUser(userData) {
        try {
            if (!this.isAdmin()) {
                throw new Error('Only admin users can create new users');
            }

            const { username, password, userType, permissions } = userData;

            // Validate input
            const validation = Validators.validateUser({ username, password, userType });
            if (!validation.isValid) {
                throw new Error(Object.values(validation.errors)[0]);
            }

            // Check if username already exists
            const existingUser = await app.get(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );

            if (existingUser) {
                throw new Error('Username already exists');
            }

            // Hash password
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const result = await app.run(`
                INSERT INTO users (username, password, user_type, permissions, is_active, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                username,
                hashedPassword,
                userType,
                JSON.stringify(permissions || {}),
                1,
                this.currentUser.username,
                new Date().toISOString()
            ]);

            return { id: result.id, username, userType };
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    },

    async updateUser(userId, userData) {
        try {
            if (!this.isAdmin()) {
                throw new Error('Only admin users can update users');
            }

            const { username, userType, permissions, isActive } = userData;

            // Build update query dynamically
            const updateFields = [];
            const values = [];

            if (username) {
                updateFields.push('username = ?');
                values.push(username);
            }

            if (userType) {
                updateFields.push('user_type = ?');
                values.push(userType);
            }

            if (permissions !== undefined) {
                updateFields.push('permissions = ?');
                values.push(JSON.stringify(permissions));
            }

            if (isActive !== undefined) {
                updateFields.push('is_active = ?');
                values.push(isActive ? 1 : 0);
            }

            updateFields.push('updated_at = ?');
            values.push(new Date().toISOString());

            values.push(userId);

            await app.run(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                values
            );

            return true;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    },

    async deleteUser(userId) {
        try {
            if (!this.isAdmin()) {
                throw new Error('Only admin users can delete users');
            }

            if (userId === this.currentUser.id) {
                throw new Error('Cannot delete your own account');
            }

            // Soft delete - just deactivate
            await app.run(
                'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?',
                [new Date().toISOString(), userId]
            );

            return true;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    },

    async getAllUsers() {
        try {
            if (!this.isAdmin()) {
                throw new Error('Only admin users can view all users');
            }

            const users = await app.query(`
                SELECT id, username, user_type, permissions, is_active, created_at, updated_at
                FROM users
                ORDER BY created_at DESC
            `);

            return users.map(user => ({
                ...user,
                permissions: user.permissions ? JSON.parse(user.permissions) : {}
            }));
        } catch (error) {
            console.error('Get all users error:', error);
            throw error;
        }
    },

    // Session management
    extendSession() {
        const sessionData = Utils.getFromStorage(this.sessionKey);
        if (sessionData) {
            sessionData.expires = Date.now() + (24 * 60 * 60 * 1000); // Extend by 24 hours
            Utils.saveToStorage(this.sessionKey, sessionData);
        }
    },

    isSessionExpired() {
        const sessionData = Utils.getFromStorage(this.sessionKey);
        return !sessionData || sessionData.expires <= Date.now();
    }
};

// Make Auth globally available
if (typeof window !== 'undefined') {
    window.Auth = Auth;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}