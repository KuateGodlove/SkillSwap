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
  getOfferStatistics
} = require('./makeoffer-controller');
router.use(checkAuth);
// Create offer with file upload support
router.post('/',  upload.array('attachments', 5), createOffer);

// Get offers for a specific request (requester only)
router.get('/request/:requestId', getOffersByRequest);

// Get user's own offers
router.get('/my-offers', getMyOffers);

// Get offer statistics
router.get('/statistics', getOfferStatistics);

// Get single offer
router.get('/:id', getOfferById);

// Update offer
router.put('/:id',  updateOffer);

// Accept offer
router.post('/:id/accept', acceptOffer);

// Reject offer
router.post('/:id/reject', rejectOffer);

// Withdraw offer
router.post('/:id/withdraw', withdrawOffer);

// Send message
router.post('/:id/message', sendMessage);

module.exports = router;