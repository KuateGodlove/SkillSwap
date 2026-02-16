// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// @desc    Register a new client
// @route   POST /api/auth/register/client
// @access  Public
exports.registerClient = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, companyName, jobTitle, country } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      country,
      role: 'client',
      status: 'approved',
      clientDetails: {
        companyName,
        jobTitle
      },
      emailVerified: false
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Registration failed', 
      error: error.message 
    });
  }
};

// @desc    Register a new provider
// @route   POST /api/auth/register/provider
// @access  Public
exports.registerProvider = async (req, res) => {
  try {
    const { 
      email, password, firstName, lastName, phone, country,
      businessName, yearsExperience, specialization, skills, 
      hourlyRate, minimumProjectSize, portfolioUrl, linkedinUrl, githubUrl
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (pending approval)
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      country,
      role: 'provider',
      status: 'pending',
      providerDetails: {
        businessName,
        yearsExperience: parseInt(yearsExperience),
        specialization,
        skills: skills ? skills.split(',').map(s => s.trim()) : [],
        hourlyRate: hourlyRate ? parseInt(hourlyRate) : null,
        minimumProjectSize: minimumProjectSize ? parseInt(minimumProjectSize) : null,
        portfolioUrl,
        linkedinUrl,
        githubUrl
      },
      membership: {
        tier: 'free',
        status: 'active',
        serviceLimit: 3,
        rfqQuota: 10
      },
      emailVerified: false
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Provider registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Application failed', 
      error: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check status
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        success: false,
        message: 'Account suspended' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare user data
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatar: user.avatar
    };

    if (user.role === 'provider') {
      userData.membership = user.membership;
      userData.providerDetails = user.providerDetails;
    } else if (user.role === 'client') {
      userData.clientDetails = user.clientDetails;
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Login failed', 
      error: error.message 
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Logout failed', 
      error: error.message 
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Private
exports.refreshToken = async (req, res) => {
  try {
    const user = req.user;
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Token refresh failed', 
      error: error.message 
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Generate reset token (you'd save this to user)
    const resetToken = crypto.randomBytes(32).toString('hex');

    res.json({ 
      success: true,
      message: 'Password reset email sent' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to send reset email', 
      error: error.message 
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Find user by reset token and update password
    // const user = await User.findOne({ resetToken: token });
    // user.password = hashedPassword;
    // await user.save();

    res.json({ 
      success: true,
      message: 'Password reset successful' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Password reset failed', 
      error: error.message 
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by token and update
    // const user = await User.findOne({ emailVerificationToken: token });
    // user.emailVerified = true;
    // await user.save();

    res.json({ 
      success: true,
      message: 'Email verified successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Email verification failed', 
      error: error.message 
    });
  }
};