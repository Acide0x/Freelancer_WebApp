const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    // 🔗 Who posted the job
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🛠️ Job basics
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

    // 📍 Location (important for local services)
    location: {
      address: { type: String, required: true },
      city: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },

    // 💰 Budget
    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentType: {
      type: String,
      enum: ["fixed", "hourly"],
      default: "fixed",
    },

    // 📅 Schedule
    preferredDate: {
      type: Date,
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // 👷 Assigned worker
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 📌 Job status
    status: {
      type: String,
      enum: ["open", "assigned", "in_progress", "completed", "cancelled"],
      default: "open",
    },

    // 📥 Applications from workers
    applications: [
      {
        worker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        proposedPrice: Number,
        message: String,
        appliedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ⭐ Review after completion
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
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Job", jobSchema);
