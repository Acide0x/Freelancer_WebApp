// src/routes/admin.route.js
const express = require("express");
const { getPendingProviders, updateProviderVerification } = require("../controllers/admin.controller");

const router = express.Router();

// 🔥 Middleware REMOVED for testing
// const { protect } = require("../middleware/auth");
// const { restrictTo } = require("../middleware/auth"); // or adminOnly

// router.use(protect);
// router.use(restrictTo("admin")); // or adminOnly

router.get("/providers/pending", getPendingProviders);
router.patch("/providers/:userId/verify", updateProviderVerification);

module.exports = router;