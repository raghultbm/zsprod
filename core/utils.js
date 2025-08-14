const authManager = require('./auth');

class Utils {
    // Date formatting utilities
    static formatDate(date, format = 'DD MMM YYYY') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleString('default', { month: 'short' });
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        switch (format) {
            case 'DD MMM YYYY':
                return `${day} ${month} ${year}`;
            case 'DD/MM/YYYY':
                return `${day}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${day}`;
            case 'DD MMM YYYY HH:mm':
                return `${day} ${month} ${year} ${hours}:${minutes}`;
            default:
                return `${day} ${month} ${year}`;
        }
    }

    static getCurrentDateTime() {
        return new Date().toISOString();
    }

    static getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }

    static getCurrentUser() {
        const user = authManager.getCurrentUser();
        return user ? user.username : 'system';
    }

    // Number formatting utilities
    static formatCurrency(amount, currency = '₹') {
        if (isNaN(amount) || amount === null || amount === undefined) return `${currency}0.00`;
        
        const num = parseFloat(amount);
        return `${currency}${num.toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }

    static formatNumber(number, decimals = 0) {
        if (isNaN(number) || number === null || number === undefined) return '0';
        
        return parseFloat(number).toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    // String utilities
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static generateId(prefix, date = new Date()) {
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `${prefix}${year}${month}${day}${random}`;
    }

    static generateCustomerId() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static generateInvoiceNumber(type, category = '') {
        const categoryCode = this.getCategoryCode(category);
        return this.generateId(`INV${type}`, new Date()) + categoryCode;
    }

    static generateAckNumber(category = '') {
        const categoryCode = this.getCategoryCode(category);
        return this.generateId('ACKSR', new Date()) + categoryCode;
    }

    static getCategoryCode(category) {
        const codes = {
            'Watch': 'W',
            'WallClocks': 'C',
            'Timepieces': 'T',
            'Strap': 'S',
            'Spring Bar': 'B',
            'Loop': 'L',
            'Buckle': 'K'
        };
        return codes[category] || 'X';
    }

    // Validation utilities
    static validateMobile(mobile) {
        const mobileRegex = /^[+]?[0-9]{10,15}$/;
        return mobileRegex.test(mobile.replace(/\s/g, ''));
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateGST(gst) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstRegex.test(gst);
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>'"]/g, '');
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
        return array.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            
            // Handle dates
            if (aVal instanceof Date || (typeof aVal === 'string' && aVal.match(/^\d{4}-\d{2}-\d{2}/))) {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }
            
            // Handle numbers
            if (!isNaN(aVal) && !isNaN(bVal)) {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            }
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
    }

    // DOM utilities
    static createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    static showMessage(message, type = 'info', duration = 3000) {
        // Remove existing messages
        const existing = document.querySelectorAll('.toast-message');
        existing.forEach(el => el.remove());

        const toast = this.createElement('div', `toast-message toast-${type}`, `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `);

        document.body.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, duration);
        }
    }

    static showConfirm(message, onConfirm, onCancel = null) {
        const modal = this.createElement('div', 'modal-overlay', `
            <div class="modal-content">
                <h3>Confirm Action</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); ${onCancel ? onCancel.toString() + '()' : ''}">Cancel</button>
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); ${onConfirm.toString()}()">Confirm</button>
                </div>
            </div>
        `);

        document.body.appendChild(modal);
        return modal;
    }

    static showModal(title, content, actions = '') {
        const modal = this.createElement('div', 'modal-overlay', `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-actions">
                    ${actions}
                </div>
            </div>
        `);

        document.body.appendChild(modal);
        return modal;
    }

    // Form utilities
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }

    static populateForm(formElement, data) {
        for (let key in data) {
            const element = formElement.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = Boolean(data[key]);
                } else if (element.type === 'radio') {
                    const radio = formElement.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    element.value = data[key] || '';
                }
            }
        }
    }

    static clearForm(formElement) {
        const inputs = formElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }

    // Search and filter utilities
    static filterArray(array, searchTerm, searchFields = []) {
        if (!searchTerm) return array;
        
        const term = searchTerm.toLowerCase();
        return array.filter(item => {
            if (searchFields.length === 0) {
                // Search all string fields
                return Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(term)
                );
            } else {
                // Search specific fields
                return searchFields.some(field => 
                    item[field] && item[field].toString().toLowerCase().includes(term)
                );
            }
        });
    }

    // File utilities
    static downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    static exportToCSV(data, filename) {
        if (!data.length) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => 
                `"${(row[header] || '').toString().replace(/"/g, '""')}"`
            ).join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, filename, 'text/csv');
    }

    // WhatsApp integration
    static sendWhatsApp(phoneNumber, message) {
        const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
        window.open(url, '_blank');
    }

    // Print utilities
    static printElement(elementId, title = 'Print') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
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
    }

    // Local storage helpers (for settings only, not data)
    static getSetting(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(`zedson_setting_${key}`);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    static setSetting(key, value) {
        try {
            localStorage.setItem(`zedson_setting_${key}`, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to save setting:', key, e);
        }
    }

    // Debounce utility for search inputs
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

    // Calculate aging for inventory
    static calculateAging(date) {
        const today = new Date();
        const itemDate = new Date(date);
        const diffTime = today - itemDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) return `${diffDays} days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
        return `${Math.floor(diffDays / 365)} years`;
    }
}

module.exports = Utils;