// models/userModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // exclude password by default
    },
    phone: {
      type: String,
      default: "",
    },
    profileImage: {
      type: String,
      default: "https://via.placeholder.com/150", // fallback avatar
    },
    bio: {
      type: String,
      maxlength: 300,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    availability: {
      type: String,
      enum: ["Available Now", "Busy", "Part-time"],
      default: "Available Now",
    },
    languages: [
      {
        type: String,
      },
    ],
    skills: [
      {
        title: { type: String, required: true },
        category: { type: String, required: true },
        level: {
          type: String,
          enum: ["Beginner", "Intermediate", "Expert"],
          required: true,
        },
        description: { type: String },
        portfolio: [{ type: String }], // store links or file paths
      },
    ],
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service", // reference Service model
      },
    ],
    rating: {
      type: Number,
      default: 0,
    },
    completedExchanges: {
      type: Number,
      default: 0,
    },
    isVerified: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      id: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
