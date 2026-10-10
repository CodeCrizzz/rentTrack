const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getAllBills, 
    getBillById, 
    createBill, 
    updateBill, 
    deleteBill, 
    payBill,
    generateMonthlyBills,
    getPendingPayments,
    verifyPayment,
    getAllPayments
} = require('../controllers/billingController');

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

router.use(protect);
router.use(adminOnly);

router.post('/generate', generateMonthlyBills);

router.get('/payments', getAllPayments);
router.get('/payments/pending', getPendingPayments);
router.post('/payments/:paymentId/verify', verifyPayment);

router.route('/')
    .get(getAllBills)
    .post(createBill);

router.route('/:id')
    .get(getBillById)
    .put(updateBill)
    .delete(deleteBill);

router.post('/:id/pay', payBill);

module.exports = router;
