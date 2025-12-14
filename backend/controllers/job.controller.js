const Job = require("../models/job.model");

/**
 * POST /jobs/add
 * Create a job (temporarily bypassing auth for dev)
 */
exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      address,        // from frontend (flat)
      city,
      budget,
      estimatedDuration,
      durationUnit,
      urgency,
      preferredDate,
    } = req.body;

    // 🔴 VALIDATE REQUIRED FIELDS
    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Job title is required"
      });
    }
    if (!description || description.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Description is required"
      });
    }
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required"
      });
    }
    if (!address || address.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Address is required"
      });
    }

    // 🔢 VALIDATE BUDGET
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Budget must be a valid positive number"
      });
    }

    // 🕒 VALIDATE DURATION (if provided)
    let durationValue = null;
    if (estimatedDuration !== undefined && estimatedDuration !== "") {
      durationValue = parseFloat(estimatedDuration);
      if (isNaN(durationValue) || durationValue <= 0) {
        return res.status(400).json({
          success: false,
          message: "Estimated duration must be a valid positive number"
        });
      }
    }

    // ✅ BUILD SCHEMA-COMPLIANT JOB OBJECT
    const jobData = {
      client: req.user.id, // dynamically from logged-in user
      title: title.trim(),
      description: description.trim(),
      category,
      location: {
        address: address.trim(), // required
        city: city ? city.trim() : undefined,
        // latitude/longitude can be added later
      },
      budget: budgetNum,
      urgency: urgency || "medium",
      preferredDate: preferredDate || undefined,
      escrow: {
        amount: budgetNum, // must be number
        funded: false,
      },
      status: "open",
      isActive: true,
    };

    // ➕ Add estimatedDuration only if provided
    if (durationValue !== null) {
      jobData.estimatedDuration = {
        value: durationValue,
        unit: durationUnit && ["days", "hours"].includes(durationUnit) ? durationUnit : "hours"
      };
    }

    // 💾 SAVE TO DATABASE
    const job = await Job.create(jobData);

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    console.error("💥 Job creation failed:", error);

    // 🧾 HANDLE VALIDATION ERRORS EXPLICITLY
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: messages
      });
    }

    // 🚨 HANDLE OTHER ERRORS
    res.status(500).json({
      success: false,
      message: "Failed to create job due to server error",
      error: error.message,
    });
  }
};

/**
 * GET /jobs
 * Get all active jobs
 */
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true })
      .populate("client", "fullName email") // your User model uses 'fullName'
      .populate("assignedWorker", "fullName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

/**
 * GET /jobs/my
 * Get jobs of logged-in user
 */
exports.getMyJobs = async (req, res) => {
  try {
    // Temp: use hardcoded ID since auth is bypassed
    const jobs = await Job.find({ client: "691b843d9217bbdff8c597e8" })
      .populate("assignedWorker", "fullName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Failed to fetch your jobs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your jobs",
      error: error.message,
    });
  }
};

/**
 * PATCH /jobs/:id
 * Update job (safe fields only)
 */
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Temp: allow update since auth is bypassed
    // Normally: if (job.client.toString() !== req.user.id)

    if (job.status === "completed") {
      return res.status(400).json({
        message: "Completed job cannot be updated",
      });
    }

    const allowedUpdates = [
      "title",
      "description",
      "budget",
      "urgency",
      "preferredDate",
      "category",
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle location update (flat → nested)
    if (req.body.address || req.body.city) {
      updates.location = {
        address: req.body.address || job.location?.address,
        city: req.body.city || job.location?.city,
      };
    }

    // Handle estimatedDuration
    if (req.body.estimatedDuration !== undefined || req.body.durationUnit !== undefined) {
      updates.estimatedDuration = {
        value: req.body.estimatedDuration ? parseFloat(req.body.estimatedDuration) : job.estimatedDuration?.value,
        unit: req.body.durationUnit || job.estimatedDuration?.unit || "hours"
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
      job: updatedJob,
    });
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update job",
      error: error.message,
    });
  }
};

/**
 * PATCH /jobs/:id/end
 * End (complete) job
 */
exports.endJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Temp: skip auth check
    // Normally: if (job.client.toString() !== req.user.id)

    if (!["in_progress", "escrow_funded"].includes(job.status)) {
      return res.status(400).json({
        message: "Job cannot be ended in its current state",
      });
    }

    const endedJob = await Job.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "completed",
          isActive: false,
          "escrow.releasedAt": new Date(),
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Job completed successfully",
      job: endedJob,
    });
  } catch (error) {
    console.error("End job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to end job",
      error: error.message,
    });
  }
};