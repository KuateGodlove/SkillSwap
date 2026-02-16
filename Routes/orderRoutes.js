// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Client routes
router.get('/client', orderController.getClientOrders);

// Provider routes
router.get('/provider', orderController.getProviderOrders);

// Shared routes
router.get('/:orderId', orderController.getOrderDetails);
router.post('/:orderId/milestones/:milestoneId/approve', orderController.approveMilestone);
router.post('/:orderId/milestones/:milestoneId/upload', orderController.uploadDeliverable);

// Message routes
router.get('/:orderId/messages', orderController.getMessages);
router.post('/:orderId/messages', orderController.sendMessage);

module.exports = router;