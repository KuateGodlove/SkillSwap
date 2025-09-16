const { mongo, isValidObjectId } = require("mongoose");
const userModel = require('../authentification/user-model');
const jwt = require("jsonwebtoken");


module.exports = {

  // 🔹 Get a user's profile
      getProfileController : async (req, res) => {
    try {
      // 1. Get token from headers
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // 3. Fetch user
    const user = await UserModel.findById(decoded.id).select("-password"); // exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4. Return profile
    res.json({
      success: true,
      profile: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
   },
   
   //Updateprofilecontroler
   
      updateProfilecontroller : async (req, res) => {
     try {
       const userId = req.user.id;
       const { name, email, skills } = req.body;
       let profileImage;
   
       if (req.file) {
         profileImage = req.file.path; // Cloudinary gives a secure URL here
       }
   
       const updatedUser = await userModel.findByIdAndUpdate(
         userId,
         {
           $set: {
             ...(name && { name }),
             ...(email && { email }),
             ...(favoriteskills && { favoriteskills }),
           },
         },
         { new: true, runValidators: true }
       ).select("-password");
   
       if (!updatedUser) {
         return res.status(404).json({ message: "User not found" });
       }
   
       res.status(200).json({
         message: "Profile updated successfully",
         user: updatedUser,
       });
     } catch (error) {
       console.error("Update profile error:", error);
       res.status(500).json({ message: "Server error", error: error.message });
     }
   },
  }; 