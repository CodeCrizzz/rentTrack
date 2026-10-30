const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { formatPhoneNumber } = require('../utils/phoneUtils');
const { generateUniqueInvoiceNumber } = require('../utils/invoiceNumberGenerator');
const { normalizeRoomGender, ensureRoomGenderColumn } = require('../utils/roomGenderUtils');

// Get Tenant Dashboard Data
const getTenantDashboard = async (req, res) => {
    const tenantId = req.user.id;

    try {
        // Get tenant's current status, name and room
        const userResult = await db.query(
            "SELECT u.name, u.status, r.room_number FROM users u LEFT JOIN rooms r ON u.room_id = r.id WHERE u.id = $1",
            [tenantId]
        );
        const user = userResult.rows[0];

        const balanceResult = await db.query(
            "SELECT SUM(balance) FROM bills WHERE tenant_id = $1 AND status != 'Paid'", 
            [tenantId]
        );

        // Get all bills for this tenant
        const billsResult = await db.query(
            "SELECT id, billing_month, rent_amount, water_charges, electricity_charges, other_fees, total_amount, amount_paid, balance, status, TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date, invoice_number, created_at FROM bills WHERE tenant_id = $1 ORDER BY due_date DESC, id DESC",
            [tenantId]
        );

        // Get recent payment history
        const historyResult = await db.query(
            "SELECT p.*, TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS date, b.billing_month, b.invoice_number FROM payments p JOIN bills b ON p.bill_id = b.id WHERE b.tenant_id = $1 ORDER BY p.payment_date DESC, p.id DESC LIMIT 15",
            [tenantId]
        );

        res.status(200).json({
            name: user ? user.name : null,
            status: user ? user.status : 'Active',
            roomNumber: user ? user.room_number : null,
            balanceDue: parseFloat(balanceResult.rows[0]?.sum || 0),
            bills: billsResult.rows,
            recentTransactions: historyResult.rows
        });
    } catch (error) {
        console.error('Tenant Dashboard Error:', error);
        res.status(500).json({ message: 'Server error fetching tenant stats' });
    }
};

// Get Tenant Profile & Room Info
const getTenantProfile = async (req, res) => {
    const tenantId = req.user.id;
    try {
        const result = await db.query(
            `SELECT u.name, u.email, u.phone, u.status, u.created_at, u.date_moved_in, u.contract_end_date, u.bed_space, r.room_number, r.capacity, r.price, r.type 
             FROM users u 
             LEFT JOIN rooms r ON u.room_id = r.id 
             WHERE u.id = $1`,
            [tenantId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        // Fetch maintenance stats for this tenant
        const maintResult = await db.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_count
             FROM requests 
             WHERE tenant_id = $1`,
            [tenantId]
        );
        
        const stats = maintResult.rows[0];
        const totalReq = parseInt(stats.total || 0);
        const resolvedReq = parseInt(stats.resolved_count || 0);
        const cancelledReq = parseInt(stats.cancelled_count || 0);
        const pendingReq = parseInt(stats.pending_count || 0);
        const unresolved = totalReq - resolvedReq - cancelledReq;

        let recentStatus = 'None';
        if (totalReq > 0) {
            if (unresolved === 0) {
                recentStatus = 'Resolved';
            } else {
                recentStatus = 'Pending';
            }
        }

        // Fetch payment stats
        const paymentResult = await db.query(
            `SELECT 
                SUM(balance) as total_balance,
                MAX(payment_date) as last_payment_date
             FROM bills b
             LEFT JOIN payments p ON b.id = p.bill_id
             WHERE b.tenant_id = $1`,
            [tenantId]
        );
        const payStats = paymentResult.rows[0];
        const balance = parseFloat(payStats.total_balance || 0);
        
        let paymentStatus = 'Up to date';
        if (balance > 0) {
            paymentStatus = 'Pending';
        }

        const profileData = result.rows[0];
        profileData.maintenance = {
            total: totalReq,
            pending: unresolved, // Unresolved includes Pending and In Progress
            recent_status: recentStatus
        };
        
        profileData.payment = {
            balance: balance,
            status: paymentStatus,
            last_payment: payStats.last_payment_date
        };

        res.status(200).json(profileData);
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};


//Get Tenant Payments
const getTenantPayments = async (req, res) => {
    const tenantId = req.user.id;
    try {
        const result = await db.query(
            `SELECT p.id, 
                    TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS date, 
                    COALESCE(p.notes, 'Payment for ' || b.billing_month) AS description, 
                    p.amount_paid AS amount, 
                    COALESCE(p.status, 'Paid') AS status, 
                    p.payment_method,
                    p.payment_method AS method, 
                    p.receipt_url AS proof_url,
                    p.receipt_url AS proof_image,
                    p.receipt_url AS "proofOfPayment",
                    p.notes,
                    COALESCE(p.reference_number, p.id::text) AS "referenceNumber",
                    COALESCE(p.reference_number, p.id::text) AS reference_number,
                    p.created_at,
                    b.billing_month,
                    b.invoice_number,
                    b.invoice_number AS bill_invoice_number,
                    b.rent_amount,
                    b.water_charges,
                    b.electricity_charges,
                    b.other_fees,
                    b.total_amount AS bill_total,
                    b.balance AS bill_balance,
                    b.status AS bill_status,
                    TO_CHAR(b.due_date, 'YYYY-MM-DD') AS bill_due_date
             FROM payments p
             JOIN bills b ON p.bill_id = b.id
             WHERE b.tenant_id = $1
               AND (p.status IN ('Approved', 'Verified', 'Paid') OR p.status IS NULL)
               AND (p.status NOT IN ('Pending Verification', 'Pending', 'Rejected') OR p.status IS NULL)
             ORDER BY p.payment_date DESC, p.id DESC`,
            [tenantId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Tenant Payments Error:', error);
        res.status(500).json({ message: 'Server error fetching payments' });
    }
};

//Get Tenant Messages
const getTenantMessages = async (req, res) => {
    const tenantId = req.user.id;
    try {
        const query = `
            SELECT * FROM messages 
            WHERE (sender_id = $1 AND receiver_id = 1) 
               OR (sender_id = 1 AND receiver_id = $1)
            ORDER BY created_at ASC
        `;
        const result = await db.query(query, [tenantId]);
        
        // Mark unread messages from Admin as read
        await db.query(`
            UPDATE messages 
            SET status = 'read' 
            WHERE sender_id = 1 AND receiver_id = $1 AND status != 'read'
        `, [tenantId]);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ message: 'Server error fetching messages' });
    }
};

//Send Message to Admin
const sendTenantMessage = async (req, res) => {
    const tenantId = req.user.id;
    const { message } = req.body;
    
    if (!message) return res.status(400).json({ message: 'Message is required' });

    try {
        const adminId = 1; // Assuming admin user ID is 1
        const query = `
            INSERT INTO messages (sender_id, receiver_id, message, sender_type, status) 
            VALUES ($1, $2, $3, 'tenant', 'sent') 
            RETURNING *;
        `;
        const result = await db.query(query, [tenantId, adminId, message]);
        const sentMsg = result.rows[0];

        // Notify admin if offline when tenant sends message
        try {
            const adminNotificationService = require('../services/adminNotificationService');
            const tenantName = req.user.name || 'A resident';
            const snippet = message.length > 50 ? message.substring(0, 47) + '...' : message;
            adminNotificationService.notifyAdminsIfOffline({
                title: 'New Message',
                message: `${tenantName} sent: "${snippet}"`,
                type: 'chat_message',
                link: '/admin/chat'
            });
        } catch (notifErr) {
            console.error('Error queuing offline chat notification:', notifErr.message);
        }

        res.status(201).json(sentMsg);
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ message: 'Server error sending message' });
    }
};

//Get Unread Messages Count
const getUnreadCount = async (req, res) => {
    const tenantId = req.user.id;
    try {
        const result = await db.query(
            "SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND status != 'read'",
            [tenantId]
        );
        res.status(200).json({ unreadCount: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Unread Count Error:', error);
        res.status(500).json({ message: 'Server error fetching unread count' });
    }
};

// Update Tenant Profile
const updateTenantProfile = async (req, res) => {
    const tenantId = req.user?.id;
    if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const { name, email, phone } = req.body;
    try {
        const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : null;
        const cleanEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
        const formattedPhone = (phone && typeof phone === 'string' && phone.trim()) ? formatPhoneNumber(phone) : null;

        // Check for email conflicts with other users if an email is provided
        if (cleanEmail) {
            const conflict = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [cleanEmail, tenantId]
            );
            if (conflict.rows.length > 0) {
                return res.status(400).json({ message: 'The provided email is already in use by another account' });
            }
        }

        const result = await db.query(
            `UPDATE users 
             SET name = COALESCE($1, name), 
                 email = COALESCE($2, email), 
                 phone = COALESCE($3, phone) 
             WHERE id = $4 
             RETURNING id, name, email, phone, role, status`,
            [cleanName, cleanEmail, formattedPhone, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tenant record not found' });
        }

        res.status(200).json({ 
            message: 'Profile updated successfully', 
            user: result.rows[0] 
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: error.message || 'Server error updating profile' });
    }
};

// Update Tenant Password
const updateTenantPassword = async (req, res) => {
    const tenantId = req.user?.id;
    if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const { currentPassword, newPassword } = req.body;
    try {
        if (!currentPassword) {
            return res.status(400).json({ message: 'Current password is required to authorize this change' });
        }
        if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        const userResult = await db.query("SELECT id, password FROM users WHERE id = $1", [tenantId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Tenant record not found' });
        }
        const user = userResult.rows[0];

        // Bcrypt / legacy compare
        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password does not match' });
        }
        
        // Hash the new password with bcrypt
        const hashedPassword = await hashPassword(newPassword.trim());
        
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, tenantId]);
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ message: error.message || 'Server error updating password' });
    }
};

// Get Tenant's Current Bill
const getCurrentBill = async (req, res) => {
    const tenantId = req.user.id;
    try {
        // Fetch user creation date for cycle info
        const userResult = await db.query("SELECT created_at FROM users WHERE id = $1", [tenantId]);
        const user = userResult.rows[0];
        const creationDay = user?.created_at ? new Date(user.created_at).getDate() : 1;
        const createdAt = user?.created_at || null;

        const result = await db.query(
            "SELECT id, billing_month, total_amount, amount_paid, balance, rent_amount, water_charges, electricity_charges, other_fees, TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date, status, invoice_number FROM bills WHERE tenant_id = $1 AND status != 'Paid' ORDER BY due_date ASC LIMIT 1",
            [tenantId]
        );

        if (result.rows.length === 0) {
            // Check if tenant is active with an assigned room and needs current month bill auto-generated
            const activeTenantRoomQuery = `
                SELECT u.room_id, r.price as rent_amount, r.rental_type
                FROM users u
                JOIN rooms r ON u.room_id = r.id
                WHERE u.id = $1 AND u.role = 'tenant' AND u.status = 'Active' AND u.room_id IS NOT NULL
            `;
            const { rows: roomRows } = await db.query(activeTenantRoomQuery, [tenantId]);

            if (roomRows.length > 0) {
                const tenantInfo = roomRows[0];
                const now = new Date();
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const currentMonthName = monthNames[now.getMonth()];
                const currentYear = now.getFullYear();
                const billingMonthStr = `${currentMonthName} ${currentYear}`;
                const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);

                const existingCheck = await db.query(
                    "SELECT id FROM bills WHERE tenant_id = $1 AND billing_month = $2",
                    [tenantId, billingMonthStr]
                );

                if (existingCheck.rows.length === 0) {
                    const totalAmount = tenantInfo.rent_amount;
                    const invoiceNumber = await generateUniqueInvoiceNumber(db);
                    const insertBillQuery = `
                        INSERT INTO bills (tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, total_amount, balance, status, notes, invoice_number)
                        VALUES ($1, $2, $3, $4, $5, 0, 0, 0, $6, $7, 'Unpaid', 'Auto-generated bill', $8)
                        RETURNING id, billing_month, total_amount, amount_paid, balance, rent_amount, water_charges, electricity_charges, other_fees, TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date, status, invoice_number
                    `;
                    const newBillRes = await db.query(insertBillQuery, [
                        tenantId, tenantInfo.room_id, billingMonthStr, dueDate,
                        tenantInfo.rent_amount, totalAmount, totalAmount, invoiceNumber
                    ]);
                    const newBill = newBillRes.rows[0];
                    return res.status(200).json({
                        id: newBill.id,
                        invoice_number: newBill.invoice_number,
                        month: newBill.billing_month,
                        totalAmount: parseFloat(newBill.total_amount),
                        amountPaid: parseFloat(newBill.amount_paid),
                        remainingBalance: parseFloat(newBill.balance),
                        dueDate: newBill.due_date,
                        status: newBill.status,
                        createdAt,
                        creationDay,
                        breakdown: {
                            rent: parseFloat(newBill.rent_amount || 0),
                            water: 0,
                            electricity: 0,
                            other: 0,
                            penalty: 0
                        }
                    });
                }
            }

            return res.status(200).json({
                month: "No bill yet",
                dueDate: null,
                totalAmount: 0,
                amountPaid: 0,
                remainingBalance: 0,
                status: "No bill yet",
                hasBill: false,
                createdAt,
                creationDay,
                breakdown: { 
                    rent: 0, 
                    water: 0, 
                    electricity: 0, 
                    other: 0, 
                    penalty: 0 
                }
            });
        }

        const bill = result.rows[0];
        res.status(200).json({
            id: bill.id,
            invoice_number: bill.invoice_number,
            month: bill.billing_month,
            totalAmount: parseFloat(bill.total_amount),
            amountPaid: parseFloat(bill.amount_paid),
            remainingBalance: parseFloat(bill.balance),
            dueDate: bill.due_date,
            status: bill.status,
            createdAt,
            creationDay,
            breakdown: { 
                rent: parseFloat(bill.rent_amount || 0), 
                water: parseFloat(bill.water_charges || 0), 
                electricity: parseFloat(bill.electricity_charges || 0), 
                other: parseFloat(bill.other_fees || 0),
                penalty: 0 // Optional logic if you track penalties later
            }
        });
    } catch (error) {
        console.error('Get Current Bill Error:', error);
        res.status(500).json({ message: 'Server error fetching current bill' });
    }
};

// Get Admin-Uploaded GCash QR Code Screenshot for Online Payment
const getTenantGcashQr = async (req, res) => {
    try {
        await db.query('CREATE TABLE IF NOT EXISTS "rentTrack_schema".settings (id VARCHAR(50) PRIMARY KEY, data JSONB NOT NULL DEFAULT \'{}\' , updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);');
        const settingsResult = await db.query('SELECT data FROM "rentTrack_schema".settings WHERE id = $1', ['global']);
        const storedSettings = settingsResult.rows.length > 0 ? settingsResult.rows[0].data : {};
        const gcashQrCode = storedSettings?.gcashQrCode || storedSettings?.billing?.gcashQrCode || '';
        res.status(200).json({ gcashQrCode });
    } catch (error) {
        console.error('Get Tenant GCash QR Error:', error);
        res.status(500).json({ message: 'Server error retrieving GCash QR code' });
    }
};

// Submit Proof of Payment
const submitTenantPayment = async (req, res) => {
    const tenantId = req.user.id;
    const { bill_id, amount_paid } = req.body;
    let notes = req.body.notes || '';
    let refNumber = req.body.reference_number || req.body.referenceNumber;
    if (!refNumber && notes) {
        const match = notes.match(/Ref[:#]?\s*(\S+)/i);
        refNumber = match ? match[1] : notes;
    }
    const payment_method = 'GCash';
    let receipt_url = null;

    if (!bill_id || !amount_paid) {
        return res.status(400).json({ message: 'Missing required payment details' });
    }

    try {
        if (req.file && req.file.filename) {
            receipt_url = `/uploads/payments/${req.file.filename}`;
        }

        await db.query('BEGIN');

        const insertPaymentQuery = `
            INSERT INTO payments (bill_id, amount_paid, payment_date, payment_method, notes, receipt_url, status, reference_number) 
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, 'Pending Verification', $6) 
            RETURNING *
        `;
        const paymentResult = await db.query(insertPaymentQuery, [bill_id, amount_paid, payment_method, notes, receipt_url, refNumber]);
        
        const updateBillQuery = `
            UPDATE bills
            SET status = 'Pending Verification'
            WHERE id = $1 AND tenant_id = $2
            RETURNING id, billing_month, total_amount, amount_paid, balance, due_date, status
        `;
        const billResult = await db.query(updateBillQuery, [bill_id, tenantId]);

        await db.query('COMMIT');

        const newPaymentRaw = paymentResult.rows[0];
        const updatedBillRaw = billResult.rows[0];

        const newPayment = {
            id: newPaymentRaw.id,
            date: newPaymentRaw.payment_date,
            description: `Payment for ${updatedBillRaw ? updatedBillRaw.billing_month : 'Bill'}`,
            amount: newPaymentRaw.amount_paid,
            status: newPaymentRaw.status,
            payment_method: newPaymentRaw.payment_method,
            method: newPaymentRaw.payment_method,
            proof_image: newPaymentRaw.receipt_url,
            proof_url: newPaymentRaw.receipt_url,
            proofOfPayment: newPaymentRaw.receipt_url,
            notes: newPaymentRaw.notes,
            referenceNumber: newPaymentRaw.reference_number || newPaymentRaw.id.toString(),
            reference_number: newPaymentRaw.reference_number || newPaymentRaw.id.toString(),
            created_at: newPaymentRaw.created_at,
            billing_month: updatedBillRaw ? updatedBillRaw.billing_month : null,
            rent_amount: updatedBillRaw ? updatedBillRaw.rent_amount : null,
            water_charges: updatedBillRaw ? updatedBillRaw.water_charges : null,
            electricity_charges: updatedBillRaw ? updatedBillRaw.electricity_charges : null,
            other_fees: updatedBillRaw ? updatedBillRaw.other_fees : null,
            bill_total: updatedBillRaw ? updatedBillRaw.total_amount : null,
            bill_balance: updatedBillRaw ? updatedBillRaw.balance : null,
            bill_status: updatedBillRaw ? updatedBillRaw.status : null,
            bill_due_date: updatedBillRaw ? updatedBillRaw.due_date : null
        };

        const updatedBill = updatedBillRaw ? {
            id: updatedBillRaw.id,
            month: updatedBillRaw.billing_month,
            totalAmount: parseFloat(updatedBillRaw.total_amount),
            amountPaid: parseFloat(updatedBillRaw.amount_paid),
            remainingBalance: parseFloat(updatedBillRaw.balance),
            dueDate: updatedBillRaw.due_date,
            status: updatedBillRaw.status
        } : null;

        // Notify admin if offline when payment is submitted
        try {
            const adminNotificationService = require('../services/adminNotificationService');
            const tenantName = req.user.name || 'A resident';
            adminNotificationService.notifyAdminsIfOffline({
                title: 'Payment Verification',
                message: `${tenantName} submitted a ₱${Number(amount_paid).toLocaleString()} payment proof for verification.`,
                type: 'payment_verification',
                link: '/admin/billing'
            });
        } catch (notifErr) {
            console.error('Error queuing offline payment notification:', notifErr.message);
        }

        res.status(201).json({ 
            message: 'Payment proof submitted for verification', 
            newPayment,
            updatedBill
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Submit Payment Error:', error);
        res.status(500).json({ message: 'Server error submitting payment proof' });
    }
};

// Get Available Rooms for Tenant View
const getTenantRooms = async (req, res) => {
    try {
        await ensureRoomGenderColumn();
        const tenantId = req.user.id;
        
        // Check if tenant is already assigned to a room
        const userResult = await db.query("SELECT room_id, gender FROM users WHERE id = $1", [tenantId]);
        const roomId = userResult.rows[0]?.room_id;
        const tenantGender = userResult.rows[0]?.gender || null;

        if (roomId) {
            // Fetch their assigned room details
            const roomQuery = `
                SELECT 
                    r.id, r.room_number, r.capacity, r.price, r.status,
                    r.type, r.rental_type, r.gender, r.floor, r.description, r.amenities,
                    CAST(COUNT(u.id) AS INTEGER) as current_occupants,
                    CAST((r.capacity - COUNT(u.id)) AS INTEGER) as available_slots
                FROM rooms r
                LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out'
                WHERE r.id = $1
                GROUP BY r.id
            `;
            const roomData = await db.query(roomQuery, [roomId]);
            
            // Fetch roommates
            const roommatesQuery = `
                SELECT id, name, phone, email, gender, date_moved_in 
                FROM users 
                WHERE room_id = $1 AND role = 'tenant' AND status != 'Moved Out'
            `;
            const roommatesData = await db.query(roommatesQuery, [roomId]);
            
            const roommates = roommatesData.rows.map(mate => ({
                ...mate,
                is_me: mate.id === tenantId
            }));

            const assignedRoom = roomData.rows[0]
                ? {
                    ...roomData.rows[0],
                    gender: normalizeRoomGender(
                        roomData.rows[0].gender,
                        roommates.map(m => m.gender)
                    )
                }
                : null;

            // Fetch room maintenance history
            const maintenanceQuery = `
                SELECT 
                    r.id, r.request_number, r.title, r.description, r.category, r.status, r.priority, r.created_at,
                    u.name as reported_by
                FROM requests r
                JOIN users u ON r.tenant_id = u.id
                WHERE u.room_id = $1
                ORDER BY r.created_at DESC
                LIMIT 50
            `;
            const maintenanceData = await db.query(maintenanceQuery, [roomId]);

            return res.status(200).json({
                isAssigned: true,
                room: assignedRoom,
                roommates: roommates,
                maintenance_history: maintenanceData.rows
            });
        }

        const query = `
            SELECT 
                r.id, r.room_number, r.capacity, r.price, r.status,
                r.type, r.rental_type, r.gender, r.floor, r.description, r.amenities,
                CAST(COUNT(u.id) AS INTEGER) as current_occupants,
                CAST(GREATEST(0, r.capacity - COUNT(u.id)) AS INTEGER) as available_slots,
                COALESCE(
                    json_agg(u.gender) FILTER (WHERE u.id IS NOT NULL AND u.gender IS NOT NULL),
                    '[]'::json
                ) as occupant_genders
            FROM rooms r
            LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out'
            GROUP BY r.id
            ORDER BY r.room_number ASC
        `;
        const rooms = await db.query(query);
        const mappedRooms = rooms.rows.map(room => {
            const occupantGenders = Array.isArray(room.occupant_genders) ? room.occupant_genders : [];
            const effectiveGender = normalizeRoomGender(room.gender, occupantGenders);
            return {
                ...room,
                gender: effectiveGender
            };
        });

        res.status(200).json({
            isAssigned: false,
            tenantGender,
            rooms: mappedRooms
        });
    } catch (error) {
        console.error("Get Tenant Rooms Error:", error); 
        res.status(500).json({ message: 'Server error fetching rooms' });
    }
};

// Choose a Room
const chooseRoom = async (req, res) => {
    const tenantId = req.user.id;
    const { room_id } = req.body;

    if (!room_id) return res.status(400).json({ message: 'Room ID is required' });

    try {
        await ensureRoomGenderColumn();

        // 1. Check if room exists and has available slots
        const roomQuery = `
            SELECT 
                r.id, r.room_number, r.capacity, r.status, r.gender,
                CAST(COUNT(u.id) AS INTEGER) as current_occupants,
                COALESCE(
                    json_agg(u.gender) FILTER (WHERE u.id IS NOT NULL AND u.gender IS NOT NULL),
                    '[]'::json
                ) as occupant_genders
            FROM rooms r
            LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out'
            WHERE r.id = $1
            GROUP BY r.id
        `;
        const roomResult = await db.query(roomQuery, [room_id]);
        
        if (roomResult.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = roomResult.rows[0];
        if (room.status === 'Maintenance' || room.status === 'Unavailable') {
            return res.status(400).json({ message: 'This room is currently unavailable for selection' });
        }

        if (room.current_occupants >= room.capacity) {
            return res.status(400).json({ message: 'This room is fully occupied' });
        }

        const effectiveRoomGender = normalizeRoomGender(
            room.gender,
            Array.isArray(room.occupant_genders) ? room.occupant_genders : []
        );

        const tenantResult = await db.query("SELECT gender FROM users WHERE id = $1", [tenantId]);
        const currentTenantGender = (tenantResult.rows[0]?.gender || '').trim().toLowerCase();

        if (currentTenantGender === 'male' && effectiveRoomGender === 'Female Only') {
            return res.status(400).json({ message: `Room ${room.room_number} is designated for Female Only.` });
        }
        if (currentTenantGender === 'female' && effectiveRoomGender === 'Male Only') {
            return res.status(400).json({ message: `Room ${room.room_number} is designated for Male Only.` });
        }

        const inferredTenantGender = effectiveRoomGender === 'Female Only' ? 'Female' : 'Male';

        // 2. Update tenant profile to Active and assign room
        const updateQuery = `
            UPDATE users 
            SET room_id = $1,
                status = 'Active',
                date_moved_in = CURRENT_DATE,
                gender = CASE
                    WHEN gender IS NULL OR TRIM(gender) = '' OR LOWER(TRIM(gender)) = 'not specified'
                    THEN $3
                    ELSE gender
                END
            WHERE id = $2 AND role = 'tenant'
            RETURNING id, name, room_id, status, gender
        `;
        const updatedUser = await db.query(updateQuery, [room_id, tenantId, inferredTenantGender]);

        res.status(200).json({ 
            message: 'Room selected successfully! You are now an Active tenant.',
            user: updatedUser.rows[0]
        });
    } catch (error) {
        console.error("Choose Room Error:", error);
        res.status(500).json({ message: 'Server error choosing room' });
    }
};

// Get Announcements
const getAnnouncements = async (req, res) => {
    try {
        const query = `
            SELECT a.*, u.name as created_by_name 
            FROM announcements a
            LEFT JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get Announcements Error:', error);
        res.status(500).json({ message: 'Server error fetching announcements' });
    }
};

// Get Tenant Notifications
const getTenantNotifications = async (req, res) => {
    const tenantId = req.user.id;
    try {
        const query = `
            SELECT id, title, message, type, bill_id, is_read, created_at
            FROM "rentTrack_schema".notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `;
        const { rows } = await db.query(query, [tenantId]);
        const unreadCount = rows.filter(n => !n.is_read).length;

        res.status(200).json({
            unreadCount,
            notifications: rows
        });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
};

// Mark Single Notification as Read
const markNotificationRead = async (req, res) => {
    const tenantId = req.user.id;
    const { id } = req.params;
    try {
        await db.query(
            `UPDATE "rentTrack_schema".notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
            [id, tenantId]
        );
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark Notification Read Error:', error);
        res.status(500).json({ message: 'Server error marking notification as read' });
    }
};

// Mark All Notifications as Read
const markAllNotificationsRead = async (req, res) => {
    const tenantId = req.user.id;
    try {
        await db.query(
            `UPDATE "rentTrack_schema".notifications SET is_read = TRUE WHERE user_id = $1`,
            [tenantId]
        );
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark All Notifications Read Error:', error);
        res.status(500).json({ message: 'Server error marking notifications as read' });
    }
};

module.exports = { 
    getTenantDashboard, getTenantProfile, updateTenantProfile, updateTenantPassword, 
    getTenantPayments, getCurrentBill, getTenantGcashQr, submitTenantPayment,
    getTenantMessages, sendTenantMessage, getUnreadCount,
    getTenantRooms, chooseRoom, getAnnouncements,
    getTenantNotifications, markNotificationRead, markAllNotificationsRead
};