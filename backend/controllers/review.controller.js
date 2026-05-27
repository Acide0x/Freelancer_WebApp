// controllers/review.controller.js
const mongoose = require("mongoose");
const Review   = require("../models/review.model");
const Job      = require("../models/job.model");
const User     = require("../models/user.model");

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Recompute a user's aggregate rating from the Review collection and persist
 * it back to User.ratings. Called after every create / delete operation.
 */
const syncUserRating = async (userId, session) => {
  const agg = await Review.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true } } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const average = agg.length ? parseFloat(agg[0].avg.toFixed(2)) : 0;
  const count   = agg.length ? agg[0].count : 0;

  await User.findByIdAndUpdate(
    userId,
    { $set: { "ratings.average": average, "ratings.count": count } },
    session ? { session } : {}
  );
};

/**
 * Standard populate for review documents returned to the client.
 */
const REVIEW_POPULATE = [
  { path: "reviewer", select: "fullName avatar role" },
  { path: "reviewee", select: "fullName avatar role" },
  { path: "job",      select: "title category status" },
];

// ============================================================================
// POST /reviews
// Submit a review for a completed job.
// ============================================================================
//
// Rules:
//   - Job must be "completed".
//   - Requester must be either the client or the assigned provider on the job.
//   - One review per (job, reviewer) — duplicate returns 409.
//   - Client   reviews the provider → type: "client_to_provider"
//   - Provider reviews the client   → type: "provider_to_client"
//
exports.submitReview = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { jobId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    // ── Input validation ────────────────────────────────────────────────────
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "A valid jobId is required" });
    }

    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Rating must be a number between 1 and 5" });
    }

    // ── Load job ────────────────────────────────────────────────────────────
    const job = await Job.findOne({ _id: jobId, isDeleted: { $ne: true } })
      .populate("client",         "fullName avatar role")
      .populate("assignedWorker", "fullName avatar role")
      .session(session);

    if (!job) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.status !== "completed") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Reviews can only be submitted for completed jobs. This job is "${job.status}".`,
      });
    }

    // ── Determine direction ────────────────────────────────────────────────
    const clientId   = (job.client?._id   ?? job.client)?.toString();
    const providerId = (job.assignedWorker?._id ?? job.assignedWorker)?.toString();
    const reviewerStr = reviewerId.toString();

    const isClient   = clientId   === reviewerStr;
    const isProvider = providerId === reviewerStr;

    if (!isClient && !isProvider) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this job and cannot review it",
      });
    }

    const revieweeId   = isClient ? providerId : clientId;
    const reviewType   = isClient ? "client_to_provider" : "provider_to_client";

    if (!revieweeId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: isClient
          ? "This job has no assigned provider to review"
          : "This job has no client to review",
      });
    }

    // ── Duplicate check ─────────────────────────────────────────────────────
    const existing = await Review.findOne({ job: jobId, reviewer: reviewerId }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "You have already submitted a review for this job",
        reviewId: existing._id,
      });
    }

    // ── Create review ───────────────────────────────────────────────────────
    const [review] = await Review.create(
      [
        {
          job:      jobId,
          reviewer: reviewerId,
          reviewee: revieweeId,
          type:     reviewType,
          rating:   ratingNum,
          comment:  comment?.trim() ?? "",
        },
      ],
      { session }
    );

    // ── Sync aggregate rating on reviewee ───────────────────────────────────
    await syncUserRating(revieweeId, session);

    await session.commitTransaction();

    // Populate for response
    const populated = await review.populate(REVIEW_POPULATE);

    return res.status(201).json({
      success: true,
      message: isClient
        ? "Your review of the provider has been submitted. Thank you!"
        : "Your review of the client has been submitted. Thank you!",
      review: populated,
    });
  } catch (error) {
    await session.abortTransaction();

    // Mongo duplicate key (race condition safety net)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a review for this job",
      });
    }

    console.error("💥 submitReview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit review",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  } finally {
    session.endSession();
  }
};

// ============================================================================
// GET /reviews/job/:jobId
// All reviews for a specific job (both directions).
// Public — no auth required, but deleted reviews are excluded.
// ============================================================================
exports.getReviewsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const reviews = await Review.find({ job: jobId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .populate(REVIEW_POPULATE);

    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error("💥 getReviewsByJob:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

// ============================================================================
// GET /reviews/user/:userId
// All reviews written ABOUT a user (their public review wall).
// Supports ?type=client_to_provider|provider_to_client and ?page/?limit.
// ============================================================================
exports.getReviewsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const filter = { reviewee: userId, isDeleted: { $ne: true } };
    if (type && ["client_to_provider", "provider_to_client"].includes(type)) {
      filter.type = type;
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate(REVIEW_POPULATE),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reviews,
      pagination: {
        currentPage: pageNum,
        totalPages:  Math.ceil(total / limitNum),
        totalReviews: total,
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error("💥 getReviewsForUser:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

// ============================================================================
// GET /reviews/my
// Reviews written BY the currently logged-in user.
// ============================================================================
exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const filter = { reviewer: req.user.id, isDeleted: { $ne: true } };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate(REVIEW_POPULATE),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reviews,
      pagination: {
        currentPage:  pageNum,
        totalPages:   Math.ceil(total / limitNum),
        totalReviews: total,
        hasMore:      pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error("💥 getMyReviews:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch your reviews" });
  }
};

// ============================================================================
// GET /reviews/check/:jobId
// Check whether the current user has already reviewed this job.
// Used by the frontend to decide whether to show the Review button.
// Returns: { reviewed: boolean, reviewId?: string }
// ============================================================================
exports.checkReviewed = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const existing = await Review.findOne({
      job:      jobId,
      reviewer: req.user.id,
      isDeleted: { $ne: true },
    }).select("_id rating type createdAt");

    return res.status(200).json({
      success:  true,
      reviewed: !!existing,
      review:   existing ?? null,
    });
  } catch (error) {
    console.error("💥 checkReviewed:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================================================
// DELETE /reviews/:reviewId
// Soft-delete a review (owner only, or admin).
// Re-syncs the reviewee's aggregate rating after deletion.
// ============================================================================
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId       = req.user.id;
    const isAdmin      = req.user.role === "admin";

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    const review = await Review.findOne({ _id: reviewId, isDeleted: { $ne: true } });
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (!isAdmin && review.reviewer.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only delete your own reviews" });
    }

    review.isDeleted  = true;
    review.deletedAt  = new Date();
    await review.save();

    // Re-sync the reviewee's rating average
    await syncUserRating(review.reviewee);

    return res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("💥 deleteReview:", error);
    return res.status(500).json({ success: false, message: "Failed to delete review" });
  }
};