// src/components/inventory-content.js - Inventory content
window.InventoryContent = {
    getHTML: () => `
        <div class="inventory-controls">
            <div class="search-container">
                <input type="text" id="inventorySearch" placeholder="Search by code, brand, battery code..." class="search-input">
                <button onclick="searchInventory()" class="btn btn-secondary">Search</button>
                <button onclick="clearSearch()" class="btn btn-secondary">Clear</button>
            </div>
            <div class="filter-container">
                <select id="categoryFilter" onchange="filterByCategory()">
                    <option value="">All Categories</option>
                    <option value="watch">Watches</option>
                    <option value="clock">Clocks</option>
                    <option value="timepiece">Timepieces</option>
                    <option value="strap">Straps</option>
                    <option value="battery">Batteries</option>
                </select>
                <select id="outletFilter" onchange="filterByOutlet()">
                    <option value="">All Outlets</option>
                    <option value="semmanchery">Semmanchery</option>
                    <option value="navalur">Navalur</option>
                    <option value="padur">Padur</option>
                </select>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table" id="inventoryTable">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Brand</th>
                        <th>Details</th>
                        <th>Quantity</th>
                        <th>Warranty</th>
                        <th>Price</th>
                        <th>Outlet</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="inventoryTableBody">
                    <!-- Dynamic content -->
                </tbody>
            </table>
        </div>
    `
};