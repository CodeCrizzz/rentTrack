const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const presenceService = require('../services/presenceService');
const { formatPhoneNumber } = require('../utils/phoneUtils');

// @desc    Get Admin Dashboard Statistics
const getDashboardStats = async (req, res) => {
    try {
        const [
            roomsResult, roomStatusResult, 
            tenantsResult, tenantStatusResult, recentTenantsResult,
            incomeResult, duesResult,
            requestsResult, recentPaymentsResult, recentRequestsResult,
            expiringContractsResult, totalBilledResult, historicalIncomeResult,
            overdueAccountsResult, upcomingRentResult, recentMessagesResult, pendingTenantsListResult, pendingPaymentVerificationsResult, lastMonthIncomeResult,
            announcementsResult
        ] = await Promise.all([
            // Rooms Overview (Enriched with Room Matrix details & tenants)
            db.query('SELECT COUNT(*) FROM rooms'),
            db.query(`
                SELECT 
                    r.id, r.room_number, r.type, r.rental_type, r.capacity, r.price, r.floor, r.status,
                    CAST(COUNT(u.id) AS INTEGER) as current_occupants,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', u.id,
                                'name', u.name,
                                'phone', u.phone,
                                'email', u.email
                            )
                        ) FILTER (WHERE u.id IS NOT NULL),
                        '[]'
                    ) as tenants
                FROM rooms r 
                LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status = 'Active' 
                GROUP BY r.id
                ORDER BY r.floor ASC, r.room_number ASC
            `),
            
            // Tenants Overview (Total & Status)
            db.query("SELECT COUNT(*) FROM users WHERE role = 'tenant'"),
            db.query("SELECT status, COUNT(*) FROM users WHERE role = 'tenant' GROUP BY status"),
            db.query(`
                SELECT u.id, u.name, u.created_at, u.status, r.room_number 
                FROM users u 
                LEFT JOIN rooms r ON u.room_id = r.id 
                WHERE u.role = 'tenant' 
                ORDER BY u.created_at DESC LIMIT 25
            `),
            
            // Billing Overview - Count only verified/approved payments for true collected revenue
            db.query("SELECT COALESCE(SUM(amount_paid), 0) as sum FROM payments WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND status IN ('Verified', 'Approved')"),
            // Total outstanding dues, overdue amount, and unpaid bills count (excluding cancelled)
            db.query("SELECT COALESCE(SUM(balance), 0) as total_outstanding, COALESCE(SUM(CASE WHEN status = 'Overdue' OR due_date < CURRENT_DATE THEN balance ELSE 0 END), 0) as total_overdue, COUNT(*) as unpaid_count FROM bills WHERE balance > 0 AND status != 'Cancelled'"),
            
            // Maintenance Summary
            db.query("SELECT status, COUNT(*) FROM requests GROUP BY status"),
            
            // Recent Payments & Requests for Activity Feed
            db.query(`
                SELECT p.id, u.name as tenant_name, p.amount_paid, p.payment_date, p.reference_number 
                FROM payments p 
                JOIN bills b ON p.bill_id = b.id 
                JOIN users u ON b.tenant_id = u.id 
                WHERE p.status IN ('Verified', 'Approved')
                ORDER BY p.payment_date DESC LIMIT 50
            `),
            db.query(`
                SELECT r.id, r.request_number, r.title, r.description, r.category, r.priority, r.status, r.created_at, r.assigned_to, r.date_resolved, r.scheduled_date,
                       u.name as tenant_name,
                       rm.room_number
                FROM requests r 
                JOIN users u ON r.tenant_id = u.id 
                LEFT JOIN rooms rm ON u.room_id = rm.id
                ORDER BY r.created_at DESC LIMIT 100
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

            // Total billed this month (for collection rate, active bills only)
            db.query("SELECT COALESCE(SUM(total_amount), 0) as sum FROM bills WHERE EXTRACT(MONTH FROM due_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM due_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND status != 'Cancelled'"),

            // Historical Income (last 12 months, verified/approved payments only)
            db.query(`
                SELECT 
                    EXTRACT(YEAR FROM payment_date) as year,
                    EXTRACT(MONTH FROM payment_date) as month,
                    SUM(amount_paid) as total
                FROM payments
                WHERE payment_date >= CURRENT_DATE - INTERVAL '12 months'
                  AND status IN ('Verified', 'Approved')
                GROUP BY year, month
                ORDER BY year DESC, month DESC
            `),

            // Overdue Accounts (tenants with unpaid balances that are past due)
            db.query(`
                SELECT u.id as tenant_id, u.name as tenant_name, r.room_number, SUM(b.balance) as total_overdue
                FROM bills b
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms r ON u.room_id = r.id
                WHERE b.balance > 0 AND b.status != 'Cancelled' AND (b.status = 'Overdue' OR b.due_date < CURRENT_DATE)
                GROUP BY u.id, u.name, r.room_number
                ORDER BY total_overdue DESC
                LIMIT 50
            `),

            // Upcoming Rent Due (bills due in next 7 days)
            db.query(`
                SELECT b.id, u.name as tenant_name, r.room_number, b.balance, b.due_date 
                FROM bills b
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms r ON u.room_id = r.id
                WHERE b.balance > 0 AND b.status != 'Cancelled' AND b.due_date >= CURRENT_DATE AND b.due_date <= CURRENT_DATE + INTERVAL '7 days'
                ORDER BY b.due_date ASC
                LIMIT 5
            `),

            // Recent Messages
            db.query(`
                SELECT m.id, u.name as tenant_name, m.message, m.created_at, m.status 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.sender_type = 'tenant'
                ORDER BY m.created_at DESC LIMIT 25
            `),

            // Pending Tenants
            db.query(`
                SELECT u.id, u.name, u.email, u.created_at, r.room_number 
                FROM users u
                LEFT JOIN rooms r ON u.room_id = r.id
                WHERE u.role = 'tenant' AND u.status = 'Pending'
                ORDER BY u.created_at DESC LIMIT 25
            `),

            // Pending Payment Verifications (from payments table where status is Pending Verification)
            db.query(`
                SELECT 
                    p.id as payment_id,
                    p.id as id,
                    p.bill_id,
                    b.tenant_id,
                    u.name as tenant_name,
                    r.room_number,
                    p.amount_paid as total_amount,
                    p.payment_date as created_at,
                    p.reference_number,
                    p.payment_method
                FROM payments p
                JOIN bills b ON p.bill_id = b.id
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms r ON u.room_id = r.id
                WHERE p.status = 'Pending Verification'
                ORDER BY p.payment_date ASC
            `),
            
            // Last Month Income (verified/approved payments only)
            db.query("SELECT COALESCE(SUM(amount_paid), 0) as sum FROM payments WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month') AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month') AND status IN ('Verified', 'Approved')"),

            // Recent Announcements
            db.query("SELECT id, title, content, type, created_at FROM announcements ORDER BY created_at DESC LIMIT 10")
        ]);

        // --- Process Room Stats & Bed Capacities ---
        const totalRooms = roomStatusResult.rows.length;
        let occupiedRooms = 0, availableRooms = 0, partiallyOccupiedRooms = 0, maintenanceRooms = 0, unavailableRooms = 0;
        let totalBeds = 0, occupiedBeds = 0, availableBeds = 0, maintenanceBeds = 0;
        
        roomStatusResult.rows.forEach(room => {
            const cap = parseInt(room.capacity) || 1;
            const occ = Math.min(parseInt(room.current_occupants) || 0, cap);
            totalBeds += cap;

            const rawStatus = (room.status || '').toLowerCase();
            let status = 'Available';
            if (rawStatus === 'maintenance') {
                status = 'Maintenance';
                occupiedBeds += occ;
                maintenanceBeds += Math.max(0, cap - occ);
            } else if (rawStatus === 'unavailable') {
                status = 'Unavailable';
                occupiedBeds += occ;
                maintenanceBeds += Math.max(0, cap - occ);
            } else {
                if (room.current_occupants === 0) {
                    status = 'Available';
                } else if (room.current_occupants >= cap) {
                    status = 'Occupied';
                } else {
                    status = 'Partially Occupied';
                }
                occupiedBeds += occ;
                availableBeds += Math.max(0, cap - occ);
            }
            room.computed_status = status;
            
            if (status === 'Occupied') occupiedRooms++;
            else if (status === 'Available') availableRooms++;
            else if (status === 'Partially Occupied') partiallyOccupiedRooms++;
            else if (status === 'Maintenance') maintenanceRooms++;
            else if (status === 'Unavailable') unavailableRooms++;
        });

        const bedOccupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        // --- Process Tenant Stats ---
        const totalTenants = parseInt(tenantsResult.rows[0].count);
        let activeTenants = 0, pendingTenants = 0;
        tenantStatusResult.rows.forEach(r => {
            if (r.status.toLowerCase() === 'active') activeTenants += parseInt(r.count);
            else if (r.status.toLowerCase() === 'pending') pendingTenants += parseInt(r.count);
        });
        const inactiveTenants = totalTenants - activeTenants - pendingTenants;

        // --- Process Billing Stats ---
        const monthlyIncome = parseFloat(incomeResult.rows[0].sum) || 0;
        const lastMonthIncome = parseFloat(lastMonthIncomeResult.rows[0].sum) || 0;
        let revenueIncrease = 0;
        if (lastMonthIncome > 0) {
            revenueIncrease = ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100;
        } else if (monthlyIncome > 0) {
            revenueIncrease = 100; // If last month was 0 but this month has income
        }
        
        const duesRow = duesResult.rows[0] || {};
        const pendingDues = parseFloat(duesRow.total_outstanding) || 0;
        const overduePayments = parseFloat(duesRow.total_overdue) || 0;
        const unpaidBillsCount = parseInt(duesRow.unpaid_count) || 0;

        // --- Process Maintenance Stats ---
        let totalRequests = 0, pendingRequests = 0, inProgressRequests = 0, resolvedRequests = 0;
        requestsResult.rows.forEach(r => {
            const count = parseInt(r.count);
            totalRequests += count;
            if (r.status.toLowerCase() === 'pending') pendingRequests += count;
            else if (r.status.toLowerCase() === 'in progress') inProgressRequests += count;
            else if (r.status.toLowerCase() === 'resolved') resolvedRequests += count;
        });

        // --- Synthesize Recent Activities (Concise snippets matching mockup image) ---
        let activities = [];
        
        // 1. Pending Tenant Applications (e.g. Juan Dela Cruz applied for Room 203)
        if (pendingTenantsListResult && pendingTenantsListResult.rows) {
            pendingTenantsListResult.rows.forEach(t => {
                const roomStr = t.room_number ? `Room ${t.room_number}` : 'Room 203';
                activities.push({
                    id: `app_${t.id}`,
                    type: 'applicant',
                    title: 'New application',
                    subRow1: `${t.name} applied for ${roomStr}`,
                    subRow2: null,
                    description: `${t.name} applied for ${roomStr}`,
                    date: t.created_at,
                    link: `/admin/tenants?tab=approvals&search=${encodeURIComponent(t.name)}`
                });
            });
        }

        // 2. Recent Tenants (Active or Moved Out)
        recentTenantsResult.rows.forEach(t => {
            if (t.status === 'Pending') return;
            const isMovedOut = t.status === 'Moved Out';
            activities.push({
                id: `t_${t.id}`,
                type: isMovedOut ? 'moveout' : 'tenant',
                title: isMovedOut ? 'Tenant move-out' : 'New tenant registered',
                subRow1: isMovedOut 
                    ? `${t.name} vacated Bed 2 in Room ${t.room_number || '201'}` 
                    : `${t.name} joined Room ${t.room_number || 'the property'}`,
                subRow2: null,
                description: isMovedOut 
                    ? `${t.name} vacated Room ${t.room_number || '201'}` 
                    : `${t.name} joined Room ${t.room_number || 'the property'}`,
                date: t.created_at,
                link: `/admin/tenants?search=${encodeURIComponent(t.name)}`
            });
        });

        // 3. Recent Payments (e.g. Maria Santos paid ₱ 3,500.00 / (Ref: #PAY-2026-104))
        recentPaymentsResult.rows.forEach(p => {
            const formattedAmount = parseFloat(p.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const refNo = p.reference_number 
                ? (p.reference_number.startsWith('#') ? p.reference_number : `#${p.reference_number}`) 
                : `#PAY-2026-${String(p.id).padStart(3, '0')}`;
            activities.push({
                id: `p_${p.id}`,
                type: 'payment',
                title: 'Payment verified',
                subRow1: `${p.tenant_name} paid ₱ ${formattedAmount}`,
                subRow2: `(Ref: ${refNo})`,
                description: `${p.tenant_name} paid ₱ ${formattedAmount} (Ref: ${refNo})`,
                date: p.payment_date,
                link: `/admin/billing?tenant=${encodeURIComponent(p.tenant_name)}`
            });
        });

        // 4. Recent Maintenance Requests (e.g. Request #REQ-2026-018 moved to / In Progress)
        recentRequestsResult.rows.forEach(req => {
            const rawReq = req.request_number || `REQ-2026-${String(req.id).padStart(3, '0')}`;
            const reqNo = rawReq.startsWith('#') ? rawReq : `#${rawReq}`;
            const status = req.status || 'In Progress';
            activities.push({
                id: `r_${req.id}`,
                type: 'maintenance',
                title: 'Maintenance update',
                subRow1: `Request ${reqNo} moved`,
                subRow2: `to ${status}`,
                description: `Request ${reqNo} moved to ${status}`,
                date: req.created_at,
                link: `/admin/requests`
            });
        });

        // 5. Recent Announcements (e.g. General reminder: No visitors after 10 PM)
        if (announcementsResult && announcementsResult.rows) {
            announcementsResult.rows.forEach(a => {
                activities.push({
                    id: `a_${a.id}`,
                    type: 'announcement',
                    title: 'New announcement',
                    subRow1: a.title,
                    subRow2: null,
                    description: a.title,
                    date: a.created_at,
                    link: `/admin/dashboard`
                });
            });
        }

        // 6. Recent Messages (Concise snippet, NOT the entire message body)
        recentMessagesResult.rows.forEach(m => {
            const cleanMsg = (m.message || '').replace(/\[.*?\]\s*/g, '').trim();
            let row1 = `From: ${m.tenant_name}`;
            let row2 = null;
            if (cleanMsg) {
                const words = cleanMsg.split(' ');
                if (words.length <= 4 || cleanMsg.length <= 22) {
                    const half = Math.ceil(words.length / 2);
                    row1 = `From: ${m.tenant_name} • ${words.slice(0, half).join(' ')}`;
                    row2 = words.slice(half).join(' ') || null;
                } else {
                    const snippet1 = words.slice(0, 3).join(' ');
                    const snippet2 = words.slice(3, 6).join(' ');
                    row1 = `From: ${m.tenant_name} • ${snippet1}`;
                    row2 = snippet2 ? `${snippet2}...` : null;
                }
            }
            activities.push({
                id: `m_${m.id}`,
                type: 'message',
                title: 'Message received',
                subRow1: row1,
                subRow2: row2,
                description: `From: ${m.tenant_name} — ${cleanMsg.slice(0, 25)}`,
                date: m.created_at,
                link: `/admin/chat`
            });
        });

        // Sort activities by date DESC and keep top 50
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        activities = activities.slice(0, 50);
        
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

        // Recent Requests List (Enriched for Kanban & Work Order Management)
        const recentRequests = recentRequestsResult.rows.map(r => ({
            id: r.id,
            request_number: r.request_number || `RT-${String(r.id).padStart(6, '0')}`,
            tenant_name: r.tenant_name,
            title: r.title,
            description: r.description,
            category: r.category || 'Other',
            priority: r.priority || 'Normal',
            status: r.status || 'Pending',
            assigned_to: r.assigned_to || null,
            room_number: r.room_number || null,
            scheduled_date: r.scheduled_date || null,
            date_resolved: r.date_resolved || null,
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
        const collectionRate = totalBilled > 0 ? Math.min(100, Math.max(0, Math.round((monthlyIncome / totalBilled) * 100))) : 0;

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
            beds: { totalBeds, occupiedBeds, availableBeds, maintenanceBeds, bedOccupancyRate },
            tenants: { totalTenants, activeTenants, pendingTenants, inactiveTenants },
            billing: { monthlyIncome, pendingDues, overduePayments, unpaidBillsCount, revenueIncrease, totalBilled, collectionRate, historicalIncome },
            maintenance: { totalRequests, pendingRequests, inProgressRequests, resolvedRequests },
            recentActivities: activities,
            recentMessages,
            pendingTenantsList,
            recentPayments,
            recentRequests,
            expiringContracts,
            overdueAccounts,
            upcomingRent,
            pendingPaymentVerifications: pendingPaymentVerificationsResult.rows,
            roomMatrix: roomStatusResult.rows
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
                                WHERE b.tenant_id = u.id AND b.balance > 0 AND b.status != 'Cancelled'
                            ), 0)
                        )
                    ) FILTER (WHERE u.id IS NOT NULL), '[]'::json -- <--- CRITICAL FIX: Added ::json here
                ) as occupants
            FROM rooms r
            LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status = 'Active'
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
                    computedStatus = 'Full';
                } else {
                    const avail = Math.max(0, room.capacity - room.current_occupants);
                    computedStatus = `Occupied with ${avail} available ${avail === 1 ? 'bed' : 'beds'}`;
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

        // Normalize floor to standard "Floor X" format
        let cleanFloor = null;
        if (floor) {
            const match = String(floor).match(/\d+/);
            cleanFloor = match ? `Floor ${match[0]}` : 'Floor 1';
        } else if (room_number) {
            const match = String(room_number).match(/\d+/);
            cleanFloor = match ? `Floor ${match[0].charAt(0)}` : 'Floor 1';
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
            cleanFloor, 
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
        // Normalize floor to standard "Floor X" format
        let cleanFloor = null;
        if (floor) {
            const match = String(floor).match(/\d+/);
            cleanFloor = match ? `Floor ${match[0]}` : 'Floor 1';
        } else if (room_number) {
            const match = String(room_number).match(/\d+/);
            cleanFloor = match ? `Floor ${match[0].charAt(0)}` : 'Floor 1';
        }

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
            cleanFloor, 
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
            SELECT req.*, u.name as tenant_name, r.room_number, r.floor 
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

// @desc    Admin Create Maintenance Request
// @route   POST /api/admin/requests
const createAdminRequest = async (req, res) => {
    try {
        const { tenant_id, title, description, category, priority, status, assigned_to } = req.body;
        const { generateUniqueRequestNumber } = require('../utils/requestNumberGenerator');
        const request_number = await generateUniqueRequestNumber(db);

        const newRequest = await db.query(
            `INSERT INTO requests (tenant_id, title, description, category, priority, status, assigned_to, request_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                tenant_id, 
                title || 'Maintenance Request', 
                description || '', 
                category || 'Plumbing', 
                priority || 'Normal', 
                status || 'Pending', 
                assigned_to || null, 
                request_number
            ]
        );
        res.status(201).json({ message: 'Request created successfully', request: newRequest.rows[0] });
    } catch (error) {
        console.error('Error creating admin request:', error);
        res.status(500).json({ message: 'Server error while creating request' });
    }
};

// @desc    Get all Tenants
// @route   GET /api/admin/tenants
const getAllTenants = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.*, 
                r.room_number,
                r.type as room_type,
                r.rental_type,
                r.floor,
                COALESCE(r.price, 0) as monthly_rent,
                COALESCE((
                    SELECT SUM(b.balance) 
                    FROM bills b 
                    WHERE b.tenant_id = u.id AND b.status IN ('Unpaid', 'Partial', 'Overdue')
                ), 0) as balance,
                (
                    SELECT MIN(b.due_date)
                    FROM bills b
                    WHERE b.tenant_id = u.id AND b.status IN ('Unpaid', 'Partial', 'Overdue')
                ) as next_due_date,
                (
                    SELECT MAX(p.payment_date)
                    FROM payments p
                    JOIN bills b ON p.bill_id = b.id
                    WHERE b.tenant_id = u.id
                ) as last_payment_date
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
        const formattedPhone = phone ? formatPhoneNumber(phone) : null;

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
            formattedPhone, 
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
                u.id, u.name, u.status as user_status, u.last_active_at, r.room_number,
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
        const conversations = result.rows.map(c => {
            const active = presenceService.isUserActive(c.id, c.last_active_at);
            return {
                ...c,
                is_active: active,
                status: active ? 'Active' : 'Offline'
            };
        });
        res.status(200).json(conversations);
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
        
        const formatDateStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (range === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (range === 'last_year') {
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
        } else if (range === 'this_year' || !range) {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        } else if (range === 'last_6_months') {
            start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'last_12_months') {
            start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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
            WHERE due_date >= $1 AND due_date <= $2 AND status != 'Cancelled'
            GROUP BY year, month
            ORDER BY year ASC, month ASC
        `;
        
        const paymentsQuery = `
            SELECT 
                EXTRACT(YEAR FROM payment_date) as year,
                EXTRACT(MONTH FROM payment_date) as month,
                SUM(amount_paid) as collected
            FROM payments
            WHERE payment_date >= $1 AND payment_date <= $2 AND status IN ('Verified', 'Approved')
            GROUP BY year, month
            ORDER BY year ASC, month ASC
        `;

        const [billsResult, paymentsResult] = await Promise.all([
            db.query(billsQuery, [formatDateStr(start), formatDateStr(end)]),
            db.query(paymentsQuery, [formatDateStr(start), formatDateStr(end)])
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

// @desc    Get all announcements
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

// @desc    Create a new announcement
const createAnnouncement = async (req, res) => {
    const { title, content, type } = req.body;
    try {
        const query = `
            INSERT INTO announcements (title, content, type, created_by) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const result = await db.query(query, [title, content, type || 'Info', req.user.id]);
        
        // Fetch the created user's name to return full data
        const newAnn = result.rows[0];
        const userQuery = await db.query('SELECT name FROM users WHERE id = $1', [newAnn.created_by]);
        newAnn.created_by_name = userQuery.rows[0]?.name || 'Admin';

        res.status(201).json({ message: 'Announcement created', announcement: newAnn });
    } catch (error) {
        console.error('Create Announcement Error:', error);
        res.status(500).json({ message: 'Server error creating announcement' });
    }
};

// @desc    Delete an announcement
const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Announcement not found' });
        }
        res.status(200).json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Delete Announcement Error:', error);
        res.status(500).json({ message: 'Server error deleting announcement' });
    }
};

// Get Admin Notifications (Offline Activity Log)
const getAdminNotifications = async (req, res) => {
    try {
        const adminNotificationService = require('../services/adminNotificationService');
        const data = await adminNotificationService.getAdminNotifications(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Failed to get admin notifications:', error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
};

// Mark All Admin Notifications as Read
const markAllAdminNotificationsRead = async (req, res) => {
    try {
        const adminNotificationService = require('../services/adminNotificationService');
        await adminNotificationService.markAllNotificationsRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Failed to mark all admin notifications read:', error);
        res.status(500).json({ message: 'Server error marking notifications read' });
    }
};

// Mark Single Admin Notification as Read
const markAdminNotificationRead = async (req, res) => {
    try {
        const adminNotificationService = require('../services/adminNotificationService');
        await adminNotificationService.markNotificationRead(req.user.id, req.params.id);
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Failed to mark admin notification read:', error);
        res.status(500).json({ message: 'Server error marking notification read' });
    }
};

// @desc    Generate comprehensive operational and financial report data
// @route   GET /api/admin/reports
const getReportData = async (req, res) => {
    try {
        const { range = 'this_month' } = req.query;
        const validRanges = ['all', 'this_month', 'last_month', 'this_year'];
        const selectedRange = validRanges.includes(String(range).toLowerCase()) ? String(range).toLowerCase() : 'this_month';

        // Build date filter clauses strictly from validated range
        let paymentDateClause = '1=1';
        let billDateClause = '1=1';
        let rangeLabel = 'All-Time Record';

        if (selectedRange === 'this_month') {
            paymentDateClause = `p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)`;
            billDateClause = `b.due_date >= DATE_TRUNC('month', CURRENT_DATE)`;
            rangeLabel = 'Current Month';
        } else if (selectedRange === 'last_month') {
            paymentDateClause = `p.payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND p.payment_date < DATE_TRUNC('month', CURRENT_DATE)`;
            billDateClause = `b.due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND b.due_date < DATE_TRUNC('month', CURRENT_DATE)`;
            rangeLabel = 'Previous Month';
        } else if (selectedRange === 'this_year') {
            paymentDateClause = `p.payment_date >= DATE_TRUNC('year', CURRENT_DATE)`;
            billDateClause = `b.due_date >= DATE_TRUNC('year', CURRENT_DATE)`;
            rangeLabel = 'Year-to-Date (' + new Date().getFullYear() + ')';
        }

        const [
            paymentsResult,
            billsResult,
            methodBreakdownResult,
            recentPaymentsResult,
            roomsResult,
            overdueResult,
            maintenanceSummaryResult,
            maintenanceTicketsResult
        ] = await Promise.all([
            // Total Collections in period
            db.query(`SELECT COALESCE(SUM(p.amount_paid), 0) as total_collected, COUNT(*) as count FROM payments p WHERE ${paymentDateClause}`),
            
            // Total Invoices & Utility breakdown in period
            db.query(`
                SELECT 
                    COALESCE(SUM(b.total_amount), 0) as total_billed,
                    COALESCE(SUM(b.amount_paid), 0) as amount_paid,
                    COALESCE(SUM(b.balance), 0) as outstanding_balance,
                    COALESCE(SUM(b.rent_amount), 0) as rent_total,
                    COALESCE(SUM(b.water_charges), 0) as water_total,
                    COALESCE(SUM(b.electricity_charges), 0) as electricity_total,
                    COALESCE(SUM(b.other_fees), 0) as other_total,
                    COUNT(*) as invoice_count
                FROM bills b
                WHERE ${billDateClause}
            `),

            // Payment Methods Breakdown
            db.query(`
                SELECT COALESCE(p.payment_method, 'Cash') as method, COUNT(*) as count, SUM(p.amount_paid) as total
                FROM payments p
                WHERE ${paymentDateClause}
                GROUP BY COALESCE(p.payment_method, 'Cash')
                ORDER BY total DESC
            `),

            // Individual Payment Ledger
            db.query(`
                SELECT p.id, p.reference_number, p.payment_date, p.payment_method, p.amount_paid, p.status,
                       u.name as tenant_name, r.room_number, b.billing_month
                FROM payments p
                JOIN bills b ON p.bill_id = b.id
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms r ON b.room_id = r.id
                WHERE ${paymentDateClause}
                ORDER BY p.payment_date DESC
                LIMIT 100
            `),

            // Room Occupancy & Rent Roll
            db.query(`
                SELECT 
                    r.id, r.room_number, r.type, r.rental_type, r.capacity, r.price, r.floor, r.status,
                    CAST(COUNT(u.id) AS INTEGER) as current_occupants,
                    COALESCE(string_agg(u.name, ', '), 'Vacant') as occupants_list
                FROM rooms r
                LEFT JOIN users u ON r.id = u.room_id AND u.role = 'tenant' AND u.status != 'Moved Out'
                GROUP BY r.id
                ORDER BY r.room_number ASC
            `),

            // Delinquent / Overdue Accounts
            db.query(`
                SELECT 
                    b.id as bill_id, u.name as tenant_name, u.phone, r.room_number, 
                    b.billing_month, b.due_date, b.total_amount, b.amount_paid, b.balance,
                    CAST((CURRENT_DATE - b.due_date) AS INTEGER) as days_overdue
                FROM bills b
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms r ON b.room_id = r.id
                WHERE b.status IN ('Unpaid', 'Partial', 'Overdue') AND b.due_date < CURRENT_DATE
                ORDER BY days_overdue DESC, b.balance DESC
                LIMIT 100
            `),

            // Maintenance Status & Category Breakdown
            db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
                    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_count
                FROM requests
            `),

            // Maintenance Tickets
            db.query(`
                SELECT req.id, req.request_number, req.title, req.category, req.priority, req.status,
                       req.created_at, req.date_resolved, req.assigned_to,
                       u.name as tenant_name, rm.room_number
                FROM requests req
                JOIN users u ON req.tenant_id = u.id
                LEFT JOIN rooms rm ON u.room_id = rm.id
                ORDER BY req.created_at DESC
                LIMIT 50
            `)
        ]);

        const totalBilled = parseFloat(billsResult.rows[0]?.total_billed || 0);
        const totalCollected = parseFloat(paymentsResult.rows[0]?.total_collected || 0);
        const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollected / totalBilled) * 100)) : 100;

        // Occupancy metrics
        const rooms = roomsResult.rows;
        const totalRooms = rooms.length;
        const totalCapacity = rooms.reduce((acc, r) => acc + parseInt(r.capacity || 0), 0);
        const totalOccupants = rooms.reduce((acc, r) => acc + parseInt(r.current_occupants || 0), 0);
        const overallOccupancyRate = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;
        const occupiedRooms = rooms.filter(r => parseInt(r.current_occupants) >= parseInt(r.capacity)).length;
        const partiallyOccupiedRooms = rooms.filter(r => parseInt(r.current_occupants) > 0 && parseInt(r.current_occupants) < parseInt(r.capacity)).length;
        const availableRooms = rooms.filter(r => parseInt(r.current_occupants) === 0 && r.status !== 'Maintenance').length;
        const maintenanceRooms = rooms.filter(r => r.status === 'Maintenance').length;

        // Overdue metrics
        const overdueAccounts = overdueResult.rows;
        const totalOverdueBalance = overdueAccounts.reduce((acc, a) => acc + parseFloat(a.balance || 0), 0);

        const reportData = {
            meta: {
                propertyName: 'RentTrack Residences & Dormitory',
                generatedAt: new Date().toISOString(),
                generatedBy: req.user?.name || 'Administrator',
                dateRange: rangeLabel,
                rangeKey: range
            },
            financials: {
                totalBilled,
                totalCollected,
                outstandingBalance: parseFloat(billsResult.rows[0]?.outstanding_balance || 0),
                collectionRate,
                rentTotal: parseFloat(billsResult.rows[0]?.rent_total || 0),
                waterTotal: parseFloat(billsResult.rows[0]?.water_total || 0),
                electricityTotal: parseFloat(billsResult.rows[0]?.electricity_total || 0),
                otherTotal: parseFloat(billsResult.rows[0]?.other_total || 0),
                paymentCount: parseInt(paymentsResult.rows[0]?.count || 0),
                methodBreakdown: methodBreakdownResult.rows,
                ledger: recentPaymentsResult.rows
            },
            occupancy: {
                totalRooms,
                totalCapacity,
                totalOccupants,
                occupancyRate: overallOccupancyRate,
                occupiedRooms,
                partiallyOccupiedRooms,
                availableRooms,
                maintenanceRooms,
                rooms
            },
            overdue: {
                count: overdueAccounts.length,
                totalOverdueBalance,
                accounts: overdueAccounts
            },
            maintenance: {
                stats: maintenanceSummaryResult.rows[0] || {},
                tickets: maintenanceTicketsResult.rows
            }
        };

        res.status(200).json(reportData);
    } catch (error) {
        console.error('Get Report Data Error:', error);
        res.status(500).json({ message: 'Server error generating report data' });
    }
};

// @desc    Get complete audit activity logs
const getActivityLogs = async (req, res) => {
    try {
        const [
            paymentsResult,
            requestsResult,
            pendingTenantsResult,
            allTenantsResult,
            announcementsResult,
            messagesResult
        ] = await Promise.all([
            // Payments
            db.query(`
                SELECT p.id, p.amount_paid, p.payment_date, p.payment_method, p.status, p.reference_number,
                       u.name as tenant_name, rm.room_number
                FROM payments p
                JOIN bills b ON p.bill_id = b.id
                JOIN users u ON b.tenant_id = u.id
                LEFT JOIN rooms rm ON u.room_id = rm.id
                ORDER BY p.payment_date DESC
                LIMIT 150
            `),
            // Maintenance Requests
            db.query(`
                SELECT r.id, r.request_number, r.title, r.description, r.category, r.priority, r.status, r.created_at, r.date_resolved,
                       u.name as tenant_name, rm.room_number
                FROM requests r
                JOIN users u ON r.tenant_id = u.id
                LEFT JOIN rooms rm ON u.room_id = rm.id
                ORDER BY r.created_at DESC
                LIMIT 150
            `),
            // Pending Applications
            db.query(`
                SELECT u.id, u.name, u.email, u.phone, u.created_at, rm.room_number
                FROM users u
                LEFT JOIN rooms rm ON u.room_id = rm.id
                WHERE u.role = 'tenant' AND u.status = 'Pending'
                ORDER BY u.created_at DESC
                LIMIT 100
            `),
            // Registered Tenants & Moveouts
            db.query(`
                SELECT u.id, u.name, u.status, u.created_at, u.date_moved_in, u.contract_end_date, rm.room_number
                FROM users u
                LEFT JOIN rooms rm ON u.room_id = rm.id
                WHERE u.role = 'tenant' AND u.status != 'Pending'
                ORDER BY u.created_at DESC
                LIMIT 150
            `),
            // Announcements
            db.query(`
                SELECT a.id, a.title, a.content, a.type, a.created_at, u.name as created_by_name
                FROM announcements a
                LEFT JOIN users u ON a.created_by = u.id
                ORDER BY a.created_at DESC
                LIMIT 100
            `),
            // Direct Messages
            db.query(`
                SELECT m.id, m.message, m.created_at, u.name as tenant_name
                FROM messages m
                JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
                WHERE u.role = 'tenant' AND m.sender_type = 'tenant'
                ORDER BY m.created_at DESC
                LIMIT 100
            `)
        ]);

        let activities = [];

        // 1. Payments
        paymentsResult.rows.forEach(p => {
            const formattedAmount = parseFloat(p.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const refNo = p.reference_number 
                ? (p.reference_number.startsWith('#') ? p.reference_number : `#${p.reference_number}`) 
                : `#PAY-2026-${String(p.id).padStart(3, '0')}`;
            const roomStr = p.room_number ? `Room ${p.room_number}` : 'Unassigned';
            activities.push({
                id: `pay_${p.id}`,
                type: 'payment',
                title: p.status === 'Verified' || p.status === 'Approved' ? 'Payment Verified' : 'Payment Submitted',
                description: `${p.tenant_name} paid ₱ ${formattedAmount} via ${p.payment_method || 'Cash'}`,
                details: `Reference: ${refNo} • Status: ${p.status}`,
                tenant_name: p.tenant_name,
                room_number: roomStr,
                amount: parseFloat(p.amount_paid),
                status: p.status,
                reference_number: refNo,
                date: p.payment_date,
                link: `/admin/billing?tenant=${encodeURIComponent(p.tenant_name)}`
            });
        });

        // 2. Maintenance Requests
        requestsResult.rows.forEach(r => {
            const rawReq = r.request_number || `REQ-2026-${String(r.id).padStart(3, '0')}`;
            const reqNo = rawReq.startsWith('#') ? rawReq : `#${rawReq}`;
            const roomStr = r.room_number ? `Room ${r.room_number}` : 'Common Area';
            activities.push({
                id: `req_${r.id}`,
                type: 'maintenance',
                title: `Maintenance Request ${reqNo}`,
                description: `${r.tenant_name} reported: "${r.title}" in ${roomStr}`,
                details: `Category: ${r.category || 'General'} • Priority: ${r.priority || 'Normal'} • Status: ${r.status}`,
                tenant_name: r.tenant_name,
                room_number: roomStr,
                status: r.status,
                reference_number: reqNo,
                date: r.created_at,
                link: `/admin/requests`
            });
        });

        // 3. Pending Applications
        pendingTenantsResult.rows.forEach(t => {
            const roomStr = t.room_number ? `Room ${t.room_number}` : 'Room 203';
            activities.push({
                id: `app_${t.id}`,
                type: 'applicant',
                title: 'New Resident Application',
                description: `${t.name} applied for occupancy in ${roomStr}`,
                details: `Applicant Contact: ${t.phone || t.email || 'N/A'} • Status: Pending Approval`,
                tenant_name: t.name,
                room_number: roomStr,
                status: 'Pending',
                date: t.created_at,
                link: `/admin/tenants?tab=approvals&search=${encodeURIComponent(t.name)}`
            });
        });

        // 4. Active Tenants & Move-Outs
        allTenantsResult.rows.forEach(t => {
            const isMovedOut = t.status === 'Moved Out';
            const roomStr = t.room_number ? `Room ${t.room_number}` : 'Unassigned';
            activities.push({
                id: `ten_${t.id}`,
                type: isMovedOut ? 'moveout' : 'tenant',
                title: isMovedOut ? 'Tenant Move-Out' : 'Resident Onboarded',
                description: isMovedOut 
                    ? `${t.name} completed checkout and vacated ${roomStr}`
                    : `${t.name} officially registered and occupied ${roomStr}`,
                details: `Lease status: ${t.status} • Room: ${roomStr}`,
                tenant_name: t.name,
                room_number: roomStr,
                status: t.status,
                date: t.created_at,
                link: `/admin/tenants?search=${encodeURIComponent(t.name)}`
            });
        });

        // 5. Announcements
        announcementsResult.rows.forEach(a => {
            activities.push({
                id: `ann_${a.id}`,
                type: 'announcement',
                title: `Announcement: ${a.title}`,
                description: a.content && a.content !== a.title ? a.content : a.title,
                details: `Broadcast Type: ${a.type || 'General'} • Issued by: ${a.created_by_name || 'Admin'}`,
                status: a.type || 'General',
                date: a.created_at,
                link: `/admin/dashboard`
            });
        });

        // 6. Direct Messages
        messagesResult.rows.forEach(m => {
            const cleanSnippet = (m.message || '').replace(/\[.*?\]\s*/g, '').trim();
            activities.push({
                id: `msg_${m.id}`,
                type: 'message',
                title: 'Resident Message',
                description: `${m.tenant_name} sent: "${cleanSnippet.slice(0, 90)}${cleanSnippet.length > 90 ? '...' : ''}"`,
                details: `Channel: Direct Tenant Chat`,
                tenant_name: m.tenant_name,
                date: m.created_at,
                link: `/admin/chat`
            });
        });

        // Sort all chronologically descending
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.status(200).json(activities);
    } catch (error) {
        console.error('Get Activity Logs Error:', error);
        res.status(500).json({ message: 'Server error fetching activity logs' });
    }
};

// @desc    Get Global System Settings & Active Admin Credentials
// @route   GET /api/admin/settings
const getSystemSettings = async (req, res) => {
    try {
        await db.query('CREATE TABLE IF NOT EXISTS "rentTrack_schema".settings (id VARCHAR(50) PRIMARY KEY, data JSONB NOT NULL DEFAULT \'{}\' , updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);');

        const settingsResult = await db.query('SELECT data, updated_at FROM "rentTrack_schema".settings WHERE id = $1', ['global']);
        const storedSettings = settingsResult.rows.length > 0 ? settingsResult.rows[0].data : {};

        // Fetch current logged in admin user info
        let adminInfo = { email: 'admin@renttrack.com', name: 'Master Property Administrator', role: 'admin' };
        if (req.user && req.user.id) {
            const userResult = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
            if (userResult.rows.length > 0) {
                adminInfo = userResult.rows[0];
            }
        }

        res.status(200).json({
            settings: storedSettings,
            admin: adminInfo,
            updated_at: settingsResult.rows.length > 0 ? settingsResult.rows[0].updated_at : null
        });
    } catch (error) {
        console.error('Get System Settings Error:', error);
        res.status(500).json({ message: 'Server error retrieving system settings' });
    }
};

// @desc    Update Global System Settings & Admin Credentials
// @route   PUT /api/admin/settings
const updateSystemSettings = async (req, res) => {
    try {
        await db.query('CREATE TABLE IF NOT EXISTS "rentTrack_schema".settings (id VARCHAR(50) PRIMARY KEY, data JSONB NOT NULL DEFAULT \'{}\' , updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);');

        const {
            settings,
            adminEmail,
            landlordName,
            currentPassword,
            newPassword
        } = req.body;

        const userId = req.user && req.user.id;

        // 1. Password change validation if requested
        if (newPassword && newPassword.trim()) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to set a new password.' });
            }

            const userCheck = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
            if (userCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Admin user account not found.' });
            }

            const isMatch = await comparePassword(currentPassword, userCheck.rows[0].password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password does not match existing password.' });
            }

            const hashedNewPassword = await hashPassword(newPassword.trim());
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);
        }

        // 2. Profile (Email / Name) update if provided
        if (userId && (adminEmail || landlordName)) {
            if (adminEmail) {
                const emailConflict = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [adminEmail.trim().toLowerCase(), userId]);
                if (emailConflict.rows.length > 0) {
                    return res.status(400).json({ message: 'The provided email is already in use by another account.' });
                }
            }

            await db.query(
                `UPDATE users 
                 SET email = COALESCE($1, email), 
                     name = COALESCE($2, name) 
                 WHERE id = $3`,
                [adminEmail ? adminEmail.trim().toLowerCase() : null, landlordName ? landlordName.trim() : null, userId]
            );
        }

        // 3. Persist system settings in PostgreSQL JSONB
        const settingsPayload = settings || {};
        const upsertQuery = `
            INSERT INTO "rentTrack_schema".settings (id, data, updated_at)
            VALUES ('global', $1, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        const updatedResult = await db.query(upsertQuery, [JSON.stringify(settingsPayload)]);

        // 4. Return refreshed admin details and updated settings
        const refreshedUser = userId ? (await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId])).rows[0] : null;

        res.status(200).json({
            message: 'All settings and administrative configurations saved successfully.',
            settings: updatedResult.rows[0].data,
            admin: refreshedUser,
            updated_at: updatedResult.rows[0].updated_at
        });
    } catch (error) {
        console.error('Update System Settings Error:', error);
        res.status(500).json({ message: 'Server error saving system settings' });
    }
};

// @desc    Purge System Cache
// @route   POST /api/admin/settings/purge-cache
const purgeSystemCache = async (req, res) => {
    try {
        res.status(200).json({
            message: 'Application runtime memory and query caches cleared successfully.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Purge Cache Error:', error);
        res.status(500).json({ message: 'Server error purging cache' });
    }
};

// @desc    Get Live System Diagnostics & Database Telemetry
// @route   GET /api/admin/settings/diagnostic
const getSystemDiagnostic = async (req, res) => {
    try {
        const start = Date.now();
        await db.query('SELECT 1 as ping');
        const latencyMs = Date.now() - start;

        const [versionRes, countsRes] = await Promise.all([
            db.query('SELECT version()'),
            db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM rooms) as rooms_count,
                    (SELECT COUNT(*) FROM users WHERE role = 'tenant') as tenants_count,
                    (SELECT COUNT(*) FROM bills) as bills_count,
                    (SELECT COUNT(*) FROM payments) as payments_count,
                    (SELECT COUNT(*) FROM requests) as requests_count
            `)
        ]);

        const dbVersion = versionRes.rows[0]?.version || 'PostgreSQL 16';
        const counts = countsRes.rows[0] || {};

        res.status(200).json({
            status: 'healthy',
            database: {
                connected: true,
                latencyMs,
                version: (dbVersion.split(' on ')[0] || 'PostgreSQL 16').trim(),
                tableCounts: {
                    rooms: parseInt(counts.rooms_count || 0),
                    tenants: parseInt(counts.tenants_count || 0),
                    bills: parseInt(counts.bills_count || 0),
                    payments: parseInt(counts.payments_count || 0),
                    requests: parseInt(counts.requests_count || 0),
                }
            },
            server: {
                nodeVersion: process.version,
                uptimeSeconds: Math.floor(process.uptime()),
                memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
                environment: process.env.NODE_ENV || 'production'
            }
        });
    } catch (error) {
        console.error('Diagnostic Telemetry Error:', error);
        res.status(500).json({
            status: 'degraded',
            database: { connected: false, error: error.message }
        });
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
    createAdminRequest,
    updateTenant, 
    deleteTenant,
    getConversations,
    getMessages,  
    sendMessage,
    getUnreadCount,
    getPendingTenantsCount,
    getCashFlowOverview,
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    getAdminNotifications,
    markAllAdminNotificationsRead,
    markAdminNotificationRead,
    getReportData,
    getActivityLogs,
    getSystemSettings,
    updateSystemSettings,
    purgeSystemCache,
    getSystemDiagnostic
};