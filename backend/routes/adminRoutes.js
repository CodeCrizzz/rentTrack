const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getDashboardStats, getAllTenants, getAllRooms, getAllPayments, 
    getAllRequests, createAdminRequest, updateTenant, deleteTenant,
    getConversations, getMessages, sendMessage, getUnreadCount,
    getPendingTenantsCount,
    createRoom, updateRoom, deleteRoom,
    getCashFlowOverview,
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    getAdminNotifications,
    markAllAdminNotificationsRead,
    markAdminNotificationRead,
    getReportData,
    getActivityLogs
} = require('../controllers/adminController');
const { updateRequest, deleteRequest } = require('../controllers/requestController');

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/cashflow', getCashFlowOverview);

router.get('/tenants', getAllTenants);
router.get('/tenants/pending-count', getPendingTenantsCount);
router.put('/tenants/:id', updateTenant);
router.delete('/tenants/:id', deleteTenant);

router.get('/rooms', getAllRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

router.get('/payments', getAllPayments);
router.get('/requests', getAllRequests);
router.post('/requests', createAdminRequest);
router.put('/requests/:id', updateRequest);
router.delete('/requests/:id', deleteRequest);

router.get('/chat/conversations', getConversations);
router.get('/chat/unread', getUnreadCount);
router.get('/chat', getMessages);
router.post('/chat', sendMessage);

router.get('/notifications', getAdminNotifications);
router.post('/notifications/read-all', markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', markAdminNotificationRead);

router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

router.get('/reports', getReportData);
router.get('/activity-logs', getActivityLogs);

module.exports = router;