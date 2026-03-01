const Job = require("../models/job.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");

// ============================================================================
// 🔁 HELPERS & UTILITIES
// ============================================================================

// Valid status transitions map - ENHANCED with pending logic
const VALID_TRANSITIONS = {
  open: ["assigned", "cancelled", "pending_provider_acceptance"],
  assigned: ["pending_provider_acceptance", "cancelled"],
  pending_provider_acceptance: ["escrow_funded", "open", "cancelled"],
  escrow_funded: ["in_progress", "cancelled"],
  in_progress: ["completed", "disputed", "cancelled"],
  completed: [],
  cancelled: [],
  disputed: ["resolved", "cancelled"],
  resolved: []
};

const isValidTransition = (from, to) =>
  VALID_TRANSITIONS[from]?.includes(to) || false;

// Authorization helpers
const isJobOwner = (job, userId) => {
  if (!userId || !job?.client) return false;
  return job.client.toString() === userId.toString();
};

const isAssignedWorker = (job, userId) => {
  if (!userId || !job?.assignedWorker) return false;
  return job.assignedWorker.toString() === userId.toString();
};

// Check if job is in pending state (client can still update)
const isJobPending = (job) => job?.status === "pending_provider_acceptance";

// Sanitize job output for public/client/provider views
const sanitizeJob = (job, requestingUser) => {
  if (!job) return null;
  const obj = job.toObject ? job.toObject() : job;

  if (!requestingUser || !requestingUser._id) {
    delete obj.escrow;
    if (obj.applications) {
      obj.applications = obj.applications.map(app => ({
        _id: app._id,
        worker: app.worker,
        appliedAt: app.appliedAt
      }));
    }
    return obj;
  }

  if (requestingUser.role !== "admin") {
    const requestingUserId = requestingUser._id;
    const isParticipant =
      (job.client?.toString() === requestingUserId.toString()) ||
      (job.assignedWorker?.toString() === requestingUserId.toString());

    if (!isParticipant) {
      delete obj.escrow;
      if (obj.applications && job.client?.toString() !== requestingUserId.toString()) {
        obj.applications = obj.applications.map(app => ({
          _id: app._id,
          worker: app.worker,
          appliedAt: app.appliedAt
        }));
      }
    }
  }
  return obj;
};

// Safe pagination parser
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// Safe sort parser with whitelist
const parseSort = (sortBy) => {
  const allowedFields = ["createdAt", "updatedAt", "budget", "title", "urgency", "preferredDate"];
  const field = sortBy.startsWith("-") ? sortBy.slice(1) : sortBy;
  const direction = sortBy.startsWith("-") ? -1 : 1;
  if (!allowedFields.includes(field)) {
    return { createdAt: -1 };
  }
  return { [field]: direction };
};

// Safe budget filter builder
const buildBudgetFilter = (minBudget, maxBudget) => {
  const budget = {};
  const min = parseFloat(minBudget);
  const max = parseFloat(maxBudget);
  if (!isNaN(min)) budget.$gte = min;
  if (!isNaN(max)) budget.$lte = max;
  return Object.keys(budget).length > 0 ? budget : null;
};

// Safe geospatial filter builder
const buildGeoFilter = (latitude, longitude, radiusKm) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radius = parseFloat(radiusKm);
  if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) {
    return null;
  }
  return {
    $geoWithin: {
      $centerSphere: [
        [lng, lat],
        radius / 6371
      ]
    }
  };
};

// ============================================================================
// 📝 JOB CREATION & LISTING
// ============================================================================
/**
 * POST /jobs/add
 * Create a job - supports both flows via optional assignedWorker
 * ✅ VERIFICATION CHECK REMOVED - HIRE ANY PROVIDER
 */
exports.createJob = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      title, description, category, address, city,
      budget, estimatedDuration, durationUnit,
      urgency, preferredDate, assignedWorker,
      latitude, longitude
    } = req.body;

    // 🔴 Required field validation
    const required = { title, description, category, address, budget };
    for (const [field, value] of Object.entries(required)) {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        return res.status(400).json({
          success: false,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
        });
      }
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Budget must be a valid positive number"
      });
    }

    // 👷 Validate assignedWorker if provided (Flow A: Direct Hire)
    if (assignedWorker) {
      const provider = await User.findById(assignedWorker).session(session);
      // ❌ Provider must exist and have correct role
      if (!provider || provider.role !== "provider") {
        return res.status(400).json({
          success: false,
          message: "Invalid provider selected"
        });
      }
      // ✅ VERIFICATION CHECK REMOVED - Allow hiring any provider regardless of isVerified
      // ℹ️ Optional: Log if offline (for analytics, not blocking)
      if (provider.availabilityStatus === "offline") {
        console.log(`📝 Provider ${assignedWorker} is offline - hire request will queue`);
      }
    }

    // 📍 Build location object
    const location = {
      address: address.trim(),
      city: city?.trim(),
    };
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        location.latitude = lat;
        location.longitude = lng;
      }
    }

    // 🕒 Build estimatedDuration if provided
    const estimatedDurationObj = {};
    if (estimatedDuration !== undefined && estimatedDuration !== "") {
      const val = parseFloat(estimatedDuration);
      if (!isNaN(val) && val > 0) {
        estimatedDurationObj.value = val;
        estimatedDurationObj.unit = ["days", "hours"].includes(durationUnit)
          ? durationUnit
          : "hours";
      }
    }

    // ✅ Determine initial status based on flow
    const initialStatus = assignedWorker
      ? "pending_provider_acceptance"
      : "open";

    const jobData = {
      client: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      location,
      budget: budgetNum,
      urgency: urgency || "medium",
      preferredDate: preferredDate || undefined,
      escrow: { amount: budgetNum, funded: false },
      status: initialStatus,
      assignedWorker: assignedWorker || null,
      isActive: true,
    };

    if (Object.keys(estimatedDurationObj).length > 0) {
      jobData.estimatedDuration = estimatedDurationObj;
    }

    const [job] = await Job.create([jobData], { session });
    await session.commitTransaction();

    // 🔔 Notify provider if direct hire
    if (assignedWorker) {
      console.log(`🔔 Notify provider ${assignedWorker} about direct hire job ${job._id}`);
    }

    res.status(201).json({
      success: true,
      message: assignedWorker
        ? "Job created. Awaiting provider acceptance."
        : "Job posted successfully. Providers can now apply.",
      job: sanitizeJob(job, req.user),
      flow: assignedWorker ? "direct_hire" : "open_application"
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("💥 Job creation failed:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: messages
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  } finally {
    session.endSession();
  }
};

/**
 * GET /jobs
 * Get all active jobs with optional filters & pagination
 */
exports.getAllJobs = async (req, res) => {
  try {
    const {
      category, status, city, minBudget, maxBudget,
      sortBy = "createdAt",
      latitude, longitude, radiusKm
    } = req.query;

    const { page, limit, skip } = parsePagination(req.query);
    const sortOption = parseSort(sortBy);

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (city && city.trim()) {
      filter["location.city"] = new RegExp(city.trim(), "i");
    }

    // Budget filter
    const budgetFilter = buildBudgetFilter(minBudget, maxBudget);
    if (budgetFilter) {
      filter.budget = budgetFilter;
    }

    // Geospatial filter
    const geoFilter = buildGeoFilter(latitude, longitude, radiusKm);
    if (geoFilter) {
      filter["location.coordinates"] = geoFilter;
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("client", "fullName avatar isVerified")
        .populate("assignedWorker", "fullName avatar ratings")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      jobs: jobs.map(job => sanitizeJob(job, req.user || null))
    });

  } catch (error) {
    console.error("❌ Failed to fetch jobs:", error);

    if (error.name === "MongoServerError" && error.code === 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid geospatial query. Ensure location.coordinates has a 2dsphere index."
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID or parameter format"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

/**
 * GET /jobs/my
 * Get jobs created by logged-in user (client)
 */
exports.getMyJobs = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { client: req.user.id, isActive: true };
    if (status) filter.status = status;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("assignedWorker", "fullName avatar ratings availabilityStatus")
        .populate("applications.worker", "fullName avatar ratings providerDetails.headline")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      jobs: jobs.map(job => sanitizeJob(job, req.user))
    });

  } catch (error) {
    console.error("❌ Failed to fetch your jobs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your jobs",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

/**
 * GET /jobs/provider
 * Get jobs relevant to logged-in provider (within service areas + matching skills)
 */
exports.getProviderJobs = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const provider = await User.findById(req.user.id);
    if (!provider || provider.role !== "provider") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { page, limit, skip } = parsePagination(req.query);

    // Build base match stage
    const matchStage = {
      $match: {
        isActive: true,
        status: "open"
      }
    };

    // Category filter based on provider skills
    const providerSkills = provider.providerDetails?.skills?.map(s => s.name)?.filter(Boolean) || [];
    if (providerSkills.length > 0) {
      matchStage.$match.category = { $in: providerSkills };
    }

    // Location filter if provider has service areas
    const serviceAreas = provider.providerDetails?.serviceAreas?.filter(sa =>
      sa.coordinates && Array.isArray(sa.coordinates) && sa.coordinates.length === 2 && sa.radiusKm > 0
    ) || [];

    if (serviceAreas.length > 0) {
      matchStage.$match.$or = serviceAreas.map(sa => ({
        "location.coordinates": {
          $geoWithin: {
            $centerSphere: [
              sa.coordinates,
              sa.radiusKm / 6371
            ]
          }
        }
      }));
    }

    const aggregation = [
      matchStage,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "client",
          foreignField: "_id",
          as: "clientInfo"
        }
      },
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1, title: 1, description: 1, category: 1,
          location: 1, budget: 1, urgency: 1,
          estimatedDuration: 1, preferredDate: 1,
          client: "$clientInfo._id",
          clientName: "$clientInfo.fullName",
          clientAvatar: "$clientInfo.avatar",
          applicationCount: { $size: "$applications" },
          createdAt: 1
        }
      }
    ];

    const jobs = await Job.aggregate(aggregation);
    const total = await Job.countDocuments(matchStage.$match);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      jobs
    });

  } catch (error) {
    console.error("❌ Failed to fetch provider jobs:", error);

    if (error.name === "MongoServerError" && error.code === 2) {
      return res.status(400).json({
        success: false,
        message: "Geospatial query error. Ensure location.coordinates has a 2dsphere index."
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch relevant jobs",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

/**
 * GET /jobs/:id
 * Get single job details with proper authorization
 */
exports.getJobById = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(req.params.id)
      .populate("client", "fullName avatar email isVerified")
      .populate("assignedWorker", "fullName avatar ratings providerDetails.headline availabilityStatus")
      .populate("applications.worker", "fullName avatar ratings providerDetails.skills");

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Hide inactive jobs from non-owners/non-admins
    if (!job.isActive && !isJobOwner(job, req.user.id) && req.user.role !== "admin") {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.status(200).json({
      success: true,
      job: sanitizeJob(job, req.user)
    });

  } catch (error) {
    console.error("❌ Failed to fetch job:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

// ============================================================================
// ✍️ APPLICATIONS & HIRING FLOWS
// ============================================================================

/**
 * POST /jobs/:id/apply
 * Flow B: Provider applies to an open job
 */
exports.applyToJob = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const { id: jobId } = req.params;
    const { message, proposedPrice } = req.body;
    const providerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // 🔐 Authorization & state checks
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Cannot apply to job with status: ${job.status}`
      });
    }
    if (job.client.toString() === providerId) {
      return res.status(400).json({
        success: false,
        message: "Clients cannot apply to their own jobs"
      });
    }
    if (job.applications.some(app => app.worker.toString() === providerId)) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job"
      });
    }

    // 💰 Validate proposedPrice if provided
    let price = null;
    if (proposedPrice !== undefined && proposedPrice !== "") {
      price = parseFloat(proposedPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Proposed price must be a valid non-negative number"
        });
      }
    }

    // ➕ Add application
    job.applications.push({
      worker: providerId,
      proposedPrice: price,
      message: message?.trim(),
      appliedAt: new Date()
    });
    await job.save();

    // 🔔 Notify client
    console.log(`🔔 Notify client ${job.client} about new application from ${providerId}`);

    res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      applicationCount: job.applications.length
    });

  } catch (error) {
    console.error("💥 Apply to job failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

/**
 * PATCH /jobs/:id/accept-application/:applicationId
 * Flow B: Client accepts a provider's application → moves to pending approval
 */
exports.acceptApplication = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId, applicationId } = req.params;
    const clientId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const job = await Job.findById(jobId).session(session);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (!isJobOwner(job, clientId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept application for job with status: ${job.status}`
      });
    }

    const application = job.applications.id(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // 🔄 Update job: assign worker, change to pending approval
    job.assignedWorker = application.worker;
    job.status = "assigned"; // ⏳ Now awaits provider approval
    await job.save({ session });
    await session.commitTransaction();

    // 🔔 Notify provider
    console.log(`🔔 Notify provider ${application.worker} that client accepted their application for job ${jobId}`);

    res.status(200).json({
      success: true,
      message: "Provider selected. Awaiting their acceptance.",
      job: {
        _id: job._id,
        status: job.status,
        assignedWorker: job.assignedWorker
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("💥 Accept application failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept application",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  } finally {
    session.endSession();
  }
};

/**
 * PATCH /jobs/:id/respond
 * ✅ UNIVERSAL: Provider accepts/declines job offer (Flow A or B)
 * Body: { action: "accept" | "decline" }
 * 
 * 🔄 AVAILABILITY LOGIC:
 * - On ACCEPT: provider → "busy", job → "escrow_funded"
 * - On DECLINE: provider → "available" (if was busy), job → "open" or "cancelled"
 */
exports.respondToJobOffer = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId } = req.params;
    const { action } = req.body;
    const providerId = req.user.id;

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'accept' or 'decline'"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(jobId).session(session);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (!isAssignedWorker(job, providerId)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned provider can respond to this offer"
      });
    }
    if (job.status !== "pending_provider_acceptance") {
      return res.status(400).json({
        success: false,
        message: `Cannot respond to job with status: ${job.status}`
      });
    }

    if (action === "accept") {
      // ✅ PROVIDER ACCEPTS → Move to escrow funded, set provider to BUSY
      job.status = "escrow_funded";
      job.escrow.funded = true; // Auto-fund for MVP (integrate payment gateway later)
      job.escrow.fundedAt = new Date();

      // 🔄 Update provider availability: NOW BUSY
      await User.findByIdAndUpdate(
        providerId,
        { availabilityStatus: "busy" },
        { session }
      );

      await job.save({ session });
      await session.commitTransaction();

      console.log(`✅ Provider ${providerId} ACCEPTED job ${jobId} → status: busy, job: escrow_funded`);
      console.log(`🔔 Notify client ${job.client} that provider accepted job ${jobId}`);

      res.status(200).json({
        success: true,
        message: "Job accepted! Work can now begin after escrow confirmation.",
        job: {
          _id: job._id,
          status: job.status,
          escrow: job.escrow
        }
      });

    } else {
      // ❌ PROVIDER DECLINES → Reopen job or cancel, set provider to AVAILABLE
      job.assignedWorker = null;
      job.status = job.applications?.length > 0 ? "open" : "cancelled";

      // Remove this provider from applications to prevent re-selection
      job.applications = job.applications.filter(
        app => app.worker.toString() !== providerId
      );

      // 🔄 Update provider availability: BACK TO AVAILABLE
      await User.findByIdAndUpdate(
        providerId,
        { availabilityStatus: "available" },
        { session }
      );

      await job.save({ session });
      await session.commitTransaction();

      console.log(`❌ Provider ${providerId} DECLINED job ${jobId} → status: available, job: ${job.status}`);
      console.log(`🔔 Notify client ${job.client} that provider declined job ${jobId}`);

      res.status(200).json({
        success: true,
        message: job.status === "open"
          ? "Provider declined. Job is open for other applications."
          : "Provider declined. Job cancelled.",
        job: {
          _id: job._id,
          status: job.status,
          assignedWorker: null
        }
      });
    }

  } catch (error) {
    await session.abortTransaction();
    console.error("💥 Respond to job offer failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process response",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
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
 * Client funds escrow (if not auto-funded on acceptance)
 */
exports.fundEscrow = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const { id: jobId } = req.params;
    const clientId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (!isJobOwner(job, clientId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (!["assigned", "pending_provider_acceptance", "escrow_funded"].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Escrow can only be funded when job status allows it`
      });
    }
    if (job.escrow.funded) {
      return res.status(400).json({ success: false, message: "Escrow already funded" });
    }

    // 💳 Integrate payment gateway here (Stripe, eSewa, Khalti, etc.)
    // For MVP: simulate successful funding
    job.escrow.funded = true;
    job.escrow.fundedAt = new Date();
    if (job.status !== "escrow_funded") {
      job.status = "escrow_funded";
    }
    await job.save();

    res.status(200).json({
      success: true,
      message: "Escrow funded successfully",
      escrow: job.escrow
    });

  } catch (error) {
    console.error("💥 Fund escrow failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fund escrow",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

/**
 * PATCH /jobs/:id/start-work
 * Provider marks work as started (after escrow funded)
 */
exports.startWork = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const { id: jobId } = req.params;
    const providerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (!isAssignedWorker(job, providerId)) {
      return res.status(403).json({
        success: false,
        message: "Only assigned provider can start work"
      });
    }
    if (!job.escrow.funded) {
      return res.status(400).json({
        success: false,
        message: "Cannot start work: Escrow not funded"
      });
    }
    if (job.status !== "escrow_funded") {
      return res.status(400).json({
        success: false,
        message: `Work can only start when job status is 'escrow_funded'`
      });
    }

    job.status = "in_progress";
    await job.save();

    console.log(`🔔 Notify client ${job.client} that work has started on job ${jobId}`);

    res.status(200).json({
      success: true,
      message: "Work started successfully",
      job: { _id: job._id, status: job.status }
    });

  } catch (error) {
    console.error("💥 Start work failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start work",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

/**
 * PATCH /jobs/:id/complete
 * ✅ Either party can request completion (with optional review from client)
 * 🔄 AVAILABILITY LOGIC: When job completes → provider → "available"
 */
exports.completeJob = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(jobId).session(session);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const isClient = isJobOwner(job, userId);
    const isProvider = isAssignedWorker(job, userId);
    if (!isClient && !isProvider) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (job.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Only jobs 'in_progress' can be completed`
      });
    }

    // 🔄 Update job status
    job.status = "completed";
    job.escrow.releasedAt = new Date(); // Auto-release for MVP

    // ⭐ Handle optional review (if client is completing)
    if (isClient && rating !== undefined) {
      const ratingNum = parseFloat(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5"
        });
      }
      job.review = {
        rating: ratingNum,
        comment: comment?.trim(),
        date: new Date()
      };

      // 📊 Update provider's aggregate rating
      const provider = await User.findById(job.assignedWorker).session(session);
      if (provider) {
        const totalRating = (provider.ratings.average * provider.ratings.count) + ratingNum;
        provider.ratings.count += 1;
        provider.ratings.average = parseFloat((totalRating / provider.ratings.count).toFixed(2));
        await provider.save({ session });
      }
    }

    // 🔄 CRITICAL: Update provider availability → BACK TO AVAILABLE when job ends
    if (job.assignedWorker) {
      await User.findByIdAndUpdate(
        job.assignedWorker,
        { availabilityStatus: "available" }, // ✅ Provider is free again!
        { session }
      );
      console.log(`🔄 Provider ${job.assignedWorker} availability set to "available" after job completion`);
    }

    await job.save({ session });
    await session.commitTransaction();

    console.log(`✅ Job ${jobId} completed. Notify client ${job.client} and provider ${job.assignedWorker}`);

    res.status(200).json({
      success: true,
      message: "Job completed successfully",
      job: {
        _id: job._id,
        status: job.status,
        review: job.review,
        escrow: job.escrow
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("💥 Complete job failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  } finally {
    session.endSession();
  }
};

// ============================================================================
// ✏️ UPDATES, CANCELLATION & DELETION
// ============================================================================

/**
 * PATCH /jobs/:id
 * ✅ UPDATED: Allow client to update job when status is "pending_provider_acceptance"
 * (before provider has accepted/declined)
 */
exports.updateJob = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (!isJobOwner(job, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // ✅ ENHANCED: Allow updates when pending (awaiting provider approval)
    // Client can modify details before provider commits
    if (["completed", "cancelled", "in_progress"].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update job with status: ${job.status}`
      });
    }

    const allowedUpdates = [
      "title", "description", "budget", "urgency",
      "preferredDate", "category", "estimatedDuration"
    ];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle location update (flat → nested)
    if (req.body.address !== undefined || req.body.city !== undefined) {
      updates.location = {
        address: req.body.address?.trim() || job.location?.address,
        city: req.body.city?.trim() || job.location?.city,
      };
      if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
        const lat = parseFloat(req.body.latitude);
        const lng = parseFloat(req.body.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          updates.location.latitude = lat;
          updates.location.longitude = lng;
        }
      } else {
        updates.location.latitude = job.location?.latitude;
        updates.location.longitude = job.location?.longitude;
      }
    }

    // Handle estimatedDuration nested object
    if (req.body.estimatedDuration !== undefined || req.body.durationUnit !== undefined) {
      const currentValue = job.estimatedDuration?.value;
      const currentUnit = job.estimatedDuration?.unit || "hours";
      const newValue = req.body.estimatedDuration !== undefined
        ? parseFloat(req.body.estimatedDuration)
        : currentValue;
      const newUnit = req.body.durationUnit || currentUnit;

      if (req.body.estimatedDuration !== undefined && (isNaN(newValue) || newValue <= 0)) {
        return res.status(400).json({
          success: false,
          message: "Estimated duration value must be a valid positive number"
        });
      }
      updates.estimatedDuration = {
        value: newValue !== undefined ? newValue : currentValue,
        unit: ["days", "hours"].includes(newUnit) ? newUnit : "hours"
      };
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job: sanitizeJob(updatedJob, req.user)
    });

  } catch (error) {
    console.error("❌ Update job error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: messages
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};

/**
 * PATCH /jobs/:id/cancel
 * ✅ UPDATED: Properly reset provider availability when job is cancelled
 */
exports.cancelJob = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: jobId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(jobId).session(session);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const isClient = isJobOwner(job, userId);
    const isProvider = isAssignedWorker(job, userId);
    if (!isClient && !isProvider && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (["completed", "cancelled"].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel job with status: ${job.status}`
      });
    }

    // 🔄 Update job status
    job.status = "cancelled";
    job.isActive = false;

    // 💰 Handle escrow refund if funded
    if (job.escrow.funded) {
      job.escrow.refundedAt = new Date();
      // TODO: Integrate payment gateway refund logic here
      console.log(`💸 Process refund for job ${jobId} amount ${job.escrow.amount}`);
    }

    // 🔄 CRITICAL: Update provider availability → BACK TO AVAILABLE on cancel
    if (job.assignedWorker) {
      await User.findByIdAndUpdate(
        job.assignedWorker,
        { availabilityStatus: "available" }, // ✅ Provider is free again!
        { session }
      );
      console.log(`🔄 Provider ${job.assignedWorker} availability set to "available" after job cancellation`);
    }

    await job.save({ session });
    await session.commitTransaction();

    // 🔔 Notify other party
    const notifyTo = isClient ? job.assignedWorker : job.client;
    if (notifyTo) {
      console.log(`🔔 Notify user ${notifyTo} that job ${jobId} was cancelled by ${userId}`);
    }

    res.status(200).json({
      success: true,
      message: "Job cancelled successfully",
      job: {
        _id: job._id,
        status: job.status,
        escrow: job.escrow
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("💥 Cancel job failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  } finally {
    session.endSession();
  }
};

/**
 * PATCH /jobs/:id/end (legacy - kept for backward compatibility)
 * End (complete) job - alias for completeJob
 */
exports.endJob = exports.completeJob;

/**
 * DELETE /jobs/:id
 * Soft delete a job (admin or owner only)
 */
exports.deleteJob = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID format" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (!isJobOwner(job, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    job.deletedAt = new Date();
    job.isActive = false;
    await job.save();

    res.status(200).json({
      success: true,
      message: "Job deleted successfully"
    });

  } catch (error) {
    console.error("❌ Delete job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: process.env.NODE_ENV === "development" ? error.message : "Server error"
    });
  }
};