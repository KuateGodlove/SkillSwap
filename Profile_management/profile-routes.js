// Profile_management/profile-routes.js - DEBUG VERSION
const express = require('express');
const router = express.Router();

console.log('🔍 === DEBUGGING PROFILE ROUTES ===');

// Try to load the controller and check what's exported
try {
  console.log('📦 Attempting to import profile controller...');
  const profileController = require('./profile-controller');
  
  console.log('✅ Controller imported successfully');
  console.log('📋 All exports from controller:');
  
  // List ALL properties exported from the controller
  const controllerKeys = Object.keys(profileController);
  console.log(`Total exports: ${controllerKeys.length}`);
  
  controllerKeys.forEach(key => {
    const value = profileController[key];
    console.log(`  ${key}: ${typeof value}${typeof value === 'undefined' ? ' (UNDEFINED)' : ''}`);
  });
  
  // Specifically check the problematic function
  console.log('\n🔍 Checking deleteProfilePhoto:');
  console.log(`  Exists: ${'deleteProfilePhoto' in profileController}`);
  console.log(`  Type: ${typeof profileController.deleteProfilePhoto}`);
  console.log(`  Value:`, profileController.deleteProfilePhoto);
  
  if (typeof profileController.deleteProfilePhoto !== 'function') {
    console.error('❌ ERROR: deleteProfilePhoto is not a function!');
    
    // Check if it might be named differently
    console.log('\n🔍 Looking for similar function names:');
    controllerKeys.forEach(key => {
      if (key.toLowerCase().includes('delete') || key.toLowerCase().includes('photo')) {
        console.log(`  Found similar: ${key} (${typeof profileController[key]})`);
      }
    });
  }
  
  // Import other dependencies
  console.log('\n📦 Importing auth middleware...');
  const checkAuth = require('../auth-middleware');
  console.log('✅ Auth middleware loaded');
  
  // Create a test route first
  console.log('\n🚀 Setting up test route...');
  router.get('/test', (req, res) => {
    res.json({
      message: 'Profile routes test',
      controllerExports: controllerKeys,
      deleteProfilePhotoExists: 'deleteProfilePhoto' in profileController,
      deleteProfilePhotoType: typeof profileController.deleteProfilePhoto
    });
  });
  
  // Apply auth middleware
  router.use(checkAuth);
  
  // ONLY add routes for functions that exist
  console.log('\n🔧 Setting up routes for available functions:');
  
  if (typeof profileController.getProfile === 'function') {
    console.log('  ✅ Adding GET /');
    router.get('/', profileController.getProfile);
  } else {
    console.log('  ❌ Skipping GET / - function not available');
  }
  
  if (typeof profileController.updateProfile === 'function') {
    console.log('  ✅ Adding PUT /');
    router.put('/', profileController.updateProfile);
  } else {
    console.log('  ❌ Skipping PUT / - function not available');
  }
  
  if (typeof profileController.updateSkills === 'function') {
    console.log('  ✅ Adding PUT /skills');
    router.put('/skills', profileController.updateSkills);
  } else {
    console.log('  ❌ Skipping PUT /skills - function not available');
  }
  
  if (typeof profileController.updateAvailability === 'function') {
    console.log('  ✅ Adding PUT /availability');
    router.put('/availability', profileController.updateAvailability);
  } else {
    console.log('  ❌ Skipping PUT /availability - function not available');
  }
  
  if (typeof profileController.getProfileById === 'function') {
    console.log('  ✅ Adding GET /:userId (public)');
    router.get('/:userId', profileController.getProfileById);
  } else {
    console.log('  ❌ Skipping GET /:userId - function not available');
  }
  
  // Skip deleteProfilePhoto for now since it's causing issues
  console.log('  ⚠️  Skipping DELETE /photo - function has issues');
  // router.delete('/photo', profileController.deleteProfilePhoto);
  
  console.log('\n✅ Profile routes setup completed!');
  
} catch (error) {
  console.error('❌ FATAL ERROR setting up profile routes:', error.message);
  console.error('❌ Error stack:', error.stack);
  
  // Create emergency routes
  router.get('/', (req, res) => {
    res.status(500).json({
      error: 'Profile routes failed to load',
      message: error.message
    });
  });
}

console.log('=== DEBUGGING COMPLETE ===\n');

module.exports = router;