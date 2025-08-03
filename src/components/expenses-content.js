// src/components/expenses-content.js - Expenses content
window.ExpensesContent = {
    getHTML: () => `
        <div class="expenses-container">
            <div class="expenses-form-container">
                <h3>Add New Expense</h3>
                
                <form id="expenseForm" class="expense-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseDate">Date *</label>
                            <input type="date" id="expenseDate" required>
                        </div>
                        <div class="form-group">
                            <label for="expenseAmount">Amount *</label>
                            <input type="number" id="expenseAmount" step="0.01" min="0" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseMode">Payment Mode *</label>
                            <select id="expenseMode" required>
                                <option value="">Select Mode</option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="expenseDescription">Description *</label>
                        <textarea id="expenseDescription" rows="3" required placeholder="Enter expense description"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="clearExpenseForm()" class="btn btn-secondary">Clear</button>
                        <button type="submit" class="btn btn-primary">Add Expense</button>
                    </div>
                </form>
            </div>

            <div class="expenses-list-container">
                <h3>Expenses List</h3>
                
                <div class="expenses-controls">
                    <div class="search-container">
                        <input type="text" id="expenseSearch" placeholder="Search expenses..." class="search-input">
                        <button onclick="searchExpenses()" class="btn btn-secondary">Search</button>
                        <button onclick="clearExpenseSearch()" class="btn btn-secondary">Clear</button>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table" id="expensesTable">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Mode</th>
                                <th>Added By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="expensesTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
};