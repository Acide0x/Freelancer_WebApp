// backend/routes/payment.routes.js
"use strict";

const express = require("express");
const router = express.Router();

// ─── Middleware ──────────────────────────────────────────────────────────────
const { authMiddleware } = require("../middlewares/auth");
const paymentController = require("../controllers/payment.controller");

// ─── CORS & Body Parser Setup (for webhooks) ─────────────────────────────────
// Stripe webhook needs RAW body for signature verification
// This route MUST be defined BEFORE express.json() middleware runs on it
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }), // ← RAW body for Stripe
  paymentController.stripeWebhook            // ← Handler function (required!)
);

// ─── Authenticated Routes (all require login) ────────────────────────────────
// Apply auth middleware to all routes below using router.use()
// ⚠️  MUST pass a function as the second argument!
router.use(authMiddleware); // ✅ Correct: authMiddleware is a function

// ─── Wallet & Exchange ───────────────────────────────────────────────────────
router.get("/wallet", paymentController.getWallet);
router.get("/exchange-rate", paymentController.getExchangeRate);

// ─── Top-up (Stripe Embedded Checkout) ───────────────────────────────────────
router.post("/topup/initiate", paymentController.initiateTopup);
router.get("/topup/status", paymentController.topupStatus);

// ─── PayPal Escrow (Redirect Flow) ───────────────────────────────────────────
router.post("/escrow/:jobId/initiate-paypal", paymentController.initiatePaypalEscrow);
router.post("/paypal/complete", paymentController.completePaypalRedirect);

// ─── PayPal Escrow (Embedded Buttons Flow) ───────────────────────────────────
router.post("/escrow/:jobId/create-paypal-order", paymentController.createPaypalOrder);
router.post("/escrow/:jobId/capture-paypal", paymentController.capturePaypalEscrow);

// ─── Escrow Funding (from Wallet Balance) ────────────────────────────────────
router.post("/escrow/:jobId/fund", paymentController.fundEscrow);
router.get("/escrow/:jobId/status", paymentController.escrowStatus);

// ─── Admin Escrow Actions ────────────────────────────────────────────────────
// These should also check for admin role in the controller
router.post("/escrow/:jobId/release", paymentController.releaseEscrow);
router.post("/escrow/:jobId/refund", paymentController.refundEscrow);

// ─── Withdrawals ─────────────────────────────────────────────────────────────
router.post("/withdraw", paymentController.requestWithdrawal);
router.get("/withdrawals/pending", paymentController.getPendingWithdrawals);
router.patch("/admin/withdrawals/:txnId/complete", paymentController.completeWithdrawal);
router.patch("/admin/withdrawals/:txnId/reject", paymentController.rejectWithdrawal);

// ─── Admin Utilities ─────────────────────────────────────────────────────────
router.post("/admin/bonus", paymentController.adminBonus);
router.get("/admin/stats", paymentController.adminStats);

module.exports = router;