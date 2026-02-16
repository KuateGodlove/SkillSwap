// controllers/membershipController.js
const User = require('../models/User');

// Membership plans configuration
const MEMBERSHIP_PLANS = {
  gold: {
    name: 'Gold Supplier',
    badge: '⭐ Gold',
    price: {
      quarterly: 299,
      annual: 999
    },
    limits: {
      services: 10,
      rfqQuota: 50,
      teamMembers: 1,
      featuredListings: 1
    },
    features: [
      'Verified Supplier Badge',
      '10 Active Service Listings',
      '50 RFQ Quotes per Month',
      'Basic Analytics',
      'Email Support',
      '48hr Response Time'
    ]
  },
  platinum: {
    name: 'Platinum Supplier',
    badge: '💎 Platinum',
    price: {
      quarterly: 699,
      annual: 2499
    },
    limits: {
      services: 50,
      rfqQuota: 200,
      teamMembers: 5,
      featuredListings: 3
    },
    features: [
      'All Gold Features',
      '50 Active Service Listings',
      '200 RFQ Quotes per Month',
      'Advanced Analytics',
      'Priority Support',
      '24hr Response Time',
      'Team Member Access (5 users)',
      '3 Featured Listings per Month'
    ]
  },
  diamond: {
    name: 'Diamond Supplier',
    badge: '👑 Diamond',
    price: {
      quarterly: 1499,
      annual: 5999
    },
    limits: {
      services: 'Unlimited',
      rfqQuota: 'Unlimited',
      teamMembers: 20,
      featuredListings: 10
    },
    features: [
      'All Platinum Features',
      'Unlimited Service Listings',
      'Unlimited RFQ Quotes',
      'Custom Analytics',
      'Dedicated Account Manager',
      '1hr Response Time',
      'Team Member Access (20 users)',
      '10 Featured Listings per Month',
      'API Access',
      'Custom Integration Support'
    ]
  }
};

// @desc    Get all membership plans
// @route   GET /api/membership/plans
// @access  Public
exports.getPlans = (req, res) => {
  res.json({
    success: true,
    plans: MEMBERSHIP_PLANS
  });
};

// @desc    Subscribe to membership
// @route   POST /api/membership/subscribe
// @access  Private (Provider only)
exports.subscribe = async (req, res) => {
  try {
    const { tier, billingCycle, paymentMethod } = req.body;

    if (!MEMBERSHIP_PLANS[tier]) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid membership tier' 
      });
    }

    const plan = MEMBERSHIP_PLANS[tier];
    const price = plan.price[billingCycle];
    
    // Calculate expiry date
    const expiryDate = new Date();
    if (billingCycle === 'annual') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    }

    // Update user membership
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'membership.tier': tier,
        'membership.status': 'active',
        'membership.startDate': new Date(),
        'membership.expiryDate': expiryDate,
        'membership.autoRenew': true,
        'membership.paymentMethod': paymentMethod,
        'membership.serviceLimit': plan.limits.services,
        'membership.rfqQuota': plan.limits.rfqQuota
      },
      { new: true }
    );

    // Create payment record (would integrate with payment processor)
    // await Payment.create({...});

    res.json({
      success: true,
      message: `Successfully subscribed to ${tier} plan`,
      membership: user.membership
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to subscribe', 
      error: error.message 
    });
  }
};

// @desc    Get current membership
// @route   GET /api/membership/current
// @access  Private (Provider only)
exports.getCurrentMembership = async (req, res) => {
  try {
    const membership = req.user.membership;

    // Calculate days remaining
    let daysRemaining = 0;
    if (membership.expiryDate) {
      const now = new Date();
      const expiry = new Date(membership.expiryDate);
      daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      success: true,
      membership: {
        ...membership.toObject(),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch membership', 
      error: error.message 
    });
  }
};

// @desc    Cancel membership
// @route   POST /api/membership/cancel
// @access  Private (Provider only)
exports.cancelMembership = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'membership.autoRenew': false,
        'membership.status': 'cancelled'
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Membership cancelled successfully',
      membership: user.membership
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to cancel membership', 
      error: error.message 
    });
  }
};

// @desc    Renew membership
// @route   POST /api/membership/renew
// @access  Private (Provider only)
exports.renewMembership = async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    // Calculate new expiry date
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Annual renewal

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'membership.status': 'active',
        'membership.expiryDate': expiryDate,
        'membership.autoRenew': true,
        'membership.paymentMethod': paymentMethod
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Membership renewed successfully',
      membership: user.membership
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to renew membership', 
      error: error.message 
    });
  }
};

// @desc    Upgrade membership
// @route   POST /api/membership/upgrade
// @access  Private (Provider only)
exports.upgradeMembership = async (req, res) => {
  try {
    const { newTier, billingCycle, paymentMethod } = req.body;

    if (!MEMBERSHIP_PLANS[newTier]) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid membership tier' 
      });
    }

    const plan = MEMBERSHIP_PLANS[newTier];
    
    // Calculate prorated price (simplified)
    const price = plan.price[billingCycle];

    // Update user membership
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'membership.tier': newTier,
        'membership.serviceLimit': plan.limits.services,
        'membership.rfqQuota': plan.limits.rfqQuota
      },
      { new: true }
    );

    res.json({
      success: true,
      message: `Successfully upgraded to ${newTier} plan`,
      membership: user.membership
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to upgrade membership', 
      error: error.message 
    });
  }
};