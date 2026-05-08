// models/wallet.model.js
const mongoose = require("mongoose");

// ============================================================================
// 💰 WALLET MODEL
// ============================================================================
// All monetary values stored in PAISA (1 NPR = 100 paisa) to avoid
// floating-point precision issues. API layer converts to/from NPR.
// ============================================================================

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    /**
     * balance       — spendable amount (in paisa)
     * lockedBalance — funds held in escrow, not spendable (in paisa)
     * totalEarned   — lifetime provider earnings (in paisa, providers only)
     * totalSpent    — lifetime client spending (in paisa)
     */
    balance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },

    // Prevent concurrent writes corrupting balance (optimistic locking)
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Optimistic locking helper
walletSchema.methods.incrementVersion = function () {
  this.version += 1;
};

walletSchema.index({ user: 1 });

// ============================================================================
// 📒 TRANSACTION MODEL
// ============================================================================

const transactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Classification ──────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        "topup",           // Client tops up wallet via Stripe
        "escrow_lock",     // Client funds escrow for a job
        "escrow_release",  // Provider receives payment after job done
        "escrow_refund",   // Client refunded on cancellation
        "platform_fee",    // Platform commission deducted from escrow
        "withdrawal",      // Provider requests payout
        "bonus",           // Admin-issued credit
        "dispute_refund",  // Admin-issued refund after dispute
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    // ─── Amounts (all in paisa) ───────────────────────────────────────────────
    amount: { type: Number, required: true, min: 1 },  // paisa
    balanceBefore: { type: Number, required: true },           // paisa
    balanceAfter: { type: Number, required: true },           // paisa

    // ─── References ──────────────────────────────────────────────────────────
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },

    // Stripe-specific fields
    stripe: {
      sessionId: String,  // Stripe Checkout Session ID (cs_...)
      paymentIntentId: String,  // Stripe PaymentIntent ID (pi_...)
      chargedUsd: Number,  // USD amount charged to card
      rateUsed: Number,  // USD/NPR rate locked at initiation
    },

    // ─── Withdrawal-specific ─────────────────────────────────────────────────
    withdrawal: {
      // ⚠️  Enum must match VALID_METHODS in payment.controller.js requestWithdrawal.
      //     If you add a new method there, add it here too.
      method: {
        type: String,
        enum: ["bank", "esewa", "khalti", "cash"],
      },
      accountDetails: String,  // encrypted or opaque — admin processes manually
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "rejected"],
        default: "pending",
      },
      completedAt: Date,
      adminNote: String,
    },

    // ─── Audit ───────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "completed",
    },
    note: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ job: 1 });
transactionSchema.index({ "stripe.sessionId": 1 }, { sparse: true, unique: true });
transactionSchema.index({ "stripe.paymentIntentId": 1 }, { sparse: true });
transactionSchema.index({ "withdrawal.status": 1, createdAt: 1 });
transactionSchema.index({ status: 1, type: 1 });

const Wallet = mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Wallet, Transaction };