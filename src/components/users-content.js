// src/components/users-content.js - Users content
window.UsersContent = {
    getHTML: () => `
        <div class="data-table-container">
            <table class="data-table" id="usersTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    <!-- Dynamic content -->
                </tbody>
            </table>
        </div>
    `
};