// routes/payment.routes.js
const express = require("express");
const router = express.Router();

const {
  getExchangeRate,
  getWallet,
  initiateTopup,
  topupStatus,
  stripeWebhook,
  fundEscrow,
  escrowStatus,
  releaseEscrow,
  refundEscrow,
  requestWithdrawal,
  getPendingWithdrawals,
  completeWithdrawal,
  rejectWithdrawal,
  adminBonus,
  adminStats,
} = require("../controllers/payment.controller");

const { verifyAuth, restrictTo } = require("../middlewares/authMiddleware");

// ============================================================================
// 🔔 STRIPE WEBHOOK
// ⚠️  MUST be registered BEFORE any body-parser middleware runs on this router.
//     Stripe requires the raw, unparsed request body for signature verification.
//     express.raw() is applied ONLY to this one route — all others use the
//     global express.json() already applied in index.js.
// ============================================================================
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// ─── All other payment routes require authentication ──────────────────────────
router.use(verifyAuth);

// ============================================================================
// 💱 EXCHANGE RATE
// ============================================================================

/** GET /payment/exchange-rate — live USD/NPR rate (cached 10 min) */
router.get("/exchange-rate", getExchangeRate);

// ============================================================================
// 💳 WALLET
// ============================================================================

/** GET /payment/wallet — balance + paginated transaction history */
router.get("/wallet", getWallet);

// ============================================================================
// 🔝 TOP-UP via STRIPE CHECKOUT
// ============================================================================

/** POST /payment/topup/initiate — create Stripe Checkout Session, returns checkoutUrl */
router.post("/topup/initiate", initiateTopup);

/** GET  /payment/topup/status  — poll for webhook fulfillment on the success page */
router.get("/topup/status", topupStatus);

// ============================================================================
// 🔒 ESCROW
// ============================================================================

/** POST /payment/escrow/:jobId/fund    — client locks funds for a job */
router.post("/escrow/:jobId/fund", restrictTo("customer"), fundEscrow);

/** GET  /payment/escrow/:jobId/status — audit trail (participant or admin) */
router.get("/escrow/:jobId/status", escrowStatus);

/** POST /payment/escrow/:jobId/release — admin releases payment to provider */
router.post("/escrow/:jobId/release", restrictTo("admin"), releaseEscrow);

/** POST /payment/escrow/:jobId/refund  — admin refunds client on cancellation */
router.post("/escrow/:jobId/refund", restrictTo("admin"), refundEscrow);

// ============================================================================
// 💸 WITHDRAWALS (provider ↔ admin)
// ============================================================================

/** POST  /payment/withdraw — provider requests a payout */
router.post("/withdraw", restrictTo("provider"), requestWithdrawal);

/** GET   /payment/admin/pending-withdrawals — admin queue (FIFO) */
router.get("/admin/pending-withdrawals", restrictTo("admin"), getPendingWithdrawals);

/** PATCH /payment/admin/withdrawals/:txnId/complete — mark paid externally */
router.patch("/admin/withdrawals/:txnId/complete", restrictTo("admin"), completeWithdrawal);

/** PATCH /payment/admin/withdrawals/:txnId/reject  — reject & restore balance */
router.patch("/admin/withdrawals/:txnId/reject", restrictTo("admin"), rejectWithdrawal);

// ============================================================================
// 🎁 ADMIN UTILITIES
// ============================================================================

/** POST /payment/admin/bonus — manually credit any user's wallet */
router.post("/admin/bonus", restrictTo("admin"), adminBonus);

/** GET  /payment/admin/stats — platform-wide financial dashboard */
router.get("/admin/stats", restrictTo("admin"), adminStats);

module.exports = router;