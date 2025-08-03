// src/components/service-content.js - Service content
window.ServiceContent = {
    getHTML: () => `
        <div class="service-container">
            <!-- Service Form -->
            <div class="service-form-container">
                <h3>New Service Job</h3>
                
                <!-- Customer Selection -->
                <div class="form-section">
                    <h4>Customer Details</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="serviceCustomerSearch">Search Customer</label>
                            <div class="search-input-container">
                                <input type="text" id="serviceCustomerSearch" placeholder="Search by name or phone number">
                                <div id="serviceCustomerSuggestions" class="suggestions-dropdown"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="serviceSelectedCustomer">Selected Customer</label>
                            <input type="text" id="serviceSelectedCustomer" readonly placeholder="No customer selected">
                            <input type="hidden" id="serviceSelectedCustomerId">
                        </div>
                    </div>
                </div>

                <!-- Service Items -->
                <div class="form-section">
                    <h4>Service Items</h4>
                    <div id="serviceItemsContainer">
                        <!-- Service items will be added dynamically -->
                    </div>
                    <button type="button" onclick="addServiceItem()" class="btn btn-primary">Add Item</button>
                </div>

                <!-- Job Details -->
                <div class="form-section">
                    <h4>Job Details</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="estimatedCost">Estimated Cost</label>
                            <input type="number" id="estimatedCost" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="advanceAmount">Advance Amount</label>
                            <input type="number" id="advanceAmount" step="0.01" min="0" value="0">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="advancePaymentMethod">Advance Payment Method</label>
                            <select id="advancePaymentMethod">
                                <option value="">No Advance</option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="advancePaymentReference">Payment Reference</label>
                            <input type="text" id="advancePaymentReference" placeholder="Optional">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="approximateDeliveryDate">Approximate Delivery Date</label>
                            <input type="date" id="approximateDeliveryDate" required>
                        </div>
                        <div class="form-group">
                            <label for="serviceLocation">Location</label>
                            <select id="serviceLocation" required>
                                <option value="">Select Location</option>
                                <option value="semmancheri">Semmancheri</option>
                                <option value="navalur">Navalur</option>
                                <option value="padur">Padur</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="serviceJobComments">Comments</label>
                        <textarea id="serviceJobComments" rows="3" placeholder="Any additional notes"></textarea>
                    </div>
                </div>

                <!-- Actions -->
                <div class="form-section">
                    <div class="form-actions">
                        <button type="button" onclick="clearServiceJob()" class="btn btn-secondary">Clear</button>
                        <button type="button" onclick="createServiceJob()" class="btn btn-primary">Create Service Job</button>
                    </div>
                </div>
            </div>

            <!-- Service Jobs List -->
            <div class="service-jobs-container">
                <h3>Service Jobs</h3>
                
                <div class="service-search-container">
                    <input type="text" id="serviceJobSearch" placeholder="Search by job number, customer name, or phone">
                    <button onclick="searchServiceJobs()" class="btn btn-secondary">Search</button>
                    <button onclick="clearServiceSearch()" class="btn btn-secondary">Clear</button>
                </div>

                <div class="service-jobs-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Job #</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Location</th>
                                <th>Est. Cost</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="serviceJobsTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
};