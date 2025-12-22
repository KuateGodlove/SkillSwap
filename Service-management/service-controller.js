const { isValidObjectId } = require("mongoose");
const serviceModel = require("./service-model");
const userModel = require("../authentification/user-model");

module.exports = {
  // ✅ Create service (matches frontend form)
  addServiceController: async (req, res) => {
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
        budgetType,
        budgetValue,
        currency = "USD",
        tags,
        availability = "flexible",
        preferredTime,
        exchangeFor
      } = req.body;

      // Required fields validation
      if (!title || !description || !category) {
        return res.status(400).json({ 
          success: false,
          message: "Title, description, and category are required" 
        });
      }

      if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
          success: false,
          message: "Unauthorized" 
        });
      }

      // Get user info for provider details
      const user = await userModel.findById(req.user.userId);
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

      // Process comma-separated strings to arrays
      const processArrayField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        return field.split(',').map(item => item.trim()).filter(item => item);
      };

      const newService = await serviceModel.create({
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
        budgetType: budgetType || "swap",
        budgetValue: budgetValue ? Number(budgetValue) : 0,
        currency,
        tags: processArrayField(tags),
        availability,
        preferredTime,
        exchangeFor,
        images,
        coverImage: images.length > 0 ? images[0] : "",
        providerName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        providerPhoto: user.profilePhoto || "",
        userId: req.user.userId,
        status: "active"
      });

      // Update user's services array
      await userModel.findByIdAndUpdate(req.user.userId, {
        $push: { services: newService._id },
        $inc: { totalServices: 1 }
      });

      return res.status(201).json({
        success: true,
        message: "Service created successfully",
        data: newService
      });
    } catch (error) {
      console.error("Error creating service:", error);
      return res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  },

  // ✅ Update service
  updateServiceController: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!isValidObjectId(id)) {
        return res.status(400).json({ 
          success: false,
          message: "Valid Service ID is required" 
        });
      }

      if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
          success: false,
          message: "Unauthorized" 
        });
      }

      // Check if service exists and belongs to user
      const service = await serviceModel.findById(id);
      if (!service) {
        return res.status(404).json({ 
          success: false,
          message: "Service not found" 
        });
      }

      if (service.userId.toString() !== req.user.userId) {
        return res.status(403).json({ 
          success: false,
          message: "Not authorized to update this service" 
        });
      }

      // Process array fields if they come as strings
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

      // Handle budget value conversion
      if (req.body.budgetValue !== undefined) {
        updateData.budgetValue = Number(req.body.budgetValue);
      }

      const updatedService = await serviceModel.findByIdAndUpdate(
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
      console.error("Error updating service:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  },

  // ✅ Remove service
  removeServiceController: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || !isValidObjectId(id)) {
        return res.status(400).json({ 
          success: false,
          message: "Valid Service ID is required" 
        });
      }

      if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
          success: false,
          message: "Unauthorized" 
        });
      }

      // Check if service belongs to user
      const service = await serviceModel.findById(id);
      if (!service) {
        return res.status(404).json({ 
          success: false,
          message: "Service not found" 
        });
      }

      if (service.userId.toString() !== req.user.userId) {
        return res.status(403).json({ 
          success: false,
          message: "Not authorized to delete this service" 
        });
      }

      // Delete service
      const deleted = await serviceModel.findByIdAndDelete(id);
      
      // Remove from user's services array
      await userModel.findByIdAndUpdate(req.user.userId, {
        $pull: { services: id },
        $inc: { totalServices: -1 }
      });

      res.json({ 
        success: true, 
        message: "Service deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  },

  // ✅ List all services (with filters, search, sort, pagination)
  listAllUserServicesController: async (req, res) => {
    try {
      const { 
        category, 
        subcategory,
        locationType,
        level,
        budgetType,
        sort, 
        query, 
        tags,
        page = 1, 
        pageSize = 12 
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
      
      if (budgetType && budgetType !== "all") {
        filter.budgetType = budgetType;
      }
      
      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $in: [new RegExp(query, "i")] } }
        ];
      }
      
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        filter.tags = { $in: tagArray };
      }

      // Sorting options
      let sortOption = { createdAt: -1 };
      if (sort === "rating") sortOption = { rating: -1 };
      if (sort === "views") sortOption = { views: -1 };
      if (sort === "likes") sortOption = { likes: -1 };
      if (sort === "requests") sortOption = { requests: -1 };
      if (sort === "price_low") sortOption = { budgetValue: 1 };
      if (sort === "price_high") sortOption = { budgetValue: -1 };

      const total = await serviceModel.countDocuments(filter);
      const services = await serviceModel.find(filter)
        .sort(sortOption)
        .populate("userId", "firstName lastName profilePhoto")
        .skip((page - 1) * pageSize)
        .limit(Number(pageSize))
        .lean();

      return res.status(200).json({
        success: true,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize),
        data: services,
      });
    } catch (error) {
      console.error("Error fetching services:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching services",
        error: error.message
      });
    }
  },

  // ✅ List services of a specific user
  listUserServicesController: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid user ID" 
        });
      }

      const user = await userModel.findById(userId)
        .select("firstName lastName email profilePhoto totalServices completedSwaps ratingAsProvider");
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const services = await serviceModel.find({ 
        userId, 
        status: "active" 
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email,
          profilePhoto: user.profilePhoto,
          totalServices: user.totalServices || 0,
          completedSwaps: user.completedSwaps || 0,
          rating: user.ratingAsProvider || 0
        },
        services,
      });
    } catch (error) {
      console.error("Error listing user services:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error",
        error: error.message
      });
    }
  },

  // ✅ Get current user's services (for dashboard)
  getMyServicesController: async (req, res) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
          success: false,
          message: "Unauthorized" 
        });
      }

      const services = await serviceModel.find({ 
        userId: req.user.userId 
      })
      .sort({ createdAt: -1 })
      .lean();

      res.status(200).json({
        success: true,
        count: services.length,
        data: services
      });
    } catch (error) {
      console.error("Error fetching user services:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // ✅ Get service details
  getServiceDetailsController: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!isValidObjectId(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid service ID" 
        });
      }

      // Increment view count
      await serviceModel.findByIdAndUpdate(id, { $inc: { views: 1 } });

      const service = await serviceModel
        .findById(id)
        .populate("userId", "firstName lastName email profilePhone totalServices completedSwaps ratingAsProvider")
        .lean();

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      res.status(200).json({ 
        success: true, 
        data: service 
      });
    } catch (error) {
      console.error("Error fetching service details:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },

  // ✅ Toggle service status (active/inactive)
  toggleServiceStatusController: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid service ID" 
        });
      }

      if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
          success: false,
          message: "Unauthorized" 
        });
      }

      const service = await serviceModel.findById(id);
      if (!service) {
        return res.status(404).json({ 
          success: false,
          message: "Service not found" 
        });
      }

      if (service.userId.toString() !== req.user.userId) {
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

      const updatedService = await serviceModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      res.json({
        success: true,
        message: `Service ${status}`,
        data: updatedService
      });
    } catch (error) {
      console.error("Error toggling service status:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }
};