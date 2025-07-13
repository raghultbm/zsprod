// ZEDSON WATCHCRAFT - App Extended Module (Part 2)

/**
 * Main Application Controller - Extended Functions
 * Revenue Analytics, Modal Templates, and Global Function Assignments
 */

/**
 * Apply Revenue Filter - UPDATED with All Transactions and Expenses
 */
function applyRevenueFilter() {
    if (!window.SalesModule || !window.ServiceModule) {
        Utils.showNotification('Sales or Service module not available');
        return;
    }
    
    const filterType = document.getElementById('revenueFilterType')?.value;
    const revenueType = document.getElementById('revenueTypeFilter')?.value || 'all';
    const includeExpenses = document.getElementById('includeExpenses')?.checked || false;
    const resultsDiv = document.getElementById('revenueFilterResults');
    
    if (!filterType || !resultsDiv) return;
    
    let filteredSales = [];
    let filteredServices = [];
    let filteredExpenses = [];
    let title = '';
    
    // First filter by date/time
    if (filterType === 'dateRange') {
        const fromDate = document.getElementById('revenueFromDate')?.value;
        const toDate = document.getElementById('revenueToDate')?.value;
        
        if (!fromDate || !toDate) {
            Utils.showNotification('Please select both from and to dates.');
            return;
        }
        
        filteredSales = SalesModule.filterSalesByDateRange(fromDate, toDate);
        filteredServices = ServiceModule.filterServicesByDateRange(fromDate, toDate)
            .filter(s => s.status === 'completed');
        
        if (includeExpenses && window.ExpenseModule) {
            filteredExpenses = ExpenseModule.getExpensesByDateRange(fromDate, toDate);
        }
        
        title = `Transactions from ${Utils.formatDate(fromDate)} to ${Utils.formatDate(toDate)}`;
        
    } else if (filterType === 'monthly') {
        const month = document.getElementById('revenueMonth')?.value;
        const year = document.getElementById('revenueYear')?.value;
        
        if (month === null || !year) return;
        
        filteredSales = SalesModule.filterSalesByMonth(month, year);
        filteredServices = ServiceModule.filterServicesByMonth(month, year)
            .filter(s => s.status === 'completed');
        
        if (includeExpenses && window.ExpenseModule) {
            filteredExpenses = ExpenseModule.getExpensesByMonth(month, year);
        }
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        title = `Transactions for ${monthNames[month]} ${year}`;
        
    } else {
        // Show all transactions without any date range
        filteredSales = SalesModule.sales || [];
        filteredServices = (ServiceModule.services || []).filter(s => s.status === 'completed');
        
        if (includeExpenses && window.ExpenseModule) {
            filteredExpenses = ExpenseModule.expenses || [];
        }
        
        title = 'All Transactions';
    }
    
    // Then filter by revenue type
    if (revenueType === 'sales') {
        filteredServices = [];
        title += ' (Sales Only)';
    } else if (revenueType === 'services') {
        filteredSales = [];
        title += ' (Services Only)';
    }
    
    // Calculate totals
    const salesAmount = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const servicesAmount = filteredServices.reduce((sum, service) => sum + service.cost, 0);
    const expensesAmount = includeExpenses ? filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const totalRevenue = salesAmount + servicesAmount;
    const netAmount = totalRevenue - expensesAmount;
    const totalTransactions = filteredSales.length + filteredServices.length + (includeExpenses ? filteredExpenses.length : 0);
    
    // Display results with enhanced stats
    let statsHtml = `
        <div class="stat-card" style="margin: 10px;">
            <h3>${totalTransactions}</h3>
            <p>Total Transactions</p>
        </div>
        <div class="stat-card" style="margin: 10px;">
            <h3>${Utils.formatCurrency(salesAmount)}</h3>
            <p>Sales Revenue</p>
        </div>
        <div class="stat-card" style="margin: 10px;">
            <h3>${Utils.formatCurrency(servicesAmount)}</h3>
            <p>Services Revenue</p>
        </div>
        <div class="stat-card" style="margin: 10px;">
            <h3>${Utils.formatCurrency(totalRevenue)}</h3>
            <p>Total Revenue</p>
        </div>
    `;
    
    if (includeExpenses) {
        statsHtml += `
            <div class="stat-card" style="margin: 10px;">
                <h3 style="color: #dc3545;">${Utils.formatCurrency(expensesAmount)}</h3>
                <p>Total Expenses</p>
            </div>
            <div class="stat-card" style="margin: 10px;">
                <h3 style="color: ${netAmount >= 0 ? '#28a745' : '#dc3545'};">${Utils.formatCurrency(netAmount)}</h3>
                <p>Net Amount</p>
            </div>
        `;
    }
    
    let tableRows = '';
    
    // Add sales rows
    tableRows += filteredSales.map(sale => `
        <tr>
            <td><span class="status available">Sales</span></td>
            <td>${Utils.sanitizeHtml(sale.date)}</td>
            <td>${Utils.sanitizeHtml(sale.customerName)}</td>
            <td>${Utils.sanitizeHtml(sale.watchName)}</td>
            <td style="color: #28a745;">${Utils.formatCurrency(sale.totalAmount)}</td>
        </tr>
    `).join('');
    
    // Add services rows
    tableRows += filteredServices.map(service => `
        <tr>
            <td><span class="status completed">Service</span></td>
            <td>${Utils.sanitizeHtml(service.actualDelivery || service.date)}</td>
            <td>${Utils.sanitizeHtml(service.customerName)}</td>
            <td>${Utils.sanitizeHtml(service.watchName)}</td>
            <td style="color: #28a745;">${Utils.formatCurrency(service.cost)}</td>
        </tr>
    `).join('');
    
    // Add expenses rows if included
    if (includeExpenses) {
        tableRows += filteredExpenses.map(expense => `
            <tr>
                <td><span class="status on-hold">Expense</span></td>
                <td>${Utils.sanitizeHtml(expense.formattedDate)}</td>
                <td>-</td>
                <td>${Utils.sanitizeHtml(expense.description)}</td>
                <td style="color: #dc3545;">-${Utils.formatCurrency(expense.amount)}</td>
            </tr>
        `).join('');
    }
    
    resultsDiv.innerHTML = `
        <div class="filter-results">
            <h3>${title}</h3>
            <div class="stats" style="margin: 20px 0;">
                ${statsHtml}
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Details</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Reset Revenue Filter
 */
function resetRevenueFilter() {
    const filterType = document.getElementById('revenueFilterType');
    const revenueType = document.getElementById('revenueTypeFilter');
    const includeExpenses = document.getElementById('includeExpenses');
    const resultsDiv = document.getElementById('revenueFilterResults');
    
    if (filterType) filterType.value = 'all';
    if (revenueType) revenueType.value = 'all';
    if (includeExpenses) includeExpenses.checked = false;
    if (resultsDiv) resultsDiv.innerHTML = '';
    
    window.AppCoreModule.toggleRevenueFilterInputs();
    applyRevenueFilter();
}

/**
 * Load modal templates - Updated to include expense modal
 */
function loadModalTemplates() {
    const modalsContainer = document.getElementById('modals-container');
    if (!modalsContainer) return;

    const modalTemplates = `
        <!-- Add Watch Modal -->
        <div id="addWatchModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addWatchModal')">&times;</span>
                <h2>Add New Item</h2>
                <form onsubmit="InventoryModule.addNewWatch(event)">
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Code:</label>
                            <input type="text" id="watchCode" required placeholder="Auto-generated">
                        </div>
                        <div class="form-group">
                            <label>Type:</label>
                            <select id="watchType" required>
                                <option value="">Select Type</option>
                                <option value="Watch">Watch</option>
                                <option value="Clock">Clock</option>
                                <option value="Timepiece">Timepiece</option>
                                <option value="Strap">Strap</option>
                                <option value="Battery">Battery</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Brand:</label>
                            <input type="text" id="watchBrand" required onchange="InventoryModule.updateWatchCode()">
                        </div>
                        <div class="form-group">
                            <label>Model:</label>
                            <input type="text" id="watchModel" required>
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Size:</label>
                            <input type="text" id="watchSize" required placeholder="e.g., 40mm, 42mm">
                        </div>
                        <div class="form-group">
                            <label>Price (₹):</label>
                            <input type="number" id="watchPrice" required min="0" step="0.01">
                        </div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Quantity:</label>
                            <input type="number" id="watchQuantity" value="1" required min="1">
                        </div>
                        <div class="form-group">
                            <label>Outlet:</label>
                            <select id="watchOutlet" required>
                                <option value="">Select Outlet</option>
                                <option value="Semmancheri">Semmancheri</option>
                                <option value="Navalur">Navalur</option>
                                <option value="Padur">Padur</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="watchDescription" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn">Add Item</button>
                </form>
            </div>
        </div>

        <!-- Add Customer Modal -->
        <div id="addCustomerModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addCustomerModal')">&times;</span>
                <h2>Add Customer</h2>
                <form onsubmit="CustomerModule.addNewCustomer(event)">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="customerName" required>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="customerEmail" required>
                    </div>
                    <div class="form-group">
                        <label>Phone:</label>
                        <input type="tel" id="customerPhone" required>
                    </div>
                    <div class="form-group">
                        <label>Address:</label>
                        <textarea id="customerAddress" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn">Add Customer</button>
                </form>
            </div>
        </div>

        <!-- Add User Modal -->
        <div id="addUserModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addUserModal')">&times;</span>
                <h2>Add New User</h2>
                <form onsubmit="AuthModule.addNewUser(event)">
                    <div class="form-group">
                        <label>Username:</label>
                        <input type="text" id="newUsername" required placeholder="Enter username">
                    </div>
                    <div class="form-group">
                        <label>Password:</label>
                        <input type="password" id="newPassword" required placeholder="Enter password">
                    </div>
                    <div class="form-group">
                        <label>Role:</label>
                        <select id="newUserRole" required>
                            <option value="">Select Role</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Full Name:</label>
                        <input type="text" id="newUserFullName" required placeholder="Enter full name">
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="newUserEmail" required placeholder="Enter email">
                    </div>
                    <button type="submit" class="btn">Add User</button>
                </form>
            </div>
        </div>

        <!-- Add Expense Modal -->
        <div id="addExpenseModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('addExpenseModal')">&times;</span>
                <h2>Add New Expense</h2>
                <form onsubmit="ExpenseModule.addNewExpense(event)">
                    <div class="form-group">
                        <label>Date:</label>
                        <input type="date" id="expenseDate" required>
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="expenseDescription" rows="3" required placeholder="Enter expense description..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Amount (₹):</label>
                        <input type="number" id="expenseAmount" required min="0.01" step="0.01" placeholder="0.00">
                    </div>
                    <button type="submit" class="btn">Add Expense</button>
                </form>
            </div>
        </div>
    `;

    modalsContainer.innerHTML = modalTemplates;
}

/**
 * Make global functions available
 */
function assignGlobalFunctions() {
    // Core functions
    window.showSection = window.AppCoreModule.showSection;
    window.closeModal = window.AppCoreModule.closeModal;
    window.deleteItem = window.AppCoreModule.deleteItem;
    window.updateDashboard = window.AppCoreModule.updateDashboard;
    window.confirmTransaction = window.AppCoreModule.confirmTransaction;
    window.openRevenueAnalytics = window.AppCoreModule.openRevenueAnalytics;
    window.toggleRevenueFilterInputs = window.AppCoreModule.toggleRevenueFilterInputs;
    window.applyRevenueFilter = applyRevenueFilter;
    window.resetRevenueFilter = resetRevenueFilter;

    // Authentication functions
    window.handleLogin = function(event) {
        if (window.AuthModule) {
            AuthModule.handleLogin(event);
        }
    };

    window.logout = function() {
        if (window.AuthModule) {
            AuthModule.logout();
        }
    };

    // User management functions
    window.openAddUserModal = function() {
        if (window.AuthModule) {
            AuthModule.openAddUserModal();
        }
    };

    window.editUser = function(username) {
        if (window.AuthModule) {
            AuthModule.editUser(username);
        }
    };

    window.deleteUser = function(username) {
        if (window.AuthModule) {
            AuthModule.deleteUser(username);
        }
    };

    // Inventory functions
    window.openAddWatchModal = function() {
        if (window.InventoryModule) {
            InventoryModule.openAddWatchModal();
        }
    };

    window.editWatch = function(watchId) {
        if (window.InventoryModule) {
            InventoryModule.editWatch(watchId);
        }
    };

    window.deleteWatch = function(watchId) {
        if (window.InventoryModule) {
            InventoryModule.deleteWatch(watchId);
        }
    };

    window.searchWatches = function(query) {
        if (window.InventoryModule) {
            InventoryModule.searchWatches(query);
        }
    };

    // Customer functions
    window.openAddCustomerModal = function() {
        if (window.CustomerModule) {
            CustomerModule.openAddCustomerModal();
        }
    };

    window.editCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.editCustomer(customerId);
        }
    };

    window.deleteCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.deleteCustomer(customerId);
        }
    };

    window.searchCustomers = function(query) {
        if (window.CustomerModule) {
            CustomerModule.searchCustomers(query);
        }
    };

    window.initiateSaleFromCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.initiateSaleFromCustomer(customerId);
        }
    };

    window.initiateServiceFromCustomer = function(customerId) {
        if (window.CustomerModule) {
            CustomerModule.initiateServiceFromCustomer(customerId);
        }
    };

    // Sales functions
    window.openNewSaleModal = function() {
        if (window.SalesModule) {
            SalesModule.openNewSaleModal();
        } else {
            Utils.showNotification('Sales module is loading. Please try again in a moment.');
        }
    };

    window.editSale = function(saleId) {
        if (window.SalesModule) {
            SalesModule.editSale(saleId);
        }
    };

    window.deleteSale = function(saleId) {
        if (window.SalesModule) {
            SalesModule.deleteSale(saleId);
        }
    };

    window.searchSales = function(query) {
        if (window.SalesModule) {
            SalesModule.searchSales(query);
        }
    };

    // Service functions
    window.openNewServiceModal = function() {
        if (window.ServiceModule) {
            ServiceModule.openNewServiceModal();
        }
    };

    window.deleteService = function(serviceId) {
        if (window.ServiceModule) {
            ServiceModule.deleteService(serviceId);
        }
    };

    window.updateServiceStatus = function(serviceId, status) {
        if (window.ServiceModule) {
            ServiceModule.updateServiceStatus(serviceId, status);
        }
    };

    window.editService = function(serviceId) {
        if (window.ServiceModule) {
            ServiceModule.editService(serviceId);
        }
    };

    window.searchServices = function(query) {
        if (window.ServiceModule) {
            ServiceModule.searchServices(query);
        }
    };

    // Expense functions
    window.openAddExpenseModal = function() {
        if (window.ExpenseModule) {
            ExpenseModule.openAddExpenseModal();
        }
    };

    window.editExpense = function(expenseId) {
        if (window.ExpenseModule) {
            ExpenseModule.editExpense(expenseId);
        }
    };

    window.deleteExpense = function(expenseId) {
        if (window.ExpenseModule) {
            ExpenseModule.deleteExpense(expenseId);
        }
    };

    window.searchExpenses = function(query) {
        if (window.ExpenseModule) {
            ExpenseModule.searchExpenses(query);
        }
    };

    // Invoice functions
    window.searchInvoices = function(query) {
        if (window.InvoiceModule) {
            InvoiceModule.searchInvoices(query);
        }
    };

    window.filterInvoicesByType = function() {
        if (window.InvoiceModule) {
            InvoiceModule.filterInvoicesByType();
        }
    };

    window.viewInvoice = function(invoiceId) {
        if (window.InvoiceModule) {
            InvoiceModule.viewInvoice(invoiceId);
        }
    };

    window.printInvoice = function() {
        if (window.InvoiceModule) {
            InvoiceModule.printInvoice();
        }
    };

    window.viewServiceAcknowledgement = function(serviceId) {
        if (window.InvoiceModule) {
            InvoiceModule.viewServiceAcknowledgement(serviceId);
        }
    };
}

/**
 * Start the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Assign global functions first
    assignGlobalFunctions();
    
    // Initialize app
    window.AppCoreModule.initializeApp();
});

// Export for other modules
window.AppExtendedModule = {
    applyRevenueFilter,
    resetRevenueFilter,
    loadModalTemplates,
    assignGlobalFunctions
};

// Export for other modules
window.AppController = {
    showSection: window.AppCoreModule.showSection,
    updateDashboard: window.AppCoreModule.updateDashboard,
    updateSectionData: window.AppCoreModule.updateSectionData,
    initializeApp: window.AppCoreModule.initializeApp,
    openRevenueAnalytics: window.AppCoreModule.openRevenueAnalytics,
    getTodayRevenue: window.AppCoreModule.getTodayRevenue
};