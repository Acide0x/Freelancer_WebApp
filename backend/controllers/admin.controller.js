// controllers/admin.controller.js
const User       = require("../models/user.model");
const Job        = require("../models/job.model");
const Discussion = require("../models/discussion.model");
const mongoose   = require("mongoose");

// ============================================================================
// HELPERS
// ============================================================================

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

// ============================================================================
// ██╗   ██╗███████╗███████╗██████╗     ███╗   ███╗ ██████╗ ███╗   ███╗████████╗
// ██║   ██║██╔════╝██╔════╝██╔══██╗    ████╗ ████║██╔════╝ ████╗ ████║╚══██╔══╝
// ██║   ██║███████╗█████╗  ██████╔╝    ██╔████╔██║██║  ███╗██╔████╔██║   ██║
// ██║   ██║╚════██║██╔══╝  ██╔══██╗    ██║╚██╔╝██║██║   ██║██║╚██╔╝██║   ██║
// ╚██████╔╝███████║███████╗██║  ██║    ██║ ╚═╝ ██║╚██████╔╝██║ ╚═╝ ██║   ██║
//  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝     ╚═╝ ╚═════╝ ╚═╝     ╚═╝   ╚═╝
// ============================================================================

// ─── Dashboard summary ──────────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * High-level platform statistics for the admin dashboard.
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalCustomers,
      suspendedUsers,
      pendingProviders,
      totalJobs,
      openJobs,
      inProgressJobs,
      completedJobs,
      cancelledJobs,
      totalDiscussions,
      deletedDiscussions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "provider" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ role: "provider", "providerDetails.verificationStatus": "pending" }),
      Job.countDocuments({ isDeleted: { $ne: true } }),
      Job.countDocuments({ isDeleted: { $ne: true }, status: "open" }),
      Job.countDocuments({ isDeleted: { $ne: true }, status: "in_progress" }),
      Job.countDocuments({ isDeleted: { $ne: true }, status: "completed" }),
      Job.countDocuments({ isDeleted: { $ne: true }, status: "cancelled" }),
      Discussion.countDocuments({ isDeleted: { $ne: true } }),
      Discussion.countDocuments({ isDeleted: true }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, providers: totalProviders, customers: totalCustomers, suspended: suspendedUsers, pendingVerification: pendingProviders },
        jobs:  { total: totalJobs, open: openJobs, inProgress: inProgressJobs, completed: completedJobs, cancelled: cancelledJobs },
        discussions: { total: totalDiscussions, deleted: deletedDiscussions },
      },
    });
  } catch (error) {
    console.error("❌ getDashboardStats:", error);
    return res.status(500).json({ success: false, message: "Failed to load stats" });
  }
};

// ============================================================================
// ██╗   ██╗███████╗███████╗██████╗     ██████╗ ██████╗ ██╗   ██╗██████╗
// ██║   ██║██╔════╝██╔════╝██╔══██╗   ██╔════╝██╔═══██╗██║   ██║██╔══██╗
// ██║   ██║███████╗█████╗  ██████╔╝   ██║     ██████╔╝██║   ██║██║  ██║
// ██║   ██║╚════██║██╔══╝  ██╔══██╗   ██║     ██╔══██╗██║   ██║██║  ██║
//  ╚████╔╝ ███████║███████╗██║  ██║   ╚██████╗██║  ██║╚██████╔╝██████╔╝
//   ╚═══╝  ╚══════╝╚══════╝╚═╝  ╚═╝    ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝
// ============================================================================

/**
 * GET /api/admin/users
 * List all users with filtering, search, and pagination.
 *
 * Query params:
 *   page, limit, role (customer|provider|admin), search (name/email),
 *   isSuspended (true|false), kycVerified (true|false),
 *   verificationStatus (incomplete|pending|approved|rejected), sortBy
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { role, search, isSuspended, kycVerified, verificationStatus, sortBy = "-createdAt" } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isSuspended !== undefined) filter.isSuspended = isSuspended === "true";
    if (kycVerified  !== undefined) filter.kycVerified  = kycVerified  === "true";
    if (verificationStatus) filter["providerDetails.verificationStatus"] = verificationStatus;

    if (search) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ fullName: regex }, { email: regex }];
    }

    const sortField = sortBy.startsWith("-") ? sortBy.slice(1) : sortBy;
    const sortDir   = sortBy.startsWith("-") ? -1 : 1;
    const allowedSorts = ["createdAt", "fullName", "email", "role", "ratings.average"];
    const sort = allowedSorts.includes(sortField) ? { [sortField]: sortDir } : { createdAt: -1 };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -passwordResetToken -emailVerificationToken")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: { total, page, pages: Math.ceil(total / limit), limit, hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (error) {
    console.error("❌ admin.getAllUsers:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

/**
 * GET /api/admin/users/:id
 * Full user record (no password fields).
 */
exports.getUserById = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid user ID" });

    const user = await User.findById(req.params.id)
      .select("-password -passwordResetToken -emailVerificationToken")
      .lean();

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("❌ admin.getUserById:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

/**
 * PATCH /api/admin/users/:id
 * Update any top-level user field except password.
 * Also handles suspend/unsuspend, role changes, and KYC flags.
 *
 * Body (all optional):
 *   fullName, email, role, phone, bio, isSuspended, isActive,
 *   kycVerified, adminNotes, avatar,
 *   providerDetails (sub-object — merged, not replaced)
 */
exports.updateUser = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid user ID" });

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Prevent admin from editing their own role/suspension through this endpoint
    if (req.params.id === req.user.id && (req.body.role !== undefined || req.body.isSuspended !== undefined)) {
      return res.status(400).json({ success: false, message: "Admins cannot change their own role or suspension status via this endpoint" });
    }

    const allowed = ["fullName", "email", "role", "phone", "bio", "isSuspended", "isActive", "kycVerified", "adminNotes", "avatar"];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    // Allow partial providerDetails update
    if (req.body.providerDetails && typeof req.body.providerDetails === "object") {
      const pd      = req.body.providerDetails;
      const allowed = ["headline", "workDescription", "rate", "minCallOutFee", "travelFeePerKm", "travelThresholdKm", "availabilityStatus", "isVerified", "isProfilePublic", "verificationStatus", "rejectionReason", "experienceYears"];
      allowed.forEach(f => {
        if (pd[f] !== undefined) user.providerDetails[f] = pd[f];
      });
    }

    await user.save({ validateBeforeSave: true });

    const updated = await User.findById(user._id)
      .select("-password -passwordResetToken -emailVerificationToken")
      .lean();

    return res.status(200).json({ success: true, message: "User updated", data: updated });
  } catch (error) {
    console.error("❌ admin.updateUser:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Validation failed", details: Object.values(error.errors).map(e => e.message) });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }
    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Soft-delete a user: stamps deletedAt, deactivates account.
 * Hard-delete available via ?permanent=true (use with caution).
 */
exports.deleteUser = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid user ID" });

    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: "Admins cannot delete their own account via this endpoint" });

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (req.query.permanent === "true") {
      await User.findByIdAndDelete(req.params.id);
      return res.status(200).json({ success: true, message: "User permanently deleted" });
    }

    // Soft delete
    user.isActive   = false;
    user.deletedAt  = new Date();
    user.isSuspended = true;
    await user.save();

    return res.status(200).json({ success: true, message: "User deactivated (soft-deleted)" });
  } catch (error) {
    console.error("❌ admin.deleteUser:", error);
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// ─── Provider verification (kept from original admin.controller.js) ──────────

/**
 * GET /api/admin/users/providers/pending
 * All provider accounts with verificationStatus = "pending".
 */
exports.getPendingProviders = async (req, res) => {
  try {
    const providers = await User.find({
      role: "provider",
      "providerDetails.verificationStatus": "pending",
    })
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ "providerDetails.submittedAt": -1 })
      .lean();

    return res.status(200).json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    console.error("❌ getPendingProviders:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch pending providers" });
  }
};

/**
 * PATCH /api/admin/users/:userId/verify
 * Approve or reject a provider application.
 * Body: { action: "approve" | "reject", rejectionReason?: string }
 */
exports.updateProviderVerification = async (req, res) => {
  const { userId } = req.params;
  const { action, rejectionReason } = req.body;

  if (!["approve", "reject"].includes(action))
    return res.status(400).json({ success: false, message: "Invalid action. Use 'approve' or 'reject'." });

  try {
    if (!isValidId(userId))
      return res.status(400).json({ success: false, message: "Invalid user ID" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "provider") return res.status(400).json({ success: false, message: "User is not a provider" });

    const currentStatus = user.providerDetails?.verificationStatus;
    if (currentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} provider with status '${currentStatus}'. Only 'pending' applications can be reviewed.`,
      });
    }

    if (action === "approve") {
      user.providerDetails.verificationStatus = "approved";
      user.providerDetails.isVerified         = true;
      user.providerDetails.rejectionReason    = undefined;
    } else {
      user.providerDetails.verificationStatus = "rejected";
      user.providerDetails.isVerified         = false;
      user.providerDetails.rejectionReason    = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
    }

    await user.save();
    console.log(`Admin ${req.user.id} ${action}d provider ${userId}`);

    return res.status(200).json({
      success: true,
      message: `Provider ${action}d successfully`,
      data: {
        id: user._id,
        verificationStatus: user.providerDetails.verificationStatus,
        ...(action === "reject" && { rejectionReason: user.providerDetails.rejectionReason }),
      },
    });
  } catch (error) {
    console.error("❌ updateProviderVerification:", error);
    return res.status(500).json({ success: false, message: "Server error during verification update" });
  }
};

/**
 * PATCH /api/admin/users/:id/suspend
 * Toggle suspension for any user.
 * Body: { suspend: true | false, reason?: string }
 */
exports.toggleSuspendUser = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid user ID" });

    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: "Cannot suspend your own account" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const suspend = req.body.suspend !== undefined ? !!req.body.suspend : !user.isSuspended;
    user.isSuspended = suspend;
    if (req.body.reason) user.adminNotes = req.body.reason;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${suspend ? "suspended" : "unsuspended"} successfully`,
      data: { id: user._id, isSuspended: user.isSuspended },
    });
  } catch (error) {
    console.error("❌ toggleSuspendUser:", error);
    return res.status(500).json({ success: false, message: "Failed to update suspension status" });
  }
};

// ============================================================================
//  ██╗ ██████╗ ██████╗      ██████╗██████╗ ██╗   ██╗██████╗
//  ██║██╔═══██╗██╔══██╗    ██╔════╝██╔══██╗██║   ██║██╔══██╗
//  ██║██║   ██║██████╔╝    ██║     ██████╔╝██║   ██║██║  ██║
//  ██║██║   ██║██╔══██╗    ██║     ██╔══██╗██║   ██║██║  ██║
//  ██║╚██████╔╝██████╔╝    ╚██████╗██║  ██║╚██████╔╝██████╔╝
//  ╚═╝ ╚═════╝ ╚═════╝      ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝
// ============================================================================

/**
 * GET /api/admin/jobs
 * All jobs (including soft-deleted) with rich filtering.
 *
 * Query params:
 *   page, limit, status, category, client, assignedWorker,
 *   includeDeleted (true|false, default false), search (title), sortBy
 */
exports.getAllJobs = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const {
      status, category, client, assignedWorker,
      includeDeleted, search, sortBy = "-createdAt",
    } = req.query;

    const filter = {};
    if (includeDeleted !== "true") filter.isDeleted = { $ne: true };
    if (status)         filter.status = status.includes(",") ? { $in: status.split(",").map(s => s.trim()) } : status;
    if (category)       filter.category = category;
    if (client && isValidId(client))           filter.client = client;
    if (assignedWorker && isValidId(assignedWorker)) filter.assignedWorker = assignedWorker;
    if (search)         filter.title = { $regex: search.trim(), $options: "i" };

    const sortField = sortBy.startsWith("-") ? sortBy.slice(1) : sortBy;
    const sortDir   = sortBy.startsWith("-") ? -1 : 1;
    const allowedSorts = ["createdAt", "updatedAt", "budget", "title", "urgency", "status"];
    const sort = allowedSorts.includes(sortField) ? { [sortField]: sortDir } : { createdAt: -1 };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("client",         "fullName email avatar role")
        .populate("assignedWorker", "fullName email avatar role")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: { total, page, pages: Math.ceil(total / limit), limit, hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (error) {
    console.error("❌ admin.getAllJobs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch jobs" });
  }
};

/**
 * GET /api/admin/jobs/:id
 * Full job detail, including populated parties and escrow.
 */
exports.getJobById = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid job ID" });

    const job = await Job.findById(req.params.id)
      .populate("client",         "fullName email avatar phone role")
      .populate("assignedWorker", "fullName email avatar phone role")
      .populate("applications.worker", "fullName email avatar")
      .lean();

    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error("❌ admin.getJobById:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch job" });
  }
};

/**
 * PATCH /api/admin/jobs/:id
 * Admin edits any mutable job field.
 *
 * Allowed body fields:
 *   title, description, category, budget, urgency, preferredDate,
 *   status, isLive, isDeleted, address, city, adminNotes
 *
 * Note: status changes here bypass the normal transition guard so admins
 * can correct stuck jobs. The transition is still logged.
 */
exports.updateJob = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid job ID" });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    const topLevel = ["title", "description", "category", "budget", "urgency", "preferredDate", "status", "isLive", "isDeleted"];
    topLevel.forEach(field => {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    });

    // Location patch
    if (req.body.address !== undefined) job.location.address = req.body.address.trim();
    if (req.body.city    !== undefined) job.location.city    = req.body.city.trim();

    if (req.body.status !== undefined) {
      console.log(`Admin ${req.user.id} force-set job ${job._id} status: ${job.status} → ${req.body.status}`);
    }

    await job.save();

    return res.status(200).json({ success: true, message: "Job updated", data: job });
  } catch (error) {
    console.error("❌ admin.updateJob:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Validation failed", details: Object.values(error.errors).map(e => e.message) });
    }
    return res.status(500).json({ success: false, message: "Failed to update job" });
  }
};

/**
 * DELETE /api/admin/jobs/:id
 * Soft delete by default; hard delete via ?permanent=true.
 */
exports.deleteJob = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid job ID" });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (req.query.permanent === "true") {
      await Job.findByIdAndDelete(req.params.id);
      return res.status(200).json({ success: true, message: "Job permanently deleted" });
    }

    job.isDeleted = true;
    job.deletedAt = new Date();
    job.isLive    = false;
    await job.save();

    return res.status(200).json({ success: true, message: "Job soft-deleted" });
  } catch (error) {
    console.error("❌ admin.deleteJob:", error);
    return res.status(500).json({ success: false, message: "Failed to delete job" });
  }
};

/**
 * POST /api/admin/jobs/:id/restore
 * Restore a soft-deleted job.
 */
exports.restoreJob = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid job ID" });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (!job.isDeleted) return res.status(400).json({ success: false, message: "Job is not deleted" });

    job.isDeleted = false;
    job.deletedAt = undefined;
    await job.save();

    return res.status(200).json({ success: true, message: "Job restored", data: job });
  } catch (error) {
    console.error("❌ admin.restoreJob:", error);
    return res.status(500).json({ success: false, message: "Failed to restore job" });
  }
};

// ============================================================================
//  ██████╗ ██╗███████╗ ██████╗██╗   ██╗███████╗███████╗██╗ ██████╗ ███╗   ██╗
//  ██╔══██╗██║██╔════╝██╔════╝██║   ██║██╔════╝██╔════╝██║██╔═══██╗████╗  ██║
//  ██║  ██║██║███████╗██║     ██║   ██║███████╗███████╗██║██║   ██║██╔██╗ ██║
//  ██║  ██║██║╚════██║██║     ██║   ██║╚════██║╚════██║██║██║   ██║██║╚██╗██║
//  ██████╔╝██║███████║╚██████╗╚██████╔╝███████║███████║██║╚██████╔╝██║ ╚████║
//  ╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═╝ ╚═════╝╚═╝  ╚═══╝
// ============================================================================

/**
 * GET /api/admin/discussions
 * All discussions including soft-deleted, with filtering & pagination.
 *
 * Query params:
 *   page, limit, category, author, search, includeDeleted (default false),
 *   isPinned (true|false), isClosed (true|false), sortBy
 */
exports.getAllDiscussions = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { category, author, search, includeDeleted, isPinned, isClosed, sortBy = "-createdAt" } = req.query;

    const filter = {};
    if (includeDeleted !== "true") filter.isDeleted = { $ne: true };
    if (category) filter.category = category;
    if (author && isValidId(author)) filter.author = author;
    if (isPinned !== undefined) filter.isPinned = isPinned === "true";
    if (isClosed !== undefined) filter.isClosed = isClosed === "true";
    if (search) {
      const re = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ title: re }, { content: re }];
    }

    const sortField = sortBy.startsWith("-") ? sortBy.slice(1) : sortBy;
    const sortDir   = sortBy.startsWith("-") ? -1 : 1;
    const allowedSorts = ["createdAt", "updatedAt", "viewCount", "commentCount", "title"];
    const sort = allowedSorts.includes(sortField) ? { [sortField]: sortDir } : { createdAt: -1 };

    const [discussions, total] = await Promise.all([
      Discussion.find(filter)
        .populate("author", "fullName email avatar role")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Discussion.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: discussions,
      pagination: { total, page, pages: Math.ceil(total / limit), limit, hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (error) {
    console.error("❌ admin.getAllDiscussions:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch discussions" });
  }
};

/**
 * GET /api/admin/discussions/:id
 * Full discussion detail including raw likes array.
 */
exports.getDiscussionById = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid discussion ID" });

    const discussion = await Discussion.findById(req.params.id)
      .populate("author", "fullName email avatar role")
      .lean();

    if (!discussion)
      return res.status(404).json({ success: false, message: "Discussion not found" });

    return res.status(200).json({ success: true, data: discussion });
  } catch (error) {
    console.error("❌ admin.getDiscussionById:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch discussion" });
  }
};

/**
 * POST /api/admin/discussions
 * Admin creates a discussion (posted on their own behalf).
 * Body: { title, content, category, tags?, images?, isPinned? }
 */
exports.createDiscussion = async (req, res) => {
  try {
    const { title, content, category, tags, images, isPinned } = req.body;

    if (!title?.trim() || !content?.trim() || !category) {
      return res.status(400).json({ success: false, message: "title, content, and category are required" });
    }

    const discussion = await Discussion.create({
      title:    title.trim(),
      content:  content.trim(),
      category,
      tags:     Array.isArray(tags) ? tags.map(t => t.toLowerCase().trim()).filter(Boolean) : [],
      images:   Array.isArray(images) ? images.filter(u => u?.trim()) : [],
      author:   req.user._id,
      isPinned: typeof isPinned === "boolean" ? isPinned : false,
    });

    const populated = await Discussion.findById(discussion._id)
      .populate("author", "fullName avatar email role")
      .lean();

    return res.status(201).json({ success: true, data: populated, message: "Discussion created" });
  } catch (error) {
    console.error("❌ admin.createDiscussion:", error);
    return res.status(400).json({ success: false, message: error.message || "Failed to create discussion" });
  }
};

/**
 * PATCH /api/admin/discussions/:id
 * Update any discussion field, including moderation flags.
 *
 * Body (all optional):
 *   title, content, category, tags, images,
 *   isClosed, isPinned, isDeleted
 */
exports.updateDiscussion = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid discussion ID" });

    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ success: false, message: "Discussion not found" });

    const { title, content, category, tags, images, isClosed, isPinned, isDeleted } = req.body;

    if (title     !== undefined) discussion.title    = title.trim();
    if (content   !== undefined) discussion.content  = content.trim();
    if (category  !== undefined) discussion.category = category;
    if (Array.isArray(tags))    discussion.tags      = tags.map(t => t.toLowerCase().trim()).filter(Boolean);
    if (Array.isArray(images))  discussion.images    = images.filter(u => u?.trim() && /^https?:\/\//.test(u));
    if (typeof isClosed   === "boolean") discussion.isClosed   = isClosed;
    if (typeof isPinned   === "boolean") discussion.isPinned   = isPinned;
    if (typeof isDeleted  === "boolean") discussion.isDeleted  = isDeleted;

    await discussion.save();

    const populated = await Discussion.findById(discussion._id)
      .populate("author", "fullName avatar email role")
      .lean();

    return res.status(200).json({ success: true, message: "Discussion updated", data: populated });
  } catch (error) {
    console.error("❌ admin.updateDiscussion:", error);
    if (error.name === "CastError") return res.status(400).json({ success: false, message: "Invalid ID format" });
    return res.status(400).json({ success: false, message: error.message || "Failed to update discussion" });
  }
};

/**
 * DELETE /api/admin/discussions/:id
 * Soft-delete by default; hard delete via ?permanent=true.
 */
exports.deleteDiscussion = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid discussion ID" });

    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ success: false, message: "Discussion not found" });

    if (req.query.permanent === "true") {
      await Discussion.findByIdAndDelete(req.params.id);
      return res.status(200).json({ success: true, message: "Discussion permanently deleted" });
    }

    await discussion.softDelete();
    return res.status(200).json({ success: true, message: "Discussion soft-deleted" });
  } catch (error) {
    console.error("❌ admin.deleteDiscussion:", error);
    return res.status(500).json({ success: false, message: "Failed to delete discussion" });
  }
};

/**
 * POST /api/admin/discussions/:id/restore
 * Restore a soft-deleted discussion.
 */
exports.restoreDiscussion = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid discussion ID" });

    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ success: false, message: "Discussion not found" });
    if (!discussion.isDeleted) return res.status(400).json({ success: false, message: "Discussion is not deleted" });

    await discussion.restore();
    return res.status(200).json({ success: true, message: "Discussion restored", data: discussion });
  } catch (error) {
    console.error("❌ admin.restoreDiscussion:", error);
    return res.status(500).json({ success: false, message: "Failed to restore discussion" });
  }
};

/**
 * PATCH /api/admin/discussions/:id/pin
 * Toggle pinned status.
 */
exports.togglePinDiscussion = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid discussion ID" });

    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ success: false, message: "Discussion not found" });

    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    return res.status(200).json({
      success: true,
      message: `Discussion ${discussion.isPinned ? "pinned" : "unpinned"}`,
      data: { isPinned: discussion.isPinned },
    });
  } catch (error) {
    console.error("❌ admin.togglePinDiscussion:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle pin" });
  }
};


// @desc    Get all pending providers
// @route   GET /api/admin/providers/pending
// @access  Private (Admin only)
exports.getPendingProviders = async (req, res) => {
  try {
    const providers = await User.find({
      role: "provider",
      "providerDetails.verificationStatus": "pending"
    })
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ "providerDetails.submittedAt": -1 });

    return res.status(200).json({
      success: true,
      count: providers.length,
      data: providers, //  Fixed: added "data" property
    });
  } catch (error) {
    console.error("Error fetching pending providers:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching provider applications"
    });
  }
};

// @desc    Approve or reject a provider application
// @route   PATCH /api/admin/providers/:userId/verify
// @access  Private (Admin only)
exports.updateProviderVerification = async (req, res) => {
  const { userId } = req.params;
  const { action, rejectionReason } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Invalid action. Use 'approve' or 'reject'."
    });
  }

  // Optional: Validate rejectionReason only if provided (no length requirement)
  if (action === "reject" && rejectionReason !== undefined) {
    if (typeof rejectionReason !== "string") {
      return res.status(400).json({
        success: false,
        message: "Rejection reason must be a string if provided."
      });
    }
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.role !== "provider") {
      return res.status(400).json({
        success: false,
        message: "User is not a provider"
      });
    }

    if (!user.providerDetails) {
      return res.status(400).json({
        success: false,
        message: "Provider details not initialized"
      });
    }

    const currentStatus = user.providerDetails.verificationStatus;
    if (currentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} provider with status: ${currentStatus}. Only 'pending' applications can be reviewed.`
      });
    }

    if (action === "approve") {
      user.providerDetails.verificationStatus = "approved";
      user.providerDetails.isVerified = true;
      user.providerDetails.submittedAt = undefined;
      user.providerDetails.rejectionReason = undefined;
    } else if (action === "reject") {
      user.providerDetails.verificationStatus = "rejected";
      user.providerDetails.isVerified = false;
      // Store trimmed string or empty string if not provided
      user.providerDetails.rejectionReason = typeof rejectionReason === 'string'
        ? rejectionReason.trim()
        : '';
    }

    await user.save();

    if (req.user) {
      console.log(`Admin ${req.user.id} ${action}d provider ${userId}`);
    }

    return res.status(200).json({
      success: true,
      message: `Provider ${action}ed successfully`,
      data: {
        id: user._id,
        verificationStatus: user.providerDetails.verificationStatus,
        ...(action === "reject" && {
          rejection_reason: user.providerDetails.rejectionReason || ''
        })
      },
    });

  } catch (error) {
    console.error("Error updating provider verification status:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed during update",
        details: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate value detected in provider data"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during verification update"
    });
  }
};