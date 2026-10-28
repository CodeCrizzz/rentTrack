const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    ROLES, 
    PERMISSIONS, 
    requireRole, 
    hasPermission 
} = require('../middleware/rbacMiddleware');

const { 
    getAllBills, 
    getBillById, 
    createBill, 
    updateBill, 
    deleteBill, 
    payBill,
    generateMonthlyBills,
    getPendingPayments,
    getPendingPaymentsCount,
    verifyPayment,
    getAllPayments,
    triggerPaymentReminders
} = require('../controllers/billingController');

// All billing admin routes require authentication and authorized billing roles
router.use(protect);
router.use(requireRole([ROLES.ADMIN, ROLES.OWNER]));

// Automated Generation & Batch Reminders
router.post('/generate', hasPermission(PERMISSIONS.BILLS_GENERATE), generateMonthlyBills);
router.post('/reminders', hasPermission(PERMISSIONS.BILLS_REMINDERS), triggerPaymentReminders);

// Payment Review & Verification
router.get('/payments', hasPermission(PERMISSIONS.BILLS_READ), getAllPayments);
router.get('/payments/pending', hasPermission(PERMISSIONS.BILLS_READ), getPendingPayments);
router.get('/payments/pending-count', hasPermission(PERMISSIONS.BILLS_READ), getPendingPaymentsCount);
router.post('/payments/:paymentId/verify', hasPermission(PERMISSIONS.BILLS_VERIFY_PAYMENT), verifyPayment);

// Bill Invoicing CRUD
router.route('/')
    .get(hasPermission(PERMISSIONS.BILLS_READ), getAllBills)
    .post(hasPermission(PERMISSIONS.BILLS_CREATE), createBill);

router.route('/:id')
    .get(hasPermission(PERMISSIONS.BILLS_READ), getBillById)
    .put(hasPermission(PERMISSIONS.BILLS_UPDATE), updateBill)
    .delete(hasPermission(PERMISSIONS.BILLS_DELETE), deleteBill);

// Manual Bill Payment Settlement
router.post('/:id/pay', hasPermission(PERMISSIONS.BILLS_UPDATE), payBill);

module.exports = router;
