const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./Models/User');
const Service = require('./Models/Service');

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswapp';

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding');

    const adminEmail = 'kuategodlove379@gmail.com';
    const adminPassword = '07juin2005';

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('Hashed password generated.');

    // Use findOneAndUpdate with upsert to create or update the admin user
    const adminUser = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          status: 'approved',
          emailVerified: true, // Admins don't need to verify
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Create a Dummy Provider and Service for testing
    const providerEmail = 'test_provider@skillswapp.com';
    const hashedProviderPassword = await bcrypt.hash('password123', 10);

    const provider = await User.findOneAndUpdate(
      { email: providerEmail },
      {
        $set: {
          password: hashedProviderPassword,
          firstName: 'Test',
          lastName: 'Provider',
          role: 'provider',
          status: 'approved',
          verificationStatus: 'verified'
        }
      },
      { upsert: true, new: true }
    );

    await Service.findOneAndUpdate(
      { provider: provider._id },
      {
        $set: {
          title: 'Professional Web Development',
          description: 'High quality React and Node.js development services.',
          category: 'Software Engineering',
          startingPrice: 500,
          isActive: true,
          isVerified: true
        }
      },
      { upsert: true }
    );

    console.log('✅ Admin and Test Data seeded successfully');
  } catch (error) {
    console.error('❌ Error during admin seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

seedAdmin();