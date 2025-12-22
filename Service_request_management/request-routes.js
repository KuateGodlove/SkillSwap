const express = require('express');
const router = express.Router();
const requestController = require('./request-controller');
const checkAuth = require("../auth-middleware");
const upload = require('../utils/upload');

router.use(checkAuth);

// ✅ SPECIFIC routes FIRST (before catch-all :id)
router.get('/saved', requestController.getSavedRequests);
router.get('/stats/overview', requestController.getRequestStats);
router.get('/user/:userId', requestController.getUserRequests);

// ✅ THEN general routes
router.get('/', requestController.getRequests);

// ✅ POST routes
router.post(
  '/',
  upload.array('attachments', 5),
  requestController.createRequest
);

router.post('/:id/save', requestController.toggleSaveRequest);

// ✅ PUT/PATCH routes
router.put(
  '/:id',
  upload.array('attachments', 5),
  requestController.updateRequest
);

router.patch('/:id/status', requestController.updateRequestStatus);

// ✅ DELETE routes
router.delete('/:id', requestController.deleteRequest);

// ✅ CATCH-ALL :id route LAST
router.get('/:id', requestController.getRequestById);

module.exports = router;