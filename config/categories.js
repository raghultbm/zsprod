// Category configurations for ZEDSON Watchcraft inventory system
window.Categories = {
    // Main inventory categories
    INVENTORY_CATEGORIES: [
        'Watch',
        'WallClocks',
        'Timepieces',
        'Strap',
        'Spring Bar',
        'Loop',
        'Buckle'
    ],

    // Category specific fields configuration
    CATEGORY_FIELDS: {
        Watch: {
            required: ['brand', 'gender', 'type', 'strap'],
            fields: {
                brand: {
                    type: 'autocomplete',
                    label: 'Brand',
                    placeholder: 'Enter or select brand',
                    source: 'brands'
                },
                gender: {
                    type: 'select',
                    label: 'Gender',
                    options: ['Gents', 'Ladies']
                },
                type: {
                    type: 'select',
                    label: 'Type',
                    options: ['Analog', 'Digital']
                },
                strap: {
                    type: 'select',
                    label: 'Strap',
                    options: ['Leather', 'Chain', 'Fiber']
                }
            }
        },

        WallClocks: {
            required: ['brand', 'type'],
            fields: {
                brand: {
                    type: 'autocomplete',
                    label: 'Brand',
                    placeholder: 'Enter or select brand',
                    source: 'brands'
                },
                type: {
                    type: 'select',
                    label: 'Type',
                    options: ['Analog', 'Digital']
                }
            }
        },

        Timepieces: {
            required: ['brand', 'type'],
            fields: {
                brand: {
                    type: 'autocomplete',
                    label: 'Brand',
                    placeholder: 'Enter or select brand',
                    source: 'brands'
                },
                type: {
                    type: 'select',
                    label: 'Type',
                    options: ['Analog', 'Digital']
                }
            }
        },

        Strap: {
            required: ['brand', 'material', 'size'],
            fields: {
                brand: {
                    type: 'autocomplete',
                    label: 'Brand',
                    placeholder: 'Enter or select brand',
                    source: 'brands'
                },
                material: {
                    type: 'select',
                    label: 'Material',
                    options: ['Leather', 'Chain', 'Fiber']
                },
                size: {
                    type: 'select',
                    label: 'Size',
                    options: (() => {
                        const sizes = [];
                        for (let i = 8; i <= 28; i += 2) {
                            sizes.push(`${i}MM`);
                        }
                        return sizes;
                    })()
                }
            }
        },

        'Spring Bar': {
            required: ['size'],
            fields: {
                size: {
                    type: 'select',
                    label: 'Size',
                    options: (() => {
                        const sizes = [];
                        for (let i = 8; i <= 28; i += 2) {
                            sizes.push(`${i}MM`);
                        }
                        return sizes;
                    })()
                }
            }
        },

        Loop: {
            required: ['size', 'material'],
            fields: {
                size: {
                    type: 'select',
                    label: 'Size',
                    options: (() => {
                        const sizes = [];
                        for (let i = 8; i <= 28; i += 2) {
                            sizes.push(`${i}MM`);
                        }
                        return sizes;
                    })()
                },
                material: {
                    type: 'select',
                    label: 'Material',
                    options: ['Leather', 'Fiber']
                }
            }
        },

        Buckle: {
            required: ['size'],
            fields: {
                size: {
                    type: 'select',
                    label: 'Size',
                    options: (() => {
                        const sizes = [];
                        for (let i = 8; i <= 28; i += 2) {
                            sizes.push(`${i}MM`);
                        }
                        return sizes;
                    })()
                }
            }
        }
    },

    // Method to get fields for a specific category
    getFieldsForCategory(category) {
        return this.CATEGORY_FIELDS[category] || { required: [], fields: {} };
    },

    // Method to generate particulars string
    generateParticulars(category, values) {
        const config = this.CATEGORY_FIELDS[category];
        if (!config) return '';

        const parts = [];
        
        Object.keys(config.fields).forEach(fieldKey => {
            if (values[fieldKey]) {
                const field = config.fields[fieldKey];
                parts.push(`${field.label}: ${values[fieldKey]}`);
            }
        });

        return parts.join(', ');
    },

    // Method to validate category data
    validateCategoryData(category, data) {
        const config = this.CATEGORY_FIELDS[category];
        if (!config) return { isValid: false, errors: ['Invalid category'] };

        const errors = [];
        
        config.required.forEach(fieldKey => {
            if (!data[fieldKey] || data[fieldKey].trim() === '') {
                const field = config.fields[fieldKey];
                errors.push(`${field.label} is required`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Method to get all brands for autocomplete
    async getBrands(category = null) {
        try {
            let sql = 'SELECT DISTINCT name FROM brands WHERE is_active = 1';
            let params = [];

            if (category) {
                sql += ' AND (category = ? OR category IS NULL)';
                params.push(category);
            }

            sql += ' ORDER BY name';

            const brands = await window.DB.all(sql, params);
            return brands.map(brand => brand.name);
        } catch (error) {
            console.error('Error fetching brands:', error);
            return [];
        }
    },

    // Method to add/update brand
    async addBrand(name, category = null) {
        try {
            const existing = await window.DB.get(
                'SELECT id FROM brands WHERE name = ?', 
                [name]
            );

            if (existing) {
                return existing.id;
            }

            const result = await window.DB.run(
                'INSERT INTO brands (name, category, created_by) VALUES (?, ?, ?)',
                [name, category, window.Auth?.getCurrentUser()?.username || 'system']
            );

            return result.id;
        } catch (error) {
            console.error('Error adding brand:', error);
            return null;
        }
    },

    // Method to build dynamic form HTML
    buildCategoryForm(category, values = {}) {
        const config = this.getFieldsForCategory(category);
        if (!config.fields || Object.keys(config.fields).length === 0) {
            return '<p class="no-fields">No additional fields required for this category.</p>';
        }

        let html = '<div class="category-fields">';

        Object.entries(config.fields).forEach(([fieldKey, field]) => {
            const isRequired = config.required.includes(fieldKey);
            const value = values[fieldKey] || '';

            html += `<div class="form-group">`;
            html += `<label for="${fieldKey}">${field.label}${isRequired ? ' *' : ''}</label>`;

            switch (field.type) {
                case 'select':
                    html += `<select id="${fieldKey}" name="${fieldKey}" ${isRequired ? 'required' : ''}>`;
                    html += `<option value="">Select ${field.label}</option>`;
                    field.options.forEach(option => {
                        const selected = value === option ? 'selected' : '';
                        html += `<option value="${option}" ${selected}>${option}</option>`;
                    });
                    html += `</select>`;
                    break;

                case 'autocomplete':
                    html += `<input type="text" id="${fieldKey}" name="${fieldKey}" 
                             placeholder="${field.placeholder}" value="${value}" 
                             ${isRequired ? 'required' : ''} 
                             data-autocomplete="${field.source}">`;
                    html += `<div id="${fieldKey}-suggestions" class="autocomplete-suggestions"></div>`;
                    break;

                default:
                    html += `<input type="text" id="${fieldKey}" name="${fieldKey}" 
                             placeholder="${field.placeholder || field.label}" value="${value}" 
                             ${isRequired ? 'required' : ''}>`;
            }

            html += `</div>`;
        });

        html += '</div>';
        return html;
    },

    // Method to extract category data from form
    extractCategoryData(category, formElement) {
        const config = this.getFieldsForCategory(category);
        const data = {};

        Object.keys(config.fields).forEach(fieldKey => {
            const element = formElement.querySelector(`[name="${fieldKey}"]`);
            if (element) {
                data[fieldKey] = element.value.trim();
            }
        });

        return data;
    },

    // Method to setup autocomplete functionality
    setupAutocomplete(fieldId, source) {
        const input = document.getElementById(fieldId);
        const suggestions = document.getElementById(`${fieldId}-suggestions`);

        if (!input || !suggestions) return;

        input.addEventListener('input', async (e) => {
            const value = e.target.value.trim();
            
            if (value.length < 2) {
                suggestions.innerHTML = '';
                suggestions.style.display = 'none';
                return;
            }

            let items = [];
            
            if (source === 'brands') {
                items = await this.getBrands();
                items = items.filter(item => 
                    item.toLowerCase().includes(value.toLowerCase())
                );
            }

            if (items.length > 0) {
                suggestions.innerHTML = items.slice(0, 10).map(item => 
                    `<div class="suggestion-item" data-value="${item}">${item}</div>`
                ).join('');
                suggestions.style.display = 'block';
            } else {
                suggestions.innerHTML = '';
                suggestions.style.display = 'none';
            }
        });

        // Handle suggestion clicks
        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                input.value = e.target.dataset.value;
                suggestions.innerHTML = '';
                suggestions.style.display = 'none';
                input.dispatchEvent(new Event('change'));
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
    },

    // Service categories (subset of inventory categories)
    SERVICE_CATEGORIES: [
        'Watch',
        'WallClock',
        'Timepiece',
        'Strap',
        'Spring Bar',
        'Loop',
        'Buckle'
    ],

    // Battery types for instant service
    BATTERY_TYPES: [
        'AG1', 'AG2', 'AG3', 'AG4', 'AG5', 'AG6', 'AG7', 'AG8', 'AG9', 'AG10',
        'AG11', 'AG12', 'AG13', 'LR44', 'LR41', 'LR43', 'CR2032', 'CR2025', 'CR2016'
    ],

    // Method to get category code for invoice generation
    getCategoryCode(category) {
        const codes = {
            'Watch': 'W',
            'WallClocks': 'C',
            'WallClock': 'C',
            'Timepieces': 'T',
            'Timepiece': 'T',
            'Strap': 'S',
            'Spring Bar': 'B',
            'Loop': 'L',
            'Buckle': 'K'
        };
        return codes[category] || 'X';
    },

    // Method to get display name for category
    getDisplayName(category) {
        const displayNames = {
            'WallClocks': 'Wall Clocks',
            'Spring Bar': 'Spring Bar'
        };
        return displayNames[category] || category;
    },

    // Method to initialize category dropdowns
    initializeCategoryDropdowns() {
        // Initialize inventory category dropdown
        const inventorySelect = document.getElementById('inventory-category');
        if (inventorySelect) {
            inventorySelect.innerHTML = '<option value="">Select Category</option>' +
                this.INVENTORY_CATEGORIES.map(cat => 
                    `<option value="${cat}">${this.getDisplayName(cat)}</option>`
                ).join('');
        }

        // Initialize service category dropdown
        const serviceSelect = document.getElementById('service-category');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Select Category</option>' +
                this.SERVICE_CATEGORIES.map(cat => 
                    `<option value="${cat}">${this.getDisplayName(cat)}</option>`
                ).join('');
        }
    }
};