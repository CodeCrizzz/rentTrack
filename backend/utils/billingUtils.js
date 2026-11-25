// Fixed monthly utility charges applied to every generated bill.
const FIXED_WATER_CHARGE = 300;
const FIXED_ELECTRICITY_CHARGE = 700;
const { sendBillGeneratedEmail } = require('../services/emailService');

// Default due day of the month for monthly billing cycles (5th of each month)
const DEFAULT_DUE_DAY = 5;

// Billing statements are generated 7 days before the due date
const BILL_LEAD_DAYS = 7;

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Resolve the utility charges for a bill. Explicit values supplied by the
// administrator are respected; anything missing falls back to the fixed rates.
const resolveUtilityCharges = (water, electricity) => {
    const isMissing = (value) =>
        value === undefined || value === null || value === '';

    return {
        water: isMissing(water)
            ? FIXED_WATER_CHARGE
            : parseFloat(water) || 0,
        electricity: isMissing(electricity)
            ? FIXED_ELECTRICITY_CHARGE
            : parseFloat(electricity) || 0,
    };
};

/**
 * Returns billing cycles that are eligible to be generated as of `refDate`.
 * A billing statement due on day `dueDay` of Month M is generated `BILL_LEAD_DAYS` (7 days) before the due date.
 *
 * @param {Date} refDate - Date to check against (defaults to now)
 * @param {number} dueDay - Day of month the bill is due (default 5)
 * @param {boolean} forceUpcoming - If true, include upcoming cycle even if before 7-day mark
 * @returns {Array<{ monthName: string, year: number, billingMonth: string, dueDate: Date, dueDateStr: string, generationDate: Date }>}
 */
const getActiveBillingCycles = (refDate = new Date(), dueDay = DEFAULT_DUE_DAY, forceUpcoming = false) => {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    const cycles = [];

    // 1. Current month's cycle (e.g. November 2026 due Nov 5)
    // Generation threshold: dueDay - BILL_LEAD_DAYS (e.g. Oct 29)
    const dueDateCurrent = new Date(y, m, dueDay);
    const genDateCurrent = new Date(y, m, dueDay - BILL_LEAD_DAYS);
    const dueCurrentStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    if (refDate >= genDateCurrent) {
        cycles.push({
            monthName: MONTH_NAMES[m],
            year: y,
            billingMonth: `${MONTH_NAMES[m]} ${y}`,
            dueDate: dueDateCurrent,
            dueDateStr: dueCurrentStr,
            generationDate: genDateCurrent
        });
    }

    // 2. Next month's cycle (e.g. December 2026 due Dec 5)
    // Generation threshold: 7 days before Dec 5 (e.g. Nov 28)
    const nextDate = new Date(y, m + 1, 1);
    const nm = nextDate.getMonth();
    const ny = nextDate.getFullYear();
    const dueDateNext = new Date(ny, nm, dueDay);
    const genDateNext = new Date(ny, nm, dueDay - BILL_LEAD_DAYS);
    const dueNextStr = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    if (forceUpcoming || refDate >= genDateNext) {
        cycles.push({
            monthName: MONTH_NAMES[nm],
            year: ny,
            billingMonth: `${MONTH_NAMES[nm]} ${ny}`,
            dueDate: dueDateNext,
            dueDateStr: dueNextStr,
            generationDate: genDateNext
        });
    }

    return cycles;
};

/**
 * Automatically generate billing statements for active tenants for all eligible cycles.
 * Statements are generated 7 days before their due date.
 *
 * @param {object} db - Database connection
 * @param {Date} refDate - Reference date (default now)
 * @param {boolean} forceUpcoming - Force upcoming cycle generation
 * @returns {Promise<{ generatedCount: number, bills: Array, cyclesChecked: Array }>}
 */
const autoGenerateBills = async (db, refDate = new Date(), forceUpcoming = false) => {
    if (!db) return { generatedCount: 0, bills: [], cyclesChecked: [] };

    try {
        const activeTenantsQuery = `
            SELECT u.id as tenant_id, u.name as tenant_name, u.email as tenant_email, u.room_id, u.created_at, r.price as rent_amount, r.rental_type, r.room_number
            FROM users u
            JOIN rooms r ON u.room_id = r.id
            WHERE u.role = 'tenant' AND u.status = 'Active' AND u.room_id IS NOT NULL
            ORDER BY u.created_at ASC
        `;
        const { rows: allTenants } = await db.query(activeTenantsQuery);
        if (allTenants.length === 0) {
            return { generatedCount: 0, bills: [], cyclesChecked: [] };
        }

        const billedRoomIds = new Set();
        const tenantsToBill = [];
        for (const tenant of allTenants) {
            if (tenant.rental_type === 'Whole Room') {
                if (!billedRoomIds.has(tenant.room_id)) {
                    billedRoomIds.add(tenant.room_id);
                    tenantsToBill.push(tenant);
                }
            } else {
                tenantsToBill.push(tenant);
            }
        }

        const cycles = getActiveBillingCycles(refDate, DEFAULT_DUE_DAY, forceUpcoming);
        const generatedBills = [];
        const { generateUniqueInvoiceNumber } = require('./invoiceNumberGenerator');

        for (const cycle of cycles) {
            for (const tenant of tenantsToBill) {
                const checkBillQuery = `
                    SELECT id FROM bills WHERE tenant_id = $1 AND billing_month = $2
                `;
                const { rows: existingBills } = await db.query(checkBillQuery, [tenant.tenant_id, cycle.billingMonth]);

                if (existingBills.length === 0) {
                    const rentAmount = Math.max(0, parseFloat(tenant.rent_amount) || 0);
                    const waterCharges = FIXED_WATER_CHARGE;
                    const electricityCharges = FIXED_ELECTRICITY_CHARGE;
                    const otherFees = 0;
                    const totalAmount = rentAmount + waterCharges + electricityCharges + otherFees;
                    const balance = totalAmount;
                    const status = 'Unpaid';
                    const invoiceNumber = await generateUniqueInvoiceNumber(db);

                    const insertBillQuery = `
                        INSERT INTO bills (
                            tenant_id, room_id, billing_month, due_date,
                            rent_amount, water_charges, electricity_charges, other_fees,
                            total_amount, balance, status, invoice_number
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        RETURNING *
                    `;
                    const values = [
                        tenant.tenant_id,
                        tenant.room_id,
                        cycle.billingMonth,
                        cycle.dueDateStr,
                        rentAmount,
                        waterCharges,
                        electricityCharges,
                        otherFees,
                        totalAmount,
                        balance,
                        status,
                        invoiceNumber
                    ];

                    const { rows: newBillRows } = await db.query(insertBillQuery, values);
                    if (newBillRows.length > 0) {
                        const billRecord = newBillRows[0];
                        generatedBills.push(billRecord);

                        // Dispatch email notification to tenant's sign-up email account
                        if (tenant.tenant_email) {
                            sendBillGeneratedEmail({
                                to: tenant.tenant_email,
                                tenantName: tenant.tenant_name,
                                roomNumber: tenant.room_number,
                                invoiceNumber: billRecord.invoice_number,
                                billingMonth: billRecord.billing_month,
                                dueDate: billRecord.due_date,
                                totalAmount: billRecord.total_amount,
                                balance: billRecord.balance,
                                breakdown: {
                                    rent: billRecord.rent_amount,
                                    water: billRecord.water_charges,
                                    electricity: billRecord.electricity_charges,
                                    other: billRecord.other_fees,
                                },
                            }).catch((emailErr) => {
                                console.error('[autoGenerateBills] Failed to dispatch bill email:', emailErr.message);
                            });

                            // Record in-app notification
                            db.query(
                                `INSERT INTO "rentTrack_schema".notifications (user_id, title, message, type, bill_id, is_read)
                                 VALUES ($1, $2, $3, 'billing', $4, FALSE)`,
                                [
                                    tenant.tenant_id,
                                    `New Bill Statement: ${billRecord.billing_month}`,
                                    `Your bill for ${billRecord.billing_month} (Invoice #${billRecord.invoice_number}) for ₱${Number(billRecord.total_amount).toLocaleString()} has been generated.`,
                                    billRecord.id
                                ]
                            ).catch(() => {});
                        }
                    }
                }
            }
        }

        return {
            generatedCount: generatedBills.length,
            bills: generatedBills,
            cyclesChecked: cycles.map((c) => c.billingMonth)
        };
    } catch (err) {
        console.error('[autoGenerateBills] Error:', err);
        return { generatedCount: 0, bills: [], cyclesChecked: [], error: err.message };
    }
};

/**
 * Auto-generate any eligible bills for a single tenant (7 days before due date).
 *
 * @param {object} db - Database connection
 * @param {number|string} tenantId - Tenant ID
 * @param {Date} refDate - Reference date (defaults to now)
 * @returns {Promise<Array>} - Generated bills
 */
const autoGenerateBillsForTenant = async (db, tenantId, refDate = new Date()) => {
    if (!db || !tenantId) return [];

    try {
        const tenantQuery = `
            SELECT u.id as tenant_id, u.name as tenant_name, u.email as tenant_email, u.room_id, r.price as rent_amount, r.rental_type, r.room_number
            FROM users u
            JOIN rooms r ON u.room_id = r.id
            WHERE u.id = $1 AND u.role = 'tenant' AND u.status = 'Active' AND u.room_id IS NOT NULL
        `;
        const { rows: tenants } = await db.query(tenantQuery, [tenantId]);
        if (tenants.length === 0) return [];
        const tenant = tenants[0];

        const cycles = getActiveBillingCycles(refDate, DEFAULT_DUE_DAY, false);
        const generatedBills = [];
        const { generateUniqueInvoiceNumber } = require('./invoiceNumberGenerator');

        for (const cycle of cycles) {
            const checkBillQuery = `SELECT id FROM bills WHERE tenant_id = $1 AND billing_month = $2`;
            const { rows: existingBills } = await db.query(checkBillQuery, [tenant.tenant_id, cycle.billingMonth]);

            if (existingBills.length === 0) {
                const rentAmount = Math.max(0, parseFloat(tenant.rent_amount) || 0);
                const waterCharges = FIXED_WATER_CHARGE;
                const electricityCharges = FIXED_ELECTRICITY_CHARGE;
                const totalAmount = rentAmount + waterCharges + electricityCharges;
                const invoiceNumber = await generateUniqueInvoiceNumber(db);

                const insertBillQuery = `
                    INSERT INTO bills (
                        tenant_id, room_id, billing_month, due_date,
                        rent_amount, water_charges, electricity_charges, other_fees,
                        total_amount, balance, status, invoice_number
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, 'Unpaid', $10)
                    RETURNING *
                `;
                const { rows } = await db.query(insertBillQuery, [
                    tenant.tenant_id,
                    tenant.room_id,
                    cycle.billingMonth,
                    cycle.dueDateStr,
                    rentAmount,
                    waterCharges,
                    electricityCharges,
                    totalAmount,
                    totalAmount,
                    invoiceNumber
                ]);
                if (rows.length > 0) {
                    const billRecord = rows[0];
                    generatedBills.push(billRecord);

                    // Dispatch email notification to tenant's sign-up email account
                    if (tenant.tenant_email) {
                        sendBillGeneratedEmail({
                            to: tenant.tenant_email,
                            tenantName: tenant.tenant_name,
                            roomNumber: tenant.room_number,
                            invoiceNumber: billRecord.invoice_number,
                            billingMonth: billRecord.billing_month,
                            dueDate: billRecord.due_date,
                            totalAmount: billRecord.total_amount,
                            balance: billRecord.balance,
                            breakdown: {
                                rent: billRecord.rent_amount,
                                water: billRecord.water_charges,
                                electricity: billRecord.electricity_charges,
                                other: billRecord.other_fees,
                            },
                        }).catch((emailErr) => {
                            console.error('[autoGenerateBillsForTenant] Failed to dispatch bill email:', emailErr.message);
                        });

                        db.query(
                            `INSERT INTO "rentTrack_schema".notifications (user_id, title, message, type, bill_id, is_read)
                             VALUES ($1, $2, $3, 'billing', $4, FALSE)`,
                            [
                                tenant.tenant_id,
                                `New Bill Statement: ${billRecord.billing_month}`,
                                `Your bill for ${billRecord.billing_month} (Invoice #${billRecord.invoice_number}) for ₱${Number(billRecord.total_amount).toLocaleString()} has been generated.`,
                                billRecord.id
                            ]
                        ).catch(() => {});
                    }
                }
            }
        }
        return generatedBills;
    } catch (err) {
        console.error('[autoGenerateBillsForTenant] Error:', err);
        return [];
    }
};

/**
 * Synchronize a tenant's active/unsettled bills when they move to a new room or rent price changes.
 * Updates rent_amount, room_id, total_amount, balance, and status on all unsettled bills.
 *
 * @param {object} db - Database connection or query interface
 * @param {number|string} tenantId - Tenant user ID
 * @param {number|string} newRoomId - Target room ID
 * @param {number|string|null} customRent - Optional custom monthly rent override
 * @returns {Promise<Array>} - List of updated bill records
 */
const syncTenantBillsWithNewRoom = async (db, tenantId, newRoomId, customRent = null) => {
    if (!db || !tenantId || !newRoomId) return [];

    try {
        // 1. Fetch new room details
        const roomResult = await db.query(
            'SELECT id, room_number, price FROM rooms WHERE id = $1',
            [newRoomId]
        );
        if (roomResult.rows.length === 0) return [];
        const room = roomResult.rows[0];

        const parsedCustom = customRent !== null && customRent !== undefined && customRent !== ''
            ? parseFloat(customRent)
            : NaN;
        const newRent = !isNaN(parsedCustom) && parsedCustom >= 0
            ? parsedCustom
            : Math.max(0, parseFloat(room.price) || 0);

        // 2. Fetch all unsettled bills for this tenant
        const billsResult = await db.query(
            `SELECT id, room_id, rent_amount, water_charges, electricity_charges, other_fees,
                    additional_charges, total_amount, amount_paid, balance, status, due_date
             FROM bills
             WHERE tenant_id = $1 AND status IN ('Unpaid', 'Partial', 'Overdue')`,
            [tenantId]
        );

        const updatedBills = [];
        const now = new Date();

        for (const bill of billsResult.rows) {
            const water = Math.max(0, parseFloat(bill.water_charges) || 0);
            const electricity = Math.max(0, parseFloat(bill.electricity_charges) || 0);

            let additionalTotal = 0;
            if (Array.isArray(bill.additional_charges) && bill.additional_charges.length > 0) {
                additionalTotal = bill.additional_charges.reduce((sum, item) => {
                    const amt = parseFloat(item?.amount);
                    return sum + (isNaN(amt) || amt < 0 ? 0 : amt);
                }, 0);
            } else {
                additionalTotal = Math.max(0, parseFloat(bill.other_fees) || 0);
            }

            const newTotalAmount = Math.round((newRent + water + electricity + additionalTotal) * 100) / 100;
            const amountPaid = Math.max(0, parseFloat(bill.amount_paid) || 0);
            const newBalance = Math.max(0, Math.round((newTotalAmount - amountPaid) * 100) / 100);

            const dueDate = bill.due_date ? new Date(bill.due_date) : null;
            let newStatus = 'Unpaid';
            if (newBalance <= 0) {
                newStatus = 'Paid';
            } else if (dueDate && dueDate < now) {
                newStatus = 'Overdue';
            } else if (amountPaid > 0) {
                newStatus = 'Partial';
            }

            const updateRes = await db.query(
                `UPDATE bills
                 SET room_id = $1,
                     rent_amount = $2,
                     total_amount = $3,
                     balance = $4,
                     status = $5
                 WHERE id = $6
                 RETURNING *`,
                [newRoomId, newRent, newTotalAmount, newBalance, newStatus, bill.id]
            );

            if (updateRes.rows.length > 0) {
                updatedBills.push(updateRes.rows[0]);
            }
        }

        return updatedBills;
    } catch (err) {
        console.error('[syncTenantBillsWithNewRoom] Error syncing tenant bills:', err);
        return [];
    }
};

module.exports = {
    FIXED_WATER_CHARGE,
    FIXED_ELECTRICITY_CHARGE,
    DEFAULT_DUE_DAY,
    BILL_LEAD_DAYS,
    MONTH_NAMES,
    resolveUtilityCharges,
    getActiveBillingCycles,
    autoGenerateBills,
    autoGenerateBillsForTenant,
    syncTenantBillsWithNewRoom,
};
