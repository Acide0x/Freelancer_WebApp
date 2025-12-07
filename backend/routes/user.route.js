// routes/user.route.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { signupLimiter, loginLimiter } = userController;

// ✅ Import your auth middleware (named verifyAuth)
const verifyAuth = require("../middlewares/authMiddleware");

// Public routes
router.post("/signup", signupLimiter, userController.signup);
router.post("/login", loginLimiter, userController.login);
router.post("/logout", userController.logout);

// ✅ Protected route: use verifyAuth middleware
router.patch("/profile", verifyAuth, userController.updateUser);

// Add this with your other routes
router.patch("/change-password", verifyAuth, userController.changePassword);

module.exports = router;