// ZEDSON WATCHCRAFT - Action Logging Module (Enhanced for Phase 6 API Integration)

/**
 * Comprehensive action logging system for all user activities
 * Enhanced with API operation logging for Phase 6
 */

// Action logs storage
let actionLogs = [];
let nextLogId = 1;

// Performance tracking
let apiPerformanceMetrics = [];
let errorMetrics = [];

// ============== EXISTING LOGGING FUNCTIONS ==============

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

// ============== NEW PHASE 6 API LOGGING FUNCTIONS ==============

/**
 * Log API call actions
 */
function logApiCall(endpoint, method, requestData = null, responseTime = null) {
    const currentUser = AuthModule.getCurrentUser();
    const details = {
        endpoint: endpoint,
        method: method.toUpperCase(),
        requestDataSize: requestData ? JSON.stringify(requestData).length : 0,
        responseTime: responseTime,
        timestamp: Date.now(),
        networkStatus: navigator.onLine ? 'online' : 'offline'
    };
    
    const logEntry = {
        id: nextLogId++,
        timestamp: Utils.getCurrentTimestamp(),
        date: Utils.formatDate(new Date()),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        username: currentUser?.username || 'anonymous',
        userRole: currentUser?.role || 'unknown',
        action: `API ${method.toUpperCase()} ${endpoint}`,
        category: 'api-call',
        details: details,
        sessionId: getSessionId()
    };
    
    actionLogs.push(logEntry);
    console.log('API call logged:', logEntry);
}

/**
 * Log API errors
 */
function logApiError(endpoint, method, error, responseTime = null, statusCode = null) {
    const currentUser = AuthModule.getCurrentUser();
    const details = {
        endpoint: endpoint,
        method: method.toUpperCase(),
        errorMessage: error.message || error.toString(),
        errorType: error.name || 'Unknown',
        statusCode: statusCode,
        responseTime: responseTime,
        stackTrace: error.stack,
        networkStatus: navigator.onLine ? 'online' : 'offline'
    };
    
    const logEntry = {
        id: nextLogId++,
        timestamp: Utils.getCurrentTimestamp(),
        date: Utils.formatDate(new Date()),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        username: currentUser?.username || 'anonymous',
        userRole: currentUser?.role || 'unknown',
        action: `API ERROR ${method.toUpperCase()} ${endpoint}`,
        category: 'api-error',
        details: details,
        sessionId: getSessionId()
    };
    
    actionLogs.push(logEntry);
    errorMetrics.push(logEntry);
    console.error('API error logged:', logEntry);
}

/**
 * Log data synchronization actions
 */
function logDataSync(action, dataType, recordCount = 0, direction = 'bidirectional') {
    const details = {
        dataType: dataType,
        recordCount: recordCount,
        direction: direction, // 'upload', 'download', 'bidirectional'
        syncTimestamp: Date.now()
    };
    
    logAction(`Data sync: ${action}`, details, 'data-sync');
}

/**
 * Log API performance metrics
 */
function logApiPerformance(endpoint, method, responseTime, dataSize = 0, success = true) {
    const performanceEntry = {
        id: nextLogId++,
        timestamp: Utils.getCurrentTimestamp(),
        endpoint: endpoint,
        method: method.toUpperCase(),
        responseTime: responseTime,
        dataSize: dataSize,
        success: success,
        networkType: getNetworkType(),
        sessionId: getSessionId()
    };
    
    apiPerformanceMetrics.push(performanceEntry);
    
    // Keep only last 500 performance metrics
    if (apiPerformanceMetrics.length > 500) {
        apiPerformanceMetrics = apiPerformanceMetrics.slice(-500);
    }
    
    console.log('API performance logged:', performanceEntry);
}

/**
 * Log offline/online state changes
 */
function logNetworkStateChange(isOnline, previousState = null) {
    const details = {
        newState: isOnline ? 'online' : 'offline',
        previousState: previousState,
        connectionType: getNetworkType(),
        stateChangeTime: Date.now()
    };
    
    logAction(`Network state changed to ${isOnline ? 'online' : 'offline'}`, details, 'network');
}

/**
 * Log cache operations
 */
function logCacheOperation(operation, key, hit = null, size = null) {
    const details = {
        operation: operation, // 'get', 'set', 'clear', 'hit', 'miss'
        key: key,
        hit: hit,
        size: size,
        cacheTimestamp: Date.now()
    };
    
    logAction(`Cache ${operation}: ${key}`, details, 'cache');
}

/**
 * Log file upload operations
 */
function logFileUpload(filename, fileSize, uploadTime, success = true, error = null) {
    const details = {
        filename: filename,
        fileSize: fileSize,
        uploadTime: uploadTime,
        success: success,
        error: error,
        uploadTimestamp: Date.now()
    };
    
    logAction(`File upload: ${filename}`, details, 'file-upload');
}

/**
 * Log retry attempts
 */
function logRetryAttempt(endpoint, method, attemptNumber, maxAttempts, error = null) {
    const details = {
        endpoint: endpoint,
        method: method.toUpperCase(),
        attemptNumber: attemptNumber,
        maxAttempts: maxAttempts,
        error: error?.message,
        retryTimestamp: Date.now()
    };
    
    logAction(`API retry attempt ${attemptNumber}/${maxAttempts}: ${endpoint}`, details, 'api-retry');
}

// ============== UTILITY FUNCTIONS ==============

/**
 * Get network connection type
 */
function getNetworkType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection ? connection.effectiveType || connection.type || 'unknown' : 'unknown';
}

/**
 * Get logs by category (enhanced)
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
 * Get API performance analytics
 */
function getApiPerformanceAnalytics() {
    if (apiPerformanceMetrics.length === 0) return null;
    
    const successful = apiPerformanceMetrics.filter(m => m.success);
    const failed = apiPerformanceMetrics.filter(m => !m.success);
    
    const responseTimes = successful.map(m => m.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    // Group by endpoint
    const endpointStats = {};
    apiPerformanceMetrics.forEach(metric => {
        const key = `${metric.method} ${metric.endpoint}`;
        if (!endpointStats[key]) {
            endpointStats[key] = {
                totalCalls: 0,
                successfulCalls: 0,
                totalResponseTime: 0,
                errors: 0
            };
        }
        
        endpointStats[key].totalCalls++;
        if (metric.success) {
            endpointStats[key].successfulCalls++;
            endpointStats[key].totalResponseTime += metric.responseTime;
        } else {
            endpointStats[key].errors++;
        }
    });
    
    // Calculate averages for each endpoint
    Object.keys(endpointStats).forEach(key => {
        const stats = endpointStats[key];
        stats.avgResponseTime = stats.successfulCalls > 0 ? 
            stats.totalResponseTime / stats.successfulCalls : 0;
        stats.successRate = (stats.successfulCalls / stats.totalCalls) * 100;
    });
    
    return {
        totalApiCalls: apiPerformanceMetrics.length,
        successfulCalls: successful.length,
        failedCalls: failed.length,
        successRate: (successful.length / apiPerformanceMetrics.length) * 100,
        avgResponseTime: avgResponseTime || 0,
        minResponseTime: minResponseTime || 0,
        maxResponseTime: maxResponseTime || 0,
        endpointStats: endpointStats
    };
}

/**
 * Get error analytics
 */
function getErrorAnalytics() {
    const errorLogs = getLogsByCategory('api-error');
    
    if (errorLogs.length === 0) return null;
    
    // Group by error type
    const errorTypes = {};
    errorLogs.forEach(log => {
        const errorType = log.details.errorType || 'Unknown';
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    // Group by endpoint
    const endpointErrors = {};
    errorLogs.forEach(log => {
        const endpoint = log.details.endpoint;
        endpointErrors[endpoint] = (endpointErrors[endpoint] || 0) + 1;
    });
    
    // Group by status code
    const statusCodeErrors = {};
    errorLogs.forEach(log => {
        const statusCode = log.details.statusCode || 'Unknown';
        statusCodeErrors[statusCode] = (statusCodeErrors[statusCode] || 0) + 1;
    });
    
    return {
        totalErrors: errorLogs.length,
        errorTypes: errorTypes,
        endpointErrors: endpointErrors,
        statusCodeErrors: statusCodeErrors,
        recentErrors: errorLogs.slice(-10)
    };
}

/**
 * Export logs to CSV format (enhanced)
 */
function exportLogsToCSV(category = null) {
    let logsToExport = category ? getLogsByCategory(category) : actionLogs;
    
    if (logsToExport.length === 0) {
        Utils.showNotification('No logs available to export.');
        return;
    }
    
    const csvHeaders = 'ID,Date,Time,Username,Role,Action,Category,Details,Session ID\n';
    const csvRows = logsToExport.map(log => {
        const details = JSON.stringify(log.details).replace(/"/g, '""');
        return `${log.id},"${log.date}","${log.time}","${log.username}","${log.userRole}","${log.action}","${log.category}","${details}","${log.sessionId}"`;
    }).join('\n');
    
    const csvContent = csvHeaders + csvRows;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const categoryText = category ? `_${category}` : '';
    a.download = `zedson_activity_logs${categoryText}_${Utils.formatDate(new Date()).replace(/\//g, '-')}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    logAction(`Exported activity logs to CSV${category ? ` (category: ${category})` : ''}`, 
             { logCount: logsToExport.length, category }, 'system');
    Utils.showNotification('Activity logs exported successfully!');
}

/**
 * Export API performance metrics
 */
function exportApiPerformanceMetrics() {
    if (apiPerformanceMetrics.length === 0) {
        Utils.showNotification('No performance metrics available to export.');
        return;
    }
    
    const csvHeaders = 'ID,Timestamp,Endpoint,Method,Response Time (ms),Data Size (bytes),Success,Network Type,Session ID\n';
    const csvRows = apiPerformanceMetrics.map(metric => {
        return `${metric.id},"${metric.timestamp}","${metric.endpoint}","${metric.method}",${metric.responseTime},${metric.dataSize},${metric.success},"${metric.networkType}","${metric.sessionId}"`;
    }).join('\n');
    
    const csvContent = csvHeaders + csvRows;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zedson_api_performance_${Utils.formatDate(new Date()).replace(/\//g, '-')}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    logAction('Exported API performance metrics to CSV', 
             { metricCount: apiPerformanceMetrics.length }, 'system');
    Utils.showNotification('API performance metrics exported successfully!');
}

/**
 * Clear old logs (enhanced)
 */
function clearOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialCount = actionLogs.length;
    actionLogs = actionLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
    const removedCount = initialCount - actionLogs.length;
    
    // Also clean performance metrics
    const initialPerfCount = apiPerformanceMetrics.length;
    apiPerformanceMetrics = apiPerformanceMetrics.filter(metric => new Date(metric.timestamp) >= cutoffDate);
    const removedPerfCount = initialPerfCount - apiPerformanceMetrics.length;
    
    if (removedCount > 0 || removedPerfCount > 0) {
        logAction(`Cleared old logs: ${removedCount} activity logs, ${removedPerfCount} performance metrics (older than ${daysToKeep} days)`, 
                 { removedLogs: removedCount, removedMetrics: removedPerfCount, daysToKeep }, 'system');
        Utils.showNotification(`Cleared ${removedCount} old log entries and ${removedPerfCount} performance metrics.`);
    }
}

/**
 * Get log statistics (enhanced)
 */
function getLogStatistics() {
    const totalLogs = actionLogs.length;
    const categoryCounts = {};
    const userCounts = {};
    const dailyCounts = {};
    const apiCalls = getLogsByCategory('api-call').length;
    const apiErrors = getLogsByCategory('api-error').length;
    
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
        apiMetrics: {
            totalApiCalls: apiCalls,
            totalApiErrors: apiErrors,
            apiSuccessRate: apiCalls > 0 ? ((apiCalls - apiErrors) / apiCalls * 100).toFixed(2) : 0,
            performanceMetricsCount: apiPerformanceMetrics.length
        },
        oldestLog: actionLogs.length > 0 ? actionLogs[0] : null,
        newestLog: actionLogs.length > 0 ? actionLogs[actionLogs.length - 1] : null
    };
}

/**
 * Initialize logging system (enhanced)
 */
function initializeLogging() {
    // Log system startup
    logAction('System initialized', { 
        timestamp: Utils.getCurrentTimestamp(),
        userAgent: navigator.userAgent,
        networkStatus: navigator.onLine ? 'online' : 'offline',
        networkType: getNetworkType()
    }, 'system');
    
    // Set up periodic cleanup
    setInterval(() => {
        clearOldLogs(30); // Clean logs older than 30 days
    }, 24 * 60 * 60 * 1000); // Run daily
    
    console.log('Enhanced action logging system initialized');
}

/**
 * Send logs to server (for future implementation)
 */
function sendLogsToServer(logs = null) {
    // This would implement actual server logging
    // For now, just log the action
    const logsToSend = logs || actionLogs.slice(-100); // Send last 100 logs
    
    logAction('Attempted to send logs to server', {
        logCount: logsToSend.length,
        serverEndpoint: '/api/logs'
    }, 'system');
    
    // TODO: Implement actual API call when server is ready
    console.log('Logs would be sent to server:', logsToSend);
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

// New API logging functions
window.logApiCall = logApiCall;
window.logApiError = logApiError;
window.logDataSync = logDataSync;
window.logApiPerformance = logApiPerformance;
window.logNetworkStateChange = logNetworkStateChange;
window.logCacheOperation = logCacheOperation;
window.logFileUpload = logFileUpload;
window.logRetryAttempt = logRetryAttempt;

// Enhanced logging module export
window.LoggingModule = {
    // Original functions
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
    
    // New API functions
    logApiCall,
    logApiError,
    logDataSync,
    logApiPerformance,
    logNetworkStateChange,
    logCacheOperation,
    logFileUpload,
    logRetryAttempt,
    getApiPerformanceAnalytics,
    getErrorAnalytics,
    exportApiPerformanceMetrics,
    sendLogsToServer,
    
    // Data access
    actionLogs,
    apiPerformanceMetrics,
    errorMetrics
};