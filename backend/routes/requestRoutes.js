const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    ROLES, 
    PERMISSIONS, 
    requireRole, 
    hasPermission, 
    enforceOwnership 
} = require('../middleware/rbacMiddleware');

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

const { requestLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput } = require('../middleware/sanitize');
const { sqlInjectionProtector } = require('../middleware/sqlInjectionProtector');

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

// All request routes require active authentication
router.use(protect);

// ==========================================
// Tenant Least-Privilege Scoped Routes
// ==========================================
router.post(
    '/', 
    requireRole([ROLES.TENANT, ROLES.ADMIN]), 
    requestLimiter, 
    upload.single('attachment'), 
    sanitizeInput, 
    sqlInjectionProtector, 
    createRequest
);

router.get(
    '/my-requests', 
    requireRole([ROLES.TENANT]), 
    getMyRequests
);

// Least Privilege Enforcement: Verify tenant ownership of request before allowing cancellation
router.put(
    '/:id/cancel', 
    requireRole([ROLES.TENANT]), 
    enforceOwnership({ table: 'requests', ownerColumn: 'tenant_id' }), 
    cancelRequest
);

// ==========================================
// Administrative & Maintenance Staff Routes
// ==========================================
router.get(
    '/', 
    requireRole([ROLES.ADMIN, ROLES.STAFF]), 
    hasPermission(PERMISSIONS.REQUESTS_READ), 
    getAllRequests
);

router.put(
    '/:id', 
    requireRole([ROLES.ADMIN, ROLES.STAFF]), 
    hasPermission(PERMISSIONS.REQUESTS_UPDATE), 
    updateRequest
);

router.delete(
    '/:id', 
    requireRole([ROLES.ADMIN]), 
    hasPermission(PERMISSIONS.REQUESTS_DELETE), 
    deleteRequest
);

module.exports = router;
