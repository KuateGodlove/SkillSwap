const userModel = require("./user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  registercontroller: async (req, res) => {
    const { name, email, password, favoriteskill } = req.body;
    if (!name || !email || !password || !favoriteskill) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await userModel.findOne({ email: email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }
    const hashpassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name: name,
      email: email,
      password: hashpassword,
      favoriteskill: favoriteskill,
    });

    return res.status(201).json({ message: "User created successfully" });
  },
  logincontroller: async (req, res) => {
    const SECRET_KEY = "sjhfuhfuarhiuar";
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await userModel.findOne({ email: email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign({ user: user }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token, email: user.email });
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
      if (updatepassword) {
        return res.status(200).json({ message: "Password reset succesfully" });
      }
    } catch (error) {
      console.log(error, "error in setting password");
    }
  },
  
};
