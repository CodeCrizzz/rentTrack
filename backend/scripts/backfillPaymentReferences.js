// One-time backfill: give every existing payment a random 10-digit reference.
// New payments already use generateUniqueTransactionNumber() on the server.
//
// Usage: node scripts/backfillPaymentReferences.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');
const { generateUniqueReferenceNumber } = require('../utils/referenceNumberGenerator');

(async () => {
    try {
        const { rows } = await db.query(
            'SELECT id, reference_number FROM payments ORDER BY id'
        );

        let updated = 0;
        let kept = 0;

        for (const row of rows) {
            if (/^[0-9]{10}$/.test(row.reference_number || '')) {
                kept++;
                continue;
            }
            const reference = await generateUniqueReferenceNumber(db);
            await db.query(
                'UPDATE payments SET reference_number = $1 WHERE id = $2',
                [reference, row.id]
            );
            updated++;
        }

        const check = await db.query(`
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE reference_number ~ '^[0-9]{10}$')::int AS ten_digit,
                   COUNT(*) FILTER (WHERE reference_number IS NULL OR reference_number = '')::int AS missing
            FROM payments
        `);

        console.log('Payments processed:', rows.length);
        console.log('Updated:', updated, '| Already valid:', kept);
        console.log('Verification:', check.rows[0]);
    } catch (error) {
        console.error('BACKFILL FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
