// Utility functions for ZEDSON Watchcraft
const Utils = {
    // Date utilities
    formatDate: (date, format = CONSTANTS.DATE_FORMATS.DISPLAY) => {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        switch (format) {
            case CONSTANTS.DATE_FORMATS.DISPLAY:
                return `${day} ${monthNames[d.getMonth()]} ${year}`;
            case CONSTANTS.DATE_FORMATS.DATABASE:
                return `${year}-${month}-${day}`;
            case CONSTANTS.DATE_FORMATS.INVOICE:
                return `${day}/${month}/${year}`;
            default:
                return d.toLocaleDateString();
        }
    },

    getCurrentDate: (format = CONSTANTS.DATE_FORMATS.DATABASE) => {
        return Utils.formatDate(new Date(), format);
    },

    addMonths: (date, months) => {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    },

    // Number utilities
    formatCurrency: (amount) => {
        if (!amount && amount !== 0) return '';
        return `${CONSTANTS.DEFAULTS.CURRENCY}${Number(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    },

    parseAmount: (value) => {
        if (!value) return 0;
        const cleaned = value.toString().replace(/[^\d.-]/g, '');
        return parseFloat(cleaned) || 0;
    },

    // String utilities
    capitalizeFirst: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    generateId: (prefix = '', length = 6) => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, length - timestamp.length);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },

    // Invoice number generation
    generateInvoiceNumber: async (type) => {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // Get category character (simplified for now)
        const categoryChar = '1';
        
        // Generate random 3-digit number
        const randomNum = Math.floor(100 + Math.random() * 900);
        
        const prefix = CONSTANTS.INVOICE_PREFIXES?.[type] || 'INV';
        return `${prefix}${dateStr}${categoryChar}${randomNum}`;
    },

    // Customer ID generation
    generateCustomerId: async () => {
        try {
            // Get the latest customer ID from database
            const result = await app.get(`
                SELECT customer_id 
                FROM customers 
                ORDER BY CAST(customer_id AS INTEGER) DESC 
                LIMIT 1
            `);
            
            let nextId = CONSTANTS.CUSTOMER.ID_START;
            if (result && result.customer_id) {
                nextId = parseInt(result.customer_id) + 1;
            }
            
            return nextId.toString().padStart(CONSTANTS.CUSTOMER.ID_LENGTH, '0');
        } catch (error) {
            console.error('Error generating customer ID:', error);
            // Fallback to timestamp-based ID
            const timestamp = Date.now().toString().slice(-6);
            return timestamp.padStart(CONSTANTS.CUSTOMER.ID_LENGTH, '0');
        }
    },

    // Form utilities
    getFormData: (formElement) => {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values (like checkboxes)
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },

    populateForm: (formElement, data) => {
        if (!formElement || !data) return;
        
        Object.keys(data).forEach(key => {
            const element = formElement.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = !!data[key];
                } else {
                    element.value = data[key] || '';
                    // Trigger input event to ensure any listeners are notified
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
    },

    clearForm: (formElement) => {
        if (formElement) {
            formElement.reset();
        }
    },

    // DOM utilities
    createElement: (tag, className = '', innerHTML = '') => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    },

    show: (element) => {
        if (element) element.style.display = 'block';
    },

    hide: (element) => {
        if (element) element.style.display = 'none';
    },

    toggle: (element) => {
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    },

    // Array utilities
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    sortBy: (array, key, direction = 'asc') => {
        return [...array].sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            
            // Handle date strings
            if (typeof aVal === 'string' && aVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            // Handle numbers
            if (!isNaN(aVal) && !isNaN(bVal)) {
                aVal = Number(aVal);
                bVal = Number(bVal);
            }
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
    },

    // Debounce function for search
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Local storage utilities (for settings, not data)
    saveToStorage: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    },

    getFromStorage: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error getting from storage:', error);
            return defaultValue;
        }
    },

    // Loading and UI utilities
    showLoading: (show) => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'block' : 'none';
        }
    },

    // Error handling
    showError: (message, container = null) => {
        console.error('Error:', message);
        
        if (container) {
            const errorDiv = Utils.createElement('div', 'alert alert-error', message);
            container.appendChild(errorDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        } else {
            // Show as browser alert for now
            alert(message);
        }
    },

    showSuccess: (message, container = null) => {
        console.log('Success:', message);
        
        if (container) {
            const successDiv = Utils.createElement('div', 'alert alert-success', message);
            container.appendChild(successDiv);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 3000);
        } else {
            // Show as browser alert for now
            alert(message);
        }
    },

    // Print utilities
    printElement: (element) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .no-print { display: none !important; }
                        @media print {
                            body { margin: 0; }
                            .page-break { page-break-before: always; }
                        }
                    </style>
                </head>
                <body>
                    ${element.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    },

    // Validation helpers
    validateRequired: (value, fieldName) => {
        if (!value || value.toString().trim() === '') {
            return `${fieldName} is required`;
        }
        return null;
    },

    // CSV export utility
    exportToCSV: (data, filename) => {
        if (!data || data.length === 0) {
            Utils.showError('No data to export');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    `"${(row[header] || '').toString().replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${Utils.getCurrentDate('YYYYMMDD')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
};

// Make Utils globally available
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}