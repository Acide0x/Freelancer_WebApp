// routes/admin.route.js
const express = require("express");
const router  = express.Router();

const admin                      = require("../controllers/admin.controller");
const { verifyAuth, restrictTo } = require("../middlewares/authMiddleware");

// Every route in this file is admin-only
router.use(verifyAuth, restrictTo("admin"));

// ============================================================================
// DASHBOARD
// ============================================================================

/** GET /api/admin/stats — platform summary numbers */
router.get("/stats", admin.getDashboardStats);

// ============================================================================
// USERS
// ============================================================================

/**
 * GET  /api/admin/users                — list all users (filterable)
 * Query: page, limit, role, search, isSuspended, kycVerified,
 *        verificationStatus, sortBy
 */
router.get("/users", admin.getAllUsers);

/** GET /api/admin/users/providers/pending — providers awaiting verification */
router.get("/users/providers/pending", admin.getPendingProviders);

/** GET  /api/admin/users/:id  — single user detail */
router.get("/users/:id", admin.getUserById);

/**
 * PATCH /api/admin/users/:id
 * Update any user field (fullName, email, role, isSuspended, kycVerified,
 * adminNotes, providerDetails sub-fields, etc.)
 */
router.patch("/users/:id", admin.updateUser);

/**
 * PATCH /api/admin/users/:id/suspend
 * Toggle or set suspension.
 * Body: { suspend: true|false, reason?: string }
 */
router.patch("/users/:id/suspend", admin.toggleSuspendUser);

/**
 * PATCH /api/admin/users/:userId/verify
 * Approve or reject a provider.
 * Body: { action: "approve"|"reject", rejectionReason?: string }
 */
router.patch("/users/:userId/verify", admin.updateProviderVerification);

/**
 * DELETE /api/admin/users/:id
 * Soft-delete (deactivates) by default.
 * Add ?permanent=true for hard delete.
 */
router.delete("/users/:id", admin.deleteUser);

// ============================================================================
// JOBS
// ============================================================================

/**
 * GET /api/admin/jobs
 * All jobs with filtering.
 * Query: page, limit, status, category, client, assignedWorker,
 *        includeDeleted, search, sortBy
 */
router.get("/jobs", admin.getAllJobs);

/** GET /api/admin/jobs/:id — full job detail */
router.get("/jobs/:id", admin.getJobById);

/**
 * PATCH /api/admin/jobs/:id
 * Edit any job field (title, description, category, budget, status,
 * isLive, isDeleted, address, city, urgency, preferredDate).
 * Status changes bypass the normal transition guard.
 */
router.patch("/jobs/:id", admin.updateJob);

/**
 * DELETE /api/admin/jobs/:id
 * Soft-delete by default; ?permanent=true for hard delete.
 */
router.delete("/jobs/:id", admin.deleteJob);

/** POST /api/admin/jobs/:id/restore — restore a soft-deleted job */
router.post("/jobs/:id/restore", admin.restoreJob);

// ============================================================================
// DISCUSSIONS
// ============================================================================

/**
 * GET  /api/admin/discussions
 * All discussions with filtering.
 * Query: page, limit, category, author, search, includeDeleted,
 *        isPinned, isClosed, sortBy
 *
 * POST /api/admin/discussions
 * Admin creates a discussion.
 * Body: { title, content, category, tags?, images?, isPinned? }
 */
router.route("/discussions")
  .get(admin.getAllDiscussions)
  .post(admin.createDiscussion);

/**
 * GET   /api/admin/discussions/:id — full discussion detail
 * PATCH /api/admin/discussions/:id — update any field (title, content,
 *        category, tags, images, isClosed, isPinned, isDeleted)
 * DELETE /api/admin/discussions/:id — soft-delete (?permanent=true for hard)
 */
router.route("/discussions/:id")
  .get(admin.getDiscussionById)
  .patch(admin.updateDiscussion)
  .delete(admin.deleteDiscussion);

/** POST  /api/admin/discussions/:id/restore — restore soft-deleted discussion */
router.post("/discussions/:id/restore", admin.restoreDiscussion);

/** PATCH /api/admin/discussions/:id/pin — toggle pinned status */
router.patch("/discussions/:id/pin", admin.togglePinDiscussion);


router.get("/providers/pending", admin.getPendingProviders);
router.patch("/providers/:userId/verify", admin.updateProviderVerification);

module.exports = router;