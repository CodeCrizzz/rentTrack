const db = require('../config/db');

// @desc    Get all bills
// @route   GET /api/admin/bills
// @access  Private/Admin
const getAllBills = async (req, res) => {
    try {
        // --- 1. AUTO-GENERATE BILLS FOR CURRENT MONTH ---
        const activeTenantsQuery = `
            SELECT u.id as tenant_id, u.room_id, r.price as rent_amount
            FROM users u
            JOIN rooms r ON u.room_id = r.id
            WHERE u.role = 'tenant' AND u.status = 'Active' AND u.room_id IS NOT NULL
        `;
        const { rows: tenants } = await db.query(activeTenantsQuery);

        if (tenants.length > 0) {
            const currentDate = new Date();
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const currentMonthName = monthNames[currentDate.getMonth()];
            const currentYear = currentDate.getFullYear();
            const billingMonthStr = `${currentMonthName} ${currentYear}`;
            const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 5);

            for (const tenant of tenants) {
                const checkBillQuery = `SELECT id FROM bills WHERE tenant_id = $1 AND billing_month = $2`;
                const { rows: existingBills } = await db.query(checkBillQuery, [tenant.tenant_id, billingMonthStr]);

                if (existingBills.length === 0) {
                    const totalAmount = tenant.rent_amount;
                    const insertBillQuery = `
                        INSERT INTO bills (tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, total_amount, balance, status, notes)
                        VALUES ($1, $2, $3, $4, $5, 0, 0, 0, $6, $7, 'Unpaid', 'Auto-generated bill')
                    `;
                    await db.query(insertBillQuery, [
                        tenant.tenant_id, tenant.room_id, billingMonthStr, dueDate,
                        tenant.rent_amount, totalAmount, totalAmount
                    ]);
                }
            }
        }
        // ------------------------------------------------

        const query = `
            SELECT b.*, u.name as tenant_name, r.room_number 
            FROM bills b
            LEFT JOIN users u ON b.tenant_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ORDER BY b.created_at DESC
        `;
        const { rows } = await db.query(query);
        
        // Dynamic status check (e.g. if due_date passed and unpaid)
        const currentDate = new Date();
        const updatedRows = rows.map(bill => {
            let status = bill.status;
            const dueDate = new Date(bill.due_date);
            
            if (bill.balance > 0 && dueDate < currentDate && status !== 'Overdue') {
                status = 'Overdue';
            }
            return { ...bill, status };
        });

        res.json(updatedRows);
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ message: 'Server error fetching bills' });
    }
};

// @desc    Get single bill with payment history
// @route   GET /api/admin/bills/:id
// @access  Private/Admin
const getBillById = async (req, res) => {
    try {
        const billId = req.params.id;
        const billQuery = `
            SELECT b.*, u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone, r.room_number 
            FROM bills b
            LEFT JOIN users u ON b.tenant_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            WHERE b.id = $1
        `;
        const { rows: billRows } = await db.query(billQuery, [billId]);

        if (billRows.length === 0) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        let bill = billRows[0];
        
        // Check dynamic overdue
        const currentDate = new Date();
        const dueDate = new Date(bill.due_date);
        if (bill.balance > 0 && dueDate < currentDate && bill.status !== 'Overdue') {
            bill.status = 'Overdue';
        }

        const paymentsQuery = `
            SELECT * FROM payments WHERE bill_id = $1 ORDER BY payment_date DESC
        `;
        const { rows: paymentRows } = await db.query(paymentsQuery, [billId]);

        res.json({
            ...bill,
            payments: paymentRows
        });
    } catch (error) {
        console.error('Error fetching bill:', error);
        res.status(500).json({ message: 'Server error fetching bill details' });
    }
};

// @desc    Create a bill
// @route   POST /api/admin/bills
// @access  Private/Admin
const createBill = async (req, res) => {
    try {
        const { tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, notes } = req.body;

        const rent = parseFloat(rent_amount || 0);
        const water = parseFloat(water_charges || 0);
        const electricity = parseFloat(electricity_charges || 0);
        const other = parseFloat(other_fees || 0);
        
        const total_amount = rent + water + electricity + other;
        const balance = total_amount; // newly created bill has no payments yet
        const status = 'Unpaid';

        const query = `
            INSERT INTO bills (tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, total_amount, balance, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const values = [tenant_id, room_id, billing_month, due_date, rent, water, electricity, other, total_amount, balance, status, notes];

        const { rows } = await db.query(query, values);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating bill:', error);
        res.status(500).json({ message: 'Server error creating bill' });
    }
};

// @desc    Update a bill
// @route   PUT /api/admin/bills/:id
// @access  Private/Admin
const updateBill = async (req, res) => {
    try {
        const billId = req.params.id;
        const { billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, notes } = req.body;

        // Fetch current bill to get amount_paid
        const { rows: currentBillRows } = await db.query('SELECT amount_paid FROM bills WHERE id = $1', [billId]);
        if (currentBillRows.length === 0) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        
        const amount_paid = parseFloat(currentBillRows[0].amount_paid);

        const rent = parseFloat(rent_amount || 0);
        const water = parseFloat(water_charges || 0);
        const electricity = parseFloat(electricity_charges || 0);
        const other = parseFloat(other_fees || 0);
        
        const total_amount = rent + water + electricity + other;
        const balance = total_amount - amount_paid;
        
        let status = 'Unpaid';
        if (balance <= 0) {
            status = 'Paid';
        } else if (amount_paid > 0) {
            status = 'Partial';
        }

        const query = `
            UPDATE bills
            SET billing_month = $1, due_date = $2, rent_amount = $3, water_charges = $4, electricity_charges = $5, other_fees = $6, total_amount = $7, balance = $8, status = $9, notes = $10
            WHERE id = $11
            RETURNING *
        `;
        const values = [billing_month, due_date, rent, water, electricity, other, total_amount, balance, status, notes, billId];

        const { rows } = await db.query(query, values);
        res.json(rows[0]);

    } catch (error) {
        console.error('Error updating bill:', error);
        res.status(500).json({ message: 'Server error updating bill' });
    }
};

// @desc    Delete a bill
// @route   DELETE /api/admin/bills/:id
// @access  Private/Admin
const deleteBill = async (req, res) => {
    try {
        const billId = req.params.id;
        const { rowCount } = await db.query('DELETE FROM bills WHERE id = $1', [billId]);
        
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        
        res.json({ message: 'Bill removed' });
    } catch (error) {
        console.error('Error deleting bill:', error);
        res.status(500).json({ message: 'Server error deleting bill' });
    }
};

// @desc    Record a payment for a bill
// @route   POST /api/admin/bills/:id/pay
// @access  Private/Admin
const payBill = async (req, res) => {
    try {
        const billId = req.params.id;
        const { amount_paid, payment_date, payment_method, notes } = req.body;

        const paymentAmount = parseFloat(amount_paid);

        // Fetch current bill
        const { rows: billRows } = await db.query('SELECT total_amount, amount_paid FROM bills WHERE id = $1', [billId]);
        if (billRows.length === 0) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        const bill = billRows[0];
        const newTotalPaid = parseFloat(bill.amount_paid) + paymentAmount;
        const newBalance = parseFloat(bill.total_amount) - newTotalPaid;
        
        let newStatus = 'Partial';
        if (newBalance <= 0) {
            newStatus = 'Paid';
        }

        // Must run in transaction or sequentially
        await db.query('BEGIN');

        // 1. Insert Payment
        const paymentQuery = `
            INSERT INTO payments (bill_id, amount_paid, payment_date, payment_method, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const paymentValues = [billId, paymentAmount, payment_date || new Date(), payment_method, notes];
        const { rows: paymentResult } = await db.query(paymentQuery, paymentValues);

        // 2. Update Bill Status
        const updateBillQuery = `
            UPDATE bills
            SET amount_paid = $1, balance = $2, status = $3
            WHERE id = $4
            RETURNING *
        `;
        const { rows: updatedBillResult } = await db.query(updateBillQuery, [newTotalPaid, newBalance, newStatus, billId]);

        await db.query('COMMIT');

        res.status(201).json({
            payment: paymentResult[0],
            bill: updatedBillResult[0]
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Server error recording payment' });
    }
};

// @desc    Manually trigger generation of monthly bills for all active tenants
// @route   POST /api/admin/bills/generate
// @access  Private/Admin
const generateMonthlyBills = async (req, res) => {
    try {
        const activeTenantsQuery = `
            SELECT u.id as tenant_id, u.room_id, u.created_at, r.price as rent_amount, r.rental_type
            FROM users u
            JOIN rooms r ON u.room_id = r.id
            WHERE u.role = 'tenant' AND u.status = 'Active' AND u.room_id IS NOT NULL
            ORDER BY u.created_at ASC
        `;
        const { rows: allTenants } = await db.query(activeTenantsQuery);

        if (allTenants.length === 0) {
            return res.json({ message: 'No active tenants found for automatic billing.' });
        }

        // Filter tenants based on rental_type
        // For 'Whole Room', only bill the first active tenant in that room
        const billedRoomIds = new Set();
        const tenantsToBill = [];

        for (const tenant of allTenants) {
            if (tenant.rental_type === 'Whole Room') {
                if (!billedRoomIds.has(tenant.room_id)) {
                    billedRoomIds.add(tenant.room_id);
                    tenantsToBill.push(tenant);
                }
            } else {
                // For 'Per Bed / Bedspace', bill everyone
                tenantsToBill.push(tenant);
            }
        }

        const currentDate = new Date();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthName = monthNames[currentDate.getMonth()];
        const currentYear = currentDate.getFullYear();
        const billingMonthStr = `${currentMonthName} ${currentYear}`;

        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 5);
        let billsGenerated = 0;

        for (const tenant of tenantsToBill) {
            const checkBillQuery = `
                SELECT id FROM bills WHERE tenant_id = $1 AND billing_month = $2
            `;
            const { rows: existingBills } = await db.query(checkBillQuery, [tenant.tenant_id, billingMonthStr]);

            if (existingBills.length === 0) {
                const waterCharges = 0;
                const electricityCharges = 0;
                const otherFees = 0;
                const totalAmount = tenant.rent_amount;
                const balance = totalAmount;
                const status = 'Unpaid';
                const notes = 'Auto-generated bill';

                const insertBillQuery = `
                    INSERT INTO bills (tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, total_amount, balance, status, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `;
                const values = [
                    tenant.tenant_id, tenant.room_id, billingMonthStr, dueDate,
                    tenant.rent_amount, waterCharges, electricityCharges, otherFees,
                    totalAmount, balance, status, notes
                ];

                await db.query(insertBillQuery, values);
                billsGenerated++;
            }
        }

        res.json({ message: `Successfully generated ${billsGenerated} bills for ${billingMonthStr}.` });
    } catch (error) {
        console.error('Error generating monthly bills:', error);
        res.status(500).json({ message: 'Server error generating monthly bills' });
    }
};

module.exports = {
    getAllBills,
    getBillById,
    createBill,
    updateBill,
    deleteBill,
    payBill,
    generateMonthlyBills
};
