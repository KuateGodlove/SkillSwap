const mongoose = require('mongoose')
const schema = mongoose.Schema;


const skillschema = new schema({
  title: {
    type: String,
    required: true
  },
  description:{
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
},
{timestamps: true})

module.exports = mongoose.model("service", skillschema);