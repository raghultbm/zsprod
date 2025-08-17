// Validation rules and functions for ZEDSON Watchcraft
const Validators = {
    // Common validation functions
    required: (value, fieldName) => {
        if (!value || value.toString().trim() === '') {
            return `${fieldName} is required`;
        }
        return null;
    },

    minLength: (value, min, fieldName) => {
        if (value && value.length < min) {
            return `${fieldName} must be at least ${min} characters`;
        }
        return null;
    },

    maxLength: (value, max, fieldName) => {
        if (value && value.length > max) {
            return `${fieldName} must be no more than ${max} characters`;
        }
        return null;
    },

    pattern: (value, pattern, fieldName, message) => {
        if (value && !pattern.test(value)) {
            return message || `${fieldName} format is invalid`;
        }
        return null;
    },

    number: (value, fieldName) => {
        if (value && isNaN(Number(value))) {
            return `${fieldName} must be a valid number`;
        }
        return null;
    },

    positiveNumber: (value, fieldName) => {
        const numValue = Number(value);
        if (value && (isNaN(numValue) || numValue < 0)) {
            return `${fieldName} must be a positive number`;
        }
        return null;
    },

    email: (value, fieldName) => {
        if (value && !CONSTANTS.PATTERNS.EMAIL.test(value)) {
            return `${fieldName} must be a valid email address`;
        }
        return null;
    },

    mobile: (value, fieldName) => {
        if (value && !CONSTANTS.PATTERNS.MOBILE.test(value)) {
            return `${fieldName} must be a valid mobile number`;
        }
        return null;
    },

    // Entity-specific validation rules
    customer: {
        name: (value) => Validators.required(value, 'Customer Name') || 
               Validators.maxLength(value, 100, 'Customer Name'),
        
        mobile: (value) => Validators.required(value, 'Mobile Number') ||
                 Validators.mobile(value, 'Mobile Number'),
        
        customerId: (value) => {
            if (!value) return 'Customer ID is required';
            if (!/^\d{6}$/.test(value)) return 'Customer ID must be 6 digits';
            return null;
        }
    },

    inventory: {
        code: (value) => Validators.required(value, 'Code') ||
              Validators.maxLength(value, 50, 'Code'),
        
        category: (value) => Validators.required(value, 'Category'),
        
        amount: (value) => Validators.required(value, 'Amount') ||
                Validators.positiveNumber(value, 'Amount'),
        
        warrantyPeriod: (value) => Validators.number(value, 'Warranty Period'),
        
        location: (value) => Validators.required(value, 'Location')
    },

    sales: {
        customerId: (value) => Validators.required(value, 'Customer'),
        
        inventoryIds: (value) => {
            if (!value || (Array.isArray(value) && value.length === 0)) {
                return 'At least one item must be selected';
            }
            return null;
        },
        
        amount: (value) => Validators.required(value, 'Amount') ||
                Validators.positiveNumber(value, 'Amount'),
        
        paymentMode: (value) => Validators.required(value, 'Payment Mode'),
        
        discountValue: (value, discountType) => {
            if (value) {
                const numValue = Number(value);
                if (isNaN(numValue) || numValue < 0) {
                    return 'Discount value must be a positive number';
                }
                if (discountType === 'percentage' && numValue > 100) {
                    return 'Discount percentage cannot exceed 100%';
                }
            }
            return null;
        }
    },

    service: {
        customerId: (value) => Validators.required(value, 'Customer'),
        
        category: (value) => Validators.required(value, 'Category'),
        
        brand: (value) => Validators.required(value, 'Brand'),
        
        particulars: (value) => Validators.required(value, 'Particulars'),
        
        amount: (value) => Validators.required(value, 'Amount') ||
                Validators.positiveNumber(value, 'Amount'),
        
        paymentMode: (value) => Validators.required(value, 'Payment Mode'),
        
        warrantyPeriod: (value) => Validators.number(value, 'Warranty Period')
    },

    expense: {
        description: (value) => Validators.required(value, 'Description') ||
                     Validators.maxLength(value, 500, 'Description'),
        
        amount: (value) => Validators.required(value, 'Amount') ||
                Validators.positiveNumber(value, 'Amount'),
        
        paymentMode: (value) => Validators.required(value, 'Payment Mode')
    },

    user: {
        username: (value) => Validators.required(value, 'Username') ||
                  Validators.minLength(value, 3, 'Username') ||
                  Validators.maxLength(value, 50, 'Username'),
        
        password: (value) => Validators.required(value, 'Password') ||
                  Validators.minLength(value, 6, 'Password'),
        
        userType: (value) => {
            if (!value) return 'User Type is required';
            if (!['admin', 'owner', 'manager'].includes(value)) {
                return 'Invalid user type';
            }
            return null;
        }
    },

    // Generic form validation function
    validateForm: (data, rules) => {
        const errors = {};
        
        for (const field in rules) {
            const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
            
            for (const rule of fieldRules) {
                const error = rule(data[field], data);
                if (error) {
                    errors[field] = error;
                    break; // Stop at first error for this field
                }
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    // Validate specific entity
    validateCustomer: (data) => {
        return Validators.validateForm(data, {
            name: Validators.customer.name,
            mobile: Validators.customer.mobile,
            customerId: Validators.customer.customerId
        });
    },

    validateInventory: (data) => {
        return Validators.validateForm(data, {
            code: Validators.inventory.code,
            category: Validators.inventory.category,
            amount: Validators.inventory.amount,
            warrantyPeriod: Validators.inventory.warrantyPeriod,
            location: Validators.inventory.location
        });
    },

    validateSale: (data) => {
        return Validators.validateForm(data, {
            customerId: Validators.sales.customerId,
            inventoryIds: Validators.sales.inventoryIds,
            amount: Validators.sales.amount,
            paymentMode: Validators.sales.paymentMode,
            discountValue: (value) => Validators.sales.discountValue(value, data.discountType)
        });
    },

    validateService: (data) => {
        return Validators.validateForm(data, {
            customerId: Validators.service.customerId,
            category: Validators.service.category,
            brand: Validators.service.brand,
            particulars: Validators.service.particulars,
            amount: Validators.service.amount,
            paymentMode: Validators.service.paymentMode,
            warrantyPeriod: Validators.service.warrantyPeriod
        });
    },

    validateExpense: (data) => {
        return Validators.validateForm(data, {
            description: Validators.expense.description,
            amount: Validators.expense.amount,
            paymentMode: Validators.expense.paymentMode
        });
    },

    validateUser: (data) => {
        return Validators.validateForm(data, {
            username: Validators.user.username,
            password: Validators.user.password,
            userType: Validators.user.userType
        });
    }
};

// Make validators globally available
if (typeof window !== 'undefined') {
    window.Validators = Validators;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
}