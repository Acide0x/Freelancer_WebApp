const express = require("express");
const router = express.Router();

const jobController = require("../controllers/job.controller");
const { verifyAuth, restrictTo } = require("../middlewares/authMiddleware");

console.log("✅ Job routes file loaded and exporting router");

// ============================================================================
// 🌍 PUBLIC ROUTES (No Authentication Required)
// ============================================================================

/**
 * GET /jobs
 * List all active OPEN jobs with optional filters & pagination
 * Access: Public (sanitized data for non-authenticated users)
 * Note: Only shows jobs with status="open" AND assignedWorker=null
 */
router.get("/", jobController.getAllJobs);

// ============================================================================
// 🔐 PROTECTED ROUTES (Authentication Required)
// ============================================================================

router.use(verifyAuth);

// ---------------------------------------------------------------------------
// 📋 COLLECTION ROUTES (Must come BEFORE /:id to avoid route conflicts)
// ---------------------------------------------------------------------------

/**
 * GET /jobs/provider
 * Get jobs relevant to logged-in provider (matching skills + service areas)
 * Access: Providers only
 */
router.get("/provider", restrictTo("provider"), jobController.getProviderJobs);

/**
 * GET /jobs/my
 * Get all jobs created by the logged-in client
 * Access: Clients only
 */
router.get("/my", restrictTo("customer"), jobController.getMyJobs);

/**
 * ✅ NEW: GET /jobs/offers
 * Get job offers for logged-in provider (direct hires + accepted applications awaiting response)
 * Access: Providers only
 */
router.get("/offers", restrictTo("provider"), jobController.getJobOffers);

/**
 * ✅ NEW: GET /jobs/my-applications
 * Get jobs provider has applied to (with application status)
 * Access: Providers only
 */
router.get("/my-applications", restrictTo("provider"), jobController.getMyApplications);

// ---------------------------------------------------------------------------
// 🎯 PARAMETERIZED ROUTES (Come AFTER collection routes)
// ---------------------------------------------------------------------------

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
router.post("/add", restrictTo("customer"), jobController.createJob);

/**
 * POST /jobs/:id/apply
 * Apply to an open job (provider only, Flow B)
 * Access: Providers only
 */
router.post("/:id/apply", restrictTo("provider"), jobController.applyToJob);

/**
 * PATCH /jobs/:id
 * Update job details (client only, safe fields only)
 * Access: Job owner (client) or Admin
 */
router.patch("/:id", restrictTo("customer"), jobController.updateJob);

/**
 * PATCH /jobs/:id/cancel
 * Cancel a job (client or assigned provider)
 * Access: Job owner, assigned provider, or Admin
 * Note: Authorization is also checked inside controller for assigned providers
 */
router.patch("/:id/cancel", jobController.cancelJob);

/**
 * PATCH /jobs/:id/fund-escrow
 * Fund escrow for assigned job (client only)
 * Access: Job owner (client) only
 */
router.patch("/:id/fund-escrow", restrictTo("customer"), jobController.fundEscrow);

/**
 * PATCH /jobs/:id/accept-application/:applicationId
 * Accept a provider's application (client only, Flow B)
 * Access: Job owner (client) only
 */
router.patch("/:id/accept-application/:applicationId", restrictTo("customer"), jobController.acceptApplication);

/**
 * PATCH /jobs/:id/respond
 * Accept or decline a job offer (provider only, Flow A & B)
 * Access: Assigned provider only
 * Note: Controller also verifies user is the assignedWorker for this job
 */
router.patch("/:id/respond", restrictTo("provider"), jobController.respondToJobOffer);

/**
 * PATCH /jobs/:id/start-work
 * Mark work as started (provider only, after escrow funded)
 * Access: Assigned provider only
 * Note: Controller also verifies user is the assignedWorker for this job
 */
router.patch("/:id/start-work", restrictTo("provider"), jobController.startWork);

/**
 * PATCH /jobs/:id/complete
 * Mark job as completed + optional review (client or assigned provider)
 * Access: Job owner or assigned provider
 * Note: Controller checks if user is either client OR assignedWorker
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
router.delete("/:id", restrictTo("customer", "admin"), jobController.deleteJob);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;