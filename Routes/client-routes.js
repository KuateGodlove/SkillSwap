const express = require('express');
const router = express.Router();
const clientController = require('../Controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Project management
router.post('/projects', clientController.createProject);
router.get('/projects', clientController.getClientProjects);
router.get('/projects/:projectId', clientController.getProjectDetails);

// Service browsing
router.get('/services', clientController.browseServices);
router.get('/services/:serviceId', clientController.getServiceDetails);
router.post('/services/:serviceId/inquiry', clientController.sendProjectInquiry);

// Dashboard
router.get('/dashboard/stats', clientController.getClientDashboardStats);

module.exports = router;