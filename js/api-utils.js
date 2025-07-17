// ================================
// COMPLETE API UTILS - js/api-utils.js (REPLACE EXISTING)
// ================================

/**
 * Complete API Integration Layer for ZEDSON WATCHCRAFT
 */

// Base API configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Token management
const API = {
  setToken(token) {
    localStorage.setItem('zedson_auth_token', token);
  },
  
  getToken() {
    return localStorage.getItem('zedson_auth_token');
  },
  
  removeToken() {
    localStorage.removeItem('zedson_auth_token');
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.removeToken();
          if (window.location.pathname !== '/') {
            window.location.reload();
          }
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// API Helper functions
const APIHelpers = {
  isAuthenticated() {
    return !!API.getToken();
  },

  async checkServerHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  }
};

// Authentication API
const AuthAPI = {
  async login(username, password) {
    const response = await API.post('/auth/login', { username, password });
    if (response.success && response.token) {
      API.setToken(response.token);
    }
    return response;
  },

  async setFirstTimePassword(username, newPassword, confirmPassword) {
    const response = await API.post('/auth/first-login', { 
      username, newPassword, confirmPassword 
    });
    if (response.success && response.token) {
      API.setToken(response.token);
    }
    return response;
  },

  async logout() {
    try {
      await API.post('/auth/logout');
    } finally {
      API.removeToken();
    }
  },

  async getCurrentUser() {
    return await API.get('/auth/me');
  },

  async getUsers() {
    return await API.get('/auth/users');
  },

  async createUser(userData) {
    return await API.post('/auth/users', userData);
  },

  async updateUser(userId, userData) {
    return await API.put(`/auth/users/${userId}`, userData);
  },

  async deleteUser(userId) {
    return await API.delete(`/auth/users/${userId}`);
  },

  async resetUserPassword(userId) {
    return await API.post(`/auth/users/${userId}/reset-password`);
  }
};

// Customer API
const CustomerAPI = {
  async getCustomers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/customers?${queryString}` : '/customers';
    return await API.get(endpoint);
  },

  async getCustomerStats() {
    return await API.get('/customers/stats');
  },

  async getCustomer(customerId) {
    return await API.get(`/customers/${customerId}`);
  },

  async createCustomer(customerData) {
    return await API.post('/customers', customerData);
  },

  async updateCustomer(customerId, customerData) {
    return await API.put(`/customers/${customerId}`, customerData);
  },

  async deleteCustomer(customerId) {
    return await API.delete(`/customers/${customerId}`);
  },

  async updateCustomerStatus(customerId, status) {
    return await API.patch(`/customers/${customerId}/status`, { status });
  },

  async addCustomerNote(customerId, note) {
    return await API.post(`/customers/${customerId}/notes`, { note });
  },

  async incrementPurchases(customerId) {
    return await API.patch(`/customers/${customerId}/increment-purchases`);
  },

  async incrementServices(customerId) {
    return await API.patch(`/customers/${customerId}/increment-services`);
  },

  async updateNetValue(customerId, salesValue, serviceValue) {
    return await API.patch(`/customers/${customerId}/update-net-value`, { 
      salesValue, serviceValue 
    });
  }
};

// Inventory API
const InventoryAPI = {
  async getInventory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/inventory?${queryString}` : '/inventory';
    return await API.get(endpoint);
  },

  async getInventoryStats() {
    return await API.get('/inventory/stats');
  },

  async getAvailableItems() {
    return await API.get('/inventory/available');
  },

  async getInventoryItem(itemId) {
    return await API.get(`/inventory/${itemId}`);
  },

  async createInventoryItem(itemData) {
    return await API.post('/inventory', itemData);
  },

  async updateInventoryItem(itemId, itemData) {
    return await API.put(`/inventory/${itemId}`, itemData);
  },

  async deleteInventoryItem(itemId) {
    return await API.delete(`/inventory/${itemId}`);
  },

  async updateQuantity(itemId, quantity, operation = 'set') {
    return await API.patch(`/inventory/${itemId}/quantity`, { quantity, operation });
  }
};

// Sales API
const SalesAPI = {
  async getSales(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/sales?${queryString}` : '/sales';
    return await API.get(endpoint);
  },

  async getSalesStats() {
    return await API.get('/sales/stats');
  },

  async getSale(saleId) {
    return await API.get(`/sales/${saleId}`);
  },

  async createSale(saleData) {
    return await API.post('/sales', saleData);
  },

  async updateSale(saleId, saleData) {
    return await API.put(`/sales/${saleId}`, saleData);
  },

  async deleteSale(saleId) {
    return await API.delete(`/sales/${saleId}`);
  }
};

// Service API
const ServiceAPI = {
  async getServices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/services?${queryString}` : '/services';
    return await API.get(endpoint);
  },

  async getServiceStats() {
    return await API.get('/services/stats');
  },

  async getService(serviceId) {
    return await API.get(`/services/${serviceId}`);
  },

  async createService(serviceData) {
    return await API.post('/services', serviceData);
  },

  async updateService(serviceId, serviceData) {
    return await API.put(`/services/${serviceId}`, serviceData);
  },

  async updateServiceStatus(serviceId, status, completionData = null) {
    return await API.patch(`/services/${serviceId}/status`, { status, completionData });
  },

  async deleteService(serviceId) {
    return await API.delete(`/services/${serviceId}`);
  }
};

// Expense API
const ExpenseAPI = {
  async getExpenses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/expenses?${queryString}` : '/expenses';
    return await API.get(endpoint);
  },

  async getExpenseStats() {
    return await API.get('/expenses/stats');
  },

  async getExpense(expenseId) {
    return await API.get(`/expenses/${expenseId}`);
  },

  async createExpense(expenseData) {
    return await API.post('/expenses', expenseData);
  },

  async updateExpense(expenseId, expenseData) {
    return await API.put(`/expenses/${expenseId}`, expenseData);
  },

  async deleteExpense(expenseId) {
    return await API.delete(`/expenses/${expenseId}`);
  }
};

// Invoice API
const InvoiceAPI = {
  async getInvoices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/invoices?${queryString}` : '/invoices';
    return await API.get(endpoint);
  },

  async getInvoiceStats() {
    return await API.get('/invoices/stats');
  },

  async getInvoice(invoiceId) {
    return await API.get(`/invoices/${invoiceId}`);
  },

  async generateSalesInvoice(saleId) {
    return await API.post('/invoices/generate-sales', { saleId });
  },

  async generateServiceInvoice(serviceId, type) {
    return await API.post('/invoices/generate-service', { serviceId, type });
  },

  async getInvoicesByTransaction(relatedId, relatedType) {
    return await API.get(`/invoices/by-transaction/${relatedId}/${relatedType}`);
  },

  async updateInvoiceStatus(invoiceId, status) {
    return await API.patch(`/invoices/${invoiceId}/status`, { status });
  },

  async deleteInvoice(invoiceId) {
    return await API.delete(`/invoices/${invoiceId}`);
  }
};

// Export all APIs for global use
window.API = API;
window.APIHelpers = APIHelpers;
window.AuthAPI = AuthAPI;
window.CustomerAPI = CustomerAPI;
window.InventoryAPI = InventoryAPI;
window.SalesAPI = SalesAPI;
window.ServiceAPI = ServiceAPI;
window.ExpenseAPI = ExpenseAPI;
window.InvoiceAPI = InvoiceAPI;