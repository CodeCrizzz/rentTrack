const cron = require('node-cron');
const db = require('../config/db');

// Run on the 1st of every month at 00:00 (midnight)
cron.schedule('0 0 1 * *', async () => {
    console.log('Running automatic billing cron job...');
    try {
        // Find all active tenants with an assigned room
        const activeTenantsQuery = `
            SELECT u.id as tenant_id, u.room_id, u.created_at, r.price as rent_amount, r.rental_type
            FROM users u
            JOIN rooms r ON u.room_id = r.id
            WHERE u.role = 'tenant' AND u.status = 'Active' AND u.room_id IS NOT NULL
            ORDER BY u.created_at ASC
        `;
        const { rows: allTenants } = await db.query(activeTenantsQuery);

        if (allTenants.length === 0) {
            console.log('No active tenants found for automatic billing.');
            return;
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

        const currentDate = new Date();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthName = monthNames[currentDate.getMonth()];
        const currentYear = currentDate.getFullYear();
        const billingMonthStr = `${currentMonthName} ${currentYear}`;

        // Due date usually 5th of the month
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 5);

        for (const tenant of tenantsToBill) {
            // Check if a bill already exists for this tenant and this billing month
            const checkBillQuery = `
                SELECT id FROM bills WHERE tenant_id = $1 AND billing_month = $2
            `;
            const { rows: existingBills } = await db.query(checkBillQuery, [tenant.tenant_id, billingMonthStr]);

            if (existingBills.length === 0) {
                // Default amounts
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
                    tenant.tenant_id,
                    tenant.room_id,
                    billingMonthStr,
                    dueDate,
                    tenant.rent_amount,
                    waterCharges,
                    electricityCharges,
                    otherFees,
                    totalAmount,
                    balance,
                    status,
                    notes
                ];

                await db.query(insertBillQuery, values);
                console.log(`Auto-generated bill for tenant ${tenant.tenant_id} for ${billingMonthStr}.`);
            } else {
                console.log(`Bill already exists for tenant ${tenant.tenant_id} for ${billingMonthStr}. Skipping.`);
            }
        }
        console.log('Automatic billing cron job completed successfully.');
    } catch (error) {
        console.error('Error running automatic billing cron job:', error);
    }
});

console.log('Billing cron job initialized.');
