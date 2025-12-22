const express = require('express');
const router = express.Router();
const notificationController = require('./notification-controller');
const checkAuth = require("../auth-middleware");

// All routes are protected
router.use(checkAuth);

// GET notifications
router.get('/', notificationController.getNotifications);

// GET unread count (for badge)
router.get('/unread-count', notificationController.getUnreadCount);

// GET notification by ID
router.get('/:id', notificationController.getNotificationById);

// GET statistics
router.get('/stats/overview', notificationController.getNotificationStats);

// PUT mark as read
router.put('/:id/read', notificationController.markAsRead);

// PUT mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// PUT archive notification
router.put('/:id/archive', notificationController.archiveNotification);

// POST track action click
router.post('/:id/action', notificationController.trackAction);

// DELETE single notification
router.delete('/:id', notificationController.deleteNotification);

// DELETE multiple notifications
router.delete('/', notificationController.deleteMultipleNotifications);

// DELETE clear all notifications
router.delete('/clear-all', notificationController.clearAllNotifications);


module.exports = router;