const mongoose = require('mongoose');
const User = require('./Models/User');
const dotenv = require('dotenv');

dotenv.config();

const CLOUD_URI = 'mongodb+srv://kuategodlove:07juin2005@cluster0.bcxxds2.mongodb.net/skillswapp?retryWrites=true&w=majority';

async function checkCloud() {
    try {
        await mongoose.connect(CLOUD_URI);
        console.log('✅ Connected to CLOUD MongoDB');
        const users = await User.find({ email: { $in: ['maurice@gmail.com', 'dorcas@gmail.com'] } }).select('email role status');
        console.log('📊 Cloud data check for Maurice/Dorcas:');
        console.log(JSON.stringify(users, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Cloud check failed:', error);
    }
}

checkCloud();
