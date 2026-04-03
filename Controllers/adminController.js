// controllers/adminController.js
const User = require('../Models/User');
const Service = require('../Models/Service');
const Order = require('../Models/Order');
const RFQ = require('../Models/RFQ');
const Quote = require('../Models/Quote');
const Payment = require('../Models/Payment'); // Ensure this points to the new Payment.js model

// @desc    Get pending providers awaiting approval
// @route   GET /api/admin/providers/pending
// @access  Private (Admin only)
exports.getPendingProviders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const providers = await User.find({
      role: 'provider',
      status: 'pending'
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments({
      role: 'provider',
      status: 'pending'
    });

    const normalizedProviders = providers.map(p => {
      const obj = p.toObject({ getters: true });
      return {
        ...obj,
        id: obj._id,
        specialization: obj.providerDetails?.specialization || obj.specialization
      };
    });

    res.json({
      success: true,
      providers: normalizedProviders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending providers',
      error: error.message
    });
  }
};

// @desc    Get all transactions (for admin)
// @route   GET /api/admin/transactions
// @access  Private (Admin only)
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    // If a search term is provided, find matching user IDs first
    if (search) {
      const userQuery = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
      const users = await User.find(userQuery).select('_id');
      query.userId = { $in: users.map(u => u._id) };
    }

    const transactions = await Payment.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    const normalizedTransactions = transactions.map(tx => {
      const obj = tx.toObject({ getters: true });
      const userName = obj.userId ? `${obj.userId.firstName || ''} ${obj.userId.lastName || ''}`.trim() : '';
      return {
        ...obj,
        id: obj._id,
        user: obj.userId
          ? {
              id: obj.userId._id,
              name: userName || obj.userId.email,
              email: obj.userId.email
            }
          : null
      };
    });

    res.json({
      success: true,
      transactions: normalizedTransactions,
      history: normalizedTransactions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
  }
};

// @desc    Approve a provider
// @route   POST /api/admin/providers/:providerId/approve
// @access  Private (Admin only)
exports.approveProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await User.findByIdAndUpdate(
      providerId,
      { status: 'approved' },
      { new: true }
    ).select('-password');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerObj = provider.toObject({ getters: true });
    const normalizedProvider = {
      ...providerObj,
      id: providerObj._id,
      specialization: providerObj.providerDetails?.specialization || providerObj.specialization
    };

    res.json({
      success: true,
      message: 'Provider approved successfully',
      provider: normalizedProvider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve provider',
      error: error.message
    });
  }
};

// @desc    Reject a provider
// @route   POST /api/admin/providers/:providerId/reject
// @access  Private (Admin only)
exports.rejectProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { reason } = req.body;

    const provider = await User.findByIdAndUpdate(
      providerId,
      {
        status: 'rejected',
        rejectionReason: reason
      },
      { new: true }
    ).select('-password');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerObj = provider.toObject({ getters: true });
    const normalizedProvider = {
      ...providerObj,
      id: providerObj._id,
      specialization: providerObj.providerDetails?.specialization || providerObj.specialization
    };

    res.json({
      success: true,
      message: 'Provider rejected successfully',
      provider: normalizedProvider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject provider',
      error: error.message
    });
  }
};

// @desc    Get pending services awaiting approval
// @route   GET /api/admin/services/pending
// @access  Private (Admin only)
exports.getPendingServices = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const services = await Service.find({ status: 'pending' })
      .populate('providerId', 'firstName lastName providerDetails.businessName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Service.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      services,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending services',
      error: error.message
    });
  }
};

// @desc    Approve a service
// @route   POST /api/admin/services/:serviceId/approve
// @access  Private (Admin only)
exports.approveService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByIdAndUpdate(
      serviceId,
      { status: 'active' },
      { new: true }
    ).populate('providerId', 'firstName lastName');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service approved successfully',
      service
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve service',
      error: error.message
    });
  }
};

// @desc    Get platform statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const approvedProviders = await User.countDocuments({ role: 'provider', status: 'approved' });
    const pendingProviders = await User.countDocuments({ role: 'provider', status: 'pending' });

    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const activeOrders = await Order.countDocuments({ status: { $in: ['pending', 'in-progress'] } });

    const totalRFQs = await RFQ.countDocuments();
    const activeRFQs = await RFQ.countDocuments({ status: 'active' });

    const totalServices = await Service.countDocuments();
    const activeServices = await Service.countDocuments({ status: 'active' });

    // Revenue calculation
    const payments = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalRevenue = payments[0]?.total || 0;

    // Monthly revenue (current calendar month)
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startOfMonth, $lt: startOfNextMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyRevenue = monthlyPayments[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          clients: totalClients,
          providers: totalProviders,
          approvedProviders,
          pendingProviders
        },
        orders: {
          total: totalOrders,
          completed: completedOrders,
          active: activeOrders
        },
        rfqs: {
          total: totalRFQs,
          active: activeRFQs
        },
        services: {
          total: totalServices,
          active: activeServices
        },
        revenue: totalRevenue
      },
      totalUsers,
      pendingProviders,
      activeProjects: activeOrders,
      disputeCount: await Order.countDocuments({ status: 'disputed' }),
      monthlyRevenue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform stats',
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10, search } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// @desc    Update user status
// @route   PATCH /api/admin/users/:userId/status
// @access  Private (Admin only)
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};
// @desc    Get disputed orders
// @route   GET /api/admin/disputes
// @access  Private (Admin only)
exports.getDisputedOrders = async (req, res) => {
  try {
    const disputes = await Order.find({ status: 'disputed' })
      .populate('clientId', 'firstName lastName email')
      .populate('providerId', 'firstName lastName email')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      disputes: disputes.map(d => ({
        ...d.toObject({ getters: true }),
        id: d._id
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch disputes', error: error.message });
  }
};
// @desc    Get all orders (projects) across the platform
// @route   GET /api/admin/orders
// @access  Private (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('clientId', 'firstName lastName email')
      .populate('providerId', 'firstName lastName email providerDetails.businessName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders: orders.map(o => ({
        ...o.toObject({ getters: true }),
        id: o._id
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch platform orders', error: error.message });
  }
};
