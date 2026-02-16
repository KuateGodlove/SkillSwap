const express = require('express');
const router = express.Router();
const paymentController = require('../Controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.post('/create-payment-intent', paymentController.createPaymentIntent);
router.post('/confirm', paymentController.confirmPayment);
router.get('/history', paymentController.getPaymentHistory);
router.get('/invoices/:invoiceId', paymentController.getInvoice);
router.post('/withdraw', paymentController.requestWithdrawal);

module.exports = router;