// src/components/service-content.js - Updated Service content with Sales-like structure
window.ServiceContent = {
    getHTML: () => `
        <div class="service-main-container">
            <div class="service-controls">
                <div class="search-container">
                    <input type="text" id="serviceSearch" placeholder="Search by job number, customer name, mobile..." class="search-input">
                    <button onclick="searchServices()" class="btn btn-secondary">Search</button>
                    <button onclick="clearServiceSearch()" class="btn btn-secondary">Clear</button>
                </div>
                <div class="filter-container">
                    <select id="serviceStatusFilter" onchange="filterServicesByStatus()">
                        <option value="">All Status</option>
                        <option value="yet_to_start">Yet to Start</option>
                        <option value="in_service_center">In Service Center</option>
                        <option value="service_completed">Service Completed</option>
                        <option value="delivered">Delivered</option>
                        <option value="returned_to_customer">Returned to Customer</option>
                        <option value="to_be_returned_to_customer">To be Returned to Customer</option>
                    </select>
                    <select id="serviceLocationFilter" onchange="filterServicesByLocation()">
                        <option value="">All Locations</option>
                        <option value="semmancheri">Semmancheri</option>
                        <option value="navalur">Navalur</option>
                        <option value="padur">Padur</option>
                    </select>
                    <input type="date" id="serviceDateFrom" placeholder="From Date">
                    <input type="date" id="serviceDateTo" placeholder="To Date">
                    <button onclick="filterServices()" class="btn btn-secondary">Filter</button>
                </div>
            </div>
            
            <div class="data-table-container">
                <table class="data-table service-table" id="serviceTable">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Job #</th>
                            <th>Date & Time</th>
                            <th>Customer</th>
                            <th>Mobile</th>
                            <th>Status</th>
                            <th>Location</th>
                            <th>Est. Cost</th>
                            <th>Payment Mode</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="serviceTableBody">
                        <!-- Dynamic content -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- New Service Modal -->
        <div id="newServiceModal" class="modal">
            <div class="modal-content extra-large-modal responsive-modal">
                <div class="modal-header">
                    <h3>Create New Service Job</h3>
                    <span class="close-btn" onclick="closeModal('newServiceModal')">&times;</span>
                </div>
                <form id="serviceForm" class="modal-form">
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
                                <input type="text" id="serviceSelectedCustomer" readonly placeholder="No customer selected (Walk-in Customer)">
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
                                <label for="estimatedCost">Estimated Cost *</label>
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
                                <label for="approximateDeliveryDate">Approximate Delivery Date *</label>
                                <input type="date" id="approximateDeliveryDate" required>
                            </div>
                            <div class="form-group">
                                <label for="serviceLocation">Location *</label>
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

                    <div class="modal-actions">
                        <button type="button" onclick="closeModal('newServiceModal')" class="btn btn-secondary">Cancel</button>
                        <button type="button" onclick="clearServiceForm()" class="btn btn-secondary">Clear</button>
                        <button type="button" onclick="createServiceJob()" class="btn btn-primary" id="createServiceBtn">Create Service Job</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Update Service Status Modal -->
        <div id="updateServiceStatusModal" class="modal">
            <div class="modal-content responsive-modal">
                <div class="modal-header">
                    <h3>Update Service Status</h3>
                    <span class="close-btn" onclick="closeModal('updateServiceStatusModal')">&times;</span>
                </div>
                <form id="updateServiceStatusForm" class="modal-form">
                    <input type="hidden" id="updateStatusJobId">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="updateServiceStatus">Status *</label>
                            <select id="updateServiceStatus" required>
                                <option value="">Select Status</option>
                                <option value="yet_to_start">Yet to Start</option>
                                <option value="in_service_center">In Service Center</option>
                                <option value="service_completed">Service Completed</option>
                                <option value="delivered">Delivered</option>
                                <option value="returned_to_customer">Returned to Customer</option>
                                <option value="to_be_returned_to_customer">To be Returned to Customer</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="updateServiceLocation">Location *</label>
                            <select id="updateServiceLocation" required>
                                <option value="">Select Location</option>
                                <option value="semmancheri">Semmancheri</option>
                                <option value="navalur">Navalur</option>
                                <option value="padur">Padur</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="updateServiceComments">Comments</label>
                        <textarea id="updateServiceComments" rows="3" placeholder="Add comments about this status change"></textarea>
                    </div>

                    <div class="modal-actions">
                        <button type="button" onclick="closeModal('updateServiceStatusModal')" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Status</button>
                    </div>
                </form>
            </div>
        </div>
    `
};