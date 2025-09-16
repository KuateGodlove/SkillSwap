const { mongo, isValidObjectId } = require("mongoose");
const serviceModel = require("./service-model");
const userModel = require('../authentification/user-model');


module.exports = {

// Remove a service from the user's profile
     removeServiceController : async (req, res) => {
         const { serviceId } = req.params; // service id to remove
  try {
    const userId =req.user._id;


const servicetoremove = await serviceModel.findById({_id: serviceId})
    // Check if service exists
    if (!servicetoremove) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Remove service
    const verifyservice = await serviceModel.findOne({userId: userId, _id: serviceId});
    console.log(await serviceModel.findOne({userId: userId, _id: serviceId}));

    if (!verifyservice) {
      return res.status(404).json({ message: "Service not found for this user" });
    }

    await serviceModel.deleteOne({userId: userId, _id: serviceId});
    return res.status(200).json({
      message: "Service removed successfully",

    });
  } catch (error) {
    console.error("Error removing service:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
},

 // Addservicecontrollers/serviceController.js
 addServiceController : async (req, res) => {
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
      userId: req.user._id
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
    listUserServicesController : async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await userModel.findById({_id:userId});
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch user's services

const services = await serviceModel.find({ userId }); // assuming `userId` field in Service references User

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
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

};
