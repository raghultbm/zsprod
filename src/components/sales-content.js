// src/components/sales-content.js - Sales content
window.SalesContent = {
    getHTML: () => `
        <div class="sales-container">
            <!-- Sales Form -->
            <div class="sales-form-container">
                <h3>New Sale</h3>
                
                <!-- Customer Selection -->
                <div class="form-section">
                    <h4>Customer Details</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customerSearch">Search Customer</label>
                            <div class="search-input-container">
                                <input type="text" id="customerSearch" placeholder="Search by name or phone number">
                                <div id="customerSuggestions" class="suggestions-dropdown"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="selectedCustomer">Selected Customer</label>
                            <input type="text" id="selectedCustomer" readonly placeholder="No customer selected">
                            <input type="hidden" id="selectedCustomerId">
                        </div>
                    </div>
                </div>

                <!-- Item Selection -->
                <div class="form-section">
                    <h4>Add Items</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="itemCodeSearch">Item Code</label>
                            <div class="search-input-container">
                                <input type="text" id="itemCodeSearch" placeholder="Enter or search item code">
                                <div id="itemSuggestions" class="suggestions-dropdown"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="itemQuantity">Quantity</label>
                            <input type="number" id="itemQuantity" min="1" value="1">
                        </div>
                        <div class="form-group">
                            <label for="itemPrice">Price</label>
                            <input type="number" id="itemPrice" step="0.01" min="0">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="discountType">Discount Type</label>
                            <select id="discountType">
                                <option value="none">No Discount</option>
                                <option value="percentage">Percentage</option>
                                <option value="amount">Amount</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="discountValue">Discount Value</label>
                            <input type="number" id="discountValue" step="0.01" min="0" disabled>
                        </div>
                        <div class="form-group align-end">
                            <button type="button" onclick="addItemToSale()" class="btn btn-primary">Add Item</button>
                        </div>
                    </div>
                </div>

                <!-- Selected Items -->
                <div class="form-section">
                    <h4>Sale Items</h4>
                    <div class="sale-items-container">
                        <table class="sale-items-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Discount</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="saleItemsTableBody">
                                <!-- Dynamic content -->
                            </tbody>
                        </table>
                        <div id="noItemsMessage" class="no-items-message">
                            No items added to sale
                        </div>
                    </div>
                </div>

                <!-- Sale Summary -->
                <div class="form-section">
                    <h4>Sale Summary</h4>
                    <div class="sale-summary">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span id="saleSubtotal">₹0.00</span>
                        </div>
                        <div class="summary-row">
                            <span>Total Discount:</span>
                            <span id="saleTotalDiscount">₹0.00</span>
                        </div>
                        <div class="summary-row total-row">
                            <span>Total Amount:</span>
                            <span id="saleTotalAmount">₹0.00</span>
                        </div>
                    </div>
                </div>

                <!-- Payment Method -->
                <div class="form-section">
                    <h4>Payment Method</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="paymentMethod">Payment Method</label>
                            <select id="paymentMethod" onchange="toggleMultiplePayments()">
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="multiple">Multiple Payment Methods</option>
                            </select>
                        </div>
                        <div class="form-group" id="singlePaymentAmount">
                            <label for="paymentAmount">Payment Amount</label>
                            <input type="number" id="paymentAmount" step="0.01" min="0" readonly>
                        </div>
                    </div>

                    <!-- Multiple Payments -->
                    <div id="multiplePaymentsSection" class="multiple-payments" style="display: none;">
                        <h5>Payment Breakdown</h5>
                        <div id="paymentBreakdown">
                            <!-- Dynamic payment inputs -->
                        </div>
                        <button type="button" onclick="addPaymentMethod()" class="btn btn-secondary">Add Payment Method</button>
                    </div>
                </div>

                <!-- Actions -->
                <div class="form-section">
                    <div class="form-actions">
                        <button type="button" onclick="clearSale()" class="btn btn-secondary">Clear Sale</button>
                        <button type="button" onclick="previewSale()" class="btn btn-primary" id="completeSaleBtn">Complete Sale</button>
                    </div>
                </div>
            </div>

            <!-- Sales History -->
            <div class="sales-history-container">
                <h3>Recent Sales</h3>
                <div class="sales-history-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="salesHistoryTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
};