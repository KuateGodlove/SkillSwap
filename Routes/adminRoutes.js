// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../Controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// Provider management
router.get('/providers/pending', adminController.getPendingProviders);
router.post('/providers/:providerId/approve', adminController.approveProvider);
router.post('/providers/:providerId/reject', adminController.rejectProvider);

// Service management
router.get('/services/pending', adminController.getPendingServices);
router.post('/services/:serviceId/approve', adminController.approveService);

// Platform stats
router.get('/stats', adminController.getPlatformStats);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/:userId/status', adminController.updateUserStatus);

module.exports = router;