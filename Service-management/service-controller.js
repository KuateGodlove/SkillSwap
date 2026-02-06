const { isValidObjectId } = require("mongoose");
const Service = require("./service-model");
const User = require("../authentification/user-model");

// @desc    Create a new skill service
// @route   POST /api/services
// @access  Private
exports.createService = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      skillsOffered,
      skillsWanted,
      locationType,
      location,
      duration,
      level,
      tags,
      availability = "flexible",
      preferredTime,
      exchangeType
    } = req.body;

    // Validation
    if (!title || !description || !category) {
      return res.status(400).json({ 
        success: false,
        message: "Title, description, and category are required" 
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Handle file uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/services/${file.filename}`);
    } else if (req.file) {
      images = [`/uploads/services/${req.file.filename}`];
    }

    // Helper to process array fields
    const processArrayField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      return field.split(',').map(item => item.trim()).filter(item => item);
    };

    const newService = await Service.create({
      title,
      description,
      category,
      subcategory,
      skillsOffered: processArrayField(skillsOffered),
      skillsWanted: processArrayField(skillsWanted),
      locationType: locationType || "remote",
      location,
      duration,
      level: level || "intermediate",
      tags: processArrayField(tags),
      availability,
      preferredTime,
      exchangeType: exchangeType || "direct_exchange",
      images,
      coverImage: images.length > 0 ? images[0] : "",
      providerName: `${user.firstName} ${user.lastName}`.trim(),
      providerPhoto: user.profilePhoto || "",
      userId: req.user.id,
      status: "active"
    });

    // Update user's services array
    await User.findByIdAndUpdate(req.user.id, {
      $push: { services: newService._id },
      $inc: { totalServices: 1 }
    });

    res.status(201).json({
      success: true,
      message: "Skill service created successfully",
      data: newService
    });
  } catch (error) {
    console.error("❌ Create service error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to create service", 
      error: error.message 
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Valid Service ID is required" 
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: "Service not found" 
      });
    }

    if (service.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to update this service" 
      });
    }

    // Helper to process array fields
    const processArrayField = (field) => {
      if (!field) return undefined;
      if (Array.isArray(field)) return field;
      return field.split(',').map(item => item.trim()).filter(item => item);
    };

    const updateData = { ...req.body };
    
    // Process array fields
    if (req.body.skillsOffered !== undefined) {
      updateData.skillsOffered = processArrayField(req.body.skillsOffered);
    }
    if (req.body.skillsWanted !== undefined) {
      updateData.skillsWanted = processArrayField(req.body.skillsWanted);
    }
    if (req.body.tags !== undefined) {
      updateData.tags = processArrayField(req.body.tags);
    }

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/services/${file.filename}`);
      updateData.images = [...service.images, ...newImages];
      if (!service.coverImage) {
        updateData.coverImage = newImages[0];
      }
    }

    const updatedService = await Service.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Service updated successfully",
      data: updatedService
    });
  } catch (error) {
    console.error("❌ Update service error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update service", 
      error: error.message 
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Valid Service ID is required" 
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: "Service not found" 
      });
    }

    if (service.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to delete this service" 
      });
    }

    await Service.findByIdAndDelete(id);
    
    // Remove from user's services array
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { services: id },
      $inc: { totalServices: -1 }
    });

    res.json({ 
      success: true, 
      message: "Service deleted successfully" 
    });
  } catch (error) {
    console.error("❌ Delete service error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete service", 
      error: error.message 
    });
  }
};

// @desc    Get all services with filters
// @route   GET /api/services
// @access  Public
exports.getAllServices = async (req, res) => {
  try {
    const { 
      category, 
      subcategory,
      locationType,
      level,
      exchangeType,
      sort = "newest", 
      search, 
      tags,
      page = 1, 
      limit = 12 
    } = req.query;

    const filter = { status: "active" };
    
    // Apply filters
    if (category && category !== "all") {
      filter.category = category;
    }
    
    if (subcategory) {
      filter.subcategory = subcategory;
    }
    
    if (locationType && locationType !== "all") {
      filter.locationType = locationType;
    }
    
    if (level && level !== "all") {
      filter.level = level;
    }
    
    if (exchangeType && exchangeType !== "all") {
      filter.exchangeType = exchangeType;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Sorting options - SKILL EXCHANGE FOCUSED
    let sortOption = { createdAt: -1 };
    switch(sort) {
      case "rating":
        sortOption = { rating: -1 };
        break;
      case "views":
        sortOption = { views: -1 };
        break;
      case "popular":
        sortOption = { interactions: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
    }

    const total = await Service.countDocuments(filter);
    const skip = (page - 1) * limit;
    
    const services = await Service.find(filter)
      .sort(sortOption)
      .populate("userId", "firstName lastName profilePhoto rating")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: services
    });
  } catch (error) {
    console.error("❌ Get services error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message
    });
  }
};

// @desc    Get services by user
// @route   GET /api/services/user/:userId
// @access  Public
exports.getUserServices = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID" 
      });
    }

    const user = await User.findById(userId)
      .select("firstName lastName email profilePhoto rating completedExchanges");
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const services = await Service.find({ 
      userId, 
      status: "active" 
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profilePhoto: user.profilePhoto,
        rating: user.rating || 0,
        completedExchanges: user.completedExchanges || 0
      },
      services,
      count: services.length
    });
  } catch (error) {
    console.error("❌ Get user services error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch user services",
      error: error.message
    });
  }
};

// @desc    Get current user's services
// @route   GET /api/services/me
// @access  Private
exports.getMyServices = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const services = await Service.find({ 
      userId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .lean();

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error("❌ Get my services error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message
    });
  }
};

// @desc    Get service details
// @route   GET /api/services/:id
// @access  Public
exports.getServiceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid service ID" 
      });
    }

    // Increment view count
    await Service.findByIdAndUpdate(id, { $inc: { views: 1 } });

    const service = await Service
      .findById(id)
      .populate("userId", "firstName lastName email profilePhoto rating completedExchanges")
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    res.status(200).json({ 
      success: true, 
      data: service 
    });
  } catch (error) {
    console.error("❌ Get service details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service",
      error: error.message
    });
  }
};

// @desc    Toggle service status
// @route   PATCH /api/services/:id/status
// @access  Private
exports.toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid service ID" 
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: "Service not found" 
      });
    }

    if (service.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to update this service" 
      });
    }

    const validStatuses = ["active", "inactive", "completed", "archived"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid status" 
      });
    }

    const updatedService = await Service.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json({
      success: true,
      message: `Service status updated to ${status}`,
      data: updatedService
    });
  } catch (error) {
    console.error("❌ Toggle status error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update service status",
      error: error.message
    });
  }
};