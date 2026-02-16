// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.get('/', serviceController.getServices);
router.get('/:serviceId', serviceController.getServiceDetails);

// Protected provider routes
router.post('/', authenticate, authorize('provider'), serviceController.createService);
router.get('/provider/my', authenticate, authorize('provider'), serviceController.getMyServices);
router.put('/:serviceId', authenticate, authorize('provider'), serviceController.updateService);
router.delete('/:serviceId', authenticate, authorize('provider'), serviceController.deleteService);
router.post('/:serviceId/duplicate', authenticate, authorize('provider'), serviceController.duplicateService);
router.patch('/:serviceId/status', authenticate, authorize('provider'), serviceController.updateStatus);

module.exports = router;