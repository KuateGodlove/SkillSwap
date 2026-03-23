// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../Models/User');

exports.authenticate = async (req, res, next) => {
  console.log(`🔐 Auth Middleware: ${req.method} ${req.url}`);
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token found in request headers');
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded for user:', decoded.userId, 'Role:', decoded.role);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log(`❌ User not found for ID: ${decoded.userId}`);
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log(`👤 authenticated user: ${user.firstName} (${user.role}) [${user.email}]`);
    
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        success: false,
        message: 'Account suspended' 
      });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      console.log(`🚫 Authorization Failed for ${req.user._id}: User Role is "${req.user.role}", which is NOT in required roles [${roles.join(', ')}]`);
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};