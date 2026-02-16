// routes/membershipRoutes.js
const express = require('express');
const router = express.Router();
const membershipController = require('../Controllers/membershipController');
const { authenticate, authorize } = require('../middleware/auth');

// Public route
router.get('/plans', membershipController.getPlans);

// Protected provider routes
router.use(authenticate, authorize('provider'));

router.post('/subscribe', membershipController.subscribe);
router.get('/current', membershipController.getCurrentMembership);
router.post('/cancel', membershipController.cancelMembership);
router.post('/renew', membershipController.renewMembership);
router.post('/upgrade', membershipController.upgradeMembership);

module.exports = router;