const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load local environment
dotenv.config();

// CONFIGURATION:
const LOCAL_URI = 'mongodb://localhost:27017/skillswapp';
const CLOUD_URI = 'mongodb+srv://kuategodlove:07juin2005@cluster0.bcxxds2.mongodb.net/skillswapp?retryWrites=true&w=majority';

async function migrate() {
    console.log('🚀 Starting Data Migration: Local -> Cloud');
    
    // 1. Connect to Local
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to LOCAL MongoDB');

    // 2. Connect to Cloud
    const cloudConn = await mongoose.createConnection(CLOUD_URI).asPromise();
    console.log('✅ Connected to CLOUD MongoDB Atlas');

    // 3. Get all collections from Local
    const collections = await localConn.db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} collections to migrate.`);

    for (const collectionInfo of collections) {
        const name = collectionInfo.name;
        if (name.startsWith('system.')) continue; // Skip system collections

        console.log(`\n🔄 Migrating [${name}]...`);
        
        // Get all data from local collection
        const localData = await localConn.db.collection(name).find({}).toArray();
        console.log(`   - Found ${localData.length} documents.`);

        if (localData.length > 0) {
            // Clear cloud collection first to avoid duplicates
            await cloudConn.db.collection(name).deleteMany({});
            
            // Insert into cloud
            const result = await cloudConn.db.collection(name).insertMany(localData);
            console.log(`   ✅ Success! Migrated ${result.insertedCount} documents.`);
        } else {
            console.log(`   - Skipping (empty).`);
        }
    }

    console.log('\n🌟 MIGRATION COMPLETE! 🌟');
    console.log('All your local work is now on your cloud website.');

    await localConn.close();
    await cloudConn.close();
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration Error:', err);
    process.exit(1);
});
