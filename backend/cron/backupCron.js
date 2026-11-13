const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// Default config file location
const CONFIG_FILE = path.join(__dirname, '../uploads/backup-config.json');
const DEFAULT_BACKUP_DIR = path.join(__dirname, '../uploads/backups');

// In-memory active cron task reference
let activeCronTask = null;

/**
 * Read backup config from disk, falling back to defaults
 */
function getBackupConfig() {
    try {
        if (!fs.existsSync(DEFAULT_BACKUP_DIR)) {
            fs.mkdirSync(DEFAULT_BACKUP_DIR, { recursive: true });
        }
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            return {
                backupPath: parsed.backupPath || DEFAULT_BACKUP_DIR,
                schedule: parsed.schedule || 'everyday',
                autoRetentionCount: parsed.autoRetentionCount || 20,
                lastBackupAt: parsed.lastBackupAt || null,
                lastBackupStatus: parsed.lastBackupStatus || 'none',
                lastBackupFilename: parsed.lastBackupFilename || null,
                lastBackupSize: parsed.lastBackupSize || null
            };
        }
    } catch (e) {
        console.error('[BACKUP-CRON] Error reading backup config:', e);
    }

    const defaultConfig = {
        backupPath: DEFAULT_BACKUP_DIR,
        schedule: 'everyday',
        autoRetentionCount: 20,
        lastBackupAt: null,
        lastBackupStatus: 'none',
        lastBackupFilename: null,
        lastBackupSize: null
    };

    saveBackupConfig(defaultConfig);
    return defaultConfig;
}

/**
 * Persist backup config to disk
 */
function saveBackupConfig(config) {
    try {
        const dir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error('[BACKUP-CRON] Error saving backup config:', e);
    }
}

/**
 * Calculates human-readable next scheduled backup timestamp
 */
function getNextScheduledDate(schedule) {
    if (!schedule || schedule === 'manual' || schedule === 'off') {
        return null;
    }
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0); // 02:00 AM

    if (schedule === 'everyday') {
        if (now.getHours() >= 2) {
            next.setDate(next.getDate() + 1);
        }
    } else if (schedule === 'every_3_days') {
        next.setDate(next.getDate() + 3);
    } else if (schedule === '1_week') {
        // Next Sunday at 02:00 AM
        const day = now.getDay();
        const diff = (7 - day) % 7 || 7;
        next.setDate(now.getDate() + diff);
    } else if (schedule === 'per_month') {
        // 1st of next month at 02:00 AM
        next.setMonth(next.getMonth() + 1, 1);
    }
    return next.toISOString();
}

/**
 * Generate full database snapshot object
 */
async function generateFullSnapshot(createdBy = { id: 'system', email: 'system@renttrack.com', role: 'admin' }) {
    const client = await pool.connect();
    try {
        const roomsRes = await client.query('SELECT * FROM "rentTrack_schema".rooms ORDER BY id ASC');
        const usersRes = await client.query('SELECT * FROM "rentTrack_schema".users ORDER BY id ASC');
        const billsRes = await client.query('SELECT * FROM "rentTrack_schema".bills ORDER BY id ASC');
        const paymentsRes = await client.query('SELECT * FROM "rentTrack_schema".payments ORDER BY id ASC');
        const requestsRes = await client.query('SELECT * FROM "rentTrack_schema".requests ORDER BY id ASC');
        const announcementsRes = await client.query('SELECT * FROM "rentTrack_schema".announcements ORDER BY id ASC');
        const messagesRes = await client.query('SELECT * FROM "rentTrack_schema".messages ORDER BY id ASC');
        const notificationsRes = await client.query('SELECT * FROM "rentTrack_schema".notifications ORDER BY id ASC');

        const counts = {
            rooms: roomsRes.rowCount || 0,
            users: usersRes.rowCount || 0,
            bills: billsRes.rowCount || 0,
            payments: paymentsRes.rowCount || 0,
            requests: requestsRes.rowCount || 0,
            announcements: announcementsRes.rowCount || 0,
            messages: messagesRes.rowCount || 0,
            notifications: notificationsRes.rowCount || 0
        };

        const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
        const now = new Date();
        const timestampStr = now.toISOString();

        // Human-friendly filename: RentTrack_Backup_YYYY-MM-DD_HH-mm-ss.json
        const datePart = now.toISOString().split('T')[0];
        const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `RentTrack_Backup_${datePart}_${timePart}.json`;

        const snapshot = {
            system: "RentTrack Property Management System",
            version: "2.5.0",
            backup_type: "full_database_snapshot",
            backup_name: `RentTrack Backup: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
            filename,
            timestamp: timestampStr,
            schema: "rentTrack_schema",
            database_engine: "PostgreSQL 16",
            created_by: createdBy,
            summary: {
                total_records: totalRecords,
                tables_included: 8,
                counts
            },
            tables: {
                rooms: roomsRes.rows,
                users: usersRes.rows,
                bills: billsRes.rows,
                payments: paymentsRes.rows,
                requests: requestsRes.rows,
                announcements: announcementsRes.rows,
                messages: messagesRes.rows,
                notifications: notificationsRes.rows
            }
        };

        return { snapshot, filename, totalRecords };
    } finally {
        client.release();
    }
}

/**
 * Execute a backup and save to the configured backup folder
 */
async function performBackup(trigger = 'manual', createdBy = null) {
    const config = getBackupConfig();
    const targetDir = config.backupPath || DEFAULT_BACKUP_DIR;

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const { snapshot, filename, totalRecords } = await generateFullSnapshot(createdBy || {
        id: trigger === 'scheduled' ? 'cron_scheduler' : 'admin',
        email: trigger === 'scheduled' ? 'scheduler@renttrack.com' : 'admin@renttrack.com',
        role: 'admin'
    });

    snapshot.trigger = trigger;

    const filePath = path.join(targetDir, filename);
    const content = JSON.stringify(snapshot, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');

    const stats = fs.statSync(filePath);

    // Update config
    config.lastBackupAt = snapshot.timestamp;
    config.lastBackupStatus = 'success';
    config.lastBackupFilename = filename;
    config.lastBackupSize = stats.size;
    saveBackupConfig(config);

    // Also update legacy last-backup.json for backward compatibility
    try {
        const lastBackupFile = path.join(__dirname, '../uploads/last-backup.json');
        fs.writeFileSync(lastBackupFile, JSON.stringify({
            timestamp: snapshot.timestamp,
            filename,
            backup_name: snapshot.backup_name,
            total_records: totalRecords,
            size_bytes: stats.size,
            created_by: snapshot.created_by.email
        }, null, 2), 'utf8');
    } catch {}

    // Auto-prune old files if retention is set
    try {
        pruneOldBackups(targetDir, config.autoRetentionCount || 20);
    } catch (pruneErr) {
        console.warn('[BACKUP-CRON] Failed to prune old backups:', pruneErr);
    }

    console.log(`[BACKUP-CRON] Backup created successfully: ${filename} (${totalRecords} records, ${stats.size} bytes)`);
    return { filename, filePath, size: stats.size, totalRecords, snapshot };
}

/**
 * Keep the most recent N backup files in target directory
 */
function pruneOldBackups(dir, maxCount = 20) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const fp = path.join(dir, f);
            try {
                return { name: f, path: fp, time: fs.statSync(fp).mtime.getTime() };
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => b.time - a.time);

    if (files.length > maxCount) {
        const toDelete = files.slice(maxCount);
        for (const file of toDelete) {
            try {
                fs.unlinkSync(file.path);
                console.log(`[BACKUP-CRON] Pruned old backup: ${file.name}`);
            } catch (err) {
                console.error(`[BACKUP-CRON] Error deleting ${file.name}:`, err);
            }
        }
    }
}

/**
 * Converts schedule frequency into node-cron expression
 */
function getCronExpression(schedule) {
    switch (schedule) {
        case 'everyday':
            return '0 2 * * *';      // Every day at 02:00 AM
        case 'every_3_days':
            return '0 2 */3 * *';    // Every 3 days at 02:00 AM
        case '1_week':
            return '0 2 * * 0';      // Every Sunday at 02:00 AM
        case 'per_month':
            return '0 2 1 * *';      // 1st of every month at 02:00 AM
        default:
            return null;             // Off / Manual
    }
}

/**
 * Initializes or reschedules the automated backup cron task in memory
 */
function rescheduleBackupJob(newSchedule = null) {
    if (activeCronTask) {
        activeCronTask.stop();
        activeCronTask = null;
    }

    const config = getBackupConfig();
    const schedule = newSchedule || config.schedule || 'everyday';

    const cronExpr = getCronExpression(schedule);
    if (!cronExpr) {
        console.log(`[BACKUP-CRON] Automated backup schedule set to MANUAL/OFF. No cron scheduled.`);
        return;
    }

    console.log(`[BACKUP-CRON] Scheduling automated backup job: "${schedule}" (${cronExpr})`);

    activeCronTask = cron.schedule(cronExpr, async () => {
        console.log(`[BACKUP-CRON] Running scheduled automated backup job (${schedule})...`);
        try {
            await performBackup('scheduled');
        } catch (err) {
            console.error('[BACKUP-CRON] Automated backup failed:', err);
            const cfg = getBackupConfig();
            cfg.lastBackupStatus = 'error';
            saveBackupConfig(cfg);
        }
    });
}

// Initialize on module load
try {
    rescheduleBackupJob();
} catch (e) {
    console.error('[BACKUP-CRON] Failed to initialize cron scheduler:', e);
}

module.exports = {
    getBackupConfig,
    saveBackupConfig,
    getNextScheduledDate,
    generateFullSnapshot,
    performBackup,
    rescheduleBackupJob,
    DEFAULT_BACKUP_DIR
};
