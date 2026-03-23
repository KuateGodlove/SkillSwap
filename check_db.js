const mongoose = require('mongoose');
const User = require('./Models/User');
require('dotenv').config();

// Try connecting to MongoDB locally first or using MONGO_URI if available
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswapp';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB');
    const users = await User.find({}).select('email role status');
    console.log('Users in DB:', users);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
