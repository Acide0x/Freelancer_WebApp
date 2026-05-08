// controllers/job.controller.js
const Job  = require("../models/job.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const { Wallet, Transaction } = require("../models/wallet.model");

// ============================================================================
// 🔁 HELPERS & UTILITIES
// ============================================================================

/**
 * Valid status transitions.
 *
 * open → pending_provider_acceptance  (client selects provider)
 * pending_provider_acceptance → in_progress  (provider accepts)
 * in_progress → escrow_funded  (client pays admin mid-work)
 * in_progress → completed      (if payment already done or admin confirms)
 * escrow_funded → completed    (admin releases payment)
 * anything non-terminal → cancelled
 */
const VALID_TRANSITIONS = {
  open:                        ["pending_provider_acceptance", "cancelled"],
  pending_provider_acceptance: ["in_progress", "open", "cancelled"],
  in_progress:                 ["escrow_funded", "completed", "disputed", "cancelled"],
  escrow_funded:               ["completed", "disputed", "cancelled"],
  completed:                   [],
  cancelled:                   [],
  disputed:                    ["resolved", "cancelled"],
  resolved:                    [],
};

const isValidTransition = (from, to) =>
  VALID_TRANSITIONS[from]?.includes(to) ?? false;

// ─── Auth helpers ────────────────────────────────────────────────────────────
const isJobOwner      = (job, userId) =>
  !!(userId && job?.client && job.client.toString() === userId.toString());

const isAssignedWorker = (job, userId) => {
  if (!userId || !job?.assignedWorker) return false;
  // Handle both raw ObjectId and populated object ({ _id, fullName, ... })
  const workerId = job.assignedWorker._id ?? job.assignedWorker;
  return workerId.toString() === userId.toString();
};

// ─── Available actions ────────────────────────────────────────────────────────
const getAvailableActions = (job, user) => {
  if (!user?._id) return [];

  const userId     = (user._id ?? user.id).toString();
  const isClient   = isJobOwner(job, userId);
  const isProvider = isAssignedWorker(job, userId);
  const actions    = [];

  switch (job.status) {
    case "open":
      if (user.role === "provider" && !isClient) actions.push("apply");
      if (isClient) actions.push("update", "cancel");
      break;

    case "pending_provider_acceptance":
      if (isProvider) actions.push("accept_offer", "decline_offer");
      if (isClient)   actions.push("cancel");
      break;

    case "in_progress":
      if (isClient && !job.escrow?.funded) actions.push("fund_escrow");
      if (isClient || isProvider)          actions.push("complete_job", "cancel");
      break;

    case "escrow_funded":
      if (isClient || isProvider) actions.push("complete_job", "cancel");
      break;

    case "completed":
      if (isClient && !job.review?.rating) actions.push("submit_review");
      break;

    default:
      break;
  }

  return actions;
};

// ─── Output sanitizer ────────────────────────────────────────────────────────
const sanitizeJob = (job, requestingUser) => {
  if (!job) return null;
  const obj = job.toObject ? job.toObject() : { ...job };

  const stripApplicationDetails = (apps) =>
    (apps || []).map(app => ({ _id: app._id, worker: app.worker, appliedAt: app.appliedAt }));

  if (!requestingUser?._id) {
    delete obj.escrow;
    obj.applications = stripApplicationDetails(obj.applications);
    return obj;
  }

  if (requestingUser.role !== "admin") {
    const uid = (requestingUser._id ?? requestingUser.id).toString();
    const clientId = (job.client?._id ?? job.client)?.toString();
    const workerId = (job.assignedWorker?._id ?? job.assignedWorker)?.toString();
    const isParticipant = clientId === uid || workerId === uid;

    if (!isParticipant) {
      delete obj.escrow;
      obj.applications = stripApplicationDetails(obj.applications);
    }
  }

  obj.availableActions = getAvailableActions(job, requestingUser);
  return obj;
};

// ─── Query helpers ───────────────────────────────────────────────────────────
const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const parseSort = (sortBy = "createdAt") => {
  const allowed = ["createdAt", "updatedAt", "budget", "title", "urgency", "preferredDate"];
  const desc    = sortBy.startsWith("-");
  const field   = desc ? sortBy.slice(1) : sortBy;
  return allowed.includes(field) ? { [field]: desc ? -1 : 1 } : { createdAt: -1 };
};

const buildBudgetFilter = (minBudget, maxBudget) => {
  const budget = {};
  const min    = parseFloat(minBudget);
  const max    = parseFloat(maxBudget);
  if (!isNaN(min)) budget.$gte = min;
  if (!isNaN(max)) budget.$lte = max;
  return Object.keys(budget).length ? budget : null;
};

const buildGeoFilter = (latitude, longitude, radiusKm) => {
  const lat    = parseFloat(latitude);
  const lng    = parseFloat(longitude);
  const radius = parseFloat(radiusKm);
  if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) return null;
  return { $geoWithin: { $centerSphere: [[lng, lat], radius / 6371] } };
};

/** Parse comma-separated or array status query param */
const parseStatusFilter = (status) => {
  if (!status) return null;
  const statuses = Array.isArray(status)
    ? status.map(s => s.trim()).filter(Boolean)
    : status.split(",").map(s => s.trim()).filter(Boolean);
  return statuses.length === 1 ? statuses[0] : { $in: statuses };
};

// ─── Paisa helpers (keep amounts consistent with payment system) ──────────────
const rsToPaisa  = (rs)    => Math.round(parseFloat(rs) * 100);
const paisaToRs  = (paisa) => +(paisa / 100).toFixed(2);

// ─── Base filter (excludes soft-deleted records) ─────────────────────────────
const notDeleted = { isDeleted: { $ne: true } };

// ============================================================================
// 📝 JOB CREATION
// ============================================================================

/**
 * POST /jobs/add
 * Create a job.
 *   Flow A (direct hire): client supplies assignedWorker → status = pending_provider_acceptance
 *   Flow B (open post)  : no assignedWorker              → status = open
 */
exports.createJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      title, description, category, address, city,
      budget, estimatedDuration, durationUnit,
      urgency, preferredDate, assignedWorker,
      latitude, longitude,
    } = req.body;

    // Required field validation
    for (const [field, value] of Object.entries({ title, description, category, address, budget })) {
      if (!value || (typeof value === "string" && !value.trim())) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
        });
      }
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Budget must be a valid positive number" });
    }

    // Validate provider for direct hire (Flow A)
    if (assignedWorker) {
      if (!mongoose.Types.ObjectId.isValid(assignedWorker)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Invalid provider ID" });
      }
      const provider = await User.findById(assignedWorker).session(session);
      if (!provider || provider.role !== "provider") {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Invalid provider selected" });
      }
      if (!provider.isActive || provider.isSuspended) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Provider account is unavailable" });
      }
    }

    // Build location
    const location = { address: address.trim(), city: city?.trim() };
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        location.latitude    = lat;
        location.longitude   = lng;
        location.coordinates = [lng, lat];
      }
    }

    // Build estimatedDuration
    const estimatedDurationObj = {};
    if (estimatedDuration !== undefined && estimatedDuration !== "") {
      const val = parseFloat(estimatedDuration);
      if (!isNaN(val) && val > 0) {
        estimatedDurationObj.value = val;
        estimatedDurationObj.unit  = ["days", "hours"].includes(durationUnit) ? durationUnit : "hours";
      }
    }

    const jobData = {
      client:         req.user.id,
      title:          title.trim(),
      description:    description.trim(),
      category,
      location,
      budget:         budgetNum,
      urgency:        urgency || "medium",
      preferredDate:  preferredDate || undefined,
      escrow:         { amount: budgetNum, funded: false },
      status:         assignedWorker ? "pending_provider_acceptance" : "open",
      assignedWorker: assignedWorker || null,
      isLive:         false,
      isDeleted:      false,
    };

    if (Object.keys(estimatedDurationObj).length) {
      jobData.estimatedDuration = estimatedDurationObj;
    }

    const [job] = await Job.create([jobData], { session });
    await session.commitTransaction();

    if (assignedWorker) {
      console.log(`🔔 Notify provider ${assignedWorker} about direct hire job ${job._id}`);
    }

    return res.status(201).json({
      success: true,
      message: assignedWorker
        ? "Job created. Awaiting provider acceptance."
        : "Job posted successfully. Providers can now apply.",
      job:  sanitizeJob(job, req.user),
      flow: assignedWorker ? "direct_hire" : "open_application",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("💥 createJob:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: Object.values(error.errors).map(e => e.message),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 📋 JOB LISTING / FEEDS
// ============================================================================

/**
 * GET /jobs
 * Public feed — open jobs only, no auth required.
 */
exports.getAllJobs = async (req, res) => {
  try {
    const { category, city, minBudget, maxBudget, sortBy = "createdAt", latitude, longitude, radiusKm } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {
      ...notDeleted,
      status:         "open",
      assignedWorker: null,
    };

    if (category)    filter.category           = category;
    if (city?.trim()) filter["location.city"]  = new RegExp(city.trim(), "i");

    const budgetFilter = buildBudgetFilter(minBudget, maxBudget);
    if (budgetFilter) filter.budget = budgetFilter;

    const geoFilter = buildGeoFilter(latitude, longitude, radiusKm);
    if (geoFilter) filter["location.coordinates"] = geoFilter;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("client", "fullName avatar kycVerified")
        .sort(parseSort(sortBy))
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count:   jobs.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      jobs:    jobs.map(job => sanitizeJob(job, req.user ?? null)),
    });
  } catch (error) {
    console.error("❌ getAllJobs:", error);
    if (error.name === "MongoServerError" && error.code === 2) {
      return res.status(400).json({ success: false, message: "Invalid geospatial query" });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * GET /jobs/my
 * Client's own jobs — any status, not soft-deleted.
 */
exports.getMyJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { ...notDeleted, client: req.user.id };

    const statusFilter = parseStatusFilter(status);
    if (statusFilter) filter.status = statusFilter;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("assignedWorker",      "fullName avatar ratings providerDetails.availabilityStatus")
        .populate("applications.worker", "fullName avatar ratings providerDetails.headline")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    console.log(`[getMyJobs] user=${req.user.id} filter=${JSON.stringify(filter)} found=${jobs.length}`);

    return res.status(200).json({
      success: true,
      count:   jobs.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      jobs:    jobs.map(job => sanitizeJob(job, req.user)),
    });
  } catch (error) {
    console.error("❌ getMyJobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your jobs",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * GET /jobs/offers
 * Pending job offers for the logged-in provider.
 */
exports.getJobOffers = async (req, res) => {
  try {
    const jobs = await Job.find({
      ...notDeleted,
      assignedWorker: req.user.id,
      status:         "pending_provider_acceptance",
    })
      .populate("client", "fullName avatar email kycVerified")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count:   jobs.length,
      jobs:    jobs.map(job => sanitizeJob(job, req.user)),
    });
  } catch (error) {
    console.error("❌ getJobOffers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch job offers",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * GET /jobs/my-applications
 * Jobs this provider has applied to, with derived application status.
 */
exports.getMyApplications = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { ...notDeleted, "applications.worker": providerId };

    const statusFilter = parseStatusFilter(status);
    if (statusFilter) filter.status = statusFilter;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("client",         "fullName avatar")
        .populate("assignedWorker", "fullName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    const deriveApplicationStatus = (job) => {
      switch (job.status) {
        case "pending_provider_acceptance":
          return job.assignedWorker?.toString() === providerId ? "selected_pending" : "pending";
        case "escrow_funded":
        case "in_progress":
          return job.assignedWorker?.toString() === providerId ? "in_progress" : "rejected";
        case "completed":  return "completed";
        case "cancelled":  return "cancelled";
        default:           return "pending";
      }
    };

    const jobsWithStatus = jobs.map(job => {
      const application = job.applications.find(app => app.worker?.toString() === providerId);
      return {
        ...sanitizeJob(job, req.user),
        applicationStatus: {
          status:        deriveApplicationStatus(job),
          appliedAt:     application?.appliedAt,
          proposedPrice: application?.proposedPrice,
          message:       application?.message,
        },
      };
    });

    return res.status(200).json({
      success: true,
      count:   jobsWithStatus.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      jobs:    jobsWithStatus,
    });
  } catch (error) {
    console.error("❌ getMyApplications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * GET /jobs/assigned
 * Jobs where the logged-in provider is the assignedWorker.
 */
exports.getMyAssignedJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { ...notDeleted, assignedWorker: req.user.id };

    const statusFilter = parseStatusFilter(status);
    if (statusFilter) {
      filter.status = statusFilter;
    } else {
      filter.status = { $nin: ["cancelled", "completed"] };
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("client",         "fullName avatar email kycVerified")
        .populate("assignedWorker", "fullName avatar ratings providerDetails.availabilityStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    console.log(`[getMyAssignedJobs] user=${req.user.id} filter=${JSON.stringify(filter)} found=${jobs.length}`);

    return res.status(200).json({
      success: true,
      count:   jobs.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      jobs:    jobs.map(job => sanitizeJob(job, req.user)),
    });
  } catch (error) {
    console.error("❌ getMyAssignedJobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned jobs",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * GET /jobs/provider
 * Open jobs matching the provider's skills and service areas.
 */
exports.getProviderJobs = async (req, res) => {
  try {
    const provider = await User.findById(req.user.id);
    if (!provider || provider.role !== "provider") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const matchFilter = { ...notDeleted, status: "open", assignedWorker: null };

    const skills = provider.providerDetails?.skills?.map(s => s.name).filter(Boolean) ?? [];
    if (skills.length) matchFilter.category = { $in: skills };

    const areas = (provider.providerDetails?.serviceAreas ?? []).filter(
      sa => Array.isArray(sa.coordinates) && sa.coordinates.length === 2 && sa.radiusKm > 0
    );
    if (areas.length) {
      matchFilter.$or = areas.map(sa => ({
        "location.coordinates": {
          $geoWithin: { $centerSphere: [sa.coordinates, sa.radiusKm / 6371] },
        },
      }));
    }

    const aggregation = [
      { $match: matchFilter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users", localField: "client", foreignField: "_id", as: "clientInfo",
        },
      },
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1, title: 1, description: 1, category: 1,
          location: 1, budget: 1, urgency: 1,
          estimatedDuration: 1, preferredDate: 1, createdAt: 1,
          client:           "$clientInfo._id",
          clientName:       "$clientInfo.fullName",
          clientAvatar:     "$clientInfo.avatar",
          applicationCount: { $size: "$applications" },
        },
      },
    ];

    const [jobs, total] = await Promise.all([
      Job.aggregate(aggregation),
      Job.countDocuments(matchFilter),
    ]);

    return res.status(200).json({
      success: true,
      count:   jobs.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      jobs,
    });
  } catch (error) {
    console.error("❌ getProviderJobs:", error);
    if (error.name === "MongoServerError" && error.code === 2) {
      return res.status(400).json({ success: false, message: "Geospatial query error" });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to fetch relevant jobs",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * GET /jobs/:id
 * Single job with role-appropriate data.
 */
exports.getJobById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(req.params.id)
      .populate("client",              "fullName avatar email kycVerified")
      .populate("assignedWorker",      "fullName avatar ratings providerDetails.headline providerDetails.availabilityStatus")
      .populate("applications.worker", "fullName avatar ratings providerDetails.skills");

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.isDeleted && !isJobOwner(job, req.user?.id) && req.user?.role !== "admin") {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    Job.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).catch(() => {});

    return res.status(200).json({ success: true, job: sanitizeJob(job, req.user) });
  } catch (error) {
    console.error("❌ getJobById:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

// ============================================================================
// ✍️  APPLICATIONS & HIRING FLOWS
// ============================================================================

/**
 * POST /jobs/:id/apply
 * Flow B: Provider applies to an open job.
 */
exports.applyToJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const { message, proposedPrice } = req.body;
    const providerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findOne({ _id: jobId, ...notDeleted });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (job.status !== "open") {
      return res.status(400).json({ success: false, message: `Cannot apply to job with status: ${job.status}` });
    }
    if (job.client.toString() === providerId) {
      return res.status(400).json({ success: false, message: "Clients cannot apply to their own jobs" });
    }
    if (job.applications.some(app => app.worker.toString() === providerId)) {
      return res.status(400).json({ success: false, message: "You have already applied to this job" });
    }

    let price = null;
    if (proposedPrice !== undefined && proposedPrice !== "") {
      price = parseFloat(proposedPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ success: false, message: "Proposed price must be a valid non-negative number" });
      }
    }

    job.applications.push({
      worker:        providerId,
      proposedPrice: price,
      message:       message?.trim(),
      appliedAt:     new Date(),
    });
    await job.save();

    console.log(`🔔 Notify client ${job.client} about new application from ${providerId}`);

    return res.status(200).json({
      success:          true,
      message:          "Application submitted successfully",
      applicationCount: job.applications.length,
    });
  } catch (error) {
    console.error("💥 applyToJob:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * PATCH /jobs/:id/accept-application/:applicationId
 * Flow B: Client selects a provider → status = pending_provider_acceptance.
 */
exports.acceptApplication = async (req, res) => {
  try {
    const { id: jobId, applicationId } = req.params;
    const clientId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const job = await Job.findOne({ _id: jobId, ...notDeleted });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (!isJobOwner(job, clientId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept application for job with status: ${job.status}`,
      });
    }

    const application = job.applications.id(applicationId);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    job.assignedWorker = application.worker;
    job.status         = "pending_provider_acceptance";
    await job.save();

    console.log(`🔔 Notify provider ${application.worker} that client selected them for job ${jobId}`);

    return res.status(200).json({
      success: true,
      message: "Provider selected. Awaiting their acceptance.",
      job:     { _id: job._id, status: job.status, assignedWorker: job.assignedWorker },
    });
  } catch (error) {
    console.error("💥 acceptApplication:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept application",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * PATCH /jobs/:id/respond
 * Provider accepts or declines a job offer (both flows).
 *
 * On ACCEPT:
 *   - status → in_progress
 *   - isLive → true
 *   - provider marked busy + added to user.activeJobs
 *   - job chat room created
 *
 * On DECLINE:
 *   - reopen job for other applicants, or cancel if none remain
 */
exports.respondToJobOffer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId } = req.params;
    const { action }    = req.body;
    const providerId    = req.user.id;

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'accept' or 'decline'" });
    }
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findOne({ _id: jobId, ...notDeleted })
      .populate("client",         "fullName email")
      .populate("assignedWorker", "fullName email")
      .session(session);

    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (!isAssignedWorker(job, providerId)) {
      return res.status(403).json({ success: false, message: "Only the assigned provider can respond" });
    }

    if (job.status !== "pending_provider_acceptance") {
      return res.status(400).json({
        success: false,
        message: `Cannot respond to job with status: ${job.status}`,
      });
    }

    if (action === "accept") {
      job.status = "in_progress";
      job.isLive = true;

      await User.findByIdAndUpdate(
        providerId,
        {
          $set:      { "providerDetails.availabilityStatus": "busy" },
          $addToSet: { activeJobs: job._id },
        },
        { session }
      );

      const { ChatConversation } = require("../models/chat.model");
      await ChatConversation.findOneAndUpdate(
        { jobId: job._id, type: "job" },
        {
          $setOnInsert: {
            jobId:        job._id,
            type:         "job",
            title:        `Job – ${job.title}`,
            participants: [job.client._id, new mongoose.Types.ObjectId(providerId)],
            unreadCounts: {},
          },
        },
        { upsert: true, new: true, session }
      );

      await job.save({ session });
      await session.commitTransaction();

      // WebSocket notification (non-critical)
      try {
        const { getIO } = require("../socket/server");
        const io        = getIO();
        const payload   = {
          jobId:      job._id,
          status:     "in_progress",
          isLive:     true,
          message:    "Provider accepted! Work has started. Chat is now available.",
          chatRoomId: `job:${job._id}`,
          timestamp:  new Date(),
        };
        io.to(`user:${job.client._id}`).emit("job:status_updated", { ...payload, action: "provider_accepted" });
        io.to(`user:${providerId}`).emit("job:status_updated",      { ...payload, action: "work_started_confirmed" });
      } catch (socketErr) {
        console.warn("⚠️ WebSocket notification failed (non-critical):", socketErr.message);
      }

      console.log(`✅ Provider ${providerId} accepted job ${jobId} → in_progress, isLive = true`);
      console.log(`🔔 Notify client ${job.client._id}`);

      return res.status(200).json({
        success:    true,
        message:    "Job accepted! Work has started. Chat is now available.",
        job:        { _id: job._id, status: job.status, isLive: job.isLive },
        chatRoomId: `job:${job._id}`,
      });

    } else {
      // DECLINE — reopen or cancel
      job.assignedWorker = null;
      job.applications   = job.applications.filter(app => app.worker.toString() !== providerId);
      job.status         = job.applications.length > 0 ? "open" : "cancelled";

      await User.findByIdAndUpdate(
        providerId,
        { $set: { "providerDetails.availabilityStatus": "available" } },
        { session }
      );

      await job.save({ session });
      await session.commitTransaction();

      console.log(`❌ Provider ${providerId} declined job ${jobId} → ${job.status}`);
      console.log(`🔔 Notify client ${job.client._id}`);

      return res.status(200).json({
        success: true,
        message: job.status === "open"
          ? "Declined. Job is open for other applicants."
          : "Declined. Job cancelled (no remaining applicants).",
        job:     { _id: job._id, status: job.status, assignedWorker: null },
      });
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("💥 respondToJobOffer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process response",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 💰 ESCROW & WORK MANAGEMENT
// ============================================================================

/**
 * PATCH /jobs/:id/fund-escrow
 * Client funds escrow by deducting from their wallet balance.
 *
 * Requires the client to have topped up their wallet first via
 * POST /payment/topup/initiate → GET /payment/topup/verify
 *
 * Job status: in_progress → escrow_funded
 */
exports.fundEscrow = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findOne({ _id: jobId, ...notDeleted }).session(session);
    if (!job) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (!isJobOwner(job, req.user.id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: "Only the job client can fund escrow" });
    }

    if (!["in_progress", "pending_provider_acceptance"].includes(job.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Escrow can only be funded while job is in progress or pending (current: ${job.status})`,
      });
    }

    if (job.escrow?.funded) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Escrow already funded" });
    }

    const amountPaisa = rsToPaisa(job.escrow.amount);
    if (amountPaisa < 1) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Escrow amount is invalid" });
    }

    // ─── Check wallet balance ────────────────────────────────────────────────
    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);
    if (!wallet || wallet.balance < amountPaisa) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: Rs ${paisaToRs(amountPaisa)}, Available: Rs ${paisaToRs(wallet?.balance ?? 0)}`,
        topupRequired: true,
        shortfallRs:   paisaToRs(amountPaisa - (wallet?.balance ?? 0)),
      });
    }

    // ─── Move balance → lockedBalance ────────────────────────────────────────
    const balBefore        = wallet.balance;
    wallet.balance        -= amountPaisa;
    wallet.lockedBalance  += amountPaisa;
    wallet.totalSpent     += amountPaisa;
    wallet.version        += 1;
    await wallet.save({ session });

    // ─── Transaction record ──────────────────────────────────────────────────
    await Transaction.create([{
      wallet:        wallet._id,
      user:          req.user.id,
      type:          "escrow_lock",
      direction:     "debit",
      amount:        amountPaisa,
      balanceBefore: balBefore,
      balanceAfter:  wallet.balance,
      job:           job._id,
      status:        "completed",
      note:          `Escrow funded for job: ${job.title}`,
      ipAddress:     req.ip,
      userAgent:     req.get("user-agent"),
    }], { session });

    // ─── Update job ──────────────────────────────────────────────────────────
    job.escrow.funded   = true;
    job.escrow.fundedAt = new Date();
    job.status          = "escrow_funded";
    await job.save({ session });

    await session.commitTransaction();

    console.log(`💰 Escrow funded for job ${jobId} — Rs ${paisaToRs(amountPaisa)} locked from client wallet`);
    console.log(`🔔 Notify provider ${job.assignedWorker} that payment is secured`);

    return res.status(200).json({
      success:          true,
      message:          "Payment secured. Funds are held until the job is complete.",
      escrow:           job.escrow,
      status:           job.status,
      newBalanceRs:     paisaToRs(wallet.balance),
      lockedBalanceRs:  paisaToRs(wallet.lockedBalance),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("💥 fundEscrow:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fund escrow",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  } finally {
    session.endSession();
  }
};

// NOTE: startWork endpoint removed.
// Work begins the moment the provider accepts the offer (respondToJobOffer → accept).

/**
 * PATCH /jobs/:id/complete
 * Either party marks job complete.
 * Admin then calls POST /payment/escrow/:id/release to pay the provider.
 *
 * Allowed from: in_progress OR escrow_funded
 */
exports.completeJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId }       = req.params;
    const { rating, comment } = req.body;
    const userId              = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findOne({ _id: jobId, ...notDeleted })
      .populate("client",         "fullName email")
      .populate("assignedWorker", "fullName email providerDetails")
      .session(session);

    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    const isClient   = isJobOwner(job, userId);
    const isProvider = isAssignedWorker(job, userId);

    if (!isClient && !isProvider) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (!["in_progress", "escrow_funded"].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Job cannot be completed from status: ${job.status}`,
      });
    }

    job.status = "completed";
    job.isLive = false;
    // releasedAt signals admin to trigger POST /payment/escrow/:id/release
    job.escrow.releasedAt = new Date();

    // Optional review — client only
    if (isClient && rating != null) {
      const ratingNum = parseFloat(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
      }

      job.review = { rating: ratingNum, comment: comment?.trim() ?? "", date: new Date() };

      if (job.assignedWorker?._id) {
        const worker = await User.findById(job.assignedWorker._id).session(session);
        if (worker) {
          const count  = (worker.ratings?.count   ?? 0) + 1;
          const newAvg = parseFloat((((worker.ratings?.average ?? 0) * (count - 1) + ratingNum) / count).toFixed(2));
          worker.ratings = { average: newAvg, count };
          await worker.save({ session });
        }
      }
    }

    if (job.assignedWorker) {
      await User.findByIdAndUpdate(
        job.assignedWorker._id ?? job.assignedWorker,
        {
          $set:  { "providerDetails.availabilityStatus": "available" },
          $pull: { activeJobs: job._id },
        },
        { session }
      );
    }

    await job.save({ session });
    await session.commitTransaction();

    // WebSocket (non-critical)
    try {
      const { getIO } = require("../socket/server");
      const io        = getIO();
      const payload   = {
        jobId:           job._id,
        status:          "completed",
        isLive:          false,
        chatArchived:    true,
        reviewSubmitted: !!(isClient && job.review),
        timestamp:       new Date(),
      };
      [job.client._id, job.assignedWorker?._id].filter(Boolean).forEach(uid => {
        io.to(`user:${uid}`).emit("job:status_updated", {
          ...payload,
          from:    isClient ? "client" : "provider",
          action:  "job_completed",
          message: isClient ? "Job marked complete by client." : "Job marked complete by provider.",
        });
      });
      io.to(`job:${job._id}`).emit("job:chat_archived", {
        message:   "Job completed. This chat is now archived.",
        canSend:   false,
        timestamp: new Date(),
      });
    } catch (socketErr) {
      console.warn("⚠️ WebSocket notification failed (non-critical):", socketErr.message);
    }

    console.log(`✅ Job ${jobId} completed → isLive = false | escrow.releasedAt set for admin payout`);

    return res.status(200).json({
      success: true,
      message: job.escrow?.funded
        ? "Job completed. Admin will release payment to the provider shortly."
        : "Job completed. Note: escrow was not funded — coordinate payment with admin.",
      job: {
        _id:          job._id,
        status:       job.status,
        isLive:       job.isLive,
        review:       job.review,
        escrow:       job.escrow,
        chatArchived: true,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("💥 completeJob:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  } finally {
    session.endSession();
  }
};

// ============================================================================
// ✏️  UPDATES, CANCELLATION & DELETION
// ============================================================================

/**
 * PATCH /jobs/:id
 * Update safe fields.
 * Allowed in: open, pending_provider_acceptance, escrow_funded
 * Blocked in: in_progress, completed, cancelled
 */
exports.updateJob = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findOne({ _id: req.params.id, ...notDeleted });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (!isJobOwner(job, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const BLOCKED_STATUSES = ["in_progress", "completed", "cancelled", "disputed", "resolved"];
    if (BLOCKED_STATUSES.includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update job with status: ${job.status}`,
      });
    }

    const allowed = ["title", "description", "budget", "urgency", "preferredDate", "category"];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Location patch
    if (req.body.address !== undefined || req.body.city !== undefined) {
      updates.location = {
        address:   req.body.address?.trim()   ?? job.location.address,
        city:      req.body.city?.trim()      ?? job.location.city,
        latitude:  job.location.latitude,
        longitude: job.location.longitude,
        coordinates: job.location.coordinates,
      };
      if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
        const lat = parseFloat(req.body.latitude);
        const lng = parseFloat(req.body.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          updates.location.latitude    = lat;
          updates.location.longitude   = lng;
          updates.location.coordinates = [lng, lat];
        }
      }
    }

    // estimatedDuration patch
    if (req.body.estimatedDuration !== undefined || req.body.durationUnit !== undefined) {
      const newVal = req.body.estimatedDuration !== undefined
        ? parseFloat(req.body.estimatedDuration)
        : job.estimatedDuration?.value;
      const newUnit = req.body.durationUnit ?? job.estimatedDuration?.unit ?? "hours";

      if (req.body.estimatedDuration !== undefined && (isNaN(newVal) || newVal <= 0)) {
        return res.status(400).json({ success: false, message: "Estimated duration must be a positive number" });
      }
      updates.estimatedDuration = {
        value: newVal,
        unit:  ["days", "hours"].includes(newUnit) ? newUnit : "hours",
      };
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job:     sanitizeJob(updatedJob, req.user),
    });
  } catch (error) {
    console.error("❌ updateJob:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: Object.values(error.errors).map(e => e.message),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};

/**
 * PATCH /jobs/:id/cancel
 * Either party cancels.
 *
 * If escrow was funded, money is NOT automatically moved — admin must review
 * and call POST /payment/escrow/:id/refund to return funds to client.
 * This prevents fraud and allows the platform to settle disputes first.
 */
exports.cancelJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId } = req.params;
    const userId        = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(jobId).session(session);
    if (!job) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const isClient   = isJobOwner(job, userId);
    const isProvider = isAssignedWorker(job, userId);

    if (!isClient && !isProvider && req.user.role !== "admin") {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (["completed", "cancelled"].includes(job.status)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: `Cannot cancel job with status: ${job.status}` });
    }

    // Determine if a refund needs admin action
    const pendingRefund = !!(
      job.escrow?.funded &&
      !job.escrow?.refundedAt &&
      !job.escrow?.releasedAt
    );

    job.status = "cancelled";
    job.isLive = false;

    if (pendingRefund) {
      // Money stays locked until admin calls POST /payment/escrow/:id/refund
      // This is intentional — gives admin time to review before releasing funds
      console.log(
        `⚠️  Job ${jobId} cancelled with funded escrow. ` +
        `Admin must call POST /payment/escrow/${jobId}/refund ` +
        `to return Rs ${job.escrow.amount} to client ${job.client}`
      );
    }

    if (job.assignedWorker) {
      await User.findByIdAndUpdate(
        job.assignedWorker,
        {
          $set:  { "providerDetails.availabilityStatus": "available" },
          $pull: { activeJobs: job._id },
        },
        { session }
      );
    }

    await job.save({ session });
    await session.commitTransaction();

    const notifyTo = isClient ? job.assignedWorker : job.client;
    if (notifyTo) {
      console.log(`🔔 Notify ${notifyTo} that job ${jobId} was cancelled by ${userId}`);
    }

    return res.status(200).json({
      success: true,
      message: "Job cancelled successfully",
      job: {
        _id:          job._id,
        status:       job.status,
        isLive:       job.isLive,
        escrow:       job.escrow,
        pendingRefund,
      },
      ...(pendingRefund && {
        notice: "Escrow was funded. Admin will review and process your refund. Track status at GET /payment/escrow/:id/status",
      }),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("💥 cancelJob:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  } finally {
    session.endSession();
  }
};

/**
 * PATCH /jobs/:id/end — legacy alias
 */
exports.endJob = exports.completeJob;

/**
 * DELETE /jobs/:id
 * Soft delete — owner or admin only, in-progress jobs cannot be deleted.
 */
exports.deleteJob = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (!isJobOwner(job, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (job.status === "in_progress") {
      return res.status(400).json({ success: false, message: "Cannot delete a job that is in progress" });
    }

    job.isDeleted = true;
    job.deletedAt = new Date();
    job.isLive    = false;
    await job.save();

    return res.status(200).json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    console.error("❌ deleteJob:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error",
    });
  }
};