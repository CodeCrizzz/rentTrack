require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');

const drops = [
    ['announcements', 'title'],
    ['announcements', 'type'],
    ['payments', 'notes'],
    ['requests', 'admin_notes'],
    ['requests', 'scheduled_date'],
    ['rooms', 'amenities'],
    ['bills', 'notes'],
];

(async () => {
    try {
        for (const [table, column] of drops) {
            await db.query(`ALTER TABLE "rentTrack_schema".${table} DROP COLUMN IF EXISTS ${column}`);
        }
        for (const table of [...new Set(drops.map(d => d[0]))]) {
            const r = await db.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'rentTrack_schema' AND table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            console.log(table + ':', r.rows.map(x => x.column_name).join(', '));
        }
    } catch (e) { console.error('DROP FAILED:', e.message); process.exitCode = 1; }
    finally { await db.pool.end(); }
})();
