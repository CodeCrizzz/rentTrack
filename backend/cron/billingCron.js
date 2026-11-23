const cron = require('node-cron');
const db = require('../config/db');
const { autoGenerateBills } = require('../utils/billingUtils');

// 1. Automatic Monthly Bill Generation (Generates statements 7 days before due date)
const runAutoBilling = async () => {
    console.log('[AUTO-BILLING] Checking and generating billing statements (7 days before due date)...');
    try {
        const result = await autoGenerateBills(db);
        if (result.generatedCount > 0) {
            console.log(`[AUTO-BILLING] Generated ${result.generatedCount} billing statement(s) for cycle(s): ${result.cyclesChecked?.join(', ')}.`);
        } else {
            console.log(`[AUTO-BILLING] No new statements needed. Cycles evaluated: ${result.cyclesChecked?.join(', ')}.`);
        }
    } catch (error) {
        console.error('[AUTO-BILLING ERROR] Error running automatic billing:', error);
    }
};

// Run daily at midnight (00:00) so bills are generated 7 days before due date
cron.schedule('0 0 * * *', runAutoBilling);

// 2. Daily Payment Due & Overdue Reminders: Runs daily at 08:00 AM
const { checkAndSendPaymentReminders } = require('../services/reminderService');

cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily payment due & overdue reminder check (08:00 AM)...');
    try {
        await checkAndSendPaymentReminders();
    } catch (err) {
        console.error('[CRON ERROR] Payment reminder cron failed:', err);
    }
});

// Initial startup checks after 3 seconds
setTimeout(async () => {
    console.log('[STARTUP] Checking for auto-generation of billing statements (7 days before due date)...');
    try {
        await runAutoBilling();
    } catch (err) {
        console.error('[STARTUP ERROR] Auto billing check failed:', err);
    }

    console.log('[STARTUP] Checking for due and overdue bills on server startup...');
    try {
        await checkAndSendPaymentReminders();
    } catch (err) {
        console.error('[STARTUP ERROR] Initial payment reminder check failed:', err);
    }
}, 3000);

console.log('Billing and payment reminder cron jobs initialized.');

module.exports = {
    runAutoBilling,
    checkAndSendPaymentReminders
};
