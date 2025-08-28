const mongoose = require("mongoose");
const schema = mongoose.Schema;
const userSchema = new schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  favoriteskill: {
    type: String,
    required: true
  }
},{timestamps: true})
module.exports = mongoose.model("User", userSchema);