const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./Models/Order');
const Service = require('./Models/Service');
const User = require('./Models/User');
const Notification = require('./Models/Notification');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://godlovekuate:Godlove2026@cluster0.aam6bte.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  
  try {
    // Pick any user and service
    const user = await User.findOne({role: 'client'});
    const service = await Service.findOne({});
    
    if (!user || !service) {
      console.log('Skipping test, no user or service found');
      process.exit(0);
    }
    
    console.log(`Running inquireService simulation for User: ${user._id}, Service: ${service._id}`);
    
    // Create notification
    const notification = await Notification.create({
      userId: service.providerId,
      type: 'offer_received',
      title: 'New Service Inquiry',
      message: `${user.firstName} is inquiring about your service: ${service.title}`,
      senderId: user._id,
      senderName: `${user.firstName} ${user.lastName}`,
      metadata: {
        orderId: new mongoose.Types.ObjectId()
      }
    });
    
    console.log('Notification created successfully!', notification);
    
  } catch (err) {
    console.error('Error occurred:', err.message);
    if(err.errors) {
       console.log(err.errors);
    }
  }
  process.exit(0);
}

test();
