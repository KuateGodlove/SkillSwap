const Request = require('./request-model');
const mongoose = require('mongoose');

// @desc    Create a new request
// @route   POST /api/requests
// @access  Public (temporarily for testing)
exports.createRequest = async (req, res) => {
  try {
    console.log('📝 Create request called with:', req.body);
    
    // Simple validation
    if (!req.body.title || !req.body.description || !req.body.budget) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and budget'
      });
    }

    // Create request with minimal data
    const requestData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || 'other',
      budget: parseFloat(req.body.budget) || 0,
      locationType: req.body.locationType || 'remote',
      deadline: req.body.deadline ? new Date(req.body.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      urgency: req.body.urgency || 'normal',
      skillsRequired: req.body.skillsRequired || [],
      tags: req.body.tags || [],
      contactPreference: req.body.contactPreference || 'platform',
      
      // Mock user data for testing
      requesterId: new mongoose.Types.ObjectId(), // Mock ID
      requesterName: 'Test User',
      requesterEmail: 'test@example.com',
      requesterPhoto: '',
      
      // Default values
      status: 'open',
      offersCount: 0,
      views: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📦 Creating request with data:', requestData);
    const request = await Request.create(requestData);

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
        { description: { $regex: search, $options: 'i' } }
      ];
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
        sortOptions = { offersCount: -1 };
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

    console.log(`✅ Found ${requests.length} requests`);

    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      statusCounts,
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
// @route   GET /api/requests/user/:userId
// @access  Public (for testing)
exports.getUserRequests = async (req, res) => {
  try {
    const userId = req.params.userId || 'test_user_id';
    const { status, page = 1, limit = 10 } = req.query;

    const query = { requesterId: userId, isActive: true };
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const requests = await Request.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests
    });
  } catch (error) {
    console.error('❌ Get user requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user requests',
      error: error.message
    });
  }
};

// @desc    Update request
// @route   PUT /api/requests/:id
// @access  Public (for testing)
exports.updateRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
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
// @access  Public (for testing)
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Soft delete
    request.isActive = false;
    await request.save();

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
// @access  Public (for testing)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
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

    request.status = status;
    await request.save();

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

// @desc    Save/unsave request
// @route   POST /api/requests/:id/save
// @access  Public (for testing)
exports.toggleSaveRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const userId = 'test_user_id';
    const isSaved = request.savedBy.includes(userId);

    if (isSaved) {
      request.savedBy.pull(userId);
      await request.save();
      
      res.status(200).json({
        success: true,
        message: 'Request unsaved',
        saved: false
      });
    } else {
      request.savedBy.push(userId);
      await request.save();
      
      res.status(200).json({
        success: true,
        message: 'Request saved',
        saved: true
      });
    }
  } catch (error) {
    console.error('❌ Toggle save error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save request',
      error: error.message
    });
  }
};

// @desc    Get saved requests
// @route   GET /api/requests/saved
// @access  Public (for testing)
exports.getSavedRequests = async (req, res) => {
  try {
    const userId = 'test_user_id';
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const requests = await Request.find({
      savedBy: userId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments({
      savedBy: userId,
      isActive: true
    });

    res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests
    });
  } catch (error) {
    console.error('❌ Get saved requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved requests',
      error: error.message
    });
  }
};

// @desc    Get request statistics
// @route   GET /api/requests/stats
// @access  Public (for testing)
exports.getRequestStats = async (req, res) => {
  try {
    const userId = 'test_user_id';

    const stats = await Request.aggregate([
      {
        $match: {
          requesterId: userId,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' },
          avgBudget: { $avg: '$budget' }
        }
      }
    ]);

    const totalRequests = await Request.countDocuments({
      requesterId: userId,
      isActive: true
    });

    const statsObject = stats.reduce((acc, stat) => {
      acc[stat._id] = stat;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        statusStats: statsObject,
        totalRequests,
        views: 0 // Simplified for now
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request statistics',
      error: error.message
    });
  }
};