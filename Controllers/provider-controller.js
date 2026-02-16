const Service = require('../Models/service-model');
const Project = require('../Models/Project-model');
const Proposal = require('../Models/Proposal-model');
const User = require('../Models/user-model');

// Create Service Listing
exports.createService = async (req, res) => {
  try {
    const {
      title, description, category, subcategory,
      pricingModel, startingPrice, priceRange,
      packages, skills, tools, deliveryTime,
      revisions, supportPeriod, portfolioItems
    } = req.body;

    // Validation
    if (!title || !description || !category || !startingPrice) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    // Check if provider is verified
    const provider = await User.findById(req.userId);
    if (provider.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: "Your account must be verified to create services"
      });
    }

    // Create service
    const service = await Service.create({
      title,
      description,
      category,
      subcategory,
      pricingModel,
      startingPrice,
      priceRange,
      packages,
      skills,
      tools,
      deliveryTime,
      revisions,
      supportPeriod,
      portfolioItems,
      provider: req.userId,
      isVerified: true // Auto-verify for verified providers
    });

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      service
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: "Server error creating service"
    });
  }
};

// Update Service
exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updates = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    // Check ownership
    if (service.provider.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this service"
      });
    }

    // Update service
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'provider' && key !== 'createdAt') {
        service[key] = updates[key];
      }
    });

    service.updatedAt = new Date();
    await service.save();

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: "Server error updating service"
    });
  }
};

// Get Provider Services
exports.getProviderServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const skip = (page - 1) * limit;

    const query = { provider: req.userId };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const services = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get provider services error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching services"
    });
  }
};

// Browse Available Projects
exports.browseProjects = async (req, res) => {
  try {
    const { 
      category, 
      minBudget, 
      maxBudget, 
      skills,
      sortBy = 'newest',
      page = 1, 
      limit = 12 
    } = req.query;

    const skip = (page - 1) * limit;

    // Get provider's skills
    const provider = await User.findById(req.userId);
    const providerSkills = provider.skills || [];

    // Build query
    const query = { 
      status: 'open',
      visibility: { $in: ['public', 'invite-only'] }
    };

    if (category) query.category = category;
    if (minBudget) query['budgetRange.min'] = { $gte: parseInt(minBudget) };
    if (maxBudget) query['budgetRange.max'] = { $lte: parseInt(maxBudget) };
    
    // Match projects that require provider's skills
    if (providerSkills.length > 0) {
      query.skillsRequired = { $in: providerSkills };
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'budget_high': sort = { 'budgetRange.max': -1 }; break;
      case 'budget_low': sort = { 'budgetRange.min': 1 }; break;
      case 'urgent': sort = { isUrgent: -1, createdAt: -1 }; break;
      default: sort = { createdAt: -1 };
    }

    // Get projects with client info
    const projects = await Project.find(query)
      .populate('client', 'firstName lastName companyName profileImage')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Check which projects provider has already applied to
    const projectIds = projects.map(p => p._id);
    const existingProposals = await Proposal.find({
      provider: req.userId,
      project: { $in: projectIds }
    }).select('project');

    const appliedProjects = new Set(existingProposals.map(p => p.project.toString()));

    // Add applied flag
    const projectsWithAppliedFlag = projects.map(project => ({
      ...project.toObject(),
      hasApplied: appliedProjects.has(project._id.toString())
    }));

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      projects: projectsWithAppliedFlag,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Browse projects error:', error);
    res.status(500).json({
      success: false,
      message: "Server error browsing projects"
    });
  }
};

// Submit Proposal
exports.submitProposal = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { coverLetter, proposedBudget, proposedTimeline, deliverables, pricingBreakdown } = req.body;

    // Validation
    if (!coverLetter || !proposedBudget) {
      return res.status(400).json({
        success: false,
        message: "Cover letter and budget are required"
      });
    }

    // Check if project exists and is open
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: "Project is not accepting proposals"
      });
    }

    // Check if provider has already applied
    const existingProposal = await Proposal.findOne({
      project: projectId,
      provider: req.userId
    });

    if (existingProposal) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a proposal for this project"
      });
    }

    // Check if provider is verified
    const provider = await User.findById(req.userId);
    if (provider.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: "Your account must be verified to submit proposals"
      });
    }

    // Create proposal
    const proposal = await Proposal.create({
      project: projectId,
      provider: req.userId,
      coverLetter,
      proposedBudget: parseFloat(proposedBudget),
      proposedTimeline,
      deliverables,
      pricingBreakdown,
      status: 'submitted'
    });

    // Update project proposal count
    project.proposalsCount += 1;
    project.proposals.push(proposal._id);
    await project.save();

    // Update provider stats
    provider.responseRate = await calculateResponseRate(provider._id);
    await provider.save();

    res.status(201).json({
      success: true,
      message: "Proposal submitted successfully",
      proposal
    });

  } catch (error) {
    console.error('Submit proposal error:', error);
    res.status(500).json({
      success: false,
      message: "Server error submitting proposal"
    });
  }
};

// Get Provider Proposals
exports.getProviderProposals = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { provider: req.userId };
    if (status) query.status = status;

    const proposals = await Proposal.find(query)
      .populate({
        path: 'project',
        select: 'title description category budgetRange timeline status client',
        populate: {
          path: 'client',
          select: 'firstName lastName companyName profileImage'
        }
      })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Proposal.countDocuments(query);

    res.status(200).json({
      success: true,
      proposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching proposals"
    });
  }
};

// Get Proposal Details
exports.getProposalDetails = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = await Proposal.findById(proposalId)
      .populate({
        path: 'project',
        populate: {
          path: 'client',
          select: 'firstName lastName email phone companyName profileImage'
        }
      })
      .populate('provider', 'firstName lastName businessName profileImage');

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found"
      });
    }

    // Check ownership
    if (proposal.provider._id.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this proposal"
      });
    }

    // Mark as viewed
    if (!proposal.isViewed) {
      proposal.isViewed = true;
      await proposal.save();
    }

    res.status(200).json({
      success: true,
      proposal
    });

  } catch (error) {
    console.error('Get proposal details error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching proposal details"
    });
  }
};

// Provider Dashboard Stats
exports.getProviderDashboardStats = async (req, res) => {
  try {
    const [
      services,
      proposals,
      acceptedProposals,
      completedProjects,
      totalEarned
    ] = await Promise.all([
      Service.countDocuments({ provider: req.userId, isActive: true }),
      Proposal.countDocuments({ provider: req.userId }),
      Proposal.countDocuments({ provider: req.userId, status: 'accepted' }),
      Project.countDocuments({ 
        selectedProposal: { $exists: true },
        status: 'completed'
      }).where('selectedProposal').in(
        await Proposal.find({ provider: req.userId }).select('_id')
      ),
      // In real app, calculate from payments
      Promise.resolve(0) // Placeholder
    ]);

    // Calculate acceptance rate
    const acceptanceRate = proposals > 0 ? (acceptedProposals / proposals) * 100 : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalServices: services,
        totalProposals: proposals,
        acceptedProposals,
        acceptanceRate: Math.round(acceptanceRate),
        completedProjects,
        totalEarned
      }
    });

  } catch (error) {
    console.error('Get provider stats error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard stats"
    });
  }
};

// Helper function to calculate response rate
async function calculateResponseRate(providerId) {
  const totalProjects = await Project.countDocuments({
    'proposals.provider': providerId
  });
  
  const respondedProjects = await Project.countDocuments({
    'proposals.provider': providerId,
    'proposals.status': { $in: ['submitted', 'under-review', 'shortlisted', 'accepted'] }
  });

  return totalProjects > 0 ? (respondedProjects / totalProjects) * 100 : 0;
}
