const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleAuth, getGoogleConfig, logoutUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/google/config', getGoogleConfig);
router.post('/google', googleAuth);
router.post('/logout', protect, logoutUser);

module.exports = router;