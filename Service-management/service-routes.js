const express = require("express");
const serviceController = require('./service-controller');
const checkAuth = require("../auth-middleware");
const upload = require("../uploadMiddleware"); 

const router = express.Router();

// Public routes (no authentication required)
router.get('/', serviceController.listAllUserServicesController); // Get all services
router.get('/details/:id', serviceController.getServiceDetailsController); // Get service details
router.get('/user/:userId', serviceController.listUserServicesController); // Get user's services

// Protected routes (require authentication)
router.use(checkAuth);

// Create service with image upload support
router.post(
  "/create",
  upload.array('images', 5), // Max 5 images
  serviceController.addServiceController
);

// Update service
router.put(
  "/update/:id",
  upload.array('images', 5),
  serviceController.updateServiceController
);

// Delete service
router.delete('/delete/:id', serviceController.removeServiceController);

// Get current user's services
router.get('/my-services', serviceController.getMyServicesController);

// Toggle service status
router.patch('/toggle-status/:id', serviceController.toggleServiceStatusController);

// Note: Removed this route as it conflicts with the public route above
// router.get('/:id', getServiceDetailsController); 

module.exports = router;