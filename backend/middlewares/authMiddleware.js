// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// ============================================================================
// 🔐 VERIFY AUTHENTICATION MIDDLEWARE
// ============================================================================
const verifyAuth = async (req, res, next) => {
  // Try to get token from Authorization header first
  const authHeader = req.header("Authorization");
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7, authHeader.length).trim();
  } else {
    // Fallback: try to get token from cookie
    token = req.cookies?.token;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Access Denied. No token provided." 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the authenticated user from the database, excluding the password
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "User not found." 
      });
    }

    // Check if the user account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: "Account is inactive. Please contact support." 
      });
    }

    // Attach the user object to the request
    req.user = user;
    req.userIdFromToken = decoded.id;

    // Allow admins to bypass certain checks (optional)
    if (user.role === "admin") {
      return next();
    }

    next();
  } catch (err) {
    console.error("Token verification error:", err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid Token." 
      });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: "Token has expired." 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or expired token." 
    });
  }
};

// ============================================================================
// 👮 ROLE-BASED AUTHORIZATION MIDDLEWARE
// ============================================================================
/**
 * Restrict access to specific roles
 * Usage: restrictTo("provider"), restrictTo("customer", "admin"), etc.
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Please log in to access this resource"
      });
    }

    // Check if user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
        requiredRoles: roles,
        yourRole: req.user.role
      });
    }

    next();
  };
};

// ============================================================================
// 👑 ADMIN-ONLY HELPER (Optional convenience wrapper)
// ============================================================================
const adminOnly = restrictTo("admin");

// ============================================================================
//  EXPORTS
// ============================================================================
module.exports = {
  verifyAuth,
  restrictTo,
  adminOnly
};