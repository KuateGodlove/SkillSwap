const express = require('express');
const router = express.Router();
const notificationController = require('./notification-controller');
const checkAuth = require("../auth-middleware");

// All routes require authentication
router.use(checkAuth);

// ====================== GET NOTIFICATIONS ======================

// Get all notifications with filters
router.get('/', notificationController.getNotifications);

// Get notification by ID
router.get('/:id', notificationController.getNotificationById);

// Get unread count (for badge)
router.get('/unread-count', notificationController.getUnreadCount);

// ====================== UPDATE NOTIFICATIONS ======================

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Archive notification
router.put('/:id/archive', notificationController.archiveNotification);

// ====================== DELETE NOTIFICATIONS ======================

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Clear all notifications
router.delete('/clear-all', notificationController.clearAllNotifications);

// ====================== CREATE NOTIFICATIONS ======================

// Create offer received notification
router.post('/offer-received', notificationController.createOfferReceivedNotification);

// Create message received notification
router.post('/message-received', notificationController.createMessageReceivedNotification);

// Create payment received notification
router.post('/payment-received', notificationController.createPaymentReceivedNotification);

// Create request accepted notification
router.post('/request-accepted', notificationController.createRequestAcceptedNotification);

module.exports = router;