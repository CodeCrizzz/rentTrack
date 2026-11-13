const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { pool } = require('../config/db');
const {
    getBackupConfig,
    saveBackupConfig,
    getNextScheduledDate,
    performBackup,
    generateFullSnapshot,
    rescheduleBackupJob,
    DEFAULT_BACKUP_DIR
} = require('../cron/backupCron');

// Ordered tables for insertion (respecting foreign key hierarchy)
const TABLES_IN_ORDER = [
    'rooms',
    'users',
    'bills',
    'payments',
    'requests',
    'announcements',
    'messages',
    'notifications'
];

/**
 * Scan backup folder on disk and return metadata for all backup archives
 */
function scanBackupDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return [];
    }

    const files = fs.readdirSync(dirPath)
        .filter(f => f.endsWith('.json') && !f.startsWith('.'))
        .map(filename => {
            const filePath = path.join(dirPath, filename);
            try {
                const stats = fs.statSync(filePath);
                let metadata = {
                    filename,
                    sizeBytes: stats.size,
                    createdAt: stats.mtime.toISOString(),
                    totalRecords: null,
                    backupType: 'full_database_snapshot',
                    trigger: 'manual',
                    version: null,
                    counts: null
                };

                // Read first 2KB to parse header summary without loading entire large payload
                const fd = fs.openSync(filePath, 'r');
                const buffer = Buffer.alloc(Math.min(stats.size, 8192));
                fs.readSync(fd, buffer, 0, buffer.length, 0);
                fs.closeSync(fd);

                const snippet = buffer.toString('utf8');
                // Try parsing summary if contained in snippet or fallback to full parse if small
                if (stats.size < 5000000) {
                    try {
                        const full = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        metadata.totalRecords = full.summary?.total_records || null;
                        metadata.counts = full.summary?.counts || null;
                        metadata.version = full.version || null;
                        metadata.trigger = full.trigger || 'manual';
                        if (full.timestamp) metadata.createdAt = full.timestamp;
                    } catch {}
                }

                return metadata;
            } catch (err) {
                console.error(`[BACKUP-CONTROLLER] Error reading file ${filename}:`, err);
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return files;
}

/**
 * GET /api/admin/backup/status
 * Get backup configuration, health status, next scheduled run, and archive list
 */
exports.getBackupStatus = async (req, res) => {
    try {
        const config = getBackupConfig();
        const backupPath = config.backupPath || DEFAULT_BACKUP_DIR;

        // Ensure directory exists
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        const backupsList = scanBackupDirectory(backupPath);
        const nextScheduledBackupAt = getNextScheduledDate(config.schedule);

        // Fetch current live record counts from database
        let liveDbCounts = {
            rooms: 0,
            users: 0,
            bills: 0,
            payments: 0,
            requests: 0,
            announcements: 0,
            messages: 0,
            notifications: 0
        };

        try {
            const countsQuery = `
                SELECT 
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".rooms) as rooms,
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".users) as users,
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".bills) as bills,
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".payments) as payments,
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".requests) as requests,
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".announcements) as announcements,
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".messages) as messages,
                    (SELECT COUNT(*)::int FROM "rentTrack_schema".notifications) as notifications
            `;
            const countsRes = await pool.query(countsQuery);
            if (countsRes.rows[0]) {
                liveDbCounts = countsRes.rows[0];
            }
        } catch (dbErr) {
            console.error('[BACKUP-CONTROLLER] Error fetching live DB counts:', dbErr);
        }

        const totalLiveRecords = Object.values(liveDbCounts).reduce((acc, c) => acc + c, 0);

        // Calculate total archive storage consumption
        const totalStorageBytes = backupsList.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);

        return res.status(200).json({
            success: true,
            config: {
                backupPath,
                defaultPath: DEFAULT_BACKUP_DIR,
                schedule: config.schedule,
                autoRetentionCount: config.autoRetentionCount || 20,
                lastBackupAt: config.lastBackupAt,
                lastBackupStatus: config.lastBackupStatus,
                lastBackupFilename: config.lastBackupFilename,
                lastBackupSize: config.lastBackupSize,
                nextScheduledBackupAt
            },
            database: {
                engine: "PostgreSQL 16",
                schema: "rentTrack_schema",
                totalRecords: totalLiveRecords,
                counts: liveDbCounts,
                status: "Healthy • Online"
            },
            storage: {
                totalBackupsCount: backupsList.length,
                totalStorageBytes
            },
            backups: backupsList
        });
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] getBackupStatus error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve backup system status',
            error: error.message
        });
    }
};

/**
 * POST /api/admin/backup/settings
 * Update backup storage folder path and automated schedule frequency
 */
exports.updateBackupSettings = async (req, res) => {
    try {
        const { backupPath, schedule, autoRetentionCount } = req.body;
        const config = getBackupConfig();

        // 1. Validate & apply custom backup folder path if supplied
        if (backupPath !== undefined && typeof backupPath === 'string') {
            const trimmed = backupPath.trim();
            const targetPath = trimmed ? path.resolve(trimmed) : DEFAULT_BACKUP_DIR;

            // Test if folder can be created / written into
            try {
                if (!fs.existsSync(targetPath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                }
                const testProbe = path.join(targetPath, `.write-probe-${Date.now()}`);
                fs.writeFileSync(testProbe, 'ok', 'utf8');
                fs.unlinkSync(testProbe);
                config.backupPath = targetPath;
            } catch (fsErr) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid or unwritable backup folder path: ${fsErr.message}`
                });
            }
        }

        // 2. Validate schedule
        const validSchedules = ['everyday', 'every_3_days', '1_week', 'per_month', 'manual', 'off'];
        if (schedule !== undefined) {
            if (!validSchedules.includes(schedule)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid schedule: ${schedule}. Must be one of: everyday, every_3_days, 1_week, per_month, manual`
                });
            }
            config.schedule = schedule;
            rescheduleBackupJob(schedule);
        }

        // 3. Retention count
        if (autoRetentionCount !== undefined) {
            const count = parseInt(autoRetentionCount, 10);
            if (!isNaN(count) && count > 0 && count <= 100) {
                config.autoRetentionCount = count;
            }
        }

        saveBackupConfig(config);

        const nextScheduledBackupAt = getNextScheduledDate(config.schedule);
        return res.status(200).json({
            success: true,
            message: 'Backup configuration saved successfully',
            config: {
                ...config,
                nextScheduledBackupAt
            }
        });
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] updateBackupSettings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update backup settings',
            error: error.message
        });
    }
};

/**
 * POST /api/admin/backup/browse-folder
 * Opens native OS folder picker dialog on the host system and returns selected path
 */
exports.browseFolderDialog = async (req, res) => {
    try {
        const config = getBackupConfig();
        const currentPath = req.body?.currentPath || config.backupPath || DEFAULT_BACKUP_DIR;

        if (process.platform === 'win32') {
            const scriptPath = path.join(__dirname, '../scripts/selectFolder.ps1');
            const psCommand = `powershell -NoProfile -STA -ExecutionPolicy Bypass -File "${scriptPath}" "${currentPath}"`;

            exec(psCommand, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error && error.killed) {
                    return res.status(408).json({
                        success: false,
                        message: 'Folder selection timed out.'
                    });
                }
                const selectedPath = (stdout || '').trim();
                if (!selectedPath) {
                    return res.status(200).json({
                        success: false,
                        cancelled: true,
                        message: 'Folder selection was cancelled.'
                    });
                }
                return res.status(200).json({
                    success: true,
                    selectedPath
                });
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Native folder dialog is only supported on Windows host.'
            });
        }
    } catch (err) {
        console.error('[BACKUP-CONTROLLER] browseFolderDialog error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to open folder selection dialog: ' + err.message
        });
    }
};

/**
 * POST /api/admin/backup/open-folder
 * Opens the backup storage folder in Windows File Explorer
 */
exports.openInFileExplorer = async (req, res) => {
    try {
        const config = getBackupConfig();
        const targetPath = req.body?.folderPath || config.backupPath || DEFAULT_BACKUP_DIR;

        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        if (process.platform === 'win32') {
            const resolved = path.resolve(targetPath);
            exec(`explorer.exe "${resolved}"`, (err) => {
                if (err) {
                    console.warn('[BACKUP-CONTROLLER] Error launching explorer.exe:', err.message);
                }
            });
            return res.status(200).json({
                success: true,
                message: `Opened folder in File Explorer: ${resolved}`
            });
        } else {
            return res.status(200).json({
                success: true,
                message: `Folder path is: ${targetPath}`
            });
        }
    } catch (err) {
        console.error('[BACKUP-CONTROLLER] openInFileExplorer error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to open File Explorer: ' + err.message
        });
    }
};

/**
 * POST /api/admin/backup/create
 * Trigger an immediate manual backup and persist it to the backup folder
 */
exports.createManualBackup = async (req, res) => {
    try {
        const adminUser = req.user || { id: 'admin', email: 'admin@renttrack.com', role: 'admin' };
        const result = await performBackup('manual', {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role
        });

        return res.status(201).json({
            success: true,
            message: `Manual backup successfully created: ${result.filename}`,
            backup: {
                filename: result.filename,
                sizeBytes: result.size,
                totalRecords: result.totalRecords,
                timestamp: result.snapshot.timestamp,
                counts: result.snapshot.summary.counts
            }
        });
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] createManualBackup error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create manual backup archive',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/backup/export
 * Generate a full database snapshot and stream it as an immediate browser download (.json)
 */
exports.exportBackup = async (req, res) => {
    try {
        const adminUser = req.user || { id: 'admin', email: 'admin@renttrack.com', role: 'admin' };
        const result = await performBackup('export', {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role
        });

        const jsonString = JSON.stringify(result.snapshot, null, 2);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.setHeader('Content-Length', Buffer.byteLength(jsonString));
        return res.send(jsonString);
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] exportBackup error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate and export backup file',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/backup/download/:filename
 * Download an existing backup archive from the server's configured backup directory
 */
exports.downloadBackupFile = async (req, res) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path.basename(rawFilename); // Prevent path traversal

        const config = getBackupConfig();
        const backupPath = config.backupPath || DEFAULT_BACKUP_DIR;
        const filePath = path.join(backupPath, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: `Backup archive not found: ${filename}`
            });
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.download(filePath, filename);
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] downloadBackupFile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to download backup file',
            error: error.message
        });
    }
};

/**
 * DELETE /api/admin/backup/:filename
 * Delete an old backup archive from the configured backup directory
 */
exports.deleteBackupFile = async (req, res) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path.basename(rawFilename); // Prevent path traversal

        const config = getBackupConfig();
        const backupPath = config.backupPath || DEFAULT_BACKUP_DIR;
        const filePath = path.join(backupPath, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: `Backup archive not found: ${filename}`
            });
        }

        fs.unlinkSync(filePath);
        return res.status(200).json({
            success: true,
            message: `Backup archive deleted: ${filename}`
        });
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] deleteBackupFile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete backup file',
            error: error.message
        });
    }
};

/**
 * Core transactional database restoration runner
 */
async function executeDatabaseRestore(snapshot, restoredBy = 'admin') {
    if (!snapshot || typeof snapshot !== 'object') {
        throw new Error('Invalid backup file payload: not a valid JSON object.');
    }

    if (!snapshot.tables || typeof snapshot.tables !== 'object') {
        throw new Error('Invalid backup archive structure: missing "tables" collection.');
    }

    const client = await pool.connect();
    const restoreSummary = {};
    const startTime = Date.now();

    try {
        await client.query('BEGIN');

        // 1. Truncate all 8 tables with CASCADE
        console.log('[BACKUP-RESTORE] Truncating all tables with CASCADE...');
        await client.query(`
            TRUNCATE TABLE 
                "rentTrack_schema".notifications,
                "rentTrack_schema".messages,
                "rentTrack_schema".announcements,
                "rentTrack_schema".requests,
                "rentTrack_schema".payments,
                "rentTrack_schema".bills,
                "rentTrack_schema".users,
                "rentTrack_schema".rooms 
            CASCADE;
        `);

        // 2. Insert records table-by-table in strict foreign key order
        for (const tableName of TABLES_IN_ORDER) {
            const rows = snapshot.tables[tableName] || [];
            let insertedCount = 0;

            if (Array.isArray(rows) && rows.length > 0) {
                for (const row of rows) {
                    const keys = Object.keys(row);
                    if (keys.length === 0) continue;

                    const cols = keys.map(k => `"${k}"`).join(', ');
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const values = keys.map(k => row[k]);

                    const insertSql = `INSERT INTO "rentTrack_schema"."${tableName}" (${cols}) VALUES (${placeholders})`;
                    await client.query(insertSql, values);
                    insertedCount++;
                }

                // 3. Reset serial auto-increment sequences so future inserts don't collide
                try {
                    const seqResult = await client.query(
                        `SELECT pg_get_serial_sequence('"rentTrack_schema"."${tableName}"', 'id') as seq`
                    );
                    const seqName = seqResult.rows[0]?.seq;
                    if (seqName) {
                        await client.query(
                            `SELECT setval($1, COALESCE((SELECT MAX(id) FROM "rentTrack_schema"."${tableName}"), 1), true)`,
                            [seqName]
                        );
                    }
                } catch (seqErr) {
                    console.warn(`[BACKUP-RESTORE] Sequence reset note for ${tableName}:`, seqErr.message);
                }
            }

            restoreSummary[tableName] = insertedCount;
        }

        await client.query('COMMIT');
        const durationMs = Date.now() - startTime;
        console.log(`[BACKUP-RESTORE] Transaction committed successfully in ${durationMs}ms:`, restoreSummary);

        return {
            success: true,
            durationMs,
            restoreSummary,
            totalRecordsRestored: Object.values(restoreSummary).reduce((a, b) => a + b, 0)
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[BACKUP-RESTORE] Transaction rolled back due to error:', err);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * POST /api/admin/backup/restore
 * Import & restore database from an uploaded JSON backup file
 */
exports.restoreBackupFromFile = async (req, res) => {
    try {
        let snapshotData = null;

        // File uploaded via multipart/form-data
        if (req.file) {
            const rawContent = req.file.buffer
                ? req.file.buffer.toString('utf8')
                : fs.readFileSync(req.file.path, 'utf8');

            try {
                snapshotData = JSON.parse(rawContent);
            } catch (parseErr) {
                return res.status(400).json({
                    success: false,
                    message: 'The uploaded file is not a valid JSON document.'
                });
            }

            // Cleanup temp file if diskStorage was used
            if (req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch {}
            }
        } else if (req.body && req.body.tables) {
            // Direct JSON payload
            snapshotData = req.body;
        } else {
            return res.status(400).json({
                success: false,
                message: 'No backup file or JSON payload provided for restoration.'
            });
        }

        const result = await executeDatabaseRestore(snapshotData, req.user?.email || 'admin');

        return res.status(200).json({
            success: true,
            message: `Database successfully restored! ${result.totalRecordsRestored} records restored across ${Object.keys(result.restoreSummary).length} tables.`,
            details: result
        });
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] restoreBackupFromFile error:', error);
        return res.status(500).json({
            success: false,
            message: `Restoration failed: ${error.message}. All database tables were safely rolled back.`,
            error: error.message
        });
    }
};

/**
 * POST /api/admin/backup/restore-local/:filename
 * Restore database directly from an archive stored in the server's backup folder
 */
exports.restoreFromLocalFile = async (req, res) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path.basename(rawFilename); // Prevent path traversal

        const config = getBackupConfig();
        const backupPath = config.backupPath || DEFAULT_BACKUP_DIR;
        const filePath = path.join(backupPath, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: `Backup archive not found: ${filename}`
            });
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        let snapshotData;
        try {
            snapshotData = JSON.parse(raw);
        } catch {
            return res.status(400).json({
                success: false,
                message: `Corrupted backup archive file: ${filename}`
            });
        }

        const result = await executeDatabaseRestore(snapshotData, req.user?.email || 'admin');

        return res.status(200).json({
            success: true,
            message: `Database successfully restored from "${filename}"! ${result.totalRecordsRestored} records restored.`,
            details: result
        });
    } catch (error) {
        console.error('[BACKUP-CONTROLLER] restoreFromLocalFile error:', error);
        return res.status(500).json({
            success: false,
            message: `Restoration failed: ${error.message}. System data was safely preserved.`,
            error: error.message
        });
    }
};
