// Service_request_management/request-controller.js
const Request = require('./request-model');
const User = require('../authentification/user-model'); // Keep your original path
const NotificationService = require('../Notification/notification-service');
const mongoose = require('mongoose');

// Helper function to send notifications to users with matching skills
const notifyMatchingUsers = async (request) => {
  try {
    if (!request.skillsRequired || request.skillsRequired.length === 0) {
      console.log('No skills specified, skipping skill match notifications');
      return;
    }

    console.log(`🔍 Finding users with matching skills: ${request.skillsRequired.join(', ')}`);
    
    // First, find all active users except the requester
    const allActiveUsers = await User.find({
      _id: { $ne: request.requesterId },
      isActive: { $ne: false } // Use $ne: false to handle undefined as true
    })
    .select('_id firstName lastName email skills notificationPreferences')
    .lean();

    console.log(`✅ Found ${allActiveUsers.length} active users (excluding requester)`);
    
    // Filter users with matching skills in JavaScript
    const filteredUsers = allActiveUsers.filter(user => {
      if (!user.skills || !Array.isArray(user.skills) || user.skills.length === 0) {
        return false;
      }
      
      const userSkills = user.skills.map(s => s.toLowerCase().trim());
      const requestSkills = request.skillsRequired.map(s => s.toLowerCase().trim());
      
      // Check if any skill matches (case-insensitive, trimmed)
      return userSkills.some(userSkill => 
        requestSkills.some(requestSkill => {
          // Check for exact match or partial match
          return userSkill === requestSkill || 
                 userSkill.includes(requestSkill) || 
                 requestSkill.includes(userSkill);
        })
      );
    });

    console.log(`✅ Found ${filteredUsers.length} users with matching skills`);

    if (filteredUsers.length === 0) {
      return;
    }

    const notificationPromises = filteredUsers.map(async (user) => {
      try {
        const userSkills = user.skills || [];
        const requestSkills = request.skillsRequired || [];
        
        // Find matching skills (case-insensitive, trimmed)
        const matchingSkills = userSkills.filter(userSkill => {
          const userSkillLower = userSkill.toLowerCase().trim();
          return requestSkills.some(requestSkill => {
            const requestSkillLower = requestSkill.toLowerCase().trim();
            return userSkillLower === requestSkillLower ||
                   userSkillLower.includes(requestSkillLower) ||
                   requestSkillLower.includes(userSkillLower);
          });
        });

        if (matchingSkills.length === 0) {
          return;
        }

        // Format deadline
        const deadlineText = request.deadline ? 
          new Date(request.deadline).toLocaleDateString() : 
          'No deadline';

        // Get location type
        const locationType = request.locationType || 'remote';

        await NotificationService.createNotification({
          userId: user._id,
          type: 'skill_match',
          title: 'New Skill Exchange Request',
          message: `A new request "${request.title}" matches ${matchingSkills.length} of your skills: ${matchingSkills.slice(0, 3).join(', ')}${matchingSkills.length > 3 ? '...' : ''}`,
          excerpt: `${locationType === 'remote' ? 'Remote' : locationType} • Deadline: ${deadlineText}`,
          metadata: {
            requestId: request._id,
            requestTitle: request.title,
            matchingSkills,
            skillCount: matchingSkills.length,
            locationType: locationType,
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
              icon: 'handshake',
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
      }
    });

    await Promise.allSettled(notificationPromises);
    console.log(`✅ Completed sending notifications for request ${request._id}`);
  } catch (error) {
    console.error('❌ Error in notifyMatchingUsers:', error);
  }
};

// @desc    Create a new skill exchange request
// @route   POST /api/requests
// @access  Private
exports.createRequest = async (req, res) => {
  try {
    console.log('📝 ======= CREATE REQUEST CALLED =======');
    console.log('📝 User ID:', req.user?.id);
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    if (!req.user || !req.user.id) {
      console.log('❌ No user authenticated');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    
    // Find user - handle potential errors
    let user;
    try {
      user = await User.findById(userId);
    } catch (userError) {
      console.error('❌ Error finding user:', userError);
      return res.status(500).json({
        success: false,
        message: 'Error finding user information'
      });
    }
    
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ User found: ${user.firstName} ${user.lastName}`);

    // Validate required fields
    console.log('🔍 Validating required fields:');
    console.log('  - title:', req.body.title ? `✓ "${req.body.title}"` : '✗ MISSING');
    console.log('  - description:', req.body.description ? `✓ (${req.body.description.length} chars)` : '✗ MISSING');
    
    if (!req.body.title || !req.body.description) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide title and description'
      });
    }

    // Parse estimatedTime with better error handling
    let estimatedTime = 1;
    if (req.body.estimatedTime) {
      estimatedTime = parseInt(req.body.estimatedTime);
      if (isNaN(estimatedTime) || estimatedTime < 1) {
        estimatedTime = 1;
      }
    }

    // Handle deadline with default
    let deadline;
    if (req.body.deadline) {
      deadline = new Date(req.body.deadline);
      if (isNaN(deadline.getTime())) {
        console.log('⚠️ Invalid deadline format, using default (2 weeks from now)');
        deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }
    } else {
      deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }

    // Create request data - NO BUDGET/PAYMENT
    const requestData = {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      detailedDescription: req.body.detailedDescription || req.body.description,
      category: req.body.category || 'other',
      locationType: req.body.locationType || 'remote',
      location: req.body.location || '',
      estimatedTime: estimatedTime,
      timeUnit: req.body.timeUnit || 'days',
      deadline: deadline,
      skillsRequired: Array.isArray(req.body.skillsRequired) ? 
        req.body.skillsRequired.map(s => s.trim()).filter(s => s.length > 0) : [],
      skillsCanOffer: Array.isArray(req.body.skillsCanOffer) ? 
        req.body.skillsCanOffer.map(s => s.trim()).filter(s => s.length > 0) : [],
      tags: Array.isArray(req.body.tags) ? 
        req.body.tags.map(t => t.trim()).filter(t => t.length > 0) : [],
      exchangeType: req.body.exchangeType || 'direct_exchange',
      contactPreference: req.body.contactPreference || 'platform',
      
      // User data
      requesterId: userId,
      requesterName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      requesterEmail: user.email || '',
      requesterPhoto: user.profilePhoto || '',
      requesterRating: (user.rating && user.rating.average) || 0,
      
      // Defaults
      status: 'open',
      offersCount: 0,
      views: 0,
      isActive: true,
      attachments: req.body.attachments || []
    };

    console.log('📦 Creating request with data:', JSON.stringify(requestData, null, 2));
    
    // Create request with error handling
    let request;
    try {
      request = await Request.create(requestData);
      console.log(`✅ Request created: ${request._id}`);
    } catch (createError) {
      console.error('❌ Error creating request:', createError);
      
      if (createError.name === 'ValidationError') {
        const messages = Object.values(createError.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create request',
        error: createError.message
      });
    }
    
    // Notify matching users (async, don't wait)
    notifyMatchingUsers(request).catch(err => {
      console.error('Background notification error:', err);
    });

    // Confirm to requester
    try {
      await NotificationService.createNotification({
        userId: userId,
        type: 'system_alert',
        title: 'Skill Exchange Request Posted',
        message: `Your request "${request.title}" has been posted successfully.`,
        excerpt: `We'll notify users with matching skills.`,
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
          }
        ]
      });
    } catch (notifError) {
      console.error('Requester notification error:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Skill exchange request posted successfully',
      data: request
    });
  } catch (error) {
    console.error('❌ Create request error:', error);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A similar request already exists',
        field: Object.keys(error.keyPattern)[0]
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create request',
      error: error.message
    });
  }
};

// ... rest of your controller functions remain the same