const Request = require('./request-model');
const User = require('../authentification/user-model');
const NotificationService = require('../Notification/notification-service');
const mongoose = require('mongoose');

// Helper function to send notifications to users with matching skills
const notifyMatchingUsers = async (request) => {
  try {
    // Only send notifications if request has required skills
    if (!request.skillsRequired || request.skillsRequired.length === 0) {
      console.log('No skills specified, skipping skill match notifications');
      return;
    }

    console.log(`🔍 Finding users with matching skills: ${request.skillsRequired.join(', ')}`);
    
    // Find active users with matching skills (limit to prevent too many notifications)
    const matchingUsers = await User.find({
      skills: { $in: request.skillsRequired },
      _id: { $ne: request.requesterId }, // Don't notify the requester
      isActive: true,
      notificationPreferences: { $ne: false } // Only users who want notifications
    })
    .select('_id firstName lastName email skills notificationPreferences')
    .limit(50) // Limit to prevent notification spam
    .lean();

    console.log(`✅ Found ${matchingUsers.length} users with matching skills`);

    if (matchingUsers.length === 0) {
      return;
    }

    // Send notifications in batches
    const notificationPromises = matchingUsers.map(async (user) => {
      try {
        // Calculate matching skills
        const userSkills = user.skills || [];
        const matchingSkills = userSkills.filter(skill => 
          request.skillsRequired.includes(skill)
        );

        if (matchingSkills.length === 0) {
          return;
        }

        // Create skill match notification
        await NotificationService.createNotification({
          userId: user._id,
          type: 'skill_match',
          title: 'New Request Matches Your Skills',
          message: `A new request "${request.title}" matches ${matchingSkills.length} of your skills: ${matchingSkills.slice(0, 3).join(', ')}${matchingSkills.length > 3 ? '...' : ''}`,
          excerpt: `Budget: $${request.budget} • ${request.locationType === 'remote' ? 'Remote' : request.location || 'Location not specified'}`,
          metadata: {
            requestId: request._id,
            requestTitle: request.title,
            matchingSkills,
            skillCount: matchingSkills.length,
            budget: request.budget,
            locationType: request.locationType,
            deadline: request.deadline
          },
          important: true,
          priority: 'high',
          actions: [
            {
              label: 'View Request',
              action: 'view_request',
              link: `/requests/${request._id}`,
              method: 'GET',
              icon: 'eye',
              color: 'primary'
            },
            {
              label: 'Make Offer',
              action: 'make_offer',
              link: `/offers/create/${request._id}`,
              method: 'GET',
              icon: 'dollar-sign',
              color: 'success'
            }
          ],
          cta: {
            label: 'Make an Offer',
            link: `/offers/create/${request._id}`,
            method: 'GET'
          }
        });

        console.log(`📢 Sent skill match notification to user ${user._id}`);
      } catch (error) {
        console.error(`❌ Failed to notify user ${user._id}:`, error.message);
        // Don't throw, continue with other users
      }
    });

    // Wait for all notifications to be created
    await Promise.allSettled(notificationPromises);
    
    console.log(`✅ Completed sending notifications for request ${request._id}`);
  } catch (error) {
    console.error('❌ Error in notifyMatchingUsers:', error);
    // Don't fail the request creation if notifications fail
  }
};

// @desc    Create a new request
// @route   POST /api/requests
// @access  Private
exports.createRequest = async (req, res) => {
  try {
    console.log('📝 Create request called with:', req.body);
    console.log('👤 User:', req.user);
    
    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Simple validation
    if (!req.body.title || !req.body.description || !req.body.budget) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and budget'
      });
    }

    // Create request data with user info
    const requestData = {
      title: req.body.title,
      description: req.body.description,
      detailedDescription: req.body.detailedDescription || req.body.description,
      category: req.body.category || 'other',
      budget: parseFloat(req.body.budget) || 0,
      locationType: req.body.locationType || 'remote',
      location: req.body.location || '',
      deadline: req.body.deadline ? new Date(req.body.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      urgency: req.body.urgency || 'normal',
      skillsRequired: req.body.skillsRequired || [],
      tags: req.body.tags || [],
      contactPreference: req.body.contactPreference || 'platform',
      
      // Real user data
      requesterId: userId,
      requesterName: `${user.firstName} ${user.lastName}`,
      requesterEmail: user.email,
      requesterPhoto: user.profilePhoto || '',
      requesterRating: user.rating || 0,
      
      // Default values
      status: 'open',
      offersCount: 0,
      views: 0,
      isActive: true,
      isFeatured: req.body.isFeatured || false,
      isUrgent: req.body.urgency === 'urgent',
      attachments: req.body.attachments || []
    };

    console.log('📦 Creating request with data:', requestData);
    const request = await Request.create(requestData);

    console.log(`✅ Request created: ${request._id}`);
    
    // Send notifications to users with matching skills (async, don't wait)
    notifyMatchingUsers(request).catch(err => {
      console.error('Background notification error:', err);
    });

    // Also send a notification to the requester (confirmation)
    try {
      await NotificationService.createNotification({
        userId: userId,
        type: 'system_alert',
        title: 'Request Created Successfully',
        message: `Your request "${request.title}" has been published successfully.`,
        excerpt: `We'll notify you when someone makes an offer.`,
        metadata: {
          requestId: request._id,
          requestTitle: request.title
        },
        important: false,
        actions: [
          {
            label: 'View Request',
            action: 'view_request',
            link: `/requests/${request._id}`,
            method: 'GET'
          },
          {
            label: 'Share Request',
            action: 'share_request',
            link: `/requests/${request._id}/share`,
            method: 'GET'
          }
        ]
      });
    } catch (notifError) {
      console.error('Requester notification error:', notifError);
      // Don't fail the request creation
    }

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: request
    });
  } catch (error) {
    console.error('❌ Create request error:', error);
    
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
      message: 'Failed to create request',
      error: error.message
    });
  }
};

// @desc    Get all requests
// @route   GET /api/requests
// @access  Public
exports.getRequests = async (req, res) => {
  try {
    console.log('📋 Get requests called with query:', req.query);
    
    const { 
      status = 'all', 
      category, 
      locationType, 
      minBudget, 
      maxBudget, 
      search,
      sort = 'newest',
      dateRange,
      skills,
      page = 1, 
      limit = 12 
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Location filter
    if (locationType && locationType !== 'all') {
      query.locationType = locationType;
    }
    
    // Budget filter
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = parseFloat(minBudget);
      if (maxBudget) query.budget.$lte = parseFloat(maxBudget);
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { detailedDescription: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Skills filter
    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : skills.split(',');
      query.skillsRequired = { $in: skillArray };
    }
    
    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const days = parseInt(dateRange);
      if (days > 0) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        query.createdAt = { $gte: dateThreshold };
      }
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    switch (sort) {
      case 'deadline':
        sortOptions = { deadline: 1 };
        break;
      case 'budget-high':
        sortOptions = { budget: -1 };
        break;
      case 'budget-low':
        sortOptions = { budget: 1 };
        break;
      case 'popular':
        sortOptions = { offersCount: -1, views: -1 };
        break;
      case 'urgent':
        sortOptions = { isUrgent: -1, createdAt: -1 };
        break;
      case 'featured':
        sortOptions = { isFeatured: -1, createdAt: -1 };
        break;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const requests = await Request.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get counts
    const total = await Request.countDocuments(query);
    
    // Status counts
    const statusCounts = {
      all: await Request.countDocuments({ isActive: true }),
      open: await Request.countDocuments({ status: 'open', isActive: true }),
      'in-progress': await Request.countDocuments({ status: 'in-progress', isActive: true }),
      completed: await Request.countDocuments({ status: 'completed', isActive: true }),
      closed: await Request.countDocuments({ status: 'closed', isActive: true }),
      cancelled: await Request.countDocuments({ status: 'cancelled', isActive: true })
    };

    // Get category counts
    const categoryCounts = await Request.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`✅ Found ${requests.length} requests`);

    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      statusCounts,
      categoryCounts,
      data: requests
    });
  } catch (error) {
    console.error('❌ Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
};

// @desc    Get single request
// @route   GET /api/requests/:id
// @access  Public
exports.getRequestById = async (req, res) => {
  try {
    console.log(`🔍 Get request by ID: ${req.params.id}`);
    
    const request = await Request.findById(req.params.id).lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Increment view count
    await Request.findByIdAndUpdate(req.params.id, { 
      $inc: { views: 1 } 
    });

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('❌ Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request',
      error: error.message
    });
  }
};

// @desc    Get user's requests
// @route   GET /api/requests/user/my-requests
// @access  Private
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { requesterId: userId, isActive: true };
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const requests = await Request.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Request.countDocuments(query);

    // Get statistics for the user
    const stats = await Request.aggregate([
      {
        $match: {
          requesterId: new mongoose.Types.ObjectId(userId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' },
          totalOffers: { $sum: '$offersCount' },
          totalViews: { $sum: '$views' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('❌ Get user requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your requests',
      error: error.message
    });
  }
};

// @desc    Update request
// @route   PUT /api/requests/:id
// @access  Private
exports.updateRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check ownership
    if (request.requesterId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this request'
      });
    }

    // Can't update if not open or in-progress
    if (!['open', 'in-progress'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a completed or closed request'
      });
    }

    // Update data
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Handle budget conversion
    if (req.body.budget) {
      updateData.budget = parseFloat(req.body.budget);
    }

    // Handle deadline conversion
    if (req.body.deadline) {
      updateData.deadline = new Date(req.body.deadline);
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('❌ Update request error:', error);
    
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
      message: 'Failed to update request',
      error: error.message
    });
  }
};

// @desc    Delete request
// @route   DELETE /api/requests/:id
// @access  Private
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check ownership
    if (request.requesterId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this request'
      });
    }

    // Can only delete open requests
    if (request.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete open requests'
      });
    }

    // Soft delete
    request.isActive = false;
    request.status = 'cancelled';
    await request.save();

    // Notify any offer providers
    try {
      // In a real implementation, you would notify users who made offers
      console.log(`Request ${request._id} deleted, would notify offer providers`);
    } catch (notifError) {
      console.error('Delete notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete request',
      error: error.message
    });
  }
};

// @desc    Update request status
// @route   PATCH /api/requests/:id/status
// @access  Private
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['open', 'in-progress', 'completed', 'closed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check ownership (except for provider completing work)
    const isRequester = request.requesterId.toString() === req.user.id;
    const isProvider = request.providerId && request.providerId.toString() === req.user.id;
    
    // Only requester can change to most statuses
    if (!isRequester && status !== 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update request status'
      });
    }
    
    // Provider can only mark as completed
    if (status === 'completed' && !isRequester && !isProvider) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this request'
      });
    }

    const oldStatus = request.status;
    request.status = status;
    
    // Add status change log
    if (!request.statusHistory) {
      request.statusHistory = [];
    }
    
    request.statusHistory.push({
      status,
      changedBy: req.user.id,
      reason,
      changedAt: new Date()
    });
    
    await request.save();

    // Send notifications based on status change
    try {
      let notificationData = null;
      
      if (status === 'in-progress' && oldStatus === 'open') {
        // Request started - notify provider
        notificationData = {
          userId: request.providerId,
          type: 'request_accepted',
          title: 'Request Started',
          message: `The request "${request.title}" has started. You can now begin work.`,
          metadata: {
            requestId: request._id,
            requestTitle: request.title
          }
        };
      } else if (status === 'completed') {
        // Request completed - notify requester
        notificationData = {
          userId: request.requesterId,
          type: 'request_completed',
          title: 'Request Completed',
          message: `The request "${request.title}" has been marked as completed.`,
          metadata: {
            requestId: request._id,
            requestTitle: request.title,
            completedBy: req.user.id
          }
        };
      }
      
      if (notificationData) {
        await NotificationService.createNotification(notificationData);
      }
    } catch (notifError) {
      console.error('Status change notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: `Request status updated to ${status}`,
      data: request
    });
  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request status',
      error: error.message
    });
  }
};

// ... (rest of the functions remain similar with authentication checks added)