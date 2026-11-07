const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleAuth, logoutUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/logout', protect, logoutUser);

module.exports = router;