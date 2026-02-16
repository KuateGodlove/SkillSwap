// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);

// Saved providers (for clients)
router.get('/saved-providers', authorize('client'), userController.getSavedProviders);
router.post('/saved-providers/:providerId', authorize('client'), userController.saveProvider);
router.delete('/saved-providers/:providerId', authorize('client'), userController.removeSavedProvider);

// Provider specific
router.get('/provider/stats', authorize('provider'), userController.getProviderStats);

// Public profile (no auth required for this one)
router.get('/:providerId/public', userController.getPublicProfile);

module.exports = router;