const express = require('express');
const router = express.Router();  // Make sure this is Express Router
const requestController = require('./request-controller');
const checkAuth = require("../auth-middleware");
const upload = require('../utils/upload');

// Public routes (no authentication needed)
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get all requests route' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get single request route', id: req.params.id });
});

// Apply authentication middleware to protected routes
router.use(checkAuth);

// Protected routes
router.post('/', upload.array('attachments', 5), (req, res) => {
  res.json({ success: true, message: 'Create request route' });
});

// Test with simple functions first
const testGetRequests = (req, res) => {
  res.json({ success: true, message: 'Test get requests' });
};

const testGetRequestById = (req, res) => {
  res.json({ success: true, message: 'Test get by id', id: req.params.id });
};

// Use simple functions first
router.get('/test/all', testGetRequests);
router.get('/test/:id', testGetRequestById);

module.exports = router;