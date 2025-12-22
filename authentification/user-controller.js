const userModel = require("./user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Multer for handling profile photo uploads
const multer = require("multer");
const path = require("path");

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // adjust path as needed
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

module.exports = {
  // Middleware for handling photo upload
  uploadPhoto: upload.single("profilePhoto"),

  // ✅ Register Controller
  registercontroller: async (req, res) => {
    try {
      const { firstName, lastName, email, password, favoriteSkill, phone } = req.body;

      if (!firstName || !lastName || !email || !password || !favoriteSkill || !phone) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await userModel.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        favoriteSkill,
        phone,
        profileImage: req.file ? req.file.filename : null, // store filename only
      });

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          favoriteSkill: user.favoriteSkill,
          phone: user.phone,
          profileImage: user.profileImage
            ? `${req.protocol}://${req.get("host")}/uploads/${user.profileImage}`
            : "https://via.placeholder.com/150",
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while registering",
      });
    }
  },

  // ✅ Login Controller
  logincontroller: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const user = await userModel.findOne({ email }).select("+password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      res.status(200).json({
        success: true,
        token,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName || "",
          email: user.email,
          favoriteSkill: user.favoriteSkill,
          phone: user.phone,
          profileImage: user.profileImage
            ? `${req.protocol}://${req.get("host")}/uploads/${user.profileImage}`
            : "https://via.placeholder.com/150",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  },

  // ✅ Forgot Password Controller
  forgotpasswordcontroller: async (req, res) => {
    const { email, newpassword } = req.body;

    try {
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email required",
        });
      }

      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!newpassword) {
        return res.status(400).json({
          success: false,
          message: "Enter new password",
        });
      }

      const newpasswordhash = await bcrypt.hash(newpassword, 10);
      const updatepassword = await userModel.updateOne(
        { email },
        { password: newpasswordhash }
      );

      if (updatepassword.modifiedCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Password not updated",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Error in setting password:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while resetting password",
      });
    }
  },
};