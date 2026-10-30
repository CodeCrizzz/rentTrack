const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { ROLES, requireRole } = require('../middleware/rbacMiddleware');
const { 
    getTenantDashboard, getTenantProfile, updateTenantProfile, updateTenantPassword,
    getTenantPayments, getCurrentBill, getTenantGcashQr, submitTenantPayment,
    getTenantMessages, sendTenantMessage, getUnreadCount,
    getTenantRooms, chooseRoom, getAnnouncements,
    getTenantNotifications, markNotificationRead, markAllNotificationsRead
} = require('../controllers/tenantController');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { paymentLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../middleware/sanitize');
const { sqlInjectionProtector } = require('../middleware/sqlInjectionProtector');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/payments');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const fileExt = file.originalname.split('.').pop();
        const tenantId = req.user ? req.user.id : 'unknown';
        cb(null, `${Date.now()}-${tenantId}.${fileExt}`);
    }
});
const upload = multer({ storage: storage });

// All tenant portal endpoints require active authentication and the tenant role
router.use(protect);
router.use(requireRole([ROLES.TENANT]));

router.get('/dashboard', getTenantDashboard);
router.get('/payments', getTenantPayments);
router.post('/payments', paymentLimiter, upload.single('proofOfPayment'), sanitizeInput, sqlInjectionProtector, submitTenantPayment);
router.get('/bill/current', getCurrentBill);
router.get('/gcash-qr', getTenantGcashQr);

router.get('/profile', getTenantProfile);
router.put('/profile', updateTenantProfile);
router.put('/profile/password', updateTenantPassword);

router.get('/rooms', getTenantRooms);
router.post('/rooms/choose', chooseRoom);

router.get('/chat/unread', getUnreadCount);
router.get('/chat', getTenantMessages);
router.post('/chat', sendTenantMessage);

router.get('/notifications', getTenantNotifications);
router.post('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

router.get('/announcements', getAnnouncements);

module.exports = router;