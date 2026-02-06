const User = require('../authentification/user-model');
const jwt = require('jsonwebtoken');

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select('-password')
      .populate('skills', 'name level')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// @desc    Get user profile by ID
// @route   GET /api/profile/:userId
// @access  Public
exports.getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -email -phoneNumber')
      .populate('skills', 'name level')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Get profile by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      bio,
      location,
      skills,
      availability,
      contactPreference
    } = req.body;

    // Build update object
    const updateData = {};

    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (bio) updateData.bio = bio.trim();
    if (location) updateData.location = location.trim();
    if (availability) updateData.availability = availability;
    if (contactPreference) updateData.contactPreference = contactPreference;

    // Handle skills array
    if (skills && Array.isArray(skills)) {
      const validatedSkills = skills
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
      
      if (validatedSkills.length > 0) {
        updateData.skills = validatedSkills;
      }
    }

    // Handle profile photo upload
    if (req.file) {
      updateData.profilePhoto = req.file.path; // Cloudinary URL
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);

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
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// @desc    Update user skills
// @route   PUT /api/profile/skills
// @access  Private
exports.updateSkills = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills } = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Skills must be a non-empty array'
      });
    }

    const validatedSkills = skills
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    if (validatedSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid skill is required'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { skills: validatedSkills } },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Skills updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('❌ Update skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update skills',
      error: error.message
    });
  }
};

// @desc    Update user availability
// @route   PUT /api/profile/availability
// @access  Private
exports.updateAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { availability } = req.body;

    if (!availability) {
      return res.status(400).json({
        success: false,
        message: 'Availability data is required'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { availability } },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('❌ Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: error.message
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/profile/photo
// @access  Private
// In profile-controller.js, update the uploadProfilePhoto function:
// Add these functions to your profile-controller.js file

// @desc    Delete profile photo
// @route   DELETE /api/profile/photo
// @access  Private
exports.deleteProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $unset: { profilePhoto: 1 } },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('❌ Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error: error.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/profile/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('rating skillCompleted createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        rating: user.rating || 0,
        skillsCompleted: user.skillCompleted || 0,
        memberSince: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};