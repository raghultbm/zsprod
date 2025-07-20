// ZEDSON WATCHCRAFT - Utility Functions (Enhanced for Phase 6 API Integration)

/**
 * Utility functions for the Watch Shop Management System
 * Enhanced with API integration utilities for Phase 6
 */

// ============== EXISTING UTILITY FUNCTIONS ==============

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
    // Enhanced with toast notifications for API feedback
    showToastNotification(message, type);
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

// ============== NEW PHASE 6 API UTILITIES ==============

// Loading State Management
const loadingStates = new Map();

function showLoadingSpinner(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Store original content
    if (!loadingStates.has(elementId)) {
        loadingStates.set(elementId, {
            originalContent: element.innerHTML,
            isLoading: false
        });
    }
    
    const state = loadingStates.get(elementId);
    if (state.isLoading) return; // Already loading
    
    state.isLoading = true;
    element.innerHTML = `
        <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
            <div class="loading-message">${sanitizeHtml(message)}</div>
        </div>
    `;
    element.classList.add('loading-state');
}

function hideLoadingSpinner(elementId) {
    const element = document.getElementById(elementId);
    const state = loadingStates.get(elementId);
    
    if (!element || !state) return;
    
    state.isLoading = false;
    element.innerHTML = state.originalContent;
    element.classList.remove('loading-state');
}

function showButtonLoading(buttonElement, loadingText = 'Processing...') {
    if (!buttonElement) return;
    
    const originalText = buttonElement.textContent;
    const originalDisabled = buttonElement.disabled;
    
    buttonElement.textContent = loadingText;
    buttonElement.disabled = true;
    buttonElement.classList.add('btn-loading');
    
    // Store original state
    buttonElement.dataset.originalText = originalText;
    buttonElement.dataset.originalDisabled = originalDisabled;
}

function hideButtonLoading(buttonElement) {
    if (!buttonElement) return;
    
    buttonElement.textContent = buttonElement.dataset.originalText || 'Submit';
    buttonElement.disabled = buttonElement.dataset.originalDisabled === 'true';
    buttonElement.classList.remove('btn-loading');
    
    // Clean up
    delete buttonElement.dataset.originalText;
    delete buttonElement.dataset.originalDisabled;
}

// Error Display Functions
function showApiError(message, containerId = 'errorContainer', duration = 5000) {
    let container = document.getElementById(containerId);
    
    if (!container) {
        // Create error container if it doesn't exist
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'api-error-container';
        document.body.appendChild(container);
    }
    
    const errorElement = document.createElement('div');
    errorElement.className = 'api-error-message';
    errorElement.innerHTML = `
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-text">${sanitizeHtml(message)}</span>
            <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    container.appendChild(errorElement);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, duration);
    }
}

function clearApiErrors(containerId = 'errorContainer') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// Toast Notification System
function showToastNotification(message, type = 'info', duration = 4000) {
    const toastContainer = getOrCreateToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${sanitizeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('toast-visible'), 10);
    
    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, duration);
}

function getOrCreateToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Retry Mechanism
function retryApiCall(apiFunction, maxRetries = 3, delay = 1000) {
    return new Promise(async (resolve, reject) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await apiFunction();
                resolve(result);
                return;
            } catch (error) {
                lastError = error;
                console.warn(`API call attempt ${attempt} failed:`, error);
                
                if (attempt < maxRetries) {
                    // Exponential backoff
                    const waitTime = delay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    reject(lastError);
                }
            }
        }
    });
}

// Offline Detection
let isOnline = navigator.onLine;
let onlineCallbacks = [];
let offlineCallbacks = [];

function initializeOfflineDetection() {
    window.addEventListener('online', () => {
        isOnline = true;
        hideOfflineNotification();
        onlineCallbacks.forEach(callback => callback());
        showToastNotification('Connection restored', 'success');
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        showOfflineNotification();
        offlineCallbacks.forEach(callback => callback());
        showToastNotification('Connection lost - Working offline', 'warning');
    });
    
    // Initial check
    if (!isOnline) {
        showOfflineNotification();
    }
}

function showOfflineNotification() {
    let notification = document.getElementById('offlineNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'offlineNotification';
        notification.className = 'offline-notification';
        notification.innerHTML = `
            <span class="offline-icon">📡</span>
            <span class="offline-text">You're offline. Some features may not be available.</span>
        `;
        document.body.appendChild(notification);
    }
    notification.classList.add('offline-visible');
}

function hideOfflineNotification() {
    const notification = document.getElementById('offlineNotification');
    if (notification) {
        notification.classList.remove('offline-visible');
    }
}

function onOnline(callback) {
    onlineCallbacks.push(callback);
}

function onOffline(callback) {
    offlineCallbacks.push(callback);
}

function getNetworkStatus() {
    return {
        isOnline,
        connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
    };
}

// Data Validation for API Payloads
function validateApiPayload(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        
        // Required check
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
            continue;
        }
        
        // Skip further validation if field is not provided and not required
        if (value === undefined || value === null) continue;
        
        // Type validation
        if (rules.type) {
            if (rules.type === 'email' && !validateEmail(value)) {
                errors.push(`${field} must be a valid email address`);
            } else if (rules.type === 'phone' && !validatePhone(value)) {
                errors.push(`${field} must be a valid phone number`);
            } else if (rules.type === 'number' && isNaN(value)) {
                errors.push(`${field} must be a number`);
            } else if (rules.type === 'string' && typeof value !== 'string') {
                errors.push(`${field} must be a string`);
            }
        }
        
        // Length validation
        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        
        // Range validation for numbers
        if (rules.min !== undefined && parseFloat(value) < rules.min) {
            errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && parseFloat(value) > rules.max) {
            errors.push(`${field} must be at most ${rules.max}`);
        }
        
        // Custom validation
        if (rules.validator && !rules.validator(value)) {
            errors.push(rules.message || `${field} is invalid`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// File Upload Utilities
function createFileInput(accept = '*/*', multiple = false) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    return input;
}

function selectFile(accept = '*/*', multiple = false) {
    return new Promise((resolve, reject) => {
        const input = createFileInput(accept, multiple);
        
        input.onchange = (event) => {
            const files = Array.from(event.target.files);
            if (files.length > 0) {
                resolve(multiple ? files : files[0]);
            } else {
                reject(new Error('No file selected'));
            }
            document.body.removeChild(input);
        };
        
        input.oncancel = () => {
            reject(new Error('File selection cancelled'));
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    });
}

function validateFile(file, maxSize = 5 * 1024 * 1024, allowedTypes = []) {
    const errors = [];
    
    if (file.size > maxSize) {
        errors.push(`File size must be less than ${formatFileSize(maxSize)}`);
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Image Processing
function resizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            // Resize
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(resolve, file.type, quality);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function createImagePreview(file, container) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <div class="image-info">
                <span class="image-name">${sanitizeHtml(file.name)}</span>
                <span class="image-size">${formatFileSize(file.size)}</span>
            </div>
            <button class="remove-image" onclick="this.parentElement.remove()">×</button>
        `;
        
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.appendChild(preview);
        }
    };
    
    reader.readAsDataURL(file);
}

// Local Storage Utilities for Offline Support
function saveToLocalStorage(key, data, expiration = null) {
    const item = {
        data,
        timestamp: Date.now(),
        expiration
    };
    
    try {
        localStorage.setItem(key, JSON.stringify(item));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const item = JSON.parse(localStorage.getItem(key));
        
        if (!item) return null;
        
        // Check expiration
        if (item.expiration && Date.now() > item.expiration) {
            localStorage.removeItem(key);
            return null;
        }
        
        return item.data;
    } catch (error) {
        console.error('Failed to get from localStorage:', error);
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Failed to remove from localStorage:', error);
        return false;
    }
}

function clearExpiredLocalStorage() {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
        try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item && item.expiration && now > item.expiration) {
                localStorage.removeItem(key);
            }
        } catch (error) {
            // Invalid JSON, skip
        }
    });
}

// Performance Monitoring
function measureApiPerformance(name, apiCall) {
    const startTime = performance.now();
    
    return apiCall()
        .then(result => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(`API Performance [${name}]: ${duration.toFixed(2)}ms`);
            
            // Log if available
            if (window.logAction) {
                window.logAction(`API call completed: ${name}`, {
                    duration: duration.toFixed(2),
                    performance: 'success'
                }, 'api-performance');
            }
            
            return result;
        })
        .catch(error => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.error(`API Error [${name}]: ${duration.toFixed(2)}ms`, error);
            
            // Log if available
            if (window.logAction) {
                window.logAction(`API call failed: ${name}`, {
                    duration: duration.toFixed(2),
                    error: error.message,
                    performance: 'error'
                }, 'api-performance');
            }
            
            throw error;
        });
}

// Initialize utilities
function initializeApiUtilities() {
    initializeOfflineDetection();
    clearExpiredLocalStorage();
    
    // Clean up expired localStorage every hour
    setInterval(clearExpiredLocalStorage, 60 * 60 * 1000);
}

// Enhanced Utils export with all functions
window.Utils = {
    // Original functions
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
    sortArray,
    
    // New API utilities
    showLoadingSpinner,
    hideLoadingSpinner,
    showButtonLoading,
    hideButtonLoading,
    showApiError,
    clearApiErrors,
    showToastNotification,
    retryApiCall,
    showOfflineNotification,
    hideOfflineNotification,
    onOnline,
    onOffline,
    getNetworkStatus,
    validateApiPayload,
    selectFile,
    validateFile,
    resizeImage,
    createImagePreview,
    saveToLocalStorage,
    getFromLocalStorage,
    removeFromLocalStorage,
    clearExpiredLocalStorage,
    measureApiPerformance,
    initializeApiUtilities
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', initializeApiUtilities);