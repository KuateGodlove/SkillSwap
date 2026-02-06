// Service_request_management/request-routes.js - DEBUG VERSION
const express = require('express');
const router = express.Router();

console.log('🔍 === DEBUGGING REQUEST ROUTES ===');

try {
  // Load controller
  console.log('📦 Loading request controller...');
  const requestController = require('./request-controller');
  console.log('✅ Request controller loaded');
  console.log('📋 Available methods:', Object.keys(requestController));
  
  // Check specific methods
  const requiredMethods = ['createRequest', 'getMyRequests', 'getRequests', 'getRequestById', 
                          'updateRequest', 'deleteRequest', 'updateRequestStatus'];
  
  console.log('\n🔍 Checking required methods:');
  requiredMethods.forEach(method => {
    if (requestController[method]) {
      console.log(`  ${method}: ${typeof requestController[method]} ✅`);
    } else {
      console.log(`  ${method}: NOT FOUND ❌`);
    }
  });
  
  // Load middleware
  console.log('\n📦 Loading auth middleware...');
  const checkAuth = require('../auth-middleware');
  console.log(`  checkAuth type: ${typeof checkAuth} ${typeof checkAuth === 'function' ? '✅' : '❌'}`);
  
  console.log('\n📦 Loading upload utility...');
  const upload = require('../utils/upload');
  console.log(`  upload type: ${typeof upload} ${upload.single ? '(has single method) ✅' : '❌'}`);
  
  // Set up routes
  console.log('\n🚀 Setting up routes...');
  
  // Only add routes for methods that exist
  if (requestController.createRequest && typeof checkAuth === 'function') {
    console.log('  ✅ Adding POST /');
    router.post('/', checkAuth, upload.array('attachments', 5), requestController.createRequest);
  }
  
  if (requestController.getMyRequests && typeof checkAuth === 'function') {
    console.log('  ✅ Adding GET /user/my-requests');
    router.get('/user/my-requests', checkAuth, requestController.getMyRequests);
  } else {
    console.log('  ❌ Skipping GET /user/my-requests');
  }
  
  if (requestController.getRequests) {
    console.log('  ✅ Adding GET /');
    router.get('/', requestController.getRequests);
  }
  
  if (requestController.getRequestById) {
    console.log('  ✅ Adding GET /:id');
    router.get('/:id', requestController.getRequestById);
  }
  
  if (requestController.updateRequest && typeof checkAuth === 'function') {
    console.log('  ✅ Adding PUT /:id');
    router.put('/:id', checkAuth, upload.array('attachments', 5), requestController.updateRequest);
  }
  
  if (requestController.deleteRequest && typeof checkAuth === 'function') {
    console.log('  ✅ Adding DELETE /:id');
    router.delete('/:id', checkAuth, requestController.deleteRequest);
  }
  
  if (requestController.updateRequestStatus && typeof checkAuth === 'function') {
    console.log('  ✅ Adding PATCH /:id/status');
    router.patch('/:id/status', checkAuth, requestController.updateRequestStatus);
  }
  
  console.log('\n✅ Request routes setup completed!');
  
} catch (error) {
  console.error('❌ Error setting up request routes:', error);
  console.error('❌ Error stack:', error.stack);
  
  // Create fallback route
  router.get('/', (req, res) => {
    res.status(500).json({
      error: 'Request routes failed to load',
      message: error.message
    });
  });
}

console.log('=== REQUEST ROUTES DEBUG COMPLETE ===\n');

module.exports = router;