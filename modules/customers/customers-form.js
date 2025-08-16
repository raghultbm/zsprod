// Customer Form Handler for ZEDSON Watchcraft
class CustomersForm {
    constructor() {
        this.isEditing = false;
        this.currentCustomerId = null;
        this.onSaveCallback = null;
        this.db = new CustomersDB();
    }

    show(customerId = null, onSaveCallback = null) {
        this.isEditing = !!customerId;
        this.currentCustomerId = customerId;
        this.onSaveCallback = onSaveCallback;

        this.createModal();
        
        if (this.isEditing) {
            this.loadCustomerData();
        }
    }

    createModal() {
        const modalContent = `
            <div class="modal-header">
                <h3>${this.isEditing ? 'Edit Customer' : 'Add New Customer'}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="customer-form" class="form">
                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="customer_id">Customer ID *</label>
                                <input type="text" id="customer_id" name="customer_id" 
                                       maxlength="6" placeholder="6-digit Customer ID" required>
                                <small class="form-help">Leave empty to auto-generate</small>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="name">Customer Name *</label>
                                <input type="text" id="name" name="name" 
                                       placeholder="Enter customer name" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="mobile_number">Mobile Number *</label>
                                <input type="text" id="mobile_number" name="mobile_number" 
                                       maxlength="10" placeholder="10-digit mobile number" required>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="email">Email Address</label>
                                <input type="email" id="email" name="email" 
                                       placeholder="customer@example.com">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="address">Address</label>
                        <textarea id="address" name="address" rows="3" 
                                  placeholder="Enter customer address"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="creation_date">Creation Date *</label>
                                <input type="date" id="creation_date" name="creation_date" required>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="net_value_display">Net Value</label>
                                <input type="text" id="net_value_display" 
                                       value="₹0.00" readonly 
                                       style="background: #f8f9fa;">
                                <small class="form-help">Calculated from sales and services</small>
                            </div>
                        </div>
                    </div>

                    <!-- Error Messages Container -->
                    <div id="form-errors" class="error-message hidden"></div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button type="submit" form="customer-form" class="btn btn-primary" id="save-customer-btn">
                    <i class="fas fa-save"></i> ${this.isEditing ? 'Update Customer' : 'Save Customer'}
                </button>
            </div>
        `;

        const modal = window.Utils.createModal('', modalContent);
        
        // Set default date to today
        document.getElementById('creation_date').value = window.Utils.getCurrentDate();

        this.setupFormEventListeners();
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('name').focus();
        }, 100);
    }

    setupFormEventListeners() {
        const form = document.getElementById('customer-form');
        
        // Form submission
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        window.Validators.setupFieldValidation(form, 'customer');

        // Auto-generate customer ID if empty
        const customerIdInput = document.getElementById('customer_id');
        customerIdInput.addEventListener('blur', async () => {
            if (!customerIdInput.value && !this.isEditing) {
                customerIdInput.value = await this.generateCustomerId();
            }
        });

        // Mobile number formatting
        const mobileInput = document.getElementById('mobile_number');
        mobileInput.addEventListener('input', (e) => {
            // Remove non-numeric characters
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });

        // Customer ID formatting
        customerIdInput.addEventListener('input', (e) => {
            // Remove non-numeric characters and limit to 6 digits
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });

        // Name capitalization
        const nameInput = document.getElementById('name');
        nameInput.addEventListener('blur', (e) => {
            e.target.value = this.capitalizeWords(e.target.value);
        });

        // Check for duplicate customer ID
        customerIdInput.addEventListener('change', async () => {
            await this.checkDuplicateCustomerId();
        });

        // Check for duplicate mobile number
        mobileInput.addEventListener('change', async () => {
            await this.checkDuplicateMobile();
        });
    }

    async generateCustomerId() {
        try {
            let customerId;
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 10) {
                customerId = window.Utils.generateCustomerId();
                const exists = await this.db.customerExists('customer_id', customerId);
                isUnique = !exists;
                attempts++;
            }

            return isUnique ? customerId : '';
        } catch (error) {
            console.error('Error generating customer ID:', error);
            return '';
        }
    }

    async checkDuplicateCustomerId() {
        const customerIdInput = document.getElementById('customer_id');
        const customerId = customerIdInput.value;

        if (!customerId || customerId.length !== 6) return;

        try {
            const exists = await this.db.customerExists('customer_id', customerId, this.currentCustomerId);
            
            if (exists) {
                this.showFieldError(customerIdInput, 'Customer ID already exists');
                return false;
            } else {
                this.clearFieldError(customerIdInput);
                return true;
            }
        } catch (error) {
            console.error('Error checking duplicate customer ID:', error);
            return false;
        }
    }

    async checkDuplicateMobile() {
        const mobileInput = document.getElementById('mobile_number');
        const mobile = mobileInput.value;

        if (!mobile || mobile.length !== 10) return;

        try {
            const exists = await this.db.customerExists('mobile_number', mobile, this.currentCustomerId);
            
            if (exists) {
                this.showFieldError(mobileInput, 'Mobile number already registered');
                return false;
            } else {
                this.clearFieldError(mobileInput);
                return true;
            }
        } catch (error) {
            console.error('Error checking duplicate mobile:', error);
            return false;
        }
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    capitalizeWords(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    async loadCustomerData() {
        try {
            window.Utils.showLoader();
            
            const customer = await this.db.getCustomerById(this.currentCustomerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Populate form fields
            document.getElementById('customer_id').value = customer.customer_id;
            document.getElementById('name').value = customer.name;
            document.getElementById('mobile_number').value = customer.mobile_number;
            document.getElementById('email').value = customer.email || '';
            document.getElementById('address').value = customer.address || '';
            document.getElementById('creation_date').value = customer.creation_date;
            document.getElementById('net_value_display').value = window.Utils.formatCurrency(customer.net_value);

            // Disable customer ID editing for existing customers
            document.getElementById('customer_id').readOnly = true;
            
        } catch (error) {
            console.error('Error loading customer data:', error);
            window.Utils.showToast('Failed to load customer data', 'error');
            this.closeModal();
        } finally {
            window.Utils.hideLoader();
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        // Validate form
        const validation = window.Validators.validateForm(form, 'customer');
        if (!validation.isValid) {
            return;
        }

        // Additional checks for duplicates
        const customerIdValid = await this.checkDuplicateCustomerId();
        const mobileValid = await this.checkDuplicateMobile();
        
        if (!customerIdValid || !mobileValid) {
            return;
        }

        try {
            window.Utils.showLoader();
            
            const customerData = {
                customer_id: formData.get('customer_id'),
                name: formData.get('name').trim(),
                mobile_number: formData.get('mobile_number'),
                email: formData.get('email') || null,
                address: formData.get('address') || null,
                creation_date: formData.get('creation_date'),
                net_value: this.isEditing ? undefined : 0 // Don't update net_value on edit
            };

            let result;
            if (this.isEditing) {
                result = await this.db.updateCustomer(this.currentCustomerId, customerData);
            } else {
                result = await this.db.createCustomer(customerData);
            }

            if (result.success) {
                window.Utils.showToast(
                    `Customer ${this.isEditing ? 'updated' : 'created'} successfully`, 
                    'success'
                );
                
                this.closeModal();
                
                if (this.onSaveCallback) {
                    this.onSaveCallback();
                }
            } else {
                throw new Error(result.error || 'Operation failed');
            }
            
        } catch (error) {
            console.error('Error saving customer:', error);
            window.Utils.showToast(
                `Failed to ${this.isEditing ? 'update' : 'create'} customer`, 
                'error'
            );
            
            // Show specific error message if available
            this.showFormError(error.message);
        } finally {
            window.Utils.hideLoader();
        }
    }

    showFormError(message) {
        const errorContainer = document.getElementById('form-errors');
        errorContainer.innerHTML = `<ul><li>${message}</li></ul>`;
        errorContainer.classList.remove('hidden');
    }

    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    }

    // Public method to validate customer data
    validateCustomerData(data) {
        const errors = [];

        // Required fields validation
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Customer name must be at least 2 characters');
        }

        if (!data.mobile_number || !window.Validators.isValidMobile(data.mobile_number)) {
            errors.push('Valid 10-digit mobile number is required');
        }

        if (!data.customer_id || data.customer_id.length !== 6) {
            errors.push('Customer ID must be exactly 6 digits');
        }

        if (!data.creation_date || !window.Validators.isValidDate(data.creation_date)) {
            errors.push('Valid creation date is required');
        }

        // Optional fields validation
        if (data.email && !window.Validators.isValidEmail(data.email)) {
            errors.push('Valid email address is required');
        }

        // Business rules validation
        const creationDate = new Date(data.creation_date);
        const today = new Date();
        if (creationDate > today) {
            errors.push('Creation date cannot be in the future');
        }

        // Mobile number format check (should start with 6-9)
        if (data.mobile_number && !/^[6-9]/.test(data.mobile_number)) {
            errors.push('Mobile number should start with 6, 7, 8, or 9');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Method to get customer data from form
    getFormData() {
        const form = document.getElementById('customer-form');
        if (!form) return null;

        const formData = new FormData(form);
        return {
            customer_id: formData.get('customer_id'),
            name: formData.get('name').trim(),
            mobile_number: formData.get('mobile_number'),
            email: formData.get('email') || null,
            address: formData.get('address') || null,
            creation_date: formData.get('creation_date')
        };
    }

    // Method to prefill form with data (for integration with other modules)
    prefillForm(customerData) {
        if (customerData.customer_id) {
            document.getElementById('customer_id').value = customerData.customer_id;
        }
        if (customerData.name) {
            document.getElementById('name').value = customerData.name;
        }
        if (customerData.mobile_number) {
            document.getElementById('mobile_number').value = customerData.mobile_number;
        }
        if (customerData.email) {
            document.getElementById('email').value = customerData.email;
        }
        if (customerData.address) {
            document.getElementById('address').value = customerData.address;
        }
    }

    // Static method to show customer selection modal (for use in other modules)
    static showCustomerSelector(onSelectCallback) {
        const modalContent = `
            <div class="modal-header">
                <h3>Select Customer</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Search Customer</label>
                    <input type="text" id="customer-search-selector" 
                           placeholder="Search by name, mobile, or customer ID..." 
                           class="form-control">
                </div>
                
                <div id="customer-search-results" class="customer-selector-results">
                    <!-- Search results will appear here -->
                </div>
                
                <div class="form-group" style="margin-top: 20px;">
                    <button type="button" class="btn btn-primary" id="add-new-customer-selector">
                        <i class="fas fa-plus"></i> Add New Customer
                    </button>
                </div>
            </div>
        `;

        const modal = window.Utils.createModal('', modalContent);
        
        // Setup search functionality
        const searchInput = document.getElementById('customer-search-selector');
        const resultsContainer = document.getElementById('customer-search-results');
        
        const searchCustomers = window.Utils.debounce(async (searchTerm) => {
            if (searchTerm.length < 2) {
                resultsContainer.innerHTML = '<p class="text-muted">Type at least 2 characters to search...</p>';
                return;
            }
            
            try {
                const db = new CustomersDB();
                const customers = await db.searchCustomers(searchTerm);
                
                if (customers.length === 0) {
                    resultsContainer.innerHTML = '<p class="text-muted">No customers found</p>';
                    return;
                }
                
                resultsContainer.innerHTML = customers.map(customer => `
                    <div class="customer-selector-item" data-customer-id="${customer.customer_id}">
                        <div class="customer-info">
                            <strong>${customer.name}</strong>
                            <span class="customer-id">${customer.customer_id}</span>
                        </div>
                        <div class="customer-contact">
                            <span>${customer.mobile_number}</span>
                            ${customer.email ? `<span>${customer.email}</span>` : ''}
                        </div>
                        <div class="customer-value">
                            Net Value: ${window.Utils.formatCurrency(customer.net_value)}
                        </div>
                    </div>
                `).join('');
                
                // Add click listeners to customer items
                resultsContainer.querySelectorAll('.customer-selector-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const customerId = item.dataset.customerId;
                        const customer = customers.find(c => c.customer_id === customerId);
                        onSelectCallback(customer);
                        modal.remove();
                    });
                });
                
            } catch (error) {
                console.error('Error searching customers:', error);
                resultsContainer.innerHTML = '<p class="text-danger">Error searching customers</p>';
            }
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            searchCustomers(e.target.value);
        });
        
        // Add new customer button
        document.getElementById('add-new-customer-selector').addEventListener('click', () => {
            modal.remove();
            const form = new CustomersForm();
            form.show(null, (newCustomer) => {
                onSelectCallback(newCustomer);
            });
        });
        
        // Focus on search input
        setTimeout(() => {
            searchInput.focus();
        }, 100);
    }
}

// Make form class globally available
window.CustomersForm = CustomersForm;