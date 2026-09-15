const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getDashboardStats, getAllTenants, getAllRooms, getAllPayments, 
    getAllRequests, updateTenant, deleteTenant,
    getConversations, getMessages, sendMessage, getUnreadCount,
    getPendingTenantsCount,
    createRoom, updateRoom, deleteRoom,
    getCashFlowOverview
} = require('../controllers/adminController');

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

router.get('/chat/conversations', getConversations);
router.get('/chat/unread', getUnreadCount);
router.get('/chat', getMessages);
router.post('/chat', sendMessage);

module.exports = router;