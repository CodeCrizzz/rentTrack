// One-time migration: link notifications to the records that triggered them.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');

(async () => {
    try {
        await db.query(`
            ALTER TABLE "rentTrack_schema".notifications
              ADD COLUMN IF NOT EXISTS request_id integer,
              ADD COLUMN IF NOT EXISTS payment_id integer,
              ADD COLUMN IF NOT EXISTS message_id integer,
              ADD COLUMN IF NOT EXISTS announcement_id integer
        `);

        const constraints = [
            ['notifications_request_id_fkey', 'request_id', 'requests'],
            ['notifications_payment_id_fkey', 'payment_id', 'payments'],
            ['notifications_message_id_fkey', 'message_id', 'messages'],
            ['notifications_announcement_id_fkey', 'announcement_id', 'announcements'],
        ];

        for (const [name, column, table] of constraints) {
            const exists = await db.query(
                `SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'rentTrack_schema'
                   AND constraint_name = $1`,
                [name]
            );
            if (exists.rows.length === 0) {
                await db.query(`
                    ALTER TABLE "rentTrack_schema".notifications
                    ADD CONSTRAINT ${name}
                    FOREIGN KEY (${column})
                    REFERENCES "rentTrack_schema".${table}(id)
                    ON DELETE SET NULL
                `);
            }
        }

        const r = await db.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'rentTrack_schema' AND table_name = 'notifications'
            ORDER BY ordinal_position
        `);
        console.log('notifications columns:', r.rows.map(x => x.column_name).join(', '));
    } catch (e) {
        console.error('MIGRATION FAILED:', e.message);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
