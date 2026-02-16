const Service = require('../Models/Service');
const Project = require('../Models/Project-model');
const User = require('../Models/User');

// Create Project (Client)
exports.createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      skillsRequired,
      budgetType,
      budgetRange,
      minBudget,
      maxBudget,
      timeline,
      deadline,
      attachments,
      requirements,
      deliverables,
      visibility,
      isUrgent,
      totalBudget
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required'
      });
    }

    const client = await User.findById(req.userId);
    if (!client || client.userType !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can create projects'
      });
    }

    const normalizedBudgetRange = budgetRange
      ? {
          min: budgetRange.min !== undefined ? Number(budgetRange.min) : undefined,
          max: budgetRange.max !== undefined ? Number(budgetRange.max) : undefined,
          currency: budgetRange.currency || 'USD'
        }
      : (minBudget || maxBudget)
        ? {
            min: minBudget !== undefined ? Number(minBudget) : undefined,
            max: maxBudget !== undefined ? Number(maxBudget) : undefined,
            currency: 'USD'
          }
        : undefined;

    const project = await Project.create({
      title,
      description,
      category,
      skillsRequired,
      budgetType: budgetType || 'fixed',
      budgetRange: normalizedBudgetRange,
      timeline,
      deadline,
      attachments,
      requirements,
      deliverables,
      visibility: visibility || 'public',
      isUrgent: Boolean(isUrgent),
      totalBudget,
      client: req.userId,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating project'
    });
  }
};

// Get Client Projects
exports.getClientProjects = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { client: req.userId };
    if (status) query.status = status;

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      projects,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get client projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching projects'
    });
  }
};

// Get Project Details
exports.getProjectDetails = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate('client', 'firstName lastName companyName profileImage')
      .populate('selectedProposal');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.client._id.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this project'
      });
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching project details'
    });
  }
};

// Browse Services (Client)
exports.browseServices = async (req, res) => {
  try {
    const {
      query,
      category,
      minPrice,
      maxPrice,
      minRating,
      sortBy = 'relevance',
      page = 1,
      limit = 12
    } = req.query;

    const skip = (page - 1) * limit;
    const searchQuery = {
      isActive: true,
      isVerified: true
    };

    if (query) {
      const regex = new RegExp(query, 'i');
      searchQuery.$or = [{ title: regex }, { description: regex }];
    }

    if (category) searchQuery.category = category;
    if (minPrice) searchQuery.startingPrice = { $gte: parseInt(minPrice, 10) };
    if (maxPrice) searchQuery.startingPrice = { ...searchQuery.startingPrice, $lte: parseInt(maxPrice, 10) };
    if (minRating) searchQuery.averageRating = { $gte: parseFloat(minRating) };

    let sort = {};
    switch (sortBy) {
      case 'price_asc': sort = { startingPrice: 1 }; break;
      case 'price_desc': sort = { startingPrice: -1 }; break;
      case 'rating': sort = { averageRating: -1 }; break;
      case 'newest': sort = { createdAt: -1 }; break;
      case 'relevance':
      default:
        sort = { averageRating: -1 };
    }

    const services = await Service.find(searchQuery)
      .populate('provider', 'firstName lastName businessName profileImage averageRating totalReviews verificationStatus')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Service.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      services,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Browse services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error browsing services'
    });
  }
};

// Get Service Details
exports.getServiceDetails = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findById(serviceId)
      .populate('provider', 'firstName lastName businessName profileImage averageRating totalReviews verificationStatus');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching service details'
    });
  }
};

// Send Project Inquiry for a Service
exports.sendProjectInquiry = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { message, budgetType, minBudget, maxBudget, timeline, deadline, isUrgent } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry message is required'
      });
    }

    const client = await User.findById(req.userId);
    if (!client || client.userType !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can send inquiries'
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const project = await Project.create({
      title: `Inquiry: ${service.title}`,
      description: message,
      category: service.category,
      skillsRequired: service.skills || [],
      budgetType: budgetType || 'negotiable',
      budgetRange: {
        min: minBudget !== undefined ? Number(minBudget) : service.priceRange?.min,
        max: maxBudget !== undefined ? Number(maxBudget) : service.priceRange?.max,
        currency: 'USD'
      },
      timeline: timeline || service.deliveryTime,
      deadline,
      visibility: 'private',
      isUrgent: Boolean(isUrgent),
      client: req.userId,
      status: 'open',
      service: service._id,
      inquiryMessage: message
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully',
      project
    });
  } catch (error) {
    console.error('Send inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending inquiry'
    });
  }
};

// Client Dashboard Stats
exports.getClientDashboardStats = async (req, res) => {
  try {
    const [totalProjects, openProjects, inProgressProjects, completedProjects, cancelledProjects, client] =
      await Promise.all([
        Project.countDocuments({ client: req.userId }),
        Project.countDocuments({ client: req.userId, status: 'open' }),
        Project.countDocuments({ client: req.userId, status: 'in-progress' }),
        Project.countDocuments({ client: req.userId, status: 'completed' }),
        Project.countDocuments({ client: req.userId, status: 'cancelled' }),
        User.findById(req.userId).select('totalSpent')
      ]);

    res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        openProjects,
        inProgressProjects,
        completedProjects,
        cancelledProjects,
        totalSpent: client?.totalSpent || 0
      }
    });
  } catch (error) {
    console.error('Get client dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard stats'
    });
  }
};
