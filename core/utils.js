// Shared utility functions for ZEDSON Watchcraft
class Utils {
    // Date formatting utilities
    static formatDate(date, format = 'DD MMM YYYY') {
        if (!date) return '';
        
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleDateString('en-IN', { month: 'short' });
        const year = d.getFullYear();
        
        switch (format) {
            case 'DD MMM YYYY':
                return `${day} ${month} ${year}`;
            case 'YYYY-MM-DD':
                return d.toISOString().split('T')[0];
            case 'DD/MM/YYYY':
                return `${day}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${year}`;
            default:
                return d.toLocaleDateString('en-IN');
        }
    }

    static getCurrentDate(format = 'YYYY-MM-DD') {
        return this.formatDate(new Date(), format);
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    static calculateAgeing(fromDate) {
        if (!fromDate) return 0;
        
        const today = new Date();
        const start = new Date(fromDate);
        const diffTime = Math.abs(today - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Number formatting utilities
    static formatCurrency(amount, currency = '₹') {
        if (amount === null || amount === undefined) return `${currency}0.00`;
        
        const num = parseFloat(amount);
        return `${currency}${num.toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    }

    static formatNumber(number, decimals = 0) {
        if (number === null || number === undefined) return '0';
        
        return parseFloat(number).toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    // String utilities
    static generateCustomerId() {
        const timestamp = Date.now().toString();
        return timestamp.slice(-6);
    }

    static generateInvoiceNumber(type, category) {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        
        const categoryCode = this.getCategoryCode(category);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `INV${type.toUpperCase()}${year}${month}${day}${categoryCode}${random}`;
    }

    static generateAcknowledgementNumber(category) {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        
        const categoryCode = this.getCategoryCode(category);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `ACKSR${year}${month}${day}${categoryCode}${random}`;
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
        const mobileRegex = /^[6-9]\d{9}$/;
        return mobileRegex.test(mobile.replace(/\D/g, ''));
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateGST(gst) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstRegex.test(gst);
    }

    // UI utilities
    static showLoader() {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.remove('hidden');
    }

    static hideLoader() {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.add('hidden');
    }

    static showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    static getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    static createModal(title, content, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${buttons.map(btn => `
                        <button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('modal-container').appendChild(modal);
        return modal;
    }

    static closeModal(modal) {
        if (modal) {
            modal.remove();
        }
    }

    // Data processing utilities
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static filterData(data, filters) {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                
                const itemValue = item[key];
                if (typeof itemValue === 'string') {
                    return itemValue.toLowerCase().includes(value.toLowerCase());
                }
                return itemValue == value;
            });
        });
    }

    static sortData(data, field, direction = 'asc') {
        return [...data].sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // Handle numbers
            if (!isNaN(aVal) && !isNaN(bVal)) {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            }

            // Handle dates
            if (this.isDate(aVal)) {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    }

    static isDate(value) {
        return value && !isNaN(Date.parse(value));
    }

    // Local storage utilities (for non-sensitive data only)
    static setLocalData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    static getLocalData(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    // Export utilities
    static exportToCSV(data, filename) {
        if (!data.length) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(field => {
                let value = row[field] || '';
                // Escape commas and quotes
                if (value.toString().includes(',') || value.toString().includes('"')) {
                    value = `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    static downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Debounce function for search inputs
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
}

// Global utilities instance
window.Utils = Utils;