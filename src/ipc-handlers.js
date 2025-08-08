// src/ipc-handlers.js - Complete IPC Handlers with Service Module Updates
const { ipcMain } = require('electron');
const { runQuery, getData, getRow, generateJobNumber, getDatabase } = require('./database');

function setupIpcHandlers() {
    // ================================
    // LOGIN HANDLERS
    // ================================
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

    // ================================
    // CUSTOMER HANDLERS
    // ================================
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

    // ================================
    // USER HANDLERS
    // ================================
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

    // ================================
    // INVENTORY HANDLERS
    // ================================
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
                    item_code = ?, date_added = ?, category = ?, brand = ?, type = ?, gender = ?,
                    material = ?, size_mm = ?, battery_code = ?, quantity = ?, warranty_months = ?,
                    price = ?, outlet = ?, comments = ?, updated_at = CURRENT_TIMESTAMP 
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
                "SELECT * FROM inventory WHERE item_code LIKE ? OR brand LIKE ? OR type LIKE ? ORDER BY created_at DESC",
                [term, term, term]
            );
        } catch (error) {
            console.error('Search inventory error:', error);
            throw error;
        }
    });

    // ================================
    // SALES HANDLERS
    // ================================
    ipcMain.handle('get-sales', async () => {
        try {
            return await getData(`
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN users u ON s.created_by = u.id
                ORDER BY s.created_at DESC
            `);
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
                    
                    // Generate invoice number with new format: INVSR<YYMMDD><4 RANDOM DIGITS>
                    const now = new Date();
                    const year = now.getFullYear().toString().slice(-2);
                    const month = (now.getMonth() + 1).toString().padStart(2, '0');
                    const day = now.getDate().toString().padStart(2, '0');
                    let randomDigits = '';
                    for (let i = 0; i < 4; i++) {
                        randomDigits += Math.floor(Math.random() * 10).toString();
                    }
                    const invoiceNumber = `INVSR${year}${month}${day}${randomDigits}`;

                    // Insert main sale record with timestamp
                    db.run(`INSERT INTO sales (
                        customer_id, sale_date, total_amount, sale_status, comments, created_by, invoice_number, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
                        sale.customer_id || null,
                        sale.sale_date,
                        sale.total_amount,
                        'completed',
                        sale.comments || null,
                        sale.created_by,
                        invoiceNumber
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

                        // Insert sale items with timestamps
                        items.forEach((item, index) => {
                            db.run(`INSERT INTO sale_items (
                                sale_id, inventory_id, item_code, quantity, unit_price, total_price, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
                                saleId,
                                item.inventory_id || null,
                                item.item_code,
                                item.quantity,
                                item.unit_price,
                                item.total_price
                            ], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                itemsProcessed++;
                                
                                if (itemsProcessed === totalItems && paymentsProcessed === totalPayments) {
                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve({ id: saleId, invoice_number: invoiceNumber, success: true });
                                        }
                                    });
                                }
                            });
                        });

                        // Insert payment records with timestamps
                        payments.forEach((payment, index) => {
                            db.run(`INSERT INTO sale_payments (
                                sale_id, payment_method, amount, reference_number, created_at
                            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
                                saleId,
                                payment.payment_method,
                                payment.amount,
                                payment.reference_number || null
                            ], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                paymentsProcessed++;
                                
                                if (itemsProcessed === totalItems && paymentsProcessed === totalPayments) {
                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve({ id: saleId, invoice_number: invoiceNumber, success: true });
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

    ipcMain.handle('get-sale-details', async (event, saleId) => {
        try {
            const sale = await getRow(`
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                WHERE s.id = ?
            `, [saleId]);

            const items = await getData(`
                SELECT si.*, i.brand, i.type, i.category
                FROM sale_items si
                LEFT JOIN inventory i ON si.inventory_id = i.id
                WHERE si.sale_id = ?
                ORDER BY si.id
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

    ipcMain.handle('search-sales', async (event, searchTerm) => {
        try {
            const term = `%${searchTerm}%`;
            return await getData(`
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN users u ON s.created_by = u.id
                WHERE s.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?
                ORDER BY s.created_at DESC
            `, [term, term, term]);
        } catch (error) {
            console.error('Search sales error:', error);
            throw error;
        }
    });

    // ================================
    // SERVICE HANDLERS - COMPLETE IMPLEMENTATION
    // ================================
    
    // Get all service jobs with enhanced data
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

    // Create service job with complete transaction handling
    ipcMain.handle('create-service-job', async (event, serviceData) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                try {
                    const { job, items } = serviceData;
                    const jobNumber = generateJobNumber();

                    // Insert main service job record with timestamps
                    db.run(`INSERT INTO service_jobs (
                        job_number, customer_id, estimated_cost, advance_amount, advance_payment_method,
                        advance_payment_reference, approximate_delivery_date, location, status, comments, created_by,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
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

                        // Insert service items with timestamps
                        items.forEach((item, index) => {
                            db.run(`INSERT INTO service_items (
                                service_job_id, category, brand, gender, case_material, strap_material,
                                machine_change, movement_no, issue_description, product_image_path, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
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
                                    // Insert initial status history with timestamp
                                    db.run(`INSERT INTO service_status_history (
                                        service_job_id, status, location, comments, changed_by, changed_at
                                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
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

    // Get service job details with complete history
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

    // Update service status with history tracking
    ipcMain.handle('update-service-status', async (event, { jobId, status, location, comments, changedBy }) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Update main job status with timestamp
                db.run(`UPDATE service_jobs SET status = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
                    [status, location, jobId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    // Insert status history with timestamp
                    db.run(`INSERT INTO service_status_history (
                        service_job_id, status, location, comments, changed_by, changed_at
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
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

    // Add service comment with timestamp
    ipcMain.handle('add-service-comment', async (event, { jobId, comment, addedBy }) => {
        try {
            await runQuery(`INSERT INTO service_comments (service_job_id, comment, added_by, added_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`, 
                [jobId, comment, addedBy]);
            return { success: true };
        } catch (error) {
            console.error('Add service comment error:', error);
            throw error;
        }
    });

    // Complete service with final details
    ipcMain.handle('complete-service', async (event, { jobId, finalCost, finalPaymentAmount, finalPaymentMethod, finalPaymentReference, actualDeliveryDate, completedBy }) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Update job with final details and timestamp
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

                    // Insert status history with timestamp
                    db.run(`INSERT INTO service_status_history (
                        service_job_id, status, location, comments, changed_by, changed_at
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
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

    // Search service jobs
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

    // NEW: Filter service jobs by multiple criteria
    ipcMain.handle('filter-service-jobs', async (event, filters) => {
        try {
            const { status, location, dateFrom, dateTo, searchTerm } = filters;
            let query = `
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
                       COUNT(si.id) as items_count
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                LEFT JOIN users u ON sj.created_by = u.id
                LEFT JOIN service_items si ON sj.id = si.service_job_id
                WHERE 1=1
            `;
            const params = [];

            // Apply filters
            if (status) {
                query += ` AND sj.status = ?`;
                params.push(status);
            }

            if (location) {
                query += ` AND sj.location = ?`;
                params.push(location);
            }

            if (dateFrom) {
                query += ` AND DATE(sj.created_at) >= ?`;
                params.push(dateFrom);
            }

            if (dateTo) {
                query += ` AND DATE(sj.created_at) <= ?`;
                params.push(dateTo);
            }

            if (searchTerm) {
                const term = `%${searchTerm}%`;
                query += ` AND (sj.job_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)`;
                params.push(term, term, term);
            }

            query += `
                GROUP BY sj.id
                ORDER BY sj.created_at DESC
            `;

            return await getData(query, params);
        } catch (error) {
            console.error('Filter service jobs error:', error);
            throw error;
        }
    });

    // NEW: Get service jobs by status
    ipcMain.handle('get-service-jobs-by-status', async (event, status) => {
        try {
            return await getData(`
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
                       COUNT(si.id) as items_count
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                LEFT JOIN users u ON sj.created_by = u.id
                LEFT JOIN service_items si ON sj.id = si.service_job_id
                WHERE sj.status = ?
                GROUP BY sj.id
                ORDER BY sj.created_at DESC
            `, [status]);
        } catch (error) {
            console.error('Get service jobs by status error:', error);
            throw error;
        }
    });

    // NEW: Get service jobs by location
    ipcMain.handle('get-service-jobs-by-location', async (event, location) => {
        try {
            return await getData(`
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
                       COUNT(si.id) as items_count
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                LEFT JOIN users u ON sj.created_by = u.id
                LEFT JOIN service_items si ON sj.id = si.service_job_id
                WHERE sj.location = ?
                GROUP BY sj.id
                ORDER BY sj.created_at DESC
            `, [location]);
        } catch (error) {
            console.error('Get service jobs by location error:', error);
            throw error;
        }
    });

    // NEW: Get service jobs by date range
    ipcMain.handle('get-service-jobs-by-date-range', async (event, { startDate, endDate }) => {
        try {
            return await getData(`
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
                       COUNT(si.id) as items_count
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                LEFT JOIN users u ON sj.created_by = u.id
                LEFT JOIN service_items si ON sj.id = si.service_job_id
                WHERE DATE(sj.created_at) BETWEEN ? AND ?
                GROUP BY sj.id
                ORDER BY sj.created_at DESC
            `, [startDate, endDate]);
        } catch (error) {
            console.error('Get service jobs by date range error:', error);
            throw error;
        }
    });

    // NEW: Get service statistics
    ipcMain.handle('get-service-statistics', async () => {
        try {
            const stats = await getRow(`
                SELECT 
                    COUNT(*) as total_jobs,
                    SUM(CASE WHEN status = 'yet_to_start' THEN 1 ELSE 0 END) as pending_jobs,
                    SUM(CASE WHEN status = 'in_service_center' THEN 1 ELSE 0 END) as in_progress_jobs,
                    SUM(CASE WHEN status = 'service_completed' THEN 1 ELSE 0 END) as completed_jobs,
                    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_jobs,
                    COALESCE(SUM(estimated_cost), 0) as total_estimated_value,
                    COALESCE(SUM(final_cost), 0) as total_final_value,
                    COALESCE(SUM(advance_amount), 0) as total_advance_received
                FROM service_jobs
            `);
            return stats;
        } catch (error) {
            console.error('Get service statistics error:', error);
            throw error;
        }
    });

    // ================================
    // EXPENSES HANDLERS
    // ================================
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
                "INSERT INTO expenses (expense_date, description, amount, payment_mode, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
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

    // ================================
    // INVOICE HANDLERS - Updated with new formats
    // ================================
    ipcMain.handle('get-all-invoices', async () => {
        try {
            // Get sales invoices with new format: INVSR<YYMMDD><4 RANDOM DIGITS>
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

    // ================================
    // CUSTOMER RELATIONSHIP HANDLERS
    // ================================
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

    // NEW: Get customer total value
    ipcMain.handle('get-customer-total-value', async (event, customerId) => {
        try {
            const salesValue = await getRow(`
                SELECT COALESCE(SUM(total_amount), 0) as total_sales
                FROM sales 
                WHERE customer_id = ? AND (sale_status = 'completed' OR sale_status IS NULL)
            `, [customerId]);

            const servicesValue = await getRow(`
                SELECT COALESCE(SUM(final_cost), 0) as total_services
                FROM service_jobs 
                WHERE customer_id = ? AND (status = 'service_completed' OR status = 'delivered')
            `, [customerId]);

            return {
                total_sales: salesValue.total_sales || 0,
                total_services: servicesValue.total_services || 0,
                grand_total: (salesValue.total_sales || 0) + (servicesValue.total_services || 0)
            };
        } catch (error) {
            console.error('Get customer total value error:', error);
            throw error;
        }
    });

    // ================================
    // DASHBOARD STATISTICS HANDLERS
    // ================================
    ipcMain.handle('get-dashboard-stats', async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            
            // Get sales stats
            const salesStats = await getRow(`
                SELECT 
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total_amount), 0) as total_sales_value,
                    COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_sales,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END), 0) as today_sales_value,
                    COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END) as month_sales,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END), 0) as month_sales_value
                FROM sales
                WHERE sale_status = 'completed' OR sale_status IS NULL
            `, [today, today, monthStart, monthStart]);

            // Get service stats
            const serviceStats = await getRow(`
                SELECT 
                    COUNT(*) as total_services,
                    COUNT(CASE WHEN status = 'yet_to_start' THEN 1 END) as pending_services,
                    COUNT(CASE WHEN status = 'in_service_center' THEN 1 END) as active_services,
                    COUNT(CASE WHEN status = 'service_completed' THEN 1 END) as completed_services,
                    COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_services,
                    COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END) as month_services,
                    COALESCE(SUM(CASE WHEN status = 'service_completed' OR status = 'delivered' THEN final_cost ELSE 0 END), 0) as total_service_revenue
                FROM service_jobs
            `, [today, monthStart]);

            // Get customer stats
            const customerStats = await getRow(`
                SELECT 
                    COUNT(*) as total_customers,
                    COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_customers,
                    COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END) as month_customers
                FROM customers
            `, [today, monthStart]);

            // Get inventory stats
            const inventoryStats = await getRow(`
                SELECT 
                    COUNT(*) as total_items,
                    COALESCE(SUM(quantity), 0) as total_quantity,
                    COUNT(CASE WHEN quantity <= 5 THEN 1 END) as low_stock_items,
                    COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_items
                FROM inventory
            `);

            return {
                sales: salesStats,
                services: serviceStats,
                customers: customerStats,
                inventory: inventoryStats,
                total_revenue: (salesStats.total_sales_value || 0) + (serviceStats.total_service_revenue || 0)
            };
        } catch (error) {
            console.error('Get dashboard stats error:', error);
            throw error;
        }
    });

    // ================================
    // UTILITY HANDLERS
    // ================================
    
    // NEW: Generate acknowledgment number for services: ACKSR<YYMMDD><4 RANDOM DIGITS>
    ipcMain.handle('generate-acknowledgment-number', async () => {
        try {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            
            // Generate 4 random digits
            let randomDigits = '';
            for (let i = 0; i < 4; i++) {
                randomDigits += Math.floor(Math.random() * 10).toString();
            }
            
            return `ACKSR${year}${month}${day}${randomDigits}`;
        } catch (error) {
            console.error('Generate acknowledgment number error:', error);
            throw error;
        }
    });

    // NEW: Update service delivery status
    ipcMain.handle('update-service-delivery', async (event, { jobId, deliveryStatus, deliveredBy, deliveryDate, comments }) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Update main job delivery status
                db.run(`UPDATE service_jobs SET status = ?, actual_delivery_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
                    [deliveryStatus, deliveryDate, jobId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    // Insert delivery history
                    db.run(`INSERT INTO service_status_history (
                        service_job_id, status, location, comments, changed_by, changed_at
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
                        jobId, deliveryStatus, 'semmancheri', comments || 'Item delivered to customer', deliveredBy
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

    // ================================
    // LEDGER HANDLERS
    // ================================
    
    // Get sales by date
    ipcMain.handle('get-sales-by-date', async (event, date) => {
        try {
            return await getData(`
                SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name,
                       GROUP_CONCAT(
                           json_object(
                               'payment_method', sp.payment_method,
                               'amount', sp.amount,
                               'reference_number', sp.reference_number
                           )
                       ) as payments_json
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN users u ON s.created_by = u.id
                LEFT JOIN sale_payments sp ON s.id = sp.sale_id
                WHERE DATE(s.created_at) = ?
                AND (s.sale_status = 'completed' OR s.sale_status IS NULL)
                GROUP BY s.id
                ORDER BY s.created_at DESC
            `, [date]);
        } catch (error) {
            console.error('Get sales by date error:', error);
            // Fallback query without payments
            try {
                const sales = await getData(`
                    SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name
                    FROM sales s
                    LEFT JOIN customers c ON s.customer_id = c.id
                    LEFT JOIN users u ON s.created_by = u.id
                    WHERE DATE(s.created_at) = ?
                    AND (s.sale_status = 'completed' OR s.sale_status IS NULL)
                    ORDER BY s.created_at DESC
                `, [date]);

                // Get payments separately for each sale
                for (let sale of sales) {
                    const payments = await getData(`
                        SELECT payment_method, amount, reference_number
                        FROM sale_payments 
                        WHERE sale_id = ?
                    `, [sale.id]);
                    sale.payments = payments;
                }

                return sales;
            } catch (fallbackError) {
                console.error('Fallback get sales by date error:', fallbackError);
                throw fallbackError;
            }
        }
    });

    // Get services by date
    ipcMain.handle('get-services-by-date', async (event, date) => {
        try {
            return await getData(`
                SELECT sj.*, c.name as customer_name, c.phone as customer_phone, u.full_name as created_by_name
                FROM service_jobs sj
                LEFT JOIN customers c ON sj.customer_id = c.id
                LEFT JOIN users u ON sj.created_by = u.id
                WHERE DATE(sj.created_at) = ? 
                   OR (sj.status = 'service_completed' AND DATE(sj.actual_delivery_date) = ?)
                ORDER BY sj.created_at DESC
            `, [date, date]);
        } catch (error) {
            console.error('Get services by date error:', error);
            throw error;
        }
    });

    // Get expenses by date
    ipcMain.handle('get-expenses-by-date', async (event, date) => {
        try {
            return await getData(`
                SELECT e.*, u.full_name as created_by_name
                FROM expenses e
                LEFT JOIN users u ON e.created_by = u.id
                WHERE DATE(e.expense_date) = ?
                ORDER BY e.created_at DESC
            `, [date]);
        } catch (error) {
            console.error('Get expenses by date error:', error);
            throw error;
        }
    });

    // Get ledger balance for a specific date
    ipcMain.handle('get-ledger-balance', async (event, date) => {
        try {
            // Check if there's a COB record for this date
            const cobRecord = await getRow(`
                SELECT * FROM cob_records 
                WHERE date = ? 
                ORDER BY completed_at DESC 
                LIMIT 1
            `, [date]);

            if (cobRecord) {
                return {
                    cash: parseFloat(cobRecord.cash_balance || 0),
                    account: parseFloat(cobRecord.account_balance || 0)
                };
            }

            // If no COB record, calculate from transactions
            // This is a fallback - ideally should always have COB records
            const salesData = await getData(`
                SELECT sp.payment_method, sp.amount
                FROM sales s
                JOIN sale_payments sp ON s.id = sp.sale_id
                WHERE DATE(s.created_at) <= ?
                AND (s.sale_status = 'completed' OR s.sale_status IS NULL)
            `, [date]);

            const servicesData = await getData(`
                SELECT advance_payment_method as payment_method, advance_amount as amount
                FROM service_jobs
                WHERE DATE(created_at) <= ? AND advance_amount > 0
                UNION ALL
                SELECT final_payment_method as payment_method, final_payment_amount as amount
                FROM service_jobs
                WHERE DATE(actual_delivery_date) <= ? AND final_payment_amount > 0
            `, [date, date]);

            const expensesData = await getData(`
                SELECT payment_mode as payment_method, amount
                FROM expenses
                WHERE DATE(expense_date) <= ?
            `, [date]);

            // Calculate balances
            let cashBalance = 0;
            let accountBalance = 0;

            // Add sales income
            salesData.forEach(payment => {
                const amount = parseFloat(payment.amount || 0);
                if (payment.payment_method === 'cash') {
                    cashBalance += amount;
                } else {
                    accountBalance += amount;
                }
            });

            // Add service income
            servicesData.forEach(payment => {
                const amount = parseFloat(payment.amount || 0);
                if (payment.payment_method === 'cash') {
                    cashBalance += amount;
                } else {
                    accountBalance += amount;
                }
            });

            // Subtract expenses
            expensesData.forEach(expense => {
                const amount = parseFloat(expense.amount || 0);
                if (expense.payment_method === 'cash') {
                    cashBalance -= amount;
                } else {
                    accountBalance -= amount;
                }
            });

            return {
                cash: cashBalance,
                account: accountBalance
            };

        } catch (error) {
            console.error('Get ledger balance error:', error);
            return { cash: 0, account: 0 };
        }
    });

    // Complete COB (Close of Business)
    ipcMain.handle('complete-cob', async (event, cobData) => {
        const db = getDatabase();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Create COB records table if it doesn't exist
                db.run(`CREATE TABLE IF NOT EXISTS cob_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL UNIQUE,
                    cash_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
                    account_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
                    total_sales_count INTEGER DEFAULT 0,
                    total_services_count INTEGER DEFAULT 0,
                    total_expenses_count INTEGER DEFAULT 0,
                    next_day_notes TEXT,
                    completed_by INTEGER,
                    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (completed_by) REFERENCES users(id)
                )`, (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    // Insert or replace COB record
                    db.run(`INSERT OR REPLACE INTO cob_records (
                        date, cash_balance, account_balance, total_sales_count, 
                        total_services_count, total_expenses_count, next_day_notes, 
                        completed_by, completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        cobData.date,
                        cobData.balances.cash,
                        cobData.balances.account,
                        cobData.transactions.sales,
                        cobData.transactions.services,
                        cobData.transactions.expenses,
                        cobData.nextDayNotes,
                        cobData.completedBy,
                        cobData.completedAt
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

    // Get COB history
    ipcMain.handle('get-cob-history', async (event, limit = 30) => {
        try {
            return await getData(`
                SELECT c.*, u.full_name as completed_by_name
                FROM cob_records c
                LEFT JOIN users u ON c.completed_by = u.id
                ORDER BY c.date DESC
                LIMIT ?
            `, [limit]);
        } catch (error) {
            console.error('Get COB history error:', error);
            throw error;
        }
    });

    // Get today's business summary for dashboard
    ipcMain.handle('get-today-business-summary', async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get today's sales summary
            const salesSummary = await getRow(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(total_amount), 0) as total_amount,
                    COALESCE(SUM(CASE WHEN sp.payment_method = 'cash' THEN sp.amount ELSE 0 END), 0) as cash_amount,
                    COALESCE(SUM(CASE WHEN sp.payment_method != 'cash' THEN sp.amount ELSE 0 END), 0) as digital_amount
                FROM sales s
                LEFT JOIN sale_payments sp ON s.id = sp.sale_id
                WHERE DATE(s.created_at) = ?
                AND (s.sale_status = 'completed' OR s.sale_status IS NULL)
            `, [today]);

            // Get today's services summary
            const servicesSummary = await getRow(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(advance_amount), 0) as total_advance,
                    COALESCE(SUM(CASE WHEN advance_payment_method = 'cash' THEN advance_amount ELSE 0 END), 0) as cash_advance,
                    COALESCE(SUM(CASE WHEN advance_payment_method != 'cash' THEN advance_amount ELSE 0 END), 0) as digital_advance
                FROM service_jobs
                WHERE DATE(created_at) = ?
            `, [today]);

            // Get today's expenses summary
            const expensesSummary = await getRow(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0) as cash_amount,
                    COALESCE(SUM(CASE WHEN payment_mode != 'cash' THEN amount ELSE 0 END), 0) as digital_amount
                FROM expenses
                WHERE DATE(expense_date) = ?
            `, [today]);

            return {
                sales: salesSummary || { count: 0, total_amount: 0, cash_amount: 0, digital_amount: 0 },
                services: servicesSummary || { count: 0, total_advance: 0, cash_advance: 0, digital_advance: 0 },
                expenses: expensesSummary || { count: 0, total_amount: 0, cash_amount: 0, digital_amount: 0 }
            };

        } catch (error) {
            console.error('Get today business summary error:', error);
            throw error;
        }
    });
}

module.exports = { setupIpcHandlers };