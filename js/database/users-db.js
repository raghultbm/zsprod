// ZEDSON WATCHCRAFT - Users Database Operations
// js/database/users-db.js

/**
 * Users Database Operations Module
 * Handles all database operations for user management and authentication
 */

class UsersDB {
    constructor(sqliteCore) {
        this.db = sqliteCore;
        this.tableName = 'users';
        this.cache = new Map();
        this.cacheTimeout = 600000; // 10 minutes
    }

    /**
     * Get all users
     */
    async getAllUsers() {
        try {
            const sql = `
                SELECT 
                    id, username, role, full_name, email, status, 
                    first_login, created_at, last_login, created_by
                FROM ${this.tableName}
                ORDER BY created_at ASC
            `;
            
            const users = await this.db.selectAll(sql);
            
            console.log(`👥 Retrieved ${users.length} users`);
            return users;
            
        } catch (error) {
            console.error('Failed to get users:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(id) {
        try {
            const cacheKey = `user_${id}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }
            
            const sql = `
                SELECT 
                    id, username, role, full_name, email, status, 
                    first_login, created_at, last_login, created_by
                FROM ${this.tableName}
                WHERE id = ?
            `;
            
            const user = await this.db.selectOne(sql, [id]);
            
            if (user) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: user,
                    timestamp: Date.now()
                });
            }
            
            return user;
            
        } catch (error) {
            console.error('Failed to get user by ID:', error);
            throw error;
        }
    }

    /**
     * Get user by username
     */
    async getUserByUsername(username) {
        try {
            const cacheKey = `user_username_${username}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }
            
            const sql = `
                SELECT 
                    id, username, password_hash, role, full_name, email, status, 
                    first_login, temp_password, created_at, last_login, created_by
                FROM ${this.tableName}
                WHERE username = ?
            `;
            
            const user = await this.db.selectOne(sql, [username]);
            
            if (user) {
                // Cache the result (without password)
                const userForCache = { ...user };
                delete userForCache.password_hash;
                delete userForCache.temp_password;
                
                this.cache.set(cacheKey, {
                    data: userForCache,
                    timestamp: Date.now()
                });
            }
            
            return user;
            
        } catch (error) {
            console.error('Failed to get user by username:', error);
            throw error;
        }
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        try {
            const sql = `
                SELECT 
                    id, username, role, full_name, email, status, 
                    first_login, created_at, last_login
                FROM ${this.tableName}
                WHERE email = ?
            `;
            
            const user = await this.db.selectOne(sql, [email]);
            return user;
            
        } catch (error) {
            console.error('Failed to get user by email:', error);
            throw error;
        }
    }

    /**
     * Add new user
     */
    async addUser(userData) {
        try {
            // Validate required fields
            const required = ['username', 'role', 'full_name', 'email'];
            for (const field of required) {
                if (!userData[field]) {
                    throw new Error(`Required field '${field}' is missing`);
                }
            }
            
            // Validate email format
            if (!this.validateEmail(userData.email)) {
                throw new Error('Invalid email format');
            }
            
            // Validate role
            const validRoles = ['admin', 'owner', 'staff'];
            if (!validRoles.includes(userData.role)) {
                throw new Error('Invalid user role');
            }
            
            // Check if username already exists
            const existingUser = await this.getUserByUsername(userData.username);
            if (existingUser) {
                throw new Error('Username already exists');
            }
            
            // Check if email already exists
            const existingEmail = await this.getUserByEmail(userData.email);
            if (existingEmail) {
                throw new Error('Email already exists');
            }
            
            // Generate temporary password for first login
            const tempPassword = this.generateTempPassword();
            
            // Prepare user data
            const user = {
                username: userData.username.toLowerCase().trim(),
                password_hash: userData.password_hash || null,
                role: userData.role,
                full_name: userData.full_name.trim(),
                email: userData.email.toLowerCase().trim(),
                status: userData.status || 'active',
                first_login: userData.first_login !== undefined ? userData.first_login : 1,
                temp_password: userData.temp_password || tempPassword,
                created_by: userData.created_by || 'system'
            };
            
            // Insert user
            const result = await this.db.insert(this.tableName, user);
            
            if (result.insertId) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Added user: ${user.username} (${user.role})`);
                
                // Log action
                if (window.logUserManagementAction) {
                    logUserManagementAction(`Created new user: ${user.username} with role: ${user.role}`, {
                        ...user,
                        id: result.insertId,
                        tempPassword: tempPassword
                    });
                }
                
                return { 
                    ...user, 
                    id: result.insertId,
                    tempPassword: tempPassword 
                };
            }
            
            throw new Error('Failed to insert user');
            
        } catch (error) {
            console.error('Failed to add user:', error);
            throw error;
        }
    }

    /**
     * Update user
     */
    async updateUser(id, updateData) {
        try {
            const existingUser = await this.getUserById(id);
            if (!existingUser) {
                throw new Error('User not found');
            }
            
            // Prepare update data
            const updates = {};
            const allowedFields = ['full_name', 'email', 'role', 'status', 'last_login'];
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            }
            
            if (Object.keys(updates).length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Validate email format if being updated
            if (updates.email && !this.validateEmail(updates.email)) {
                throw new Error('Invalid email format');
            }
            
            // Validate role if being updated
            if (updates.role) {
                const validRoles = ['admin', 'owner', 'staff'];
                if (!validRoles.includes(updates.role)) {
                    throw new Error('Invalid user role');
                }
            }
            
            // Check if email already exists (excluding current user)
            if (updates.email) {
                const existingEmail = await this.getUserByEmail(updates.email);
                if (existingEmail && existingEmail.id !== id) {
                    throw new Error('Email already exists');
                }
            }
            
            // Clean data
            if (updates.full_name) {
                updates.full_name = updates.full_name.trim();
            }
            if (updates.email) {
                updates.email = updates.email.toLowerCase().trim();
            }
            
            // Update user
            const result = await this.db.update(this.tableName, updates, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated user: ${id}`);
                
                // Log action
                if (window.logUserManagementAction) {
                    logUserManagementAction(`Updated user: ${existingUser.username}`, {
                        id,
                        changes: updates,
                        oldData: existingUser
                    });
                }
                
                return await this.getUserById(id);
            }
            
            return existingUser;
            
        } catch (error) {
            console.error('Failed to update user:', error);
            throw error;
        }
    }

    /**
     * Delete user
     */
    async deleteUser(id) {
        try {
            const user = await this.getUserById(id);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Prevent deletion of admin user
            if (user.username === 'admin') {
                throw new Error('Cannot delete the admin user');
            }
            
            // Check if user has associated records
            const userActivity = await this.getUserActivity(id);
            if (userActivity.totalActions > 0) {
                throw new Error('Cannot delete user with existing activity records. Consider deactivating instead.');
            }
            
            // Delete user
            const result = await this.db.delete(this.tableName, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Deleted user: ${user.username}`);
                
                // Log action
                if (window.logUserManagementAction) {
                    logUserManagementAction(`Deleted user: ${user.username}`, user);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to delete user:', error);
            throw error;
        }
    }

    /**
     * Update user password
     */
    async updatePassword(id, newPasswordHash) {
        try {
            const user = await this.getUserById(id);
            if (!user) {
                throw new Error('User not found');
            }
            
            const updates = {
                password_hash: newPasswordHash,
                first_login: 0,
                temp_password: null
            };
            
            const result = await this.db.update(this.tableName, updates, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated password for user: ${user.username}`);
                
                // Log action
                if (window.logUserManagementAction) {
                    logUserManagementAction(`Updated password for user: ${user.username}`, { id });
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to update password:', error);
            throw error;
        }
    }

    /**
     * Reset user password
     */
    async resetPassword(id) {
        try {
            const user = await this.getUserById(id);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Generate new temporary password
            const tempPassword = this.generateTempPassword();
            
            const updates = {
                password_hash: null,
                first_login: 1,
                temp_password: tempPassword
            };
            
            const result = await this.db.update(this.tableName, updates, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Reset password for user: ${user.username}`);
                
                // Log action
                if (window.logUserManagementAction) {
                    logUserManagementAction(`Reset password for user: ${user.username}`, { 
                        id,
                        tempPassword: tempPassword 
                    });
                }
                
                return tempPassword;
            }
            
            return null;
            
        } catch (error) {
            console.error('Failed to reset password:', error);
            throw error;
        }
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(id) {
        try {
            const updates = {
                last_login: new Date().toISOString()
            };
            
            const result = await this.db.update(this.tableName, updates, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache for this specific user
                this.cache.delete(`user_${id}`);
                
                console.log(`✅ Updated last login for user: ${id}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to update last login:', error);
            throw error;
        }
    }

    /**
     * Activate/Deactivate user
     */
    async toggleUserStatus(id) {
        try {
            const user = await this.getUserById(id);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Prevent deactivating admin user
            if (user.username === 'admin' && user.status === 'active') {
                throw new Error('Cannot deactivate the admin user');
            }
            
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            
            const result = await this.db.update(this.tableName, { status: newStatus }, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ ${newStatus === 'active' ? 'Activated' : 'Deactivated'} user: ${user.username}`);
                
                // Log action
                if (window.logUserManagementAction) {
                    logUserManagementAction(`${newStatus === 'active' ? 'Activated' : 'Deactivated'} user: ${user.username}`, {
                        id,
                        oldStatus: user.status,
                        newStatus: newStatus
                    });
                }
                
                return await this.getUserById(id);
            }
            
            return user;
            
        } catch (error) {
            console.error('Failed to toggle user status:', error);
            throw error;
        }
    }

    /**
     * Get users by role
     */
    async getUsersByRole(role) {
        try {
            const sql = `
                SELECT 
                    id, username, role, full_name, email, status, 
                    first_login, created_at, last_login
                FROM ${this.tableName}
                WHERE role = ?
                ORDER BY full_name ASC
            `;
            
            const users = await this.db.selectAll(sql, [role]);
            return users;
            
        } catch (error) {
            console.error('Failed to get users by role:', error);
            throw error;
        }
    }

    /**
     * Get active users
     */
    async getActiveUsers() {
        try {
            const sql = `
                SELECT 
                    id, username, role, full_name, email, status, 
                    first_login, created_at, last_login
                FROM ${this.tableName}
                WHERE status = 'active'
                ORDER BY full_name ASC
            `;
            
            const users = await this.db.selectAll(sql);
            return users;
            
        } catch (error) {
            console.error('Failed to get active users:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    async getStatistics() {
        try {
            const stats = {};
            
            // Basic counts
            const totalUsers = await this.db.selectOne(`SELECT COUNT(*) as count FROM ${this.tableName}`);
            stats.totalUsers = totalUsers ? totalUsers.count : 0;
            
            const activeUsers = await this.db.selectOne(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'active'`);
            stats.activeUsers = activeUsers ? activeUsers.count : 0;
            
            const inactiveUsers = stats.totalUsers - stats.activeUsers;
            stats.inactiveUsers = inactiveUsers;
            
            // Role breakdown
            const roleStats = await this.db.selectAll(`
                SELECT 
                    role,
                    COUNT(*) as count,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
                FROM ${this.tableName}
                GROUP BY role
                ORDER BY count DESC
            `);
            stats.roleBreakdown = roleStats;
            
            // First login users (need password setup)
            const firstLoginUsers = await this.db.selectOne(`
                SELECT COUNT(*) as count FROM ${this.tableName} WHERE first_login = 1
            `);
            stats.firstLoginUsers = firstLoginUsers ? firstLoginUsers.count : 0;
            
            // Recent registrations (last 30 days)
            const recentUsers = await this.db.selectOne(`
                SELECT COUNT(*) as count FROM ${this.tableName} 
                WHERE created_at >= datetime('now', '-30 days')
            `);
            stats.recentRegistrations = recentUsers ? recentUsers.count : 0;
            
            // Recent logins (last 7 days)
            const recentLogins = await this.db.selectOne(`
                SELECT COUNT(*) as count FROM ${this.tableName} 
                WHERE last_login >= datetime('now', '-7 days')
            `);
            stats.recentLogins = recentLogins ? recentLogins.count : 0;
            
            // User creation timeline (last 12 months)
            const userTimeline = await this.db.selectAll(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as user_count
                FROM ${this.tableName}
                WHERE created_at >= datetime('now', '-12 months')
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month
            `);
            stats.userTimeline = userTimeline;
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get user statistics:', error);
            throw error;
        }
    }

    /**
     * Get user activity summary
     */
    async getUserActivity(userId) {
        try {
            const activity = {
                totalActions: 0,
                salesCreated: 0,
                servicesCreated: 0,
                customersAdded: 0,
                inventoryAdded: 0,
                lastActivity: null
            };
            
            // Check if action_logs table exists
            const logsTableExists = await this.db.selectOne(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='action_logs'
            `);
            
            if (logsTableExists) {
                // Get action counts
                const actionStats = await this.db.selectOne(`
                    SELECT 
                        COUNT(*) as total_actions,
                        MAX(created_at) as last_activity
                    FROM action_logs 
                    WHERE username = (SELECT username FROM ${this.tableName} WHERE id = ?)
                `, [userId]);
                
                if (actionStats) {
                    activity.totalActions = actionStats.total_actions || 0;
                    activity.lastActivity = actionStats.last_activity;
                }
            }
            
            // Check sales created
            const salesTableExists = await this.db.selectOne(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='sales'
            `);
            
            if (salesTableExists) {
                const salesStats = await this.db.selectOne(`
                    SELECT COUNT(*) as count FROM sales 
                    WHERE created_by = (SELECT username FROM ${this.tableName} WHERE id = ?)
                `, [userId]);
                
                activity.salesCreated = salesStats ? salesStats.count : 0;
            }
            
            // Check services created
            const servicesTableExists = await this.db.selectOne(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='services'
            `);
            
            if (servicesTableExists) {
                const servicesStats = await this.db.selectOne(`
                    SELECT COUNT(*) as count FROM services 
                    WHERE created_by = (SELECT username FROM ${this.tableName} WHERE id = ?)
                `, [userId]);
                
                activity.servicesCreated = servicesStats ? servicesStats.count : 0;
            }
            
            // Check customers added
            const customersTableExists = await this.db.selectOne(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='customers'
            `);
            
            if (customersTableExists) {
                const customersStats = await this.db.selectOne(`
                    SELECT COUNT(*) as count FROM customers 
                    WHERE added_by = (SELECT username FROM ${this.tableName} WHERE id = ?)
                `, [userId]);
                
                activity.customersAdded = customersStats ? customersStats.count : 0;
            }
            
            // Check inventory added
            const inventoryTableExists = await this.db.selectOne(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='inventory'
            `);
            
            if (inventoryTableExists) {
                const inventoryStats = await this.db.selectOne(`
                    SELECT COUNT(*) as count FROM inventory 
                    WHERE added_by = (SELECT username FROM ${this.tableName} WHERE id = ?)
                `, [userId]);
                
                activity.inventoryAdded = inventoryStats ? inventoryStats.count : 0;
            }
            
            return activity;
            
        } catch (error) {
            console.error('Failed to get user activity:', error);
            return {
                totalActions: 0,
                salesCreated: 0,
                servicesCreated: 0,
                customersAdded: 0,
                inventoryAdded: 0,
                lastActivity: null
            };
        }
    }

    /**
     * Search users
     */
    async searchUsers(searchTerm) {
        try {
            const sql = `
                SELECT 
                    id, username, role, full_name, email, status, 
                    first_login, created_at, last_login
                FROM ${this.tableName}
                WHERE 
                    username LIKE ? OR 
                    full_name LIKE ? OR 
                    email LIKE ?
                ORDER BY full_name ASC
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const users = await this.db.selectAll(sql, [searchPattern, searchPattern, searchPattern]);
            return users;
            
        } catch (error) {
            console.error('Failed to search users:', error);
            throw error;
        }
    }

    /**
     * Export users data
     */
    async exportData(format = 'json') {
        try {
            const users = await this.getAllUsers();
            
            if (format === 'json') {
                return JSON.stringify(users, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(users);
            }
            
            throw new Error('Unsupported export format');
            
        } catch (error) {
            console.error('Failed to export users data:', error);
            throw error;
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(users) {
        if (!users || users.length === 0) {
            return '';
        }
        
        const headers = ['ID', 'Username', 'Full Name', 'Email', 'Role', 'Status', 'Created At', 'Last Login'];
        const csvRows = [headers.join(',')];
        
        for (const user of users) {
            const row = [
                user.id,
                user.username,
                `"${user.full_name}"`,
                user.email,
                user.role,
                user.status,
                user.created_at,
                user.last_login || 'Never'
            ];
            csvRows.push(row.join(','));
        }
        
        return csvRows.join('\n');
    }

    /**
     * Generate temporary password
     */
    generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Hash password (simple implementation - use proper bcrypt in production)
     */
    hashPassword(password) {
        // Simple hash function - in production, use proper encryption like bcrypt
        let hash = 0;
        if (password.length === 0) return hash.toString();
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Verify password
     */
    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Users cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout,
            entries: Array.from(this.cache.keys())
        };
    }

    /**
     * Validate user data
     */
    validateUserData(userData) {
        const errors = [];
        
        // Required fields
        const required = ['username', 'role', 'full_name', 'email'];
        for (const field of required) {
            if (!userData[field]) {
                errors.push(`${field} is required`);
            }
        }
        
        // Username validation
        if (userData.username) {
            if (userData.username.length < 3) {
                errors.push('Username must be at least 3 characters long');
            }
            if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
                errors.push('Username can only contain letters, numbers, and underscores');
            }
        }
        
        // Email validation
        if (userData.email && !this.validateEmail(userData.email)) {
            errors.push('Invalid email format');
        }
        
        // Role validation
        if (userData.role) {
            const validRoles = ['admin', 'owner', 'staff'];
            if (!validRoles.includes(userData.role)) {
                errors.push('Invalid user role');
            }
        }
        
        // Full name validation
        if (userData.full_name && userData.full_name.trim().length < 2) {
            errors.push('Full name must be at least 2 characters long');
        }
        
        return errors;
    }

    /**
     * Check if username is available
     */
    async isUsernameAvailable(username, excludeId = null) {
        try {
            let sql = `SELECT id FROM ${this.tableName} WHERE username = ?`;
            let params = [username];
            
            if (excludeId) {
                sql += ' AND id != ?';
                params.push(excludeId);
            }
            
            const existingUser = await this.db.selectOne(sql, params);
            return !existingUser;
            
        } catch (error) {
            console.error('Failed to check username availability:', error);
            throw error;
        }
    }

    /**
     * Check if email is available
     */
    async isEmailAvailable(email, excludeId = null) {
        try {
            let sql = `SELECT id FROM ${this.tableName} WHERE email = ?`;
            let params = [email];
            
            if (excludeId) {
                sql += ' AND id != ?';
                params.push(excludeId);
            }
            
            const existingUser = await this.db.selectOne(sql, params);
            return !existingUser;
            
        } catch (error) {
            console.error('Failed to check email availability:', error);
            throw error;
        }
    }
}

// Create and export instance
let usersDB = null;

// Initialize when SQLite core is ready
document.addEventListener('DOMContentLoaded', function() {
    const initUsersDB = () => {
        if (window.SQLiteCore && window.SQLiteCore.isReady()) {
            usersDB = new UsersDB(window.SQLiteCore);
            window.UsersDB = usersDB;
            console.log('👥 Users Database module initialized');
        } else {
            setTimeout(initUsersDB, 100);
        }
    };
    
    initUsersDB();
});

// Export for use by other modules
window.UsersDB = usersDB;