// controllers/authController.js
const User = require('../Models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Register a new client
// @route   POST /api/auth/register/client
// @access  Public
exports.registerClient = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, companyName, jobTitle, country } = req.body;

    // Basic validation to ensure correct endpoint is being used
    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for client registration. Please ensure you are using the correct registration form.'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Set token expiry (e.g., 24 hours)
    const emailVerificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
      throw new Error("Password hashing failed: " + error.message)
    }

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
      emailVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpire
    });

    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const message = `Thank you for registering! Please click the link below to verify your email address:\n\n${verificationUrl}\n\nIf you did not create an account, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'SkillSwapp - Email Verification',
        message,
      });
    } catch (err) {
      console.error('Email sending error during client registration (non-fatal):', err);
      // We don't fail the registration if the email fails to send.
      // A "resend verification" feature would be useful here.
    }

    // Generate JWT
    let token;
    try {
      token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    } catch (error) {
      throw new Error("JWT signing failed: " + error.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Client registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Client registration failed due to a server error.',
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

    // Basic validation to ensure correct endpoint is being used
    if (!email || !password || !firstName || !lastName || !businessName || !specialization) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for provider application. Please ensure you are using the correct registration form.'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Set token expiry (e.g., 24 hours)
    const emailVerificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Normalize skills to an array of trimmed strings
    let normalizedSkills = [];
    if (Array.isArray(skills)) {
      normalizedSkills = skills
        .map(s => (typeof s === 'string' ? s.trim() : String(s).trim()))
        .filter(Boolean);
    } else if (typeof skills === 'string') {
      normalizedSkills = skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else if (skills != null) {
      normalizedSkills = [String(skills).trim()].filter(Boolean);
    }

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
        yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        specialization,
        skills: normalizedSkills,
        hourlyRate: hourlyRate ? parseInt(hourlyRate, 10) : null,
        minimumProjectSize: minimumProjectSize ? parseInt(minimumProjectSize, 10) : null,
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
      emailVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpire
    });

    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const message = `Thank you for applying! Please click the link below to verify your email address while we review your application:\n\n${verificationUrl}\n\nIf you did not create an account, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'SkillSwapp - Verify Your Email',
        message,
      });
    } catch (err) {
      console.error('Email sending error during provider registration (non-fatal):', err);
      // We don't fail the registration if the email fails to send.
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. Please check your email to verify your account.',
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
      message: 'Provider application failed due to a server error.',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;

    // Find user with normalized email
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`🔍 [Login] User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    let isValid;
    try {
      isValid = await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error(`❌ [Login] Bcrypt error for ${email}:`, error.message);
      throw new Error("Password comparison failed");
    }

    if (!isValid) {
      console.log(`❌ [Login] Password mismatch: ${email}`);
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

    // Add redirectUrl to the user data payload
    userData.redirectUrl = user.role === 'admin' ? '/admin' : '/';
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

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password.\n\nPlease click on the following link to reset your password:\n\n${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
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

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    } catch (error) { throw new Error("Password hashing failed: " + error.message) }


    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

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

    // Hash the incoming token to match the one in the database
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by token that is not expired
    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    // Update user to be verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};
