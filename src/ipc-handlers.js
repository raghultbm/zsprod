// src/ipc-handlers.js - Updated IPC handlers with new invoice format
const { ipcMain } = require('electron');
const { runQuery, getData, getRow, generateJobNumber, getDatabase } = require('./database');

function setupIpcHandlers() {
    // Login handler
    ipcMain.handle('login', async (event, { username, password }) => {
        try {
            const row = await getRow(
                "SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1",
                [username, password]
            );
            
            if (row) {
                return { 
                    success: true, 
                    user: { 
                        id: row.id, 
                        username: row.username, 
                        full_name: row.full_name, 
                        role: row.role 
                    } 
                };
            } else {
                return { success: false, message: 'Invalid credentials' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed. Please try again.' };
        }
    });

    // Customer handlers
    ipcMain.handle('get-customers', async () => {
        try {
            return await getData("SELECT * FROM customers ORDER BY created_at DESC");
        } catch (error) {
            console.error('Get customers error:', error);
            throw error;
        }
    });

    ipcMain.handle('add-customer', async (event, customer) => {
        try {
            const { name, phone, email } = customer;
            const result = await runQuery(
                "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
                [name, phone, email]
            );
            return { id: result.id, ...customer };
        } catch (error) {
            console.error('Add customer error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-customer', async (event, customer) => {
        try {
            const { id, name, phone, email } = customer;
            await runQuery(
                "UPDATE customers SET name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [name, phone, email, id]
            );
            return customer;
        } catch (error) {
            console.error('Update customer error:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-customer', async (event, id) => {
        try {
            await runQuery("DELETE FROM customers WHERE id = ?", [id]);
            return { success: true };
        } catch (error) {
            console.error('Delete customer error:', error);
            throw error;
        }
    });

    ipcMain.handle('search-customers', async (event, searchTerm) => {
        try {
            const term = `%${searchTerm}%`;
            return await getData(
                "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name LIMIT 10",
                [term, term]
            );
        } catch (error) {
            console.error('Search customers error:', error);
            throw error;
        }
    });

    // User handlers
    ipcMain.handle('get-users', async () => {
        try {
            return await getData("SELECT id, username, full_name, role, email, phone, created_at, is_active FROM users ORDER BY created_at DESC");
        } catch (error) {
            console.error('Get users error:', error);
            throw error;
        }
    });

    ipcMain.handle('add-user', async (event, user) => {
        try {
            const { username, password, full_name, role, email, phone } = user;
            const result = await runQuery(
                "INSERT INTO users (username, password, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
                [username, password, full_name, role, email, phone]
            );
            return { id: result.id, username, full_name, role, email, phone, is_active: 1 };
        } catch (error) {
            console.error('Add user error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-user', async (event, user) => {
        try {
            const { id, username, full_name, role, email, phone, is_active } = user;
            await runQuery(
                "UPDATE users SET username = ?, full_name = ?, role = ?, email = ?, phone = ?, is_active = ? WHERE id = ?",
                [username, full_name, role, email, phone, is_active, id]
            );
            return user;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-user', async (event, id) => {
        try {
            await runQuery("DELETE FROM users WHERE id = ?", [id]);
            return { success: true };
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    });

    // Inventory handlers
    ipcMain.handle('get-inventory', async () => {
        try {
            return await getData("SELECT * FROM inventory ORDER BY created_at DESC");
        } catch (error) {
            console.error('Get inventory error:', error);
            throw error;
        }
    });

    ipcMain.handle('add-inventory-item', async (event, item) => {
        try {
            const { 
                item_code, date_added, category, brand, type, gender, 
                material, size_mm, battery_code, quantity, warranty_months, 
                price, outlet, comments 
            } = item;
            
            const result = await runQuery(
                `INSERT INTO inventory (
                    item_code, date_added, category, brand, type, gender, 
                    material, size_mm, battery_code, quantity, warranty_months, 
                    price, outlet, comments
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item_code, date_added, category, brand, type, gender,
                    material, size_mm, battery_code, quantity, warranty_months,
                    price, outlet, comments
                ]
            );
            
            return { id: result.id, ...item };
        } catch (error) {
            console.error('Add inventory item error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-inventory-item', async (event, item) => {
        try {
            const { 
                id, item_code, date_added, category, brand, type, gender,
                material, size_mm, battery_code, quantity, warranty_months,
                price, outlet, comments
            } = item;
            
            await runQuery(
                `UPDATE inventory SET 
                    item_code = ?, date_added = ?, category = ?, brand = ?, type = ?, 
                    gender = ?, material = ?, size_mm = ?, battery_code = ?, quantity = ?, 
                    warranty_months = ?, price = ?, outlet = ?, comments = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [
                    item_code, date_added, category, brand, type, gender,
                    material, size_mm, battery_code, quantity, warranty_months,
                    price, outlet, comments, id
                ]
            );
            
            return item;
        } catch (error) {
            console.error('Update inventory item error:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-inventory-item', async (event, id) => {
        try {
            await runQuery("DELETE FROM inventory WHERE id = ?", [id]);
            return { success: true };
        } catch (error) {
            console.error('Delete inventory item error:', error);
            throw error;
        }
    });

    ipcMain.handle('search-inventory', async (event, searchTerm) => {
        try {
            const term = `%${searchTerm}%`;
            return await getData(
                `SELECT * FROM inventory WHERE 
                 item_code LIKE ? OR brand LIKE ? OR battery_code LIKE ? OR comments LIKE ?
                 ORDER BY date_added DESC`,
                [term, term, term, term]
            );
        } catch (error) {
            console.error('Search inventory error:', error);
            throw error;
        }
    });

    ipcMain.handle('search-inventory-for-sale', async (event, searchTerm) => {
        try {
            const term = `%${searchTerm}%`;
            return await getData(
                `SELECT * FROM inventory 
                 WHERE (item_code LIKE ? OR brand LIKE ? OR comments LIKE ?) 
                 AND quantity > 0 
                 ORDER BY item_code LIMIT 20`,
                [term, term, term]
            );
        } catch (error) {
            console.error('Search inventory for sale error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-inventory-by-code', async (event, itemCode) => {
        try {
            return await getRow(
                "SELECT * FROM inventory WHERE item_code = ? AND quantity > 0",
                [itemCode]
            );
        } catch (error) {
            console.error('Get inventory by code error:', error);
            throw error;
        }
    });

    // Sales handlers - Updated with new invoice number format and mobile field
    ipcMain.handle('get-sales', async () => {
        try {
            const sales = await getData(`
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
                       COUNT(si.id) as items,
                       s.invoice_number,
                       GROUP_CONCAT(DISTINCT sp.payment_method) as payment_methods
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN users u ON s.created_by = u.id
                LEFT JOIN sale_items si ON s.id = si.sale_id
                LEFT JOIN sale_payments sp ON s.id = sp.sale_id
                GROUP BY s.id
                ORDER BY s.created_at DESC
            `);
            
            // Process payment methods for display
            return sales.map(sale => ({
                ...sale,
                payment_methods: sale.payment_methods ? 
                    sale.payment_methods.split(',').map(method => 
                        method.charAt(0).toUpperCase() + method.slice(1)
                    ).join(', ') : 'Cash'
            }));
        } catch (error) {
            console.error('Get sales error:', error);
            throw error;
        }
    });

    ipcMain.handle('create-sale', async (event, saleData) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                try {
                    const { sale, items, payments } = saleData;

                    // Insert main sale record with invoice number
                    db.run(`INSERT INTO sales (
                        sale_date, customer_id, subtotal, total_discount, total_amount, 
                        invoice_number, notes, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                        sale.sale_date,
                        sale.customer_id || null,
                        sale.subtotal,
                        sale.total_discount,
                        sale.total_amount,
                        sale.invoice_number,
                        sale.notes || null,
                        sale.created_by
                    ], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        const saleId = this.lastID;
                        let itemsProcessed = 0;
                        let paymentsProcessed = 0;
                        const totalItems = items.length;
                        const totalPayments = payments.length;

                        // Insert sale items
                        items.forEach((item, index) => {
                            db.run(`INSERT INTO sale_items (
                                sale_id, inventory_id, item_code, item_name, quantity, 
                                unit_price, discount_type, discount_value, line_total
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                                saleId,
                                item.inventory_id,
                                item.item_code,
                                item.item_name,
                                item.quantity,
                                item.unit_price,
                                item.discount_type,
                                item.discount_value,
                                item.line_total
                            ], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                // Update inventory quantity
                                db.run(
                                    "UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                    [item.quantity, item.inventory_id],
                                    (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            reject(err);
                                            return;
                                        }

                                        itemsProcessed++;
                                        checkCompletion();
                                    }
                                );
                            });
                        });

                        // Insert payments
                        payments.forEach((payment) => {
                            db.run(`INSERT INTO sale_payments (
                                sale_id, payment_method, amount, payment_reference
                            ) VALUES (?, ?, ?, ?)`, [
                                saleId,
                                payment.payment_method,
                                payment.amount,
                                payment.payment_reference || null
                            ], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                paymentsProcessed++;
                                checkCompletion();
                            });
                        });

                        function checkCompletion() {
                            if (itemsProcessed === totalItems && paymentsProcessed === totalPayments) {
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve({ id: saleId, success: true, invoice_number: sale.invoice_number });
                                    }
                                });
                            }
                        }
                    });
                } catch (error) {
                    db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    });

    ipcMain.handle('get-sale-details', async (event, saleId) => {
        try {
            const sale = await getRow(`
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                WHERE s.id = ?
            `, [saleId]);

            const items = await getData(`
                SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id
            `, [saleId]);

            const payments = await getData(`
                SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY id
            `, [saleId]);

            return { sale, items, payments };
        } catch (error) {
            console.error('Get sale details error:', error);
            throw error;
        }
    });

    // Service handlers
    ipcMain.handle('get-service-jobs', async () => {
        try {
            return await getData(`
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
                       COUNT(si.id) as items_count
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                LEFT JOIN users u ON sj.created_by = u.id
                LEFT JOIN service_items si ON sj.id = si.service_job_id
                GROUP BY sj.id
                ORDER BY sj.created_at DESC
            `);
        } catch (error) {
            console.error('Get service jobs error:', error);
            throw error;
        }
    });

    ipcMain.handle('create-service-job', async (event, serviceData) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                try {
                    const { job, items } = serviceData;
                    const jobNumber = generateJobNumber();

                    // Insert main service job record
                    db.run(`INSERT INTO service_jobs (
                        job_number, customer_id, estimated_cost, advance_amount, advance_payment_method,
                        advance_payment_reference, approximate_delivery_date, location, status, comments, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        jobNumber,
                        job.customer_id || null,
                        job.estimated_cost,
                        job.advance_amount,
                        job.advance_payment_method || null,
                        job.advance_payment_reference || null,
                        job.approximate_delivery_date,
                        job.location,
                        'yet_to_start',
                        job.comments || null,
                        job.created_by
                    ], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        const serviceJobId = this.lastID;
                        let itemsProcessed = 0;
                        const totalItems = items.length;

                        // Insert service items
                        items.forEach((item, index) => {
                            db.run(`INSERT INTO service_items (
                                service_job_id, category, brand, gender, case_material, strap_material,
                                machine_change, movement_no, issue_description, product_image_path
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                                serviceJobId,
                                item.category,
                                item.brand || null,
                                item.gender || null,
                                item.case_material || null,
                                item.strap_material || null,
                                item.machine_change || null,
                                item.movement_no || null,
                                item.issue_description,
                                item.product_image_path || null
                            ], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                itemsProcessed++;
                                
                                if (itemsProcessed === totalItems) {
                                    // Insert initial status history
                                    db.run(`INSERT INTO service_status_history (
                                        service_job_id, status, location, comments, changed_by
                                    ) VALUES (?, ?, ?, ?, ?)`, [
                                        serviceJobId,
                                        'yet_to_start',
                                        job.location,
                                        'Service job created',
                                        job.created_by
                                    ], (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            reject(err);
                                        } else {
                                            db.run('COMMIT', (err) => {
                                                if (err) {
                                                    reject(err);
                                                } else {
                                                    resolve({ id: serviceJobId, job_number: jobNumber, success: true });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    });
                } catch (error) {
                    db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    });

    ipcMain.handle('get-service-job-details', async (event, jobId) => {
        try {
            const job = await getRow(`
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                WHERE sj.id = ?
            `, [jobId]);

            const items = await getData(`
                SELECT * FROM service_items WHERE service_job_id = ? ORDER BY id
            `, [jobId]);

            const statusHistory = await getData(`
                SELECT ssh.*, u.full_name as changed_by_name
                FROM service_status_history ssh
                LEFT JOIN users u ON ssh.changed_by = u.id
                WHERE ssh.service_job_id = ?
                ORDER BY ssh.changed_at DESC
            `, [jobId]);

            const comments = await getData(`
                SELECT sc.*, u.full_name as added_by_name
                FROM service_comments sc
                LEFT JOIN users u ON sc.added_by = u.id
                WHERE sc.service_job_id = ?
                ORDER BY sc.added_at DESC
            `, [jobId]);

            return { job, items, statusHistory, comments };
        } catch (error) {
            console.error('Get service job details error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-service-status', async (event, { jobId, status, location, comments, changedBy }) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Update main job status
                db.run(`UPDATE service_jobs SET status = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
                    [status, location, jobId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    // Insert status history
                    db.run(`INSERT INTO service_status_history (
                        service_job_id, status, location, comments, changed_by
                    ) VALUES (?, ?, ?, ?, ?)`, [
                        jobId, status, location, comments, changedBy
                    ], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                        } else {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve({ success: true });
                                }
                            });
                        }
                    });
                });
            });
        });
    });

    ipcMain.handle('add-service-comment', async (event, { jobId, comment, addedBy }) => {
        try {
            await runQuery(`INSERT INTO service_comments (service_job_id, comment, added_by) VALUES (?, ?, ?)`, 
                [jobId, comment, addedBy]);
            return { success: true };
        } catch (error) {
            console.error('Add service comment error:', error);
            throw error;
        }
    });

    ipcMain.handle('complete-service', async (event, { jobId, finalCost, finalPaymentAmount, finalPaymentMethod, finalPaymentReference, actualDeliveryDate, completedBy }) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Update job with final details
                db.run(`UPDATE service_jobs SET 
                    final_cost = ?, final_payment_amount = ?, final_payment_method = ?, 
                    final_payment_reference = ?, actual_delivery_date = ?, status = 'service_completed',
                    updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?`, [
                    finalCost, finalPaymentAmount, finalPaymentMethod, finalPaymentReference, 
                    actualDeliveryDate, jobId
                ], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    // Insert status history
                    db.run(`INSERT INTO service_status_history (
                        service_job_id, status, location, comments, changed_by
                    ) VALUES (?, ?, ?, ?, ?)`, [
                        jobId, 'service_completed', 'semmancheri', 'Service completed', completedBy
                    ], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                        } else {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve({ success: true });
                                }
                            });
                        }
                    });
                });
            });
        });
    });

    ipcMain.handle('search-service-jobs', async (event, searchTerm) => {
        try {
            const term = `%${searchTerm}%`;
            return await getData(`
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                LEFT JOIN users u ON sj.created_by = u.id
                WHERE sj.job_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?
                ORDER BY sj.created_at DESC
            `, [term, term, term]);
        } catch (error) {
            console.error('Search service jobs error:', error);
            throw error;
        }
    });

    // Expenses handlers
    ipcMain.handle('get-expenses', async () => {
        try {
            return await getData(`
                SELECT e.*, u.full_name as created_by_name
                FROM expenses e
                LEFT JOIN users u ON e.created_by = u.id
                ORDER BY e.expense_date DESC, e.created_at DESC
            `);
        } catch (error) {
            console.error('Get expenses error:', error);
            throw error;
        }
    });

    ipcMain.handle('add-expense', async (event, expense) => {
        try {
            const { expense_date, description, amount, payment_mode, created_by } = expense;
            const result = await runQuery(
                "INSERT INTO expenses (expense_date, description, amount, payment_mode, created_by) VALUES (?, ?, ?, ?, ?)",
                [expense_date, description, amount, payment_mode, created_by]
            );
            return { id: result.id, ...expense };
        } catch (error) {
            console.error('Add expense error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-expense', async (event, expense) => {
        try {
            const { id, expense_date, description, amount, payment_mode } = expense;
            await runQuery(
                "UPDATE expenses SET expense_date = ?, description = ?, amount = ?, payment_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [expense_date, description, amount, payment_mode, id]
            );
            return expense;
        } catch (error) {
            console.error('Update expense error:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-expense', async (event, id) => {
        try {
            await runQuery("DELETE FROM expenses WHERE id = ?", [id]);
            return { success: true };
        } catch (error) {
            console.error('Delete expense error:', error);
            throw error;
        }
    });

    ipcMain.handle('search-expenses', async (event, searchTerm) => {
        try {
            const term = `%${searchTerm}%`;
            return await getData(`
                SELECT e.*, u.full_name as created_by_name
                FROM expenses e
                LEFT JOIN users u ON e.created_by = u.id
                WHERE e.description LIKE ? OR e.payment_mode LIKE ?
                ORDER BY e.expense_date DESC, e.created_at DESC
            `, [term, term]);
        } catch (error) {
            console.error('Search expenses error:', error);
            throw error;
        }
    });

    // Invoice handlers - Updated with new sale invoice format
    ipcMain.handle('get-all-invoices', async () => {
        try {
            // Get sales invoices with new format
            const salesInvoices = await getData(`
                SELECT 
                    'sale' as type,
                    s.id,
                    s.sale_date as date,
                    s.customer_id,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    s.total_amount as amount,
                    s.created_at,
                    s.invoice_number as invoice_number
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                WHERE s.sale_status = 'completed' OR s.sale_status IS NULL
                ORDER BY s.created_at DESC
            `);

            // Get service invoices (only completed services)
            const serviceInvoices = await getData(`
                SELECT 
                    'service' as type,
                    sj.id,
                    sj.actual_delivery_date as date,
                    sj.customer_id,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    sj.final_cost as amount,
                    sj.created_at,
                    'INV-SRV-' || sj.id as invoice_number,
                    sj.job_number
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                WHERE sj.status = 'service_completed' OR sj.status = 'delivered'
                ORDER BY sj.created_at DESC
            `);

            // Combine and sort by date
            const allInvoices = [...salesInvoices, ...serviceInvoices].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );

            return allInvoices;
        } catch (error) {
            console.error('Get all invoices error:', error);
            throw error;
        }
    });

    // Customer net value handlers - ADD THESE TO YOUR EXISTING FILE
    ipcMain.handle('get-customer-sales', async (event, customerId) => {
        try {
            return await getData(`
                SELECT * FROM sales 
                WHERE customer_id = ? AND (sale_status = 'completed' OR sale_status IS NULL)
                ORDER BY sale_date DESC
            `, [customerId]);
        } catch (error) {
            console.error('Get customer sales error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-customer-services', async (event, customerId) => {
        try {
            return await getData(`
                SELECT * FROM service_jobs 
                WHERE customer_id = ? AND (status = 'service_completed' OR status = 'delivered')
                ORDER BY created_at DESC
            `, [customerId]);
        } catch (error) {
            console.error('Get customer services error:', error);
            throw error;
        }
    });
}

module.exports = { setupIpcHandlers };