// src/components/customers-content.js - Updated with search controls and net value column
window.CustomersContent = {
    getHTML: () => `
        <div class="customers-controls">
            <div class="search-container">
                <input type="text" id="customerSearch" placeholder="Search by name, phone, or email..." class="search-input">
                <button onclick="searchCustomers()" class="btn btn-secondary">Search</button>
                <button onclick="clearCustomerSearch()" class="btn btn-secondary">Clear</button>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table" id="customersTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Net Value</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="customersTableBody">
                    <!-- Dynamic content -->
                </tbody>
            </table>
        </div>
    `
};