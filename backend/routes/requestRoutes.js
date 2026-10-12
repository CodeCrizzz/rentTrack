const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    createRequest, 
    getMyRequests, 
    getAllRequests, 
    updateRequest,
    cancelRequest,
    deleteRequest
} = require('../controllers/requestController');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/requests');
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

// All request routes require authentication
router.use(protect);

// Tenant Routes
router.post('/', upload.single('attachment'), createRequest);
router.get('/my-requests', getMyRequests);
router.put('/:id/cancel', cancelRequest);

// Admin Routes
router.get('/', getAllRequests);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

module.exports = router;
