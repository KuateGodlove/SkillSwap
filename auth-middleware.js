const jwt = require("jsonwebtoken");

const checkAuth = (req, res, next) => {
    console.log('🔐 Auth Middleware - Path:', req.path);
    console.log('🔐 Auth Middleware - Method:', req.method);
    
    // Define public routes that don't require authentication
    const publicRoutes = [
        '/api/services',
        '/api/services/details/',
        '/api/services/user/',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password'
    ];
    
    // Check if current path is a public route
    const isPublicRoute = publicRoutes.some(route => {
        // Exact match for root path
        if (route === req.path) {
            return true;
        }
        // Starts with match for dynamic routes
        if (req.path.startsWith(route)) {
            return true;
        }
        return false;
    });
    
    // Skip authentication for public routes
    if (isPublicRoute) {
        console.log(`✅ Public route accessed: ${req.path}`);
        return next();
    }
    
    // For protected routes, check authentication
    const authHeader = req.headers.authorization;
    console.log('🔐 Authorization Header:', authHeader);
    
    if (!authHeader) {
        console.log('❌ No authorization header');
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please login."
        });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
        console.log('❌ Invalid authorization format. Expected: Bearer <token>');
        return res.status(401).json({
            success: false,
            message: "Invalid authorization format"
        });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
        console.log('❌ Token missing after Bearer');
        return res.status(401).json({
            success: false,
            message: "Token missing"
        });
    }
    
    console.log('🔑 Token extracted (first 20 chars):', token.substring(0, 20) + '...');

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'your-fallback-secret-key-change-this';
    console.log('🔑 JWT Secret exists:', !!process.env.JWT_SECRET);
    
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            console.error("❌ Token verification error:", err.message);
            
            let errorMessage = "Invalid token";
            if (err.name === 'TokenExpiredError') {
                errorMessage = "Token expired. Please login again.";
            } else if (err.name === 'JsonWebTokenError') {
                errorMessage = "Invalid token format";
            }
            
            return res.status(401).json({
                success: false,
                message: errorMessage
            });
        }
        
        console.log("✅ Token verified successfully");
        console.log("📋 Decoded token payload:", decoded);
        
        // Extract user ID from various possible fields
        let userId = decoded.userId || decoded.id || decoded._id || decoded.sub;
        
        if (!userId) {
            console.log('❌ No user ID found in token payload');
            console.log('Available fields:', Object.keys(decoded));
            return res.status(401).json({
                success: false,
                message: "Invalid token payload"
            });
        }
        
        console.log(`✅ User authenticated. User ID: ${userId}`);
        
        // Attach user info to request object
        req.user = {
            id: userId, // Use 'id' to match what your controller expects
            userId: userId,
            email: decoded.email,
            firstName: decoded.firstName || '',
            lastName: decoded.lastName || '',
            // Add all decoded fields for debugging
            ...decoded
        };
        
        console.log('✅ Attached user to request:', { id: req.user.id, email: req.user.email });
        
        next();
    });
}

module.exports = checkAuth;