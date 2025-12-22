const jwt = require("jsonwebtoken");

const checkAuth = (req, res, next) => {
    // Define public routes that don't require authentication
    const publicRoutes = [
        '/api/services',
        '/api/services/details/',
        '/api/services/user/'
    ];
    
    // Check if current path is a public route
    const isPublicRoute = publicRoutes.some(route => {
        // Exact match for root path
        if (route === '/api/services' && req.path === '/api/services') {
            return true;
        }
        // Starts with match for dynamic routes
        return req.path.startsWith(route);
    });
    
    // Skip authentication for public routes
    if (isPublicRoute) {
        console.log(`Public route accessed: ${req.path}`);
        return next();
    }
    
    // For protected routes, check authentication
    const authHeader = req.headers.authorization;
    console.log(authHeader, "this is auth header");
    
    if(!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Authorization header missing"
        });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token missing or malformed in authorization header"
        });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        console.log(process.env.JWT_SECRET, "this is the JWT secret");
        
        if (err) {
            console.error("Token verification error:", err);
            return res.status(403).json({
                success: false,
                message: "Invalid token"
            });
        }
        
        console.log("User authenticated:", decoded);
        
        // Attach user info to request object
        req.user = {
            userId: decoded.userId || decoded.id, // Handle both naming conventions
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName
        };
        
        next();
    });
}

module.exports = checkAuth;