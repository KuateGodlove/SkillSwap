const { mongo, isValidObjectId } = require("mongoose");
const serviceModel = require("./service-model");
const userModel = require('../authentification/user-model');


module.exports = {

// Remove a service from the user's profile
    removeServiceController: async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Service ID is required" });
    }
    const deleted = await serviceModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ success: true, message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
},

// Add service controller
    addServiceController: async (req, res) => {
  try {
    const { title, description, category, level  } = req.body;

    if (!title || !description || !category || !level) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newService = await serviceModel.create({
      title,
      description,
      category,
      level,
      userId: req.user.userId
    });

      await newService.save();

    return res.status(201).json({
      success: true,
      message: "Service added successfully",
      service: newService,

    });
  } catch (error) {
    console.error("Error adding service:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
 },

// List all services of a specific user
    listUserServicesController: async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await userModel.findById(userId); 

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch user's services
    const services = await serviceModel.find({ userId }); // userId field in Service references User

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name || user.firstName || "",
        email: user.email
      },
      services
    });
  } catch (error) {
    console.error('Error listing user services:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
},


// Controller to list all user services
    listAllUserServicesController : async (req, res) => {
  try {
    // If you want all services from all users
    const services = await serviceModel.find() 

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching services',
    });
  }
},
// ✅ Get details of a specific service
    getServiceDetailsController : async (req, res) => {
  try {
    const { id } = req.params;

    // Find the service by ID and populate the user who offers it
    const service = await ServiceModel.findById(id).populate('userId', 'firstname lastname email avatar');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
}
};
