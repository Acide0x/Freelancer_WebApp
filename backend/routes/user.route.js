// routes/auth.route.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/user.controller"); // Updated import name
const { signupLimiter, loginLimiter } = authController; // Import rate limiters

// Apply rate limiting and route handlers
// Signup route with rate limiter
router.post("/signup", signupLimiter, authController.signup);

// Login route with rate limiter
router.post("/login", loginLimiter, authController.login);

// Logout route (optional, also public)
router.post("/logout", authController.logout);

module.exports = router;