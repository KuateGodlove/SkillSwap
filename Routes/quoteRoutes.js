// routes/quoteRoutes.js
const express = require('express');
const router = express.Router();
const quoteController = require('../Controllers/quoteController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Provider routes
router.get('/my', authorize('provider'), quoteController.getMyQuotes);
router.put('/:quoteId', authorize('provider'), quoteController.updateQuote);
router.delete('/:quoteId', authorize('provider'), quoteController.withdrawQuote);

// Shared route (accessible by both provider and client)
router.get('/:quoteId', quoteController.getQuoteDetails);

module.exports = router;