// Validation rules and functions for ZEDSON Watchcraft
window.Validators = {
    // Customer validation
    validateCustomer(data) {
        const errors = [];

        if (!data.name || data.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (!data.mobile_number || !this.isValidMobile(data.mobile_number)) {
            errors.push('Please enter a valid 10-digit mobile number');
        }

        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Please enter a valid email address');
        }

        if (data.customer_id && data.customer_id.length !== 6) {
            errors.push('Customer ID must be exactly 6 digits');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Inventory validation
    validateInventory(data) {
        const errors = [];

        if (!data.code || data.code.trim().length === 0) {
            errors.push('Code is required');
        }

        if (!data.category) {
            errors.push('Category is required');
        }

        if (!data.amount || parseFloat(data.amount) <= 0) {
            errors.push('Amount must be greater than 0');
        }

        if (data.warranty_period && (isNaN(data.warranty_period) || data.warranty_period < 0)) {
            errors.push('Warranty period must be a valid number of months');
        }

        // Category-specific validation
        if (data.category) {
            const categoryValidation = window.Categories.validateCategoryData(data.category, data);
            if (!categoryValidation.isValid) {
                errors.push(...categoryValidation.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Sales validation
    validateSale(data) {
        const errors = [];

        if (!data.customer_id) {
            errors.push('Customer is required');
        }

        if (!data.items || data.items.length === 0) {
            errors.push('At least one item is required');
        }

        if (!data.sale_date) {
            errors.push('Sale date is required');
        }

        if (!data.payment_modes || data.payment_modes.length === 0) {
            errors.push('Payment mode is required');
        }

        if (data.discount_type === 'Percentage' && (data.discount_value < 0 || data.discount_value > 100)) {
            errors.push('Discount percentage must be between 0 and 100');
        }

        if (data.discount_type === 'Amount' && data.discount_value < 0) {
            errors.push('Discount amount cannot be negative');
        }

        if (data.advance_amount && parseFloat(data.advance_amount) < 0) {
            errors.push('Advance amount cannot be negative');
        }

        if (data.total_amount <= 0) {
            errors.push('Total amount must be greater than 0');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Service validation
    validateService(data) {
        const errors = [];

        if (!data.customer_id) {
            errors.push('Customer is required');
        }

        if (!data.category) {
            errors.push('Category is required');
        }

        if (!data.particulars || data.particulars.trim().length === 0) {
            errors.push('Particulars/Problem description is required');
        }

        if (!data.service_date) {
            errors.push('Service date is required');
        }

        if (data.service_type === 'instant' && !data.delivery_date) {
            errors.push('Delivery date is required for instant service');
        }

        if (!data.total_amount || parseFloat(data.total_amount) <= 0) {
            errors.push('Service amount must be greater than 0');
        }

        if (data.advance_amount && parseFloat(data.advance_amount) < 0) {
            errors.push('Advance amount cannot be negative');
        }

        if (data.warranty_period && (isNaN(data.warranty_period) || data.warranty_period < 0)) {
            errors.push('Warranty period must be a valid number of months');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Expense validation
    validateExpense(data) {
        const errors = [];

        if (!data.description || data.description.trim().length === 0) {
            errors.push('Description is required');
        }

        if (!data.amount || parseFloat(data.amount) <= 0) {
            errors.push('Amount must be greater than 0');
        }

        if (!data.payment_mode) {
            errors.push('Payment mode is required');
        }

        if (!data.date) {
            errors.push('Date is required');
        }

        if (data.description && data.description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // User validation
    validateUser(data, isUpdate = false) {
        const errors = [];

        if (!data.username || data.username.trim().length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        if (!isUpdate || data.password) {
            if (!data.password || data.password.length < 6) {
                errors.push('Password must be at least 6 characters long');
            }
        }

        if (!data.user_type || !['admin', 'owner', 'manager'].includes(data.user_type)) {
            errors.push('Valid user type is required');
        }

        // Username format validation
        if (data.username && !/^[a-zA-Z0-9_]+$/.test(data.username)) {
            errors.push('Username can only contain letters, numbers, and underscores');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Common field validations
    isValidMobile(mobile) {
        const cleanMobile = mobile.replace(/\D/g, '');
        return /^[6-9]\d{9}$/.test(cleanMobile);
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidGST(gst) {
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
    },

    isValidDate(date) {
        return date && !isNaN(Date.parse(date));
    },

    isValidAmount(amount) {
        return !isNaN(amount) && parseFloat(amount) >= 0;
    },

    isValidPercentage(percentage) {
        return !isNaN(percentage) && parseFloat(percentage) >= 0 && parseFloat(percentage) <= 100;
    },

    // Form validation helper
    validateForm(formElement, validationType, data = null) {
        const formData = data || new FormData(formElement);
        const dataObject = {};

        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            dataObject[key] = value;
        }

        let validation;
        switch (validationType) {
            case 'customer':
                validation = this.validateCustomer(dataObject);
                break;
            case 'inventory':
                validation = this.validateInventory(dataObject);
                break;
            case 'sale':
                validation = this.validateSale(dataObject);
                break;
            case 'service':
                validation = this.validateService(dataObject);
                break;
            case 'expense':
                validation = this.validateExpense(dataObject);
                break;
            case 'user':
                validation = this.validateUser(dataObject);
                break;
            default:
                validation = { isValid: true, errors: [] };
        }

        // Display errors in the form
        this.displayFormErrors(formElement, validation.errors);

        return validation;
    },

    // Display validation errors in form
    displayFormErrors(formElement, errors) {
        // Clear existing errors
        const existingErrors = formElement.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());

        const errorFields = formElement.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));

        // Display new errors
        if (errors.length > 0) {
            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-message';
            errorContainer.innerHTML = `
                <ul>
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;

            const submitButton = formElement.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.parentNode.insertBefore(errorContainer, submitButton);
            } else {
                formElement.appendChild(errorContainer);
            }
        }
    },

    // Real-time field validation
    setupFieldValidation(formElement, validationType) {
        const inputs = formElement.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateSingleField(input, validationType);
            });

            // Special handling for number inputs
            if (input.type === 'number' || input.classList.contains('amount-input')) {
                input.addEventListener('input', () => {
                    this.validateSingleField(input, validationType);
                });
            }
        });
    },

    // Validate single field
    validateSingleField(field, validationType) {
        const fieldName = field.name;
        const fieldValue = field.value;
        let isValid = true;
        let errorMessage = '';

        // Remove existing error styling
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Field-specific validation
        switch (fieldName) {
            case 'mobile_number':
            case 'customer_mobile':
                if (fieldValue && !this.isValidMobile(fieldValue)) {
                    isValid = false;
                    errorMessage = 'Invalid mobile number format';
                }
                break;

            case 'email':
                if (fieldValue && !this.isValidEmail(fieldValue)) {
                    isValid = false;
                    errorMessage = 'Invalid email format';
                }
                break;

            case 'amount':
            case 'total_amount':
            case 'advance_amount':
                if (fieldValue && !this.isValidAmount(fieldValue)) {
                    isValid = false;
                    errorMessage = 'Amount must be a valid number';
                }
                break;

            case 'discount_value':
                const discountType = field.form.querySelector('[name="discount_type"]')?.value;
                if (fieldValue && discountType === 'Percentage' && !this.isValidPercentage(fieldValue)) {
                    isValid = false;
                    errorMessage = 'Percentage must be between 0 and 100';
                }
                break;
        }

        // Display field error if invalid
        if (!isValid) {
            field.classList.add('error');
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.textContent = errorMessage;
            field.parentNode.appendChild(errorElement);
        }

        return isValid;
    },

    // Sanitize input data
    sanitizeData(data) {
        const sanitized = {};
        
        Object.keys(data).forEach(key => {
            let value = data[key];
            
            if (typeof value === 'string') {
                // Trim whitespace
                value = value.trim();
                
                // Remove potentially harmful characters for SQL injection prevention
                // Note: We're using parameterized queries, but this is an extra layer
                value = value.replace(/[<>]/g, '');
            }
            
            sanitized[key] = value;
        });
        
        return sanitized;
    },

    // Check for duplicate entries
    async checkDuplicate(tableName, field, value, excludeId = null) {
        try {
            let sql = `SELECT id FROM ${tableName} WHERE ${field} = ?`;
            let params = [value];

            if (excludeId) {
                sql += ` AND id != ?`;
                params.push(excludeId);
            }

            const result = await window.DB.get(sql, params);
            return !!result;
        } catch (error) {
            console.error('Error checking duplicate:', error);
            return false;
        }
    }
};