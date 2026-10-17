const db = require('./db');

const initDb = async () => {
    try {
        const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS "rentTrack_schema".notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "rentTrack_schema".users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'billing',
                bill_id INTEGER REFERENCES "rentTrack_schema".bills(id) ON DELETE CASCADE,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON "rentTrack_schema".notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_bill_id ON "rentTrack_schema".notifications(bill_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON "rentTrack_schema".notifications(created_at);
        `;

        await db.query(createNotificationsTable);

        // Ensure payments table has reference_number column
        await db.query(`
            ALTER TABLE "rentTrack_schema".payments 
            ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
        `);

        // Backfill existing cash payments without reference_number
        await db.query(`
            UPDATE "rentTrack_schema".payments
            SET reference_number = 'CSH-' || TO_CHAR(COALESCE(payment_date, created_at, NOW()), 'YYYYMMDD') || '-' || LPAD(id::text, 4, '0')
            WHERE reference_number IS NULL AND LOWER(COALESCE(payment_method, 'Cash')) = 'cash';
        `);

        // Backfill existing digital/online payments from notes if reference_number is null
        await db.query(`
            UPDATE "rentTrack_schema".payments
            SET reference_number = TRIM(REGEXP_REPLACE(notes, '^(Ref[:#]?\\s*|UnionBank\\s+Ref[:#]?\\s*)', '', 'i'))
            WHERE reference_number IS NULL AND notes IS NOT NULL AND notes ~* 'ref';
        `);

        // Any remaining payments without reference number get a standard reference
        await db.query(`
            UPDATE "rentTrack_schema".payments
            SET reference_number = 'TX-' || TO_CHAR(COALESCE(payment_date, created_at, NOW()), 'YYYYMMDD') || '-' || LPAD(id::text, 4, '0')
            WHERE reference_number IS NULL;
        `);

        console.log('Database tables & indexes verified (notifications and payments reference_number ready).');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
};

module.exports = initDb;
