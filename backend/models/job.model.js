const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    // 🔗 Client who posted the job
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🛠️ Job details
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Carpentry",
        "Plumbing",
        "Electrical",
        "Painting",
        "HVAC",
        "Welding",
        "Cooking",
        "Mechanic",
        "House Help",
      ],
    },

    // 📍 Location (local service focused)
    location: {
      address: { type: String, required: true },
      city: String,
      latitude: Number,
      longitude: Number,
    },

    // 💰 Fixed price (escrow-based)
    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    // ⏱️ Estimated duration (recommended)
    estimatedDuration: {
      value: Number,
      unit: {
        type: String,
        enum: ["hours", "days"],
        default: "hours",
      },
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    preferredDate: Date,

    // 👷 Worker assignment
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 📌 Job lifecycle
    status: {
      type: String,
      enum: [
        'open',
        'assigned',
        'pending_provider_acceptance', //  ADD THIS LINE
        'escrow_funded',
        'in_progress',
        'completed',
        'cancelled',
        'disputed',
        'resolved'
      ],
      default: 'open',
    },

    // 🔐 Escrow system
    escrow: {
      amount: {
        type: Number,
        required: true,
      },
      funded: {
        type: Boolean,
        default: false,
      },
      fundedAt: Date,
      releasedAt: Date,
      refundedAt: Date,
    },

    // 📥 Worker applications
    applications: [
      {
        worker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        proposedPrice: Number, // can be same or negotiated
        message: String,
        appliedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // 👁️ Views counter (recommended)
    views: {
      type: Number,
      default: 0,
    },

    // 🔕 Soft delete / visibility
    isActive: {
      type: Boolean,
      default: true,
    },

    // ⭐ Review (after completion)
    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * 🚫 Prevent duplicate applications
 * (enforced in controller logic)
 */

// Helpful indexes
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ "location.city": 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);
