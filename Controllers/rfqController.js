// controllers/rfqController.js
const RFQ = require('../Models/RFQ');
const Quote = require('../Models/Quote');
const User = require('../Models/User');
const Notification = require('../Models/Notification');

// Helper function to calculate match score
const calculateMatchScore = (providerSkills, requiredSkills) => {
  if (!providerSkills?.length || !requiredSkills?.length) return 0;
  
  const matched = requiredSkills.filter(skill => 
    providerSkills.some(s => s.toLowerCase() === skill.toLowerCase())
  ).length;
  
  return Math.round((matched / requiredSkills.length) * 100);
};

// @desc    Create new RFQ
// @route   POST /api/rfqs
// @access  Private (Client only)
exports.createRFQ = async (req, res) => {
  try {
    console.info('[RFQ:create] start', {
      userId: req.user?._id,
      role: req.user?.role,
      bodyKeys: Object.keys(req.body || {})
    });

    const budgetMin = req.body?.budgetMin !== undefined ? Number(req.body.budgetMin) : undefined;
    const budgetMax = req.body?.budgetMax !== undefined ? Number(req.body.budgetMax) : undefined;

    const rfqData = {
      ...req.body,
      budgetMin: Number.isFinite(budgetMin) ? budgetMin : req.body?.budgetMin,
      budgetMax: Number.isFinite(budgetMax) ? budgetMax : req.body?.budgetMax,
      clientId: req.user._id,
      clientCompany: req.user.clientDetails?.companyName,
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    };

    if (req.body?.skills && typeof req.body.skills === 'string') {
      rfqData.skills = req.body.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (req.file) {
      rfqData.attachments = [{
        filename: req.file.originalname,
        path: `/uploads/rfqs/${req.file.filename}`,
        size: req.file.size,
        uploadedAt: new Date()
      }];
    }

    console.info('[RFQ:create] data', {
      clientId: rfqData.clientId,
      clientCompany: rfqData.clientCompany,
      category: rfqData.category,
      timeline: rfqData.timeline,
      budgetMin: rfqData.budgetMin,
      budgetMax: rfqData.budgetMax,
      skills: rfqData.skills,
      attachment: req.file ? req.file.filename : null,
      postedAt: rfqData.postedAt,
      expiresAt: rfqData.expiresAt
    });

    const rfq = new RFQ(rfqData);
    await rfq.save();

    // Increment client's project count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'clientDetails.projectsPosted': 1 }
    });

    console.info('[RFQ:create] success', { rfqId: rfq._id });

    res.status(201).json({
      success: true,
      message: 'RFQ created successfully',
      rfq
    });
  } catch (error) {
    console.error('[RFQ:create] error', {
      message: error.message,
      name: error.name,
      code: error.code,
      errors: error.errors,
      stack: error.stack,
      userId: req.user?._id,
      role: req.user?.role,
      body: req.body
    });
    res.status(500).json({ 
      success: false,
      message: 'Failed to create RFQ', 
      error: error.message 
    });
  }
};

// @desc    Get client's RFQs
// @route   GET /api/rfqs/my
// @access  Private (Client only)
exports.getMyRFQs = async (req, res) => {
  try {
    const rfqs = await RFQ.find({ clientId: req.user._id })
      .sort({ postedAt: -1 });

    const normalized = rfqs.map(rfq => {
      const obj = rfq.toObject({ getters: true });
      return { ...obj, id: obj._id };
    });

    res.json({
      success: true,
      rfqs: normalized
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch RFQs', 
      error: error.message 
    });
  }
};

// @desc    Get RFQ details
// @route   GET /api/rfqs/:rfqId
// @access  Private
exports.getRFQDetails = async (req, res) => {
  try {
    const { rfqId } = req.params;

    const rfq = await RFQ.findById(rfqId)
      .populate('clientId', 'firstName lastName companyName rating');

    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        message: 'RFQ not found' 
      });
    }

    // Increment view count if viewer is not the client
    if (rfq.clientId._id.toString() !== req.user._id.toString()) {
      rfq.views += 1;
      await rfq.save();
    }

    res.json({
      success: true,
      rfq: { ...rfq.toObject({ getters: true }), id: rfq._id }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch RFQ', 
      error: error.message 
    });
  }
};

// @desc    Update RFQ
// @route   PUT /api/rfqs/:rfqId
// @access  Private (Client only)
exports.updateRFQ = async (req, res) => {
  try {
    const { rfqId } = req.params;

    const rfq = await RFQ.findOneAndUpdate(
      { _id: rfqId, clientId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        message: 'RFQ not found or unauthorized' 
      });
    }

    res.json({
      success: true,
      message: 'RFQ updated successfully',
      rfq: { ...rfq.toObject({ getters: true }), id: rfq._id }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update RFQ', 
      error: error.message 
    });
  }
};

// @desc    Delete RFQ
// @route   DELETE /api/rfqs/:rfqId
// @access  Private (Client only)
exports.deleteRFQ = async (req, res) => {
  try {
    const { rfqId } = req.params;

    const rfq = await RFQ.findOneAndDelete({
      _id: rfqId,
      clientId: req.user._id
    });

    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        message: 'RFQ not found or unauthorized' 
      });
    }

    // Delete associated quotes
    await Quote.deleteMany({ rfqId });

    res.json({
      success: true,
      message: 'RFQ deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete RFQ', 
      error: error.message 
    });
  }
};

// @desc    Get RFQ responses (for client)
// @route   GET /api/rfqs/:rfqId/responses
// @access  Private (Client only)
exports.getRFQResponses = async (req, res) => {
  try {
    const { rfqId } = req.params;

    // Verify RFQ belongs to client
    const rfq = await RFQ.findOne({
      _id: rfqId,
      clientId: req.user._id
    });

    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        message: 'RFQ not found' 
      });
    }

    const quotes = await Quote.find({ rfqId })
      .populate('providerId', 'firstName lastName providerDetails rating')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      quotes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch responses', 
      error: error.message 
    });
  }
};

// @desc    Select supplier and create order
// @route   POST /api/rfqs/:rfqId/select/:quoteId
// @access  Private (Client only)
exports.selectSupplier = async (req, res) => {
  try {
    const { rfqId, quoteId } = req.params;

    // Verify RFQ belongs to client
    const rfq = await RFQ.findOne({
      _id: rfqId,
      clientId: req.user._id,
      status: 'active'
    });

    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        message: 'RFQ not found or already completed' 
      });
    }

    const quote = await Quote.findById(quoteId);
    if (!quote || quote.rfqId.toString() !== rfqId) {
      return res.status(404).json({ 
        success: false,
        message: 'Quote not found' 
      });
    }

    // Update RFQ
    rfq.status = 'completed';
    rfq.selectedQuoteId = quoteId;
    rfq.selectedProviderId = quote.providerId;
    await rfq.save();

    // Update quote
    quote.status = 'accepted';
    await quote.save();

    // Create notification for Provider
    const notification = await Notification.create({
      userId: quote.providerId,
      type: 'offer_accepted',
      title: 'Quote Accepted!',
      message: `${req.user.firstName} accepted your quote for RFQ: ${rfq.title}`,
      senderId: req.user._id,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      metadata: {
        offerId: quote._id,
        requestId: rfq._id
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(quote.providerId.toString()).emit('newNotification', notification);
    }

    // Create Order from RFQ and Quote
    const Order = require('../Models/Order');
    const order = new Order({
      rfqId: rfq._id,
      quoteId: quote._id,
      clientId: req.user._id,
      providerId: quote.providerId,
      title: rfq.title,
      description: rfq.description,
      amount: quote.amount,
      status: 'pending',
      startDate: new Date(),
      milestones: [
        {
          title: 'Initial Deliverable',
          description: 'Kickoff and first set of requirements',
          amount: quote.amount * 0.3,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending'
        },
        {
          title: 'Final Delivery',
          description: 'Project completion and source files',
          amount: quote.amount * 0.7,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'pending'
        }
      ]
    });

    await order.save();

    res.json({
      success: true,
      message: 'Supplier selected and order created successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to select supplier', 
      error: error.message 
    });
  }
};

// @desc    Get RFQ market (for providers)
// @route   GET /api/rfqs/market
// @access  Private (Provider only)
exports.getRFQMarket = async (req, res) => {
  try {
    const { category, minBudget, maxBudget, timeline, skills, search } = req.query;

    // Build filter
    const filter = { 
      status: 'active',
      expiresAt: { $gt: new Date() }
    };

    if (category) filter.category = category;
    if (minBudget || maxBudget) {
      filter.budgetMin = {};
      if (minBudget) filter.budgetMin.$gte = parseInt(minBudget);
      if (maxBudget) filter.budgetMax = { $lte: parseInt(maxBudget) };
    }
    if (timeline) filter.timeline = timeline;
    if (skills) filter.skills = { $in: skills.split(',') };

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    const rfqs = await RFQ.find(filter)
      .populate('clientId', 'firstName lastName companyName rating')
      .sort({ postedAt: -1 })
      .limit(50);

    // Get provider's existing quotes to check if already quoted
    const existingQuotes = await Quote.find({
      providerId: req.user._id,
      rfqId: { $in: rfqs.map(r => r._id) }
    });

    const quotedRfqIds = new Set(existingQuotes.map(q => q.rfqId.toString()));

    // Calculate match scores
    const providerSkills = req.user.providerDetails?.skills || [];
    const rfqsWithDetails = rfqs.map(rfq => {
      const alreadyQuoted = quotedRfqIds.has(rfq._id.toString());
      const matchScore = calculateMatchScore(providerSkills, rfq.skills);
      
      return {
        ...rfq.toObject({ getters: true }),
        id: rfq._id,
        matchScore,
        alreadyQuoted
      };
    });

    res.json({
      success: true,
      rfqs: rfqsWithDetails
    });
  } catch (error) {
    console.error('RFQ market error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch RFQs', 
      error: error.message 
    });
  }
};

// @desc    Get RFQ details for provider
// @route   GET /api/rfqs/:rfqId/provider-view
// @access  Private (Provider only)
exports.getProviderRFQView = async (req, res) => {
  try {
    const { rfqId } = req.params;

    const rfq = await RFQ.findById(rfqId)
      .populate('clientId', 'firstName lastName companyName rating memberSince totalSpent');

    if (!rfq) {
      return res.status(404).json({ 
        success: false,
        message: 'RFQ not found' 
      });
    }

    // Check if provider has already quoted
    const existingQuote = await Quote.findOne({
      rfqId,
      providerId: req.user._id
    });

    res.json({
      success: true,
      rfq: { ...rfq.toObject({ getters: true }), id: rfq._id },
      hasQuoted: !!existingQuote
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch RFQ', 
      error: error.message 
    });
  }
};
