// ZEDSON WATCHCRAFT - Utility Functions

/**
 * Utility functions for the Watch Shop Management System
 */

// Format currency to Indian Rupees
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
}

// Format date to Indian standard
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN');
}

// Generate unique ID
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// Generate bill number for invoices
function generateBillNumber(type) {
    const prefix = type === 'Sales' ? 'SI' : 'SV';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
}

// Show notification/alert
function showNotification(message, type = 'info') {
    // For now using alert, can be enhanced with custom notifications
    alert(message);
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number (Indian format)
function validatePhone(phone) {
    const phoneRegex = /^[\+]?[0-9\-\s\(\)]{10,15}$/;
    return phoneRegex.test(phone);
}

// Sanitize HTML to prevent XSS
function sanitizeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Deep clone object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Check if object is empty
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Calculate percentage
function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(2);
}

// Get current timestamp
function getCurrentTimestamp() {
    return new Date().toISOString();
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN');
}

// Search in array of objects
function searchInArray(array, searchTerm, searchFields) {
    if (!searchTerm) return array;
    
    return array.filter(item => {
        return searchFields.some(field => {
            const value = item[field];
            if (value) {
                return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
            }
            return false;
        });
    });
}

// Sort array of objects
function sortArray(array, sortField, sortOrder = 'asc') {
    return array.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
}

// Export functions for use in other modules
window.Utils = {
    formatCurrency,
    formatDate,
    generateId,
    generateBillNumber,
    showNotification,
    validateEmail,
    validatePhone,
    sanitizeHtml,
    debounce,
    deepClone,
    isEmpty,
    formatFileSize,
    calculatePercentage,
    getCurrentTimestamp,
    formatTimestamp,
    searchInArray,
    sortArray
};