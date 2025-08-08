// src/modules/ledger.js - Part 1: Core Ledger Module
const { ipcRenderer } = require('electron');

class LedgerModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.todayData = {
            sales: [],
            services: [],
            expenses: [],
            previousBalance: { cash: 0, account: 0 },
            currentBalance: { cash: 0, account: 0 }
        };
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('Initializing Ledger Module...');
        
        try {
            // Load today's data
            await this.loadTodayData();
            
            // Render initial view
            this.renderInitialView();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('Ledger Module initialized successfully');
        } catch (error) {
            console.error('Error initializing Ledger Module:', error);
            throw error;
        }
    }

    renderInitialView() {
        const contentBody = document.getElementById('ledger-content');
        if (!contentBody) {
            console.error('Ledger content container not found');
            return;
        }

        const htmlContent = `
            <div class="ledger-main-container">
                <!-- Daily Summary Cards -->
                <div class="ledger-summary-cards">
                    <div class="summary-card cash-card">
                        <h3>Cash Balance</h3>
                        <div class="balance-amount" id="cashBalance">₹0.00</div>
                        <div class="balance-change">
                            <span class="previous-balance">Previous: ₹<span id="previousCashBalance">0.00</span></span>
                        </div>
                    </div>
                    <div class="summary-card account-card">
                        <h3>Account Balance</h3>
                        <div class="balance-amount" id="accountBalance">₹0.00</div>
                        <div class="balance-change">
                            <span class="previous-balance">Previous: ₹<span id="previousAccountBalance">0.00</span></span>
                        </div>
                    </div>
                    <div class="summary-card total-card">
                        <h3>Total Balance</h3>
                        <div class="balance-amount" id="totalBalance">₹0.00</div>
                        <div class="balance-change">
                            <span class="today-income">Today's Net: ₹<span id="todayNetIncome">0.00</span></span>
                        </div>
                    </div>
                    <div class="summary-card actions-card">
                        <h3>Business Operations</h3>
                        <button class="btn btn-primary" onclick="ledgerModule().openCOBModal()">Initiate COB</button>
                        <button class="btn btn-secondary" onclick="ledgerModule().refreshData()">Refresh Data</button>
                    </div>
                </div>

                <!-- Today's Transactions Tabs -->
                <div class="ledger-tabs">
                    <div class="tab-headers">
                        <button class="tab-header active" data-tab="sales" onclick="ledgerModule().switchTab('sales')">
                            Sales (${this.todayData.sales.length})
                        </button>
                        <button class="tab-header" data-tab="services" onclick="ledgerModule().switchTab('services')">
                            Services (${this.todayData.services.length})
                        </button>
                        <button class="tab-header" data-tab="expenses" onclick="ledgerModule().switchTab('expenses')">
                            Expenses (${this.todayData.expenses.length})
                        </button>
                        <button class="tab-header" data-tab="summary" onclick="ledgerModule().switchTab('summary')">
                            Summary
                        </button>
                    </div>

                    <!-- Sales Tab -->
                    <div class="tab-content active" id="salesTab">
                        <div class="table-header">
                            <h4>Today's Sales</h4>
                            <div class="table-stats">
                                <span>Total: ₹<span id="salesTotalAmount">0.00</span></span>
                                <span>Cash: ₹<span id="salesCashAmount">0.00</span></span>
                                <span>Digital: ₹<span id="salesDigitalAmount">0.00</span></span>
                            </div>
                        </div>
                        <div class="data-table-container">
                            <table class="data-table ledger-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Invoice #</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Payment Mode</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="salesTableBody">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Services Tab -->
                    <div class="tab-content" id="servicesTab">
                        <div class="table-header">
                            <h4>Today's Services</h4>
                            <div class="table-stats">
                                <span>Total Jobs: <span id="servicesTotalJobs">0</span></span>
                                <span>Revenue: ₹<span id="servicesTotalRevenue">0.00</span></span>
                                <span>Advance: ₹<span id="servicesAdvanceAmount">0.00</span></span>
                            </div>
                        </div>
                        <div class="data-table-container">
                            <table class="data-table ledger-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Job #</th>
                                        <th>Customer</th>
                                        <th>Status</th>
                                        <th>Est. Cost</th>
                                        <th>Advance</th>
                                        <th>Payment Mode</th>
                                    </tr>
                                </thead>
                                <tbody id="servicesTableBody">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Expenses Tab -->
                    <div class="tab-content" id="expensesTab">
                        <div class="table-header">
                            <h4>Today's Expenses</h4>
                            <div class="table-stats">
                                <span>Total: ₹<span id="expensesTotalAmount">0.00</span></span>
                                <span>Cash: ₹<span id="expensesCashAmount">0.00</span></span>
                                <span>Digital: ₹<span id="expensesDigitalAmount">0.00</span></span>
                            </div>
                        </div>
                        <div class="data-table-container">
                            <table class="data-table ledger-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Payment Mode</th>
                                        <th>Added By</th>
                                    </tr>
                                </thead>
                                <tbody id="expensesTableBody">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Summary Tab -->
                    <div class="tab-content" id="summaryTab">
                        <div class="ledger-summary">
                            <h4>Today's Business Summary</h4>
                            <div class="summary-grid">
                                <div class="summary-section">
                                    <h5>Income</h5>
                                    <div class="summary-item">
                                        <span>Sales Revenue:</span>
                                        <span class="amount positive">₹<span id="summaryTotalSales">0.00</span></span>
                                    </div>
                                    <div class="summary-item">
                                        <span>Service Revenue:</span>
                                        <span class="amount positive">₹<span id="summaryTotalServices">0.00</span></span>
                                    </div>
                                    <div class="summary-item total">
                                        <span><strong>Total Income:</strong></span>
                                        <span class="amount positive"><strong>₹<span id="summaryTotalIncome">0.00</span></strong></span>
                                    </div>
                                </div>

                                <div class="summary-section">
                                    <h5>Expenses</h5>
                                    <div class="summary-item">
                                        <span>Total Expenses:</span>
                                        <span class="amount negative">₹<span id="summaryTotalExpenses">0.00</span></span>
                                    </div>
                                </div>

                                <div class="summary-section">
                                    <h5>Net Position</h5>
                                    <div class="summary-item total">
                                        <span><strong>Net Income:</strong></span>
                                        <span class="amount" id="summaryNetIncomeSpan"><strong>₹<span id="summaryNetIncome">0.00</span></strong></span>
                                    </div>
                                </div>

                                <div class="summary-section">
                                    <h5>Cash Flow</h5>
                                    <div class="summary-item">
                                        <span>Cash Received:</span>
                                        <span class="amount">₹<span id="summaryCashReceived">0.00</span></span>
                                    </div>
                                    <div class="summary-item">
                                        <span>Cash Spent:</span>
                                        <span class="amount">₹<span id="summaryCashSpent">0.00</span></span>
                                    </div>
                                    <div class="summary-item total">
                                        <span><strong>Net Cash Flow:</strong></span>
                                        <span class="amount" id="summaryNetCashFlowSpan"><strong>₹<span id="summaryNetCashFlow">0.00</span></strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Close of Business (COB) Modal -->
            <div id="cobModal" class="modal">
                <div class="modal-content large-modal">
                    <div class="modal-header">
                        <h3>Close of Business (COB) - ${new Date().toDateString()}</h3>
                        <span class="close-btn" onclick="closeModal('cobModal')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="cob-summary" id="cobSummaryContent">
                            <!-- COB summary will be populated dynamically -->
                        </div>
                        
                        <div class="form-section">
                            <h4>Notes for Next Day</h4>
                            <textarea id="nextDayNotes" rows="4" placeholder="Enter tasks and information for tomorrow..."></textarea>
                        </div>
                        
                        <div class="cob-actions">
                            <button type="button" class="btn btn-secondary" onclick="ledgerModule().printCOBReport()">Print Report</button>
                            <button type="button" class="btn btn-primary" onclick="ledgerModule().completeCOB()">Complete COB</button>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" onclick="closeModal('cobModal')" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        contentBody.innerHTML = htmlContent;
        
        // Render the data
        this.renderAllTabs();
        this.updateSummaryCards();
    }

    async loadTodayData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log('Loading ledger data for:', today);

            // Load previous day balance
            const previousBalance = await this.getPreviousDayBalance();
            this.todayData.previousBalance = previousBalance;

            // Load today's sales
            const sales = await ipcRenderer.invoke('get-sales-by-date', today);
            this.todayData.sales = sales || [];

            // Load today's services (both created today and completed today)
            const services = await ipcRenderer.invoke('get-services-by-date', today);
            this.todayData.services = services || [];

            // Load today's expenses
            const expenses = await ipcRenderer.invoke('get-expenses-by-date', today);
            this.todayData.expenses = expenses || [];

            // Calculate current balances
            this.calculateCurrentBalances();

            console.log('Ledger data loaded:', {
                sales: this.todayData.sales.length,
                services: this.todayData.services.length,
                expenses: this.todayData.expenses.length,
                currentBalance: this.todayData.currentBalance
            });

        } catch (error) {
            console.error('Error loading today\'s data:', error);
            // Initialize with empty data on error
            this.todayData = {
                sales: [],
                services: [],
                expenses: [],
                previousBalance: { cash: 0, account: 0 },
                currentBalance: { cash: 0, account: 0 }
            };
        }
    }

    async getPreviousDayBalance() {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const balance = await ipcRenderer.invoke('get-ledger-balance', yesterdayStr);
            return balance || { cash: 0, account: 0 };
        } catch (error) {
            console.error('Error getting previous day balance:', error);
            return { cash: 0, account: 0 };
        }
    }

    calculateCurrentBalances() {
        let cashBalance = this.todayData.previousBalance.cash;
        let accountBalance = this.todayData.previousBalance.account;

        // Add sales income
        this.todayData.sales.forEach(sale => {
            const payments = sale.payments || [];
            payments.forEach(payment => {
                if (payment.payment_method === 'cash') {
                    cashBalance += parseFloat(payment.amount || 0);
                } else {
                    accountBalance += parseFloat(payment.amount || 0);
                }
            });
        });

        // Add service income (advance payments and completed services)
        this.todayData.services.forEach(service => {
            // Add advance amount
            if (service.advance_amount && service.advance_payment_method) {
                const amount = parseFloat(service.advance_amount);
                if (service.advance_payment_method === 'cash') {
                    cashBalance += amount;
                } else {
                    accountBalance += amount;
                }
            }

            // Add final payment for completed services
            if (service.status === 'service_completed' && service.final_payment_amount && service.final_payment_method) {
                const amount = parseFloat(service.final_payment_amount);
                if (service.final_payment_method === 'cash') {
                    cashBalance += amount;
                } else {
                    accountBalance += amount;
                }
            }
        });

        // Subtract expenses
        this.todayData.expenses.forEach(expense => {
            const amount = parseFloat(expense.amount || 0);
            if (expense.payment_mode === 'cash') {
                cashBalance -= amount;
            } else {
                accountBalance -= amount;
            }
        });

        this.todayData.currentBalance = {
            cash: cashBalance,
            account: accountBalance
        };
    }

    renderAllTabs() {
        this.renderSalesTab();
        this.renderServicesTab();
        this.renderExpensesTab();
        this.renderSummaryTab();
    }

    renderSalesTab() {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.todayData.sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No sales recorded today</td></tr>';
            return;
        }

        let totalAmount = 0;
        let cashAmount = 0;
        let digitalAmount = 0;

        this.todayData.sales.forEach(sale => {
            const saleAmount = parseFloat(sale.total_amount || 0);
            totalAmount += saleAmount;

            // Calculate payment mode amounts
            if (sale.payments) {
                sale.payments.forEach(payment => {
                    const amount = parseFloat(payment.amount || 0);
                    if (payment.payment_method === 'cash') {
                        cashAmount += amount;
                    } else {
                        digitalAmount += amount;
                    }
                });
            }

            const row = document.createElement('tr');
            const paymentModes = sale.payments ? 
                sale.payments.map(p => p.payment_method.toUpperCase()).join(', ') : 
                'N/A';

            row.innerHTML = `
                <td>${new Date(sale.created_at).toLocaleTimeString()}</td>
                <td><span class="invoice-number">${sale.invoice_number || 'N/A'}</span></td>
                <td>${sale.customer_name || 'Walk-in Customer'}</td>
                <td>₹${saleAmount.toFixed(2)}</td>
                <td><span class="payment-modes">${paymentModes}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="ledgerModule().viewSaleDetails(${sale.id})">View</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Update stats
        document.getElementById('salesTotalAmount').textContent = totalAmount.toFixed(2);
        document.getElementById('salesCashAmount').textContent = cashAmount.toFixed(2);
        document.getElementById('salesDigitalAmount').textContent = digitalAmount.toFixed(2);
    }

    renderServicesTab() {
        const tbody = document.getElementById('servicesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.todayData.services.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No services recorded today</td></tr>';
            return;
        }

        let totalRevenue = 0;
        let totalAdvance = 0;

        this.todayData.services.forEach(service => {
            const estimatedCost = parseFloat(service.estimated_cost || 0);
            const advanceAmount = parseFloat(service.advance_amount || 0);
            
            totalRevenue += estimatedCost;
            totalAdvance += advanceAmount;

            const row = document.createElement('tr');
            const statusClass = service.status ? service.status.replace('_', '-') : '';

            row.innerHTML = `
                <td>${new Date(service.created_at).toLocaleTimeString()}</td>
                <td><span class="job-number">${service.job_number || 'N/A'}</span></td>
                <td>${service.customer_name || 'Walk-in Customer'}</td>
                <td><span class="service-status ${statusClass}">${service.status ? service.status.replace('_', ' ').toUpperCase() : 'N/A'}</span></td>
                <td>₹${estimatedCost.toFixed(2)}</td>
                <td>₹${advanceAmount.toFixed(2)}</td>
                <td><span class="payment-mode">${service.advance_payment_method ? service.advance_payment_method.toUpperCase() : 'N/A'}</span></td>
            `;
            tbody.appendChild(row);
        });

        // Update stats
        document.getElementById('servicesTotalJobs').textContent = this.todayData.services.length;
        document.getElementById('servicesTotalRevenue').textContent = totalRevenue.toFixed(2);
        document.getElementById('servicesAdvanceAmount').textContent = totalAdvance.toFixed(2);
    }

    renderExpensesTab() {
        const tbody = document.getElementById('expensesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.todayData.expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No expenses recorded today</td></tr>';
            return;
        }

        let totalAmount = 0;
        let cashAmount = 0;
        let digitalAmount = 0;

        this.todayData.expenses.forEach(expense => {
            const amount = parseFloat(expense.amount || 0);
            totalAmount += amount;

            if (expense.payment_mode === 'cash') {
                cashAmount += amount;
            } else {
                digitalAmount += amount;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(expense.created_at).toLocaleTimeString()}</td>
                <td>${expense.description}</td>
                <td>₹${amount.toFixed(2)}</td>
                <td><span class="payment-mode ${expense.payment_mode}">${expense.payment_mode.toUpperCase()}</span></td>
                <td>${expense.created_by_name || 'Unknown'}</td>
            `;
            tbody.appendChild(row);
        });

        // Update stats
        document.getElementById('expensesTotalAmount').textContent = totalAmount.toFixed(2);
        document.getElementById('expensesCashAmount').textContent = cashAmount.toFixed(2);
        document.getElementById('expensesDigitalAmount').textContent = digitalAmount.toFixed(2);
    }

// src/modules/ledger.js - Part 2: COB and Utility Functions

    renderSummaryTab() {
        // Calculate totals for summary
        let totalSales = 0;
        let totalServices = 0;
        let totalExpenses = 0;
        let cashReceived = 0;
        let cashSpent = 0;

        // Calculate sales totals
        this.todayData.sales.forEach(sale => {
            const amount = parseFloat(sale.total_amount || 0);
            totalSales += amount;
            
            if (sale.payments) {
                sale.payments.forEach(payment => {
                    if (payment.payment_method === 'cash') {
                        cashReceived += parseFloat(payment.amount || 0);
                    }
                });
            }
        });

        // Calculate service totals
        this.todayData.services.forEach(service => {
            // Count advance amounts as today's income
            const advanceAmount = parseFloat(service.advance_amount || 0);
            totalServices += advanceAmount;
            
            if (service.advance_payment_method === 'cash') {
                cashReceived += advanceAmount;
            }

            // Add final payments for completed services
            if (service.status === 'service_completed' && service.final_payment_amount) {
                const finalAmount = parseFloat(service.final_payment_amount);
                totalServices += finalAmount;
                
                if (service.final_payment_method === 'cash') {
                    cashReceived += finalAmount;
                }
            }
        });

        // Calculate expense totals
        this.todayData.expenses.forEach(expense => {
            const amount = parseFloat(expense.amount || 0);
            totalExpenses += amount;
            
            if (expense.payment_mode === 'cash') {
                cashSpent += amount;
            }
        });

        const totalIncome = totalSales + totalServices;
        const netIncome = totalIncome - totalExpenses;
        const netCashFlow = cashReceived - cashSpent;

        // Update summary display
        document.getElementById('summaryTotalSales').textContent = totalSales.toFixed(2);
        document.getElementById('summaryTotalServices').textContent = totalServices.toFixed(2);
        document.getElementById('summaryTotalIncome').textContent = totalIncome.toFixed(2);
        document.getElementById('summaryTotalExpenses').textContent = totalExpenses.toFixed(2);
        document.getElementById('summaryNetIncome').textContent = Math.abs(netIncome).toFixed(2);
        document.getElementById('summaryCashReceived').textContent = cashReceived.toFixed(2);
        document.getElementById('summaryCashSpent').textContent = cashSpent.toFixed(2);
        document.getElementById('summaryNetCashFlow').textContent = Math.abs(netCashFlow).toFixed(2);

        // Update styling based on positive/negative
        const netIncomeSpan = document.getElementById('summaryNetIncomeSpan');
        const netCashFlowSpan = document.getElementById('summaryNetCashFlowSpan');
        
        netIncomeSpan.className = netIncome >= 0 ? 'amount positive' : 'amount negative';
        netCashFlowSpan.className = netCashFlow >= 0 ? 'amount positive' : 'amount negative';
        
        if (netIncome < 0) {
            document.getElementById('summaryNetIncome').textContent = `-₹${Math.abs(netIncome).toFixed(2)}`;
        }
        if (netCashFlow < 0) {
            document.getElementById('summaryNetCashFlow').textContent = `-₹${Math.abs(netCashFlow).toFixed(2)}`;
        }
    }

    updateSummaryCards() {
        const cashBalance = this.todayData.currentBalance.cash;
        const accountBalance = this.todayData.currentBalance.account;
        const totalBalance = cashBalance + accountBalance;
        
        const previousTotal = this.todayData.previousBalance.cash + this.todayData.previousBalance.account;
        const todayNet = totalBalance - previousTotal;

        document.getElementById('cashBalance').textContent = `₹${cashBalance.toFixed(2)}`;
        document.getElementById('accountBalance').textContent = `₹${accountBalance.toFixed(2)}`;
        document.getElementById('totalBalance').textContent = `₹${totalBalance.toFixed(2)}`;
        document.getElementById('previousCashBalance').textContent = this.todayData.previousBalance.cash.toFixed(2);
        document.getElementById('previousAccountBalance').textContent = this.todayData.previousBalance.account.toFixed(2);
        document.getElementById('todayNetIncome').textContent = `${todayNet >= 0 ? '+' : ''}₹${todayNet.toFixed(2)}`;

        // Update tab counts
        const tabHeaders = document.querySelectorAll('.tab-header');
        tabHeaders.forEach(header => {
            const tab = header.dataset.tab;
            if (tab === 'sales') {
                header.textContent = `Sales (${this.todayData.sales.length})`;
            } else if (tab === 'services') {
                header.textContent = `Services (${this.todayData.services.length})`;
            } else if (tab === 'expenses') {
                header.textContent = `Expenses (${this.todayData.expenses.length})`;
            }
        });
    }

    setupEventListeners() {
        // No additional event listeners needed - using onclick handlers
        console.log('Ledger event listeners setup complete');
    }

    // Tab switching
    switchTab(tabName) {
        // Remove active class from all tab headers and contents
        document.querySelectorAll('.tab-header').forEach(header => {
            header.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to selected tab
        const selectedHeader = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(`${tabName}Tab`);
        
        if (selectedHeader) selectedHeader.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
    }

    // Data refresh
    async refreshData() {
        try {
            await this.loadTodayData();
            this.renderAllTabs();
            this.updateSummaryCards();
            alert('Data refreshed successfully!');
        } catch (error) {
            console.error('Error refreshing data:', error);
            alert('Error refreshing data');
        }
    }

    // COB (Close of Business) Operations
    async openCOBModal() {
        // Generate COB summary
        const cobSummary = this.generateCOBSummary();
        document.getElementById('cobSummaryContent').innerHTML = cobSummary;
        
        // Clear previous notes
        document.getElementById('nextDayNotes').value = '';
        
        const modal = document.getElementById('cobModal');
        if (modal) modal.style.display = 'block';
    }

    generateCOBSummary() {
        const todayStr = new Date().toDateString();
        
        // Calculate all totals
        let salesTotal = 0;
        let salesCash = 0;
        let salesDigital = 0;
        
        let servicesTotal = 0;
        let servicesCash = 0;
        let servicesDigital = 0;
        
        let expensesTotal = 0;
        let expensesCash = 0;
        let expensesDigital = 0;

        // Calculate sales
        this.todayData.sales.forEach(sale => {
            const amount = parseFloat(sale.total_amount || 0);
            salesTotal += amount;
            
            if (sale.payments) {
                sale.payments.forEach(payment => {
                    const paymentAmount = parseFloat(payment.amount || 0);
                    if (payment.payment_method === 'cash') {
                        salesCash += paymentAmount;
                    } else {
                        salesDigital += paymentAmount;
                    }
                });
            }
        });

        // Calculate services
        this.todayData.services.forEach(service => {
            // Count advance payments
            if (service.advance_amount) {
                const amount = parseFloat(service.advance_amount);
                servicesTotal += amount;
                
                if (service.advance_payment_method === 'cash') {
                    servicesCash += amount;
                } else {
                    servicesDigital += amount;
                }
            }

            // Count final payments for completed services
            if (service.status === 'service_completed' && service.final_payment_amount) {
                const amount = parseFloat(service.final_payment_amount);
                servicesTotal += amount;
                
                if (service.final_payment_method === 'cash') {
                    servicesCash += amount;
                } else {
                    servicesDigital += amount;
                }
            }
        });

        // Calculate expenses
        this.todayData.expenses.forEach(expense => {
            const amount = parseFloat(expense.amount || 0);
            expensesTotal += amount;
            
            if (expense.payment_mode === 'cash') {
                expensesCash += amount;
            } else {
                expensesDigital += amount;
            }
        });

        const totalIncome = salesTotal + servicesTotal;
        const netIncome = totalIncome - expensesTotal;
        const totalCashFlow = (salesCash + servicesCash) - expensesCash;
        const totalDigitalFlow = (salesDigital + servicesDigital) - expensesDigital;

        return `
            <div class="cob-report">
                <div class="cob-header">
                    <h3>Close of Business Report</h3>
                    <p><strong>Date:</strong> ${todayStr}</p>
                    <p><strong>Prepared by:</strong> ${this.currentUser.full_name}</p>
                </div>

                <div class="cob-section">
                    <h4>Transaction Summary</h4>
                    <div class="cob-stats-grid">
                        <div class="cob-stat-card">
                            <h5>Sales</h5>
                            <div class="stat-value">₹${salesTotal.toFixed(2)}</div>
                            <div class="stat-breakdown">
                                <span>Cash: ₹${salesCash.toFixed(2)}</span>
                                <span>Digital: ₹${salesDigital.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="cob-stat-card">
                            <h5>Services</h5>
                            <div class="stat-value">₹${servicesTotal.toFixed(2)}</div>
                            <div class="stat-breakdown">
                                <span>Cash: ₹${servicesCash.toFixed(2)}</span>
                                <span>Digital: ₹${servicesDigital.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="cob-stat-card">
                            <h5>Expenses</h5>
                            <div class="stat-value expense">₹${expensesTotal.toFixed(2)}</div>
                            <div class="stat-breakdown">
                                <span>Cash: ₹${expensesCash.toFixed(2)}</span>
                                <span>Digital: ₹${expensesDigital.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="cob-section">
                    <h4>Balance Summary</h4>
                    <div class="balance-summary">
                        <div class="balance-row">
                            <span>Previous Day Cash Balance:</span>
                            <span>₹${this.todayData.previousBalance.cash.toFixed(2)}</span>
                        </div>
                        <div class="balance-row">
                            <span>Previous Day Account Balance:</span>
                            <span>₹${this.todayData.previousBalance.account.toFixed(2)}</span>
                        </div>
                        <div class="balance-row total">
                            <span><strong>Previous Total Balance:</strong></span>
                            <span><strong>₹${(this.todayData.previousBalance.cash + this.todayData.previousBalance.account).toFixed(2)}</strong></span>
                        </div>
                        
                        <hr class="balance-divider">
                        
                        <div class="balance-row">
                            <span>Today's Cash Flow:</span>
                            <span class="${totalCashFlow >= 0 ? 'positive' : 'negative'}">₹${totalCashFlow.toFixed(2)}</span>
                        </div>
                        <div class="balance-row">
                            <span>Today's Digital Flow:</span>
                            <span class="${totalDigitalFlow >= 0 ? 'positive' : 'negative'}">₹${totalDigitalFlow.toFixed(2)}</span>
                        </div>
                        
                        <hr class="balance-divider">
                        
                        <div class="balance-row">
                            <span>Current Cash Balance:</span>
                            <span>₹${this.todayData.currentBalance.cash.toFixed(2)}</span>
                        </div>
                        <div class="balance-row">
                            <span>Current Account Balance:</span>
                            <span>₹${this.todayData.currentBalance.account.toFixed(2)}</span>
                        </div>
                        <div class="balance-row total final">
                            <span><strong>Current Total Balance:</strong></span>
                            <span><strong>₹${(this.todayData.currentBalance.cash + this.todayData.currentBalance.account).toFixed(2)}</strong></span>
                        </div>
                        
                        <div class="balance-row net-change">
                            <span><strong>Net Change Today:</strong></span>
                            <span class="${netIncome >= 0 ? 'positive' : 'negative'}"><strong>₹${netIncome.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>

                <div class="cob-section">
                    <h4>Transaction Details</h4>
                    <div class="transaction-details">
                        <div class="detail-section">
                            <h5>Sales Transactions (${this.todayData.sales.length})</h5>
                            ${this.todayData.sales.length > 0 ? `
                                <table class="cob-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Invoice</th>
                                            <th>Customer</th>
                                            <th>Amount</th>
                                            <th>Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.todayData.sales.map(sale => `
                                            <tr>
                                                <td>${new Date(sale.created_at).toLocaleTimeString()}</td>
                                                <td>${sale.invoice_number || 'N/A'}</td>
                                                <td>${sale.customer_name || 'Walk-in'}</td>
                                                <td>₹${parseFloat(sale.total_amount || 0).toFixed(2)}</td>
                                                <td>${sale.payments ? sale.payments.map(p => p.payment_method.toUpperCase()).join(', ') : 'N/A'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p>No sales transactions today</p>'}
                        </div>

                        <div class="detail-section">
                            <h5>Service Transactions (${this.todayData.services.length})</h5>
                            ${this.todayData.services.length > 0 ? `
                                <table class="cob-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Job #</th>
                                            <th>Customer</th>
                                            <th>Advance</th>
                                            <th>Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.todayData.services.map(service => `
                                            <tr>
                                                <td>${new Date(service.created_at).toLocaleTimeString()}</td>
                                                <td>${service.job_number || 'N/A'}</td>
                                                <td>${service.customer_name || 'Walk-in'}</td>
                                                <td>₹${parseFloat(service.advance_amount || 0).toFixed(2)}</td>
                                                <td>${service.advance_payment_method ? service.advance_payment_method.toUpperCase() : 'N/A'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p>No service transactions today</p>'}
                        </div>

                        <div class="detail-section">
                            <h5>Expense Transactions (${this.todayData.expenses.length})</h5>
                            ${this.todayData.expenses.length > 0 ? `
                                <table class="cob-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.todayData.expenses.map(expense => `
                                            <tr>
                                                <td>${new Date(expense.created_at).toLocaleTimeString()}</td>
                                                <td>${expense.description}</td>
                                                <td>₹${parseFloat(expense.amount || 0).toFixed(2)}</td>
                                                <td>${expense.payment_mode.toUpperCase()}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p>No expense transactions today</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async printCOBReport() {
        const cobContent = document.getElementById('cobSummaryContent').innerHTML;
        const nextDayNotes = document.getElementById('nextDayNotes').value;
        
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>COB Report - ${new Date().toDateString()}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
                    .cob-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .cob-section { margin: 20px 0; }
                    .cob-section h4 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                    .cob-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
                    .cob-stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
                    .cob-stat-card h5 { margin: 0 0 10px 0; color: #666; }
                    .stat-value { font-size: 20px; font-weight: bold; color: #333; }
                    .stat-value.expense { color: #e74c3c; }
                    .stat-breakdown { margin-top: 8px; font-size: 12px; color: #666; }
                    .stat-breakdown span { display: block; }
                    .balance-summary { margin: 15px 0; }
                    .balance-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
                    .balance-row.total { font-weight: bold; border-bottom: 2px solid #333; }
                    .balance-row.final { background: #f8f9fa; padding: 12px; margin: 10px 0; border: 2px solid #333; }
                    .balance-row.net-change { background: #e8f5e8; padding: 12px; margin: 10px 0; }
                    .balance-divider { margin: 15px 0; border: 1px solid #ddd; }
                    .positive { color: #27ae60; }
                    .negative { color: #e74c3c; }
                    .cob-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
                    .cob-table th, .cob-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .cob-table th { background: #f5f5f5; font-weight: bold; }
                    .detail-section { margin: 20px 0; }
                    .detail-section h5 { color: #555; margin-bottom: 10px; }
                    .notes-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #333; }
                    .notes-section h4 { color: #333; }
                    .notes-content { background: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 10px 0; }
                    @media print { 
                        body { margin: 0; } 
                        .cob-stats-grid { grid-template-columns: repeat(3, 1fr); }
                    }
                </style>
            </head>
            <body>
                ${cobContent}
                ${nextDayNotes ? `
                    <div class="notes-section">
                        <h4>Notes for Next Day</h4>
                        <div class="notes-content">
                            ${nextDayNotes.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
                    <p>Generated on ${new Date().toLocaleString()}</p>
                    <p>WATCH SHOP - Daily Business Report</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    async completeCOB() {
        const nextDayNotes = document.getElementById('nextDayNotes').value;
        
        if (!nextDayNotes.trim()) {
            alert('Please add notes for the next day before completing COB');
            return;
        }

        const confirmMsg = 'Are you sure you want to complete Close of Business? This will:\n\n' +
                          '• Lock today\'s transactions\n' +
                          '• Save current balances\n' +
                          '• Set up for tomorrow\'s business\n\n' +
                          'This action cannot be undone.';
        
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            // Save COB data
            const cobData = {
                date: new Date().toISOString().split('T')[0],
                balances: this.todayData.currentBalance,
                transactions: {
                    sales: this.todayData.sales.length,
                    services: this.todayData.services.length,
                    expenses: this.todayData.expenses.length
                },
                nextDayNotes: nextDayNotes,
                completedBy: this.currentUser.id,
                completedAt: new Date().toISOString()
            };

            const result = await ipcRenderer.invoke('complete-cob', cobData);
            
            if (result.success) {
                alert('Close of Business completed successfully!\n\nToday\'s business has been finalized and balances have been saved.');
                
                // Close modal and refresh data
                closeModal('cobModal');
                await this.refreshData();
            } else {
                alert('Error completing COB. Please try again.');
            }
        } catch (error) {
            console.error('Error completing COB:', error);
            alert('Error completing COB. Please try again.');
        }
    }

    // Utility methods for other modules to use
    async viewSaleDetails(saleId) {
        try {
            // This would integrate with sales module to show details
            if (window.salesModule && window.salesModule().viewSaleDetails) {
                window.salesModule().viewSaleDetails(saleId);
            } else {
                alert('Sales module not available');
            }
        } catch (error) {
            console.error('Error viewing sale details:', error);
            alert('Error loading sale details');
        }
    }

    // Method for external modules to trigger ledger refresh
    async notifyTransaction() {
        if (this.isInitialized) {
            await this.refreshData();
        }
    }

    // Get today's summary for dashboard
    getTodaySummary() {
        const totalSales = this.todayData.sales.reduce((sum, sale) => 
            sum + parseFloat(sale.total_amount || 0), 0);
        const totalServices = this.todayData.services.reduce((sum, service) => 
            sum + parseFloat(service.advance_amount || 0), 0);
        const totalExpenses = this.todayData.expenses.reduce((sum, expense) => 
            sum + parseFloat(expense.amount || 0), 0);

        return {
            salesCount: this.todayData.sales.length,
            servicesCount: this.todayData.services.length,
            expensesCount: this.todayData.expenses.length,
            totalSales,
            totalServices,
            totalExpenses,
            netIncome: totalSales + totalServices - totalExpenses,
            currentBalance: this.todayData.currentBalance
        };
    }
}

// Global functions for HTML onclick handlers
window.openLedgerModal = function() {
    const ledgerModule = window.ledgerModule();
    if (ledgerModule) {
        ledgerModule.openCOBModal();
    }
};

module.exports = LedgerModule;