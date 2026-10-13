const express = require('express');
const router = express.Router();
const { runBillingCron, runReminderCron } = require('../controllers/cronController');

router.post('/billing', runBillingCron);
router.post('/reminders', runReminderCron);
router.get('/reminders', runReminderCron);

module.exports = router;
