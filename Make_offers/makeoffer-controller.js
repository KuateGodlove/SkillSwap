const mongoose = require('mongoose');
const Offer = require('../Make_offers/makeoffer-model');
const Request = require("../Service_request_management/request-model");
const User = require("../authentification/user-model");
const NotificationService = require('../Notification/notification-service'); // Updated import

// Helper function for notifications - Updated to use NotificationService
const notifyNewOffer = async (offer, request) => {
  try {
    // Get requester user
    const requester = await User.findById(request.requesterId);
    
    if (!requester) {
      console.log('Requester not found for notification');
      return;
    }
    
    // Get provider user
    const provider = await User.findById(offer.providerId);
    
    // Create notification using NotificationService
    await NotificationService.createOfferReceivedNotification({
      userId: request.requesterId, // Notify the request owner
      senderId: offer.providerId,  // The one making the offer
      requestId: request._id,
      offerId: offer._id,
      budget: offer.proposedBudget,
      senderName: provider ? `${provider.firstName} ${provider.lastName}` : 'A user'
    });
    
    console.log('📢 Notification sent for new offer');
  } catch (notifError) {
    console.error('Failed to send notification:', notifError);
  }
};

const notifyOfferAccepted = async (offer, request) => {
  try {
    // Get provider user
    const provider = await User.findById(offer.providerId);
    
    if (!provider) {
      console.log('Provider not found for notification');
      return;
    }
    
    // Get requester user
    const requester = await User.findById(request.requesterId);
    
    // Create notification using NotificationService
    await NotificationService.createRequestAcceptedNotification({
      userId: offer.providerId, // Notify the provider
      acceptorId: request.requesterId, // The one who accepted
      requestId: request._id,
      requestTitle: request.title,
      acceptorName: requester ? `${requester.firstName} ${requester.lastName}` : 'Requester'
    });
    
    console.log('📢 Notification sent for accepted offer');
  } catch (notifError) {
    console.error('Failed to send notification:', notifError);
  }
};

// @desc    Create a new offer
// @route   POST /api/offers
// @access  Private
exports.createOffer = async (req, res) => {
  try {
    console.log('📩 POST /api/offers called');
    
    // Check authentication
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
      proposedBudget, 
      estimatedTime, 
      coverLetter, 
      pricingStrategy,
      timeUnit = 'days',
      hourlyRate,
      milestoneDetails,
      isNegotiable = true
    } = req.body;
    
    // Validate required fields
    if (!requestId || !proposedBudget || !coverLetter || !estimatedTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: requestId, proposedBudget, coverLetter, estimatedTime'
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
    
    // Prepare offer data
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
      timeUnit,
      coverLetter,
      pricingStrategy: pricingStrategy || 'fixed',
      isNegotiable,
      attachments
    };
    
    // Add pricing-specific fields
    if (pricingStrategy === 'hourly' && hourlyRate) {
      offerData.hourlyRate = parseFloat(hourlyRate);
    }
    
    if (pricingStrategy === 'milestone' && milestoneDetails) {
      offerData.milestoneDetails = milestoneDetails;
    }
    
    // Create offer using the model's static method
    const offer = await Offer.createOffer(offerData);
    
    // Send notification for new offer
    await notifyNewOffer(offer, request);
    
    // Also send skill match notification to the requester
    try {
      // Get provider skills to show in notification
      const providerSkills = user.skills || [];
      const matchingSkills = providerSkills.filter(skill => 
        request.skillsRequired?.includes(skill)
      );
      
      if (matchingSkills.length > 0) {
        // Create a more detailed notification
        await NotificationService.createNotification({
          userId: request.requesterId,
          type: 'skill_match',
          title: 'New Offer with Matching Skills',
          message: `${user.firstName} ${user.lastName} sent you an offer with ${matchingSkills.length} matching skills: ${matchingSkills.join(', ')}`,
          metadata: {
            requestId: request._id,
            offerId: offer._id,
            matchingSkills,
            budget: offer.proposedBudget
          },
          senderId: userId,
          senderName: `${user.firstName} ${user.lastName}`,
          senderPhoto: user.profilePhoto || '',
          important: true,
          actions: [
            {
              label: 'View Offer',
              action: 'view_offer',
              link: `/offers/${offer._id}`,
              method: 'GET'
            },
            {
              label: 'Respond',
              action: 'respond',
              link: `/offers/${offer._id}`,
              method: 'GET'
            }
          ]
        });
      }
    } catch (skillNotifError) {
      console.error('Skill match notification error:', skillNotifError);
      // Don't fail the whole request if skill notification fails
    }
    
    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully',
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
    
    // Check if user is the requester
    const request = offer.requestId;
    if (!request || request.requesterId.toString() !== userId) {
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
    
    // Start transaction (if using MongoDB transactions)
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Update offer status
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        await offer.save({ session });
        
        // Update request status
        request.status = 'in-progress';
        request.selectedOffer = offer._id;
        request.providerId = offer.providerId;
        request.acceptedBudget = offer.proposedBudget;
        await request.save({ session });
        
        // Reject all other offers for this request
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
    
    // Send notification to provider that their offer was accepted
    await notifyOfferAccepted(offer, request);
    
    // Also notify the requester (optional, but good for confirmation)
    try {
      const requester = await User.findById(userId);
      const provider = await User.findById(offer.providerId);
      
      if (requester && provider) {
        await NotificationService.createNotification({
          userId: userId, // Notify the requester themselves
          type: 'request_accepted',
          title: 'Offer Accepted Successfully',
          message: `You have accepted ${provider.firstName} ${provider.lastName}'s offer for "${request.title}"`,
          metadata: {
            requestId: request._id,
            offerId: offer._id,
            providerId: offer.providerId,
            budget: offer.proposedBudget
          },
          important: true,
          actions: [
            {
              label: 'View Request',
              action: 'view_request',
              link: `/requests/${request._id}`,
              method: 'GET'
            },
            {
              label: 'Message Provider',
              action: 'message',
              link: `/messages/compose?to=${offer.providerId}`,
              method: 'GET'
            }
          ]
        });
      }
    } catch (requesterNotifError) {
      console.error('Requester notification error:', requesterNotifError);
      // Don't fail the whole request if requester notification fails
    }
    
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
    const offerId = req.params.id;
    const userId = req.user.id;
    
    const offer = await Offer.findById(offerId).populate('requestId');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Check if user is the requester
    const request = offer.requestId;
    if (!request || request.requesterId.toString() !== userId) {
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
    offer.rejectedAt = new Date();
    await offer.save();
    
    // Optional: Add rejection reason if provided
    if (req.body.reason) {
      const rejectionReason = req.body.reason;
      if (!offer.messages) {
        offer.messages = [];
      }
      
      offer.messages.push({
        senderId: userId,
        message: `Offer rejected. Reason: ${rejectionReason}`,
        isSystemMessage: true,
        sentAt: new Date()
      });
      await offer.save();
      
      // Send notification to provider about rejection
      try {
        const requester = await User.findById(userId);
        
        await NotificationService.createNotification({
          userId: offer.providerId,
          type: 'offer_declined',
          title: 'Offer Declined',
          message: `Your offer for "${request.title}" was declined. Reason: ${rejectionReason}`,
          metadata: {
            requestId: request._id,
            offerId: offer._id,
            rejectionReason
          },
          important: true,
          actions: [
            {
              label: 'View Offer',
              action: 'view_offer',
              link: `/offers/${offer._id}`,
              method: 'GET'
            },
            {
              label: 'Find Other Requests',
              action: 'browse_requests',
              link: `/requests`,
              method: 'GET'
            }
          ]
        });
      } catch (notifError) {
        console.error('Rejection notification error:', notifError);
      }
    }
    
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
    
    // Check ownership
    if (offer.providerId.toString() !== userId) {
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
    offer.withdrawnAt = new Date();
    await offer.save();
    
    // Send notification to requester
    try {
      const request = offer.requestId;
      const provider = await User.findById(userId);
      
      if (request && provider) {
        await NotificationService.createNotification({
          userId: request.requesterId,
          type: 'offer_withdrawn',
          title: 'Offer Withdrawn',
          message: `${provider.firstName} ${provider.lastName} has withdrawn their offer for "${request.title}"`,
          metadata: {
            requestId: request._id,
            offerId: offer._id,
            providerId: userId
          },
          senderId: userId,
          senderName: `${provider.firstName} ${provider.lastName}`,
          senderPhoto: provider.profilePhoto || '',
          actions: [
            {
              label: 'View Request',
              action: 'view_request',
              link: `/requests/${request._id}`,
              method: 'GET'
            },
            {
              label: 'Message Provider',
              action: 'message',
              link: `/messages/compose?to=${userId}`,
              method: 'GET'
            }
          ]
        });
      }
    } catch (notifError) {
      console.error('Withdrawal notification error:', notifError);
    }
    
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
    
    // Check if user is authorized (either requester or provider)
    const request = await Request.findById(offer.requestId);
    const isRequester = request && request.requesterId.toString() === userId;
    const isProvider = offer.providerId.toString() === userId;
    
    if (!isRequester && !isProvider) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message this offer'
      });
    }
    
    // Add message
    const newMessage = {
      senderId: userId,
      message: message.trim(),
      sentAt: new Date()
    };
    
    // Initialize messages array if it doesn't exist
    if (!offer.messages) {
      offer.messages = [];
    }
    
    offer.messages.push(newMessage);
    await offer.save();
    
    // Send notification to the other party
    try {
      const recipientId = isRequester ? offer.providerId : request.requesterId;
      const sender = await User.findById(userId);
      const recipient = await User.findById(recipientId);
      
      if (sender && recipient) {
        await NotificationService.createMessageReceivedNotification({
          userId: recipientId,
          senderId: userId,
          conversationId: `offer_${offer._id}`,
          messagePreview: message.trim().substring(0, 100)
        });
      }
    } catch (notifError) {
      console.error('Message notification error:', notifError);
    }
    
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

// ... (rest of the controller remains the same)

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
    
    // Check if user is the requester
    if (request.requesterId.toString() === userId) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'You cannot make an offer on your own request'
      });
    }
    
    // Check if request is still open
    if (request.status !== 'open') {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'This request is no longer accepting offers'
      });
    }
    
    // Check if user already has a pending/accepted offer
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
    
    // All checks passed
    res.status(200).json({
      success: true,
      eligible: true,
      requestDetails: {
        title: request.title,
        budget: request.budget,
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