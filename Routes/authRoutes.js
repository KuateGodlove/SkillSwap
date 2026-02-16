// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// Public routes
router.post('/register/client', validateRegistration, authController.registerClient);
router.post('/register/provider', validateRegistration, authController.registerProvider);
router.post('/login', validateLogin, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;