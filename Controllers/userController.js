const User = require('../Models/User');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profile', 
      error: error.message 
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates.role;
    delete updates.status;
    delete updates._id;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/avatar
// @access  Private
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload avatar', 
      error: error.message 
    });
  }
};

// @desc    Get saved providers
// @route   GET /api/users/saved-providers
// @access  Private
exports.getSavedProviders = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedProviders', 'firstName lastName providerDetails rating');

    res.json({
      success: true,
      providers: user.savedProviders || []
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch saved providers', 
      error: error.message 
    });
  }
};

// @desc    Save a provider
// @route   POST /api/users/saved-providers/:providerId
// @access  Private
exports.saveProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { savedProviders: providerId } }
    );

    res.json({
      success: true,
      message: 'Provider saved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to save provider', 
      error: error.message 
    });
  }
};

// @desc    Remove saved provider
// @route   DELETE /api/users/saved-providers/:providerId
// @access  Private
exports.removeSavedProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { savedProviders: providerId } }
    );

    res.json({
      success: true,
      message: 'Provider removed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove provider', 
      error: error.message 
    });
  }
};

// @desc    Get public provider profile
// @route   GET /api/users/:providerId/public
// @access  Public
exports.getPublicProfile = async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await User.findOne({
      _id: providerId,
      role: 'provider',
      status: 'approved'
    }).select('firstName lastName providerDetails membership.tier createdAt');

    if (!provider) {
      return res.status(404).json({ 
        success: false,
        message: 'Provider not found' 
      });
    }

    res.json({
      success: true,
      provider
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch provider', 
      error: error.message 
    });
  }
};

// @desc    Get provider stats
// @route   GET /api/users/provider/stats
// @access  Private
exports.getProviderStats = async (req, res) => {
  try {
    const providerId = req.user._id;

    // You would get these from Order and Quote models
    const stats = {
      activeProjects: 3,
      completedProjects: 24,
      pendingQuotes: 8,
      totalEarnings: 85420,
      rating: 4.9,
      totalReviews: 42
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch stats', 
      error: error.message 
    });
  }
};