const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", ""); // Remove "Bearer " from the token

  if (!token) {
    return res.status(401).json({ success: false, message: "Access Denied. Please log in." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Logging for debugging
    console.log("Token:", token);
    console.log("Decoded Token:", verified);
    console.log("Requested User ID:", req.params.userId);
    console.log("Authenticated User ID:", verified.userId);

    // Fetch the authenticated user from the database
    const user = await User.findById(verified.userId).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    // Attach the user object to the request
    req.user = user;

    // Allow admins to bypass the userId check
    if (user.role === "admin") {
      console.log("Admin access granted.");
      return next();
    }

    // Check if the userId in the route matches the authenticated user's ID
    if (req.params.userId && req.params.userId !== verified.userId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to perform this action." });
    }

    next();
  } catch (err) {
    console.error("Token verification error:", err); // Log the error for debugging
    res.status(400).json({ success: false, message: "Invalid Token." });
  }
};

module.exports = verifyAuth;