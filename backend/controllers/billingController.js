const db = require('../config/db');
const { generateUniqueInvoiceNumber } = require('../utils/invoiceNumberGenerator');
const { generateUniqueReferenceNumber } = require('../utils/referenceNumberGenerator');
const { FIXED_WATER_CHARGE, FIXED_ELECTRICITY_CHARGE, resolveUtilityCharges, autoGenerateBills } = require('../utils/billingUtils');
const { sendBillGeneratedEmail } = require('../services/emailService');

let additionalChargesColumnEnsured = false;
const ensureAdditionalChargesColumn = async () => {
    if (additionalChargesColumnEnsured) return;
    await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS additional_charges JSONB DEFAULT '[]'::jsonb`);
    additionalChargesColumnEnsured = true;
};

const sanitizeAdditionalCharges = (rawCharges, fallbackOtherFees = 0, fallbackNotes = null) => {
    if (Array.isArray(rawCharges)) {
        return rawCharges
            .map((item) => ({
                label: String(item?.label || '').trim() || 'Additional Charge',
                amount: Math.max(0, parseFloat(item?.amount) || 0),
            }))
            .filter((item) => item.amount > 0);
    }
    const other = Math.max(0, parseFloat(fallbackOtherFees) || 0);
    if (other > 0) {
        const label =
            fallbackNotes &&
            typeof fallbackNotes === 'string' &&
            fallbackNotes.trim() &&
            fallbackNotes.trim() !== 'Auto-generated bill'
                ? fallbackNotes.trim()
                : 'Additional Charge';
        return [{ label, amount: other }];
    }
    return [];
};

// Normalize online / QRPh / GCash payment method names to "E-Wallet"
const normalizeOnlinePaymentMethod = (method, fallback = 'Cash') => {
    const raw = (method || '').trim();
    if (!raw) return fallback;
    const lower = raw.toLowerCase();
    if (lower === 'cash') return 'Cash';
    if (
        lower.includes('gcash') ||
        lower.includes('qrph') ||
        lower.includes('qr ph') ||
        lower.includes('e-wallet') ||
        lower.includes('ewallet') ||
        lower === 'online'
    ) {
        return 'E-Wallet';
    }
    return raw;
};

// @desc    Get all bills
// @route   GET /api/admin/bills
// @access  Private/Admin
const getAllBills = async (req, res) => {
    try {
        await ensureAdditionalChargesColumn();
        // --- 1. AUTO-GENERATE BILLS (7 DAYS BEFORE DUE DATE) ---
        await autoGenerateBills(db);
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
            const additional_charges = sanitizeAdditionalCharges(
                bill.additional_charges,
                bill.other_fees,
                bill.notes
            );
            return { ...bill, status, additional_charges };
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
        await ensureAdditionalChargesColumn();
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
            additional_charges: sanitizeAdditionalCharges(
                bill.additional_charges,
                bill.other_fees,
                bill.notes
            ),
            payments: paymentRows.map((p) => ({
                ...p,
                payment_method: normalizeOnlinePaymentMethod(p.payment_method, 'Cash')
            }))
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
        await ensureAdditionalChargesColumn();
        const { tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, additional_charges, notes } = req.body;

        const rent = parseFloat(rent_amount || 0);
        const { water, electricity } = resolveUtilityCharges(water_charges, electricity_charges);
        const cleanCharges = sanitizeAdditionalCharges(additional_charges, other_fees, notes);
        const other = Array.isArray(additional_charges)
            ? cleanCharges.reduce((sum, item) => sum + item.amount, 0)
            : parseFloat(other_fees || 0);
        
        const total_amount = rent + water + electricity + other;
        const balance = total_amount; // newly created bill has no payments yet
        const status = 'Unpaid';

        const invoiceNumber = await generateUniqueInvoiceNumber(db);

        const query = `
            INSERT INTO bills (tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, additional_charges, total_amount, balance, status, notes, invoice_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const values = [tenant_id, room_id, billing_month, due_date, rent, water, electricity, other, JSON.stringify(cleanCharges), total_amount, balance, status, notes, invoiceNumber];

        const { rows } = await db.query(query, values);
        const createdBill = rows[0];

        // Send email notification to the tenant's sign-up email account
        try {
            const tenantRes = await db.query(
                `SELECT u.name, u.email, r.room_number 
                 FROM users u 
                 LEFT JOIN rooms r ON COALESCE(u.room_id, $2) = r.id 
                 WHERE u.id = $1`,
                [tenant_id, createdBill.room_id || null]
            );
            const tenantData = tenantRes.rows[0];
            if (tenantData?.email) {
                sendBillGeneratedEmail({
                    to: tenantData.email,
                    tenantName: tenantData.name,
                    roomNumber: tenantData.room_number,
                    invoiceNumber: createdBill.invoice_number,
                    billingMonth: createdBill.billing_month,
                    dueDate: createdBill.due_date,
                    totalAmount: createdBill.total_amount,
                    balance: createdBill.balance,
                    breakdown: {
                        rent: createdBill.rent_amount,
                        water: createdBill.water_charges,
                        electricity: createdBill.electricity_charges,
                        other: createdBill.other_fees,
                    },
                    additionalCharges: cleanCharges,
                    notes: createdBill.notes
                }).catch((emailErr) => {
                    console.error('[createBill] Failed to dispatch bill email:', emailErr.message);
                });
            }

            // Also record in-app notification for the tenant
            await db.query(
                `INSERT INTO "rentTrack_schema".notifications (user_id, title, message, type, is_read)
                 VALUES ($1, $2, $3, 'billing', FALSE)`,
                [
                    tenant_id,
                    `New Bill Statement: ${createdBill.billing_month}`,
                    `Your bill for ${createdBill.billing_month} (Invoice #${createdBill.invoice_number}) for ₱${Number(createdBill.total_amount).toLocaleString()} has been generated.`
                ]
            ).catch(() => {});
        } catch (notifErr) {
            console.error('[createBill] Notification dispatch error:', notifErr.message);
        }

        res.status(201).json(createdBill);
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
        await ensureAdditionalChargesColumn();
        const billId = req.params.id;
        const { billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, additional_charges, notes } = req.body;

        // Fetch current bill to get amount_paid
        const { rows: currentBillRows } = await db.query('SELECT amount_paid FROM bills WHERE id = $1', [billId]);
        if (currentBillRows.length === 0) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        
        const amount_paid = parseFloat(currentBillRows[0].amount_paid);

        const rent = parseFloat(rent_amount || 0);
        const { water, electricity } = resolveUtilityCharges(water_charges, electricity_charges);
        const cleanCharges = sanitizeAdditionalCharges(additional_charges, other_fees, notes);
        const other = Array.isArray(additional_charges)
            ? cleanCharges.reduce((sum, item) => sum + item.amount, 0)
            : parseFloat(other_fees || 0);
        
        const total_amount = rent + water + electricity + other;
        const balance = Math.max(0, total_amount - amount_paid);
        
        let status = 'Unpaid';
        if (balance <= 0) {
            status = 'Paid';
        } else if (amount_paid > 0) {
            status = 'Partial';
        }

        const query = `
            UPDATE bills
            SET billing_month = $1, due_date = $2, rent_amount = $3, water_charges = $4, electricity_charges = $5, other_fees = $6, additional_charges = $7::jsonb, total_amount = $8, balance = $9, status = $10, notes = $11
            WHERE id = $12
            RETURNING *
        `;
        const values = [billing_month, due_date, rent, water, electricity, other, JSON.stringify(cleanCharges), total_amount, balance, status, notes, billId];

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
        const newBalance = Math.max(0, parseFloat(bill.total_amount) - newTotalPaid);
        
        let newStatus = 'Partial';
        if (newBalance <= 0) {
            newStatus = 'Paid';
        }

        // Auto-generate a random 10-digit reference for every recorded payment.
        const refNumber = await generateUniqueReferenceNumber(db);

        // Must run in transaction or sequentially
        await db.query('BEGIN');

        // 1. Insert Payment
        const paymentQuery = `
            INSERT INTO payments (bill_id, amount_paid, payment_date, payment_method, notes, status, reference_number)
            VALUES ($1, $2, $3, $4, $5, 'Approved', $6)
            RETURNING *
        `;
        const paymentValues = [billId, paymentAmount, payment_date || new Date(), payment_method || 'Cash', notes || null, refNumber];
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
        await ensureAdditionalChargesColumn();
        const result = await autoGenerateBills(db, new Date(), true);
        res.json({
            message: `Successfully processed billing statements (${result.generatedCount} generated).`,
            billsGenerated: result.generatedCount,
            cycles: result.cyclesChecked
        });
    } catch (error) {
        console.error('Error generating bills:', error);
        res.status(500).json({ message: 'Server error generating bills' });
    }
};

// @desc    Get all pending payments for verification
// @route   GET /api/admin/bills/payments/pending
// @access  Private/Admin
const getPendingPayments = async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        res.status(500).json({ message: 'Server error fetching pending payments' });
    }
};

// @desc    Get count of pending payments
// @route   GET /api/admin/bills/payments/pending-count
// @access  Private/Admin
const getPendingPaymentsCount = async (req, res) => {
    try {
        res.json({ pendingCount: 0 });
    } catch (error) {
        console.error('Error fetching pending payments count:', error);
        res.status(500).json({ message: 'Server error fetching pending payments count' });
    }
};


// @desc    Verify (Approve/Reject) a pending payment
// @route   POST /api/admin/bills/payments/:paymentId/verify
// @access  Private/Admin
const verifyPayment = async (req, res) => {
    const paymentId = req.params.paymentId;
    const { action } = req.body; // 'approve' or 'reject'

    try {
        await db.query('BEGIN');

        // 1. Get payment and associated bill
        const paymentQuery = `SELECT * FROM payments WHERE id = $1 AND status = 'Pending Verification'`;
        const { rows: paymentRows } = await db.query(paymentQuery, [paymentId]);
        
        if (paymentRows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Pending payment not found' });
        }

        const payment = paymentRows[0];
        const billId = payment.bill_id;
        const paymentAmount = parseFloat(payment.amount_paid);

        const billQuery = `SELECT total_amount, amount_paid FROM bills WHERE id = $1`;
        const { rows: billRows } = await db.query(billQuery, [billId]);
        const bill = billRows[0];

        if (action === 'approve') {
            // Update payment status
            await db.query(`UPDATE payments SET status = 'Approved' WHERE id = $1`, [paymentId]);

            // Deduct balance and update bill status
            const newTotalPaid = parseFloat(bill.amount_paid) + paymentAmount;
            const newBalance = Math.max(0, parseFloat(bill.total_amount) - newTotalPaid);
            
            let newStatus = 'Partial';
            if (newBalance <= 0) {
                newStatus = 'Paid';
            }

            await db.query(`
                UPDATE bills
                SET amount_paid = $1, balance = $2, status = $3
                WHERE id = $4
            `, [newTotalPaid, newBalance, newStatus, billId]);
            
            await db.query('COMMIT');
            res.json({ message: 'Payment approved successfully', newStatus, newBalance });

        } else if (action === 'reject') {
            // Update payment status
            await db.query(`UPDATE payments SET status = 'Rejected' WHERE id = $1`, [paymentId]);

            // We must update the bill status back to Overdue or Unpaid, checking the original balance
            const currentBalance = parseFloat(bill.total_amount) - parseFloat(bill.amount_paid);
            
            // Check if overdue
            const { rows: dueDateRows } = await db.query(`SELECT due_date FROM bills WHERE id = $1`, [billId]);
            const dueDate = new Date(dueDateRows[0].due_date);
            const currentDate = new Date();
            
            let revertStatus = 'Unpaid';
            if (currentBalance <= 0) revertStatus = 'Paid';
            else if (parseFloat(bill.amount_paid) > 0) revertStatus = 'Partial';
            else if (dueDate < currentDate) revertStatus = 'Overdue';

            await db.query(`UPDATE bills SET status = $1 WHERE id = $2`, [revertStatus, billId]);

            await db.query('COMMIT');
            res.json({ message: 'Payment rejected successfully' });
        } else {
            await db.query('ROLLBACK');
            res.status(400).json({ message: 'Invalid action' });
        }

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server error verifying payment' });
    }
};

// @desc    Get all payments
// @route   GET /api/admin/bills/payments
// @access  Private/Admin
const getAllPayments = async (req, res) => {
    try {
        const query = `
            SELECT p.*, p.reference_number AS referenceNumber, b.tenant_id, b.billing_month, b.invoice_number, b.total_amount as bill_total, b.balance as bill_balance, u.name as tenant_name, r.room_number 
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            JOIN users u ON b.tenant_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            WHERE (p.status IN ('Approved', 'Verified', 'Paid') OR p.status IS NULL)
              AND (p.status NOT IN ('Pending Verification', 'Pending', 'Rejected') OR p.status IS NULL)
            ORDER BY p.payment_date DESC
        `;
        const { rows } = await db.query(query);
        res.json(rows.map((row) => ({
            ...row,
            payment_method: normalizeOnlinePaymentMethod(row.payment_method, 'Cash')
        })));
    } catch (error) {
        console.error('Error fetching all payments:', error);
        res.status(500).json({ message: 'Server error fetching all payments' });
    }
};

// @desc    Get full payment history across all statuses (optionally filtered by tenant_id)
// @route   GET /api/admin/bills/payments/history
// @access  Private/Admin
const getPaymentHistory = async (req, res) => {
    try {
        const { tenant_id } = req.query;
        const params = [];
        let whereClause = '';
        if (tenant_id) {
            params.push(tenant_id);
            whereClause = 'WHERE b.tenant_id = $1';
        }
        const query = `
            SELECT p.*, p.reference_number AS referenceNumber, b.tenant_id, b.billing_month, b.invoice_number, b.total_amount as bill_total, b.balance as bill_balance, u.name as tenant_name, r.room_number
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            JOIN users u ON b.tenant_id = u.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ${whereClause}
            ORDER BY p.payment_date DESC, p.id DESC
        `;
        const { rows } = await db.query(query, params);
        res.json(rows.map((row) => ({
            ...row,
            payment_method: normalizeOnlinePaymentMethod(row.payment_method, 'Cash')
        })));
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ message: 'Server error fetching payment history' });
    }
};

const { checkAndSendPaymentReminders } = require('../services/reminderService');

// @desc    Trigger payment due and overdue reminders manually from Admin
// @route   POST /api/admin/bills/reminders
// @access  Private/Admin
const triggerPaymentReminders = async (req, res) => {
    try {
        const summary = await checkAndSendPaymentReminders();
        res.status(200).json({
            message: 'Payment reminders processed successfully',
            summary
        });
    } catch (error) {
        console.error('Error triggering payment reminders:', error);
        res.status(500).json({ message: 'Error triggering payment reminders', error: error.message });
    }
};

module.exports = {
    getAllBills,
    getBillById,
    createBill,
    updateBill,
    deleteBill,
    payBill,
    generateMonthlyBills,
    getPendingPayments,
    getPendingPaymentsCount,
    verifyPayment,
    getAllPayments,
    getPaymentHistory,
    triggerPaymentReminders
};
