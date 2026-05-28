// backend/middleware/auth.js
"use strict";

const jwt = require("jsonwebtoken");

/**
 * Auth middleware - verifies JWT from header or cookie
 */
function authMiddleware(req, res, next) {
  // Support Bearer token in header
  const authHeader = req.headers.authorization;
  let token = null;
  
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } 
  // Support HttpOnly cookie (if using cookie-parser)
  else if (req.cookies?.auth_token) {
    token = req.cookies.auth_token;
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required. Please log in." 
    });
  }
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or expired token" 
    });
  }
}

/**
 * Optional auth - attaches user if token present, but doesn't fail if missing
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
}

// ✅ Export as named functions (not default)
module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};