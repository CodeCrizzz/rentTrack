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
        console.log('Database tables & indexes verified (notifications table ready).');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
};

module.exports = initDb;
