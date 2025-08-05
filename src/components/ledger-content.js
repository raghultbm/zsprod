// src/components/ledger-content.js - Ledger module HTML content
window.LedgerContent = {
    getHTML: () => `
        <div class="ledger-container">
            <!-- Loading Indicator -->
            <div id="ledgerLoading" class="ledger-loading" style="display: none;">
                <div class="loading-spinner"></div>
                <span>Loading ledger data...</span>
            </div>

            <!-- Ledger Content -->
            <div id="ledgerContent">
                <!-- Date Selection and Controls -->
                <div class="ledger-controls">
                    <div class="date-selector">
                        <label for="ledgerDate"><strong>Business Date:</strong></label>
                        <input type="date" id="ledgerDate" class="form-control">
                    </div>
                    <div class="control-buttons">
                        <button id="refreshLedger" class="btn btn-secondary">
                            🔄 Refresh Data
                        </button>
                        <button onclick="initiateCOB()" class="btn btn-primary">
                            🔒 Initiate COB
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="ledger-summary">
                    <div class="summary-grid">
                        <div class="summary-card positive">
                            <div class="summary-icon">💰</div>
                            <div class="summary-content">
                                <div class="summary-label">Sales Total</div>
                                <div class="summary-value" id="ledgerSalesTotal">₹0.00</div>
                            </div>
                        </div>
                        
                        <div class="summary-card positive">
                            <div class="summary-icon">🔧</div>
                            <div class="summary-content">
                                <div class="summary-label">Services Total</div>
                                <div class="summary-value" id="ledgerServicesTotal">₹0.00</div>
                            </div>
                        </div>
                        
                        <div class="summary-card negative">
                            <div class="summary-icon">💸</div>
                            <div class="summary-content">
                                <div class="summary-label">Expenses Total</div>
                                <div class="summary-value" id="ledgerExpensesTotal">₹0.00</div>
                            </div>
                        </div>
                        
                        <div class="summary-card">
                            <div class="summary-icon">📊</div>
                            <div class="summary-content">
                                <div class="summary-label">Net Income</div>
                                <div class="summary-value" id="ledgerNetIncome">₹0.00</div>
                            </div>
                        </div>
                        
                        <div class="summary-card cash">
                            <div class="summary-icon">💵</div>
                            <div class="summary-content">
                                <div class="summary-label">Cash Balance</div>
                                <div class="summary-value" id="ledgerCashBalance">₹0.00</div>
                            </div>
                        </div>
                        
                        <div class="summary-card account">
                            <div class="summary-icon">🏦</div>
                            <div class="summary-content">
                                <div class="summary-label">Account Balance</div>
                                <div class="summary-value" id="ledgerAccountBalance">₹0.00</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Payment Method Breakdown -->
                <div class="payment-breakdown-section">
                    <h3>💳 Payment Method Breakdown</h3>
                    <div id="paymentBreakdownContainer" class="payment-breakdown-grid">
                        <!-- Dynamic content will be inserted here -->
                    </div>
                </div>

                <!-- Transactions Tables -->
                <div class="transactions-section">
                    <div class="transaction-tabs">
                        <button class="tab-btn active" onclick="switchTransactionTab('sales')">
                            💰 Sales (${document.getElementById('ledgerSalesCount')?.textContent || '0'})
                        </button>
                        <button class="tab-btn" onclick="switchTransactionTab('services')">
                            🔧 Services (${document.getElementById('ledgerServicesCount')?.textContent || '0'})
                        </button>
                        <button class="tab-btn" onclick="switchTransactionTab('expenses')">
                            💸 Expenses (${document.getElementById('ledgerExpensesCount')?.textContent || '0'})
                        </button>
                    </div>

                    <!-- Sales Table -->
                    <div id="salesTransactionTab" class="transaction-tab active">
                        <div class="transaction-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th><strong>Invoice #</strong></th>
                                        <th><strong>Time</strong></th>
                                        <th><strong>Customer</strong></th>
                                        <th><strong>Amount</strong></th>
                                        <th><strong>Actions</strong></th>
                                    </tr>
                                </thead>
                                <tbody id="ledgerSalesTableBody">
                                    <tr><td colspan="5" class="no-data">Loading sales data...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Services Table -->
                    <div id="servicesTransactionTab" class="transaction-tab">
                        <div class="transaction-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th><strong>Job #</strong></th>
                                        <th><strong>Time</strong></th>
                                        <th><strong>Customer</strong></th>
                                        <th><strong>Status</strong></th>
                                        <th><strong>Amount</strong></th>
                                        <th><strong>Actions</strong></th>
                                    </tr>
                                </thead>
                                <tbody id="ledgerServicesTableBody">
                                    <tr><td colspan="6" class="no-data">Loading services data...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Expenses Table -->
                    <div id="expensesTransactionTab" class="transaction-tab">
                        <div class="transaction-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th><strong>Time</strong></th>
                                        <th><strong>Description</strong></th>
                                        <th><strong>Amount</strong></th>
                                        <th><strong>Payment Mode</strong></th>
                                        <th><strong>Added By</strong></th>
                                    </tr>
                                </thead>
                                <tbody id="ledgerExpensesTableBody">
                                    <tr><td colspan="5" class="no-data">Loading expenses data...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- COB Status Display -->
                <div id="cobStatus" class="cob-status-section">
                    <!-- Dynamic COB status will be displayed here -->
                </div>

                <!-- Close of Business Section -->
                <div id="cobFormContainer" class="cob-section">
                    <div class="cob-header">
                        <h3>🔒 Close of Business</h3>
                        <p>Complete the end-of-day business closure process</p>
                    </div>

                    <div class="cob-summary">
                        <h4>📋 Business Summary</h4>
                        <div class="cob-summary-grid">
                            <div class="cob-summary-item">
                                <span class="cob-summary-label">Total Income:</span>
                                <span class="cob-summary-value positive" id="cobTotalIncome">₹0.00</span>
                            </div>
                            <div class="cob-summary-item">
                                <span class="cob-summary-label">Total Expenses:</span>
                                <span class="cob-summary-value negative" id="cobTotalExpenses">₹0.00</span>
                            </div>
                            <div class="cob-summary-item">
                                <span class="cob-summary-label">Net Income:</span>
                                <span class="cob-summary-value" id="cobNetIncome">₹0.00</span>
                            </div>
                        </div>
                    </div>

                    <form id="cobForm" class="cob-form">
                        <div class="form-group">
                            <label for="cobNotes"><strong>Notes for Next Day:</strong></label>
                            <textarea 
                                id="cobNotes" 
                                rows="4" 
                                placeholder="Enter tasks, reminders, or important information for tomorrow..."
                                class="form-control"
                            ></textarea>
                        </div>
                        
                        <div class="cob-actions">
                            <div class="cob-warning">
                                <p><strong>⚠️ Warning:</strong> This action will finalize the business day and cannot be undone.</p>
                            </div>
                            <button type="submit" class="btn btn-danger btn-large">
                                🔒 Complete Close of Business
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `
};

// Global function for tab switching
window.switchTransactionTab = function(tabType) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.transaction-tab');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabType}TransactionTab`);
    const selectedBtn = event.target;
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedBtn) selectedBtn.classList.add('active');
};