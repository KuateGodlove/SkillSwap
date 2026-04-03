// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Client routes
router.get('/client', orderController.getClientOrders);
router.post('/inquire/:serviceId', orderController.inquireService);

// Provider routes
router.get('/provider', orderController.getProviderOrders);

// Shared routes
router.get('/:orderId', orderController.getOrderDetails);
router.patch('/:orderId/status', orderController.updateOrderStatus);

// Milestone routes
router.post('/:orderId/milestones', orderController.addMilestone);
router.put('/:orderId/milestones/:milestoneId', orderController.updateMilestone);
router.post('/:orderId/milestones/:milestoneId/complete', orderController.completeMilestone);
router.post('/:orderId/milestones/:milestoneId/approve', orderController.approveMilestone);
router.post('/:orderId/milestones/:milestoneId/upload', orderController.uploadDeliverable);

// Message routes
router.get('/:orderId/messages', orderController.getMessages);
router.post('/:orderId/messages', orderController.sendMessage);

module.exports = router;