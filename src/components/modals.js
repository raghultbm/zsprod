    <!-- Customer Modal -->
    <div id="customerModal" class="modal">
        <div class="modal-content responsive-modal">
            <div class="modal-header">
                <h3 id="customerModalTitle">Add Customer</h3>
                <span class="close-btn" onclick="closeModal('customerModal')">&times;</span>
            </div>
            <form id="customerForm" class="modal-form">
                <input type="hidden" id="customerId">
                <div class="form-group">
                    <label for="customerName">Name *</label>
                    <input type="text" id="customerName" required>
                </div>
                <div class="form-group">
                    <label for="customerPhone">Phone</label>
                    <input type="tel" id="customerPhone">
                </div>
                <div class="form-group">
                    <label for="customerEmail">Email</label>
                    <input type="email" id="customerEmail">
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="closeModal('customerModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- User Modal -->
    <div id="userModal" class="modal">
        <div class="modal-content responsive-modal">
            <div class="modal-header">
                <h3 id="userModalTitle">Add User</h3>
                <span class="close-btn" onclick="closeModal('userModal')">&times;</span>
            </div>
            <form id="userForm" class="modal-form">
                <input type="hidden" id="userId">
                <div class="form-group">
                    <label for="userUsername">Username *</label>
                    <input type="text" id="userUsername" required>
                </div>
                <div class="form-group" id="passwordGroup">
                    <label for="userPassword">Password *</label>
                    <input type="password" id="userPassword" required>
                </div>
                <div class="form-group">
                    <label for="userFullName">Full Name *</label>
                    <input type="text" id="userFullName" required>
                </div>
                <div class="form-group">
                    <label for="userRole">Role *</label>
                    <select id="userRole" required>
                        <option value="">Select Role</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="userEmail">Email</label>
                    <input type="email" id="userEmail">
                </div>
                <div class="form-group">
                    <label for="userPhone">Phone</label>
                    <input type="tel" id="userPhone">
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="userActive" checked>
                        Active User
                    </label>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="closeModal('userModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Inventory Modal -->
    <div id="inventoryModal" class="modal">
        <div class="modal-content large-modal responsive-modal">
            <div class="modal-header">
                <h3 id="inventoryModalTitle">Add Inventory Item</h3>
                <span class="close-btn" onclick="closeModal('inventoryModal')">&times;</span>
            </div>
            <form id="inventoryForm" class="modal-form">
                <input type="hidden" id="inventoryId">
                
                <!-- Basic Information -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="itemCode">Item Code *</label>
                        <input type="text" id="itemCode" required placeholder="e.g., WTH001, CLK001">
                    </div>
                    <div class="form-group">
                        <label for="dateAdded">Date *</label>
                        <input type="date" id="dateAdded" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="itemCategory">Category *</label>
                        <select id="itemCategory" required onchange="toggleCategoryFields()">
                            <option value="">Select Category</option>
                            <option value="watch">Watch</option>
                            <option value="clock">Clock</option>
                            <option value="timepiece">Timepiece</option>
                            <option value="strap">Strap</option>
                            <option value="battery">Battery</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="itemBrand">Brand</label>
                        <input type="text" id="itemBrand">
                    </div>
                </div>

                <!-- Watch and Clock/Timepiece Fields -->
                <div id="watchClockFields" class="category-fields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="itemType">Type</label>
                            <select id="itemType">
                                <option value="">Select Type</option>
                                <option value="analog">Analog</option>
                                <option value="digital">Digital</option>
                            </select>
                        </div>
                        <!-- Gender field - only for watches -->
                        <div class="form-group" id="genderField" style="display: none;">
                            <label for="itemGender">Gender</label>
                            <select id="itemGender">
                                <option value="">Select Gender</option>
                                <option value="gents">Gents</option>
                                <option value="ladies">Ladies</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Strap Fields -->
                <div id="strapFields" class="category-fields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="itemMaterial">Material</label>
                            <select id="itemMaterial">
                                <option value="">Select Material</option>
                                <option value="leather">Leather</option>
                                <option value="fiber">Fiber</option>
                                <option value="chain">Chain</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="itemSize">Size (mm)</label>
                            <input type="number" id="itemSize" min="1" placeholder="e.g., 20, 22, 24">
                        </div>
                    </div>
                </div>

                <!-- Battery Fields -->
                <div id="batteryFields" class="category-fields" style="display: none;">
                    <div class="form-group">
                        <label for="itemBatteryCode">Battery Code</label>
                        <input type="text" id="itemBatteryCode" placeholder="e.g., SR626SW, LR44">
                    </div>
                </div>

                <!-- Common Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="itemQuantity">Quantity *</label>
                        <input type="number" id="itemQuantity" required min="0" value="0">
                    </div>
                    <div class="form-group">
                        <label for="itemWarranty">Warranty Period (Months)</label>
                        <input type="number" id="itemWarranty" min="0" placeholder="e.g., 12, 24">
                    </div>
                </div>

<div class="form-row">
    <div class="form-group">
        <label for="itemPrice">Price *</label>
        <input type="number" id="itemPrice" name="itemPrice" required step="0.01" min="0" placeholder="Enter price">
    </div>
    <div class="form-group">
        <label for="itemOutlet">Outlet *</label>
        <select id="itemOutlet" required>
            <option value="">Select Outlet</option>
            <option value="semmanchery">Semmanchery</option>
            <option value="navalur">Navalur</option>
            <option value="padur">Padur</option>
        </select>
    </div>
</div>

                <div class="form-group">
                    <label for="itemComments">Comments</label>
                    <textarea id="itemComments" rows="3" placeholder="Additional notes or description"></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" onclick="closeModal('inventoryModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Item</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Sale Confirmation Modal -->
    <div id="saleConfirmationModal" class="modal">
        <div class="modal-content large-modal responsive-modal">
            <div class="modal-header">
                <h3>Confirm Sale & Generate Invoice</h3>
                <span class="close-btn" onclick="closeModal('saleConfirmationModal')">&times;</span>
            </div>
            <div class="modal-body">
                <div class="confirmation-section">
                    <h4>Customer Details</h4>
                    <p id="confirmCustomerDetails">No customer selected</p>
                </div>

                <div class="confirmation-section">
                    <h4>Items</h4>
                    <table class="confirmation-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Discount</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="confirmItemsTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>

                <div class="confirmation-section">
                    <h4>Payment Details</h4>
                    <div id="confirmPaymentDetails">
                        <!-- Dynamic content -->
                    </div>
                </div>

                <div class="confirmation-section">
                    <h4>Sale Summary</h4>
                    <div class="confirmation-summary">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span id="confirmSubtotal">₹0.00</span>
                        </div>
                        <div class="summary-row">
                            <span>Total Discount:</span>
                            <span id="confirmTotalDiscount">₹0.00</span>
                        </div>
                        <div class="summary-row total-row">
                            <span>Total Amount:</span>
                            <span id="confirmTotalAmount">₹0.00</span>
                        </div>
                    </div>
                </div>

                <div class="confirmation-section">
                    <label for="saleNotes">Notes (Optional)</label>
                    <textarea id="saleNotes" rows="3" placeholder="Add any additional notes for this sale"></textarea>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" onclick="closeModal('saleConfirmationModal')" class="btn btn-secondary">Cancel</button>
                <button type="button" onclick="confirmSale()" class="btn btn-primary">Confirm Sale & Generate Invoice</button>
            </div>
        </div>
    </div>

    <!-- Sale Details Modal -->
    <div id="saleDetailsModal" class="modal">
        <div class="modal-content large-modal responsive-modal">
            <div class="modal-header">
                <h3>Sale Details</h3>
                <span class="close-btn" onclick="closeModal('saleDetailsModal')">&times;</span>
            </div>
            <div class="modal-body" id="saleDetailsContent">
                <!-- Dynamic content -->
            </div>
            <div class="modal-actions">
                <button type="button" onclick="closeModal('saleDetailsModal')" class="btn btn-secondary">Close</button>
                <button type="button" onclick="printSaleReceipt()" class="btn btn-primary">Print Receipt</button>
            </div>
        </div>
    </div>

    <!-- Service Item Modal -->
    <div id="serviceItemModal" class="modal">
        <div class="modal-content large-modal responsive-modal">
            <div class="modal-header">
                <h3 id="serviceItemModalTitle">Add Service Item</h3>
                <span class="close-btn" onclick="closeModal('serviceItemModal')">&times;</span>
            </div>
            <form id="serviceItemForm" class="modal-form">
                <input type="hidden" id="serviceItemIndex">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="serviceItemCategory">Category *</label>
                        <select id="serviceItemCategory" required onchange="toggleServiceCategoryFields()">
                            <option value="">Select Category</option>
                            <option value="watch">Watch</option>
                            <option value="wallclock">Wall Clock</option>
                            <option value="timepiece">Timepiece</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="serviceItemBrand">Brand</label>
                        <select id="serviceItemBrand">
                            <option value="">Select Brand</option>
                            <!-- Watch Brands -->
                            <option value="casio">Casio</option>
                            <option value="citizen">Citizen</option>
                            <option value="seiko">Seiko</option>
                            <option value="titan">Titan</option>
                            <option value="fastrack">Fastrack</option>
                            <option value="fossil">Fossil</option>
                            <option value="timex">Timex</option>
                            <option value="maxima">Maxima</option>
                            <option value="sonata">Sonata</option>
                            <option value="omega">Omega</option>
                            <option value="rolex">Rolex</option>
                            <option value="tissot">Tissot</option>
                            <option value="rado">Rado</option>
                            <option value="longines">Longines</option>
                            <option value="tag_heuer">Tag Heuer</option>
                            <option value="breitling">Breitling</option>
                            <option value="hamilton">Hamilton</option>
                            <option value="orient">Orient</option>
                            <option value="victorinox">Victorinox</option>
                            <option value="daniel_wellington">Daniel Wellington</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <!-- Watch Fields -->
                <div id="watchFields" class="category-fields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="serviceItemGender">Gender</label>
                            <select id="serviceItemGender">
                                <option value="">Select Gender</option>
                                <option value="gents">Gents</option>
                                <option value="ladies">Ladies</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="serviceItemCaseMaterial">Case Material</label>
                            <select id="serviceItemCaseMaterial">
                                <option value="">Select Material</option>
                                <option value="steel">Steel</option>
                                <option value="gold_tone">Gold Tone</option>
                                <option value="fiber">Fiber</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="serviceItemStrapMaterial">Strap Material</label>
                            <select id="serviceItemStrapMaterial">
                                <option value="">Select Material</option>
                                <option value="leather">Leather</option>
                                <option value="fiber">Fiber</option>
                                <option value="steel">Steel</option>
                                <option value="gold_plated">Gold Plated</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Clock Fields -->
                <div id="clockFields" class="category-fields" style="display: none;">
                    <div class="form-group">
                        <label for="serviceItemMachineChange">Machine Change Required</label>
                        <select id="serviceItemMachineChange">
                            <option value="">Select Option</option>
                            <option value="1">Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>
                </div>

                <!-- Common Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="serviceItemMovementNo">Movement Number</label>
                        <input type="text" id="serviceItemMovementNo" placeholder="Enter movement number">
                    </div>
                    <div class="form-group">
                        <label for="serviceItemProductImage">Product Image</label>
                        <input type="file" id="serviceItemProductImage" accept="image/*">
                    </div>
                </div>

                <div class="form-group">
                    <label for="serviceItemIssueDescription">Issue Description *</label>
                    <textarea id="serviceItemIssueDescription" rows="4" required placeholder="Describe the issue in detail"></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" onclick="closeModal('serviceItemModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Item</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Service Job Details Modal -->
    <div id="serviceJobDetailsModal" class="modal">
        <div class="modal-content extra-large-modal responsive-modal">
            <div class="modal-header">
                <h3>Service Job Details</h3>
                <span class="close-btn" onclick="closeModal('serviceJobDetailsModal')">&times;</span>
            </div>
            <div class="modal-body" id="serviceJobDetailsContent">
                <!-- Dynamic content -->
            </div>
            <div class="modal-actions">
                <button type="button" onclick="closeModal('serviceJobDetailsModal')" class="btn btn-secondary">Close</button>
                <button type="button" onclick="printServiceAcknowledgment()" class="btn btn-primary">Print Acknowledgment</button>
                <button type="button" onclick="printServiceInvoice()" class="btn btn-primary" id="printInvoiceBtn" style="display: none;">Print Invoice</button>
            </div>
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

    <!-- Complete Service Modal -->
    <div id="completeServiceModal" class="modal">
        <div class="modal-content responsive-modal">
            <div class="modal-header">
                <h3>Complete Service</h3>
                <span class="close-btn" onclick="closeModal('completeServiceModal')">&times;</span>
            </div>
            <form id="completeServiceForm" class="modal-form">
                <input type="hidden" id="completeServiceJobId">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="finalCost">Final Cost *</label>
                        <input type="number" id="finalCost" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="finalPaymentAmount">Final Payment Amount *</label>
                        <input type="number" id="finalPaymentAmount" step="0.01" min="0" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="finalPaymentMethod">Payment Method *</label>
                        <select id="finalPaymentMethod" required>
                            <option value="">Select Method</option>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="finalPaymentReference">Payment Reference</label>
                        <input type="text" id="finalPaymentReference" placeholder="Optional">
                    </div>
                </div>

                <div class="form-group">
                    <label for="actualDeliveryDate">Actual Delivery Date *</label>
                    <input type="date" id="actualDeliveryDate" required>
                </div>

                <div class="modal-actions">
                    <button type="button" onclick="closeModal('completeServiceModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Complete Service</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Add Comment Modal -->
    <div id="addCommentModal" class="modal">
        <div class="modal-content responsive-modal">
            <div class="modal-header">
                <h3>Add Comment</h3>
                <span class="close-btn" onclick="closeModal('addCommentModal')">&times;</span>
            </div>
            <form id="addCommentForm" class="modal-form">
                <input type="hidden" id="commentJobId">
                
                <div class="form-group">
                    <label for="newComment">Comment *</label>
                    <textarea id="newComment" rows="4" required placeholder="Enter your comment"></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" onclick="closeModal('addCommentModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Comment</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Expense Modal -->
    <div id="expenseModal" class="modal">
        <div class="modal-content responsive-modal">
            <div class="modal-header">
                <h3 id="expenseModalTitle">Add Expense</h3>
                <span class="close-btn" onclick="closeModal('expenseModal')">&times;</span>
            </div>
            <form id="expenseModalForm" class="modal-form">
                <input type="hidden" id="expenseModalId">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseModalDate">Date *</label>
                        <input type="date" id="expenseModalDate" required>
                    </div>
                    <div class="form-group">
                        <label for="expenseModalAmount">Amount *</label>
                        <input type="number" id="expenseModalAmount" step="0.01" min="0" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="expenseModalMode">Payment Mode *</label>
                    <select id="expenseModalMode" required>
                        <option value="">Select Mode</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="expenseModalDescription">Description *</label>
                    <textarea id="expenseModalDescription" rows="3" required placeholder="Enter expense description"></textarea>
                </div>
                
                <div class="modal-actions">
                    <button type="button" onclick="closeModal('expenseModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Expense</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Customer Action Modal (Sales or Service) -->
    <div id="customerActionModal" class="modal">
        <div class="modal-content responsive-modal">
            <div class="modal-header">
                <h3>Choose Action</h3>
                <span class="close-btn" onclick="closeModal('customerActionModal')">&times;</span>
            </div>
            <div class="modal-body">
                <p>What would you like to do for <strong id="customerActionName"></strong>?</p>
                <div class="customer-action-buttons">
                    <button class="btn btn-primary" onclick="triggerSalesFromCustomer()">
                        💰 Create Sale
                    </button>
                    <button class="btn btn-secondary" onclick="triggerServiceFromCustomer()">
                        🔧 Create Service Job
                    </button>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" onclick="closeModal('customerActionModal')" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Invoice Viewer Modal -->
    <div id="invoiceViewerModal" class="modal">
        <div class="modal-content extra-large-modal responsive-modal">
            <div class="modal-header">
                <h3 id="invoiceViewerTitle">Invoice Details</h3>
                <span class="close-btn" onclick="closeModal('invoiceViewerModal')">&times;</span>
            </div>
            <div class="modal-body" id="invoiceViewerContent">
                <!-- Dynamic content -->
            </div>
            <div class="modal-actions">
                <button type="button" onclick="closeModal('invoiceViewerModal')" class="btn btn-secondary">Close</button>
                <button type="button" onclick="printCurrentInvoice()" class="btn btn-primary" id="printCurrentInvoiceBtn">Print Invoice</button>
            </div>
        </div>
    </div>

    <!-- Load all module scripts -->
    <script src="dashboard.js"></script>
</body>
</html>