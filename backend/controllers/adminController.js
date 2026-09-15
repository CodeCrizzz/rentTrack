const db = require('../config/db');

// @desc    Get Admin Dashboard Statistics
const getDashboardStats = async (req, res) => {
    try {
        const [
            roomsResult, roomStatusResult, 
            tenantsResult, tenantStatusResult, recentTenantsResult,
            incomeResult, duesResult,
            requestsResult, recentPaymentsResult, recentRequestsResult,
            expiringContractsResult, totalBilledResult, historicalIncomeResult,
            overdueAccountsResult, upcomingRentResult, recentMessagesResult, pendingTenantsListResult
        ] = await Promise.all([
            // Rooms Overview
            db.query('SELECT COUNT(*) FROM rooms'),
            db.query(`
                SELECT 
                    r.id, r.status, r.capacity, 
                    CAST(COUNT(u.id) AS INTEGER) as current_occupants 
                FROM rooms r 
                LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out' 
                GROUP BY r.id
            `),
            
            // Tenants Overview (Total & Status)
            db.query("SELECT COUNT(*) FROM users WHERE role = 'tenant'"),
            db.query("SELECT status, COUNT(*) FROM users WHERE role = 'tenant' GROUP BY status"),
            db.query("SELECT id, name, created_at FROM users WHERE role = 'tenant' ORDER BY created_at DESC LIMIT 5"),
            
            // Billing Overview
            db.query("SELECT SUM(amount_paid) FROM payments WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)"),
            db.query("SELECT status, SUM(balance) FROM bills WHERE status IN ('Unpaid', 'Partial', 'Overdue') GROUP BY status"),
            
            // Maintenance Summary
            db.query("SELECT status, COUNT(*) FROM requests GROUP BY status"),
            
            // Recent Payments & Requests for Activity Feed
            db.query(`
                SELECT p.id, u.name as tenant_name, p.amount_paid, p.payment_date 
                FROM payments p 
                JOIN bills b ON p.bill_id = b.id 
                JOIN users u ON b.tenant_id = u.id 
                ORDER BY p.payment_date DESC LIMIT 5
            `),
            db.query(`
                SELECT r.id, u.name as tenant_name, r.title, r.created_at 
                FROM requests r 
                JOIN users u ON r.tenant_id = u.id 
                ORDER BY r.created_at DESC LIMIT 5
            `),

            // Expiring Contracts (within next 30 days)
            db.query(`
                SELECT u.id, u.name, u.contract_end_date, r.room_number
                FROM users u
                LEFT JOIN rooms r ON u.room_id = r.id
                WHERE u.role = 'tenant' 
                  AND u.status = 'Active'
                  AND u.contract_end_date IS NOT NULL
                  AND u.contract_end_date <= CURRENT_DATE + INTERVAL '30 days'
                ORDER BY u.contract_end_date ASC
                LIMIT 5
            `),

            // Total billed this month (for collection rate)
            db.query("SELECT SUM(total_amount) FROM bills WHERE EXTRACT(MONTH FROM due_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM due_date) = EXTRACT(YEAR FROM CURRENT_DATE)"),

            // Historical Income (last 12 months)
            db.query(`
                SELECT 
                    EXTRACT(YEAR FROM payment_date) as year,
                    EXTRACT(MONTH FROM payment_date) as month,
                    SUM(amount_paid) as total
                FROM payments
                WHERE payment_date >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY year, month
                ORDER BY year DESC, month DESC
            `),

            // Overdue Accounts (Top 5 tenants with highest unpaid balances)
            db.query(`
                SELECT u.id as tenant_id, u.name as tenant_name, r.room_number, SUM(b.balance) as total_overdue
                FROM bills b
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms r ON u.room_id = r.id
                WHERE b.status IN ('Unpaid', 'Partial', 'Overdue') AND b.due_date < CURRENT_DATE
                GROUP BY u.id, u.name, r.room_number
                ORDER BY total_overdue DESC
                LIMIT 5
            `),

            // Upcoming Rent Due (bills due in next 7 days)
            db.query(`
                SELECT b.id, u.name as tenant_name, r.room_number, b.balance, b.due_date 
                FROM bills b
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms r ON u.room_id = r.id
                WHERE b.status IN ('Unpaid', 'Partial') AND b.due_date >= CURRENT_DATE AND b.due_date <= CURRENT_DATE + INTERVAL '7 days'
                ORDER BY b.due_date ASC
                LIMIT 5
            `),

            // Recent Messages
            db.query(`
                SELECT m.id, u.name as tenant_name, m.message, m.created_at, m.status 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.sender_type = 'tenant'
                ORDER BY m.created_at DESC LIMIT 5
            `),

            // Pending Tenants
            db.query(`
                SELECT id, name, email, created_at 
                FROM users 
                WHERE role = 'tenant' AND status = 'Pending'
                ORDER BY created_at DESC LIMIT 5
            `),
        ]);

        // --- Process Room Stats ---
        const totalRooms = roomStatusResult.rows.length;
        let occupiedRooms = 0, availableRooms = 0, partiallyOccupiedRooms = 0, maintenanceRooms = 0, unavailableRooms = 0;
        
        roomStatusResult.rows.forEach(room => {
            let status = room.status;
            if (status !== 'Maintenance' && status !== 'Unavailable') {
                if (room.current_occupants === 0) {
                    status = 'Available';
                } else if (room.current_occupants >= room.capacity) {
                    status = 'Occupied';
                } else {
                    status = 'Partially Occupied';
                }
            }
            
            if (status === 'Occupied') occupiedRooms++;
            else if (status === 'Available') availableRooms++;
            else if (status === 'Partially Occupied') partiallyOccupiedRooms++;
            else if (status === 'Maintenance') maintenanceRooms++;
            else if (status === 'Unavailable') unavailableRooms++;
        });

        // --- Process Tenant Stats ---
        const totalTenants = parseInt(tenantsResult.rows[0].count);
        let activeTenants = 0, pendingTenants = 0;
        tenantStatusResult.rows.forEach(r => {
            if (r.status.toLowerCase() === 'active') activeTenants += parseInt(r.count);
            else if (r.status.toLowerCase() === 'pending') pendingTenants += parseInt(r.count);
        });
        const inactiveTenants = totalTenants - activeTenants - pendingTenants;

        // --- Process Billing Stats ---
        const monthlyIncome = incomeResult.rows[0].sum || 0;
        let pendingDues = 0, overduePayments = 0;
        duesResult.rows.forEach(r => {
            if (r.status.toLowerCase() === 'overdue') overduePayments += parseFloat(r.sum);
            pendingDues += parseFloat(r.sum); // Pending is the sum of Unpaid, Partial, Overdue
        });

        // --- Process Maintenance Stats ---
        let totalRequests = 0, pendingRequests = 0, inProgressRequests = 0, resolvedRequests = 0;
        requestsResult.rows.forEach(r => {
            const count = parseInt(r.count);
            totalRequests += count;
            if (r.status.toLowerCase() === 'pending') pendingRequests += count;
            else if (r.status.toLowerCase() === 'in progress') inProgressRequests += count;
            else if (r.status.toLowerCase() === 'resolved') resolvedRequests += count;
        });

        // --- Synthesize Recent Activities ---
        let activities = [];
        
        // Add recent tenants
        recentTenantsResult.rows.forEach(t => {
            activities.push({
                id: `t_${t.id}`,
                type: 'tenant',
                title: 'New tenant registered',
                description: `${t.name} joined the system`,
                date: t.created_at
            });
        });

        // Add recent payments
        recentPaymentsResult.rows.forEach(p => {
            activities.push({
                id: `p_${p.id}`,
                type: 'payment',
                title: 'Payment received',
                description: `₱${parseFloat(p.amount_paid).toLocaleString()} from ${p.tenant_name}`,
                date: p.payment_date
            });
        });

        // Add recent requests
        recentRequestsResult.rows.forEach(req => {
            activities.push({
                id: `r_${req.id}`,
                type: 'maintenance',
                title: 'Maintenance request',
                description: `"${req.title}" by ${req.tenant_name}`,
                date: req.created_at
            });
        });

        // Add recent messages to activities (optional, but requested separately)
        recentMessagesResult.rows.forEach(m => {
            activities.push({
                id: `m_${m.id}`,
                type: 'message',
                title: 'New message',
                description: `From ${m.tenant_name}`,
                date: m.created_at
            });
        });

        // Sort activities by date DESC and keep top 10
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        activities = activities.slice(0, 10);
        
        // Detailed recent messages array
        const recentMessages = recentMessagesResult.rows.map(m => ({
            id: m.id,
            tenant_name: m.tenant_name,
            message: m.message,
            status: m.status,
            created_at: m.created_at
        }));

        // Pending Tenants List
        const pendingTenantsList = pendingTenantsListResult.rows.map(t => ({
            id: t.id,
            name: t.name,
            email: t.email,
            created_at: t.created_at
        }));

        // Recent Payments List
        const recentPayments = recentPaymentsResult.rows.map(p => ({
            id: p.id,
            tenant_name: p.tenant_name,
            amount_paid: p.amount_paid,
            payment_date: p.payment_date
        }));

        // Recent Requests List
        const recentRequests = recentRequestsResult.rows.map(r => ({
            id: r.id,
            tenant_name: r.tenant_name,
            title: r.title,
            created_at: r.created_at
        }));

        // --- Process Expiring Contracts ---
        const expiringContracts = expiringContractsResult.rows.map(t => ({
            id: t.id,
            name: t.name,
            room_number: t.room_number,
            contract_end_date: t.contract_end_date,
            days_left: Math.max(0, Math.ceil((new Date(t.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24)))
        }));

        // --- Collection Rate ---
        const totalBilled = parseFloat(totalBilledResult.rows[0].sum) || 0;
        const collectionRate = totalBilled > 0 ? Math.round((monthlyIncome / totalBilled) * 100) : 0;

        // --- Historical Income ---
        const historicalIncome = historicalIncomeResult.rows.map(r => ({
            year: parseInt(r.year),
            month: parseInt(r.month),
            total: parseFloat(r.total) || 0
        }));

        // --- Overdue Accounts ---
        const overdueAccounts = overdueAccountsResult.rows.map(r => ({
            tenant_id: r.tenant_id,
            tenant_name: r.tenant_name,
            room_number: r.room_number,
            total_overdue: parseFloat(r.total_overdue) || 0
        }));

        // --- Upcoming Rent Due ---
        const upcomingRent = upcomingRentResult.rows.map(r => ({
            id: r.id,
            tenant_name: r.tenant_name,
            room_number: r.room_number,
            balance: parseFloat(r.balance) || 0,
            due_date: r.due_date
        }));

        // --- Final Response Object ---
        res.status(200).json({
            rooms: { totalRooms, occupiedRooms, availableRooms, partiallyOccupiedRooms, maintenanceRooms, unavailableRooms },
            tenants: { totalTenants, activeTenants, pendingTenants, inactiveTenants },
            billing: { monthlyIncome, pendingDues, overduePayments, totalBilled, collectionRate, historicalIncome },
            maintenance: { totalRequests, pendingRequests, inProgressRequests, resolvedRequests },
            recentActivities: activities,
            recentMessages,
            pendingTenantsList,
            recentPayments,
            recentRequests,
            expiringContracts,
            overdueAccounts,
            upcomingRent
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: 'Server error fetching admin stats' });
    }
};

// @desc    Get all Rooms with detailed occupancy & financials
// @route   GET /api/admin/rooms
const getAllRooms = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id, r.room_number, r.capacity, r.price, r.status,
                r.type, r.rental_type, r.amenities, r.floor, r.description,
                CAST(COUNT(u.id) AS INTEGER) as current_occupants,
                CAST((r.capacity - COUNT(u.id)) AS INTEGER) as available_slots,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', u.id,
                            'name', u.name,
                            'phone', u.phone,
                            'date_moved_in', u.date_moved_in,
                            'bed_space', u.bed_space,
                            'balance', COALESCE((
                                SELECT SUM(balance) FROM bills b 
                                WHERE b.tenant_id = u.id AND b.status IN ('Unpaid', 'Partial', 'Overdue')
                            ), 0)
                        )
                    ) FILTER (WHERE u.id IS NOT NULL), '[]'::json -- <--- CRITICAL FIX: Added ::json here
                ) as occupants
            FROM rooms r
            LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out'
            GROUP BY r.id
            ORDER BY r.room_number ASC
        `;
        const rooms = await db.query(query);

        // Dynamically compute status based on capacity vs occupants
        const mappedRooms = rooms.rows.map(room => {
            let computedStatus = room.status;
            if (room.status !== 'Maintenance' && room.status !== 'Unavailable') {
                if (room.current_occupants === 0) {
                    computedStatus = 'Available';
                } else if (room.current_occupants >= room.capacity) {
                    computedStatus = 'Occupied';
                } else {
                    computedStatus = 'Partially Occupied';
                }
            }
            return { ...room, status: computedStatus };
        });

        res.status(200).json(mappedRooms);
    } catch (error) {
        // print the exact SQL error to the backend terminal
        console.error("Get All Rooms Error Details:", error.message); 
        res.status(500).json({ message: 'Server error fetching rooms' });
    }
};

// @desc    Create a new Room
// @route   POST /api/admin/rooms
const createRoom = async (req, res) => {
    const { room_number, type, rental_type, capacity, price, floor, description, amenities, status } = req.body;
    try {
        // Check if room number already exists to prevent duplicates
        const roomExists = await db.query('SELECT * FROM rooms WHERE room_number = $1', [room_number]);
        if (roomExists.rows.length > 0) {
            return res.status(400).json({ message: 'Room number already exists' });
        }

        // Insert the new room
        const query = `
            INSERT INTO rooms (room_number, type, rental_type, capacity, price, floor, description, amenities, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *
        `;
        const newRoom = await db.query(query, [
            room_number, 
            type || 'Single', 
            rental_type || 'Whole Room',
            capacity, 
            price, 
            floor || null, 
            description || null, 
            amenities || null,
            status || 'Available'
        ]);
        
        res.status(201).json({ message: 'Room created successfully', room: newRoom.rows[0] });
    } catch (error) {
        console.error('Create Room Error:', error);
        res.status(500).json({ message: 'Server error creating room' });
    }
};

// @desc    Update a Room
// @route   PUT /api/admin/rooms/:id
const updateRoom = async (req, res) => {
    const { id } = req.params;
    const { room_number, type, rental_type, capacity, price, floor, description, amenities, status } = req.body;
    
    try {
        const query = `
            UPDATE rooms 
            SET room_number = $1, type = $2, rental_type = $3, capacity = $4, price = $5, floor = $6, description = $7, amenities = $8, status = $9 
            WHERE id = $10 
            RETURNING *
        `;
        const updatedRoom = await db.query(query, [
            room_number, 
            type || 'Single', 
            rental_type || 'Whole Room',
            capacity, 
            price, 
            floor || null, 
            description || null, 
            amenities || null,
            status, 
            id
        ]);
        
        if (updatedRoom.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.status(200).json({ message: 'Room updated successfully', room: updatedRoom.rows[0] });
    } catch (error) {
        console.error('Update Room Error:', error);
        res.status(500).json({ message: 'Server error updating room' });
    }
};

// @desc    Delete a Room
// @route   DELETE /api/admin/rooms/:id
const deleteRoom = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Safety Check: Don't  delete if an active tenant is still assigned to this room
        const tenantCheck = await db.query("SELECT * FROM users WHERE room_id = $1 AND role = 'tenant' AND status != 'Moved Out'", [id]);
        if (tenantCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Cannot delete this room because an active tenant is currently assigned to it.' });
        }

        //Delete the room
        const result = await db.query('DELETE FROM rooms WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.status(200).json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Delete Room Error:', error);
        res.status(500).json({ message: 'Server error deleting room' });
    }
};

// @desc    Get all Payments/Billing
const getAllPayments = async (req, res) => {
    try {
        const query = `
            SELECT p.*, u.name as tenant_name, r.room_number 
            FROM payments p 
            JOIN users u ON p.tenant_id = u.id 
            LEFT JOIN rooms r ON u.room_id = r.id 
            ORDER BY p.due_date DESC
        `;
        const payments = await db.query(query);
        res.status(200).json(payments.rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching payments' });
    }
};

// @desc    Get all Maintenance Requests
const getAllRequests = async (req, res) => {
    try {
        const query = `
            SELECT req.*, u.name as tenant_name, r.room_number 
            FROM requests req 
            JOIN users u ON req.tenant_id = u.id 
            LEFT JOIN rooms r ON u.room_id = r.id 
            ORDER BY req.created_at DESC
        `;
        const requests = await db.query(query);
        res.status(200).json(requests.rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching requests' });
    }
};

// @desc    Get all Tenants
// @route   GET /api/admin/tenants
const getAllTenants = async (req, res) => {
    try {
        const query = `
            SELECT u.*, r.room_number 
            FROM users u 
            LEFT JOIN rooms r ON u.room_id = r.id 
            WHERE u.role = 'tenant' 
            ORDER BY u.created_at DESC
        `;
        const tenants = await db.query(query);
        res.status(200).json(tenants.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching tenants' });
    }
};


// @desc    Update Tenant details or Status
// @route   PUT /api/admin/tenants/:id
const updateTenant = async (req, res) => {
    const { id } = req.params;

    try {
        // If ONLY updating the status (Approve/Decline button)
        if (req.body.status && Object.keys(req.body).length === 1) {
            const result = await db.query(
                "UPDATE users SET status = $1 WHERE id = $2 AND role = 'tenant' RETURNING *",
                [req.body.status, id]
            );
            return res.status(200).json({ message: 'Status updated', tenant: result.rows[0] });
        }

        const { name, email, phone, room_id, gender, date_moved_in, contract_end_date, status } = req.body;

        const query = `
            UPDATE users 
            SET 
                name = $1, 
                email = $2, 
                phone = $3, 
                room_id = $4,
                gender = $5,
                date_moved_in = $6,
                contract_end_date = $7,
                status = $8
            WHERE id = $9 AND role = 'tenant'
            RETURNING *
        `;
        
        const result = await db.query(query, [
            name, 
            email, 
            phone, 
            room_id || null, 
            gender || 'Not Specified',
            date_moved_in || null,
            contract_end_date || null,
            status || 'Pending',
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        res.status(200).json({ message: 'Tenant updated successfully', tenant: result.rows[0] });
    } catch (error) {
        console.error('Update Tenant Error:', error);
        res.status(500).json({ message: 'Server error updating tenant' });
    }
};

// @desc    Delete a Tenant
// @route   DELETE /api/admin/tenants/:id
const deleteTenant = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query("DELETE FROM users WHERE id = $1 AND role = 'tenant' RETURNING id", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        res.status(200).json({ message: 'Tenant deleted successfully' });
    } catch (error) {
        console.error('Delete Tenant Error:', error);
        res.status(500).json({ message: 'Server error deleting tenant. Check for existing dependencies (payments, etc.).' });
    }
};

// @desc    Get all Conversations (Chat List for Admin)
// @route   GET /api/admin/chat/conversations
const getConversations = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.name, r.room_number,
                (
                    SELECT message FROM messages 
                    WHERE (sender_id = u.id AND receiver_id = 1) OR (sender_id = 1 AND receiver_id = u.id)
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message,
                (
                    SELECT created_at FROM messages 
                    WHERE (sender_id = u.id AND receiver_id = 1) OR (sender_id = 1 AND receiver_id = u.id)
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message_time,
                (
                    SELECT COUNT(*) FROM messages 
                    WHERE sender_id = u.id AND receiver_id = 1 AND status != 'read'
                ) as unread_count
            FROM users u
            LEFT JOIN rooms r ON u.room_id = r.id
            WHERE u.role = 'tenant'
            ORDER BY last_message_time DESC NULLS LAST
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get Conversations Error:', error);
        res.status(500).json({ message: 'Server error fetching conversations' });
    }
};

// @desc    Get all Messages (Admin Chat)
// @route   GET /api/admin/chat
const getMessages = async (req, res) => {
    try {
        const { tenant_id } = req.query;
        
        if (!tenant_id) {
            return res.status(400).json({ message: 'Tenant ID is required' });
        }

        const query = `
            SELECT * FROM messages 
            WHERE (sender_id = $1 AND receiver_id = 1) 
               OR (sender_id = 1 AND receiver_id = $1)
            ORDER BY created_at ASC
        `;
        const result = await db.query(query, [tenant_id]);
        
        // Mark unread messages from this tenant as read
        await db.query(`
            UPDATE messages 
            SET status = 'read' 
            WHERE sender_id = $1 AND receiver_id = 1 AND status != 'read'
        `, [tenant_id]);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ message: 'Server error fetching messages' });
    }
};

// @desc    Send Message (Admin Chat)
// @route   POST /api/admin/chat
const sendMessage = async (req, res) => {
    try {
        const { message, tenant_id } = req.body;
        
        if (!message || !tenant_id) {
            return res.status(400).json({ message: 'Message and Tenant ID are required' });
        }

        // Assuming admin user ID is 1
        const adminId = 1;

        const query = `
            INSERT INTO messages (sender_id, receiver_id, message, sender_type, status) 
            VALUES ($1, $2, $3, 'admin', 'sent') 
            RETURNING *;
        `;
        const result = await db.query(query, [adminId, tenant_id, message]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ message: 'Server error sending message' });
    }
};

// @desc    Get Unread Messages Count
// @route   GET /api/admin/chat/unread
const getUnreadCount = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT COUNT(*) FROM messages WHERE receiver_id = 1 AND status != 'read'"
        );
        res.status(200).json({ unreadCount: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Unread Count Error:', error);
        res.status(500).json({ message: 'Server error fetching unread count' });
    }
};

// @desc    Get Pending Tenants Count (for Sidebar badge)
// @route   GET /api/admin/tenants/pending-count
const getPendingTenantsCount = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT COUNT(*) FROM users WHERE role = 'tenant' AND status = 'Pending'"
        );
        res.status(200).json({ pendingCount: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Pending Tenants Count Error:', error);
        res.status(500).json({ message: 'Server error fetching pending tenants count' });
    }
};

// @desc    Get Cash Flow Overview
// @route   GET /api/admin/cashflow
const getCashFlowOverview = async (req, res) => {
    try {
        const { range, startDate, endDate } = req.query;
        let start, end;
        const now = new Date();
        
        if (range === 'last_6_months' || !range) {
            start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'last_12_months') {
            start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        } else if (range === 'last_year') {
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
        } else if (range === 'custom') {
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'startDate and endDate required for custom range' });
            }
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            return res.status(400).json({ message: 'Invalid range parameter' });
        }

        const billsQuery = `
            SELECT 
                EXTRACT(YEAR FROM due_date) as year,
                EXTRACT(MONTH FROM due_date) as month,
                SUM(total_amount) as billed,
                SUM(balance) as outstanding
            FROM bills
            WHERE due_date >= $1 AND due_date <= $2
            GROUP BY year, month
            ORDER BY year ASC, month ASC
        `;
        
        const paymentsQuery = `
            SELECT 
                EXTRACT(YEAR FROM payment_date) as year,
                EXTRACT(MONTH FROM payment_date) as month,
                SUM(amount_paid) as collected
            FROM payments
            WHERE payment_date >= $1 AND payment_date <= $2
            GROUP BY year, month
            ORDER BY year ASC, month ASC
        `;

        const [billsResult, paymentsResult] = await Promise.all([
            db.query(billsQuery, [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]),
            db.query(paymentsQuery, [start.toISOString().split('T')[0], end.toISOString().split('T')[0]])
        ]);

        const mergedData = {};
        
        let current = new Date(start);
        current.setDate(1);
        while (current <= end) {
            const y = current.getFullYear();
            const m = current.getMonth() + 1;
            const key = `${y}-${m}`;
            mergedData[key] = {
                year: y,
                month: current.toLocaleString('default', { month: 'short' }),
                monthNumber: m,
                billed: 0,
                collected: 0,
                outstanding: 0
            };
            current.setMonth(current.getMonth() + 1);
        }

        billsResult.rows.forEach(r => {
            const key = `${r.year}-${r.month}`;
            if (mergedData[key]) {
                mergedData[key].billed = parseFloat(r.billed) || 0;
                mergedData[key].outstanding = parseFloat(r.outstanding) || 0;
            }
        });

        paymentsResult.rows.forEach(r => {
            const key = `${r.year}-${r.month}`;
            if (mergedData[key]) {
                mergedData[key].collected = parseFloat(r.collected) || 0;
            }
        });

        const sortedData = Object.values(mergedData).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.monthNumber - b.monthNumber;
        });

        res.status(200).json(sortedData);
    } catch (error) {
        console.error('Get Cash Flow Overview Error:', error);
        res.status(500).json({ message: 'Server error fetching cash flow overview' });
    }
};

module.exports = { 
    getDashboardStats, 
    getAllRooms, 
    createRoom, 
    updateRoom, 
    deleteRoom,
    getAllTenants, 
    getAllPayments, 
    getAllRequests, 
    updateTenant, 
    deleteTenant,
    getConversations,
    getMessages,  
    sendMessage,
    getUnreadCount,
    getPendingTenantsCount,
    getCashFlowOverview
};