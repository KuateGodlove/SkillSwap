// controllers/serviceController.js
const Service = require('../models/Service');
const User = require('../models/User');

// @desc    Get all services (public)
// @route   GET /api/services
// @access  Public
exports.getServices = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;

    const filter = { status: 'active' };

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const services = await Service.find(filter)
      .populate('providerId', 'firstName lastName providerDetails rating')
      .sort({ featured: -1, createdAt: -1 });

    res.json({
      success: true,
      services
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch services', 
      error: error.message 
    });
  }
};

// @desc    Get service details
// @route   GET /api/services/:serviceId
// @access  Public
exports.getServiceDetails = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId)
      .populate('providerId', 'firstName lastName providerDetails rating memberSince');

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    // Increment view count
    service.views += 1;
    await service.save();

    res.json({
      success: true,
      service
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch service', 
      error: error.message 
    });
  }
};

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Provider only)
exports.createService = async (req, res) => {
  try {
    // Check service limit based on membership
    const provider = await User.findById(req.user._id);
    const servicesCount = await Service.countDocuments({ 
      providerId: req.user._id,
      status: 'active'
    });

    if (servicesCount >= provider.membership.serviceLimit) {
      return res.status(400).json({ 
        success: false,
        message: `Service limit reached (${provider.membership.serviceLimit}). Please upgrade your membership.` 
      });
    }

    const service = new Service({
      ...req.body,
      providerId: req.user._id
    });

    await service.save();

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create service', 
      error: error.message 
    });
  }
};

// @desc    Get provider's services
// @route   GET /api/services/provider/my
// @access  Private (Provider only)
exports.getMyServices = async (req, res) => {
  try {
    const services = await Service.find({ providerId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      services
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch services', 
      error: error.message 
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:serviceId
// @access  Private (Provider only)
exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findOneAndUpdate(
      { _id: serviceId, providerId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found or unauthorized' 
      });
    }

    res.json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update service', 
      error: error.message 
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:serviceId
// @access  Private (Provider only)
exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findOneAndDelete({
      _id: serviceId,
      providerId: req.user._id
    });

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found or unauthorized' 
      });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete service', 
      error: error.message 
    });
  }
};

// @desc    Duplicate service
// @route   POST /api/services/:serviceId/duplicate
// @access  Private (Provider only)
exports.duplicateService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const original = await Service.findOne({
      _id: serviceId,
      providerId: req.user._id
    });

    if (!original) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    // Check service limit
    const provider = await User.findById(req.user._id);
    const servicesCount = await Service.countDocuments({ 
      providerId: req.user._id,
      status: 'active'
    });

    if (servicesCount >= provider.membership.serviceLimit) {
      return res.status(400).json({ 
        success: false,
        message: `Service limit reached (${provider.membership.serviceLimit}). Please upgrade your membership.` 
      });
    }

    // Create duplicate
    const duplicate = new Service({
      ...original.toObject(),
      _id: undefined,
      title: `${original.title} (Copy)`,
      status: 'draft',
      views: 0,
      inquiries: 0,
      orders: 0,
      createdAt: new Date(),
      providerId: req.user._id
    });

    await duplicate.save();

    res.status(201).json({
      success: true,
      message: 'Service duplicated successfully',
      service: duplicate
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to duplicate service', 
      error: error.message 
    });
  }
};

// @desc    Update service status
// @route   PATCH /api/services/:serviceId/status
// @access  Private (Provider only)
exports.updateStatus = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { status } = req.body;

    const service = await Service.findOneAndUpdate(
      { _id: serviceId, providerId: req.user._id },
      { status },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    res.json({
      success: true,
      message: `Service ${status}`,
      service
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update status', 
      error: error.message 
    });
  }
};
