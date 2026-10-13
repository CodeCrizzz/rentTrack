const db = require('../config/db');
const { sendPaymentDueEmail, sendPaymentOverdueEmail } = require('./emailService');

/**
 * Format currency to PHP
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Main routine to check for due and overdue bills, update status,
 * insert in-system notifications, and send email reminders.
 */
const checkAndSendPaymentReminders = async () => {
    console.log('--- [STARTING PAYMENT REMINDER ROUTINE] ---');
    const summary = {
        totalPendingBillsChecked: 0,
        dueRemindersSent: 0,
        overdueRemindersSent: 0,
        emailsSent: 0,
        skippedAlreadySent: 0,
        errors: [],
        details: []
    };

    try {
        // 1. Fetch all bills with balance > 0 and status != 'Paid'
        // Joining user to verify active tenant & email address
        const query = `
            SELECT 
                b.id,
                b.tenant_id,
                b.room_id,
                b.billing_month,
                b.due_date,
                b.rent_amount,
                b.water_charges,
                b.electricity_charges,
                b.other_fees,
                b.total_amount,
                b.amount_paid,
                b.balance,
                b.status,
                u.name as tenant_name,
                u.email as tenant_email,
                u.status as tenant_user_status,
                r.room_number
            FROM "rentTrack_schema".bills b
            JOIN "rentTrack_schema".users u ON b.tenant_id = u.id
            LEFT JOIN "rentTrack_schema".rooms r ON b.room_id = r.id
            WHERE b.balance > 0 
              AND b.status != 'Paid'
              AND u.role = 'tenant'
            ORDER BY b.due_date ASC
        `;

        const { rows: bills } = await db.query(query);
        summary.totalPendingBillsChecked = bills.length;
        console.log(`Found ${bills.length} pending bill(s) with balance > 0.`);

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (const bill of bills) {
            const dueDate = new Date(bill.due_date);
            // Normalizing dueDate to midnight for clean day comparison
            const dueDayMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            // Calculate day difference (dueDate - today)
            const diffTime = dueDayMidnight.getTime() - startOfToday.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            let reminderType = null; // 'billing_due' | 'billing_overdue'
            let notificationTitle = '';
            let notificationMessage = '';

            if (diffDays < 0) {
                // Due date has passed -> OVERDUE
                reminderType = 'billing_overdue';
                const daysPast = Math.abs(diffDays);
                notificationTitle = `URGENT: Payment Overdue - ${bill.billing_month}`;
                notificationMessage = `Your rent payment for ${bill.billing_month} was due on ${formatDate(bill.due_date)} (${daysPast} day${daysPast > 1 ? 's' : ''} ago). Outstanding balance: ${formatCurrency(bill.balance)}. Please pay immediately to prevent penalties.`;

                // Update bill status to Overdue if not already marked
                if (bill.status !== 'Overdue' && bill.status !== 'Pending Verification') {
                    await db.query(
                        `UPDATE "rentTrack_schema".bills SET status = 'Overdue' WHERE id = $1`,
                        [bill.id]
                    );
                    bill.status = 'Overdue';
                }
            } else if (diffDays <= 3) {
                // Due today or within next 3 days -> DUE SOON
                reminderType = 'billing_due';
                const dueText = diffDays === 0 ? 'today' : `in ${diffDays} day${diffDays > 1 ? 's' : ''} (${formatDate(bill.due_date)})`;
                notificationTitle = `Payment Due Reminder - ${bill.billing_month}`;
                notificationMessage = `Friendly reminder: Your rent payment for ${bill.billing_month} is due ${dueText}. Outstanding balance: ${formatCurrency(bill.balance)}. Please settle on time.`;
            }

            if (!reminderType) {
                // Not due yet (more than 3 days in the future)
                continue;
            }

            // 2. Check if a reminder for this bill & type was already sent TODAY
            const checkQuery = `
                SELECT id FROM "rentTrack_schema".notifications
                WHERE bill_id = $1 
                  AND type = $2 
                  AND created_at >= CURRENT_DATE
                LIMIT 1
            `;
            const { rows: existingNotifs } = await db.query(checkQuery, [bill.id, reminderType]);

            if (existingNotifs.length > 0) {
                summary.skippedAlreadySent++;
                console.log(`[SKIPPED] ${reminderType} already sent today for Bill #${bill.id} (${bill.tenant_name}).`);
                continue;
            }

            // 3. Create In-System Notification
            const insertNotifQuery = `
                INSERT INTO "rentTrack_schema".notifications (user_id, title, message, type, bill_id, is_read, created_at)
                VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
                RETURNING id
            `;
            await db.query(insertNotifQuery, [
                bill.tenant_id,
                notificationTitle,
                notificationMessage,
                reminderType,
                bill.id
            ]);

            if (reminderType === 'billing_due') {
                summary.dueRemindersSent++;
            } else {
                summary.overdueRemindersSent++;
            }
            console.log(`[IN-SYSTEM NOTIF CREATED] ${notificationTitle} for tenant ${bill.tenant_name} (ID: ${bill.tenant_id}).`);

            // 4. Send Email Notification
            let emailResult = { success: false, reason: 'No email address' };
            if (bill.tenant_email) {
                const breakdown = {
                    rent: bill.rent_amount,
                    water: bill.water_charges,
                    electricity: bill.electricity_charges,
                    other: bill.other_fees,
                };

                if (reminderType === 'billing_due') {
                    emailResult = await sendPaymentDueEmail({
                        to: bill.tenant_email,
                        tenantName: bill.tenant_name,
                        roomNumber: bill.room_number,
                        billingMonth: bill.billing_month,
                        dueDate: bill.due_date,
                        balance: bill.balance,
                        totalAmount: bill.total_amount,
                        breakdown
                    });
                } else {
                    emailResult = await sendPaymentOverdueEmail({
                        to: bill.tenant_email,
                        tenantName: bill.tenant_name,
                        roomNumber: bill.room_number,
                        billingMonth: bill.billing_month,
                        dueDate: bill.due_date,
                        balance: bill.balance,
                        totalAmount: bill.total_amount,
                        breakdown
                    });
                }

                if (emailResult.success) {
                    summary.emailsSent++;
                }
            }

            summary.details.push({
                billId: bill.id,
                tenantId: bill.tenant_id,
                tenantName: bill.tenant_name,
                email: bill.tenant_email,
                type: reminderType,
                balance: bill.balance,
                dueDate: bill.due_date,
                systemNotifCreated: true,
                emailSent: emailResult.success
            });
        }

        console.log('--- [PAYMENT REMINDER ROUTINE COMPLETED] ---', summary);
        return summary;
    } catch (error) {
        console.error('Fatal error in payment reminder routine:', error);
        summary.errors.push(error.message);
        throw error;
    }
};

module.exports = {
    checkAndSendPaymentReminders,
};
