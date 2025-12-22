const  jwt = require("jsonwebtoken");
const checkAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader, "this is auth header");
    if(!authHeader) {
        return res.status(401).json({message: "Authorization header missing"});
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({message: "Token missing or malformed in authorization header"});
    }

    // Verify token (pseudo-code)
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        console.log(process.env.JWT_SECRET, "this is the JWT secret");
        if (err) {
            return res.status(403).json({message: "Invalid token"});
        }
        console.log("User authenticated:", user);
        req.user = user; // Attach user info to request object

        next();
    });
}
module.exports = checkAuth;