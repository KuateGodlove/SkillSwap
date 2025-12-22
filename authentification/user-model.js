const mongoose = require("mongoose");
const schema = mongoose.Schema;

const userSchema = new schema({
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
    select: false,
  },
  phone: {
    type: String,
    default: "",
  },
  favoriteSkill: {
    type: String,
    required: [true, "Favorite skill is required"],
    trim: true,
  },
  profileImage: {
    type: String,
    default: "https://via.placeholder.com/150",
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
      portfolio: [{ type: String }],
    },
  ],
  services: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
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
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    types: {
      offers: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      requests: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
    },
  },
}, { timestamps: true }); 

module.exports = mongoose.model("User", userSchema);