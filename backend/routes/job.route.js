const express = require("express");
const router = express.Router();

const jobController = require("../controllers/job.controller");
const { verifyAuth } = require("../middlewares/authMiddleware");

console.log("✅ Job routes file loaded and exporting router");

// ============================================================================
// 🌍 PUBLIC ROUTES (No Authentication Required)
// ============================================================================

/**
 * GET /jobs
 * List all active jobs with optional filters & pagination
 * Access: Public (sanitized data for non-authenticated users)
 */
router.get("/", jobController.getAllJobs);

// ============================================================================
// 🔐 PROTECTED ROUTES (Authentication Required)
// ============================================================================

router.use(verifyAuth);

/**
 * GET /jobs/provider
 * Get jobs relevant to logged-in provider (matching skills + service areas)
 * Access: Providers only
 */
router.get("/provider", jobController.getProviderJobs);

/**
 * GET /jobs/my
 * Get all jobs created by the logged-in client
 * Access: Clients only
 */
router.get("/my", jobController.getMyJobs);

/**
 * GET /jobs/:id
 * Get single job details (sanitized based on viewer role)
 * Access: Authenticated users (data sanitized by role)
 */
router.get("/:id", jobController.getJobById);

/**
 * POST /jobs/add
 * Create a new job (supports direct hire + open application flows)
 * Access: Clients only
 */
router.post("/add", jobController.createJob);

/**
 * POST /jobs/:id/apply
 * Apply to an open job (provider only, Flow B)
 * Access: Providers only
 */
router.post("/:id/apply", jobController.applyToJob);

/**
 * PATCH /jobs/:id
 * Update job details (client only, safe fields only)
 * Access: Job owner (client) or Admin
 */
router.patch("/:id", jobController.updateJob);

/**
 * PATCH /jobs/:id/cancel
 * Cancel a job (client or assigned provider)
 * Access: Job owner, assigned provider, or Admin
 */
router.patch("/:id/cancel", jobController.cancelJob);

/**
 * PATCH /jobs/:id/fund-escrow
 * Fund escrow for assigned job (client only)
 * Access: Job owner (client) only
 */
router.patch("/:id/fund-escrow", jobController.fundEscrow);

/**
 * PATCH /jobs/:id/accept-application/:applicationId
 * Accept a provider's application (client only, Flow B)
 * Access: Job owner (client) only
 */
router.patch("/:id/accept-application/:applicationId", jobController.acceptApplication);

/**
 * PATCH /jobs/:id/respond
 * Accept or decline a job offer (provider only, Flow A & B)
 * Access: Assigned provider only
 */
router.patch("/:id/respond", jobController.respondToJobOffer);

/**
 * PATCH /jobs/:id/start-work
 * Mark work as started (provider only, after escrow funded)
 * Access: Assigned provider only
 */
router.patch("/:id/start-work", jobController.startWork);

/**
 * PATCH /jobs/:id/complete
 * Mark job as completed + optional review (client or assigned provider)
 * Access: Job owner or assigned provider
 */
router.patch("/:id/complete", jobController.completeJob);

/**
 * PATCH /jobs/:id/end
 * Legacy alias for /complete (kept for backward compatibility)
 * Access: Job owner or assigned provider
 */
router.patch("/:id/end", jobController.endJob);

/**
 * DELETE /jobs/:id
 * Soft delete a job (admin or client who created it)
 * Access: Job owner or Admin
 */
router.delete("/:id", jobController.deleteJob);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;