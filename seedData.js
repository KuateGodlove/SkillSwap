const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('./Models/User');
// Note: These paths assume standard model filenames based on controller imports
const Service = require('./Models/Service');
const RFQ = require('./Models/RFQ');
const Quote = require('./Models/Quote');
const Notification = require('./Models/Notification');

const providersData = [
    { name: 'Alice Smith', email: 'alice_smith@skill.com', expertise: 'Logo Design' },
    { name: 'Bob Johnson', email: 'bob_johnson@skill.com', expertise: 'App Development' },
    { name: 'Charlie Brown', email: 'charlie_brown@skill.com', expertise: 'SEO Audit' },
    { name: 'David Wilson', email: 'david_wilson@skill.com', expertise: 'Video Editing' },
    { name: 'Eva Davis', email: 'eva_davis@skill.com', expertise: 'Logo Design' },
    { name: 'Frank Miller', email: 'frank_miller@skill.com', expertise: 'App Development' },
    { name: 'Grace Lee', email: 'grace_lee@skill.com', expertise: 'SEO Audit' },
    { name: 'Hank Green', email: 'hank_green@skill.com', expertise: 'Video Editing' },
    { name: 'Ivy Chen', email: 'ivy_chen@skill.com', expertise: 'Logo Design' },
    { name: 'Jack White', email: 'jack_white@skill.com', expertise: 'App Development' },
];

const clientsData = [
    { name: 'Kevin Hart', email: 'kevin_hart@skill.com', needs: 'Marketing Strategy' },
    { name: 'Linda Ross', email: 'linda_ross@skill.com', needs: 'Social Media Help' },
    { name: 'Mike Dean', email: 'mike_dean@skill.com', needs: 'Custom Website' },
    { name: 'Nina Patel', email: 'nina_patel@skill.com', needs: 'Marketing Strategy' },
    { name: 'Oscar King', email: 'oscar_king@skill.com', needs: 'Social Media Help' },
    { name: 'Paula Young', email: 'paula_young@skill.com', needs: 'Custom Website' },
    { name: 'Quinn Gray', email: 'quinn_gray@skill.com', needs: 'Marketing Strategy' },
    { name: 'Riley Scott', email: 'riley_scott@skill.com', needs: 'Social Media Help' },
    { name: 'Sarah Adams', email: 'sarah_adams@skill.com', needs: 'Custom Website' },
    { name: 'Tom Baker', email: 'tom_barker@skill.com', needs: 'Marketing Strategy' },
];

async function seed() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswapp';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB for seeding...');

        // Clean up existing dummy data to avoid duplicates
        await User.deleteMany({ email: { $regex: '@skill.com$' } });
        console.log('🧹 Cleaned up existing test accounts.');

        const providers = [];
        const clients = [];

        // 1. Create Providers
        for (const p of providersData) {
            const password = await bcrypt.hash(p.email, 10);
            const [firstName, lastName] = p.name.split(' ');

            const user = await User.create({
                firstName,
                lastName,
                email: p.email,
                password,
                phone: '123-456-7890',
                country: 'USA',
                role: 'provider',
                status: 'approved',
                emailVerified: true,
                providerDetails: {
                    businessName: `${p.name} Freelancing`,
                    specialization: p.expertise,
                    skills: [p.expertise, 'Professional', 'Consulting'],
                    yearsExperience: 5,
                    hourlyRate: 65,
                    memberSince: new Date()
                },
                membership: {
                    tier: 'gold',
                    status: 'active',
                    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                }
            });
            providers.push(user);

            // Create a Service Listing for each provider
            await Service.create({
                providerId: user._id, // Matching controller naming
                title: `Premium ${p.expertise}`,
                description: `I will provide professional ${p.expertise} with high quality standards.`,
                category: 'Services',
                startingPrice: 200,
                status: 'active'
            });
        }
        console.log('✅ Created 10 Providers and their Services.');

        // 2. Create Clients and RFQs
        for (const c of clientsData) {
            const password = await bcrypt.hash(c.email, 10);
            const [firstName, lastName] = c.name.split(' ');

            const user = await User.create({
                firstName,
                lastName,
                email: c.email,
                password,
                phone: '555-0199',
                country: 'USA',
                role: 'client',
                status: 'approved',
                emailVerified: true,
                clientDetails: {
                    companyName: `${lastName} Ventures`,
                    jobTitle: 'Creative Director',
                    projectsPosted: 1
                },
                // Save a few providers for each client
                savedProviders: [providers[0]._id, providers[1]._id]
            });
            clients.push(user);

            // Create an RFQ for the client
            const rfq = await RFQ.create({
                clientId: user._id,
                title: `Project: ${c.needs}`,
                description: `Looking for an expert to handle our ${c.needs} requirements. Urgent start.`,
                category: 'Business',
                budgetMin: 1000,
                budgetMax: 5000,
                status: 'active',
                postedAt: new Date(),
                expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            });

            // Have a random provider submit a Quote
            const randomProvider = providers[Math.floor(Math.random() * providers.length)];
            await Quote.create({
                rfqId: rfq._id,
                providerId: randomProvider._id,
                amount: 2500,
                timeline: '2 weeks',
                coverLetter: "I have extensive experience in this area and would love to help you out.",
                status: 'pending',
                submittedAt: new Date()
            });
        }
        console.log('✅ Created 10 Clients, their RFQs, and initial Quotes.');

        console.log('\n🚀 Platform seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();