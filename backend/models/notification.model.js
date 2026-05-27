const mongoose = require("mongoose");

/**
 * NOTIFICATION TYPES — full reference:
 *
 * AUTH
 *   user_signup              → admin
 *   user_login               → admin
 *   failed_login_attempt     → admin (after threshold)
 *   account_locked           → admin + user
 *   password_changed         → user
 *   password_reset_requested → user
 *   account_suspended        → user
 *   account_reactivated      → user
 *   email_verified           → user
 *
 * PROVIDER
 *   provider_verification_submitted  → admin
 *   provider_verification_approved   → provider
 *   provider_verification_rejected   → provider
 *   provider_profile_updated         → admin (optional/audit)
 *   provider_went_online             → (internal/admin)
 *   provider_went_offline            → (internal/admin)
 *
 * CUSTOMER
 *   customer_profile_updated         → admin (audit)
 *   favorite_provider_added          → provider
 *
 * REVIEW
 *   review_submitted                 → provider + admin
 *
 * MODERATION / REPORT
 *   user_reported                    → admin
 *
 * KYC
 *   kyc_submitted                    → admin
 *   kyc_approved                     → user
 *   kyc_rejected                     → user
 */

const notificationSchema = new mongoose.Schema(
  {
    /* ─── Recipient ─────────────────────────────────────── */
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ─── Type ───────────────────────────────────────────── */
    type: {
      type: String,
      required: true,
      enum: [
        // Auth
        "user_signup",
        "user_login",
        "failed_login_attempt",
        "account_locked",
        "password_changed",
        "password_reset_requested",
        "account_suspended",
        "account_reactivated",
        "email_verified",
        // Provider
        "provider_verification_submitted",
        "provider_verification_approved",
        "provider_verification_rejected",
        "provider_profile_updated",
        "provider_went_online",
        "provider_went_offline",
        // Customer
        "customer_profile_updated",
        "favorite_provider_added",
        // Review
        "review_submitted",
        // Moderation
        "user_reported",
        // KYC
        "kyc_submitted",
        "kyc_approved",
        "kyc_rejected",
      ],
      index: true,
    },

    /* ─── Content ────────────────────────────────────────── */
    title: {
      type: String,
      required: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    /* ─── Related entity (contextual link) ───────────────── */
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    relatedEntity: {
      // e.g. a Job, Review, or KYC document ID
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedEntityModel: {
      // Mongoose model name for relatedEntity
      type: String,
      default: null,
    },

    /* ─── Metadata ────────────────────────────────────────── */
    meta: {
      // Free-form bag for extra context (IP, device, role, etc.)
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /* ─── Priority ────────────────────────────────────────── */
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },

    /* ─── Read state ─────────────────────────────────────── */
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,

    /* ─── Delivery channels ──────────────────────────────── */
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      // extend: push, sms, slack, etc.
    },
  },
  { timestamps: true }
);

/* ─── Compound indexes ───────────────────────────────────── */
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });

/* ─── TTL: auto-delete read notifications after 90 days ──── */
notificationSchema.index(
  { readAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90, partialFilterExpression: { isRead: true } }
);

/* ─── Instance method ────────────────────────────────────── */
notificationSchema.methods.markRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

module.exports = mongoose.model("Notification", notificationSchema);