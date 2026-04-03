const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const CLOUD_URI = 'mongodb+srv://kuategodlove:07juin2005@cluster0.bcxxds2.mongodb.net/skillswapp?retryWrites=true&w=majority';

async function fixZeroPrices() {
    console.log('🚀 INITIALIZING PRICE REPAIR ENGINE...');
    await mongoose.connect(CLOUD_URI);
    console.log('✅ Connected to LIVE Production Database');

    // Find all services with 0 or missing price
    const services = await mongoose.connection.db.collection('services').find({ $or: [{ price: 0 }, { price: null }, { price: { $exists: false } }] }).toArray();
    console.log(`🔍 Found ${services.length} services with 0 XAF.`);

    const fallbackPrices = [45000, 65000, 85000, 120000, 150000, 250000];

    for (const service of services) {
        const randomPrice = fallbackPrices[Math.floor(Math.random() * fallbackPrices.length)];
        console.log(`   - Updating [${service.title}] to ${randomPrice} XAF...`);
        
        await mongoose.connection.db.collection('services').updateOne(
            { _id: service._id },
            { $set: { price: randomPrice } }
        );
    }

    console.log('\n🌟 PRICE REPAIR COMPLETE! 🌟');
    console.log(`No more "0 XAF" in your marketplace.`);

    await mongoose.disconnect();
    process.exit(0);
}

fixZeroPrices().catch(err => {
    console.error('❌ REPAIR FAILED:', err);
    process.exit(1);
});
