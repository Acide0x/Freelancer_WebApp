// routes/job.routes.js
const express = require("express");
const router  = express.Router();

const jobController                = require("../controllers/job.controller");
const { verifyAuth, restrictTo }   = require("../middlewares/authMiddleware");

// ============================================================================
// 🌍 PUBLIC ROUTES
// ============================================================================

/**
 * GET /jobs
 * Public job feed — open jobs only, sanitized for unauthenticated viewers
 */
router.get("/", jobController.getAllJobs);

// ============================================================================
// 🔐 ALL ROUTES BELOW REQUIRE AUTH
// ============================================================================

router.use(verifyAuth);

// ---------------------------------------------------------------------------
// 📋 COLLECTION / STATIC-SEGMENT ROUTES
// Must come BEFORE /:id or Express will treat them as IDs
// ---------------------------------------------------------------------------

/** GET /jobs/my              — client's own jobs */
router.get("/my",               restrictTo("customer"),          jobController.getMyJobs);

/** GET /jobs/offers          — provider's pending job offers */
router.get("/offers",           restrictTo("provider", "freelancer"),          jobController.getJobOffers);

/** GET /jobs/my-applications — provider's submitted applications */
router.get("/my-applications",  restrictTo("provider", "freelancer"),          jobController.getMyApplications);

/**
 * GET /jobs/assigned
 * Provider's jobs where they ARE the assignedWorker.
 * Covers both direct-hire (Flow A) and accepted applications (Flow B).
 * FIX: includes "freelancer" role — frontend treats both as providers but
 * restrictTo("provider") alone was rejecting freelancer-role users with 400.
 */
router.get("/assigned",         restrictTo("provider", "freelancer"),          jobController.getMyAssignedJobs);

/** GET /jobs/provider        — jobs matching provider's skills + service areas */
router.get("/provider",         restrictTo("provider", "freelancer"),          jobController.getProviderJobs);

// ---------------------------------------------------------------------------
// 🎯 PARAMETERIZED ROUTES (after all static segments)
// ---------------------------------------------------------------------------

/** POST /jobs/add            — create job (client only) */
router.post("/add",             restrictTo("customer"),          jobController.createJob);

/** GET  /jobs/:id            — single job detail */
router.get("/:id",                                               jobController.getJobById);

/** POST /jobs/:id/apply      — provider applies to open job */
router.post("/:id/apply",       restrictTo("provider", "freelancer"),          jobController.applyToJob);

/** PATCH /jobs/:id           — client updates job details */
router.patch("/:id",            restrictTo("customer"),          jobController.updateJob);

/** PATCH /jobs/:id/cancel    — client or assigned provider cancels */
router.patch("/:id/cancel",                                      jobController.cancelJob);

/** PATCH /jobs/:id/fund-escrow — client funds escrow */
router.patch("/:id/fund-escrow", restrictTo("customer"),         jobController.fundEscrow);

/** PATCH /jobs/:id/accept-application/:applicationId — client selects a provider */
router.patch(
  "/:id/accept-application/:applicationId",
  restrictTo("customer"),
  jobController.acceptApplication
);

/** PATCH /jobs/:id/respond   — provider accepts or declines offer */
router.patch("/:id/respond",    restrictTo("provider", "freelancer"),          jobController.respondToJobOffer);


/** PATCH /jobs/:id/complete  — client or provider marks job complete */
router.patch("/:id/complete",                                    jobController.completeJob);

/** PATCH /jobs/:id/end       — legacy alias for /complete */
router.patch("/:id/end",                                         jobController.endJob);

/** DELETE /jobs/:id          — soft delete (owner or admin) */
router.delete("/:id",           restrictTo("customer", "admin"), jobController.deleteJob);

module.exports = router;