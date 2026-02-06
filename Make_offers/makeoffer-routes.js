const express = require('express');
const router = express.Router();
const checkAuth = require("../auth-middleware");
const upload = require('../utils/upload');
const {
  createOffer,
  getOffersByRequest,
  getMyOffers,
  getOfferById,
  updateOffer,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  sendMessage,
  addNegotiation,
  getOfferStatistics,
  checkOfferEligibility
} = require('./makeoffer-controller');

router.use(checkAuth);

// ✅ Specific GET routes FIRST (before catch-all /:id)
router.get('/my-offers', getMyOffers);
router.get('/statistics', getOfferStatistics);
router.get('/request/:requestId', getOffersByRequest);

// ✅ POST/PUT/PATCH/DELETE routes
router.post('/', upload.array('attachments', 5), createOffer);
router.put('/:id', updateOffer);
router.post('/:id/accept', acceptOffer);
router.post('/:id/reject', rejectOffer);
router.post('/:id/withdraw', withdrawOffer);
router.post('/:id/negotiate', addNegotiation);
router.post('/:id/message', sendMessage);

// ✅ Catch-all GET /:id LAST
router.get('/:id', getOfferById);
router.get('/check/:requestId', checkOfferEligibility);

module.exports = router;