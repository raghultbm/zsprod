// src/components/customers-content.js - Customers content
window.CustomersContent = {
    getHTML: () => `
        <div class="data-table-container">
            <table class="data-table" id="customersTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
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