// src/routes/admin.route.js
const express = require("express");
const { getPendingProviders, updateProviderVerification } = require("../controllers/admin.controller");

const router = express.Router();

// 🔥 Middleware REMOVED for testing
// router.use(protect);
// router.use(adminOnly);

router.get("/providers/pending", getPendingProviders);
router.patch("/providers/:userId/verify", updateProviderVerification);

module.exports = router;