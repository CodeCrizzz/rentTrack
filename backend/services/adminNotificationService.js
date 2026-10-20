const db = require('../config/db');
const presenceService = require('./presenceService');

/**
 * Admin Notification Service
 * Ensures notifications are dispatched to the admin notification panel
 * ONLY if the admin is offline when tenant activity or data changes occur.
 * When the admin opens the system again, they can review what occurred while offline.
 */

const notifyAdminsIfOffline = async ({ title, message, type, link }) => {
    try {
        const adminsResult = await db.query(
            "SELECT id, last_active_at FROM users WHERE role = 'admin'"
        );

        if (!adminsResult.rows || adminsResult.rows.length === 0) return;

        for (const admin of adminsResult.rows) {
            const isOnline = presenceService.isUserActive(admin.id, admin.last_active_at);

            // ONLY push to notification panel if admin is offline
            if (!isOnline) {
                await db.query(
                    `INSERT INTO "rentTrack_schema".notifications 
                     (user_id, title, message, type, link, is_read, created_at)
                     VALUES ($1, $2, $3, $4, $5, FALSE, NOW())`,
                    [admin.id, title, message, type || 'general', link || null]
                );
                console.log(`[AdminNotification] Queued offline notification for Admin ID ${admin.id}: "${title}"`);
            } else {
                console.log(`[AdminNotification] Admin ID ${admin.id} is actively online. Skipped offline notification: "${title}"`);
            }
        }
    } catch (err) {
        console.error('Failed to dispatch admin offline notification:', err.message);
    }
};

const getAdminNotifications = async (adminId) => {
    const result = await db.query(
        `SELECT id, title, message, type, link, is_read, created_at
         FROM "rentTrack_schema".notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [adminId]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    return { notifications: result.rows, unreadCount };
};

const markAllNotificationsRead = async (adminId) => {
    await db.query(
        `UPDATE "rentTrack_schema".notifications 
         SET is_read = TRUE 
         WHERE user_id = $1`,
        [adminId]
    );
};

const markNotificationRead = async (adminId, notifId) => {
    await db.query(
        `UPDATE "rentTrack_schema".notifications 
         SET is_read = TRUE 
         WHERE id = $1 AND user_id = $2`,
        [notifId, adminId]
    );
};

module.exports = {
    notifyAdminsIfOffline,
    getAdminNotifications,
    markAllNotificationsRead,
    markNotificationRead
};
