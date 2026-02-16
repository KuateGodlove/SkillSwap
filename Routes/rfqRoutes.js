// routes/rfqRoutes.js
const express = require('express');
const router = express.Router();
const rfqController = require('../Controllers/rfqController');
const quoteController = require('../Controllers/quoteController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Client routes
router.post('/', authorize('client'), rfqController.createRFQ);
router.get('/my', authorize('client'), rfqController.getMyRFQs);
router.get('/:rfqId/responses', authorize('client'), rfqController.getRFQResponses);
router.post('/:rfqId/select/:quoteId', authorize('client'), rfqController.selectSupplier);

// Provider routes
router.get('/market', authorize('provider'), rfqController.getRFQMarket);
router.get('/:rfqId/provider-view', authorize('provider'), rfqController.getProviderRFQView);
router.post('/:rfqId/quotes', authorize('provider'), quoteController.submitQuote);

// Shared routes
router.get('/:rfqId', rfqController.getRFQDetails);
router.put('/:rfqId', authorize('client'), rfqController.updateRFQ);
router.delete('/:rfqId', authorize('client'), rfqController.deleteRFQ);

module.exports = router;