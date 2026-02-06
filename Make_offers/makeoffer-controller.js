const mongoose = require('mongoose');
const Offer = require('../Make_offers/makeoffer-model');
const Request = require("../Service_request_management/request-model");
const User = require("../authentification/user-model");
const NotificationService = require('../Notification/notification-service');

// Helper function for notifications
const notifyNewOffer = async (offer, request) => {
  try {
    const provider = await User.findById(offer.providerId);
    
    if (!provider) {
      console.log('Provider not found for notification');
      return;
    }
    
    await NotificationService.createOfferReceivedNotification({
      userId: request.requesterId,
      senderId: offer.providerId,
      requestId: request._id,
      offerId: offer._id,
      skillsOffered: offer.skillsOffered.join(', '),
      senderName: `${provider.firstName} ${provider.lastName}`
    });
    
    console.log('📢 Notification sent for new skill exchange offer');
  } catch (notifError) {
    console.error('Failed to send notification:', notifError);
  }
};

const notifyOfferAccepted = async (offer, request) => {
  try {
    const provider = await User.findById(offer.providerId);
    const requester = await User.findById(request.requesterId);
    
    if (!provider || !requester) {
      console.log('User not found for notification');
      return;
    }
    
    await NotificationService.createRequestAcceptedNotification({
      userId: offer.providerId,
      acceptorId: request.requesterId,
      requestId: request._id,
      requestTitle: request.title,
      acceptorName: `${requester.firstName} ${requester.lastName}`
    });
    
    console.log('📢 Notification sent for accepted skill exchange offer');
  } catch (notifError) {
    console.error('Failed to send notification:', notifError);
  }
};

// @desc    Create a new skill exchange offer
// @route   POST /api/offers
// @access  Private
exports.createOffer = async (req, res) => {
  try {
    console.log('📩 POST /api/offers called - Skill Exchange');
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { 
      requestId, 
      skillsOffered,
      estimatedTime,
      timeUnit = 'days',
      proposalMessage,
      isNegotiable = true
    } = req.body;
    
    // Validate required fields
    if (!requestId || !skillsOffered || !proposalMessage || !estimatedTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: requestId, skillsOffered, proposalMessage, estimatedTime'
      });
    }

    // Validate skillsOffered is an array
    if (!Array.isArray(skillsOffered) || skillsOffered.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Skills offered must be a non-empty array'
      });
    }
    
    // Check if request exists
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Prevent self-offers
    if (request.requesterId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot make an offer on your own request'
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
    
    // Handle file uploads (portfolio examples, etc.)
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/offers/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size
      }));
    }
    
    // Prepare offer data - SKILL EXCHANGE ONLY
    const offerData = {
      requestId,
      providerId: userId,
      providerName: `${user.firstName} ${user.lastName}`,
      providerEmail: user.email,
      providerPhoto: user.profilePhoto || '',
      providerRating: user.rating || 0,
      skillsOffered: skillsOffered.map(s => s.trim()).filter(s => s.length > 0),
      estimatedTime,
      timeUnit,
      proposalMessage,
      isNegotiable,
      attachments
    };
    
    // Create offer
    const offer = await Offer.create(offerData);
    
    // Send notifications
    await notifyNewOffer(offer, request);
    
    // Calculate skill match
    const matchingSkills = (user.skills || []).filter(skill => 
      request.skillsRequired?.includes(skill)
    );
    
    if (matchingSkills.length > 0) {
      try {
        await NotificationService.createNotification({
          userId: request.requesterId,
          type: 'skill_match',
          title: 'New Skill Exchange Offer',
          message: `${user.firstName} ${user.lastName} wants to exchange skills: ${skillsOffered.join(', ')}. They have ${matchingSkills.length} matching skills.`,
          metadata: {
            requestId: request._id,
            offerId: offer._id,
            matchingSkills,
            skillsOffered
          },
          senderId: userId,
          senderName: `${user.firstName} ${user.lastName}`,
          senderPhoto: user.profilePhoto || '',
          important: true
        });
      } catch (skillNotifError) {
        console.error('Skill match notification error:', skillNotifError);
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Skill exchange offer submitted successfully',
      data: offer
    });
  } catch (error) {
    console.error('❌ Create offer error:', error);
    
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

// @desc    Get offers by request ID
// @route   GET /api/offers/request/:requestId
// @access  Private
exports.getOffersByRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const offers = await Offer.find({ requestId })
      .populate('providerId', 'firstName lastName email rating profilePhoto skills');

    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length
    });
  } catch (error) {
    console.error('Get offers by request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve offers',
      error: error.message
    });
  }
};

// @desc    Get my offers
// @route   GET /api/offers/my-offers
// @access  Private
exports.getMyOffers = async (req, res) => {
  try {
    const userId = req.user.id;

    const offers = await Offer.find({ providerId: userId })
      .populate('requestId', 'title skillsRequired deadline status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length
    });
  } catch (error) {
    console.error('Get my offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve offers',
      error: error.message
    });
  }
};

// @desc    Get offer by ID
// @route   GET /api/offers/:id
// @access  Private
exports.getOfferById = async (req, res) => {
  try {
    const offerId = req.params.id;

    const offer = await Offer.findById(offerId)
      .populate('providerId', 'firstName lastName email rating profilePhoto skills')
      .populate('requestId');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve offer',
      error: error.message
    });
  }
};

// @desc    Update offer
// @route   PUT /api/offers/:id
// @access  Private (Provider only)
exports.updateOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const userId = req.user.id;
    const updates = req.body;

    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Check if user is the provider
    if (offer.providerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this offer'
      });
    }

    // Only allow updates if offer is pending
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only update pending offers'
      });
    }

    // Update allowed fields (skill exchange focused)
    const allowedUpdates = ['skillsOffered', 'estimatedTime', 'timeUnit', 'proposalMessage', 'isNegotiable'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        offer[key] = updates[key];
      }
    });

    await offer.save();

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: offer
    });
  } catch (error) {
    console.error('Update offer error:', error);
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
    const offerId = req.params.id;
    const userId = req.user.id;
    
    const offer = await Offer.findById(offerId).populate('requestId');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    const request = offer.requestId;
    if (!request || request.requesterId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this offer'
      });
    }
    
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Offer is no longer available'
      });
    }
    
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        await offer.save({ session });
        
        request.status = 'in-progress';
        request.selectedOffer = offer._id;
        request.providerId = offer.providerId;
        await request.save({ session });
        
        // Reject all other offers
        await Offer.updateMany(
          {
            requestId: request._id,
            _id: { $ne: offer._id },
            status: 'pending'
          },
          { $set: { status: 'rejected' } },
          { session }
        );
      });
    } finally {
      session.endSession();
    }
    
    await notifyOfferAccepted(offer, request);
    
    res.status(200).json({
      success: true,
      message: 'Skill exchange offer accepted successfully',
      data: { offer, request }
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
    const offerId = req.params.id;
    const userId = req.user.id;
    
    const offer = await Offer.findById(offerId).populate('requestId');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    const request = offer.requestId;
    if (!request || request.requesterId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this offer'
      });
    }
    
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Offer is no longer available'
      });
    }
    
    offer.status = 'rejected';
    offer.rejectedAt = new Date();
    await offer.save();
    
    res.status(200).json({
      success: true,
      message: 'Offer rejected successfully',
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
    const offerId = req.params.id;
    const userId = req.user.id;
    
    const offer = await Offer.findById(offerId).populate('requestId');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    if (offer.providerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this offer'
      });
    }
    
    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw offer that is not pending'
      });
    }
    
    offer.status = 'withdrawn';
    offer.withdrawnAt = new Date();
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

// @desc    Send message
// @route   POST /api/offers/:id/message
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const offerId = req.params.id;
    const userId = req.user.id;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }
    
    const offer = await Offer.findById(offerId);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    const request = await Request.findById(offer.requestId);
    const isRequester = request && request.requesterId.toString() === userId;
    const isProvider = offer.providerId.toString() === userId;
    
    if (!isRequester && !isProvider) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message this offer'
      });
    }
    
    const newMessage = {
      senderId: userId,
      message: message.trim(),
      sentAt: new Date()
    };
    
    if (!offer.messages) {
      offer.messages = [];
    }
    
    offer.messages.push(newMessage);
    await offer.save();
    
    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
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

// @desc    Add negotiation
// @route   POST /api/offers/:id/negotiation
// @access  Private
exports.addNegotiation = async (req, res) => {
  try {
    const offerId = req.params.id;
    const userId = req.user.id;
    const { skillsOffered, timeline, message } = req.body;

    const offer = await Offer.findById(offerId).populate('requestId');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    const request = offer.requestId;
    const isRequester = request && request.requesterId.toString() === userId;
    const isProvider = offer.providerId.toString() === userId;

    if (!isRequester && !isProvider) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to negotiate this offer'
      });
    }

    if (!offer.negotiations) {
      offer.negotiations = [];
    }

    offer.negotiations.push({
      userId,
      userType: isRequester ? 'requester' : 'provider',
      skillsOffered: skillsOffered || null,
      proposedTimeline: timeline || null,
      message: message || '',
      createdAt: new Date()
    });

    await offer.save();

    res.status(200).json({
      success: true,
      message: 'Negotiation proposal added successfully',
      data: offer
    });
  } catch (error) {
    console.error('Add negotiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add negotiation',
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

    const stats = await Offer.aggregate([
      { $match: { providerId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          acceptedOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          pendingOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejectedOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          completedOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const statistics = stats.length > 0 ? stats[0] : {
      totalOffers: 0,
      acceptedOffers: 0,
      pendingOffers: 0,
      rejectedOffers: 0,
      completedOffers: 0
    };

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
};

// @desc    Check if user can make an offer
// @route   GET /api/offers/check/:requestId
// @access  Private
exports.checkOfferEligibility = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user.id;
    
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    if (request.requesterId.toString() === userId) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'You cannot make an offer on your own request'
      });
    }
    
    if (request.status !== 'open') {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'This request is no longer accepting offers'
      });
    }
    
    const existingOffer = await Offer.findOne({
      requestId,
      providerId: userId,
      status: { $in: ['pending', 'accepted'] }
    });
    
    if (existingOffer) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'You have already submitted an offer for this request',
        existingOfferId: existingOffer._id
      });
    }
    
    res.status(200).json({
      success: true,
      eligible: true,
      requestDetails: {
        title: request.title,
        skillsRequired: request.skillsRequired,
        deadline: request.deadline
      }
    });
  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check eligibility',
      error: error.message
    });
  }
};