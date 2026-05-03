// models/job.model.js
const mongoose = require("mongoose");

// ============================================================================
// ⚠️  FIELD SEMANTICS — READ BEFORE TOUCHING
// ============================================================================
//
//  isDeleted — soft-delete flag. Set to true only by deleteJob().
//              All normal queries use { isDeleted: { $ne: true } }.
//
//  isLive    — true from the moment a provider accepts an offer until the job
//              ends (completed / cancelled). Use this for dashboards and
//              provider busy-state. Never set manually — controller only.
//
// STATUS LIFECYCLE
//
//   open
//     ↓ client picks applicant (acceptApplication) OR direct-hire createJob
//   pending_provider_acceptance
//     ↓ provider confirms (respondToJobOffer → accept)
//   in_progress            ← isLive = true; work begins immediately
//     ↓ client pays admin (payment hook / fundEscrow)
//   escrow_funded          ← money secured with admin mid-work
//     ↓ job finishes (completeJob called by either party)
//   completed              ← admin pays provider; isLive = false
//
//   cancelled (from any non-terminal status)
//     → if escrow_funded: admin refunds client; isLive = false
//
//   disputed  → resolved  (admin-mediated branch)
//
// NOTE: escrow_funded is now a mid-work milestone, NOT a pre-work gate.
//       The provider does NOT need to wait for payment before starting.
// ============================================================================

const jobSchema = new mongoose.Schema(
  {
    // ─── Parties ─────────────────────────────────────────────────────────────
    client: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    assignedWorker: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
    },

    // ─── Job details ──────────────────────────────────────────────────────────
    title: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 100,
    },
    description: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 2000,
    },
    category: {
      type:     String,
      required: true,
      enum: [
        "Carpentry", "Plumbing", "Electrical", "Painting",
        "HVAC", "Welding", "Cooking", "Mechanic", "House Help",
      ],
    },

    // ─── Location ─────────────────────────────────────────────────────────────
    location: {
      address:   { type: String, required: true },
      city:      String,
      latitude:  Number,
      longitude: Number,
      // GeoJSON field — populated from lat/lng by controller
      coordinates: {
        type:   [Number], // [longitude, latitude]
        index:  "2dsphere",
        sparse: true,
      },
    },

    // ─── Financials ───────────────────────────────────────────────────────────
    budget: {
      type:     Number,
      required: true,
      min:      0,
    },
    escrow: {
      amount:     { type: Number, required: true },
      funded:     { type: Boolean, default: false },
      fundedAt:   Date,
      releasedAt: Date,
      refundedAt: Date,
    },

    // ─── Scheduling ───────────────────────────────────────────────────────────
    estimatedDuration: {
      value: Number,
      unit:  { type: String, enum: ["hours", "days"], default: "hours" },
    },
    urgency: {
      type:    String,
      enum:    ["low", "medium", "high"],
      default: "medium",
    },
    preferredDate: Date,

    // ─── Lifecycle ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "open",
        "pending_provider_acceptance",
        "in_progress",      // provider accepted → work starts immediately
        "escrow_funded",    // client pays admin mid-work
        "completed",        // admin confirms & pays provider
        "cancelled",
        "disputed",
        "resolved",
      ],
      default: "open",
    },

    /**
     * isLive — true only when a provider is financially committed and work
     * is imminent or underway.  Controlled entirely by the controller; never
     * set manually.
     *
     * Becomes true  → respondToJobOffer(accept)
     * Becomes false → completeJob / cancelJob / deleteJob
     */
    isLive: {
      type:    Boolean,
      default: false,
    },

    /**
     * isDeleted — soft-delete flag. Replaces the old "isActive" field.
     * false (default) = visible record
     * true            = soft-deleted; excluded from all normal queries
     */
    isDeleted: {
      type:    Boolean,
      default: false,
    },
    deletedAt: Date,

    // ─── Applications (Flow B) ───────────────────────────────────────────────
    applications: [
      {
        worker:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        proposedPrice: Number,
        message:       String,
        appliedAt:     { type: Date, default: Date.now },
      },
    ],

    // ─── Review ───────────────────────────────────────────────────────────────
    review: {
      rating:  { type: Number, min: 1, max: 5 },
      comment: String,
      date:    Date,
    },

    // ─── Misc ─────────────────────────────────────────────────────────────────
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ============================================================================
// 🗂️ INDEXES
// ============================================================================

// Public feed
jobSchema.index({ isDeleted: 1, status: 1, assignedWorker: 1 });

// Provider/category feed
jobSchema.index({ isDeleted: 1, status: 1, category: 1 });

// Client's own jobs
jobSchema.index({ client: 1, isDeleted: 1, status: 1, createdAt: -1 });

// Provider assigned jobs
jobSchema.index({ assignedWorker: 1, isDeleted: 1, status: 1 });

// Live jobs (dashboard queries)
jobSchema.index({ isLive: 1, assignedWorker: 1 });

// Applications lookup
jobSchema.index({ "applications.worker": 1, isDeleted: 1 });

// Misc
jobSchema.index({ "location.city": 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ deletedAt: 1 }, { sparse: true });

module.exports = mongoose.model("Job", jobSchema);