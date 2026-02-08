const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { signupLimiter, loginLimiter } = userController;

// Import your auth middleware
const verifyAuth = require("../middlewares/authMiddleware");

// Public routes
router.post("/signup", signupLimiter, userController.signup);
router.post("/login", loginLimiter, userController.login);
router.post("/logout", userController.logout);

// Protected routes
router.patch("/profile", verifyAuth, userController.updateUser);
router.patch("/change-password", verifyAuth, userController.changePassword);

// NEW: Provider onboarding route (protected)
router.patch("/onboarding", verifyAuth, userController.updateProviderOnboarding);

// NEW: Get current user profile (protected)
router.get("/profile", verifyAuth, userController.getProfile);

router.get('/providers', userController.getPublicProviders);



module.exports = router;