class Utils {
    // Date and time utilities
    static getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }

    static getCurrentDateTime() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    static formatDate(date, format = 'dd/mm/yyyy') {
        if (!date) return '';
        
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        switch (format) {
            case 'dd/mm/yyyy':
                return `${day}/${month}/${year}`;
            case 'mm/dd/yyyy':
                return `${month}/${day}/${year}`;
            case 'yyyy-mm-dd':
                return `${year}-${month}-${day}`;
            default:
                return `${day}/${month}/${year}`;
        }
    }

    static formatDateTime(datetime) {
        if (!datetime) return '';
        
        const d = new Date(datetime);
        return d.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Number and currency utilities
    static formatCurrency(amount, currency = '₹') {
        if (amount === null || amount === undefined) return `${currency}0.00`;
        
        const num = parseFloat(amount);
        if (isNaN(num)) return `${currency}0.00`;
        
        return `${currency}${num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    static parseNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[^\d.-]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }

    // ID generation utilities
    static generateCustomerId() {
        const timestamp = Date.now().toString();
        return timestamp.slice(-6); // Last 6 digits of timestamp
    }

    static generateInvoiceNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const timestamp = Date.now().toString().slice(-4);
        return `INV${year}${month}${timestamp}`;
    }

    static generateServiceId() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const timestamp = Date.now().toString().slice(-4);
        return `SRV${year}${month}${timestamp}`;
    }

    static generateProductCode() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `PRD${timestamp.slice(-4)}${random}`;
    }

    // Validation utilities
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateMobile(mobile) {
        const mobileRegex = /^[6-9]\d{9}$/;
        return mobileRegex.test(mobile.replace(/\D/g, ''));
    }

    static validatePincode(pincode) {
        const pincodeRegex = /^\d{6}$/;
        return pincodeRegex.test(pincode);
    }

    static validateGST(gst) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstRegex.test(gst);
    }

    // Form utilities
    static getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values with same name
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
    }

    static populateForm(form, data) {
        Object.keys(data).forEach(key => {
            const element = form.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = !!data[key];
                } else if (element.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    element.value = data[key] || '';
                }
            }
        });
    }

    static clearForm(form) {
        const elements = form.querySelectorAll('input, select, textarea');
        elements.forEach(element => {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = false;
            } else {
                element.value = '';
            }
        });
    }

    // String utilities
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static toTitleCase(str) {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    static slugify(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    static truncate(str, length = 50, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substring(0, length) + suffix;
    }

    // Array utilities
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    static sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
    }

    static unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    // Object utilities
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = this.deepClone(obj[key]);
        });
        return cloned;
    }

    static isEmpty(obj) {
        if (obj === null || obj === undefined) return true;
        if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }

    // File utilities
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    // URL utilities
    static buildQueryString(params) {
        return Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined && params[key] !== '')
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
    }

    static parseQueryString(queryString) {
        const params = {};
        const pairs = (queryString || '').split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
            }
        });
        
        return params;
    }

    // Local storage utilities
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    static getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    static removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    // Error handling utilities
    static handleError(error, context = '') {
        console.error(`Error ${context}:`, error);
        
        let message = 'An unexpected error occurred';
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        
        return message;
    }

    // Performance utilities
    static debounce(func, wait) {
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

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Color utilities
    static generateRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Export utilities
    static downloadCSV(data, filename = 'export.csv') {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                    ? `"${value.replace(/"/g, '""')}"`
                    : value;
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    static printElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        @media print { 
                            .no-print { display: none !important; }
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
    }
}

// Make Utils globally available
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}