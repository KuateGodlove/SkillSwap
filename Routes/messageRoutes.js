// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../Controllers/messageController');
const { authenticate } = require('../middleware/auth');

// All message routes require authentication
router.use(authenticate);

// Order messages
router.get('/orders/:orderId', messageController.getOrderMessages);
router.post('/orders/:orderId', messageController.sendOrderMessage);

// Mark read
router.patch('/:messageId/read', messageController.markMessageRead);

module.exports = router;
