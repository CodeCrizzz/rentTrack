const db = require('../config/db');

// In-memory active presence tracker
const activeUsers = new Map();
const lastDbUpdate = new Map();

// A user is considered Active if they made a request within the last 60 seconds
const ACTIVE_THRESHOLD_MS = 60 * 1000;
const DB_THROTTLE_MS = 30 * 1000; // Update DB at most once every 30s per user

const recordActivity = (userId) => {
    if (!userId) return;
    const uid = Number(userId);
    const now = Date.now();
    activeUsers.set(uid, now);

    // Throttle DB updates to avoid high query loads during polling
    const lastUpdate = lastDbUpdate.get(uid) || 0;
    if (now - lastUpdate > DB_THROTTLE_MS) {
        lastDbUpdate.set(uid, now);
        db.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [uid])
            .catch(err => console.error('Failed to update last_active_at:', err.message));
    }
};

const markOffline = (userId) => {
    if (!userId) return;
    const uid = Number(userId);
    activeUsers.delete(uid);
    db.query("UPDATE users SET last_active_at = NOW() - INTERVAL '5 minutes' WHERE id = $1", [uid])
        .catch(err => console.error('Failed to set offline in DB:', err.message));
};

const isUserActive = (userId, dbLastActive = null) => {
    if (!userId) return false;
    const uid = Number(userId);
    const inMemoryTime = activeUsers.get(uid);

    if (inMemoryTime) {
        return (Date.now() - inMemoryTime) <= ACTIVE_THRESHOLD_MS;
    }

    if (dbLastActive) {
        const dbTime = new Date(dbLastActive).getTime();
        return (Date.now() - dbTime) <= ACTIVE_THRESHOLD_MS;
    }

    return false;
};

module.exports = {
    recordActivity,
    markOffline,
    isUserActive,
    ACTIVE_THRESHOLD_MS
};
