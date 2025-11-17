const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
  // Try to get token from Authorization header first
  const authHeader = req.header("Authorization");
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7, authHeader.length).trim(); // Remove "Bearer " prefix
  } else {
    // Fallback: try to get token from cookie
    token = req.cookies?.token; // Assuming your login sets a cookie named 'token'
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Access Denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Logging for debugging (optional, can be removed in production)
    // console.log("Token:", token);
    // console.log("Decoded Token:", decoded);

    // Fetch the authenticated user from the database, excluding the password
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    // Check if the user account is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: "Account is inactive. Please contact support." });
    }

    // Attach the user object (and potentially the raw decoded token payload if needed elsewhere) to the request
    req.user = user;
    req.userIdFromToken = decoded.id; // Store the ID from the token separately if needed for checks

    // Allow admins to bypass the userId check
    if (user.role === "admin") {
      // console.log("Admin access granted.");
      return next();
    }

    // Optional: Check if the userId in the route params matches the authenticated user's ID
    // This is useful for routes like /api/users/:userId where only the user themselves or an admin should access
    // Uncomment the following block if this check is required for your route
    /*
    if (req.params.userId && req.params.userId !== decoded.id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to perform this action." });
    }
    */

    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    console.error("Token verification error:", err); // Log the error for debugging
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: "Invalid Token." });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Token has expired." });
    }
    // Generic error for other JWT issues (like invalid secret)
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

module.exports = verifyAuth;