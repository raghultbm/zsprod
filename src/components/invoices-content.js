// src/components/invoices-content.js - Invoices content
window.InvoicesContent = {
    getHTML: () => `
        <div class="invoices-container">
            <h3>All Invoices</h3>
            
            <div class="invoices-controls">
                <div class="search-container">
                    <input type="text" id="invoiceSearch" placeholder="Search by invoice number, customer name..." class="search-input">
                    <button onclick="searchInvoices()" class="btn btn-secondary">Search</button>
                    <button onclick="clearInvoiceSearch()" class="btn btn-secondary">Clear</button>
                </div>
                <div class="filter-container">
                    <select id="invoiceTypeFilter" onchange="filterInvoicesByType()">
                        <option value="">All Types</option>
                        <option value="sale">Sales Invoices</option>
                        <option value="service">Service Invoices</option>
                    </select>
                </div>
            </div>

            <div class="data-table-container">
                <table class="data-table" id="invoicesTable">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="invoicesTableBody">
                        <!-- Dynamic content -->
                    </tbody>
                </table>
            </div>
        </div>
    `
};