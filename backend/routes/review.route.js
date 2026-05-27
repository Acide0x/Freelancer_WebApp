// routes/review.routes.js
const express        = require("express");
const router         = express.Router();
const reviewCtrl     = require("../controllers/review.controller");
const { verifyAuth } = require("../middlewares/authMiddleware");

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /reviews/job/:jobId
 * All reviews (both directions) for a completed job.
 * Useful for job detail pages.
 */
router.get("/job/:jobId", reviewCtrl.getReviewsByJob);

/**
 * GET /reviews/user/:userId
 * All reviews written ABOUT a user (their public review wall).
 * Query params:
 *   ?type=client_to_provider | provider_to_client
 *   ?page=1&limit=20
 */
router.get("/user/:userId", reviewCtrl.getReviewsForUser);

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

router.use(verifyAuth);

/**
 * POST /reviews
 * Submit a review for a completed job.
 * Body: { jobId, rating (1–5), comment? }
 *
 * The direction (client→provider or provider→client) is inferred from
 * who the authenticated user is on that job. One review per (job, user).
 */
router.post("/", reviewCtrl.submitReview);

/**
 * GET /reviews/my
 * All reviews the currently logged-in user has written.
 * Query params: ?page=1&limit=20
 */
router.get("/my", reviewCtrl.getMyReviews);

/**
 * GET /reviews/check/:jobId
 * Check whether the current user has already reviewed this job.
 * Returns: { reviewed: boolean, review: Review | null }
 * Used by the frontend to show/hide the Review button without an extra fetch.
 */
router.get("/check/:jobId", reviewCtrl.checkReviewed);

/**
 * DELETE /reviews/:reviewId
 * Soft-delete a review. Only the reviewer or an admin can delete.
 * Automatically re-syncs the reviewee's aggregate rating.
 */
router.delete("/:reviewId", reviewCtrl.deleteReview);

module.exports = router;