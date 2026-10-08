const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getTenantDashboard, getTenantProfile, updateTenantProfile, updateTenantPassword,
    getTenantPayments, getCurrentBill, submitTenantPayment,
    getTenantMessages, sendTenantMessage, getUnreadCount,
    getTenantRooms, chooseRoom, getAnnouncements
} = require('../controllers/tenantController');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

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

router.use(protect);

router.get('/dashboard', getTenantDashboard);
router.get('/payments', getTenantPayments);
router.post('/payments', upload.single('proofOfPayment'), submitTenantPayment);
router.get('/bill/current', getCurrentBill);

router.get('/profile', getTenantProfile);
router.put('/profile', updateTenantProfile);
router.put('/profile/password', updateTenantPassword);

router.get('/rooms', getTenantRooms);
router.post('/rooms/choose', chooseRoom);

router.get('/chat/unread', getUnreadCount);
router.get('/chat', getTenantMessages);
router.post('/chat', sendTenantMessage);

router.get('/announcements', getAnnouncements);

module.exports = router;