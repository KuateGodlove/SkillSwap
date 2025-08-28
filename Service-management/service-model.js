const mongoose = require('mongoose')
const schema = mongoose.Schema;


const skillschema = new schema({
   skillname: {
    type: String,
    required: true
  },
  description:{
    type: String,
    required: true
  },
},
{timestamps: true})

module.exports = mongoose.model("service", skillschema);