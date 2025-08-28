const { mongo, isValidObjectId } = require("mongoose");
const serviceModel = require("./service-model");
const userModel = require('../authentification/user-model')

module.exports = {

  getProfileController: async (req, res) => {
    const { userid } = req.params;
    if (!userid) {
      return res.status(400).json({ message: "userid is required" });
    }
    try {
    
      const user = await userModel.findById({ _id: userid }).select('-password')
      console.log(userid, "hello", typeof userid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json({ profile: user });
    } catch (error) {
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  },

// Remove a service from the user's profile
     removeServiceController : async (req, res) => {
         const { serviceId } = req.params; // service id to remove
  try {
    const userId = req.user.id; // assuming you have auth middleware that attaches user

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if service exists
    const serviceIndex = user.services.findIndex((s) => s._id.toString() === serviceId);
    if (serviceIndex === -1) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Remove service
    user.services.splice(serviceIndex, 1);
    await user.save();

    return res.status(200).json({
      message: "Service removed successfully",
      services: user.services,
    });
  } catch (error) {
    console.error("Error removing service:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
},
   
 // Addskillcontrollers/skillController.js
   addSkillController : async (req, res) => {
  try {
    console.log("params:", req.params, "body:", req.body, "query:", req.query);

    const userId = req.user.id; // from authMiddleware
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: "Skill name and description are required" });
    }

    // find the user
    
     const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const existingSkill = user.skills.find((s) => s.name === name);
    if (existingSkill) {
      return res.status(409).json({ message: "Skill already exists" });
    }
    // create new skill object
    const newSkill = {
      name,
      description: description || "",
    };

    // push skill to user's skills array
    user.skills.push(newSkill);
    await user.save();

    return res.status(201).json({
      message: "Skill added successfully",
      skill: newSkill,
      skills: user.skills, // return updated skills list
    });
  } catch (error) {
    console.error("Error adding skill:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
 },
};
