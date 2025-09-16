const userModel = require("./user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  registercontroller: async (req, res) => {
    try {
      const { firstName, lastName, email, password, favoriteskill } = req.body;

      if (!firstName || !lastName || !email || !password || !favoriteskill) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "User already exists", success: false });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await userModel.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        favoriteskill,
      });

      return res.status(201).json({
        message: "User created successfully",
        success: true,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          favoriteskill: user.favoriteskill,
        },
      });

    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Server error while registering" });
    }
  },

  logincontroller: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await userModel.findOne({ email: email });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.password) {
        return res.status(400).json({ message: "User has no password set" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(200).json({
        success: true,
        token,
        user: {
          firstName: user.firstName,
          lastName: user.lastName || "",
          email: user.email,
          _id: user._id
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  forgotpasswordcontroller: async (req, res) => {
    const { email, newpassword } = req.body;

    try {
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }
      const user = await userModel.findOne({ email: email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!newpassword) {
        return res.status(400).json({ message: "Enter newpassword" });
      }

      const newpasswordhash = await bcrypt.hash(newpassword, 10);
      const updatepassword = await userModel.updateOne(
        { email: email },
        { password: newpasswordhash }
      );
      if (updatepassword.modifiedCount === 0) {
        return res.status(400).json({ message: "Password not updated" });
      }
      return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error in setting password:", error);
      return res.status(500).json({ message: "Server error while resetting password" });
    }
  },
};