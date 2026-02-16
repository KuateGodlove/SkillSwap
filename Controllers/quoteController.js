// controllers/quoteController.js
const Quote = require('../models/Quote');
const RFQ = require('../models/RFQ');
const User = require('../models/User');

// @desc    Submit a quote
// @route   POST /api/rfqs/:rfqId/quotes
// @access  Private
exports.submitQuote = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const providerId = req.user._id;

    const rfq = await RFQ.findOne({ _id: rfqId, status: 'active' });
    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        message: 'RFQ not found or no longer active' 
      });
    }

    const existing = await Quote.findOne({ rfqId, providerId });
    if (existing) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already quoted on this RFQ' 
      });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const quotesThisMonth = await Quote.countDocuments({
      providerId,
      submittedAt: { $gte: startOfMonth }
    });

    if (quotesThisMonth >= req.user.membership.rfqQuota) {
      return res.status(400).json({ 
        success: false,
        message: 'Monthly RFQ quota exceeded' 
      });
    }

    const quote = new Quote({
      rfqId,
      providerId,
      ...req.body,
      submittedAt: new Date()
    });

    await quote.save();

    rfq.quotes += 1;
    await rfq.save();

    res.status(201).json({
      success: true,
      message: 'Quote submitted successfully',
      quote
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to submit quote', 
      error: error.message 
    });
  }
};

// @desc    Get my quotes
// @route   GET /api/quotes/my
// @access  Private
exports.getMyQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find({ providerId: req.user._id })
      .populate('rfqId', 'title category budgetMin budgetMax')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      quotes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch quotes', 
      error: error.message 
    });
  }
};

// @desc    Get quote details
// @route   GET /api/quotes/:quoteId
// @access  Private
exports.getQuoteDetails = async (req, res) => {
  try {
    const { quoteId } = req.params;

    const quote = await Quote.findById(quoteId)
      .populate('rfqId')
      .populate('providerId', 'firstName lastName providerDetails rating');

    if (!quote) {
      return res.status(404).json({ 
        success: false,
        message: 'Quote not found' 
      });
    }

    const isProvider = quote.providerId._id.toString() === req.user._id.toString();
    const isClient = quote.rfqId.clientId.toString() === req.user._id.toString();

    if (!isProvider && !isClient) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    if (isClient && !quote.viewedByClient) {
      quote.viewedByClient = true;
      await quote.save();
    }

    res.json({
      success: true,
      quote
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch quote', 
      error: error.message 
    });
  }
};

// @desc    Update quote
// @route   PUT /api/quotes/:quoteId
// @access  Private
exports.updateQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;

    const quote = await Quote.findOneAndUpdate(
      { _id: quoteId, providerId: req.user._id, status: 'pending' },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!quote) {
      return res.status(404).json({ 
        success: false,
        message: 'Quote not found or cannot be updated' 
      });
    }

    res.json({
      success: true,
      message: 'Quote updated successfully',
      quote
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update quote', 
      error: error.message 
    });
  }
};

// @desc    Withdraw quote
// @route   DELETE /api/quotes/:quoteId
// @access  Private
exports.withdrawQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;

    const quote = await Quote.findOneAndDelete({
      _id: quoteId,
      providerId: req.user._id,
      status: 'pending'
    });

    if (!quote) {
      return res.status(404).json({ 
        success: false,
        message: 'Quote not found or cannot be withdrawn' 
      });
    }

    await RFQ.findByIdAndUpdate(quote.rfqId, { $inc: { quotes: -1 } });

    res.json({
      success: true,
      message: 'Quote withdrawn successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to withdraw quote', 
      error: error.message 
    });
  }
};