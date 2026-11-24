// One-time backfill: apply the fixed water and electricity charges to every
// existing bill (paid history included) and keep totals/balances consistent.
//
// Usage: node scripts/backfillUtilityCharges.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');
const {
    FIXED_WATER_CHARGE,
    FIXED_ELECTRICITY_CHARGE,
} = require('../utils/billingUtils');

(async () => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const before = await client.query(`
            SELECT COUNT(*)::int AS bills,
                   COALESCE(SUM(water_charges), 0)::numeric AS water,
                   COALESCE(SUM(electricity_charges), 0)::numeric AS electricity,
                   COALESCE(SUM(total_amount), 0)::numeric AS total,
                   COALESCE(SUM(balance), 0)::numeric AS balance
            FROM bills
        `);

        const updated = await client.query(
            `
            UPDATE bills
            SET water_charges = $1,
                electricity_charges = $2,
                total_amount = rent_amount + $1 + $2 + other_fees,
                amount_paid = CASE
                    WHEN status = 'Paid' THEN rent_amount + $1 + $2 + other_fees
                    ELSE amount_paid
                END,
                balance = CASE
                    WHEN status = 'Paid' THEN 0
                    ELSE GREATEST(0, rent_amount + $1 + $2 + other_fees - amount_paid)
                END
            RETURNING id
            `,
            [FIXED_WATER_CHARGE, FIXED_ELECTRICITY_CHARGE]
        );

        // Any bill whose balance is now zero counts as settled.
        const settled = await client.query(
            `UPDATE bills SET status = 'Paid' WHERE balance <= 0 AND status <> 'Cancelled'`
        );

        await client.query('COMMIT');

        const after = await client.query(`
            SELECT COUNT(*)::int AS bills,
                   COALESCE(SUM(water_charges), 0)::numeric AS water,
                   COALESCE(SUM(electricity_charges), 0)::numeric AS electricity,
                   COALESCE(SUM(total_amount), 0)::numeric AS total,
                   COALESCE(SUM(balance), 0)::numeric AS balance
            FROM bills
        `);

        console.log('BEFORE:', before.rows[0]);
        console.log('UPDATED BILLS:', updated.rowCount);
        console.log('STATUS SETTLED:', settled.rowCount);
        console.log('AFTER:', after.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('BACKFILL FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
})();
