// src/modules/ledger.js - Ledger and Daily Business Tracking Module
const { ipcRenderer } = require('electron');

class LedgerModule {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.todaysData = {
            sales: [],
            services: [],
            expenses: [],
            summary: {
                salesTotal: 0,
                servicesTotal: 0,
                expensesTotal: 0,
                cashBalance: 0,
                accountBalance: 0,
                previousCashBalance: 0,
                previousAccountBalance: 0
            },
            paymentBreakdown: {
                cash: { sales: 0, services: 0, expenses: 0, total: 0 },
                upi: { sales: 0, services: 0, expenses: 0, total: 0 },
                card: { sales: 0, services: 0, expenses: 0, total: 0 }
            }
        };
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        await this.loadTodaysData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Date change handler
        const dateSelector = document.getElementById('ledgerDate');
        if (dateSelector) {
            dateSelector.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                this.loadTodaysData();
            });
        }

        // COB form handler
        const cobForm = document.getElementById('cobForm');
        if (cobForm) {
            cobForm.addEventListener('submit', (e) => this.handleCOBSubmit(e));
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshLedger');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadTodaysData());
        }
    }

    async loadTodaysData() {
        try {
            this.showLoading(true);
            
            // Load all data in parallel
            const [sales, serviceJobs, expenses, previousBalance] = await Promise.all([
                ipcRenderer.invoke('get-sales'),
                ipcRenderer.invoke('get-service-jobs'),
                ipcRenderer.invoke('get-expenses'),
                this.getPreviousDayBalance()
            ]);

            // Filter data for selected date
            this.filterDataByDate(sales, serviceJobs, expenses);
            
            // Set previous day balance
            this.todaysData.summary.previousCashBalance = previousBalance.cashBalance;
            this.todaysData.summary.previousAccountBalance = previousBalance.accountBalance;
            
            // Calculate totals and breakdown
            this.calculateSummary();
            this.calculatePaymentBreakdown();
            
            // Update UI
            this.renderLedgerData();
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading ledger data:', error);
            showError('Error loading ledger data');
            this.showLoading(false);
        }
    }

    filterDataByDate(sales, serviceJobs, expenses) {
        // Filter sales for selected date
        this.todaysData.sales = sales.filter(sale => 
            sale.sale_date === this.selectedDate
        );

        // Filter service jobs created on selected date
        this.todaysData.services = serviceJobs.filter(job => 
            job.created_at && job.created_at.split('T')[0] === this.selectedDate
        );

        // Filter expenses for selected date
        this.todaysData.expenses = expenses.filter(expense => 
            expense.expense_date === this.selectedDate
        );
    }

    calculateSummary() {
        // Calculate sales total
        this.todaysData.summary.salesTotal = this.todaysData.sales.reduce((sum, sale) => 
            sum + parseFloat(sale.total_amount || 0), 0
        );

        // Calculate services total (use final_cost if available, otherwise estimated_cost)
        this.todaysData.summary.servicesTotal = this.todaysData.services.reduce((sum, job) => 
            sum + parseFloat(job.final_cost || job.estimated_cost || 0), 0
        );

        // Calculate expenses total
        this.todaysData.summary.expensesTotal = this.todaysData.expenses.reduce((sum, expense) => 
            sum + parseFloat(expense.amount || 0), 0
        );

        // Calculate balances
        const totalIncome = this.todaysData.summary.salesTotal + this.todaysData.summary.servicesTotal;
        const netIncome = totalIncome - this.todaysData.summary.expensesTotal;
        
        // This will be refined based on payment methods
        this.todaysData.summary.cashBalance = this.todaysData.summary.previousCashBalance;
        this.todaysData.summary.accountBalance = this.todaysData.summary.previousAccountBalance;
    }

    async calculatePaymentBreakdown() {
        try {
            // Initialize breakdown
            this.todaysData.paymentBreakdown = {
                cash: { sales: 0, services: 0, expenses: 0, total: 0 },
                upi: { sales: 0, services: 0, expenses: 0, total: 0 },
                card: { sales: 0, services: 0, expenses: 0, total: 0 }
            };

            // Process sales payments
            for (const sale of this.todaysData.sales) {
                const saleDetails = await ipcRenderer.invoke('get-sale-details', sale.id);
                saleDetails.payments.forEach(payment => {
                    const method = payment.payment_method.toLowerCase();
                    if (this.todaysData.paymentBreakdown[method]) {
                        this.todaysData.paymentBreakdown[method].sales += parseFloat(payment.amount);
                    }
                });
            }

            // Process service payments (advance + final)
            this.todaysData.services.forEach(job => {
                // Advance payment
                if (job.advance_amount && job.advance_payment_method) {
                    const method = job.advance_payment_method.toLowerCase();
                    if (this.todaysData.paymentBreakdown[method]) {
                        this.todaysData.paymentBreakdown[method].services += parseFloat(job.advance_amount);
                    }
                }
                
                // Final payment
                if (job.final_payment_amount && job.final_payment_method) {
                    const method = job.final_payment_method.toLowerCase();
                    if (this.todaysData.paymentBreakdown[method]) {
                        this.todaysData.paymentBreakdown[method].services += parseFloat(job.final_payment_amount);
                    }
                }
            });

            // Process expenses
            this.todaysData.expenses.forEach(expense => {
                const method = expense.payment_mode.toLowerCase();
                if (this.todaysData.paymentBreakdown[method]) {
                    this.todaysData.paymentBreakdown[method].expenses += parseFloat(expense.amount);
                }
            });

            // Calculate totals and balances
            Object.keys(this.todaysData.paymentBreakdown).forEach(method => {
                const breakdown = this.todaysData.paymentBreakdown[method];
                breakdown.total = breakdown.sales + breakdown.services - breakdown.expenses;
                
                // Update balances based on payment method
                if (method === 'cash') {
                    this.todaysData.summary.cashBalance = 
                        this.todaysData.summary.previousCashBalance + breakdown.total;
                } else {
                    this.todaysData.summary.accountBalance = 
                        this.todaysData.summary.previousAccountBalance + breakdown.total;
                }
            });

        } catch (error) {
            console.error('Error calculating payment breakdown:', error);
        }
    }

    async getPreviousDayBalance() {
        try {
            // Get previous day's COB record
            const previousDate = new Date(this.selectedDate);
            previousDate.setDate(previousDate.getDate() - 1);
            const prevDateStr = previousDate.toISOString().split('T')[0];
            
            const previousCOB = await ipcRenderer.invoke('get-cob-record', prevDateStr);
            
            if (previousCOB) {
                return {
                    cashBalance: parseFloat(previousCOB.closing_cash_balance || 0),
                    accountBalance: parseFloat(previousCOB.closing_account_balance || 0)
                };
            }
            
            return { cashBalance: 0, accountBalance: 0 };
        } catch (error) {
            console.error('Error getting previous day balance:', error);
            return { cashBalance: 0, accountBalance: 0 };
        }
    }

    renderLedgerData() {
        this.renderSummaryCards();
        this.renderTransactionsTables();
        this.renderPaymentBreakdown();
        this.updateCOBSection();
    }

    renderSummaryCards() {
        const elements = {
            'ledgerSalesTotal': this.todaysData.summary.salesTotal,
            'ledgerServicesTotal': this.todaysData.summary.servicesTotal,
            'ledgerExpensesTotal': this.todaysData.summary.expensesTotal,
            'ledgerCashBalance': this.todaysData.summary.cashBalance,
            'ledgerAccountBalance': this.todaysData.summary.accountBalance
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = `₹${value.toFixed(2)}`;
            }
        });

        // Update net income
        const netIncome = this.todaysData.summary.salesTotal + 
                         this.todaysData.summary.servicesTotal - 
                         this.todaysData.summary.expensesTotal;
        
        const netIncomeEl = document.getElementById('ledgerNetIncome');
        if (netIncomeEl) {
            netIncomeEl.textContent = `₹${netIncome.toFixed(2)}`;
            netIncomeEl.className = netIncome >= 0 ? 'positive' : 'negative';
        }
    }

    renderTransactionsTables() {
        this.renderSalesTable();
        this.renderServicesTable();
        this.renderExpensesTable();
    }

    renderSalesTable() {
        const tbody = document.getElementById('ledgerSalesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (this.todaysData.sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No sales recorded for this date</td></tr>';
            return;
        }

        this.todaysData.sales.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>INV-S-${sale.id}</strong></td>
                <td><strong>${new Date(sale.created_at).toLocaleTimeString()}</strong></td>
                <td><strong>${sale.customer_name || 'Walk-in'}</strong></td>
                <td><strong>₹${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="ledgerModule().viewSaleDetails(${sale.id})">
                        View Details
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderServicesTable() {
        const tbody = document.getElementById('ledgerServicesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (this.todaysData.services.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No services recorded for this date</td></tr>';
            return;
        }

        this.todaysData.services.forEach(job => {
            const row = document.createElement('tr');
            const amount = parseFloat(job.final_cost || job.estimated_cost || 0);
            
            row.innerHTML = `
                <td><strong>${job.job_number}</strong></td>
                <td><strong>${new Date(job.created_at).toLocaleTimeString()}</strong></td>
                <td><strong>${job.customer_name || 'Walk-in'}</strong></td>
                <td><strong><span class="service-status ${job.status.replace('_', '-')}">${job.status.replace('_', ' ')}</span></strong></td>
                <td><strong>₹${amount.toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="ledgerModule().viewServiceDetails(${job.id})">
                        View Details
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderExpensesTable() {
        const tbody = document.getElementById('ledgerExpensesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (this.todaysData.expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No expenses recorded for this date</td></tr>';
            return;
        }

        this.todaysData.expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${new Date(expense.created_at).toLocaleTimeString()}</strong></td>
                <td><strong>${expense.description}</strong></td>
                <td><strong>₹${parseFloat(expense.amount).toFixed(2)}</strong></td>
                <td><strong><span class="payment-mode ${expense.payment_mode}">${expense.payment_mode.toUpperCase()}</span></strong></td>
                <td><strong>${expense.created_by_name || 'Unknown'}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPaymentBreakdown() {
        const container = document.getElementById('paymentBreakdownContainer');
        if (!container) return;

        container.innerHTML = Object.entries(this.todaysData.paymentBreakdown).map(([method, breakdown]) => `
            <div class="payment-breakdown-card">
                <h4>${method.toUpperCase()}</h4>
                <div class="breakdown-details">
                    <div class="breakdown-row">
                        <span>Sales Income:</span>
                        <span class="positive">+₹${breakdown.sales.toFixed(2)}</span>
                    </div>
                    <div class="breakdown-row">
                        <span>Service Income:</span>
                        <span class="positive">+₹${breakdown.services.toFixed(2)}</span>
                    </div>
                    <div class="breakdown-row">
                        <span>Expenses:</span>
                        <span class="negative">-₹${breakdown.expenses.toFixed(2)}</span>
                    </div>
                    <div class="breakdown-row total-row">
                        <span><strong>Net ${method.toUpperCase()}:</strong></span>
                        <span class="${breakdown.total >= 0 ? 'positive' : 'negative'}">
                            <strong>${breakdown.total >= 0 ? '+' : ''}₹${breakdown.total.toFixed(2)}</strong>
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCOBSection() {
        // Check if COB already done for selected date
        this.checkCOBStatus();
    }

    async checkCOBStatus() {
        try {
            const cobRecord = await ipcRenderer.invoke('get-cob-record', this.selectedDate);
            const cobSection = document.getElementById('cobSection');
            const cobStatusEl = document.getElementById('cobStatus');
            
            if (cobRecord) {
                if (cobStatusEl) {
                    cobStatusEl.innerHTML = `
                        <div class="cob-completed">
                            <h4>✅ Close of Business Completed</h4>
                            <p><strong>Closed at:</strong> ${new Date(cobRecord.created_at).toLocaleString()}</p>
                            <p><strong>Closed by:</strong> ${cobRecord.created_by_name}</p>
                            ${cobRecord.notes ? `<p><strong>Notes for next day:</strong> ${cobRecord.notes}</p>` : ''}
                            <button class="btn btn-primary" onclick="ledgerModule().generateCOBReport('${this.selectedDate}')">
                                View COB Report
                            </button>
                        </div>
                    `;
                }
                
                // Hide COB form if already completed
                const cobForm = document.getElementById('cobFormContainer');
                if (cobForm) cobForm.style.display = 'none';
                
            } else {
                if (cobStatusEl) cobStatusEl.innerHTML = '';
                
                // Show COB form only for today or past dates
                const today = new Date().toISOString().split('T')[0];
                const cobForm = document.getElementById('cobFormContainer');
                if (cobForm) {
                    cobForm.style.display = this.selectedDate <= today ? 'block' : 'none';
                }
            }
        } catch (error) {
            console.error('Error checking COB status:', error);
        }
    }

    async handleCOBSubmit(e) {
        e.preventDefault();
        
        const notes = document.getElementById('cobNotes')?.value || '';
        
        if (!confirm('Are you sure you want to close business for this day? This action cannot be undone.')) {
            return;
        }

        try {
            const cobData = {
                business_date: this.selectedDate,
                total_sales: this.todaysData.summary.salesTotal,
                total_services: this.todaysData.summary.servicesTotal,
                total_expenses: this.todaysData.summary.expensesTotal,
                cash_sales: this.todaysData.paymentBreakdown.cash.sales,
                cash_services: this.todaysData.paymentBreakdown.cash.services,
                cash_expenses: this.todaysData.paymentBreakdown.cash.expenses,
                account_sales: this.todaysData.paymentBreakdown.upi.sales + this.todaysData.paymentBreakdown.card.sales,
                account_services: this.todaysData.paymentBreakdown.upi.services + this.todaysData.paymentBreakdown.card.services,
                account_expenses: this.todaysData.paymentBreakdown.upi.expenses + this.todaysData.paymentBreakdown.card.expenses,
                opening_cash_balance: this.todaysData.summary.previousCashBalance,
                opening_account_balance: this.todaysData.summary.previousAccountBalance,
                closing_cash_balance: this.todaysData.summary.cashBalance,
                closing_account_balance: this.todaysData.summary.accountBalance,
                notes: notes,
                created_by: this.currentUser.id
            };

            await ipcRenderer.invoke('create-cob-record', cobData);
            
            showSuccess('Close of Business completed successfully!');
            
            // Clear form and refresh
            document.getElementById('cobNotes').value = '';
            await this.loadTodaysData();
            
            // Generate and show COB report
            setTimeout(() => {
                this.generateCOBReport(this.selectedDate);
            }, 1000);
            
        } catch (error) {
            console.error('Error creating COB record:', error);
            showError('Error completing Close of Business');
        }
    }

    async generateCOBReport(date) {
        try {
            const cobRecord = await ipcRenderer.invoke('get-cob-record', date);
            if (!cobRecord) {
                showError('COB record not found for this date');
                return;
            }

            // Filter data for the report date
            await this.loadDataForDate(date);
            
            this.printCOBReport(cobRecord, date);
            
        } catch (error) {
            console.error('Error generating COB report:', error);
            showError('Error generating COB report');
        }
    }

    async loadDataForDate(date) {
        const [sales, serviceJobs, expenses] = await Promise.all([
            ipcRenderer.invoke('get-sales'),
            ipcRenderer.invoke('get-service-jobs'),
            ipcRenderer.invoke('get-expenses')
        ]);

        this.selectedDate = date;
        this.filterDataByDate(sales, serviceJobs, expenses);
        await this.calculatePaymentBreakdown();
    }

    printCOBReport(cobRecord, date) {
        const printWindow = window.open('', '_blank');
        const formattedDate = new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Close of Business Report - ${formattedDate}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                    .header { text-align: center; border-bottom: 3px solid #2c3e50; margin-bottom: 30px; padding-bottom: 15px; }
                    .company-name { font-size: 28px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
                    .report-title { font-size: 20px; color: #34495e; margin-bottom: 5px; }
                    .report-date { font-size: 16px; color: #7f8c8d; }
                    
                    .section { margin-bottom: 25px; page-break-inside: avoid; }
                    .section-title { font-size: 18px; font-weight: bold; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 15px; }
                    
                    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
                    .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #3498db; }
                    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
                    .summary-value { font-size: 18px; font-weight: bold; color: #2c3e50; }
                    
                    .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    .table th { background: #34495e; color: white; font-weight: bold; }
                    .table tbody tr:nth-child(even) { background: #f9f9f9; }
                    
                    .payment-breakdown { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
                    .payment-card { background: #f8f9fa; border-radius: 6px; padding: 15px; border-left: 4px solid #e67e22; }
                    .payment-method { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; text-transform: uppercase; }
                    .payment-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .payment-total { border-top: 2px solid #2c3e50; padding-top: 8px; margin-top: 8px; font-weight: bold; }
                    
                    .balance-section { background: #2c3e50; color: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
                    .balance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                    .balance-item { text-align: center; }
                    .balance-label { font-size: 14px; opacity: 0.8; margin-bottom: 5px; }
                    .balance-value { font-size: 20px; font-weight: bold; }
                    
                    .notes-section { background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; }
                    
                    .footer { margin-top: 40px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; color: #666; }
                    
                    .positive { color: #27ae60; }
                    .negative { color: #e74c3c; }
                    
                    @media print {
                        body { margin: 10mm; }
                        .section { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">⌚ Watch Shop</div>
                    <div class="report-title">Close of Business Report</div>
                    <div class="report-date">${formattedDate}</div>
                </div>

                <div class="section">
                    <div class="section-title">📊 Business Summary</div>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <div class="summary-label">Total Sales</div>
                            <div class="summary-value positive">₹${parseFloat(cobRecord.total_sales).toFixed(2)}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">Total Services</div>
                            <div class="summary-value positive">₹${parseFloat(cobRecord.total_services).toFixed(2)}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">Total Expenses</div>
                            <div class="summary-value negative">₹${parseFloat(cobRecord.total_expenses).toFixed(2)}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">Net Income</div>
                            <div class="summary-value ${(parseFloat(cobRecord.total_sales) + parseFloat(cobRecord.total_services) - parseFloat(cobRecord.total_expenses)) >= 0 ? 'positive' : 'negative'}">
                                ₹${(parseFloat(cobRecord.total_sales) + parseFloat(cobRecord.total_services) - parseFloat(cobRecord.total_expenses)).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">💳 Payment Method Breakdown</div>
                    <div class="payment-breakdown">
                        <div class="payment-card">
                            <div class="payment-method">💵 Cash</div>
                            <div class="payment-row">
                                <span>Sales:</span>
                                <span class="positive">+₹${parseFloat(cobRecord.cash_sales || 0).toFixed(2)}</span>
                            </div>
                            <div class="payment-row">
                                <span>Services:</span>
                                <span class="positive">+₹${parseFloat(cobRecord.cash_services || 0).toFixed(2)}</span>
                            </div>
                            <div class="payment-row">
                                <span>Expenses:</span>
                                <span class="negative">-₹${parseFloat(cobRecord.cash_expenses || 0).toFixed(2)}</span>
                            </div>
                            <div class="payment-row payment-total">
                                <span>Net Cash:</span>
                                <span class="${(parseFloat(cobRecord.cash_sales || 0) + parseFloat(cobRecord.cash_services || 0) - parseFloat(cobRecord.cash_expenses || 0)) >= 0 ? 'positive' : 'negative'}">
                                    ₹${(parseFloat(cobRecord.cash_sales || 0) + parseFloat(cobRecord.cash_services || 0) - parseFloat(cobRecord.cash_expenses || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        
                        <div class="payment-card">
                            <div class="payment-method">🏦 Account (UPI/Card)</div>
                            <div class="payment-row">
                                <span>Sales:</span>
                                <span class="positive">+₹${parseFloat(cobRecord.account_sales || 0).toFixed(2)}</span>
                            </div>
                            <div class="payment-row">
                                <span>Services:</span>
                                <span class="positive">+₹${parseFloat(cobRecord.account_services || 0).toFixed(2)}</span>
                            </div>
                            <div class="payment-row">
                                <span>Expenses:</span>
                                <span class="negative">-₹${parseFloat(cobRecord.account_expenses || 0).toFixed(2)}</span>
                            </div>
                            <div class="payment-row payment-total">
                                <span>Net Account:</span>
                                <span class="${(parseFloat(cobRecord.account_sales || 0) + parseFloat(cobRecord.account_services || 0) - parseFloat(cobRecord.account_expenses || 0)) >= 0 ? 'positive' : 'negative'}">
                                    ₹${(parseFloat(cobRecord.account_sales || 0) + parseFloat(cobRecord.account_services || 0) - parseFloat(cobRecord.account_expenses || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">💰 Balance Sheet</div>
                    <div class="balance-section">
                        <div class="balance-grid">
                            <div class="balance-item">
                                <div class="balance-label">Opening Cash Balance</div>
                                <div class="balance-value">₹${parseFloat(cobRecord.opening_cash_balance || 0).toFixed(2)}</div>
                            </div>
                            <div class="balance-item">
                                <div class="balance-label">Closing Cash Balance</div>
                                <div class="balance-value">₹${parseFloat(cobRecord.closing_cash_balance || 0).toFixed(2)}</div>
                            </div>
                            <div class="balance-item">
                                <div class="balance-label">Opening Account Balance</div>
                                <div class="balance-value">₹${parseFloat(cobRecord.opening_account_balance || 0).toFixed(2)}</div>
                            </div>
                            <div class="balance-item">
                                <div class="balance-label">Closing Account Balance</div>
                                <div class="balance-value">₹${parseFloat(cobRecord.closing_account_balance || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">📋 Transaction Details</div>
                    
                    <h4>💰 Sales Transactions</h4>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Invoice</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.todaysData.sales.length > 0 ? this.todaysData.sales.map(sale => `
                                <tr>
                                    <td>${new Date(sale.created_at).toLocaleTimeString()}</td>
                                    <td>INV-S-${sale.id}</td>
                                    <td>${sale.customer_name || 'Walk-in'}</td>
                                    <td>₹${parseFloat(sale.total_amount).toFixed(2)}</td>
                                    <td>Mixed</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; color: #666;">No sales recorded</td></tr>'}
                        </tbody>
                    </table>

                    <h4>🔧 Service Transactions</h4>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Job Number</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.todaysData.services.length > 0 ? this.todaysData.services.map(job => `
                                <tr>
                                    <td>${new Date(job.created_at).toLocaleTimeString()}</td>
                                    <td>${job.job_number}</td>
                                    <td>${job.customer_name || 'Walk-in'}</td>
                                    <td>${job.status.replace('_', ' ')}</td>
                                    <td>₹${parseFloat(job.final_cost || job.estimated_cost || 0).toFixed(2)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; color: #666;">No services recorded</td></tr>'}
                        </tbody>
                    </table>

                    <h4>💸 Expense Transactions</h4>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Added By</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.todaysData.expenses.length > 0 ? this.todaysData.expenses.map(expense => `
                                <tr>
                                    <td>${new Date(expense.created_at).toLocaleTimeString()}</td>
                                    <td>${expense.description}</td>
                                    <td>₹${parseFloat(expense.amount).toFixed(2)}</td>
                                    <td>${expense.payment_mode.toUpperCase()}</td>
                                    <td>${expense.created_by_name || 'Unknown'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; color: #666;">No expenses recorded</td></tr>'}
                        </tbody>
                    </table>
                </div>

                ${cobRecord.notes ? `
                <div class="section">
                    <div class="section-title">📝 Notes for Next Day</div>
                    <div class="notes-section">
                        <p><strong>Instructions:</strong></p>
                        <p>${cobRecord.notes}</p>
                    </div>
                </div>
                ` : ''}

                <div class="footer">
                    <p><strong>Close of Business Report Generated on:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Generated by:</strong> ${this.currentUser.full_name}</p>
                    <p><strong>Powered by PULSEWARE</strong> - Advanced Business Solutions</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    async viewSaleDetails(saleId) {
        try {
            const saleDetails = await ipcRenderer.invoke('get-sale-details', saleId);
            // Use existing sales module to display details
            if (window.salesModule && window.salesModule().displaySaleDetails) {
                window.salesModule().displaySaleDetails(saleDetails);
                const modal = document.getElementById('saleDetailsModal');
                if (modal) modal.style.display = 'block';
            }
        } catch (error) {
            console.error('Error viewing sale details:', error);
            showError('Error loading sale details');
        }
    }

    async viewServiceDetails(jobId) {
        try {
            // Use existing service module to display details
            if (window.serviceModule && window.serviceModule().viewServiceJobDetails) {
                window.serviceModule().viewServiceJobDetails(jobId);
            }
        } catch (error) {
            console.error('Error viewing service details:', error);
            showError('Error loading service details');
        }
    }

    showLoading(show) {
        const loadingEl = document.getElementById('ledgerLoading');
        const contentEl = document.getElementById('ledgerContent');
        
        if (loadingEl && contentEl) {
            if (show) {
                loadingEl.style.display = 'block';
                contentEl.style.opacity = '0.5';
            } else {
                loadingEl.style.display = 'none';
                contentEl.style.opacity = '1';
            }
        }
    }

    // Public methods for external access
    async refreshData() {
        await this.loadTodaysData();
    }

    getCurrentData() {
        return this.todaysData;
    }

    getCurrentSummary() {
        return this.todaysData.summary;
    }
}

// Global functions for HTML onclick handlers
window.refreshLedger = function() {
    const ledgerModule = window.ledgerModule();
    if (ledgerModule) {
        ledgerModule.refreshData();
    }
};

window.initiateCOB = function() {
    const cobSection = document.getElementById('cobFormContainer');
    if (cobSection) {
        cobSection.scrollIntoView({ behavior: 'smooth' });
    }
};

module.exports = LedgerModule;