// routes/user.routes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyAuth } = require("../middlewares/authMiddleware");

console.log("Controller loaded:", Object.keys(userController)); // DEBUG LINE

// Public auth routes
router.post("/signup", userController.signupLimiter, userController.signup);
router.post("/login", userController.loginLimiter, userController.login);
router.post("/logout", userController.logout);

// Protected user routes
router.get("/profile", verifyAuth, userController.getProfile);
router.patch("/profile", verifyAuth, userController.updateUser);
router.patch("/change-password", verifyAuth, userController.changePassword);
router.patch("/onboarding", verifyAuth, userController.updateProviderOnboarding);

// Public provider routes
router.get("/providers", userController.getPublicProviders);
router.get("/providers/:id", userController.getProviderById);
router.get("/providers/:id/reviews", userController.getProviderReviews);

// Protected: Submit review (customers only)
router.post("/providers/:id/reviews", verifyAuth, userController.submitProviderReview);

module.exports = router;