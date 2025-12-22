const Offer = require('../Make_offers/makeoffer-model');
const Request = require("../Service_request_management/request-model");
const userModel = require("../authentification/user-model");
const Notification = require('../Notification/notification-controller');

// @desc    Create a new offer
// @route   POST /api/offers
// @access  Private
exports.createOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { requestId, proposedBudget, estimatedTime, coverLetter, pricingStrategy } = req.body;
    
    // Check if request exists
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user already made an offer
    const existingOffer = await Offer.findOne({
      requestId,
      providerId: userId,
      status: { $in: ['pending', 'accepted'] }
    });
    
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an offer for this request'
      });
    }
    
    // Handle file uploads
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/offers/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size
      }));
    }
    
    // Create offer
    const offerData = {
      requestId,
      providerId: userId,
      providerName: `${user.firstName} ${user.lastName}`,
      providerEmail: user.email,
      providerPhoto: user.profilePhoto || '',
      providerRating: user.rating || 0,
      proposedBudget: parseFloat(proposedBudget),
      originalBudget: request.budget,
      estimatedTime,
      coverLetter,
      pricingStrategy,
      attachments,
      status: 'pending'
    };
    
    const offer = await Offer.create(offerData);
    
    // Send notification to requester
    await Notification.notifyNewOffer(offer, request);
    
    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully',
      data: offer
    });
  } catch (error) {
    console.error('Create offer error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit offer',
      error: error.message
    });
  }
};

// @desc    Get offers for a request
// @route   GET /api/offers/request/:requestId
// @access  Private (Requester only)
exports.getOffersByRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user.id;
    
    // Verify request ownership
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    if (request.requesterId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view offers for this request'
      });
    }
    
    const offers = await Offer.find({ requestId })
      .sort({ createdAt: -1 })
      .populate('providerId', 'firstName lastName profilePhoto rating reviewsCount');
    
    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers
    });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message
    });
  }
};

// @desc    Get user's offers
// @route   GET /api/offers/my-offers
// @access  Private
exports.getMyOffers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { providerId: userId };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const offers = await Offer.find(query)
      .populate('requestId', 'title budget status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Offer.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: offers
    });
  } catch (error) {
    console.error('Get my offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your offers',
      error: error.message
    });
  }
};

// @desc    Get single offer
// @route   GET /api/offers/:id
// @access  Private
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('requestId', 'title description budget status requesterName')
      .populate('providerId', 'firstName lastName profilePhoto rating skills bio');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Increment views
    offer.views += 1;
    await offer.save();
    
    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offer',
      error: error.message
    });
  }
};

// @desc    Update offer
// @route   PUT /api/offers/:id
// @access  Private (Provider only)
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Check ownership
    if (offer.providerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this offer'
      });
    }
    
    // Check if offer can be updated
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update offer that is not pending'
      });
    }
    
    // Update offer
    const updateData = {
      ...req.body,
      updatedAt: Date.now()
    };
    
    // Handle budget conversion
    if (req.body.proposedBudget) {
      updateData.proposedBudget = parseFloat(req.body.proposedBudget);
    }
    
    const updatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: updatedOffer
    });
  } catch (error) {
    console.error('Update offer error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message
    });
  }
};

// @desc    Accept offer
// @route   POST /api/offers/:id/accept
// @access  Private (Requester only)
exports.acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('requestId');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Check if user is the requester
    const request = offer.requestId;
    if (request.requesterId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this offer'
      });
    }
    
    // Check if offer is still pending
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Offer is no longer available'
      });
    }
    
    // Update offer status
    offer.status = 'accepted';
    await offer.save();
    
    // Update request status
    request.status = 'in-progress';
    request.selectedOffer = offer._id;
    request.providerId = offer.providerId;
    await request.save();
    
    // Reject all other offers for this request
    await Offer.updateMany(
      {
        requestId: request._id,
        _id: { $ne: offer._id },
        status: 'pending'
      },
      { $set: { status: 'rejected' } }
    );
    
    // Send notification to provider
    await Notification.notifyOfferAccepted(offer, request);
    
    res.status(200).json({
      success: true,
      message: 'Offer accepted successfully',
      data: {
        offer,
        request
      }
    });
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept offer',
      error: error.message
    });
  }
};

// @desc    Reject offer
// @route   POST /api/offers/:id/reject
// @access  Private (Requester only)
exports.rejectOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('requestId');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Check if user is the requester
    const request = offer.requestId;
    if (request.requesterId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this offer'
      });
    }
    
    // Check if offer is still pending
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Offer is no longer available'
      });
    }
    
    // Update offer status
    offer.status = 'rejected';
    await offer.save();
    
    res.status(200).json({
      success: true,
      message: 'Offer rejected',
      data: offer
    });
  } catch (error) {
    console.error('Reject offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject offer',
      error: error.message
    });
  }
};

// @desc    Withdraw offer
// @route   POST /api/offers/:id/withdraw
// @access  Private (Provider only)
exports.withdrawOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Check ownership
    if (offer.providerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this offer'
      });
    }
    
    // Check if offer can be withdrawn
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw offer that is not pending'
      });
    }
    
    // Update offer status
    offer.status = 'withdrawn';
    await offer.save();
    
    res.status(200).json({
      success: true,
      message: 'Offer withdrawn successfully',
      data: offer
    });
  } catch (error) {
    console.error('Withdraw offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw offer',
      error: error.message
    });
  }
};

// @desc    Send message to offer
// @route   POST /api/offers/:id/message
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Check if messages array exists
    if (!offer.messages) {
      offer.messages = [];
    }
    
    // Add message
    offer.messages.push({
      senderId: req.user.id,
      message,
      sentAt: new Date()
    });
    
    await offer.save();
    
    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: offer.messages[offer.messages.length - 1]
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// @desc    Get offer statistics
// @route   GET /api/offers/statistics
// @access  Private
exports.getOfferStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const statistics = await Offer.aggregate([
      { $match: { providerId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$proposedBudget' }
        }
      }
    ]);
    
    const totalOffers = await Offer.countDocuments({ providerId: userId });
    
    res.status(200).json({
      success: true,
      data: {
        statistics,
        totalOffers
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};