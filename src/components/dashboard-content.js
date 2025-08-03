// src/components/dashboard-content.js - Complete Dashboard content
window.DashboardContent = {
    getHTML: () => `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Customers</h3>
                <div class="stat-number" id="totalCustomers">0</div>
            </div>
            <div class="stat-card">
                <h3>Total Items</h3>
                <div class="stat-number" id="totalItems">0</div>
            </div>
            <div class="stat-card">
                <h3>Low Stock Items</h3>
                <div class="stat-number" id="lowStockItems">0</div>
            </div>
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="stat-number" id="totalUsers">0</div>
            </div>
        </div>
        
        <div class="recent-activity">
            <h3>Recent Activity</h3>
            <p>Welcome to Watch Shop Management System!</p>
        </div>
    `
};