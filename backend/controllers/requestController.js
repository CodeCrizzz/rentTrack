const db = require('../config/db');

// @desc    Create a new maintenance request
// @route   POST /api/requests
// @access  Tenant
const createRequest = async (req, res) => {
    try {
        const tenant_id = req.user.id;
        const { title, description, category, priority } = req.body;
        let attachment_url = null;

        if (req.file && req.file.filename) {
            attachment_url = `/uploads/requests/${req.file.filename}`;
        }

        const newRequest = await db.query(
            `INSERT INTO requests (tenant_id, title, description, category, priority, attachment_url) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [tenant_id, title, description, category || 'Other', priority || 'Normal', attachment_url]
        );

        const createdReq = newRequest.rows[0];
        const request_number = `RT${String(createdReq.id).padStart(4, '0')}`;

        res.status(201).json({ 
            message: 'Request submitted successfully', 
            request: { ...createdReq, request_number },
            request_number
        });
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ message: 'Server error while creating request' });
    }
};

// @desc    Get all requests for a specific tenant
// @route   GET /api/requests/my-requests
// @access  Tenant
const getMyRequests = async (req, res) => {
    try {
        const tenant_id = req.user.id;
        const requests = await db.query(
            `SELECT * FROM requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenant_id]
        );
        const rows = requests.rows.map(r => ({
            ...r,
            request_number: `RT${String(r.id).padStart(4, '0')}`
        }));
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching tenant requests:', error);
        res.status(500).json({ message: 'Server error while fetching requests' });
    }
};

// @desc    Get all maintenance requests
// @route   GET /api/requests
// @access  Admin
const getAllRequests = async (req, res) => {
    try {
        const requests = await db.query(`
            SELECT 
                r.id, r.title, r.description, r.category, r.priority, r.status, r.created_at, r.assigned_to, r.admin_notes, r.scheduled_date, r.date_resolved, r.attachment_url,
                u.name as tenant_name,
                rm.room_number
            FROM requests r
            JOIN users u ON r.tenant_id = u.id
            LEFT JOIN rooms rm ON u.room_id = rm.id
            ORDER BY r.created_at DESC
        `);
        const rows = requests.rows.map(r => ({
            ...r,
            request_number: `RT${String(r.id).padStart(4, '0')}`
        }));
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching all requests:', error);
        res.status(500).json({ message: 'Server error while fetching all requests' });
    }
};

// @desc    Update a maintenance request
// @route   PUT /api/requests/:id
// @access  Admin
const updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, assigned_to, admin_notes, scheduled_date, date_resolved } = req.body;

        const reqDb = await db.query('SELECT * FROM requests WHERE id = $1', [id]);
        if (reqDb.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const existing = reqDb.rows[0];

        const updatedRequest = await db.query(
            `UPDATE requests 
             SET status = $1,
                 priority = $2,
                 assigned_to = $3,
                 admin_notes = $4,
                 scheduled_date = $5,
                 date_resolved = $6
             WHERE id = $7 RETURNING *`,
            [
                status !== undefined ? status : existing.status,
                priority !== undefined ? priority : existing.priority,
                assigned_to !== undefined ? assigned_to : existing.assigned_to,
                admin_notes !== undefined ? admin_notes : existing.admin_notes,
                scheduled_date !== undefined ? scheduled_date : existing.scheduled_date,
                date_resolved !== undefined ? date_resolved : existing.date_resolved,
                id
            ]
        );

        const updated = updatedRequest.rows[0];
        const request_number = `RT${String(updated.id).padStart(4, '0')}`;
        res.status(200).json({ 
            message: 'Request updated successfully', 
            request: { ...updated, request_number },
            request_number
        });
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ message: 'Server error while updating request' });
    }
};

// @desc    Cancel a maintenance request
// @route   PUT /api/requests/:id/cancel
// @access  Tenant
const cancelRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant_id = req.user.id;

        // Check if the request exists and belongs to the tenant
        const checkResult = await db.query(
            "SELECT * FROM requests WHERE id = $1 AND tenant_id = $2",
            [id, tenant_id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found or not authorized' });
        }

        const request = checkResult.rows[0];
        if (request.status !== 'Pending') {
            return res.status(400).json({ message: 'Only pending requests can be cancelled' });
        }

        const updatedRequest = await db.query(
            "UPDATE requests SET status = 'Cancelled' WHERE id = $1 RETURNING *",
            [id]
        );

        const cancelled = updatedRequest.rows[0];
        const request_number = `RT${String(cancelled.id).padStart(4, '0')}`;
        res.status(200).json({ 
            message: 'Request cancelled successfully', 
            request: { ...cancelled, request_number },
            request_number
        });
    } catch (error) {
        console.error('Error cancelling request:', error);
        res.status(500).json({ message: 'Server error while cancelling request' });
    }
};

// @desc    Delete a maintenance request
// @route   DELETE /api/requests/:id
// @access  Admin
const deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM requests WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ message: 'Server error while deleting request' });
    }
};

module.exports = {
    createRequest,
    getMyRequests,
    getAllRequests,
    updateRequest,
    cancelRequest,
    deleteRequest
};

