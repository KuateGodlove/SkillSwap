const express = require('express');
const router = express.Router();
const serviceController = require('../Controllers/serviceController');

// Public service browsing
router.get('/services/featured', serviceController.getFeaturedServices);
router.get('/services/search', serviceController.searchServices);
router.get('/categories', serviceController.getCategories);

// Public stats
router.get('/stats', async (req, res) => {
  try {
    // In production, calculate real stats
    res.json({
      success: true,
      stats: {
        totalExperts: 1000,
        totalProjects: 8500,
        successRate: 98,
        avgResponseTime: 24
      }
    });
  } catch (error) {
    res.json({
      success: true,
      stats: {
        totalExperts: 1000,
        totalProjects: 8500,
        successRate: 98,
        avgResponseTime: 24
      }
    });
  }
});

module.exports = router;