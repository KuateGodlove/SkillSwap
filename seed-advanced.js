const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const CLOUD_URI = 'mongodb+srv://kuategodlove:07juin2005@cluster0.bcxxds2.mongodb.net/skillswapp?retryWrites=true&w=majority';

async function seedAdvanced() {
    console.log('🚀 INITIALIZING PREMIUM CONTENT ENGINE...');
    await mongoose.connect(CLOUD_URI);
    console.log('✅ Connected to LIVE Production Database');

    // 1. Get existing Admin for attribution
    const admin = await mongoose.connection.db.collection('users').findOne({ role: 'admin' });
    const providers = await mongoose.connection.db.collection('users').find({ role: 'provider' }).toArray();
    const clients = await mongoose.connection.db.collection('users').find({ role: 'client' }).toArray();

    if (providers.length === 0 || clients.length === 0) {
        console.error('❌ You need at least one provider and one client to seed more data.');
        process.exit(1);
    }

    const providerId = providers[0]._id;
    const clientId = clients[0]._id;

    // 2. High-Quality Services (Cameroon Specific / XAF)
    const premiumServices = [
        {
            title: "Professional Mobile App Development (Flutter/React Native)",
            description: "Build high-performance, cross-platform mobile applications for your business. Includes UI/UX design, API integration, and play store deployment. Perfect for startups in Douala and Yaoundé wanting to scale.",
            category: "Development",
            price: 750000,
            deliveryTime: "30 Days",
            providerId,
            status: "approved",
            rating: 4.9,
            totalReviews: 12,
            completedProjects: 8,
            images: ["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=1000"]
        },
        {
            title: "Premium Brand Identity & Logo Design Bundle",
            description: "Transform your brand with a professional logo, brand guidelines, and social media kits. We create visuals that scream authority and professionalism for modern African corporations.",
            category: "Design",
            price: 85000,
            deliveryTime: "5 Days",
            providerId,
            status: "approved",
            rating: 5.0,
            totalReviews: 24,
            completedProjects: 15,
            images: ["https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=1000"]
        },
        {
            title: "SEO Optimization & Content Marketing Strategy",
            description: "Get your business to the first page of Google. I provide keyword research, on-page SEO, and 4 high-quality articles tailored to your niche to drive organic traffic.",
            category: "Marketing",
            price: 150000,
            deliveryTime: "14 Days",
            providerId,
            status: "approved",
            rating: 4.7,
            totalReviews: 8,
            completedProjects: 5
        },
        {
            title: "Virtual Assistant for Executives (Administrative Support)",
            description: "Dedicated administrative support including email management, scheduling, data entry, and basic research. Save time and focus on growing your core business while I handle the details.",
            category: "Business",
            price: 45000,
            deliveryTime: "Monthly",
            providerId,
            status: "approved"
        },
        {
            title: "Digital Marketing & Social Media Management (3 Month Plan)",
            description: "Full management of Facebook, Instagram, and LinkedIn. Includes content creation, daily posting, and engagement monitoring. Boost your online presence effectively.",
            category: "Marketing",
            price: 250000,
            deliveryTime: "90 Days",
            providerId,
            status: "approved"
        }
    ];

    // 3. Realistic RFQs (Requests for Quotation)
    const activeRfqs = [
        {
            title: "Need E-commerce website for my boutique in Bastos",
            description: "I am looking for a professional developer to build a modern e-commerce site for my fashion items. Must support local payment gateways and be mobile responsive.",
            category: "Development",
            budget: 450000,
            clientId,
            status: "open",
            createdAt: new Date(),
            deadline: new Date(Date.now() + 7 * 86400000)
        },
        {
            title: "Graphic Designer for Corporate 2024 Report",
            description: "We need a designer to layout our 50-page annual report. Clean, corporate, and minimalist aesthetic required. Experience with InDesign preferred.",
            category: "Design",
            budget: 120000,
            clientId,
            status: "open",
            createdAt: new Date()
        },
        {
            title: "French to English Translator for Legal Documents",
            description: "Looking for a certified translator to handle business contracts. Must be accurate and fast. Approximately 5000 words total.",
            category: "Writing",
            budget: 65000,
            clientId,
            status: "open"
        }
    ];

    // 4. Notifications for live feeling
    const demoNotifications = [
        { recipient: clientId, sender: providerId, type: "proposal", message: "A provider has submitted a new proposal for your e-commerce request!", read: false, createdAt: new Date() },
        { recipient: providerId, sender: clientId, type: "order", message: "You have received a new order for 'Mobile App Development'!", read: false, createdAt: new Date() }
    ];

    console.log('📦 PUSHING ENHANCED SERVICES...');
    await mongoose.connection.db.collection('services').insertMany(premiumServices);
    
    console.log('📦 PUSHING ACTIVE RFQS...');
    await mongoose.connection.db.collection('rfqs').insertMany(activeRfqs);

    console.log('📦 PUSHING LIVE NOTIFICATIONS...');
    await mongoose.connection.db.collection('notifications').insertMany(demoNotifications);

    console.log('\n🌟 PRE-LIVE ASSETS SEEDED SUCCESSFULLY! 🌟');
    console.log('- 5 High-Value Services added');
    console.log('- 3 Active RFQs added');
    console.log('- Mock notifications injected for a busy feeling');
    console.log('All prices are in XAF as requested.');

    await mongoose.disconnect();
    process.exit(0);
}

seedAdvanced().catch(err => {
    console.error('❌ SEEDING FAILED:', err);
    process.exit(1);
});
