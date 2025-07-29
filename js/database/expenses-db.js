// ZEDSON WATCHCRAFT - Expenses Database Operations
// js/database/expenses-db.js

/**
 * Expenses Database Operations Module
 * Handles all database operations for expense management
 */

class ExpensesDB {
    constructor(sqliteCore) {
        this.db = sqliteCore;
        this.tableName = 'expenses';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Get all expenses with optional filtering
     */
    async getAllExpenses(filters = {}) {
        try {
            let sql = `SELECT * FROM ${this.tableName}`;
            
            const params = [];
            const conditions = [];
            
            // Apply filters
            if (filters.dateFrom) {
                conditions.push('expense_date >= ?');
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                conditions.push('expense_date <= ?');
                params.push(filters.dateTo);
            }
            
            if (filters.minAmount) {
                conditions.push('amount >= ?');
                params.push(filters.minAmount);
            }
            
            if (filters.maxAmount) {
                conditions.push('amount <= ?');
                params.push(filters.maxAmount);
            }
            
            if (filters.description) {
                conditions.push('description LIKE ?');
                params.push(`%${filters.description}%`);
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            sql += ' ORDER BY expense_date DESC, created_at DESC';
            
            const expenses = await this.db.selectAll(sql, params);
            
            console.log(`💳 Retrieved ${expenses.length} expenses`);
            return expenses;
            
        } catch (error) {
            console.error('Failed to get expenses:', error);
            throw error;
        }
    }

    /**
     * Get single expense by ID
     */
    async getExpenseById(id) {
        try {
            const cacheKey = `expense_${id}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }
            
            const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
            const expense = await this.db.selectOne(sql, [id]);
            
            if (expense) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: expense,
                    timestamp: Date.now()
                });
            }
            
            return expense;
            
        } catch (error) {
            console.error('Failed to get expense:', error);
            throw error;
        }
    }

    /**
     * Add new expense
     */
    async addExpense(expenseData) {
        try {
            // Validate required fields
            const required = ['expense_date', 'description', 'amount'];
            for (const field of required) {
                if (!expenseData[field]) {
                    throw new Error(`Required field '${field}' is missing`);
                }
            }
            
            // Validate business rules
            if (expenseData.amount <= 0) {
                throw new Error('Expense amount must be greater than 0');
            }
            
            if (expenseData.description.trim().length < 3) {
                throw new Error('Description must be at least 3 characters long');
            }
            
            // Validate date format
            const expenseDate = new Date(expenseData.expense_date);
            if (isNaN(expenseDate.getTime())) {
                throw new Error('Invalid expense date');
            }
            
            // Check if date is not in future (optional business rule)
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            if (expenseDate > today) {
                throw new Error('Expense date cannot be in the future');
            }
            
            // Prepare expense data
            const expense = {
                expense_date: expenseData.expense_date,
                description: expenseData.description.trim(),
                amount: parseFloat(expenseData.amount),
                created_by: expenseData.created_by || 'system'
            };
            
            // Insert expense
            const result = await this.db.insert(this.tableName, expense);
            
            if (result.insertId) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Added expense: ${expense.description} - ₹${expense.amount}`);
                
                // Log action
                if (window.logExpenseAction) {
                    logExpenseAction(`Added new expense: ${expense.description}`, {
                        ...expense,
                        id: result.insertId
                    });
                }
                
                return { ...expense, id: result.insertId };
            }
            
            throw new Error('Failed to insert expense');
            
        } catch (error) {
            console.error('Failed to add expense:', error);
            throw error;
        }
    }

    /**
     * Update expense
     */
    async updateExpense(id, updateData) {
        try {
            const existingExpense = await this.getExpenseById(id);
            if (!existingExpense) {
                throw new Error('Expense not found');
            }
            
            // Prepare update data
            const updates = {};
            const allowedFields = ['expense_date', 'description', 'amount'];
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            }
            
            if (Object.keys(updates).length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Validate business rules
            if (updates.amount !== undefined && updates.amount <= 0) {
                throw new Error('Expense amount must be greater than 0');
            }
            
            if (updates.description !== undefined && updates.description.trim().length < 3) {
                throw new Error('Description must be at least 3 characters long');
            }
            
            if (updates.expense_date !== undefined) {
                const expenseDate = new Date(updates.expense_date);
                if (isNaN(expenseDate.getTime())) {
                    throw new Error('Invalid expense date');
                }
                
                // Check if date is not in future
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (expenseDate > today) {
                    throw new Error('Expense date cannot be in the future');
                }
            }
            
            // Clean description if provided
            if (updates.description !== undefined) {
                updates.description = updates.description.trim();
            }
            
            // Update expense
            const result = await this.db.update(this.tableName, updates, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Updated expense: ${id}`);
                
                // Log action
                if (window.logExpenseAction) {
                    logExpenseAction(`Updated expense: ${existingExpense.description}`, {
                        id,
                        changes: updates,
                        oldData: existingExpense
                    });
                }
                
                return await this.getExpenseById(id);
            }
            
            return existingExpense;
            
        } catch (error) {
            console.error('Failed to update expense:', error);
            throw error;
        }
    }

    /**
     * Delete expense
     */
    async deleteExpense(id) {
        try {
            const expense = await this.getExpenseById(id);
            if (!expense) {
                throw new Error('Expense not found');
            }
            
            // Delete expense
            const result = await this.db.delete(this.tableName, 'id = ?', [id]);
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Deleted expense: ${expense.description}`);
                
                // Log action
                if (window.logExpenseAction) {
                    logExpenseAction(`Deleted expense: ${expense.description}`, expense);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to delete expense:', error);
            throw error;
        }
    }

    /**
     * Get expenses by date range
     */
    async getExpensesByDateRange(fromDate, toDate) {
        try {
            const sql = `
                SELECT * FROM ${this.tableName}
                WHERE expense_date >= ? AND expense_date <= ?
                ORDER BY expense_date DESC, created_at DESC
            `;
            
            const expenses = await this.db.selectAll(sql, [fromDate, toDate]);
            return expenses;
            
        } catch (error) {
            console.error('Failed to get expenses by date range:', error);
            throw error;
        }
    }

    /**
     * Get expenses by month and year
     */
    async getExpensesByMonth(month, year) {
        try {
            const sql = `
                SELECT * FROM ${this.tableName}
                WHERE strftime('%m', expense_date) = ? AND strftime('%Y', expense_date) = ?
                ORDER BY expense_date DESC, created_at DESC
            `;
            
            // Ensure month is zero-padded
            const monthStr = String(month).padStart(2, '0');
            const expenses = await this.db.selectAll(sql, [monthStr, year]);
            return expenses;
            
        } catch (error) {
            console.error('Failed to get expenses by month:', error);
            throw error;
        }
    }

    /**
     * Get today's expenses
     */
    async getTodayExpenses() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const sql = `
                SELECT * FROM ${this.tableName}
                WHERE expense_date = ?
                ORDER BY created_at DESC
            `;
            
            const expenses = await this.db.selectAll(sql, [today]);
            return expenses;
            
        } catch (error) {
            console.error('Failed to get today expenses:', error);
            throw error;
        }
    }

    /**
     * Get expense statistics
     */
    async getStatistics() {
        try {
            const stats = {};
            
            // Basic counts and totals
            const basicStats = await this.db.selectOne(`
                SELECT 
                    COUNT(*) as total_expenses,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    MAX(amount) as max_amount,
                    MIN(amount) as min_amount
                FROM ${this.tableName}
            `);
            
            stats.totalExpenses = basicStats?.total_expenses || 0;
            stats.totalAmount = basicStats?.total_amount || 0;
            stats.averageAmount = basicStats?.avg_amount || 0;
            stats.maxAmount = basicStats?.max_amount || 0;
            stats.minAmount = basicStats?.min_amount || 0;
            
            // Today's expenses
            const today = new Date().toISOString().split('T')[0];
            const todayStats = await this.db.selectOne(`
                SELECT 
                    COUNT(*) as count,
                    SUM(amount) as amount
                FROM ${this.tableName}
                WHERE expense_date = ?
            `, [today]);
            
            stats.todayExpensesCount = todayStats?.count || 0;
            stats.todayAmount = todayStats?.amount || 0;
            
            // This month's expenses
            const thisMonth = new Date();
            const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().split('T')[0];
            
            const monthStats = await this.db.selectOne(`
                SELECT 
                    COUNT(*) as count,
                    SUM(amount) as amount
                FROM ${this.tableName}
                WHERE expense_date >= ? AND expense_date <= ?
            `, [monthStart, monthEnd]);
            
            stats.thisMonthExpensesCount = monthStats?.count || 0;
            stats.thisMonthAmount = monthStats?.amount || 0;
            
            // This year's expenses
            const thisYear = new Date().getFullYear();
            const yearStats = await this.db.selectOne(`
                SELECT 
                    COUNT(*) as count,
                    SUM(amount) as amount
                FROM ${this.tableName}
                WHERE strftime('%Y', expense_date) = ?
            `, [thisYear.toString()]);
            
            stats.thisYearExpensesCount = yearStats?.count || 0;
            stats.thisYearAmount = yearStats?.amount || 0;
            
            // Monthly breakdown for the last 12 months
            const monthlyExpenses = await this.db.selectAll(`
                SELECT 
                    strftime('%Y-%m', expense_date) as month,
                    COUNT(*) as expense_count,
                    SUM(amount) as total_amount
                FROM ${this.tableName}
                WHERE expense_date >= date('now', '-12 months')
                GROUP BY strftime('%Y-%m', expense_date)
                ORDER BY month
            `);
            stats.monthlyExpenses = monthlyExpenses;
            
            // Top expense categories (based on description keywords)
            const categoryStats = await this.db.selectAll(`
                SELECT 
                    CASE 
                        WHEN LOWER(description) LIKE '%rent%' OR LOWER(description) LIKE '%office%' THEN 'Office & Rent'
                        WHEN LOWER(description) LIKE '%repair%' OR LOWER(description) LIKE '%maintenance%' THEN 'Repairs & Maintenance'
                        WHEN LOWER(description) LIKE '%travel%' OR LOWER(description) LIKE '%petrol%' OR LOWER(description) LIKE '%fuel%' THEN 'Travel & Transport'
                        WHEN LOWER(description) LIKE '%electricity%' OR LOWER(description) LIKE '%water%' OR LOWER(description) LIKE '%utility%' THEN 'Utilities'
                        WHEN LOWER(description) LIKE '%food%' OR LOWER(description) LIKE '%lunch%' OR LOWER(description) LIKE '%snack%' THEN 'Food & Refreshments'
                        WHEN LOWER(description) LIKE '%supply%' OR LOWER(description) LIKE '%material%' OR LOWER(description) LIKE '%inventory%' THEN 'Supplies & Materials'
                        WHEN LOWER(description) LIKE '%marketing%' OR LOWER(description) LIKE '%advertisement%' OR LOWER(description) LIKE '%promotion%' THEN 'Marketing & Advertising'
                        WHEN LOWER(description) LIKE '%tool%' OR LOWER(description) LIKE '%equipment%' THEN 'Tools & Equipment'
                        ELSE 'Other'
                    END as category,
                    COUNT(*) as expense_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount
                FROM ${this.tableName}
                GROUP BY category
                ORDER BY total_amount DESC
            `);
            stats.expenseCategories = categoryStats;
            
            // Recent high expenses (top 5 in last 30 days)
            const recentHighExpenses = await this.db.selectAll(`
                SELECT description, amount, expense_date
                FROM ${this.tableName}
                WHERE expense_date >= date('now', '-30 days')
                ORDER BY amount DESC
                LIMIT 5
            `);
            stats.recentHighExpenses = recentHighExpenses;
            
            // Daily average for the last 30 days
            const dailyAverage = await this.db.selectOne(`
                SELECT AVG(daily_total) as avg_daily_expense
                FROM (
                    SELECT SUM(amount) as daily_total
                    FROM ${this.tableName}
                    WHERE expense_date >= date('now', '-30 days')
                    GROUP BY expense_date
                )
            `);
            stats.averageDailyExpense = dailyAverage?.avg_daily_expense || 0;
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get expense statistics:', error);
            throw error;
        }
    }

    /**
     * Search expenses
     */
    async searchExpenses(searchTerm, filters = {}) {
        try {
            let sql = `
                SELECT * FROM ${this.tableName}
                WHERE description LIKE ?
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const params = [searchPattern];
            
            // Apply additional filters
            if (filters.dateFrom) {
                sql += ' AND expense_date >= ?';
                params.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                sql += ' AND expense_date <= ?';
                params.push(filters.dateTo);
            }
            
            if (filters.minAmount) {
                sql += ' AND amount >= ?';
                params.push(filters.minAmount);
            }
            
            if (filters.maxAmount) {
                sql += ' AND amount <= ?';
                params.push(filters.maxAmount);
            }
            
            sql += ' ORDER BY expense_date DESC, created_at DESC';
            
            const expenses = await this.db.selectAll(sql, params);
            return expenses;
            
        } catch (error) {
            console.error('Failed to search expenses:', error);
            throw error;
        }
    }

    /**
     * Get expenses summary by period
     */
    async getExpensesSummary(period = 'month') {
        try {
            let sql;
            let params = [];
            
            switch (period) {
                case 'day':
                    sql = `
                        SELECT 
                            expense_date as period,
                            COUNT(*) as expense_count,
                            SUM(amount) as total_amount
                        FROM ${this.tableName}
                        WHERE expense_date >= date('now', '-30 days')
                        GROUP BY expense_date
                        ORDER BY expense_date DESC
                    `;
                    break;
                case 'week':
                    sql = `
                        SELECT 
                            strftime('%Y-W%W', expense_date) as period,
                            COUNT(*) as expense_count,
                            SUM(amount) as total_amount
                        FROM ${this.tableName}
                        WHERE expense_date >= date('now', '-12 weeks')
                        GROUP BY strftime('%Y-W%W', expense_date)
                        ORDER BY period DESC
                    `;
                    break;
                case 'month':
                default:
                    sql = `
                        SELECT 
                            strftime('%Y-%m', expense_date) as period,
                            COUNT(*) as expense_count,
                            SUM(amount) as total_amount
                        FROM ${this.tableName}
                        WHERE expense_date >= date('now', '-12 months')
                        GROUP BY strftime('%Y-%m', expense_date)
                        ORDER BY period DESC
                    `;
                    break;
                case 'year':
                    sql = `
                        SELECT 
                            strftime('%Y', expense_date) as period,
                            COUNT(*) as expense_count,
                            SUM(amount) as total_amount
                        FROM ${this.tableName}
                        GROUP BY strftime('%Y', expense_date)
                        ORDER BY period DESC
                    `;
                    break;
            }
            
            const summary = await this.db.selectAll(sql, params);
            return summary;
            
        } catch (error) {
            console.error('Failed to get expenses summary:', error);
            throw error;
        }
    }

    /**
     * Export expenses data
     */
    async exportData(format = 'json', filters = {}) {
        try {
            const expenses = await this.getAllExpenses(filters);
            
            if (format === 'json') {
                return JSON.stringify(expenses, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(expenses);
            }
            
            throw new Error('Unsupported export format');
            
        } catch (error) {
            console.error('Failed to export expenses data:', error);
            throw error;
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(expenses) {
        if (!expenses || expenses.length === 0) {
            return '';
        }
        
        const headers = ['ID', 'Date', 'Description', 'Amount', 'Created At', 'Created By'];
        const csvRows = [headers.join(',')];
        
        for (const expense of expenses) {
            const row = [
                expense.id,
                expense.expense_date,
                `"${expense.description.replace(/"/g, '""')}"`,
                expense.amount,
                expense.created_at,
                expense.created_by || ''
            ];
            csvRows.push(row.join(','));
        }
        
        return csvRows.join('\n');
    }

    /**
     * Bulk import expenses
     */
    async bulkImport(expensesData) {
        try {
            const queries = [];
            const errors = [];
            
            for (let i = 0; i < expensesData.length; i++) {
                const expenseData = expensesData[i];
                
                try {
                    // Validate each expense
                    if (!expenseData.expense_date || !expenseData.description || !expenseData.amount) {
                        errors.push(`Row ${i + 1}: Missing required fields`);
                        continue;
                    }
                    
                    if (expenseData.amount <= 0) {
                        errors.push(`Row ${i + 1}: Amount must be greater than 0`);
                        continue;
                    }
                    
                    const expense = {
                        expense_date: expenseData.expense_date,
                        description: expenseData.description.trim(),
                        amount: parseFloat(expenseData.amount),
                        created_by: expenseData.created_by || 'bulk_import'
                    };
                    
                    queries.push({
                        sql: `INSERT INTO ${this.tableName} (expense_date, description, amount, created_by) VALUES (?, ?, ?, ?)`,
                        params: [expense.expense_date, expense.description, expense.amount, expense.created_by]
                    });
                    
                } catch (error) {
                    errors.push(`Row ${i + 1}: ${error.message}`);
                }
            }
            
            if (queries.length > 0) {
                await this.db.executeTransaction(queries);
                
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Bulk imported ${queries.length} expenses`);
                
                // Log action
                if (window.logExpenseAction) {
                    logExpenseAction(`Bulk imported ${queries.length} expenses`, {
                        importedCount: queries.length,
                        errorCount: errors.length
                    });
                }
            }
            
            return {
                imported: queries.length,
                errors: errors
            };
            
        } catch (error) {
            console.error('Failed to bulk import expenses:', error);
            throw error;
        }
    }

    /**
     * Delete expenses by date range
     */
    async deleteByDateRange(fromDate, toDate) {
        try {
            // Get expenses to be deleted for logging
            const expensesToDelete = await this.getExpensesByDateRange(fromDate, toDate);
            
            if (expensesToDelete.length === 0) {
                return { deleted: 0, totalAmount: 0 };
            }
            
            const totalAmount = expensesToDelete.reduce((sum, expense) => sum + expense.amount, 0);
            
            // Delete expenses
            const result = await this.db.delete(
                this.tableName, 
                'expense_date >= ? AND expense_date <= ?', 
                [fromDate, toDate]
            );
            
            if (result.changes > 0) {
                // Clear cache
                this.clearCache();
                
                console.log(`✅ Deleted ${result.changes} expenses from ${fromDate} to ${toDate}`);
                
                // Log action
                if (window.logExpenseAction) {
                    logExpenseAction(`Bulk deleted expenses from ${fromDate} to ${toDate}`, {
                        deletedCount: result.changes,
                        totalAmount: totalAmount,
                        dateRange: { fromDate, toDate }
                    });
                }
            }
            
            return {
                deleted: result.changes,
                totalAmount: totalAmount
            };
            
        } catch (error) {
            console.error('Failed to delete expenses by date range:', error);
            throw error;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Expenses cache cleared');
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
     * Validate expense data
     */
    validateExpenseData(expenseData) {
        const errors = [];
        
        // Required fields
        const required = ['expense_date', 'description', 'amount'];
        for (const field of required) {
            if (!expenseData[field]) {
                errors.push(`${field} is required`);
            }
        }
        
        // Data type validation
        if (expenseData.amount && (isNaN(expenseData.amount) || parseFloat(expenseData.amount) <= 0)) {
            errors.push('Amount must be a positive number');
        }
        
        // Date validation
        if (expenseData.expense_date && isNaN(new Date(expenseData.expense_date).getTime())) {
            errors.push('Invalid expense date');
        }
        
        // Description length
        if (expenseData.description && expenseData.description.trim().length < 3) {
            errors.push('Description must be at least 3 characters long');
        }
        
        return errors;
    }
}

// Create and export instance
let expensesDB = null;

// Initialize when SQLite core is ready
document.addEventListener('DOMContentLoaded', function() {
    const initExpensesDB = () => {
        if (window.SQLiteCore && window.SQLiteCore.isReady()) {
            expensesDB = new ExpensesDB(window.SQLiteCore);
            window.ExpensesDB = expensesDB;
            console.log('💳 Expenses Database module initialized');
        } else {
            setTimeout(initExpensesDB, 100);
        }
    };
    
    initExpensesDB();
});

// Export for use by other modules
window.ExpensesDB = expensesDB;