// models/review.model.js
const mongoose = require("mongoose");

// ============================================================================
// REVIEW MODEL
// ============================================================================
//
// Each document represents ONE review written by one user about another,
// anchored to a specific completed job.
//
// REVIEW DIRECTIONS:
//   reviewer: client   → reviewee: provider  (type: "client_to_provider")
//   reviewer: provider → reviewee: client    (type: "provider_to_client")
//
// UNIQUENESS RULE:
//   One review per (job, reviewer) pair. This means:
//   - A client CAN review the same provider across multiple jobs (different jobId).
//   - A client CANNOT submit two reviews for the same job.
//   Enforced by a unique compound index: { job, reviewer }
//
// AGGREGATE RATINGS:
//   After every create/update/delete, review.controller.js recomputes the
//   reviewee's User.ratings.average and User.ratings.count from this collection.
//   The User.ratings fields are the single source of truth for display;
//   this collection is the source of truth for individual review records.
// ============================================================================

const reviewSchema = new mongoose.Schema(
  {
    // ─── Job anchor ───────────────────────────────────────────────────────────
    job: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Job",
      required: true,
    },

    // ─── Parties ──────────────────────────────────────────────────────────────
    reviewer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      comment:  "The user who wrote this review",
    },
    reviewee: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      comment:  "The user being reviewed",
    },

    // ─── Direction ────────────────────────────────────────────────────────────
    // Explicit enum so queries like "all reviews a provider has received" are O(1)
    type: {
      type:     String,
      enum:     ["client_to_provider", "provider_to_client"],
      required: true,
    },

    // ─── Review content ───────────────────────────────────────────────────────
    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
    },
    comment: {
      type:      String,
      trim:      true,
      maxlength: 1000,
      default:   "",
    },

    // ─── Soft delete ──────────────────────────────────────────────────────────
    isDeleted: {
      type:    Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt = review submission date; updatedAt for edits
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Enforce one review per (job, reviewer) — prevents duplicate submissions
reviewSchema.index({ job: 1, reviewer: 1 }, { unique: true });

// "All reviews written about a user" — provider/client profile pages
reviewSchema.index({ reviewee: 1, isDeleted: 1, createdAt: -1 });

// "All reviews written by a user" — my reviews page
reviewSchema.index({ reviewer: 1, isDeleted: 1, createdAt: -1 });

// "All reviews for a job" — job detail page
reviewSchema.index({ job: 1, isDeleted: 1 });

// Feed by type + reviewee — e.g. "provider received reviews"
reviewSchema.index({ type: 1, reviewee: 1, isDeleted: 1 });

module.exports = mongoose.model("Review", reviewSchema);