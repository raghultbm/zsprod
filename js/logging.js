// ZEDSON WATCHCRAFT - Action Logging Module

/**
 * Comprehensive action logging system for all user activities
 */

// Action logs storage
let actionLogs = [];
let nextLogId = 1;

/**
 * Log an action performed by the user
 */
function logAction(action, details = {}, category = 'general') {
    const currentUser = AuthModule.getCurrentUser();
    if (!currentUser) return;
    
    const logEntry = {
        id: nextLogId++,
        timestamp: Utils.getCurrentTimestamp(),
        date: Utils.formatDate(new Date()),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        username: currentUser.username,
        userRole: currentUser.role,
        action: action,
        category: category,
        details: details,
        sessionId: getSessionId()
    };
    
    actionLogs.push(logEntry);
    
    // Keep only last 1000 logs to prevent memory issues
    if (actionLogs.length > 1000) {
        actionLogs = actionLogs.slice(-1000);
    }
    
    // In a real application, this would send logs to a server
    console.log('Action logged:', logEntry);
}

/**
 * Get or create session ID
 */
function getSessionId() {
    if (!window.currentSessionId) {
        window.currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return window.currentSessionId;
}

/**
 * Log authentication actions
 */
function logAuthAction(action, username, role = null) {
    const logEntry = {
        id: nextLogId++,
        timestamp: Utils.getCurrentTimestamp(),
        date: Utils.formatDate(new Date()),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        username: username,
        userRole: role,
        action: action,
        category: 'authentication',
        details: {},
        sessionId: getSessionId()
    };
    
    actionLogs.push(logEntry);
    console.log('Auth action logged:', logEntry);
}

/**
 * Log inventory actions
 */
function logInventoryAction(action, itemData, quantity = null) {
    const details = {
        itemId: itemData.id,
        itemCode: itemData.code,
        itemName: `${itemData.brand} ${itemData.model}`,
        outlet: itemData.outlet,
        quantity: quantity
    };
    
    logAction(action, details, 'inventory');
}

/**
 * Log sales actions
 */
function logSalesAction(action, saleData, customerData = null) {
    const details = {
        saleId: saleData.id,
        customerName: saleData.customerName || customerData?.name,
        itemName: saleData.watchName,
        amount: saleData.totalAmount,
        paymentMethod: saleData.paymentMethod
    };
    
    logAction(action, details, 'sales');
}

/**
 * Log service actions
 */
function logServiceAction(action, serviceData, customerData = null) {
    const details = {
        serviceId: serviceData.id,
        customerName: serviceData.customerName || customerData?.name,
        watchName: serviceData.watchName,
        status: serviceData.status,
        cost: serviceData.cost
    };
    
    logAction(action, details, 'service');
}

/**
 * Log customer actions
 */
function logCustomerAction(action, customerData) {
    const details = {
        customerId: customerData.id,
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone
    };
    
    logAction(action, details, 'customer');
}

/**
 * Log user management actions
 */
function logUserManagementAction(action, userData, targetUsername = null) {
    const details = {
        targetUser: targetUsername || userData.username,
        targetRole: userData.role,
        performedBy: AuthModule.getCurrentUser()?.username
    };
    
    logAction(action, details, 'user_management');
}

/**
 * Log invoice actions
 */
function logInvoiceAction(action, invoiceData) {
    const details = {
        invoiceId: invoiceData.id,
        invoiceNo: invoiceData.invoiceNo,
        invoiceType: invoiceData.type,
        customerName: invoiceData.customerName,
        amount: invoiceData.amount
    };
    
    logAction(action, details, 'invoice');
}

/**
 * Log navigation actions
 */
function logNavigationAction(section) {
    logAction(`Navigated to ${section} section`, { section: section }, 'navigation');
}

/**
 * Get logs by category
 */
function getLogsByCategory(category) {
    return actionLogs.filter(log => log.category === category);
}

/**
 * Get logs by user
 */
function getLogsByUser(username) {
    return actionLogs.filter(log => log.username === username);
}

/**
 * Get logs by date range
 */
function getLogsByDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return actionLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= from && logDate <= to;
    });
}

/**
 * Get recent logs
 */
function getRecentLogs(limit = 50) {
    return actionLogs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
}

/**
 * Export logs to CSV format
 */
function exportLogsToCSV() {
    if (actionLogs.length === 0) {
        Utils.showNotification('No logs available to export.');
        return;
    }
    
    const csvHeaders = 'ID,Date,Time,Username,Role,Action,Category,Details\n';
    const csvRows = actionLogs.map(log => {
        const details = JSON.stringify(log.details).replace(/"/g, '""');
        return `${log.id},"${log.date}","${log.time}","${log.username}","${log.userRole}","${log.action}","${log.category}","${details}"`;
    }).join('\n');
    
    const csvContent = csvHeaders + csvRows;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zedson_activity_logs_${Utils.formatDate(new Date()).replace(/\//g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    logAction('Exported activity logs to CSV', { logCount: actionLogs.length }, 'system');
    Utils.showNotification('Activity logs exported successfully!');
}

/**
 * Clear old logs (older than specified days)
 */
function clearOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialCount = actionLogs.length;
    actionLogs = actionLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
    const removedCount = initialCount - actionLogs.length;
    
    if (removedCount > 0) {
        logAction(`Cleared ${removedCount} old log entries (older than ${daysToKeep} days)`, 
                 { removedCount, daysToKeep }, 'system');
        Utils.showNotification(`Cleared ${removedCount} old log entries.`);
    }
}

/**
 * Get log statistics
 */
function getLogStatistics() {
    const totalLogs = actionLogs.length;
    const categoryCounts = {};
    const userCounts = {};
    const dailyCounts = {};
    
    actionLogs.forEach(log => {
        // Category counts
        categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;
        
        // User counts
        userCounts[log.username] = (userCounts[log.username] || 0) + 1;
        
        // Daily counts
        dailyCounts[log.date] = (dailyCounts[log.date] || 0) + 1;
    });
    
    return {
        totalLogs,
        categoryCounts,
        userCounts,
        dailyCounts,
        oldestLog: actionLogs.length > 0 ? actionLogs[0] : null,
        newestLog: actionLogs.length > 0 ? actionLogs[actionLogs.length - 1] : null
    };
}

/**
 * Initialize logging system
 */
function initializeLogging() {
    // Log system startup
    logAction('System initialized', { 
        timestamp: Utils.getCurrentTimestamp(),
        userAgent: navigator.userAgent 
    }, 'system');
    
    console.log('Action logging system initialized');
}

// Make logging functions globally available
window.logAction = logAction;
window.logAuthAction = logAuthAction;
window.logInventoryAction = logInventoryAction;
window.logSalesAction = logSalesAction;
window.logServiceAction = logServiceAction;
window.logCustomerAction = logCustomerAction;
window.logUserManagementAction = logUserManagementAction;
window.logInvoiceAction = logInvoiceAction;
window.logNavigationAction = logNavigationAction;

// Export logging module
window.LoggingModule = {
    logAction,
    logAuthAction,
    logInventoryAction,
    logSalesAction,
    logServiceAction,
    logCustomerAction,
    logUserManagementAction,
    logInvoiceAction,
    logNavigationAction,
    getLogsByCategory,
    getLogsByUser,
    getLogsByDateRange,
    getRecentLogs,
    exportLogsToCSV,
    clearOldLogs,
    getLogStatistics,
    initializeLogging,
    actionLogs // For access by other modules
};