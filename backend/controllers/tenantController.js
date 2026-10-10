const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get Tenant Dashboard Data
const getTenantDashboard = async (req, res) => {
    const tenantId = req.user.id;

    try {
        // Get tenant's current status and room
        const userResult = await db.query(
            "SELECT u.status, r.room_number FROM users u LEFT JOIN rooms r ON u.room_id = r.id WHERE u.id = $1",
            [tenantId]
        );
        const user = userResult.rows[0];

        const balanceResult = await db.query(
            "SELECT SUM(balance) FROM bills WHERE tenant_id = $1 AND status != 'Paid'", 
            [tenantId]
        );

        // Get recent payment history
        const historyResult = await db.query(
            "SELECT p.*, b.billing_month FROM payments p JOIN bills b ON p.bill_id = b.id WHERE b.tenant_id = $1 ORDER BY p.payment_date DESC LIMIT 15",
            [tenantId]
        );

        res.status(200).json({
            status: user.status,
            roomNumber: user.room_number,
            balanceDue: balanceResult.rows[0].sum || 0,
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
            `SELECT u.name, u.email, u.phone, u.status, u.created_at, u.date_moved_in, u.contract_end_date, r.room_number, r.capacity, r.price, r.type 
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
            `SELECT p.id, TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS date, 
                    'Payment for ' || b.billing_month AS description, 
                    p.amount_paid AS amount, 
                    p.status, 
                    p.payment_method AS method, 
                    p.id::text AS "referenceNumber"
             FROM payments p
             JOIN bills b ON p.bill_id = b.id
             WHERE b.tenant_id = $1
             ORDER BY p.payment_date DESC`,
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
        res.status(201).json(result.rows[0]);
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
    const tenantId = req.user.id;
    const { name, email, phone } = req.body;
    try {
        const result = await db.query(
            "UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING id, name, email, phone",
            [name, email, phone, tenantId]
        );
        res.status(200).json({ message: 'Profile updated successfully', user: result.rows[0] });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// Update Tenant Password
const updateTenantPassword = async (req, res) => {
    const tenantId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    try {
        const userResult = await db.query("SELECT password FROM users WHERE id = $1", [tenantId]);
        const user = userResult.rows[0];

        // Bcrypt compare
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect current password' });
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, tenantId]);
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error updating password' });
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
            "SELECT id, billing_month, total_amount, amount_paid, balance, rent_amount, water_charges, electricity_charges, other_fees, TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date, status FROM bills WHERE tenant_id = $1 AND status != 'Paid' ORDER BY due_date ASC LIMIT 1",
            [tenantId]
        );

        if (result.rows.length === 0) {
            const now = new Date();
            const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
            return res.status(200).json({
                month: currentMonthName,
                dueDate: null,
                totalAmount: 0,
                amountPaid: 0,
                remainingBalance: 0,
                status: "Clear",
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

// Submit Proof of Payment
const submitTenantPayment = async (req, res) => {
    const tenantId = req.user.id;
    const { bill_id, amount_paid, payment_method, notes } = req.body;
    let receipt_url = null;

    if (!bill_id || !amount_paid || !payment_method) {
        return res.status(400).json({ message: 'Missing required payment details' });
    }

    try {
        if (req.file && req.file.filename) {
            receipt_url = `/uploads/payments/${req.file.filename}`;
        }

        await db.query('BEGIN');

        const insertPaymentQuery = `
            INSERT INTO payments (bill_id, amount_paid, payment_date, payment_method, notes, receipt_url, status) 
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, 'Pending Verification') 
            RETURNING *
        `;
        const paymentResult = await db.query(insertPaymentQuery, [bill_id, amount_paid, payment_method, notes, receipt_url]);
        
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
            method: newPaymentRaw.payment_method,
            referenceNumber: newPaymentRaw.id.toString()
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
        const tenantId = req.user.id;
        
        // Check if tenant is already assigned to a room
        const userResult = await db.query("SELECT room_id FROM users WHERE id = $1", [tenantId]);
        const roomId = userResult.rows[0]?.room_id;

        if (roomId) {
            // Fetch their assigned room details
            const roomQuery = `
                SELECT 
                    r.id, r.room_number, r.capacity, r.price, r.status,
                    r.type, r.floor, r.description,
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
                SELECT id, name, phone, email, date_moved_in 
                FROM users 
                WHERE room_id = $1 AND role = 'tenant' AND status != 'Moved Out'
            `;
            const roommatesData = await db.query(roommatesQuery, [roomId]);
            
            const roommates = roommatesData.rows.map(mate => ({
                ...mate,
                is_me: mate.id === tenantId
            }));

            return res.status(200).json({
                isAssigned: true,
                room: roomData.rows[0],
                roommates: roommates
            });
        }

        const query = `
            SELECT 
                r.id, r.room_number, r.capacity, r.price, r.status,
                r.type, r.floor, r.description,
                CAST(COUNT(u.id) AS INTEGER) as current_occupants,
                CAST((r.capacity - COUNT(u.id)) AS INTEGER) as available_slots
            FROM rooms r
            LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out'
            GROUP BY r.id
            ORDER BY r.room_number ASC
        `;
        const rooms = await db.query(query);
        res.status(200).json({
            isAssigned: false,
            rooms: rooms.rows
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
        // 1. Check if room exists and has available slots
        const roomQuery = `
            SELECT r.capacity, CAST(COUNT(u.id) AS INTEGER) as current_occupants
            FROM rooms r
            LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out'
            WHERE r.id = $1
            GROUP BY r.capacity
        `;
        const roomResult = await db.query(roomQuery, [room_id]);
        
        if (roomResult.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const { capacity, current_occupants } = roomResult.rows[0];
        if (current_occupants >= capacity) {
            return res.status(400).json({ message: 'This room is fully occupied' });
        }

        // 2. Update tenant profile to Active and assign room
        const updateQuery = `
            UPDATE users 
            SET room_id = $1, status = 'Active', date_moved_in = CURRENT_DATE 
            WHERE id = $2 AND role = 'tenant'
            RETURNING id, name, room_id, status
        `;
        const updatedUser = await db.query(updateQuery, [room_id, tenantId]);

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

module.exports = { 
    getTenantDashboard, getTenantProfile, updateTenantProfile, updateTenantPassword, 
    getTenantPayments, getCurrentBill, submitTenantPayment,
    getTenantMessages, sendTenantMessage, getUnreadCount,
    getTenantRooms, chooseRoom, getAnnouncements
};