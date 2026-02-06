const express = require("express");
const serviceController = require('./service-controller');
const checkAuth = require("../auth-middleware");
const upload = require("../uploadMiddleware"); 

const router = express.Router();

// Public routes
router.get('/', serviceController.getAllServices);
router.get('/details/:id', serviceController.getServiceDetails);
router.get('/user/:userId', serviceController.getUserServices);

// Protected routes
router.use(checkAuth);

// ✅ CHANGE THIS LINE - from array to single
router.post("/create", upload.single('image'), serviceController.createService);
router.put("/update/:id", upload.array('images', 5), serviceController.updateService);
router.delete('/delete/:id', serviceController.deleteService);
router.get('/my-services', serviceController.getMyServices);
router.patch('/toggle-status/:id', serviceController.toggleServiceStatus);

module.exports = router;