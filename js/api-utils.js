// ZEDSON WATCHCRAFT - API Utilities with Inventory API Integration

/**
 * API configuration and utility functions (Updated with Inventory API)
 */

const API_BASE_URL = 'http://localhost:5000/api';

class APIUtils {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('zedson_token');
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('zedson_token', token);
    } else {
      localStorage.removeItem('zedson_token');
    }
  }

  /**
   * Get authentication token
   */
  getToken() {
    return this.token || localStorage.getItem('zedson_token');
  }

  /**
   * Remove authentication token
   */
  removeToken() {
    this.token = null;
    localStorage.removeItem('zedson_token');
  }

  /**
   * Get default headers for API requests
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        // Unauthorized - remove token and redirect to login
        this.removeToken();
        window.location.reload();
        throw new Error('Session expired. Please login again.');
      }
      
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.auth !== false),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

// Create global API instance
const api = new APIUtils();

// Authentication API methods (existing)
const AuthAPI = {
  async login(username, password) {
    try {
      const response = await api.post('/auth/login', { username, password }, { auth: false });
      
      if (response.success) {
        if (response.firstLogin) {
          return {
            success: true,
            firstLogin: true,
            user: response.user
          };
        } else {
          api.setToken(response.token);
          return {
            success: true,
            firstLogin: false,
            user: response.user,
            token: response.token
          };
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  async setFirstTimePassword(username, newPassword, confirmPassword) {
    try {
      const response = await api.post('/auth/first-login', {
        username,
        newPassword,
        confirmPassword
      }, { auth: false });
      
      if (response.success && response.token) {
        api.setToken(response.token);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.success ? response.user : null;
    } catch (error) {
      throw error;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
      api.removeToken();
      return { success: true };
    } catch (error) {
      api.removeToken();
      throw error;
    }
  },

  async getUsers() {
    try {
      const response = await api.get('/auth/users');
      return response;
    } catch (error) {
      throw error;
    }
  },

  async createUser(userData) {
    try {
      const response = await api.post('/auth/users', userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/auth/users/${userId}`, userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/auth/users/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async resetUserPassword(userId) {
    try {
      const response = await api.post(`/auth/users/${userId}/reset-password`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async initializeAdmin() {
    try {
      const response = await api.post('/auth/init', {}, { auth: false });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Customer API methods (existing)
const CustomerAPI = {
  async getCustomers(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/customers?${queryString}` : '/customers';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getCustomerStats() {
    try {
      const response = await api.get('/customers/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getCustomer(customerId) {
    try {
      const response = await api.get(`/customers/${customerId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async createCustomer(customerData) {
    try {
      const response = await api.post('/customers', customerData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async updateCustomer(customerId, customerData) {
    try {
      const response = await api.put(`/customers/${customerId}`, customerData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async deleteCustomer(customerId) {
    try {
      const response = await api.delete(`/customers/${customerId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async updateCustomerStatus(customerId, status) {
    try {
      const response = await api.patch(`/customers/${customerId}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  async addCustomerNote(customerId, note) {
    try {
      const response = await api.post(`/customers/${customerId}/notes`, { note });
      return response;
    } catch (error) {
      throw error;
    }
  },

  async incrementPurchases(customerId) {
    try {
      const response = await api.patch(`/customers/${customerId}/increment-purchases`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async incrementServices(customerId) {
    try {
      const response = await api.patch(`/customers/${customerId}/increment-services`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async updateNetValue(customerId, salesValue, serviceValue) {
    try {
      const response = await api.patch(`/customers/${customerId}/update-net-value`, {
        salesValue,
        serviceValue
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// NEW: Inventory API methods
const InventoryAPI = {
  /**
   * Get all inventory items
   */
  async getInventory(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/inventory?${queryString}` : '/inventory';
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get inventory statistics
   */
  async getInventoryStats() {
    try {
      const response = await api.get('/inventory/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get available items for sales
   */
  async getAvailableItems(outlet = null) {
    try {
      const params = outlet ? `?outlet=${outlet}` : '';
      const response = await api.get(`/inventory/available${params}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts() {
    try {
      const response = await api.get('/inventory/low-stock');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Search inventory items
   */
  async searchInventory(searchTerm, filters = {}) {
    try {
      const params = new URLSearchParams({ q: searchTerm, ...filters });
      const response = await api.get(`/inventory/search?${params}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single inventory item
   */
  async getInventoryItem(itemId) {
    try {
      const response = await api.get(`/inventory/${itemId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new inventory item
   */
  async createInventoryItem(itemData) {
    try {
      const response = await api.post('/inventory', itemData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update inventory item
   */
  async updateInventoryItem(itemId, itemData) {
    try {
      const response = await api.put(`/inventory/${itemId}`, itemData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete inventory item
   */
  async deleteInventoryItem(itemId) {
    try {
      const response = await api.delete(`/inventory/${itemId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Decrease item quantity (for sales)
   */
  async decreaseQuantity(itemId, amount = 1) {
    try {
      const response = await api.patch(`/inventory/${itemId}/decrease-quantity`, { amount });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Increase item quantity (for returns/restocking)
   */
  async increaseQuantity(itemId, amount = 1) {
    try {
      const response = await api.patch(`/inventory/${itemId}/increase-quantity`, { amount });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Move item to different outlet
   */
  async moveToOutlet(itemId, outlet, reason = 'Stock Transfer') {
    try {
      const response = await api.patch(`/inventory/${itemId}/move-outlet`, { outlet, reason });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get movement history for an item
   */
  async getMovementHistory(itemId) {
    try {
      const response = await api.get(`/inventory/${itemId}/movement-history`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Utility functions
const APIHelpers = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!api.getToken();
  },

  /**
   * Show error message to user
   */
  showError(error) {
    const message = error.message || 'An unexpected error occurred';
    if (window.Utils && Utils.showNotification) {
      Utils.showNotification(message);
    } else {
      alert(message);
    }
  },

  /**
   * Show success message to user
   */
  showSuccess(message) {
    if (window.Utils && Utils.showNotification) {
      Utils.showNotification(message);
    } else {
      alert(message);
    }
  },

  /**
   * Handle API errors with user feedback
   */
  async handleAPICall(apiCall, successMessage = null) {
    try {
      const result = await apiCall();
      if (successMessage) {
        this.showSuccess(successMessage);
      }
      return result;
    } catch (error) {
      this.showError(error);
      throw error;
    }
  },

  /**
   * Check server health
   */
  async checkServerHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  }
};

// Export for global use
window.API = api;
window.AuthAPI = AuthAPI;
window.CustomerAPI = CustomerAPI;
window.InventoryAPI = InventoryAPI; // NEW
window.APIHelpers = APIHelpers;