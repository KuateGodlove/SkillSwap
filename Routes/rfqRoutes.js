// routes/rfqRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rfqController = require('../Controllers/rfqController');
const quoteController = require('../Controllers/quoteController');
const { authenticate, authorize } = require('../middleware/auth');

const rfqUploadDir = path.join(__dirname, '..', 'uploads', 'rfqs');
fs.mkdirSync(rfqUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, rfqUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path.basename(file.originalname || 'attachment', ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 50);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// All routes require authentication
router.use(authenticate);

// Client routes
router.post('/', authorize('client'), upload.single('attachment'), rfqController.createRFQ);
router.get('/my', authorize('client'), rfqController.getMyRFQs);
router.get('/:rfqId/responses', authorize('client'), rfqController.getRFQResponses);
router.post('/:rfqId/select/:quoteId', authorize('client'), rfqController.selectSupplier);

// Provider routes
router.get('/market', authorize('provider'), rfqController.getRFQMarket);
router.get('/:rfqId/provider-view', authorize('provider'), rfqController.getProviderRFQView);
router.post('/:rfqId/quotes', authorize('provider'), quoteController.submitQuote);

// Shared routes
router.get('/:rfqId', rfqController.getRFQDetails);
router.put('/:rfqId', authorize('client'), rfqController.updateRFQ);
router.delete('/:rfqId', authorize('client'), rfqController.deleteRFQ);

module.exports = router;
